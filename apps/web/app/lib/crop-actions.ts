'use server';

import { prisma } from '@/lib/prisma';
import {
    requireEffectiveUserId,
    assertFarmOwnership,
} from '@/lib/server-utils';
import { revalidatePath } from 'next/cache';
import { CropPlotSchema, CropRotationSchema } from './schemas';

// =============================================================================
// CROP PLOTS — parcelas de cultivo dentro de una finca
// =============================================================================

export async function getCropPlots(farmId: string) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(farmId, effectiveUserId, callerRole);
    return prisma.cropPlot.findMany({
        where: { farmId },
        orderBy: { name: 'asc' },
        include: { rotations: { orderBy: { sowDate: 'desc' } } },
    });
}

export async function createCropPlot(data: unknown) {
    const parsed = CropPlotSchema.safeParse(data);
    if (!parsed.success) {
        const messages = parsed.error.issues.map((e) => e.message).join(', ');
        throw new Error(`Datos inválidos: ${messages}`);
    }
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(parsed.data.farmId, effectiveUserId, callerRole);

    const created = await prisma.cropPlot.create({
        data: {
            farmId: parsed.data.farmId,
            name: parsed.data.name,
            surfaceHa: parsed.data.surfaceHa,
            soilId: parsed.data.soilId,
            irrigated: parsed.data.irrigated ?? false,
            irrigationType: parsed.data.irrigationType,
            sigpacPoligono: parsed.data.sigpacPoligono,
            sigpacParcela: parsed.data.sigpacParcela,
            sigpacRecinto: parsed.data.sigpacRecinto,
            pacUseCode: parsed.data.pacUseCode,
            pacRegime: parsed.data.pacRegime,
            notes: parsed.data.notes,
        },
    });
    revalidatePath('/dashboard');
    return created;
}

export async function updateCropPlot(plotId: string, data: unknown) {
    const parsed = CropPlotSchema.partial().safeParse(data);
    if (!parsed.success) {
        const messages = parsed.error.issues.map((e) => e.message).join(', ');
        throw new Error(`Datos inválidos: ${messages}`);
    }
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    const current = await prisma.cropPlot.findUnique({ where: { id: plotId }, select: { farmId: true } });
    if (!current) throw new Error('CropPlot not found');
    await assertFarmOwnership(current.farmId, effectiveUserId, callerRole);

    const update: Record<string, unknown> = {};
    for (const k of [
        'name', 'surfaceHa', 'soilId', 'irrigated', 'irrigationType',
        'sigpacPoligono', 'sigpacParcela', 'sigpacRecinto',
        'pacUseCode', 'pacRegime', 'notes',
    ] as const) {
        if (parsed.data[k] !== undefined) update[k] = parsed.data[k];
    }

    const updated = await prisma.cropPlot.update({ where: { id: plotId }, data: update });
    revalidatePath('/dashboard');
    return updated;
}

export async function deleteCropPlot(plotId: string) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    const current = await prisma.cropPlot.findUnique({ where: { id: plotId }, select: { farmId: true } });
    if (!current) throw new Error('CropPlot not found');
    await assertFarmOwnership(current.farmId, effectiveUserId, callerRole);
    await prisma.cropPlot.delete({ where: { id: plotId } });
    revalidatePath('/dashboard');
    return { success: true };
}

// =============================================================================
// CROP ROTATIONS — historial de cultivos por parcela
// =============================================================================

async function getPlotWithFarm(plotId: string) {
    const plot = await prisma.cropPlot.findUnique({
        where: { id: plotId },
        select: { id: true, farmId: true },
    });
    return plot;
}

export async function createRotation(data: unknown) {
    const parsed = CropRotationSchema.safeParse(data);
    if (!parsed.success) {
        const messages = parsed.error.issues.map((e) => e.message).join(', ');
        throw new Error(`Datos inválidos: ${messages}`);
    }
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    const plot = await getPlotWithFarm(parsed.data.plotId);
    if (!plot) throw new Error('CropPlot not found');
    await assertFarmOwnership(plot.farmId, effectiveUserId, callerRole);

    const created = await prisma.cropRotation.create({
        data: {
            plotId: parsed.data.plotId,
            cropName: parsed.data.cropName,
            cropFamily: parsed.data.cropFamily,
            sowDate: new Date(parsed.data.sowDate),
            harvestDate: parsed.data.harvestDate ? new Date(parsed.data.harvestDate) : null,
            expectedYieldT: parsed.data.expectedYieldT,
            actualYieldT: parsed.data.actualYieldT,
            destinationFor: parsed.data.destinationFor ?? 'consumo_animal',
            notes: parsed.data.notes,
        },
    });
    revalidatePath('/dashboard');
    return created;
}

export async function updateRotation(rotationId: string, data: unknown) {
    const parsed = CropRotationSchema.partial().safeParse(data);
    if (!parsed.success) {
        const messages = parsed.error.issues.map((e) => e.message).join(', ');
        throw new Error(`Datos inválidos: ${messages}`);
    }
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    const current = await prisma.cropRotation.findUnique({
        where: { id: rotationId },
        select: { plotId: true, plot: { select: { farmId: true } } },
    });
    if (!current) throw new Error('Rotation not found');
    await assertFarmOwnership(current.plot.farmId, effectiveUserId, callerRole);

    const update: Record<string, unknown> = {};
    if (parsed.data.cropName !== undefined) update.cropName = parsed.data.cropName;
    if (parsed.data.cropFamily !== undefined) update.cropFamily = parsed.data.cropFamily;
    if (parsed.data.sowDate !== undefined) update.sowDate = new Date(parsed.data.sowDate);
    if (parsed.data.harvestDate !== undefined) {
        update.harvestDate = parsed.data.harvestDate ? new Date(parsed.data.harvestDate) : null;
    }
    if (parsed.data.expectedYieldT !== undefined) update.expectedYieldT = parsed.data.expectedYieldT;
    if (parsed.data.actualYieldT !== undefined) update.actualYieldT = parsed.data.actualYieldT;
    if (parsed.data.destinationFor !== undefined) update.destinationFor = parsed.data.destinationFor;
    if (parsed.data.notes !== undefined) update.notes = parsed.data.notes;

    const updated = await prisma.cropRotation.update({ where: { id: rotationId }, data: update });
    revalidatePath('/dashboard');
    return updated;
}

export async function deleteRotation(rotationId: string) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    const current = await prisma.cropRotation.findUnique({
        where: { id: rotationId },
        select: { plot: { select: { farmId: true } } },
    });
    if (!current) throw new Error('Rotation not found');
    await assertFarmOwnership(current.plot.farmId, effectiveUserId, callerRole);
    await prisma.cropRotation.delete({ where: { id: rotationId } });
    revalidatePath('/dashboard');
    return { success: true };
}
