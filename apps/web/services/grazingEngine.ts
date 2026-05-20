/**
 * GrazingEngine — Análisis de pastoreo por parcela SIGPAC.
 *
 * Toma los `GrazingEvent` registrados y devuelve métricas operativas:
 *
 *   - Carga ganadera actual por recinto (LU/ha).
 *   - Periodos de descanso del pasto (gap entre eventos).
 *   - Presión de uso vs capacidad sostenible (modelo Pulido 2014, ya
 *     integrado en `SoilEngine`).
 *   - Trazabilidad georreferenciada por animal (qué parcelas pastó y
 *     cuántos días en cada una — base para sellos IGP/Welfair).
 *
 * Diseño:
 *   - Funciones puras: reciben eventos y opcionalmente capacidades; el
 *     extraer datos lo hace el server action.
 *   - Eventos abiertos (sin `endAt`) se consideran activos hasta `now`.
 */

export interface GrazingEventLike {
    id: string;
    animalId: string | null;
    corralId: string | null;
    cropPlotId: string | null;
    sigpacRef: string | null;
    startAt: Date;
    endAt: Date | null;
    areaHa: number | null;
    lu: number | null;
}

export interface ParcelKey {
    /** Identifica la parcela. Preferimos cropPlotId, si no corralId, si no sigpacRef. */
    key: string;
    kind: 'cropPlot' | 'corral' | 'sigpac';
}

export function parcelKeyOf(event: GrazingEventLike): ParcelKey | null {
    if (event.cropPlotId) return { key: event.cropPlotId, kind: 'cropPlot' };
    if (event.corralId) return { key: event.corralId, kind: 'corral' };
    if (event.sigpacRef) return { key: event.sigpacRef, kind: 'sigpac' };
    return null;
}

// ─── CARGA GANADERA POR PARCELA EN UN MOMENTO DADO ─────────────────────────────

export interface StockingSnapshot {
    parcelKey: string;
    kind: 'cropPlot' | 'corral' | 'sigpac';
    /** LU acumuladas activas en ese momento. */
    activeLU: number;
    /** Hectáreas declaradas en el evento (o suma si hay varios). */
    areaHa: number;
    /** LU/ha actual. null si areaHa = 0. */
    luPerHa: number | null;
    /** Animales activos en ese momento sobre la parcela. */
    activeAnimals: number;
}

/**
 * Calcula el estado de carga ganadera de cada parcela en `now`.
 * Un evento se considera activo si `startAt <= now < (endAt ?? +∞)`.
 */
export function computeStockingByParcel(
    events: GrazingEventLike[],
    now: Date = new Date(),
): StockingSnapshot[] {
    const active = events.filter(
        (e) => e.startAt.getTime() <= now.getTime() &&
            (e.endAt == null || e.endAt.getTime() > now.getTime()),
    );

    const grouped = new Map<string, StockingSnapshot>();
    for (const e of active) {
        const pk = parcelKeyOf(e);
        if (!pk) continue;
        const prev = grouped.get(pk.key);
        const lu = e.lu ?? (e.animalId ? 1 : 0); // si no se aporta, 1 LU por animal
        const animals = e.animalId ? 1 : 0;
        if (prev) {
            prev.activeLU += lu;
            prev.activeAnimals += animals;
            prev.areaHa = Math.max(prev.areaHa, e.areaHa ?? 0);
            prev.luPerHa = prev.areaHa > 0 ? prev.activeLU / prev.areaHa : null;
        } else {
            const areaHa = e.areaHa ?? 0;
            grouped.set(pk.key, {
                parcelKey: pk.key,
                kind: pk.kind,
                activeLU: lu,
                activeAnimals: animals,
                areaHa,
                luPerHa: areaHa > 0 ? lu / areaHa : null,
            });
        }
    }
    return Array.from(grouped.values()).sort((a, b) => b.activeLU - a.activeLU);
}

// ─── PERIODOS DE DESCANSO POR PARCELA ──────────────────────────────────────────

export interface RestPeriod {
    parcelKey: string;
    /** Fecha en que terminó el último pastoreo (inicio del descanso). */
    fromDate: Date;
    /** Fecha en que empezó el siguiente pastoreo (o `now` si sigue descansando). */
    toDate: Date;
    days: number;
}

/**
 * Detecta los periodos de descanso entre eventos consecutivos en una
 * parcela. Útil para pastoreo rotacional (Voisin) — el ganadero ve si
 * está respetando el descanso mínimo necesario (típico 25-45 días según
 * estación y especie).
 */
export function restPeriodsByPlot(
    events: GrazingEventLike[],
    parcelKey: string,
    now: Date = new Date(),
): RestPeriod[] {
    const onParcel = events
        .filter((e) => parcelKeyOf(e)?.key === parcelKey)
        .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
    if (onParcel.length === 0) return [];

    const periods: RestPeriod[] = [];
    for (let i = 0; i < onParcel.length - 1; i++) {
        const ev = onParcel[i];
        const next = onParcel[i + 1];
        const endA = ev.endAt ?? next.startAt;
        if (endA >= next.startAt) continue;
        const days = Math.round(
            (next.startAt.getTime() - endA.getTime()) / 86_400_000,
        );
        if (days <= 0) continue;
        periods.push({ parcelKey, fromDate: endA, toDate: next.startAt, days });
    }

    // Descanso vigente: si el último evento terminó y aún no empezó otro.
    const last = onParcel[onParcel.length - 1];
    if (last.endAt && last.endAt < now) {
        const days = Math.round(
            (now.getTime() - last.endAt.getTime()) / 86_400_000,
        );
        if (days > 0) {
            periods.push({ parcelKey, fromDate: last.endAt, toDate: now, days });
        }
    }
    return periods;
}

