'use server';

import { prisma } from '@/lib/prisma';
import { getEffectiveUserId, safeJsonParse } from '@/lib/server-utils';
import { revalidatePath } from 'next/cache';
import { FarmSchema } from './schemas';

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
        corralNames: f.corralNames ? f.corralNames.split(',') : [],
        climateStudy: safeJsonParse(f.climateStudy, undefined),
        cropsRecommendation: safeJsonParse(f.cropsRecommendation, []),
        breedsRecommendation: safeJsonParse(f.breedsRecommendation, []),
        f1Recommendation: safeJsonParse(f.f1Recommendation, []),
    };
}

export async function getFarms(userId: string, options?: { page?: number; pageSize?: number }) {
    if (!userId) return { data: [], total: 0, page: 1, pageSize: 50 };
    const page = Math.max(1, options?.page ?? 1);
    const pageSize = Math.min(200, options?.pageSize ?? 50);
    try {
        const effectiveUserId = await getEffectiveUserId(userId);
        const where = { userId: effectiveUserId };
        const [farms, total] = await prisma.$transaction([
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

export async function createFarm(userId: string, data: unknown) {
    const parsed = FarmSchema.safeParse(data);
    if (!parsed.success) {
        const messages = parsed.error.issues.map((e) => e.message).join(', ');
        throw new Error(`Datos inválidos: ${messages}`);
    }

    try {
        if (!userId) throw new Error('User ID required');

        const effectiveUserId = await getEffectiveUserId(userId);

        const {
            name, municipio, municipioCode, provinciaCode, poligono, parcela,
            superficie, recintos, coords, slope, license, maxHeads, soilId,
            corrals, corralNames, feedingSystem,
            climateStudy, cropsRecommendation, breedsRecommendation, f1Recommendation, irrigationCoef
        } = parsed.data;

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
                corralNames: Array.isArray(corralNames) ? corralNames.join(',') : '',
                feedingSystem,
                irrigationCoef: irrigationCoef ?? 0,
                climateStudy: JSON.stringify(climateStudy ?? {}),
                cropsRecommendation: JSON.stringify(cropsRecommendation ?? []),
                breedsRecommendation: JSON.stringify(breedsRecommendation ?? []),
                f1Recommendation: JSON.stringify(f1Recommendation ?? []),
            }
        });

        revalidatePath('/dashboard');
        return parseFarm(farm);
    } catch (error) {
        console.error('Error creating farm:', error);
        throw new Error('Failed to create farm');
    }
}

export async function deleteFarm(farmId: string, userId: string) {
    try {
        const effectiveUserId = await getEffectiveUserId(userId);
        await prisma.farm.delete({
            where: { id: farmId, userId: effectiveUserId },
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Error deleting farm:', error);
        throw new Error('Failed to delete farm');
    }
}

export async function updateFarm(farmId: string, userId: string, data: unknown) {
    const parsed = FarmSchema.safeParse(data);
    if (!parsed.success) {
        const messages = parsed.error.issues.map((e) => e.message).join(', ');
        throw new Error(`Datos inválidos: ${messages}`);
    }

    try {
        const effectiveUserId = await getEffectiveUserId(userId);

        const {
            name, municipio, municipioCode, provinciaCode, poligono, parcela,
            superficie, recintos, coords, slope, license, maxHeads, soilId,
            corrals, corralNames, feedingSystem,
            climateStudy, cropsRecommendation, breedsRecommendation, f1Recommendation, irrigationCoef
        } = parsed.data;

        const farm = await prisma.farm.update({
            where: { id: farmId, userId: effectiveUserId },
            data: {
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
                corralNames: Array.isArray(corralNames) ? corralNames.join(',') : '',
                feedingSystem,
                irrigationCoef: irrigationCoef ?? 0,
                climateStudy: JSON.stringify(climateStudy ?? {}),
                cropsRecommendation: JSON.stringify(cropsRecommendation ?? []),
                breedsRecommendation: JSON.stringify(breedsRecommendation ?? []),
                f1Recommendation: JSON.stringify(f1Recommendation ?? []),
            }
        });

        revalidatePath('/dashboard');
        return parseFarm(farm);
    } catch (error) {
        console.error('Error updating farm:', error);
        throw new Error('Failed to update farm');
    }
}
