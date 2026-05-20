/**
 * ReproductionEngine — Métricas reproductivas del rebaño.
 *
 * Calcula los KPIs que definen la salud reproductiva de una explotación
 * de vacuno carne extensivo:
 *
 *   - **Días abiertos**: días entre último parto y nueva concepción
 *     confirmada. Ideal < 100 (sería un IEP ~ 380 días).
 *   - **Intervalo parto-concepción** medio.
 *   - **Tasa de preñez**: % de hembras gestantes activas / hembras
 *     reproductoras activas.
 *   - **Fertilidad por toro / IA**: % de servicios que resultaron en
 *     gestación confirmada.
 *   - **Edad al primer parto**.
 *   - **Tasa de reemplazo**: novillas (>15m, sin parir) / vacas en
 *     producción.
 *   - **Radar reproductivo**: 6 ejes normalizados 0-1.
 *
 * Diseño: funciones puras. Reciben eventos planos (no Prisma rows) para
 * ser testeables sin BD. Los server actions hacen la extracción.
 *
 * Subtipos de evento que entiende el motor (a través de `type`):
 *   - 'celo'                 — detección de celo
 *   - 'inseminacion'         — IA o IATF (sub-tipo en eventData.method)
 *   - 'cubricion'            — monta natural (toro identificable)
 *   - 'diagnostico_gestacion'— resultado en eventData.result
 *   - 'aborto'
 *   - 'parto'
 *   - 'examen_andrologico'   — para toros, evalúa fertilidad del macho
 */

export type RepEventType =
    | 'celo'
    | 'inseminacion'
    | 'cubricion'
    | 'diagnostico_gestacion'
    | 'aborto'
    | 'parto'
    | 'examen_andrologico';

export interface RepEvent {
    id: string;
    animalId: string;
    type: RepEventType;
    date: Date;
    /** JSON parseado: { method?, sireId?, result?, score?, ... }. */
    data?: Record<string, unknown> | null;
}

export interface AnimalSummary {
    id: string;
    sex: 'M' | 'H' | string;
    birthDate: Date;
    status?: string | null;
}

const INACTIVE_STATES = new Set([
    'sacrificado', 'muerto', 'vendido', 'baja', 'inactivo', 'retirado',
]);

function isActive(a: AnimalSummary): boolean {
    return !a.status || !INACTIVE_STATES.has(a.status.toLowerCase());
}

/** Gestación bovina media (días). */
export const GESTATION_DAYS = 283;

// ─── HEMBRAS Y ESTADO REPRODUCTIVO ─────────────────────────────────────────────

/**
 * Estado reproductivo derivado del histórico de eventos:
 *   - 'gestante'     — diagnóstico positivo posterior a último parto, o
 *                      servicio (IA/cubrición) confirmado por diagnóstico.
 *   - 'vacia'        — paridó pero no se ha confirmado nueva gestación.
 *   - 'novilla'      — nunca ha parido (típicamente hembra joven).
 *   - 'desconocido'  — sin datos suficientes.
 */
export type ReproductiveStatus = 'gestante' | 'vacia' | 'novilla' | 'desconocido';

export interface FemaleReproductiveState {
    animalId: string;
    status: ReproductiveStatus;
    lastParto?: Date;
    lastServicio?: { date: Date; type: 'inseminacion' | 'cubricion'; sireId?: string };
    pregnancyConfirmed?: Date;
    estimatedCalvingDate?: Date;
    daysOpen?: number;
}

