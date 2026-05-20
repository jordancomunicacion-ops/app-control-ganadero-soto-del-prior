/**
 * AlertEngine — Reglas declarativas que generan alertas operativas.
 *
 * Cada regla recibe un snapshot de datos de la finca (animales, pesos,
 * eventos, retiros activos, saneamientos programados, carga ganadera)
 * y devuelve una lista de `AlertCandidate` que el orquestador persiste
 * como filas en el modelo `Alert` existente.
 *
 * Diseño:
 *   - Motor puro, sin BD ni red.
 *   - Cada regla es una función `(input, params) => AlertCandidate[]`.
 *   - Idempotente: los `ruleCode` permiten al orquestador detectar
 *     duplicados activos y no abrir el mismo aviso dos veces.
 *
 * Tipos de regla (alineados con el campo `AlertRule.kind` del schema):
 *   - hembras_a_parir
 *   - sin_pesar
 *   - perdiendo_peso
 *   - retiro_vencido
 *   - saneamiento_proximo
 *   - carga_excedida
 */

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertKind =
    | 'hembras_a_parir'
    | 'sin_pesar'
    | 'perdiendo_peso'
    | 'retiro_vencido'
    | 'saneamiento_proximo'
    | 'carga_excedida'
    | 'forage_deficit'
    | 'destete_proximo'
    | 'castracion_decision';

export interface AlertCandidate {
    /** Animal al que va vinculada (algunas alertas son a nivel finca: ver `farmScoped`). */
    animalId?: string;
    /** Si la alerta es de finca (carga, saneamiento), llevará `farmScoped=true`. */
    farmScoped?: boolean;
    /** Identificador de finca para alertas de granja. */
    farmId?: string;
    /** Tipo (igual que `AlertRule.kind`). */
    type: AlertKind;
    severity: AlertSeverity;
    message: string;
    /** Código estable para idempotencia. Ej: HEMBRAS_A_PARIR_<animalId>_<fecha>. */
    ruleCode: string;
    /** Fecha de generación (default ahora). */
    date: Date;
}

// ─── INPUTS COMUNES ────────────────────────────────────────────────────────────

export interface AnimalSnap {
    id: string;
    sex: 'M' | 'H' | string;
    birthDate: Date;
    status?: string | null;
    /** Último peso registrado. */
    lastWeight?: { date: Date; weightKg: number };
    /** Segundo peso por la cola (para detectar pérdida). */
    secondLastWeight?: { date: Date; weightKg: number };
    /** Última cubrición conocida (para estimar parto). */
    lastCubricion?: Date;
    /**
     * Si ya tiene un parto registrado con fecha futura programada o ha
     * llegado al final de la gestación.
     */
    expectedCalvingDate?: Date;
    /** Retiro activo más próximo a vencer (de HealthRecord). */
    nearestWithdrawalEnd?: Date;
}

export interface FarmSnap {
    farmId: string;
    /** Carga actual / soportable. > 1 indica sobrecarga. */
    cargaRatio?: number;
    /** Saneamiento programado más próximo (CampaignSchedule). */
    nextCampaign?: { kind: string; scheduledFor: Date };
}

export interface EngineNow {
    /** Fecha de referencia (default new Date()). */
    now?: Date;
}

// ─── REGLAS INDIVIDUALES ───────────────────────────────────────────────────────

/**
 * Hembras a parir: si `expectedCalvingDate` está en los próximos `daysAhead`
 * días, emite alerta. Si no hay fecha esperada pero hay cubrición conocida,
 * estima parto = cubrición + 283 días (gestación bovina media).
 */
