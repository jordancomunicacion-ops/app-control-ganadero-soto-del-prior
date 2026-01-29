'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getAnimals(userId: string) {
    // For now, fetch ALL animals for a user (across all farms).
    // Or we can filter by farm if needed.
    // The current UI shows all animals in one list often, or filters locally.
    // Let's fetch all animals where farm belongs to user.
    try {
        const animals = await prisma.animal.findMany({
            where: {
                farm: {
                    userId: userId
                }
            },
            orderBy: { createdAt: 'desc' },
            include: {
                farm: { select: { name: true, id: true } }
            }
        });

        return animals.map(a => ({
            ...a,
            // Map keys back to frontend expected structure if needed
            birth: a.birthDate.toISOString().split('T')[0],
            weight: a.currentWeight,
            farm: a.farm.name, // Flatten for UI compatibility
            farmId: a.farmId,
            breed: a.breedName
        }));
    } catch (error) {
        console.error('Error fetching animals:', error);
        return [];
    }
}

import { BreedManager } from '@/services/breedManager';
import { GeneticsEngine } from '@/services/geneticsEngine';

export async function createAnimal(data: any) {
    try {
        const {
            id, // Crotal
            name, farmId, breed, sex, birth, weight, notes, father, mother, corral
        } = data;

        // Regla A3: Determinación dinámica del tipo funcional
        const knownBreed = BreedManager.getBreedByName(breed || '') || BreedManager.getBreedById(breed || '');

        let functionalType = 'rustica_adaptada'; // Default seguro
        let type = 'pure';
        let confidence = 0.8;

        if (knownBreed) {
            // Map Snake_Case from BreedManager to CamelCase for GeneticsEngine
            const breedForEngine = {
                code: knownBreed.code,
                marblingPotential: knownBreed.marbling_potential,
                adgFeedlot: knownBreed.adg_feedlot,
                heatTolerance: knownBreed.heat_tolerance,
                milkPotential: knownBreed.milk_potential,
                conformationPotential: knownBreed.conformation_potential
            };

            functionalType = GeneticsEngine.determineFunctionalType(breedForEngine) as any;
            // Si es una raza base definida, confianza alta
            confidence = 1.0;
        } else {
            // Si no reconoce la raza, intenta inferir si es F1 por el nombre
            if ((breed || '').toUpperCase().includes('F1') || (breed || '').toUpperCase().includes('CRUCE')) {
                type = 'f1';
                functionalType = 'composito'; // Por defecto para cruces desconocidos
            }
        }

        const animal = await prisma.animal.create({
            data: {
                id: id,
                sex,
                birthDate: new Date(birth),
                breedName: breed,
                currentWeight: parseFloat(weight || 0),
                notes,
                corral,
                farm: {
                    connect: { id: farmId }
                },
                genotype: {
                    create: {
                        type: type,
                        label: breed || 'Mestizo Indeterminado',
                        confidence: confidence,
                        functionalType: functionalType
                    }
                }
            }
        });
        revalidatePath('/dashboard');
        return animal;
    } catch (error) {
        console.error('Error creating animal:', error);
        throw new Error('Failed to create animal');
    }
}

export async function deleteAnimal(id: string) {
    try {
        await prisma.animal.delete({
            where: { id }
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Error deleting animal:', error);
        throw new Error('Failed to delete animal');
    }
}