export function evaluateFemale(
    animal: AnimalSummary,
    events: RepEvent[],
    now: Date = new Date(),
): FemaleReproductiveState {
    if (animal.sex !== 'H') {
        return { animalId: animal.id, status: 'desconocido' };
    }
    const own = events
        .filter((e) => e.animalId === animal.id)
        .sort((a, b) => a.date.getTime() - b.date.getTime());

    const partos = own.filter((e) => e.type === 'parto');
    const lastParto = partos.length > 0 ? partos[partos.length - 1].date : undefined;

    const servicios = own.filter(
        (e) =>
            (e.type === 'inseminacion' || e.type === 'cubricion') &&
            (!lastParto || e.date > lastParto),
    );
    const lastServicio = servicios.length
        ? {
              date: servicios[servicios.length - 1].date,
              type: servicios[servicios.length - 1].type as 'inseminacion' | 'cubricion',
              sireId:
                  (servicios[servicios.length - 1].data?.sireId as string | undefined) ??
                  undefined,
          }
        : undefined;

    const diagnosticoPositivo = own.filter(
        (e) =>
            e.type === 'diagnostico_gestacion' &&
            String(e.data?.result ?? '').toLowerCase() === 'positivo' &&
            (!lastParto || e.date > lastParto),
    );
    const diagnosticoNegativo = own.filter(
        (e) =>
            e.type === 'diagnostico_gestacion' &&
            String(e.data?.result ?? '').toLowerCase() === 'negativo' &&
            (!lastParto || e.date > lastParto),
    );

    // Aborto posterior al diagnóstico positivo → vuelve a "vacía".
    const abortoPosterior = own.find(
        (e) =>
            e.type === 'aborto' &&
            diagnosticoPositivo.length > 0 &&
            e.date > diagnosticoPositivo[diagnosticoPositivo.length - 1].date,
    );

    let status: ReproductiveStatus;
    let pregnancyConfirmed: Date | undefined;
    let estimatedCalvingDate: Date | undefined;
    let daysOpen: number | undefined;

    if (diagnosticoPositivo.length > 0 && !abortoPosterior) {
        status = 'gestante';
        pregnancyConfirmed =
            diagnosticoPositivo[diagnosticoPositivo.length - 1].date;
        // Estimar parto: el servicio más cercano antes del diagnóstico
        // positivo es la base; si no, usar diagnóstico − 30 días.
        const serviceBase =
            lastServicio?.date ??
            new Date(pregnancyConfirmed.getTime() - 30 * 86_400_000);
        estimatedCalvingDate = new Date(
            serviceBase.getTime() + GESTATION_DAYS * 86_400_000,
        );
        if (lastParto && lastServicio) {
            daysOpen =
                (lastServicio.date.getTime() - lastParto.getTime()) /
                86_400_000;
        }
    } else if (lastParto) {
        status = 'vacia';
        if (lastServicio) {
            // Está vacía pero ya tiene servicio en curso esperando diagnóstico.
            daysOpen =
                (lastServicio.date.getTime() - lastParto.getTime()) /
                86_400_000;
        } else {
            daysOpen = (now.getTime() - lastParto.getTime()) / 86_400_000;
        }
    } else {
        // Sin parto histórico: novilla.
        status = 'novilla';
    }

    return {
        animalId: animal.id,
        status,
        lastParto,
        lastServicio,
        pregnancyConfirmed,
        estimatedCalvingDate,
        daysOpen,
    };
}

// ─── MÉTRICAS AGREGADAS DEL REBAÑO ─────────────────────────────────────────────

export interface ReproductionMetrics {
    /** Hembras adultas reproductoras activas. */
    breedingFemales: number;
    /** Hembras gestantes confirmadas. */
    pregnant: number;
    /** Hembras vacías. */
    empty: number;
    /** Novillas (sin parto). */
    heifers: number;
    /** % gestantes / reproductoras. */
    pregnancyRatePct: number;
    /** Media de días abiertos en hembras paridas. */
    averageDaysOpen: number | null;
    /** Media del intervalo parto-concepción. */
    avgPartoConcepcion: number | null;
    /** Edad media al primer parto en meses. */
    edadPrimerPartoMeses: number | null;
    /** Tasa de reemplazo: novillas / vacas paridas. */
    replacementRatePct: number;
    /** IEP medio (días). */
    iepDias: number | null;
}

