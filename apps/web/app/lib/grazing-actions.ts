'use server';

import { prisma } from '@/lib/prisma';
import {
    requireEffectiveUserId,
    assertFarmOwnership,
    assertAnimalOwnership,
} from '@/lib/server-utils';
import { revalidatePath } from 'next/cache';
import {
    computeStockingByParcel,
    grazingPressure,
    restPeriodsByPlot,
    animalGrazingHistory,
    stockingStatus,
    type GrazingEventLike,
} from '@/services/grazingEngine';
import { estimateCarryingCapacity } from '@/services/soilEngine';

/**
 * Server actions del módulo de Pastoreo × SIGPAC.
 *
 * Cada evento `GrazingEvent` puede vincularse a:
 *   - Un Corral nuestro (`corralId`).
 *   - Una parcela de cultivo registrada (`cropPlotId`).
 *   - Una referencia SIGPAC libre (`sigpacRef`) para parcelas ajenas
 *     (arriendos, dehesas comunales, montes de utilidad pública).
 *
 * Por animal solo puede haber **un evento abierto** a la vez: al mover
 * un lote, los eventos anteriores se cierran automáticamente.
 */

// ─── ALTAS / CIERRES ───────────────────────────────────────────────────────────

export interface RecordGrazingInput {
    farmId: string;
    /** IDs de animales que pasan a esta parcela. Si vacío, evento colectivo. */
    animalIds: string[];
    corralId?: string;
    cropPlotId?: string;
    sigpacRef?: string;
    startAt?: string; // ISO; default now
    areaHa?: number;
    notes?: string;
}

export async function recordGrazing(input: RecordGrazingInput) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(input.farmId, effectiveUserId, callerRole);

    if (!input.corralId && !input.cropPlotId && !input.sigpacRef) {
        throw new Error(
            'Debe indicarse una parcela: corral, parcela de cultivo o referencia SIGPAC.',
        );
    }

    // Validar que las referencias pertenecen a la misma finca.
    if (input.corralId) {
        const c = await prisma.corral.findUnique({
            where: { id: input.corralId },
            select: { farmId: true },
        });
        if (!c || c.farmId !== input.farmId) {
            throw new Error('El corral no pertenece a esta finca');
        }
    }
    if (input.cropPlotId) {
        const p = await prisma.cropPlot.findUnique({
            where: { id: input.cropPlotId },
            select: { farmId: true },
        });
        if (!p || p.farmId !== input.farmId) {
            throw new Error('La parcela no pertenece a esta finca');
        }
    }

    // Resolver areaHa si no se aportó: del corral o del plot.
    let areaHa = input.areaHa;
    if (!areaHa) {
        if (input.cropPlotId) {
            const p = await prisma.cropPlot.findUnique({
                where: { id: input.cropPlotId },
                select: { surfaceHa: true },
            });
            areaHa = p?.surfaceHa ?? undefined;
        } else if (input.corralId) {
            const c = await prisma.corral.findUnique({
                where: { id: input.corralId },
                select: { surfaceM2: true },
            });
            if (c?.surfaceM2) areaHa = c.surfaceM2 / 10_000;
        }
    }

    const startAt = input.startAt ? new Date(input.startAt) : new Date();
    const animalIds = (input.animalIds ?? []).filter(Boolean);

    // Validar ownership de cada animal y cerrar evento abierto previo.
    for (const aid of animalIds) {
        await assertAnimalOwnership(aid, effectiveUserId, callerRole);
        await prisma.grazingEvent.updateMany({
            where: { animalId: aid, endAt: null },
            data: { endAt: startAt },
        });
    }

    // Si no se aportan animales individuales, crear un único evento
    // colectivo (animalId = null) con LU igual al cargo declarado (futuro).
    if (animalIds.length === 0) {
        return [
            await prisma.grazingEvent.create({
                data: {
                    farmId: input.farmId,
                    corralId: input.corralId,
                    cropPlotId: input.cropPlotId,
                    sigpacRef: input.sigpacRef,
                    startAt,
                    areaHa,
                    notes: input.notes,
                },
            }),
        ];
    }

    // Un evento por animal — facilita la trazabilidad individual.
    const created = await prisma.$transaction(
        animalIds.map((aid) =>
            prisma.grazingEvent.create({
                data: {
                    farmId: input.farmId,
                    animalId: aid,
                    corralId: input.corralId,
                    cropPlotId: input.cropPlotId,
                    sigpacRef: input.sigpacRef,
                    startAt,
                    areaHa,
                    lu: 1,
                    notes: input.notes,
                },
            }),
        ),
    );
    revalidatePath('/dashboard');
    return created;
}

