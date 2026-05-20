'use server';

import { prisma } from '@/lib/prisma';
import {
    requireEffectiveUserId,
    assertFarmOwnership,
    assertAnimalOwnership,
} from '@/lib/server-utils';
import { revalidatePath } from 'next/cache';
import {
    farmReproductionMetrics,
    sireFertility,
    reproductiveRadar,
    evaluateFemale,
    type RepEvent,
    type RepEventType,
    type AnimalSummary,
} from '@/services/reproductionEngine';
import {
    computeFollowUpEvents,
    type SchedulerEvent,
} from '@/services/reproductionScheduler';

/**
 * Server actions del módulo reproductivo. Trabaja sobre el modelo
 * `ManagementEvent` ya existente — los subtipos reproductivos van en
 * `type` y los detalles (sireId, método IA, resultado diagnóstico) en
 * `eventData` (JSON string).
 *
 * Los subtipos extra introducidos:
 *   - 'celo'
 *   - 'inseminacion'
 *   - 'diagnostico_gestacion'
 *   - 'aborto'
 *   - 'examen_andrologico'
 *
 * 'cubricion' y 'parto' ya existían y se reutilizan tal cual.
 */

const REP_EVENT_TYPES: RepEventType[] = [
    'celo',
    'inseminacion',
    'cubricion',
    'diagnostico_gestacion',
    'aborto',
    'parto',
    'examen_andrologico',
];

// ─── ALTAS ─────────────────────────────────────────────────────────────────────

export interface RepEventInput {
    farmId: string;
    animalId: string;
    type: RepEventType;
    date: string; // ISO
    data?: Record<string, unknown>;
    notes?: string;
}

export async function recordReproductiveEvent(input: RepEventInput) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(input.farmId, effectiveUserId, callerRole);
    await assertAnimalOwnership(input.animalId, effectiveUserId, callerRole);

    if (!REP_EVENT_TYPES.includes(input.type)) {
        throw new Error(`Tipo no soportado: ${input.type}`);
    }

    // Validar coherencia mínima: solo machos pueden tener examen_andrologico.
    if (input.type === 'examen_andrologico') {
        const a = await prisma.animal.findUnique({
            where: { id: input.animalId },
            select: { sex: true },
        });
        if (a && a.sex !== 'M') {
            throw new Error('El examen andrológico solo aplica a machos');
        }
    }

    const result = await prisma.managementEvent.create({
        data: {
            farmId: input.farmId,
            animalId: input.animalId,
            type: input.type,
            date: new Date(input.date),
            eventData: input.data ? JSON.stringify(input.data) : null,
            notes: input.notes,
        },
    });

    // Auto-programación en cascada: a partir de este evento, calcular
    // los hitos futuros derivados (diagnóstico, parto, destete...) y
    // cancelar los que dejen de tener sentido (parto previsto al
    // diagnosticar negativo o abortar). Toda la lógica está en el motor
    // puro `reproductionScheduler` para ser testeable.
    await applyFollowUpCascade({
        farmId: input.farmId,
        animalId: input.animalId,
        triggerEventId: result.id,
        triggerType: input.type,
        triggerDate: new Date(input.date),
        triggerData: input.data,
    });

    revalidatePath('/dashboard');
    return result;
}

async function applyFollowUpCascade(args: {
    farmId: string;
    animalId: string;
    triggerEventId: string;
    triggerType: RepEventType;
    triggerDate: Date;
    triggerData?: Record<string, unknown>;
}) {
    // Eventos `scheduled` actuales del animal que pueden quedar
    // obsoletos o ser respetados por el scheduler.
    const existing = await prisma.managementEvent.findMany({
        where: {
            animalId: args.animalId,
            status: 'scheduled',
        },
        select: { id: true, type: true, date: true, status: true },
    });
    const existingScheduled: SchedulerEvent[] = existing.map((e) => ({
        id: e.id,
        animalId: args.animalId,
        farmId: args.farmId,
        type: e.type as SchedulerEvent['type'],
        date: e.date,
        status: 'scheduled',
    }));

    const { toCreate, toCancel } = computeFollowUpEvents({
        triggerEvent: {
            id: args.triggerEventId,
            animalId: args.animalId,
            farmId: args.farmId,
            type: args.triggerType,
            date: args.triggerDate,
            status: 'completed',
            data: args.triggerData,
        },
        existingScheduled,
    });

    if (toCancel.length > 0) {
        await prisma.managementEvent.updateMany({
            where: { id: { in: toCancel } },
            data: { status: 'cancelled' },
        });
    }
    if (toCreate.length > 0) {
        await prisma.managementEvent.createMany({
            data: toCreate.map((e) => ({
                farmId: e.farmId,
                animalId: e.animalId,
                type: e.type,
                date: e.date,
                status: 'scheduled',
                notes: e.notes,
                eventData: JSON.stringify({
                    parentEventId: e.parentEventId,
                    ...(e.data ?? {}),
                }),
            })),
        });
    }
}

