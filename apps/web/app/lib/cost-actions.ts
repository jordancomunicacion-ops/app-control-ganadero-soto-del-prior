'use server';

import { prisma } from '@/lib/prisma';
import {
    requireEffectiveUserId,
    assertFarmOwnership,
} from '@/lib/server-utils';
import { revalidatePath } from 'next/cache';
import {
    computeProductionCost,
    imputeRationCost,
    imputeBreedingDepreciation,
    type CostCategory,
    type CostResult,
} from '@/services/costEngine';

/**
 * Calcula el cuadro de costes y márgenes de una finca para un periodo.
 *
 * Estrategia:
 *   1) Trae todos los `CostEntry` del periodo y los agrupa por categoría.
 *   2) Imputa el coste alimentación a partir de las raciones registradas
 *      cuando NO hay ya una entrada manual `category='alimentacion'`
 *      (evita doble contabilización).
 *   3) Imputa amortización biológica del vientre (vacas adultas) con
 *      valores por defecto si no hay parámetros configurados en la finca.
 *   4) Suma producción canal (Animal.actualCarcassWeight con exitDate en
 *      el periodo) y vivo total.
 *   5) Precio SEUROP medio: media simple de las últimas filas Price con
 *      `code='AR3'` (vaca R3) en el periodo — heurística orientativa.
 *
 * Devuelve también un desglose de "fuentes" de cada categoría para que
 * el ganadero entienda qué viene de manual y qué de motor.
 */
export interface CostBreakdown {
    farmId: string;
    periodFrom: Date;
    periodTo: Date;
    result: CostResult;
    sources: Record<
        CostCategory,
        Array<{ source: string; amount: number; count: number }>
    >;
    inputs: {
        averageHeadcount: number;
        carcassKg: number;
        liveWeightKg: number;
        weanedCalves: number;
        averageSeuropPricePerKgCarcass: number | null;
    };
}