export async function endGrazing(eventId: string, endAt?: string) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    const ev = await prisma.grazingEvent.findUnique({
        where: { id: eventId },
        select: { farmId: true },
    });
    if (!ev) throw new Error('Evento no encontrado');
    await assertFarmOwnership(ev.farmId, effectiveUserId, callerRole);

    const result = await prisma.grazingEvent.update({
        where: { id: eventId },
        data: { endAt: endAt ? new Date(endAt) : new Date() },
    });
    revalidatePath('/dashboard');
    return result;
}

export async function deleteGrazing(eventId: string) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    const ev = await prisma.grazingEvent.findUnique({
        where: { id: eventId },
        select: { farmId: true },
    });
    if (!ev) throw new Error('Evento no encontrado');
    await assertFarmOwnership(ev.farmId, effectiveUserId, callerRole);
    await prisma.grazingEvent.delete({ where: { id: eventId } });
    revalidatePath('/dashboard');
}

// ─── LECTURAS ──────────────────────────────────────────────────────────────────

export async function listGrazingByFarm(
    farmId: string,
    options?: { periodFrom?: string; periodTo?: string; limit?: number },
) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(farmId, effectiveUserId, callerRole);

    return prisma.grazingEvent.findMany({
        where: {
            farmId,
            ...(options?.periodFrom || options?.periodTo
                ? {
                      startAt: {
                          ...(options.periodFrom
                              ? { gte: new Date(options.periodFrom) }
                              : {}),
                          ...(options.periodTo
                              ? { lte: new Date(options.periodTo) }
                              : {}),
                      },
                  }
                : {}),
        },
        orderBy: { startAt: 'desc' },
        take: options?.limit ?? 500,
    });
}

export async function listGrazingByAnimal(animalId: string) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertAnimalOwnership(animalId, effectiveUserId, callerRole);

    return prisma.grazingEvent.findMany({
        where: { animalId },
        orderBy: { startAt: 'desc' },
        take: 500,
    });
}

export interface CurrentGrazingItem {
    parcelKey: string;
    kind: 'cropPlot' | 'corral' | 'sigpac';
    parcelLabel: string;
    activeLU: number;
    activeAnimals: number;
    areaHa: number;
    luPerHa: number | null;
    sustainableLUperHa: number | null;
    status: 'verde' | 'ambar' | 'rojo' | 'sin_dato';
    daysSinceStart: number;
}

/**
 * Estado actual de pastoreo por finca: qué parcelas tienen ganado ahora,
 * cuántas LU/ha, y si están en verde/ámbar/rojo respecto a la capacidad
 * sostenible del suelo (modelo Pulido + clima).
 */