export async function deleteReproductiveEvent(eventId: string) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    const ev = await prisma.managementEvent.findUnique({
        where: { id: eventId },
        select: { farmId: true, type: true },
    });
    if (!ev) throw new Error('Evento no encontrado');
    await assertFarmOwnership(ev.farmId, effectiveUserId, callerRole);
    if (!REP_EVENT_TYPES.includes(ev.type as RepEventType)) {
        throw new Error('Este evento no es reproductivo');
    }
    await prisma.managementEvent.delete({ where: { id: eventId } });
    revalidatePath('/dashboard');
}

// ─── LECTURAS ──────────────────────────────────────────────────────────────────

export async function listReproductiveEvents(farmId: string, options?: {
    animalId?: string;
    type?: RepEventType;
    from?: string;
    to?: string;
}) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(farmId, effectiveUserId, callerRole);

    return prisma.managementEvent.findMany({
        where: {
            farmId,
            type: options?.type
                ? options.type
                : { in: REP_EVENT_TYPES },
            ...(options?.animalId ? { animalId: options.animalId } : {}),
            ...(options?.from || options?.to
                ? {
                      date: {
                          ...(options?.from ? { gte: new Date(options.from) } : {}),
                          ...(options?.to ? { lte: new Date(options.to) } : {}),
                      },
                  }
                : {}),
        },
        orderBy: { date: 'desc' },
        take: 300,
    });
}

// ─── MÉTRICAS ──────────────────────────────────────────────────────────────────

export interface ReproductionDashboard {
    metrics: ReturnType<typeof farmReproductionMetrics>;
    radar: ReturnType<typeof reproductiveRadar>;
    sireStats: ReturnType<typeof sireFertility>;
    activePregnancies: Array<{
        animalId: string;
        sireId?: string;
        servicioDate: Date;
        confirmedDate: Date;
        estimatedCalvingDate?: Date;
    }>;
    overdueChecks: Array<{
        animalId: string;
        servicioDate: Date;
        daysSinceService: number;
    }>;
}

/**
 * Calcula el cuadro reproductivo completo para una finca: métricas
 * agregadas, radar, fertilidad por toro, gestaciones activas y servicios
 * que ya deberían tener diagnóstico (>45 días).
 */
export async function getReproductionDashboard(
    farmId: string,
): Promise<ReproductionDashboard> {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(farmId, effectiveUserId, callerRole);

    const [animals, prismaEvents] = await Promise.all([
        prisma.animal.findMany({
            where: { farmId },
            select: { id: true, sex: true, birthDate: true, status: true },
        }),
        prisma.managementEvent.findMany({
            where: {
                farmId,
                type: { in: REP_EVENT_TYPES },
            },
            select: {
                id: true,
                animalId: true,
                type: true,
                date: true,
                eventData: true,
            },
        }),
    ]);

    const animalSnaps: AnimalSummary[] = animals.map((a) => ({
        id: a.id,
        sex: a.sex,
        birthDate: a.birthDate,
        status: a.status,
    }));

    const events: RepEvent[] = prismaEvents
        .filter((e) => e.animalId)
        .map((e) => ({
            id: e.id,
            animalId: e.animalId!,
            type: e.type as RepEventType,
            date: e.date,
            data: e.eventData ? safeJSON(e.eventData) : null,
        }));

    const metrics = farmReproductionMetrics(animalSnaps, events);
    const radar = reproductiveRadar(metrics);
    const sireStats = sireFertility(events);

    // Gestaciones activas + chequeos atrasados
    const eventsByAnimal = new Map<string, RepEvent[]>();
    for (const e of events) {
        const list = eventsByAnimal.get(e.animalId) ?? [];
        list.push(e);
        eventsByAnimal.set(e.animalId, list);
    }

    const now = new Date();
    const activePregnancies: ReproductionDashboard['activePregnancies'] = [];
    const overdueChecks: ReproductionDashboard['overdueChecks'] = [];

    for (const a of animalSnaps) {
        if (a.sex !== 'H') continue;
        const own = eventsByAnimal.get(a.id) ?? [];
        const state = evaluateFemale(a, own, now);

        if (state.status === 'gestante' && state.lastServicio && state.pregnancyConfirmed) {
            activePregnancies.push({
                animalId: a.id,
                sireId: state.lastServicio.sireId,
                servicioDate: state.lastServicio.date,
                confirmedDate: state.pregnancyConfirmed,
                estimatedCalvingDate: state.estimatedCalvingDate,
            });
        }

        if (
            state.status === 'vacia' &&
            state.lastServicio &&
            // Si hay un diagnóstico (positivo o negativo) posterior al servicio, no es atrasado.
            !own.some(
                (e) =>
                    e.type === 'diagnostico_gestacion' &&
                    e.date > state.lastServicio!.date,
            )
        ) {
            const days = (now.getTime() - state.lastServicio.date.getTime()) / 86_400_000;
            if (days >= 45) {
                overdueChecks.push({
                    animalId: a.id,
                    servicioDate: state.lastServicio.date,
                    daysSinceService: days,
                });
            }
        }
    }

    return { metrics, radar, sireStats, activePregnancies, overdueChecks };
}

function safeJSON(raw: string): Record<string, unknown> | null {
    try {
        const parsed = JSON.parse(raw);
        return typeof parsed === 'object' && parsed !== null
            ? (parsed as Record<string, unknown>)
            : null;
    } catch {
        return null;
    }
}