export function ruleHembrasAParir(
    animals: AnimalSnap[],
    params: { daysAhead?: number } = {},
    opts: EngineNow = {},
): AlertCandidate[] {
    const now = opts.now ?? new Date();
    const daysAhead = params.daysAhead ?? 7;
    const horizon = new Date(now.getTime() + daysAhead * 86_400_000);
    const out: AlertCandidate[] = [];

    for (const a of animals) {
        if (a.sex !== 'H') continue;
        if (a.status && /sacrificad|muerto|vendid|baja|inactiv|retirad/.test(a.status))
            continue;

        let expected = a.expectedCalvingDate;
        if (!expected && a.lastCubricion) {
            expected = new Date(a.lastCubricion.getTime() + 283 * 86_400_000);
        }
        if (!expected) continue;
        if (expected < now) continue; // ya debió parir — esto sería otra alerta
        if (expected > horizon) continue;

        const daysToCalving = Math.round(
            (expected.getTime() - now.getTime()) / 86_400_000,
        );
        out.push({
            animalId: a.id,
            type: 'hembras_a_parir',
            severity: daysToCalving <= 2 ? 'critical' : 'warning',
            message: `Parto previsto en ${daysToCalving} días.`,
            ruleCode: `HEMBRAS_A_PARIR_${a.id}_${expected.toISOString().slice(0, 10)}`,
            date: now,
        });
    }
    return out;
}

/**
 * Sin pesar: animales con su último peso (o sin peso) hace más de
 * `daysSince` días. Ignora terneros muy pequeños (< 3 meses).
 */
export function ruleSinPesar(
    animals: AnimalSnap[],
    params: { daysSince?: number } = {},
    opts: EngineNow = {},
): AlertCandidate[] {
    const now = opts.now ?? new Date();
    const daysSince = params.daysSince ?? 60;
    const cutoff = new Date(now.getTime() - daysSince * 86_400_000);
    const out: AlertCandidate[] = [];

    for (const a of animals) {
        if (a.status && /sacrificad|muerto|vendid|baja|inactiv|retirad/.test(a.status))
            continue;
        const ageMonths =
            (now.getTime() - a.birthDate.getTime()) /
            (1000 * 60 * 60 * 24 * 30.4375);
        if (ageMonths < 3) continue;

        const last = a.lastWeight;
        if (last && last.date >= cutoff) continue;

        const daysAgo = last
            ? Math.round((now.getTime() - last.date.getTime()) / 86_400_000)
            : null;
        out.push({
            animalId: a.id,
            type: 'sin_pesar',
            severity: 'info',
            message: daysAgo
                ? `Sin pesar desde hace ${daysAgo} días.`
                : `Sin ningún peso registrado.`,
            ruleCode: `SIN_PESAR_${a.id}`,
            date: now,
        });
    }
    return out;
}

/**
 * Perdiendo peso: el último peso es menor que el penúltimo en al menos
 * `thresholdPct` % y el intervalo es de al menos `weeksOfLoss` semanas.
 */
export function rulePerdiendoPeso(
    animals: AnimalSnap[],
    params: { weeksOfLoss?: number; thresholdPct?: number } = {},
    opts: EngineNow = {},
): AlertCandidate[] {
    const now = opts.now ?? new Date();
    const weeks = params.weeksOfLoss ?? 2;
    const threshold = (params.thresholdPct ?? 5) / 100;
    const out: AlertCandidate[] = [];

    for (const a of animals) {
        if (a.status && /sacrificad|muerto|vendid|baja|inactiv|retirad/.test(a.status))
            continue;
        const last = a.lastWeight;
        const prev = a.secondLastWeight;
        if (!last || !prev) continue;
        const days = (last.date.getTime() - prev.date.getTime()) / 86_400_000;
        if (days < weeks * 7) continue;

        const drop = (prev.weightKg - last.weightKg) / prev.weightKg;
        if (drop < threshold) continue;

        out.push({
            animalId: a.id,
            type: 'perdiendo_peso',
            severity: drop > threshold * 2 ? 'critical' : 'warning',
            message: `Pérdida de ${(drop * 100).toFixed(1)} % en ${Math.round(days)} días.`,
            ruleCode: `PERDIENDO_PESO_${a.id}_${last.date.toISOString().slice(0, 10)}`,
            date: now,
        });
    }
    return out;
}

