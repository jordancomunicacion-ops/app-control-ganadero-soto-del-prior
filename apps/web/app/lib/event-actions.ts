'use server';

import { prisma } from '@/lib/prisma';
import { getEffectiveUserId, safeJsonParse } from '@/lib/server-utils';
import { revalidatePath } from 'next/cache';
import { EventSchema } from './schemas';

export async function getEvents(userId: string, options?: { page?: number; pageSize?: number }) {
    if (!userId) return { data: [], total: 0, page: 1, pageSize: 100 };
    const page = Math.max(1, options?.page ?? 1);
    const pageSize = Math.min(200, options?.pageSize ?? 100);
    try {
        const effectiveUserId = await getEffectiveUserId(userId);
        const where = { farm: { userId: effectiveUserId } };
        const [events, total] = await prisma.$transaction([
            prisma.managementEvent.findMany({
                where,
                orderBy: { date: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: { animal: { select: { id: true } } },
            }),
            prisma.managementEvent.count({ where }),
        ]);

        return {
            data: events.map((e) => ({
                ...e,
                date: e.date.toISOString().split('T')[0],
                desc: e.details || e.notes,
                typeData: safeJsonParse(e.eventData, {}),
                animalCrotal: e.animalId,
            })),
            total,
            page,
            pageSize,
        };
    } catch (error) {
        console.error('Error fetching events:', error);
        return { data: [], total: 0, page, pageSize };
    }
}

export async function createEvent(data: unknown) {
    const parsed = EventSchema.safeParse(data);
    if (!parsed.success) {
        const messages = parsed.error.issues.map((e) => e.message).join(', ');
        throw new Error(`Datos inválidos: ${messages}`);
    }

    try {
        const {
            type, date, desc, cost, status,
            animalId, farmId,
            typeData,
            notes
        } = parsed.data;

        let valAnimalId: string | null = animalId ?? null;
        if (valAnimalId === 'FARM_EVENT' || valAnimalId === 'GENERAL') {
            valAnimalId = null;
        }

        const event = await prisma.managementEvent.create({
            data: {
                type,
                date: new Date(date),
                details: desc || notes,
                cost: cost ?? 0,
                status: status || 'completed',
                eventData: JSON.stringify(typeData || {}),
                farm: { connect: { id: farmId } },
                ...(valAnimalId ? { animal: { connect: { id: valAnimalId } } } : {}),
            },
        });
        revalidatePath('/dashboard');
        return event;
    } catch (error) {
        console.error('Error creating event:', error);
        throw new Error('Failed to create event: ' + (error as Error).message);
    }
}

export async function deleteEvent(eventId: string, userId: string) {
    try {
        const effectiveUserId = await getEffectiveUserId(userId);

        // Verify ownership before deleting
        const event = await prisma.managementEvent.findFirst({
            where: { id: eventId, farm: { userId: effectiveUserId } },
            select: { id: true }
        });

        if (!event) throw new Error('Event not found or access denied');

        await prisma.managementEvent.delete({ where: { id: eventId } });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Error deleting event:', error);
        throw new Error('Failed to delete event');
    }
}