// ─── PRESIÓN DE USO ────────────────────────────────────────────────────────────

export interface GrazingPressure {
    parcelKey: string;
    /** Días totales pastoreados en el periodo. */
    daysGrazed: number;
    /** Días no pastoreados (descanso) en el periodo. */
    daysRested: number;
    /** LU·día acumulados en el periodo. */
    luDays: number;
    /** Carga media: LU/ha durante los días pastoreados. */
    averageLUperHa: number | null;
    /**
     * Ratio de presión: días pastoreados / días totales. 0 = nunca usado;
     * 1 = pastoreado todos los días.
     */
    pressureRatio: number;
}

/**
 * Calcula la presión de uso de una parcela en un periodo. Útil para
 * validar el cumplimiento de la rotación y ecorregímenes PAC (P1 — pasto
 * extensivo requiere un mínimo de superficie no sobreutilizada).
 */
export function grazingPressure(
    events: GrazingEventLike[],
    parcelKey: string,
    periodFrom: Date,
    periodTo: Date,
): GrazingPressure {
    const onParcel = events.filter(
        (e) => parcelKeyOf(e)?.key === parcelKey,
    );
    let daysGrazed = 0;
    let luDays = 0;
    let weightedLuPerHa = 0;
    let areaHaSeen = 0;

    for (const e of onParcel) {
        const start = e.startAt > periodFrom ? e.startAt : periodFrom;
        const end = (e.endAt ?? periodTo) < periodTo ? (e.endAt ?? periodTo) : periodTo;
        if (end <= start) continue;
        const days = Math.max(0, (end.getTime() - start.getTime()) / 86_400_000);
        daysGrazed += days;
        const lu = e.lu ?? (e.animalId ? 1 : 0);
        luDays += lu * days;
        if (e.areaHa && e.areaHa > 0) {
            weightedLuPerHa += (lu / e.areaHa) * days;
            areaHaSeen += days;
        }
    }

    const totalDays = Math.max(
        1,
        (periodTo.getTime() - periodFrom.getTime()) / 86_400_000,
    );
    const daysRested = Math.max(0, totalDays - daysGrazed);
    return {
        parcelKey,
        daysGrazed,
        daysRested,
        luDays,
        averageLUperHa: areaHaSeen > 0 ? weightedLuPerHa / areaHaSeen : null,
        pressureRatio: totalDays > 0 ? daysGrazed / totalDays : 0,
    };
}

// ─── TRAZABILIDAD POR ANIMAL ───────────────────────────────────────────────────

export interface AnimalGrazingHistory {
    parcelKey: string;
    kind: 'cropPlot' | 'corral' | 'sigpac';
    sigpacRef: string | null;
    firstSeen: Date;
    lastSeen: Date;
    totalDays: number;
    /** % de los días vividos por el animal en el periodo. */
    sharePct: number;
}

/**
 * Construye la trazabilidad georreferenciada de un animal: en qué
 * parcelas estuvo y cuánto tiempo. Base para certificación de carne de
 * pasto (Welfair, IGP regional, ecorregímenes P1).
 *
 * Si el animal estuvo en eventos colectivos (`animalId=null` con lote),
 * pasarlos en `collectiveEvents` para que se cuenten como parte de su
 * historia.
 */
export function animalGrazingHistory(
    animalId: string,
    events: GrazingEventLike[],
    periodFrom: Date,
    periodTo: Date,
    collectiveEvents: GrazingEventLike[] = [],
): AnimalGrazingHistory[] {
    const own = events.filter((e) => e.animalId === animalId);
    const all = [...own, ...collectiveEvents];

    const grouped = new Map<string, AnimalGrazingHistory>();
    for (const e of all) {
        const pk = parcelKeyOf(e);
        if (!pk) continue;
        const start = e.startAt > periodFrom ? e.startAt : periodFrom;
        const end = (e.endAt ?? periodTo) < periodTo ? (e.endAt ?? periodTo) : periodTo;
        if (end <= start) continue;
        const days = (end.getTime() - start.getTime()) / 86_400_000;

        const prev = grouped.get(pk.key);
        if (prev) {
            prev.totalDays += days;
            prev.firstSeen = prev.firstSeen < start ? prev.firstSeen : start;
            prev.lastSeen = prev.lastSeen > end ? prev.lastSeen : end;
        } else {
            grouped.set(pk.key, {
                parcelKey: pk.key,
                kind: pk.kind,
                sigpacRef: e.sigpacRef,
                firstSeen: start,
                lastSeen: end,
                totalDays: days,
                sharePct: 0,
            });
        }
    }

    const totalDays = Array.from(grouped.values()).reduce(
        (a, b) => a + b.totalDays,
        0,
    );
    if (totalDays > 0) {
        grouped.forEach((v) => {
            v.sharePct = (v.totalDays / totalDays) * 100;
        });
    }
    return Array.from(grouped.values()).sort(
        (a, b) => b.totalDays - a.totalDays,
    );
}

// ─── SEMÁFORO DE CARGA ─────────────────────────────────────────────────────────

/**
 * Estado de carga vs capacidad sostenible (Pulido 2014). Devuelve verde
 * si la carga actual ≤ 100 %; ámbar 100-120 %; rojo > 120 %.
 */
export function stockingStatus(
    activeLUperHa: number | null,
    sustainableLUperHa: number,
): 'verde' | 'ambar' | 'rojo' | 'sin_dato' {
    if (activeLUperHa == null || sustainableLUperHa <= 0) return 'sin_dato';
    const ratio = activeLUperHa / sustainableLUperHa;
    if (ratio <= 1.0) return 'verde';
    if (ratio <= 1.2) return 'ambar';
    return 'rojo';
}
