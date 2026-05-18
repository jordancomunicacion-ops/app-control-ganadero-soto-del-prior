'use server';

import { prisma } from '@/lib/prisma';
import {
    requireEffectiveUserId,
    assertFarmOwnership,
} from '@/lib/server-utils';
import { revalidatePath } from 'next/cache';
import { CorralSchema } from './schemas';

/**
 * Server actions de Corral. Cada corral pertenece a una finca cuya
 * propiedad se valida con assertFarmOwnership antes de cualquier escritura.
 */

export async function getCorrals(farmId: string) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(farmId, effectiveUserId, callerRole);
    return prisma.corral.findMany({
        where: { farmId },
        orderBy: [{ kind: 'asc' }, { name: 'asc' }],
        include: {
            linkedPlot: {
                select: { id: true, name: true, surfaceHa: true },
            },
        },
    });
}

export async function createCorral(data: unknown) {
    const parsed = CorralSchema.safeParse(data);
    if (!parsed.success) {
        const messages = parsed.error.issues.map((e) => e.message).join(', ');
        throw new Error(`Datos inválidos: ${messages}`);
    }
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(parsed.data.farmId, effectiveUserId, callerRole);

    // Validar vínculo a parcela: si se proporciona, debe pertenecer a la
    // misma finca para evitar referencias cruzadas entre fincas.
    if (parsed.data.linkedPlotId) {
        const plot = await prisma.cropPlot.findUnique({
            where: { id: parsed.data.linkedPlotId },
            select: { farmId: true },
        });
        if (!plot || plot.farmId !== parsed.data.farmId) {
            throw new Error('La parcela vinculada no pertenece a esta finca');
        }
    }

    const created = await prisma.corral.create({
        data: {
            farmId: parsed.data.farmId,
            name: parsed.data.name,
            kind: parsed.data.kind,
            surfaceM2: parsed.data.surfaceM2,
            capacityLU: parsed.data.capacityLU,
            hasShade: parsed.data.hasShade ?? false,
            hasWater: parsed.data.hasWater ?? true,
            hasFeeder: parsed.data.hasFeeder ?? false,
            hasSilo: parsed.data.hasSilo ?? false,
            linkedPlotId: parsed.data.linkedPlotId,
            currentCrop: parsed.data.currentCrop,
            notes: parsed.data.notes,
        },
        include: { linkedPlot: { select: { id: true, name: true, surfaceHa: true } } },
    });
    revalidatePath('/dashboard');
    return created;
}

export async function updateCorral(corralId: string, data: unknown) {
    const parsed = CorralSchema.partial().safeParse(data);
    if (!parsed.success) {
        const messages = parsed.error.issues.map((e) => e.message).join(', ');
        throw new Error(`Datos inválidos: ${messages}`);
    }
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    const current = await prisma.corral.findUnique({ where: { id: corralId }, select: { farmId: true } });
    if (!current) throw new Error('Corral not found');
    await assertFarmOwnership(current.farmId, effectiveUserId, callerRole);

    // Validar vínculo a parcela en updates también
    if (parsed.data.linkedPlotId !== undefined && parsed.data.linkedPlotId !== null) {
        const plot = await prisma.cropPlot.findUnique({
            where: { id: parsed.data.linkedPlotId },
            select: { farmId: true },
        });
        if (!plot || plot.farmId !== current.farmId) {
            throw new Error('La parcela vinculada no pertenece a esta finca');
        }
    }

    const update: Record<string, unknown> = {};
    for (const k of ['name', 'kind', 'surfaceM2', 'capacityLU', 'hasShade', 'hasWater', 'hasFeeder', 'hasSilo', 'linkedPlotId', 'currentCrop', 'notes'] as const) {
        if (parsed.data[k] !== undefined) update[k] = parsed.data[k];
    }

    const updated = await prisma.corral.update({
        where: { id: corralId },
        data: update,
        include: { linkedPlot: { select: { id: true, name: true, surfaceHa: true } } },
    });
    revalidatePath('/dashboard');
    return updated;
}

export async function deleteCorral(corralId: string) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    const current = await prisma.corral.findUnique({ where: { id: corralId }, select: { farmId: true } });
    if (!current) throw new Error('Corral not found');
    await assertFarmOwnership(current.farmId, effectiveUserId, callerRole);
    await prisma.corral.delete({ where: { id: corralId } });
    revalidatePath('/dashboard');
    return { success: true };
}

// =============================================================================
// CORRAL STOCKING ANALYSIS
// =============================================================================
//
// Para cada corral declarado en una finca devuelve cuántos animales activos
// tiene asignados (vía Animal.corral, comparación por nombre) y compara con
// su capacityLU. Útil para alertar de hacinamientos por recinto.

export interface CorralStockingRow {
    corralId: string;
    name: string;
    kind: string;
    capacityLU: number | null;
    surfaceM2: number | null;
    currentLU: number;
    ratio: number;            // currentLU / capacityLU (0 si no hay capacidad)
    status: 'ok' | 'warning' | 'critical' | 'unknown';
}

export async function getCorralStocking(farmId: string): Promise<CorralStockingRow[]> {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(farmId, effectiveUserId, callerRole);

    const [corrals, animals] = await Promise.all([
        prisma.corral.findMany({ where: { farmId } }),
        prisma.animal.findMany({
            where: { farmId },
            select: { id: true, corral: true, status: true, birthDate: true },
        }),
    ]);

    const excludedStatuses = new Set(['sacrificado', 'muerto', 'vendido', 'baja', 'inactivo', 'retirado']);
    const now = Date.now();

    // Animales activos agrupados por nombre de corral (case-insensitive)
    const byCorral = new Map<string, number>();
    for (const a of animals) {
        if (a.status && excludedStatuses.has(a.status.toLowerCase())) continue;
        const key = (a.corral ?? '').toLowerCase().trim();
        if (!key) continue;
        const ageMonths = (now - a.birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
        // Misma conversión a LU que getFarmAggregatesForPAC
        let lu = 1.0;
        if (ageMonths < 6) lu = 0.4;
        else if (ageMonths < 12) lu = 0.6;
        else if (ageMonths < 24) lu = 0.8;
        byCorral.set(key, (byCorral.get(key) ?? 0) + lu);
    }

    return corrals.map((c) => {
        const currentLU = parseFloat((byCorral.get(c.name.toLowerCase().trim()) ?? 0).toFixed(1));
        const ratio = c.capacityLU && c.capacityLU > 0 ? currentLU / c.capacityLU : 0;
        let status: CorralStockingRow['status'];
        if (!c.capacityLU) status = 'unknown';
        else if (ratio <= 1.0) status = 'ok';
        else if (ratio <= 1.2) status = 'warning';
        else status = 'critical';
        return {
            corralId: c.id,
            name: c.name,
            kind: c.kind,
            capacityLU: c.capacityLU,
            surfaceM2: c.surfaceM2,
            currentLU,
            ratio: parseFloat(ratio.toFixed(2)),
            status,
        };
    });
}
