'use server';

import { prisma } from '@/lib/prisma';
import { getEffectiveUserId } from '@/lib/server-utils';
import { revalidatePath } from 'next/cache';
import { BreedManager } from '@/services/breedManager';
import { GeneticsEngine } from '@/services/geneticsEngine';
import { AnimalSchema } from './schemas';

export async function getAnimals(userId: string, options?: { page?: number; pageSize?: number }) {
    if (!userId) return { data: [], total: 0, page: 1, pageSize: 100 };
    const page = Math.max(1, options?.page ?? 1);
    const pageSize = Math.min(200, options?.pageSize ?? 100);
    try {
        const effectiveUserId = await getEffectiveUserId(userId);
        const where = { farm: { userId: effectiveUserId } };
        const [animals, total] = await prisma.$transaction([
            prisma.animal.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: { farm: { select: { name: true, id: true } } },
            }),
            prisma.animal.count({ where }),
        ]);

        return {
            data: animals.map(a => ({
                ...a,
                birth: a.birthDate.toISOString().split('T')[0],
                weight: a.currentWeight,
                farm: a.farm.name,
                farmId: a.farmId,
                breed: a.breedName,
            })),
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

    try {
        const {
            id,
            farmId, breed, sex, birth, weight, notes, corral
        } = parsed.data;

        const knownBreed = BreedManager.getBreedByName(breed || '') || BreedManager.getBreedById(breed || '');

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
                conformationPotential: knownBreed.conformation_potential
            };

            functionalType = GeneticsEngine.determineFunctionalType(breedForEngine);
            confidence = 1.0;
        } else {
            if ((breed || '').toUpperCase().includes('F1') || (breed || '').toUpperCase().includes('CRUCE')) {
                type = 'f1';
                functionalType = 'composito';
            }
        }

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
                genotype: {
                    create: {
                        type,
                        label: breed || 'Mestizo Indeterminado',
                        confidence,
                        functionalType
                    }
                }
            }
        });
        revalidatePath('/dashboard');
        return animal;
    } catch (error) {
        console.error('Error creating animal:', error);
        throw new Error('Failed to create animal: ' + (error as Error).message);
    }
}

export async function deleteAnimal(id: string, userId: string) {
    try {
        const effectiveUserId = await getEffectiveUserId(userId);

        // Verify ownership before deleting
        const animal = await prisma.animal.findFirst({
            where: { id, farm: { userId: effectiveUserId } },
            select: { id: true }
        });

        if (!animal) throw new Error('Animal not found or access denied');

        await prisma.animal.delete({ where: { id } });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Error deleting animal:', error);
        throw new Error('Failed to delete animal');
    }
}