/**
 * Retiro vencido / próximo a vencer: si el animal tiene un tratamiento
 * activo cuyo `withdrawalMeatUntil` está en los próximos `warnDaysBefore`
 * días, avisa para no sacrificar/vender por error.
 */
export function ruleRetiroVencido(
    animals: AnimalSnap[],
    params: { warnDaysBefore?: number } = {},
    opts: EngineNow = {},
): AlertCandidate[] {
    const now = opts.now ?? new Date();
    const warnBefore = params.warnDaysBefore ?? 3;
    const out: AlertCandidate[] = [];

    for (const a of animals) {
        if (!a.nearestWithdrawalEnd) continue;
        const days = Math.round(
            (a.nearestWithdrawalEnd.getTime() - now.getTime()) / 86_400_000,
        );
        // Avisamos en dos escenarios:
        //   1) Retiro aún activo a punto de vencer (días positivos pequeños).
        //   2) Acaba de vencer en los últimos 7 días — recordatorio.
        if (days > warnBefore) continue;
        if (days < -7) continue;

        const severity: AlertSeverity = days < 0 ? 'info' : 'warning';
        const message =
            days < 0
                ? `Retiro completado hace ${-days} días. Apto para venta/sacrificio.`
                : days === 0
                  ? `Retiro termina hoy.`
                  : `Retiro activo: faltan ${days} días para poder sacrificar.`;
        out.push({
            animalId: a.id,
            type: 'retiro_vencido',
            severity,
            message,
            ruleCode: `RETIRO_${a.id}_${a.nearestWithdrawalEnd.toISOString().slice(0, 10)}`,
            date: now,
        });
    }
    return out;
}

/**
 * Saneamiento próximo: si la finca tiene un CampaignSchedule en los
 * próximos `daysAhead` días, emite alerta de finca.
 */
export function ruleSaneamientoProximo(
    farms: FarmSnap[],
    params: { daysAhead?: number } = {},
    opts: EngineNow = {},
): AlertCandidate[] {
    const now = opts.now ?? new Date();
    const daysAhead = params.daysAhead ?? 14;
    const horizon = new Date(now.getTime() + daysAhead * 86_400_000);
    const out: AlertCandidate[] = [];

    for (const f of farms) {
        const c = f.nextCampaign;
        if (!c) continue;
        if (c.scheduledFor < now || c.scheduledFor > horizon) continue;
        const days = Math.round(
            (c.scheduledFor.getTime() - now.getTime()) / 86_400_000,
        );
        out.push({
            farmScoped: true,
            farmId: f.farmId,
            type: 'saneamiento_proximo',
            severity: days <= 3 ? 'warning' : 'info',
            message: `Saneamiento ${c.kind} en ${days} días. Prepara los animales y los registros.`,
            ruleCode: `SANEAMIENTO_${f.farmId}_${c.kind}_${c.scheduledFor.toISOString().slice(0, 10)}`,
            date: now,
        });
    }
    return out;
}

/**
 * Destete próximo: animales en ventana de edad alrededor del destete
 * objetivo (default 7 meses ±1.5 meses). Sustituye al panel "Alertas
 * del ciclo de vida" del antiguo `LifecycleEngine`.
 */
export function ruleDesteteProximo(
    animals: AnimalSnap[],
    params: { targetAgeMonths?: number; windowMonths?: number } = {},
    opts: EngineNow = {},
): AlertCandidate[] {
    const now = opts.now ?? new Date();
    const target = params.targetAgeMonths ?? 7;
    const window = params.windowMonths ?? 1.5;
    const out: AlertCandidate[] = [];

    for (const a of animals) {
        if (a.status && /sacrificad|muerto|vendid|baja|inactiv|retirad/.test(a.status))
            continue;
        const ageMonths =
            (now.getTime() - a.birthDate.getTime()) /
            (1000 * 60 * 60 * 24 * 30.4375);
        if (ageMonths < target - window || ageMonths > target + window) continue;
        out.push({
            animalId: a.id,
            type: 'destete_proximo',
            severity: ageMonths > target + 0.5 ? 'warning' : 'info',
            message: `Edad ${ageMonths.toFixed(1)} m — planificar destete.`,
            ruleCode: `DESTETE_${a.id}`,
            date: now,
        });
    }
    return out;
}