export async function getFarmCosts(
    farmId: string,
    options?: { periodFrom?: string; periodTo?: string },
): Promise<CostBreakdown> {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(farmId, effectiveUserId, callerRole);

    const periodTo = options?.periodTo
        ? new Date(options.periodTo)
        : new Date();
    const periodFrom = options?.periodFrom
        ? new Date(options.periodFrom)
        : new Date(periodTo.getTime() - 365 * 86_400_000);

    const periodDays =
        Math.max(1, (periodTo.getTime() - periodFrom.getTime()) / 86_400_000);

    // ── CostEntry manuales y semi-automáticos ────────────────────────────────
    const entries = await prisma.costEntry.findMany({
        where: {
            farmId,
            date: { gte: periodFrom, lte: periodTo },
        },
        select: { category: true, amount: true, source: true },
    });

    const costsByCategory: Partial<Record<CostCategory, number>> = {};
    const sources: Record<
        CostCategory,
        Array<{ source: string; amount: number; count: number }>
    > = {
        alimentacion: [],
        sanidad: [],
        mano_obra: [],
        amortizacion: [],
        servicios: [],
        otros: [],
    };

    const groupedSources = new Map<string, { amount: number; count: number }>();
    for (const e of entries) {
        const cat = (e.category as CostCategory) ?? 'otros';
        costsByCategory[cat] = (costsByCategory[cat] ?? 0) + e.amount;
        const key = `${cat}|${e.source}`;
        const prev = groupedSources.get(key) ?? { amount: 0, count: 0 };
        groupedSources.set(key, {
            amount: prev.amount + e.amount,
            count: prev.count + 1,
        });
    }
    for (const [key, value] of groupedSources.entries()) {
        const [cat, source] = key.split('|') as [CostCategory, string];
        sources[cat].push({ source, amount: value.amount, count: value.count });
    }

    // ── Animales y producción ────────────────────────────────────────────────
    const allAnimals = await prisma.animal.findMany({
        where: { farmId },
        select: {
            id: true,
            sex: true,
            birthDate: true,
            status: true,
            actualCarcassWeight: true,
            actualLiveWeight: true,
            exitDate: true,
        },
    });

    const inactive = new Set([
        'sacrificado', 'muerto', 'vendido', 'baja', 'inactivo', 'retirado',
    ]);
    const activeAnimals = allAnimals.filter(
        (a) => !a.status || !inactive.has(a.status.toLowerCase()),
    );
    // Aproximación: si tuviéramos histórico de altas/bajas usaríamos la
    // media móvil. Para el primer cierre nos vale la cuenta actual.
    const averageHeadcount = activeAnimals.length;

    const carcassKg = allAnimals
        .filter(
            (a) =>
                a.actualCarcassWeight &&
                a.exitDate &&
                a.exitDate >= periodFrom &&
                a.exitDate <= periodTo,
        )
        .reduce((acc, a) => acc + (a.actualCarcassWeight ?? 0), 0);
    const liveWeightKg = allAnimals
        .filter(
            (a) =>
                a.actualLiveWeight &&
                a.exitDate &&
                a.exitDate >= periodFrom &&
                a.exitDate <= periodTo,
        )
        .reduce((acc, a) => acc + (a.actualLiveWeight ?? 0), 0);

    // Destetes en el periodo (evento 'destete' del ManagementEvent)
    const destetes = await prisma.managementEvent.count({
        where: {
            farmId,
            type: 'destete',
            date: { gte: periodFrom, lte: periodTo },
        },
    });

    // ── Imputación alimentación desde Ration (si no hay manual) ──────────────
    //
    // Estrategia: si NO hay CostEntry con source='ration' en el periodo,
    // recalculamos a partir de las raciones × días aplicados × precio feed.
    // Si ya hay (procesos previos), respetamos.
    const hasRationCost = entries.some(
        (e) => e.category === 'alimentacion' && e.source === 'ration',
    );
    if (!hasRationCost) {
        const rations = await prisma.ration.findMany({
            where: {
                animalId: { in: activeAnimals.map((a) => a.id) },
                date: { lte: periodTo },
            },
            orderBy: { date: 'asc' },
            include: {
                items: { include: { feed: { select: { costPerKgFresh: true } } } },
            },
        });
        const byAnimal = new Map<string, typeof rations>();
        for (const r of rations) {
            const list = byAnimal.get(r.animalId) ?? [];
            list.push(r);
            byAnimal.set(r.animalId, list);
        }
        let rationCost = 0;
        for (const list of byAnimal.values()) {
            for (let i = 0; i < list.length; i++) {
                const r = list[i];
                const next = list[i + 1]?.date ?? periodTo;
                const startWindow = r.date < periodFrom ? periodFrom : r.date;
                const endWindow = next > periodTo ? periodTo : next;
                const days = Math.max(
                    0,
                    (endWindow.getTime() - startWindow.getTime()) / 86_400_000,
                );
                if (days <= 0) continue;
                rationCost += imputeRationCost({
                    items: r.items.map((it) => ({
                        amountFreshKg: it.amountFreshKg,
                        costPerKgFresh: it.feed.costPerKgFresh ?? 0,
                    })),
                    daysApplied: days,
                });
            }
        }
        if (rationCost > 0) {
            costsByCategory.alimentacion =
                (costsByCategory.alimentacion ?? 0) + rationCost;
            sources.alimentacion.push({
                source: 'ration',
                amount: rationCost,
                count: 0,
            });
        }
    }

    // ── Amortización biológica del vientre ───────────────────────────────────
    const hasManualDepr = entries.some(
        (e) => e.category === 'amortizacion',
    );
    if (!hasManualDepr) {
        // Vacas adultas (hembras > 28 meses)
        const now = periodTo;
        const nVacas = activeAnimals.filter((a) => {
            if (a.sex !== 'H') return false;
            const months =
                (now.getTime() - a.birthDate.getTime()) /
                (1000 * 60 * 60 * 24 * 30.4375);
            return months >= 28;
        }).length;
        const depr = imputeBreedingDepreciation({
            nVacas,
            periodDays,
        });
        if (depr > 0) {
            costsByCategory.amortizacion =
                (costsByCategory.amortizacion ?? 0) + depr;
            sources.amortizacion.push({
                source: 'depreciation',
                amount: depr,
                count: nVacas,
            });
        }
    }

    // ── Precio SEUROP medio del periodo ──────────────────────────────────────
    //
    // Heurística: vaca R3 (`AR3` en grid MAPA) — cambia a Z3 para añojo si
    // la finca produce mayoritariamente esa categoría. Como aún no
    // segmentamos categoría dominante, nos quedamos con AR3.
    const prices = await prisma.price.findMany({
        where: {
            code: { in: ['AR3', 'AR', 'A'] },
            createdAt: { gte: periodFrom, lte: periodTo },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
    });
    let averageSeuropPricePerKgCarcass: number | null = null;
    if (prices.length > 0) {
        const sum = prices.reduce((a, p) => a + p.pricePer100Kg / 100, 0);
        averageSeuropPricePerKgCarcass = sum / prices.length;
    }

    const result = computeProductionCost({
        periodDays,
        averageHeadcount,
        costsByCategory,
        carcassKg,
        liveWeightKg,
        weanedCalves: destetes,
        averageSeuropPricePerKgCarcass:
            averageSeuropPricePerKgCarcass ?? undefined,
    });

    return {
        farmId,
        periodFrom,
        periodTo,
        result,
        sources,
        inputs: {
            averageHeadcount,
            carcassKg,
            liveWeightKg,
            weanedCalves: destetes,
            averageSeuropPricePerKgCarcass,
        },
    };
}

// ─── ENTRADAS MANUALES DEL LIBRO DE COSTES ─────────────────────────────────────

export async function addManualCostEntry(input: {
    farmId: string;
    animalId?: string;
    category: CostCategory;
    amount: number;
    date: string; // ISO
    notes?: string;
}) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(input.farmId, effectiveUserId, callerRole);

    if (input.amount <= 0) throw new Error('El importe debe ser positivo');

    const entry = await prisma.costEntry.create({
        data: {
            farmId: input.farmId,
            animalId: input.animalId,
            category: input.category,
            amount: input.amount,
            date: new Date(input.date),
            source: 'manual',
            notes: input.notes,
        },
    });
    revalidatePath('/dashboard');
    return entry;
}

export async function deleteCostEntry(entryId: string) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    const entry = await prisma.costEntry.findUnique({
        where: { id: entryId },
        select: { id: true, farmId: true, source: true },
    });
    if (!entry) throw new Error('Entrada no encontrada');
    await assertFarmOwnership(entry.farmId, effectiveUserId, callerRole);
    if (entry.source !== 'manual') {
        throw new Error('Solo se pueden borrar entradas manuales');
    }
    await prisma.costEntry.delete({ where: { id: entryId } });
    revalidatePath('/dashboard');
}

export async function listManualCostEntries(farmId: string) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(farmId, effectiveUserId, callerRole);
    return prisma.costEntry.findMany({
        where: { farmId, source: 'manual' },
        orderBy: { date: 'desc' },
        take: 200,
    });
}
