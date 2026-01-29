'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getEvents(userId: string) {
    if (!userId) return [];
    try {
        // Fetch ALL events for farms owned by user
        // OR fetch events for animals owned by user
        // Simplest: Fetch events where Farm.userId = userId OR Animal.Farm.userId = userId
        // But Event has direct relation to Farm and Animal.

        // Let's fetch events linked to Farms owned by User
        // AND events linked to Animals in Farms owned by User

        // Actually, schema has: 
        // farmId -> Farm
        // animalId -> Animal

        // We can just query events where farm.userId == userId
        // Note: For animal events, they should still have farmId set? 
        // Schema says: farmId is required in ManagementEvent? 
        // Let's check schema. Yes: farmId String

        const events = await prisma.managementEvent.findMany({
            where: {
                farm: {
                    userId: userId
                }
            },
            orderBy: { date: 'desc' },
            include: {
                animal: { select: { id: true } }
                // Wait, Animal ID is Crotal in schema.
            }
        });

        return events.map((e: any) => ({
            ...e,
            date: e.date.toISOString().split('T')[0],
            desc: e.details || e.notes, // Map backend 'details' to frontend 'desc'
            typeData: e.eventData ? JSON.parse(e.eventData) : {},
            animalCrotal: e.animalId // If ID is crotal
        }));

    } catch (error) {
        console.error('Error fetching events:', error);
        return [];
    }
}

export async function createEvent(data: any) {
    try {
        const {
            id, // UUID from frontend
            type, date, desc, cost, status,
            animalId, farmId, // Relations
            typeData, // JSON
            // legacy fields mapping
            notes
        } = data;

        // If animalId is "FARM_EVENT" or "GENERAL", handle it.
        // Frontend sends "FARM_EVENT" sometimes.
        let valAnimalId = animalId;
        if (animalId === 'FARM_EVENT' || animalId === 'GENERAL') {
            valAnimalId = null;
        }

        const event = await prisma.managementEvent.create({
            data: {
                // If ID provided, use it? Prisma defaults to CUID. 
                // Frontend generates UUIDs. We can try to use them if valid CUIDs or just let DB generate.
                // Let's let DB generate to be safe, unless we really need that ID. 
                // Frontend uses ID for keys.
                // We'll ignore frontend ID for creation to avoid format issues.
                type,
                date: new Date(date),
                details: desc || notes,
                cost: parseFloat(cost || 0),
                status: status || 'completed',
                eventData: JSON.stringify(typeData || {}),
                farm: { connect: { id: farmId } }, // Required
                ...(valAnimalId ? { animal: { connect: { id: valAnimalId } } } : {})
            } as any
        });
        revalidatePath('/dashboard');
        return event;
    } catch (error) {
        console.error('Error creating event:', error);
        throw new Error('Failed to create event: ' + (error as Error).message);
    }
}

export async function deleteEvent(eventId: string) {
    try {
        await prisma.managementEvent.delete({
            where: { id: eventId }
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Error deleting event:', error);
        throw new Error('Failed to delete event');
    }
}