/**
 * Decisión castración / semental: machos en ventana de edad alrededor
 * del momento típico de decisión (default 6 meses ±1.5).
 */
export function ruleCastracionDecision(
    animals: AnimalSnap[],
    params: { targetAgeMonths?: number; windowMonths?: number } = {},
    opts: EngineNow = {},
): AlertCandidate[] {
    const now = opts.now ?? new Date();
    const target = params.targetAgeMonths ?? 6;
    const window = params.windowMonths ?? 1.5;
    const out: AlertCandidate[] = [];

    for (const a of animals) {
        if (a.sex !== 'M') continue;
        if (a.status && /sacrificad|muerto|vendid|baja|inactiv|retirad|castrad/.test(a.status))
            continue;
        const ageMonths =
            (now.getTime() - a.birthDate.getTime()) /
            (1000 * 60 * 60 * 24 * 30.4375);
        if (ageMonths < target - window || ageMonths > target + window) continue;
        out.push({
            animalId: a.id,
            type: 'castracion_decision',
            severity: 'info',
            message: `Macho ${ageMonths.toFixed(1)} m — ¿semental, cebo o castración?`,
            ruleCode: `CASTR_${a.id}`,
            date: now,
        });
    }
    return out;
}

/**
 * Carga excedida: si la carga ganadera supera el 100 % + `tolerancePct`.
 */
export function ruleCargaExcedida(
    farms: FarmSnap[],
    params: { tolerancePct?: number } = {},
    opts: EngineNow = {},
): AlertCandidate[] {
    const now = opts.now ?? new Date();
    const tol = (params.tolerancePct ?? 10) / 100;
    const out: AlertCandidate[] = [];

    for (const f of farms) {
        if (f.cargaRatio == null) continue;
        if (f.cargaRatio <= 1 + tol) continue;
        const overPct = ((f.cargaRatio - 1) * 100).toFixed(0);
        out.push({
            farmScoped: true,
            farmId: f.farmId,
            type: 'carga_excedida',
            severity: f.cargaRatio > 1.3 ? 'critical' : 'warning',
            message: `Carga ganadera ${overPct} % por encima del límite sostenible.`,
            ruleCode: `CARGA_${f.farmId}_${new Date().toISOString().slice(0, 7)}`,
            date: now,
        });
    }
    return out;
}

// ─── ORQUESTADOR ───────────────────────────────────────────────────────────────

export interface AlertEvalContext {
    animals: AnimalSnap[];
    farms: FarmSnap[];
    /** Reglas habilitadas para esta finca/usuario, con sus parámetros. */
    rules: Array<{ kind: AlertKind; paramsJson: string; severity?: AlertSeverity }>;
    now?: Date;
}

/**
 * Evalúa todas las reglas habilitadas y devuelve la lista plana de
 * candidatas a alerta. El orquestador (server action) se encarga de
 * deduplicar contra el modelo `Alert` por `ruleCode`.
 *
 * El `severity` por defecto de cada regla puede sobrescribirse en
 * `AlertRule.severity` (paso a través del `rules` input).
 */
