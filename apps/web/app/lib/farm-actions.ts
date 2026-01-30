'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getFarms(userId: string) {
    if (!userId) return [];
    try {
        const farms = await prisma.farm.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        // Parse JSON fields
        return farms.map(f => ({
            ...f,
            recintos: f.recintos ? JSON.parse(f.recintos) : [],
            coords: f.coords ? JSON.parse(f.coords) : undefined,
            corralNames: f.corralNames ? f.corralNames.split(',') : [],
            climateStudy: f.climateStudy ? JSON.parse(f.climateStudy) : undefined,
            cropsRecommendation: f.cropsRecommendation ? JSON.parse(f.cropsRecommendation) : [],
            breedsRecommendation: f.breedsRecommendation ? JSON.parse(f.breedsRecommendation) : [],
            f1Recommendation: f.f1Recommendation ? JSON.parse(f.f1Recommendation) : []
        }));
    } catch (error) {
        console.error('Error fetching farms:', error);
        return [];
    }
}

export async function createFarm(userId: string, data: any) {
    try {
        if (!userId) throw new Error('User ID required');

        const {
            name, municipio, municipioCode, provinciaCode, poligono, parcela,
            superficie, recintos, coords, slope, license, maxHeads, soilId,
            corrals, corralNames, feedingSystem,
            climateStudy, cropsRecommendation, breedsRecommendation, f1Recommendation, irrigationCoef
        } = data;

        const farm = await prisma.farm.create({
            data: {
                userId,
                name,
                municipio,
                municipioCode,
                provinciaCode,
                poligono,
                parcela,
                superficie: parseFloat(superficie || 0),
                recintos: JSON.stringify(recintos || []),
                coords: JSON.stringify(coords || {}),
                slope: parseFloat(slope || 0),
                license,
                maxHeads: parseInt(maxHeads || 0),
                soilId,
                corrals: parseInt(corrals || 0),
                corralNames: Array.isArray(corralNames) ? corralNames.join(',') : '',
                feedingSystem,
                irrigationCoef: parseFloat(irrigationCoef || 0),
                climateStudy: JSON.stringify(climateStudy || {}),
                cropsRecommendation: JSON.stringify(cropsRecommendation || []),
                breedsRecommendation: JSON.stringify(breedsRecommendation || []),
                f1Recommendation: JSON.stringify(f1Recommendation || []),
            }
        });

        revalidatePath('/dashboard');

        // Return parsed version so UI doesn't crash on newly added item
        return {
            ...farm,
            recintos: farm.recintos ? JSON.parse(farm.recintos) : [],
            coords: farm.coords ? JSON.parse(farm.coords) : undefined,
            corralNames: farm.corralNames ? farm.corralNames.split(',') : [],
            climateStudy: farm.climateStudy ? JSON.parse(farm.climateStudy) : undefined,
            cropsRecommendation: farm.cropsRecommendation ? JSON.parse(farm.cropsRecommendation) : [],
            breedsRecommendation: farm.breedsRecommendation ? JSON.parse(farm.breedsRecommendation) : [],
            f1Recommendation: farm.f1Recommendation ? JSON.parse(farm.f1Recommendation) : []
        };
    } catch (error) {
        console.error('Error creating farm:', error);
        throw new Error('Failed to create farm');
    }
}

export async function deleteFarm(farmId: string, userId: string) {
    try {
        await prisma.farm.delete({
            where: { id: farmId, userId } // Ensure ownership
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Error deleting farm:', error);
        throw new Error('Failed to delete farm');
    }
}

export async function updateFarm(farmId: string, userId: string, data: any) {
    try {
        const {
            name, municipio, municipioCode, provinciaCode, poligono, parcela,
            superficie, recintos, coords, slope, license, maxHeads, soilId,
            corrals, corralNames, feedingSystem,
            climateStudy, cropsRecommendation, breedsRecommendation, f1Recommendation, irrigationCoef
        } = data;

        const farm = await prisma.farm.update({
            where: { id: farmId, userId },
            data: {
                name,
                municipio,
                municipioCode,
                provinciaCode,
                poligono,
                parcela,
                superficie: parseFloat(superficie || 0),
                recintos: JSON.stringify(recintos || []),
                coords: JSON.stringify(coords || {}),
                slope: parseFloat(slope || 0),
                license,
                maxHeads: parseInt(maxHeads || 0),
                soilId,
                corrals: parseInt(corrals || 0),
                corralNames: Array.isArray(corralNames) ? corralNames.join(',') : '',
                feedingSystem,
                irrigationCoef: parseFloat(irrigationCoef || 0),
                climateStudy: JSON.stringify(climateStudy || {}),
                cropsRecommendation: JSON.stringify(cropsRecommendation || []),
                breedsRecommendation: JSON.stringify(breedsRecommendation || []),
                f1Recommendation: JSON.stringify(f1Recommendation || []),
            }
        });

        revalidatePath('/dashboard');

        // Return parsed version
        return {
            ...farm,
            recintos: farm.recintos ? JSON.parse(farm.recintos) : [],
            coords: farm.coords ? JSON.parse(farm.coords) : undefined,
            corralNames: farm.corralNames ? farm.corralNames.split(',') : [],
            climateStudy: farm.climateStudy ? JSON.parse(farm.climateStudy) : undefined,
            cropsRecommendation: farm.cropsRecommendation ? JSON.parse(farm.cropsRecommendation) : [],
            breedsRecommendation: farm.breedsRecommendation ? JSON.parse(farm.breedsRecommendation) : [],
            f1Recommendation: farm.f1Recommendation ? JSON.parse(farm.f1Recommendation) : []
        };
    } catch (error) {
        console.error('Error updating farm:', error);
        throw new Error('Failed to update farm');
    }
}
