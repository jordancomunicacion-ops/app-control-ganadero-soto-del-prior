'use server';

import { prisma } from '@/lib/prisma';
import {
    requireEffectiveUserId,
    assertAnimalOwnership,
    assertFarmOwnership,
} from '@/lib/server-utils';
import { revalidatePath } from 'next/cache';

/**
 * Actions del módulo sanitario:
 *
 *   1) Eventos sanitarios (HealthRecord) — tratamientos, vacunas, saneamientos,
 *      diagnósticos, desparasitaciones. Calcula automáticamente la fecha
 *      hasta la que NO se puede sacrificar (`withdrawalMeatUntil`) a partir
 *      del producto y la fecha de aplicación.
 *
 *   2) Catálogo veterinario (VetProduct) — solo lectura desde aquí. La
 *      siembra de los 30 productos AEMPS la hace `seed-vet-products.js`.
 *
 *   3) Kardex (VetStockMovement) — entradas/salidas/ajustes de inventario.
 *      El stock se computa sumando deltas a demanda; no se materializa.
 *
 *   4) Saneamientos (CampaignSchedule) — campañas oficiales (TB, brucelosis,
 *      lengua azul, IBR). Cada campaña agrupa los HealthRecord generados
 *      durante su ejecución para auditoría.
 *
 * Todo va detrás de `assertFarmOwnership` / `assertAnimalOwnership`. No se
 * abren endpoints anónimos.
 */

// ─── CATÁLOGO VETERINARIO ──────────────────────────────────────────────────────

export async function listVetProducts(query?: string) {
    await requireEffectiveUserId();
    return prisma.vetProduct.findMany({
        where: query
            ? {
                  OR: [
                      { name: { contains: query, mode: 'insensitive' } },
                      { activeIngredient: { contains: query, mode: 'insensitive' } },
                  ],
              }
            : undefined,
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
}

// ─── EVENTOS SANITARIOS ────────────────────────────────────────────────────────

export interface HealthRecordInput {
    animalId: string;
    type: 'treatment' | 'vaccine' | 'sanitation' | 'diagnosis' | 'deworming' | 'other';
    productId?: string;
    diagnosis?: string;
    dose?: number;
    doseUnit?: string;
    route?: string;
    vetName?: string;
    prescriptionRef?: string;
    campaignId?: string;
    appliedAt: string; // ISO date
    cost?: number;
    notes?: string;
}

export async function createHealthRecord(input: HealthRecordInput) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertAnimalOwnership(input.animalId, effectiveUserId, callerRole);

    let withdrawalMeatUntil: Date | null = null;
    let withdrawalMilkUntil: Date | null = null;
    let costFromProduct = input.cost ?? null;

    if (input.productId) {
        const product = await prisma.vetProduct.findUnique({
            where: { id: input.productId },
            select: {
                withdrawalMeatDays: true,
                withdrawalMilkDays: true,
            },
        });
        if (product) {
            const applied = new Date(input.appliedAt);
            withdrawalMeatUntil = new Date(
                applied.getTime() + product.withdrawalMeatDays * 86_400_000,
            );
            if (product.withdrawalMilkDays > 0) {
                withdrawalMilkUntil = new Date(
                    applied.getTime() + product.withdrawalMilkDays * 86_400_000,
                );
            }
        }
    }

    const record = await prisma.healthRecord.create({
        data: {
            animalId: input.animalId,
            type: input.type,
            productId: input.productId,
            diagnosis: input.diagnosis,
            dose: input.dose,
            doseUnit: input.doseUnit,
            route: input.route,
            vetName: input.vetName,
            prescriptionRef: input.prescriptionRef,
            campaignId: input.campaignId,
            appliedAt: new Date(input.appliedAt),
            withdrawalMeatUntil,
            withdrawalMilkUntil,
            cost: costFromProduct,
            notes: input.notes,
        },
    });

    // Si hay coste, alimentar también el libro de costes para que el motor
    // económico (Sprint 3) lo pueda agregar más adelante. Source = 'health'
    // para distinguir de costes manuales.
    if (input.cost && input.cost > 0) {
        const animal = await prisma.animal.findUnique({
            where: { id: input.animalId },
            select: { farmId: true },
        });
        if (animal) {
            await prisma.costEntry.create({
                data: {
                    farmId: animal.farmId,
                    animalId: input.animalId,
                    category: 'sanidad',
                    amount: input.cost,
                    date: new Date(input.appliedAt),
                    source: 'health',
                    reference: record.id,
                },
            });
        }
    }

    revalidatePath('/dashboard');
    return record;
}

export async function listHealthRecords(filters: {
    farmId: string;
    animalId?: string;
    type?: string;
    from?: string;
    to?: string;
}) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(filters.farmId, effectiveUserId, callerRole);

    return prisma.healthRecord.findMany({
        where: {
            animal: { farmId: filters.farmId },
            ...(filters.animalId ? { animalId: filters.animalId } : {}),
            ...(filters.type ? { type: filters.type } : {}),
            ...(filters.from || filters.to
                ? {
                      appliedAt: {
                          ...(filters.from ? { gte: new Date(filters.from) } : {}),
                          ...(filters.to ? { lte: new Date(filters.to) } : {}),
                      },
                  }
                : {}),
        },
        include: {
            product: { select: { id: true, name: true, category: true } },
            campaign: { select: { id: true, kind: true } },
            animal: { select: { id: true, sex: true, category: true } },
        },
        orderBy: { appliedAt: 'desc' },
        take: 500,
    });
}