export function evaluateAll(ctx: AlertEvalContext): AlertCandidate[] {
    const out: AlertCandidate[] = [];
    const now = ctx.now ?? new Date();
    for (const rule of ctx.rules) {
        const params = parseParams(rule.paramsJson);
        let produced: AlertCandidate[] = [];
        switch (rule.kind) {
            case 'hembras_a_parir':
                produced = ruleHembrasAParir(ctx.animals, params, { now });
                break;
            case 'sin_pesar':
                produced = ruleSinPesar(ctx.animals, params, { now });
                break;
            case 'perdiendo_peso':
                produced = rulePerdiendoPeso(ctx.animals, params, { now });
                break;
            case 'retiro_vencido':
                produced = ruleRetiroVencido(ctx.animals, params, { now });
                break;
            case 'saneamiento_proximo':
                produced = ruleSaneamientoProximo(ctx.farms, params, { now });
                break;
            case 'carga_excedida':
                produced = ruleCargaExcedida(ctx.farms, params, { now });
                break;
            case 'destete_proximo':
                produced = ruleDesteteProximo(ctx.animals, params, { now });
                break;
            case 'castracion_decision':
                produced = ruleCastracionDecision(ctx.animals, params, { now });
                break;
        }
        if (rule.severity) {
            for (const a of produced) a.severity = rule.severity;
        }
        out.push(...produced);
    }
    return out;
}

function parseParams(raw: string): Record<string, number> {
    try {
        const parsed = JSON.parse(raw);
        return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
        return {};
    }
}

// ─── REGLAS POR DEFECTO ────────────────────────────────────────────────────────
//
// Conjunto de reglas que el sistema activa automáticamente al crear una
// finca nueva. El usuario puede deshabilitarlas o ajustar los parámetros
// desde `/dashboard/alertas`.
export const DEFAULT_RULES: Array<{
    kind: AlertKind;
    paramsJson: string;
    severity: AlertSeverity;
    description: string;
}> = [
    {
        kind: 'hembras_a_parir',
        paramsJson: JSON.stringify({ daysAhead: 7 }),
        severity: 'warning',
        description: 'Avisa cuando una hembra tiene parto previsto en los próximos 7 días.',
    },
    {
        kind: 'sin_pesar',
        paramsJson: JSON.stringify({ daysSince: 60 }),
        severity: 'info',
        description: 'Animales sin pesar desde hace más de 60 días.',
    },
    {
        kind: 'perdiendo_peso',
        paramsJson: JSON.stringify({ weeksOfLoss: 2, thresholdPct: 5 }),
        severity: 'warning',
        description: 'Animales que pierden ≥ 5 % de peso en 2 semanas o más.',
    },
    {
        kind: 'retiro_vencido',
        paramsJson: JSON.stringify({ warnDaysBefore: 3 }),
        severity: 'warning',
        description: 'Tiempo de retiro de medicamento próximo a vencer o recién vencido.',
    },
    {
        kind: 'saneamiento_proximo',
        paramsJson: JSON.stringify({ daysAhead: 14 }),
        severity: 'info',
        description: 'Saneamiento oficial (TB, brucelosis, lengua azul) en los próximos 14 días.',
    },
    {
        kind: 'carga_excedida',
        paramsJson: JSON.stringify({ tolerancePct: 10 }),
        severity: 'warning',
        description: 'Carga ganadera por encima del 110 % de la capacidad sostenible.',
    },
    {
        kind: 'forage_deficit',
        paramsJson: JSON.stringify({ minCoveragePct: 85 }),
        severity: 'warning',
        description:
            'Meses con cobertura forrajera por debajo del 85 % (producción esperada de las parcelas vs demanda del rebaño).',
    },
    {
        kind: 'destete_proximo',
        paramsJson: JSON.stringify({ targetAgeMonths: 7, windowMonths: 1.5 }),
        severity: 'info',
        description: 'Animales próximos a la edad típica de destete (7 meses ± 1.5).',
    },
    {
        kind: 'castracion_decision',
        paramsJson: JSON.stringify({ targetAgeMonths: 6, windowMonths: 1.5 }),
        severity: 'info',
        description: 'Machos en la ventana para decidir destino (semental, cebo o castración).',
    },
];
