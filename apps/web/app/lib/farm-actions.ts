'use server';

import { prisma } from '@/lib/prisma';
import {
    requireEffectiveUserId,
    assertFarmOwnership,
    safeJsonParse,
} from '@/lib/server-utils';
import { revalidatePath } from 'next/cache';
import { FarmSchema } from './schemas';

function parseCorralNames(raw: string | null): string[] {
    if (!raw) return [];
    const trimmed = raw.trim();
    if (trimmed.startsWith('[')) {
        return safeJsonParse<string[]>(trimmed, []);
    }
    // Legacy: comma-separated values
    return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
}

function parseFarm(f: {
    recintos: string | null;
    coords: string | null;
    corralNames: string | null;
    climateStudy: string | null;
    cropsRecommendation: string | null;
    breedsRecommendation: string | null;
    f1Recommendation: string | null;
    [key: string]: unknown;
}) {
    return {
        ...f,
        recintos: safeJsonParse(f.recintos, []),
        coords: safeJsonParse(f.coords, undefined),
        corralNames: parseCorralNames(f.corralNames),
        climateStudy: safeJsonParse(f.climateStudy, undefined),
        cropsRecommendation: safeJsonParse(f.cropsRecommendation, []),
        breedsRecommendation: safeJsonParse(f.breedsRecommendation, []),
        f1Recommendation: safeJsonParse(f.f1Recommendation, []),
    };
}

export async function getFarms(_legacyUserId?: string, options?: { page?: number; pageSize?: number }) {
    const page = Math.max(1, options?.page ?? 1);
    const pageSize = Math.min(200, options?.pageSize ?? 50);
    try {
        const { effectiveUserId } = await requireEffectiveUserId();
        const where = { userId: effectiveUserId };
        const [farms, total] = await Promise.all([
            prisma.farm.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.farm.count({ where }),
        ]);
        return { data: farms.map(parseFarm), total, page, pageSize };
    } catch (error) {
        console.error('Error fetching farms:', error);
        return { data: [], total: 0, page, pageSize };
    }
}

export async function createFarm(_legacyUserId: unknown, data: unknown) {
    // First arg kept for backwards-compat with old call sites that passed userId.
    // We ignore it and always derive the owner from the session.
    const parsed = FarmSchema.safeParse(data);
    if (!parsed.success) {
        const messages = parsed.error.issues.map((e) => e.message).join(', ');
        throw new Error(`Datos inválidos: ${messages}`);
    }

    const { effectiveUserId } = await requireEffectiveUserId();

    const {
        name, municipio, municipioCode, provinciaCode, poligono, parcela,
        superficie, recintos, coords, slope, license, maxHeads, soilId,
        corrals, corralNames, feedingSystem,
        climateStudy, cropsRecommendation, breedsRecommendation, f1Recommendation, irrigationCoef,
        farmType, purpose, parentFarmId,
    } = parsed.data;

    // Validar parentFarmId: debe pertenecer al mismo usuario y no auto-referenciarse
    if (parentFarmId) {
        const parent = await prisma.farm.findUnique({
            where: { id: parentFarmId },
            select: { id: true, userId: true, parentFarmId: true },
        });
        if (!parent) throw new Error('La finca principal indicada no existe');
        if (parent.userId !== effectiveUserId) throw new Error('La finca principal no te pertenece');
        // Solo un nivel de jerarquía — la principal no puede ser a su vez hija
        if (parent.parentFarmId) throw new Error('La finca principal seleccionada ya es una finca asociada (solo un nivel de jerarquía permitido)');
    }

    try {
        const farm = await prisma.farm.create({
            data: {
                userId: effectiveUserId,
                name,
                municipio,
                municipioCode,
                provinciaCode,
                poligono,
                parcela,
                superficie: superficie ?? 0,
                recintos: JSON.stringify(recintos ?? []),
                coords: JSON.stringify(coords ?? {}),
                slope: slope ?? 0,
                license,
                maxHeads: maxHeads ?? 0,
                soilId,
                corrals: corrals ?? 0,
                corralNames: JSON.stringify(corralNames ?? []),
                feedingSystem,
                irrigationCoef: irrigationCoef ?? 0,
                climateStudy: JSON.stringify(climateStudy ?? {}),
                cropsRecommendation: JSON.stringify(cropsRecommendation ?? []),
                breedsRecommendation: JSON.stringify(breedsRecommendation ?? []),
                f1Recommendation: JSON.stringify(f1Recommendation ?? []),
                farmType,
                purpose,
                parentFarmId,
            },
        });

        revalidatePath('/dashboard');
        return parseFarm(farm);
    } catch (error) {
        console.error('Error creating farm:', error);
        throw new Error('Failed to create farm');
    }
}

