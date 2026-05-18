'use server';

import { prisma } from '@/lib/prisma';
import {
    requireEffectiveUserId,
    assertFarmOwnership,
    assertAnimalOwnership,
    safeJsonParse,
} from '@/lib/server-utils';
import { revalidatePath } from 'next/cache';
import { BreedManager } from '@/services/breedManager';
import { GeneticsEngine } from '@/services/geneticsEngine';
import { AnimalSchema } from './schemas';

export async function getAnimals(_legacyUserId?: string, options?: { page?: number; pageSize?: number }) {
    const page = Math.max(1, options?.page ?? 1);
    const pageSize = Math.min(200, options?.pageSize ?? 100);
    try {
        const { effectiveUserId } = await requireEffectiveUserId();
        const where = { farm: { userId: effectiveUserId } };
        // Use Promise.all rather than $transaction so the typed return shape
        // (animals + count) survives the Prisma client generics.
        const [animals, total] = await Promise.all([
            prisma.animal.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    farm: {
                        select: {
                            name: true,
                            id: true,
                            // Agronomic context: required to feed the soil-aware
                            // feedSelectionEngine and the carrying-capacity model.
                            soilId: true,
                            slope: true,
                            feedingSystem: true,
                            climateStudy: true,
                            coords: true,
                        },
                    },
                },
            }),
            prisma.animal.count({ where }),
        ]);

        return {
            data: animals.map((a) => {
                const farmClimate = safeJsonParse<{ avgTemp?: number; annualPrecip?: number; classification?: string }>(
                    a.farm.climateStudy,
                    {},
                );
                const farmCoords = safeJsonParse<{ lat?: number; lng?: number; lon?: number }>(a.farm.coords, {});
                return {
                    ...a,
                    birth: a.birthDate.toISOString().split('T')[0],
                    weight: a.currentWeight,
                    farm: a.farm.name,
                    farmId: a.farmId,
                    breed: a.breedName,
                    // Flattened agronomic context for the client. Avoids a
                    // second round-trip to /farms when building the diet.
                    farmSoilId: a.farm.soilId ?? undefined,
                    farmSlopePct: a.farm.slope,
                    farmFeedingSystem: a.farm.feedingSystem ?? undefined,
                    farmAvgTempC: farmClimate.avgTemp,
                    farmAnnualPrecipMm: farmClimate.annualPrecip,
                    farmClimateClass: farmClimate.classification,
                    farmCoords: farmCoords?.lat ? { lat: farmCoords.lat, lon: farmCoords.lng ?? farmCoords.lon } : undefined,
                };
            }),
            total,
            page,
            pageSize,
        };
    } catch (error) {
        console.error('Error fetching animals:', error);
        return { data: [], total: 0, page, pageSize };
    }
}

export async function createAnimal(data: unknown) {
    const parsed = AnimalSchema.safeParse(data);
    if (!parsed.success) {
        const messages = parsed.error.issues.map((e) => e.message).join(', ');
        throw new Error(`Datos inválidos: ${messages}`);
    }

    const { effectiveUserId, callerRole } = await requireEffectiveUserId();

    const { id, farmId, breed, sex, birth, weight, notes, corral } = parsed.data;

    // Authorization: caller must own the target farm.
    await assertFarmOwnership(farmId, effectiveUserId, callerRole);

    const knownBreed =
        BreedManager.getBreedByName(breed || '') || BreedManager.getBreedById(breed || '');

    let functionalType: string = 'rustica_adaptada';
    let type = 'pure';
    let confidence = 0.8;

    if (knownBreed) {
        const breedForEngine = {
            code: knownBreed.code,
            marblingPotential: knownBreed.marbling_potential,
            adgFeedlot: knownBreed.adg_feedlot,
            heatTolerance: knownBreed.heat_tolerance,
            milkPotential: knownBreed.milk_potential,
            conformationPotential: knownBreed.conformation_potential,
        };

        functionalType = GeneticsEngine.determineFunctionalType(breedForEngine);
        confidence = 1.0;
    } else if ((breed || '').toUpperCase().includes('F1') || (breed || '').toUpperCase().includes('CRUCE')) {
        type = 'f1';
        functionalType = 'composito';
    }

    const label = breed || 'Mestizo Indeterminado';

    try {
        // Reuse an existing pure genotype with the same breed label when possible.
        // Falls back to creating a new one otherwise. Avoids the previous bug of
        // creating one Genotype row per animal even for identical breeds.
        const existingGenotype = await prisma.genotype.findFirst({
            where: { type, label, functionalType, motherBreedId: null, fatherBreedId: null },
            select: { id: true },
        });

        const genotypeRelation = existingGenotype
            ? { connect: { id: existingGenotype.id } }
            : { create: { type, label, confidence, functionalType } };

        const animal = await prisma.animal.create({
            data: {
                id,
                sex,
                birthDate: new Date(birth),
                breedName: breed,
                currentWeight: weight ?? 0,
                notes,
                corral,
                farm: { connect: { id: farmId } },
                genotype: genotypeRelation,
            },
        });
        revalidatePath('/dashboard');
        return animal;
    } catch (error) {
        console.error('Error creating animal:', error);
        throw new Error('Failed to create animal: ' + (error as Error).message);
    }
}

export async function deleteAnimal(id: string, _legacyUserId?: string) {
    try {
        const { effectiveUserId, callerRole } = await requireEffectiveUserId();
        await assertAnimalOwnership(id, effectiveUserId, callerRole);

        await prisma.animal.delete({ where: { id } });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Error deleting animal:', error);
        throw new Error('Failed to delete animal');
    }
}