export async function currentGrazingStatus(
    farmId: string,
): Promise<CurrentGrazingItem[]> {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(farmId, effectiveUserId, callerRole);

    const farm = await prisma.farm.findUnique({
        where: { id: farmId },
        select: { soilId: true, climateStudy: true },
    });
    const climate = farm?.climateStudy
        ? safeJSON<{ annualPrecip?: number }>(farm.climateStudy)
        : null;
    const annualPrecip = climate?.annualPrecip ?? 500;
    const sustainable = farm?.soilId
        ? estimateCarryingCapacity(farm.soilId, annualPrecip, 30).lu_per_ha
        : 0.4;

    const now = new Date();
    const events = await prisma.grazingEvent.findMany({
        where: { farmId, OR: [{ endAt: null }, { endAt: { gt: now } }] },
    });

    const corralIds = Array.from(
        new Set(events.map((e) => e.corralId).filter((x): x is string => !!x)),
    );
    const plotIds = Array.from(
        new Set(events.map((e) => e.cropPlotId).filter((x): x is string => !!x)),
    );
    const [corrals, plots] = await Promise.all([
        corralIds.length
            ? prisma.corral.findMany({
                  where: { id: { in: corralIds } },
                  select: { id: true, name: true },
              })
            : Promise.resolve([]),
        plotIds.length
            ? prisma.cropPlot.findMany({
                  where: { id: { in: plotIds } },
                  select: { id: true, name: true },
              })
            : Promise.resolve([]),
    ]);
    const labelMap = new Map<string, string>();
    for (const c of corrals) labelMap.set(c.id, c.name);
    for (const p of plots) labelMap.set(p.id, p.name);
    for (const e of events) {
        if (e.sigpacRef) labelMap.set(e.sigpacRef, `SIGPAC ${e.sigpacRef}`);
    }

    const snapshots = computeStockingByParcel(
        events.map((e) => toEventLike(e)),
        now,
    );

    const result: CurrentGrazingItem[] = snapshots.map((s) => {
        const oldest = events
            .filter(
                (e) =>
                    (e.cropPlotId === s.parcelKey ||
                        e.corralId === s.parcelKey ||
                        e.sigpacRef === s.parcelKey) &&
                    (!e.endAt || e.endAt > now),
            )
            .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())[0];
        const daysSinceStart = oldest
            ? Math.round((now.getTime() - oldest.startAt.getTime()) / 86_400_000)
            : 0;

        return {
            parcelKey: s.parcelKey,
            kind: s.kind,
            parcelLabel: labelMap.get(s.parcelKey) ?? s.parcelKey,
            activeLU: s.activeLU,
            activeAnimals: s.activeAnimals,
            areaHa: s.areaHa,
            luPerHa: s.luPerHa,
            sustainableLUperHa: sustainable,
            status: stockingStatus(s.luPerHa, sustainable),
            daysSinceStart,
        };
    });

    return result;
}

// ─── RESÚMENES ─────────────────────────────────────────────────────────────────

export interface FarmGrazingSummary {
    farmId: string;
    periodFrom: Date;
    periodTo: Date;
    parcels: Array<{
        parcelKey: string;
        kind: 'cropPlot' | 'corral' | 'sigpac';
        label: string;
        daysGrazed: number;
        daysRested: number;
        luDays: number;
        averageLUperHa: number | null;
        pressureRatio: number;
        restPeriods: Array<{ fromDate: Date; toDate: Date; days: number }>;
    }>;
}

export async function farmGrazingSummary(
    farmId: string,
    options?: { periodFrom?: string; periodTo?: string },
): Promise<FarmGrazingSummary> {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(farmId, effectiveUserId, callerRole);

    const periodTo = options?.periodTo ? new Date(options.periodTo) : new Date();
    const periodFrom = options?.periodFrom
        ? new Date(options.periodFrom)
        : new Date(periodTo.getTime() - 365 * 86_400_000);

    const events = await prisma.grazingEvent.findMany({
        where: { farmId, startAt: { lte: periodTo } },
    });
    const corralIds = Array.from(
        new Set(events.map((e) => e.corralId).filter((x): x is string => !!x)),
    );
    const plotIds = Array.from(
        new Set(events.map((e) => e.cropPlotId).filter((x): x is string => !!x)),
    );
    const [corrals, plots] = await Promise.all([
        corralIds.length
            ? prisma.corral.findMany({
                  where: { id: { in: corralIds } },
                  select: { id: true, name: true },
              })
            : Promise.resolve([]),
        plotIds.length
            ? prisma.cropPlot.findMany({
                  where: { id: { in: plotIds } },
                  select: { id: true, name: true },
              })
            : Promise.resolve([]),
    ]);
    const corralLabels = new Map(corrals.map((c) => [c.id, c.name]));
    const plotLabelsLocal = new Map(plots.map((p) => [p.id, p.name]));

    const labels = new Map<string, { kind: 'cropPlot' | 'corral' | 'sigpac'; label: string }>();
    for (const e of events) {
        if (e.cropPlotId && plotLabelsLocal.has(e.cropPlotId))
            labels.set(e.cropPlotId, {
                kind: 'cropPlot',
                label: plotLabelsLocal.get(e.cropPlotId)!,
            });
        else if (e.corralId && corralLabels.has(e.corralId))
            labels.set(e.corralId, {
                kind: 'corral',
                label: corralLabels.get(e.corralId)!,
            });
        else if (e.sigpacRef)
            labels.set(e.sigpacRef, {
                kind: 'sigpac',
                label: `SIGPAC ${e.sigpacRef}`,
            });
    }

    const elikes: GrazingEventLike[] = events.map(toEventLike);
    const parcels = Array.from(labels.keys()).map((parcelKey) => {
        const meta = labels.get(parcelKey)!;
        const pressure = grazingPressure(elikes, parcelKey, periodFrom, periodTo);
        const rests = restPeriodsByPlot(elikes, parcelKey, periodTo);
        return {
            parcelKey,
            kind: meta.kind,
            label: meta.label,
            daysGrazed: pressure.daysGrazed,
            daysRested: pressure.daysRested,
            luDays: pressure.luDays,
            averageLUperHa: pressure.averageLUperHa,
            pressureRatio: pressure.pressureRatio,
            restPeriods: rests.map((r) => ({
                fromDate: r.fromDate,
                toDate: r.toDate,
                days: r.days,
            })),
        };
    });

    return { farmId, periodFrom, periodTo, parcels };
}

