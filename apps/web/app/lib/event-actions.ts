'use server';

import { prisma } from '@/lib/prisma';
import {
    requireEffectiveUserId,
    assertFarmOwnership,
    assertAnimalOwnership,
    safeJsonParse,
} from '@/lib/server-utils';
import { revalidatePath } from 'next/cache';
import { EventSchema } from './schemas';
import { computeSalesPriceServer } from '@/lib/price-service';

// Event types that should freeze the animal's outcome on the Animal row.
const EXIT_EVENT_TYPES = new Set([
    'Sacrificio',
    'Sacrificio Obligatorio',
    'Venta',
    'Muerte',
    'Muerte/Sacrificio',
    'Salida',
    'Baja',
]);

function statusFromEventType(type: string): string {
    if (type.startsWith('Sacrificio')) return 'Sacrificado';
    if (type === 'Venta' || type === 'Salida') return 'Vendido';
    if (type === 'Muerte' || type === 'Muerte/Sacrificio') return 'Muerto';
    return 'Baja';
}

function toFiniteNumber(v: unknown): number | undefined {
    if (v === null || v === undefined || v === '') return undefined;
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : undefined;
}

function toIntInRange(v: unknown, min: number, max: number): number | undefined {
    const n = toFiniteNumber(v);
    if (n === undefined) return undefined;
    return Math.max(min, Math.min(max, Math.round(n)));
}