export async function deleteFarm(farmId: string, _legacyUserId?: string) {
    try {
        const { effectiveUserId, callerRole } = await requireEffectiveUserId();
        await assertFarmOwnership(farmId, effectiveUserId, callerRole);
        await prisma.farm.delete({ where: { id: farmId } });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Error deleting farm:', error);
        throw new Error('Failed to delete farm');
    }
}

export async function updateFarm(farmId: string, _legacyUserId: unknown, data: unknown) {
    const parsed = FarmSchema.partial().safeParse(data);
    if (!parsed.success) {
        const messages = parsed.error.issues.map((e) => e.message).join(', ');
        throw new Error(`Datos inválidos: ${messages}`);
    }

    try {
        const { effectiveUserId, callerRole } = await requireEffectiveUserId();
        await assertFarmOwnership(farmId, effectiveUserId, callerRole);

        const input = parsed.data;

        // Build a partial update payload: only include keys the caller actually
        // sent. Prevents the previous bug where unspecified JSON fields were
        // wiped to '{}'/'[]'.
        const update: Record<string, unknown> = {};
        if (input.name !== undefined) update.name = input.name;
        if (input.municipio !== undefined) update.municipio = input.municipio;
        if (input.municipioCode !== undefined) update.municipioCode = input.municipioCode;
        if (input.provinciaCode !== undefined) update.provinciaCode = input.provinciaCode;
        if (input.poligono !== undefined) update.poligono = input.poligono;
        if (input.parcela !== undefined) update.parcela = input.parcela;
        if (input.superficie !== undefined) update.superficie = input.superficie;
        if (input.recintos !== undefined) update.recintos = JSON.stringify(input.recintos);
        if (input.coords !== undefined) update.coords = JSON.stringify(input.coords);
        if (input.slope !== undefined) update.slope = input.slope;
        if (input.license !== undefined) update.license = input.license;
        if (input.maxHeads !== undefined) update.maxHeads = input.maxHeads;
        if (input.soilId !== undefined) update.soilId = input.soilId;
        if (input.corrals !== undefined) update.corrals = input.corrals;
        if (input.corralNames !== undefined) update.corralNames = JSON.stringify(input.corralNames);
        if (input.feedingSystem !== undefined) update.feedingSystem = input.feedingSystem;
        if (input.irrigationCoef !== undefined) update.irrigationCoef = input.irrigationCoef;
        if (input.climateStudy !== undefined) update.climateStudy = JSON.stringify(input.climateStudy);
        if (input.cropsRecommendation !== undefined) update.cropsRecommendation = JSON.stringify(input.cropsRecommendation);
        if (input.breedsRecommendation !== undefined) update.breedsRecommendation = JSON.stringify(input.breedsRecommendation);
        if (input.f1Recommendation !== undefined) update.f1Recommendation = JSON.stringify(input.f1Recommendation);
        if (input.farmType !== undefined) update.farmType = input.farmType;
        if (input.purpose !== undefined) update.purpose = input.purpose;
        if (input.parentFarmId !== undefined) {
            if (input.parentFarmId === farmId) {
                throw new Error('Una finca no puede ser su propia finca principal');
            }
            if (input.parentFarmId !== null) {
                const parent = await prisma.farm.findUnique({
                    where: { id: input.parentFarmId },
                    select: { id: true, userId: true, parentFarmId: true },
                });
                if (!parent) throw new Error('La finca principal indicada no existe');
                if (parent.userId !== effectiveUserId) throw new Error('La finca principal no te pertenece');
                if (parent.parentFarmId) throw new Error('No se pueden encadenar jerarquías (la principal seleccionada ya es asociada)');
            }
            update.parentFarmId = input.parentFarmId;
        }

        const farm = await prisma.farm.update({
            where: { id: farmId },
            data: update,
        });

        revalidatePath('/dashboard');
        return parseFarm(farm);
    } catch (error) {
        console.error('Error updating farm:', error);
        throw new Error('Failed to update farm');
    }
}