// ─── HISTORIA POR ANIMAL ───────────────────────────────────────────────────────

export async function getAnimalGrazingHistory(
    animalId: string,
    options?: { periodFrom?: string; periodTo?: string },
) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertAnimalOwnership(animalId, effectiveUserId, callerRole);

    const periodTo = options?.periodTo ? new Date(options.periodTo) : new Date();
    const periodFrom = options?.periodFrom
        ? new Date(options.periodFrom)
        : new Date(periodTo.getTime() - 365 * 86_400_000);

    const animal = await prisma.animal.findUnique({
        where: { id: animalId },
        select: { farmId: true },
    });
    if (!animal) throw new Error('Animal no encontrado');

    const [own, collective, plotLabels, corralLabels] = await Promise.all([
        prisma.grazingEvent.findMany({
            where: { animalId, startAt: { lte: periodTo } },
        }),
        prisma.grazingEvent.findMany({
            where: { farmId: animal.farmId, animalId: null, startAt: { lte: periodTo } },
        }),
        prisma.cropPlot.findMany({
            where: { farmId: animal.farmId },
            select: { id: true, name: true },
        }),
        prisma.corral.findMany({
            where: { farmId: animal.farmId },
            select: { id: true, name: true },
        }),
    ]);

    const history = animalGrazingHistory(
        animalId,
        own.map(toEventLike),
        periodFrom,
        periodTo,
        collective.map(toEventLike),
    );

    const labels = new Map<string, string>();
    plotLabels.forEach((p) => labels.set(p.id, p.name));
    corralLabels.forEach((c) => labels.set(c.id, c.name));

    return history.map((h) => ({
        ...h,
        label: labels.get(h.parcelKey) ?? (h.sigpacRef ? `SIGPAC ${h.sigpacRef}` : h.parcelKey),
    }));
}

// ─── HELPERS ───────────────────────────────────────────────────────────────────

function toEventLike(e: {
    id: string;
    animalId: string | null;
    corralId: string | null;
    cropPlotId: string | null;
    sigpacRef: string | null;
    startAt: Date;
    endAt: Date | null;
    areaHa: number | null;
    lu: number | null;
}): GrazingEventLike {
    return {
        id: e.id,
        animalId: e.animalId,
        corralId: e.corralId,
        cropPlotId: e.cropPlotId,
        sigpacRef: e.sigpacRef,
        startAt: e.startAt,
        endAt: e.endAt,
        areaHa: e.areaHa,
        lu: e.lu,
    };
}