export async function getEvents(_legacyUserId?: string, options?: { page?: number; pageSize?: number }) {
    const page = Math.max(1, options?.page ?? 1);
    const pageSize = Math.min(200, options?.pageSize ?? 100);
    try {
        const { effectiveUserId } = await requireEffectiveUserId();
        const where = { farm: { userId: effectiveUserId } };
        const [events, total] = await Promise.all([
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

    const { effectiveUserId, callerRole } = await requireEffectiveUserId();

    const {
        type, date, desc, cost, status,
        animalId, farmId,
        typeData,
        notes,
    } = parsed.data;

    // Authorize farm ownership and, if applicable, animal ownership.
    await assertFarmOwnership(farmId, effectiveUserId, callerRole);

    let valAnimalId: string | null = animalId ?? null;
    if (valAnimalId === 'FARM_EVENT' || valAnimalId === 'GENERAL') {
        valAnimalId = null;
    }
    if (valAnimalId) {
        const animal = await assertAnimalOwnership(valAnimalId, effectiveUserId, callerRole);
        if (animal.farmId !== farmId) {
            throw new Error('Forbidden: animal does not belong to selected farm');
        }
    }

    // Slaughter / sale events: parse the typeData payload, compute the
    // missing price from the SEUROP grid when only conf+fat are given, and
    // freeze the outcome on the Animal row.
    let animalUpdate: Record<string, unknown> | null = null;
    let enrichedTypeData = typeData ? { ...typeData } : undefined;

    if (valAnimalId && EXIT_EVENT_TYPES.has(type)) {
        const td = (typeData ?? {}) as Record<string, unknown>;
        const liveWeight = toFiniteNumber(td.liveWeight ?? td.weightLive);
        const carcassWeight = toFiniteNumber(td.carcassWeight ?? td.weightCarcass);
        const yieldVal = toFiniteNumber(td.yield);
        const seuropConf = typeof td.seuropConf === 'string'
            ? td.seuropConf.toUpperCase().trim()
            : typeof td.conf === 'string'
              ? td.conf.toUpperCase().trim()
              : undefined;
        const seuropFat = toIntInRange(td.fatCover ?? td.fat, 1, 5);
        let price = toFiniteNumber(td.price);
        let pricePerKg = toFiniteNumber(td.pricePerKg);

        // Compute price from the SEUROP grid when the user only supplied
        // conf + fat (+ carcass weight). Pulls fresh weekly prices from DB,
        // falling back to PriceEngine defaults.
        if (price === undefined && carcassWeight && seuropConf && seuropFat !== undefined) {
            try {
                const animal = await prisma.animal.findUnique({
                    where: { id: valAnimalId },
                    select: { sex: true, birthDate: true, category: true, status: true },
                });
                if (animal) {
                    const ageMonths =
                        (new Date(date).getTime() - animal.birthDate.getTime()) /
                        (1000 * 60 * 60 * 24 * 30.44);
                    const sale = await computeSalesPriceServer(
                        {
                            ageMonths,
                            sex: animal.sex,
                            isCastrated: animal.sex === 'Castrado',
                            isParida:
                                animal.status === 'Parto' ||
                                animal.category === 'Nodriza',
                        },
                        carcassWeight,
                        seuropConf,
                        seuropFat,
                    );
                    price = sale.totalValue;
                    pricePerKg = sale.pricePerKg;
                    enrichedTypeData = {
                        ...(enrichedTypeData ?? {}),
                        price,
                        pricePerKg,
                        priceSource: sale.priceSource,
                        categoryCode: sale.categoryCode,
                        autoPriced: true,
                    };
                }
            } catch (e) {
                console.error('Auto-pricing failed, leaving actualPrice empty:', e);
            }
        }

        animalUpdate = {
            status: statusFromEventType(type),
            exitDate: new Date(date),
            ...(liveWeight !== undefined ? { actualLiveWeight: liveWeight } : {}),
            ...(carcassWeight !== undefined ? { actualCarcassWeight: carcassWeight } : {}),
            ...(yieldVal !== undefined
                ? { actualYield: yieldVal > 1 ? yieldVal / 100 : yieldVal }
                : carcassWeight && liveWeight
                  ? { actualYield: parseFloat((carcassWeight / liveWeight).toFixed(4)) }
                  : {}),
            ...(price !== undefined ? { actualPrice: price } : {}),
            ...(pricePerKg !== undefined
                ? { actualPricePerKg: pricePerKg }
                : price !== undefined && carcassWeight
                  ? { actualPricePerKg: parseFloat((price / carcassWeight).toFixed(2)) }
                  : {}),
            ...(seuropConf ? { actualSeuropConf: seuropConf } : {}),
            ...(seuropFat !== undefined ? { actualSeuropFat: seuropFat } : {}),
            ...(typeof td.category === 'string' ? { actualCategory: td.category } : {}),
            ...(typeof td.deathReason === 'string' ? { deathReason: td.deathReason } : {}),
        };
    }

    try {
        const event = await prisma.$transaction(async (tx) => {
            const created = await tx.managementEvent.create({
                data: {
                    type,
                    date: new Date(date),
                    details: desc || notes,
                    cost: cost ?? 0,
                    status: status || 'completed',
                    eventData: JSON.stringify(enrichedTypeData || {}),
                    farm: { connect: { id: farmId } },
                    ...(valAnimalId ? { animal: { connect: { id: valAnimalId } } } : {}),
                },
            });
            if (valAnimalId && animalUpdate) {
                await tx.animal.update({
                    where: { id: valAnimalId },
                    data: animalUpdate,
                });
            }
            return created;
        });
        revalidatePath('/dashboard');
        return event;
    } catch (error) {
        console.error('Error creating event:', error);
        throw new Error('Failed to create event: ' + (error as Error).message);
    }
}

export async function deleteEvent(eventId: string, _legacyUserId?: string) {
    try {
        const { effectiveUserId, callerRole } = await requireEffectiveUserId();

        const event = await prisma.managementEvent.findUnique({
            where: { id: eventId },
            select: { id: true, farm: { select: { userId: true } } },
        });

        if (!event) throw new Error('Event not found');
        if (callerRole !== 'ADMIN' && event.farm.userId !== effectiveUserId) {
            throw new Error('Forbidden: event does not belong to user');
        }

        await prisma.managementEvent.delete({ where: { id: eventId } });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Error deleting event:', error);
        throw new Error('Failed to delete event');
    }
}