export function farmReproductionMetrics(
    animals: AnimalSummary[],
    events: RepEvent[],
    now: Date = new Date(),
): ReproductionMetrics {
    const active = animals.filter(isActive);
    const hembras = active.filter((a) => a.sex === 'H');

    // Hembras adultas reproductoras: > 15 meses.
    const adultas = hembras.filter((a) => {
        const months = (now.getTime() - a.birthDate.getTime()) /
            (1000 * 60 * 60 * 24 * 30.4375);
        return months >= 15;
    });

    const eventsByAnimal = new Map<string, RepEvent[]>();
    for (const e of events) {
        const list = eventsByAnimal.get(e.animalId) ?? [];
        list.push(e);
        eventsByAnimal.set(e.animalId, list);
    }

    let pregnant = 0;
    let empty = 0;
    let heifers = 0;
    const daysOpenSamples: number[] = [];
    const partoConcepcion: number[] = [];

    for (const a of adultas) {
        const own = eventsByAnimal.get(a.id) ?? [];
        const state = evaluateFemale(a, own, now);
        if (state.status === 'gestante') pregnant++;
        else if (state.status === 'vacia') empty++;
        else if (state.status === 'novilla') heifers++;

        if (state.daysOpen != null && state.daysOpen >= 0 && state.daysOpen < 1000) {
            daysOpenSamples.push(state.daysOpen);
        }
        if (
            state.status === 'gestante' &&
            state.lastParto &&
            state.lastServicio
        ) {
            const diff =
                (state.lastServicio.date.getTime() - state.lastParto.getTime()) /
                86_400_000;
            if (diff > 0 && diff < 1000) partoConcepcion.push(diff);
        }
    }

    const breedingFemales = adultas.length;
    const pregnancyRatePct =
        breedingFemales > 0 ? (pregnant / breedingFemales) * 100 : 0;

    // Edad al primer parto
    const primeros: number[] = [];
    eventsByAnimal.forEach((list, animalId) => {
        const partos = list
            .filter((e) => e.type === 'parto')
            .sort((a, b) => a.date.getTime() - b.date.getTime());
        if (partos.length === 0) return;
        const a = active.find((x) => x.id === animalId);
        if (!a) return;
        const months =
            (partos[0].date.getTime() - a.birthDate.getTime()) /
            (1000 * 60 * 60 * 24 * 30.4375);
        if (months > 18 && months < 60) primeros.push(months);
    });

    // IEP
    const ieps: number[] = [];
    eventsByAnimal.forEach((list) => {
        const partos = list
            .filter((e) => e.type === 'parto')
            .sort((a, b) => a.date.getTime() - b.date.getTime());
        for (let i = 1; i < partos.length; i++) {
            const diff =
                (partos[i].date.getTime() - partos[i - 1].date.getTime()) /
                86_400_000;
            if (diff > 240 && diff < 1000) ieps.push(diff);
        }
    });

    // Reemplazo = novillas / vacas-paridas
    const paridas = adultas.length - heifers;
    const replacementRatePct = paridas > 0 ? (heifers / paridas) * 100 : 0;

    return {
        breedingFemales,
        pregnant,
        empty,
        heifers,
        pregnancyRatePct,
        averageDaysOpen: avg(daysOpenSamples),
        avgPartoConcepcion: avg(partoConcepcion),
        edadPrimerPartoMeses: avg(primeros),
        replacementRatePct,
        iepDias: avg(ieps),
    };
}

function avg(values: number[]): number | null {
    if (values.length === 0) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
}

// ─── FERTILIDAD POR TORO / TIPO DE SERVICIO ────────────────────────────────────

export interface SireFertility {
    sireId: string;
    services: number;
    confirmedPregnancies: number;
    pregnancyRatePct: number;
}

/**
 * Para cada toro/identificador de servicio en `eventData.sireId`,
 * calcula el % de servicios que se confirmaron en gestación positiva.
 *
 * Si en el rebaño hay IA con doses (sin sireId concreto), pasar
 * `sireId='IA'` desde el alta del evento para agrupar.
 */