export async function deleteHealthRecord(recordId: string) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    const record = await prisma.healthRecord.findUnique({
        where: { id: recordId },
        include: { animal: { select: { farmId: true } } },
    });
    if (!record) throw new Error('Registro no encontrado');
    await assertFarmOwnership(record.animal.farmId, effectiveUserId, callerRole);

    // Limpiar costEntry asociado si existe
    await prisma.costEntry.deleteMany({
        where: { reference: recordId, source: 'health' },
    });
    await prisma.healthRecord.delete({ where: { id: recordId } });
    revalidatePath('/dashboard');
}

// ─── KARDEX / STOCK ────────────────────────────────────────────────────────────

export async function listStockMovements(farmId: string, productId?: string) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(farmId, effectiveUserId, callerRole);

    return prisma.vetStockMovement.findMany({
        where: { farmId, ...(productId ? { productId } : {}) },
        include: {
            product: { select: { id: true, name: true, unit: true } },
        },
        orderBy: { occurredAt: 'desc' },
        take: 500,
    });
}

export async function createStockMovement(input: {
    farmId: string;
    productId: string;
    kind: 'entrada' | 'salida' | 'ajuste';
    quantity: number;
    unit: string;
    unitCost?: number;
    totalCost?: number;
    reference?: string;
    occurredAt?: string;
}) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(input.farmId, effectiveUserId, callerRole);

    if (input.quantity <= 0) {
        throw new Error('La cantidad debe ser positiva (el signo lo da `kind`)');
    }

    const movement = await prisma.vetStockMovement.create({
        data: {
            farmId: input.farmId,
            productId: input.productId,
            kind: input.kind,
            quantity: input.quantity,
            unit: input.unit,
            unitCost: input.unitCost,
            totalCost:
                input.totalCost ??
                (input.unitCost ? input.unitCost * input.quantity : null),
            reference: input.reference,
            occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
        },
    });

    // Si es entrada con coste, alimenta el libro de costes (categoría sanidad).
    if (input.kind === 'entrada' && (input.totalCost || input.unitCost)) {
        const amount =
            input.totalCost ?? (input.unitCost ? input.unitCost * input.quantity : 0);
        if (amount > 0) {
            await prisma.costEntry.create({
                data: {
                    farmId: input.farmId,
                    category: 'sanidad',
                    amount,
                    date: movement.occurredAt,
                    source: 'health',
                    reference: movement.id,
                },
            });
        }
    }
    revalidatePath('/dashboard');
    return movement;
}

/**
 * Stock actual por producto en una finca: suma deltas con signo según
 * `kind`. Útil para el panel de kardex y para alertar de roturas de stock
 * (futuro).
 */