function safeJSON<T>(raw: string): T | null {
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

// ─── DOSSIER DE TRAZABILIDAD GEOGRÁFICA ────────────────────────────────────────

/**
 * Genera un dossier de trazabilidad geográfica del rebaño, listo para
 * adjuntar a:
 *
 *   - **Ecorregimen P1 (PAC)** — pastoreo extensivo: comprueba que la
 *     mayoría del tiempo el ganado está en parcelas con uso PAC PR/PA/PS
 *     (pastos), no en cebadero.
 *   - **IGP / carne de pasto** — la mayoría de IGPs españolas exigen
 *     ≥66 % de días vivos en pasto natural o pradera permanente.
 *   - **Welfair / B+ PAWS** — el principio "buen alojamiento + facilidad
 *     de movimiento" se demuestra con tiempo en pasto vs estabulado.
 *
 * Devuelve JSON estructurado. La generación de PDF queda como tarea
 * de capa de presentación (puede usarse jsPDF en cliente cuando se
 * conecte el módulo de bienestar animal — Sprint 6).
 */
export interface TraceabilityDossier {
    meta: {
        farmId: string;
        farmName: string;
        farmLicense: string | null;
        municipio: string | null;
        periodFrom: Date;
        periodTo: Date;
        totalDays: number;
    };
    rebanio: {
        cabezasEvaluadas: number;
        diasVivosEvaluados: number;
        diasEnPasto: number;
        diasEnEstabulado: number;
        pctPasto: number;
    };
    parcelas: Array<{
        parcelKey: string;
        kind: 'cropPlot' | 'corral' | 'sigpac';
        label: string;
        sigpacRef: string | null;
        pacUseCode: string | null;
        areaHa: number | null;
        diasUso: number;
        luDias: number;
    }>;
    compliance: {
        ecoregimen_P1: { ok: boolean; pctPasto: number; umbral: number };
        carne_de_pasto: { ok: boolean; pctPasto: number; umbral: number };
    };
    generadoEn: Date;
}

const ECO_P1_THRESHOLD = 75; // % tiempo en pasto
const IGP_PASTO_THRESHOLD = 66; // % días vivos en pasto

/** Códigos PAC que cuentan como "pasto" para los umbrales de cumplimiento. */
const PAC_PASTO_CODES = new Set(['PR', 'PA', 'PS', 'PT']);

export async function getGrazingTraceability(input: {
    farmId: string;
    periodFrom?: string;
    periodTo?: string;
}): Promise<TraceabilityDossier> {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(input.farmId, effectiveUserId, callerRole);

    const periodTo = input.periodTo ? new Date(input.periodTo) : new Date();
    const periodFrom = input.periodFrom
        ? new Date(input.periodFrom)
        : new Date(periodTo.getTime() - 365 * 86_400_000);
    const totalDays = Math.max(
        1,
        (periodTo.getTime() - periodFrom.getTime()) / 86_400_000,
    );

    const farm = await prisma.farm.findUnique({
        where: { id: input.farmId },
        select: {
            id: true,
            name: true,
            license: true,
            municipio: true,
        },
    });
    if (!farm) throw new Error('Finca no encontrada');

    const [events, plots, corrals, activeAnimals] = await Promise.all([
        prisma.grazingEvent.findMany({
            where: { farmId: input.farmId, startAt: { lte: periodTo } },
        }),
        prisma.cropPlot.findMany({
            where: { farmId: input.farmId },
            select: { id: true, name: true, surfaceHa: true, pacUseCode: true, sigpacPoligono: true, sigpacParcela: true, sigpacRecinto: true },
        }),
        prisma.corral.findMany({
            where: { farmId: input.farmId },
            select: { id: true, name: true, surfaceM2: true, kind: true },
        }),
        prisma.animal.count({
            where: {
                farmId: input.farmId,
                OR: [
                    { exitDate: null },
                    { exitDate: { gte: periodFrom } },
                ],
            },
        }),
    ]);

    const plotMap = new Map(plots.map((p) => [p.id, p]));
    const corralMap = new Map(corrals.map((c) => [c.id, c]));

    // Acumular días por parcela en el periodo.
    const byParcel = new Map<
        string,
        {
            kind: 'cropPlot' | 'corral' | 'sigpac';
            label: string;
            sigpacRef: string | null;
            pacUseCode: string | null;
            areaHa: number | null;
            diasUso: number;
            luDias: number;
        }
    >();

    let diasEnPasto = 0;
    let diasEnEstabulado = 0;
    let diasVivosTotal = 0;

    for (const e of events) {
        const start = e.startAt > periodFrom ? e.startAt : periodFrom;
        const end = (e.endAt ?? periodTo) < periodTo ? (e.endAt ?? periodTo) : periodTo;
        if (end <= start) continue;
        const days = (end.getTime() - start.getTime()) / 86_400_000;
        const lu = e.lu ?? (e.animalId ? 1 : 0);
        const luDays = lu * days;

        let parcelKey = '';
        let kind: 'cropPlot' | 'corral' | 'sigpac' = 'sigpac';
        let label = '';
        let sigpacRef: string | null = null;
        let pacUseCode: string | null = null;
        let areaHa: number | null = null;
        let isPasto = false;

        if (e.cropPlotId && plotMap.has(e.cropPlotId)) {
            const p = plotMap.get(e.cropPlotId)!;
            parcelKey = p.id;
            kind = 'cropPlot';
            label = p.name;
            pacUseCode = p.pacUseCode;
            areaHa = p.surfaceHa;
            sigpacRef =
                p.sigpacPoligono && p.sigpacParcela
                    ? `${p.sigpacPoligono}/${p.sigpacParcela}${p.sigpacRecinto ? `/${p.sigpacRecinto}` : ''}`
                    : null;
            isPasto = p.pacUseCode ? PAC_PASTO_CODES.has(p.pacUseCode) : true;
        } else if (e.corralId && corralMap.has(e.corralId)) {
            const c = corralMap.get(e.corralId)!;
            parcelKey = c.id;
            kind = 'corral';
            label = c.name;
            areaHa = c.surfaceM2 ? c.surfaceM2 / 10_000 : null;
            // Corral tipo "pasto" / "pasto_mejorado" cuenta como pasto;
            // cebadero / cementado / cubierto NO.
            isPasto =
                c.kind === 'pasto' ||
                c.kind === 'pasto_mejorado' ||
                c.kind === 'paritorio';
        } else if (e.sigpacRef) {
            parcelKey = e.sigpacRef;
            kind = 'sigpac';
            label = `SIGPAC ${e.sigpacRef}`;
            sigpacRef = e.sigpacRef;
            // Sin saber su PAC use code asumimos pasto (es el caso usual
            // de los arriendos extensivos).
            isPasto = true;
        } else {
            continue;
        }

        const prev = byParcel.get(parcelKey);
        if (prev) {
            prev.diasUso += days;
            prev.luDias += luDays;
        } else {
            byParcel.set(parcelKey, {
                kind,
                label,
                sigpacRef,
                pacUseCode,
                areaHa,
                diasUso: days,
                luDias: luDays,
            });
        }

        diasVivosTotal += luDays;
        if (isPasto) diasEnPasto += luDays;
        else diasEnEstabulado += luDays;
    }

    const pctPasto =
        diasVivosTotal > 0
            ? (diasEnPasto / diasVivosTotal) * 100
            : 0;

    return {
        meta: {
            farmId: farm.id,
            farmName: farm.name,
            farmLicense: farm.license,
            municipio: farm.municipio,
            periodFrom,
            periodTo,
            totalDays,
        },
        rebanio: {
            cabezasEvaluadas: activeAnimals,
            diasVivosEvaluados: Math.round(diasVivosTotal),
            diasEnPasto: Math.round(diasEnPasto),
            diasEnEstabulado: Math.round(diasEnEstabulado),
            pctPasto,
        },
        parcelas: Array.from(byParcel.entries())
            .map(([parcelKey, v]) => ({ parcelKey, ...v }))
            .sort((a, b) => b.diasUso - a.diasUso),
        compliance: {
            ecoregimen_P1: {
                ok: pctPasto >= ECO_P1_THRESHOLD,
                pctPasto,
                umbral: ECO_P1_THRESHOLD,
            },
            carne_de_pasto: {
                ok: pctPasto >= IGP_PASTO_THRESHOLD,
                pctPasto,
                umbral: IGP_PASTO_THRESHOLD,
            },
        },
        generadoEn: new Date(),
    };
}