export function sireFertility(events: RepEvent[]): SireFertility[] {
    const bySire = new Map<string, { services: number; pregnancies: number }>();
    for (const ev of events) {
        if (ev.type !== 'inseminacion' && ev.type !== 'cubricion') continue;
        const sireId = String(ev.data?.sireId ?? 'desconocido');
        const prev = bySire.get(sireId) ?? { services: 0, pregnancies: 0 };
        prev.services++;
        bySire.set(sireId, prev);
    }
    // Asignar gestaciones al servicio más reciente del mismo animal antes
    // del diagnóstico positivo.
    const animalServices = new Map<string, RepEvent[]>();
    for (const ev of events) {
        if (ev.type !== 'inseminacion' && ev.type !== 'cubricion') continue;
        const list = animalServices.get(ev.animalId) ?? [];
        list.push(ev);
        animalServices.set(ev.animalId, list);
    }
    for (const ev of events) {
        if (
            ev.type !== 'diagnostico_gestacion' ||
            String(ev.data?.result ?? '').toLowerCase() !== 'positivo'
        )
            continue;
        const services = (animalServices.get(ev.animalId) ?? [])
            .filter((s) => s.date < ev.date)
            .sort((a, b) => b.date.getTime() - a.date.getTime());
        if (services.length === 0) continue;
        const sireId = String(services[0].data?.sireId ?? 'desconocido');
        const entry = bySire.get(sireId);
        if (entry) entry.pregnancies++;
    }
    return Array.from(bySire.entries())
        .map(([sireId, { services, pregnancies }]) => ({
            sireId,
            services,
            confirmedPregnancies: pregnancies,
            pregnancyRatePct: services > 0 ? (pregnancies / services) * 100 : 0,
        }))
        .sort((a, b) => b.services - a.services);
}

// ─── RADAR REPRODUCTIVO ────────────────────────────────────────────────────────

export interface RadarPoint {
    axis: string;
    /** Valor real (texto). */
    valueText: string;
    /** Score normalizado 0-1, 1 = mejor. */
    score: number;
}

/**
 * Devuelve los 6 ejes normalizados del radar. Cada eje convierte el KPI
 * real a [0, 1] usando umbrales operativos. 0 = pésimo; 1 = excelente.
 */
export function reproductiveRadar(metrics: ReproductionMetrics): RadarPoint[] {
    const norm = (
        value: number | null,
        ranges: { excellent: number; poor: number; direction: 'higher_better' | 'lower_better' },
    ): number => {
        if (value == null) return 0;
        const { excellent, poor, direction } = ranges;
        if (direction === 'higher_better') {
            if (value >= excellent) return 1;
            if (value <= poor) return 0;
            return (value - poor) / (excellent - poor);
        }
        if (value <= excellent) return 1;
        if (value >= poor) return 0;
        return (poor - value) / (poor - excellent);
    };

    const fmt = (v: number | null, unit: string, digits = 0): string =>
        v == null ? '—' : `${v.toFixed(digits)}${unit ? ` ${unit}` : ''}`;

    return [
        {
            axis: 'Tasa preñez',
            valueText: fmt(metrics.pregnancyRatePct, '%', 0),
            score: norm(metrics.pregnancyRatePct, {
                excellent: 85,
                poor: 50,
                direction: 'higher_better',
            }),
        },
        {
            axis: 'Días abiertos',
            valueText: fmt(metrics.averageDaysOpen, 'días', 0),
            score: norm(metrics.averageDaysOpen, {
                excellent: 90,
                poor: 180,
                direction: 'lower_better',
            }),
        },
        {
            axis: 'IEP',
            valueText: fmt(metrics.iepDias, 'días', 0),
            score: norm(metrics.iepDias, {
                excellent: 365,
                poor: 450,
                direction: 'lower_better',
            }),
        },
        {
            axis: 'Edad 1.er parto',
            valueText: fmt(metrics.edadPrimerPartoMeses, 'meses', 1),
            score: norm(metrics.edadPrimerPartoMeses, {
                excellent: 28,
                poor: 40,
                direction: 'lower_better',
            }),
        },
        {
            axis: 'Reemplazo',
            valueText: fmt(metrics.replacementRatePct, '%', 0),
            score: norm(metrics.replacementRatePct, {
                excellent: 25,
                poor: 5,
                direction: 'higher_better',
            }),
        },
        {
            axis: 'Gestantes/vacas',
            valueText: `${metrics.pregnant}/${metrics.breedingFemales}`,
            score:
                metrics.breedingFemales > 0
                    ? metrics.pregnant / metrics.breedingFemales
                    : 0,
        },
    ];
}