export async function vetStockSnapshot(farmId: string) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(farmId, effectiveUserId, callerRole);

    const movements = await prisma.vetStockMovement.findMany({
        where: { farmId },
        select: {
            quantity: true,
            kind: true,
            unit: true,
            productId: true,
            product: { select: { id: true, name: true, category: true, unit: true } },
        },
    });

    const byProduct = new Map<
        string,
        { productId: string; name: string; category: string; unit: string; balance: number }
    >();
    for (const m of movements) {
        const sign = m.kind === 'entrada' ? 1 : m.kind === 'salida' ? -1 : 0;
        const delta = m.kind === 'ajuste' ? m.quantity : sign * m.quantity;
        const existing = byProduct.get(m.productId);
        if (existing) {
            existing.balance += delta;
        } else {
            byProduct.set(m.productId, {
                productId: m.productId,
                name: m.product.name,
                category: m.product.category,
                unit: m.product.unit ?? m.unit,
                balance: delta,
            });
        }
    }
    return Array.from(byProduct.values()).sort((a, b) =>
        a.name.localeCompare(b.name, 'es'),
    );
}

// ─── SANEAMIENTOS / CAMPAÑAS ───────────────────────────────────────────────────

export async function listCampaigns(farmId: string) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(farmId, effectiveUserId, callerRole);

    return prisma.campaignSchedule.findMany({
        where: { farmId },
        include: {
            _count: { select: { records: true } },
        },
        orderBy: [{ completedAt: 'asc' }, { scheduledFor: 'asc' }],
    });
}

export async function createCampaign(input: {
    farmId: string;
    kind: 'tuberculosis' | 'brucelosis' | 'lengua_azul' | 'ibr' | 'otro';
    scheduledFor: string; // ISO
    vetName?: string;
    notes?: string;
}) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(input.farmId, effectiveUserId, callerRole);

    const result = await prisma.campaignSchedule.create({
        data: {
            farmId: input.farmId,
            kind: input.kind,
            scheduledFor: new Date(input.scheduledFor),
            vetName: input.vetName,
            notes: input.notes,
        },
    });
    revalidatePath('/dashboard');
    return result;
}

export async function completeCampaign(input: {
    campaignId: string;
    result: 'favorable' | 'sospechoso' | 'positivo';
    notes?: string;
}) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    const campaign = await prisma.campaignSchedule.findUnique({
        where: { id: input.campaignId },
        select: { farmId: true },
    });
    if (!campaign) throw new Error('Campaña no encontrada');
    await assertFarmOwnership(campaign.farmId, effectiveUserId, callerRole);

    const updated = await prisma.campaignSchedule.update({
        where: { id: input.campaignId },
        data: {
            completedAt: new Date(),
            result: input.result,
            notes: input.notes,
        },
    });
    revalidatePath('/dashboard');
    return updated;
}

/**
 * Devuelve un "dossier" estructurado de la campaña preparado para subir
 * a PRESVET o imprimir/exportar a PDF. Por ahora devuelve JSON; la
 * generación PDF real queda como tarea futura cuando se conecte la
 * integración oficial.
 */
export async function getCampaignDossier(campaignId: string) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    const campaign = await prisma.campaignSchedule.findUnique({
        where: { id: campaignId },
        include: {
            farm: { select: { id: true, name: true, municipio: true, license: true } },
            records: {
                include: {
                    animal: { select: { id: true, dibCode: true, sex: true } },
                    product: { select: { name: true, presvetCode: true } },
                },
                orderBy: { appliedAt: 'asc' },
            },
        },
    });
    if (!campaign) throw new Error('Campaña no encontrada');
    await assertFarmOwnership(campaign.farm.id, effectiveUserId, callerRole);

    return {
        meta: {
            campaignId: campaign.id,
            kind: campaign.kind,
            scheduledFor: campaign.scheduledFor,
            completedAt: campaign.completedAt,
            result: campaign.result,
            vetName: campaign.vetName,
            farmName: campaign.farm.name,
            farmREGA: campaign.farm.license,
            municipio: campaign.farm.municipio,
        },
        animals: campaign.records.map((r) => ({
            crotal: r.animal.id,
            dib: r.animal.dibCode,
            sex: r.animal.sex,
            product: r.product?.name ?? null,
            presvetCode: r.product?.presvetCode ?? null,
            appliedAt: r.appliedAt,
            dose: r.dose,
            doseUnit: r.doseUnit,
            route: r.route,
        })),
    };
}
