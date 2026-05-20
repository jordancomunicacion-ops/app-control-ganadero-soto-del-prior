/**
 * WelfareEngine — Bienestar animal Welfare Quality® / Welfair / B+ PAWS.
 *
 * Estructura común a Welfair (IRTA + NEIKER) y PAWS (PROVACUNO), basada
 * en el protocolo europeo Welfare Quality® para vacuno carne:
 *
 *   Principio 1 — Buena alimentación
 *     C1: Ausencia de hambre prolongada
 *     C2: Ausencia de sed prolongada
 *
 *   Principio 2 — Buen alojamiento
 *     C3: Confort en el descanso
 *     C4: Confort térmico
 *     C5: Facilidad de movimiento
 *
 *   Principio 3 — Buena salud
 *     C6: Ausencia de heridas
 *     C7: Ausencia de enfermedades
 *     C8: Ausencia de dolor por procedimientos de manejo
 *
 *   Principio 4 — Comportamiento apropiado
 *     C9:  Expresión de comportamientos sociales
 *     C10: Expresión de otros comportamientos
 *     C11: Buena relación humano-animal
 *     C12: Estado emocional positivo
 *
 * El motor:
 *   - Es puro: recibe inputs preagregados desde el server action.
 *   - Asigna score 0-100 por indicador y estado verde/ámbar/rojo.
 *   - Pre-rellena automáticamente lo que ya tenemos en BD (BCS, ausencia
 *     de enfermedades desde HealthRecord, espacio desde Corral, confort
 *     térmico desde FarmDaily, % tiempo en pasto desde GrazingEvent).
 *   - El resto queda como "pendiente" para que el ganadero lo complete
 *     antes de la auditoría.
 *
 * Diferencias Welfair vs PAWS:
 *   - PAWS añade requisitos B+ adicionales: bioseguridad, formación del
 *     personal y registros documentales. Se reflejan como bonus de
 *     pesado en el score final cuando `protocol='paws'`.
 *   - Para el MVP usamos los mismos indicadores y diferenciamos solo en
 *     el cálculo de score global (PAWS exige score más alto para
 *     considerarse "lista para auditar").
 */

export type WelfareStatus =
    | 'excelente'
    | 'aceptable'
    | 'mejorable'
    | 'alarmante'
    | 'sin_dato';

export type WelfareProtocol = 'welfair' | 'paws';

export interface IndicatorDef {
    code: string;
    label: string;
    /** Tipo de valor que admite el indicador. */
    valueKind: 'numeric' | 'percent' | 'bool' | 'text';
    /** Unidad para mostrar al usuario (m², %, BCS 1-5, …). */
    unit?: string;
    /** Texto de ayuda (qué medir y cómo). */
    help: string;
    /**
     * Umbrales orientativos. Si `direction='higher_better'`, valores ≥
     * `excellent` son verdes; ≥ `acceptable` ámbares; < `acceptable`
     * rojos. Si `direction='lower_better'`, invertido.
     *
     * Para booleanos: `excellent=1, acceptable=0.5, direction='higher_better'`.
     */
    thresholds?: {
        excellent: number;
        acceptable: number;
        direction: 'higher_better' | 'lower_better';
    };
}

export interface CriterionDef {
    code: string;
    label: string;
    principle: 1 | 2 | 3 | 4;
    indicators: IndicatorDef[];
}

// ─── CATÁLOGO Welfare Quality® (versión mínima vacuno carne) ───────────────────

export const PRINCIPLES: Record<1 | 2 | 3 | 4, string> = {
    1: 'Buena alimentación',
    2: 'Buen alojamiento',
    3: 'Buena salud',
    4: 'Comportamiento apropiado',
};

export const CRITERIA: CriterionDef[] = [
    // Principio 1 — Buena alimentación
    {
        code: 'C1',
        label: 'Ausencia de hambre prolongada',
        principle: 1,
        indicators: [
            {
                code: 'BCS_HERD',
                label: 'BCS medio del rebaño',
                valueKind: 'numeric',
                unit: 'BCS 1-5',
                help: 'Condición corporal media en escala 1 (muy delgada) a 5 (obesa). En vacuno carne extensivo lo deseable es 2.5-3.5.',
                thresholds: { excellent: 3, acceptable: 2.5, direction: 'higher_better' },
            },
            {
                code: 'BCS_LOW_PCT',
                label: '% animales BCS ≤ 2',
                valueKind: 'percent',
                unit: '%',
                help: 'Porcentaje de animales con condición corporal muy baja (BCS ≤ 2).',
                thresholds: { excellent: 2, acceptable: 10, direction: 'lower_better' },
            },
        ],
    },
    {
        code: 'C2',
        label: 'Ausencia de sed prolongada',
        principle: 1,
        indicators: [
            {
                code: 'WATER_POINTS_RATIO',
                label: 'Animales por punto de agua',
                valueKind: 'numeric',
                unit: 'cab/punto',
                help: 'Cabezas por bebedero. Welfare Quality recomienda ≤ 10 cab/bebedero en bovino carne.',
                thresholds: { excellent: 10, acceptable: 20, direction: 'lower_better' },
            },
            {
                code: 'WATER_CLEAN',
                label: 'Agua limpia y disponible',
                valueKind: 'bool',
                help: 'Inspección visual: agua limpia, accesible, sin contaminantes.',
                thresholds: { excellent: 1, acceptable: 0.5, direction: 'higher_better' },
            },
        ],
    },
    // Principio 2 — Buen alojamiento
    {
        code: 'C3',
        label: 'Confort en el descanso',
        principle: 2,
        indicators: [
            {
                code: 'LYING_SURFACE_M2',
                label: 'Superficie de descanso por cabeza',
                valueKind: 'numeric',
                unit: 'm²/cab',
                help: 'Espacio mínimo de descanso por animal. Para vacuno carne adulto se recomienda ≥ 4 m²/cab en zona cubierta.',
                thresholds: { excellent: 6, acceptable: 4, direction: 'higher_better' },
            },
            {
                code: 'DIRT_SCORE',
                label: 'Limpieza del manto',
                valueKind: 'percent',
                unit: '% sucio',
                help: 'Porcentaje de animales con manto visiblemente sucio (criterio Welfare Quality).',
                thresholds: { excellent: 5, acceptable: 20, direction: 'lower_better' },
            },
        ],
    },
    {
        code: 'C4',
        label: 'Confort térmico',
        principle: 2,
        indicators: [
            {
                code: 'HEAT_STRESS_DAYS',
                label: 'Días con estrés térmico al año',
                valueKind: 'numeric',
                unit: 'días',
                help: 'Días con THI > 72 (índice de estrés térmico). En extensivo se mitiga con sombra; en establo con ventilación.',
                thresholds: { excellent: 10, acceptable: 30, direction: 'lower_better' },
            },
            {
                code: 'SHADE_AVAILABLE',
                label: 'Sombra disponible',
                valueKind: 'bool',
                help: 'Existencia de sombra natural (arbolado) o artificial en zonas de descanso.',
                thresholds: { excellent: 1, acceptable: 0.5, direction: 'higher_better' },
            },
        ],
    },
    {
        code: 'C5',
        label: 'Facilidad de movimiento',
        principle: 2,
        indicators: [
            {
                code: 'PASTURE_DAYS_PCT',
                label: '% días vivos en pasto',
                valueKind: 'percent',
                unit: '%',
                help: 'Días en pasto / total días vivos. Ideal extensivo: ≥ 75 %.',
                thresholds: { excellent: 75, acceptable: 50, direction: 'higher_better' },
            },
        ],
    },
    // Principio 3 — Buena salud
    {
        code: 'C6',
        label: 'Ausencia de heridas',
        principle: 3,
        indicators: [
            {
                code: 'WOUNDS_PCT',
                label: '% animales con heridas visibles',
                valueKind: 'percent',
                unit: '%',
                help: 'Animales con heridas, golpes o lesiones visibles a la inspección.',
                thresholds: { excellent: 2, acceptable: 8, direction: 'lower_better' },
            },
            {
                code: 'LAMENESS_PCT',
                label: '% animales cojos (lameness)',
                valueKind: 'percent',
                unit: '%',
                help: 'Animales con score de cojera ≥ 2 (Sprecher 1997).',
                thresholds: { excellent: 5, acceptable: 15, direction: 'lower_better' },
            },
        ],
    },
    {
        code: 'C7',
        label: 'Ausencia de enfermedades',
        principle: 3,
        indicators: [
            {
                code: 'MORTALITY_PCT',
                label: 'Mortalidad anual %',
                valueKind: 'percent',
                unit: '%',
                help: 'Bajas en el último año.',
                thresholds: { excellent: 3, acceptable: 5, direction: 'lower_better' },
            },
            {
                code: 'TREATMENT_RATE',
                label: 'Tratamientos por animal y año',
                valueKind: 'numeric',
                unit: 'trat/cab/año',
                help: 'Nº de tratamientos sanitarios registrados / cabezas activas / año.',
                thresholds: { excellent: 1, acceptable: 3, direction: 'lower_better' },
            },
        ],
    },
    {
        code: 'C8',
        label: 'Ausencia de dolor por manejo',
        principle: 3,
        indicators: [
            {
                code: 'DEHORN_ANALGESIA',
                label: 'Analgesia en descornado',
                valueKind: 'bool',
                help: 'Uso sistemático de anestesia o analgesia en castraciones, descornados y otros procedimientos dolorosos.',
                thresholds: { excellent: 1, acceptable: 0.5, direction: 'higher_better' },
            },
        ],
    },
    // Principio 4 — Comportamiento apropiado
    {
        code: 'C9',
        label: 'Comportamiento social',
        principle: 4,
        indicators: [
            {
                code: 'AGGRESSIVE_INTERACTIONS',
                label: 'Interacciones agresivas / 100 cab × hora',
                valueKind: 'numeric',
                help: 'Observación etológica directa durante 1 hora.',
                thresholds: { excellent: 2, acceptable: 5, direction: 'lower_better' },
            },
        ],
    },
    {
        code: 'C10',
        label: 'Otros comportamientos',
        principle: 4,
        indicators: [
            {
                code: 'GROOMING_OBSERVED',
                label: 'Comportamientos exploratorios observados',
                valueKind: 'bool',
                help: 'Acicalado, exploración, juego — indicadores de bienestar emocional positivo.',
                thresholds: { excellent: 1, acceptable: 0.5, direction: 'higher_better' },
            },
        ],
    },
    {
        code: 'C11',
        label: 'Relación humano-animal',
        principle: 4,
        indicators: [
            {
                code: 'AVOIDANCE_DISTANCE_M',
                label: 'Distancia de huida (avoidance distance)',
                valueKind: 'numeric',
                unit: 'm',
                help: 'Test Welfare Quality: a qué distancia se aleja el animal de un humano que se aproxima de frente.',
                thresholds: { excellent: 1, acceptable: 2, direction: 'lower_better' },
            },
        ],
    },
    {
        code: 'C12',
        label: 'Estado emocional (QBA)',
        principle: 4,
        indicators: [
            {
                code: 'QBA_POSITIVE',
                label: 'Evaluación cualitativa positiva (QBA)',
                valueKind: 'percent',
                unit: '% positivo',
                help: 'Qualitative Behaviour Assessment: % de descriptores positivos (curioso, relajado, activo) vs negativos (apático, asustado).',
                thresholds: { excellent: 70, acceptable: 50, direction: 'higher_better' },
            },
        ],
    },
];

// ─── EVALUACIÓN ────────────────────────────────────────────────────────────────

export interface IndicatorValue {
    code: string;
    valueNumeric?: number | null;
    valueText?: string | null;
    valueBool?: boolean | null;
    source?: 'auto' | 'manual';
}

export interface IndicatorScored extends IndicatorValue {
    label: string;
    principle: 1 | 2 | 3 | 4;
    criterion: string;
    score: number; // 0-100
    status: WelfareStatus;
}

export interface AssessmentScore {
    /** Score 0-100 global. */
    overall: number;
    /** Score por principio. */
    byPrinciple: Record<1 | 2 | 3 | 4, number>;
    /** Score por criterio. */
    byCriterion: Record<string, number>;
    /** Indicadores con estado calculado. */
    indicators: IndicatorScored[];
    /** % de indicadores con valor (no `sin_dato`). */
    readinessPct: number;
    /** Si el protocolo declara la finca como "lista para auditar". */
    auditReady: boolean;
    /** Indicadores en estado 'alarmante' (gaps críticos antes de auditar). */
    redFlags: IndicatorScored[];
}

const STATUS_TO_SCORE: Record<WelfareStatus, number> = {
    excelente: 100,
    aceptable: 70,
    mejorable: 40,
    alarmante: 15,
    sin_dato: 0,
};

function indicatorStatus(
    def: IndicatorDef,
    value: IndicatorValue,
): { score: number; status: WelfareStatus } {
    const raw =
        def.valueKind === 'bool'
            ? value.valueBool == null
                ? null
                : value.valueBool
                  ? 1
                  : 0
            : value.valueNumeric ?? null;

    if (raw == null) {
        return { score: 0, status: 'sin_dato' };
    }
    if (!def.thresholds) {
        return { score: 70, status: 'aceptable' };
    }
    const { excellent, acceptable, direction } = def.thresholds;

    let status: WelfareStatus;
    if (direction === 'higher_better') {
        if (raw >= excellent) status = 'excelente';
        else if (raw >= acceptable) status = 'aceptable';
        else if (raw >= acceptable / 2) status = 'mejorable';
        else status = 'alarmante';
    } else {
        if (raw <= excellent) status = 'excelente';
        else if (raw <= acceptable) status = 'aceptable';
        else if (raw <= acceptable * 2) status = 'mejorable';
        else status = 'alarmante';
    }
    return { score: STATUS_TO_SCORE[status], status };
}

/**
 * Puntúa todos los indicadores de una evaluación. Recibe los valores
 * recogidos hasta ahora y devuelve scores agregados por criterio /
 * principio / total.
 */
export function scoreAssessment(
    values: IndicatorValue[],
    protocol: WelfareProtocol = 'welfair',
): AssessmentScore {
    const valuesByCode = new Map(values.map((v) => [v.code, v]));
    const indicators: IndicatorScored[] = [];

    for (const crit of CRITERIA) {
        for (const def of crit.indicators) {
            const value = valuesByCode.get(def.code) ?? { code: def.code };
            const { score, status } = indicatorStatus(def, value);
            indicators.push({
                ...value,
                label: def.label,
                principle: crit.principle,
                criterion: crit.code,
                score,
                status,
            });
        }
    }

    const byCriterion: Record<string, number> = {};
    for (const crit of CRITERIA) {
        const list = indicators.filter((i) => i.criterion === crit.code);
        byCriterion[crit.code] =
            list.length > 0
                ? list.reduce((a, b) => a + b.score, 0) / list.length
                : 0;
    }
    const byPrinciple: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const p of [1, 2, 3, 4] as const) {
        const crits = CRITERIA.filter((c) => c.principle === p);
        byPrinciple[p] =
            crits.length > 0
                ? crits.reduce((a, c) => a + (byCriterion[c.code] ?? 0), 0) /
                  crits.length
                : 0;
    }

    // Score global = media equilibrada de los 4 principios (Welfare
    // Quality desaconseja compensar entre principios).
    const overall =
        ([1, 2, 3, 4] as const).reduce((a, p) => a + byPrinciple[p], 0) / 4;

    const informed = indicators.filter((i) => i.status !== 'sin_dato').length;
    const readinessPct = (informed / indicators.length) * 100;

    const redFlags = indicators.filter((i) => i.status === 'alarmante');

    // Umbral de auditoría: Welfair publica un score mínimo aceptable ~55;
    // PAWS es más exigente (~65). Además NO puede haber ningún indicador
    // en 'alarmante'.
    const minScore = protocol === 'paws' ? 65 : 55;
    const auditReady =
        readinessPct >= 90 && overall >= minScore && redFlags.length === 0;

    return {
        overall,
        byPrinciple,
        byCriterion,
        indicators,
        readinessPct,
        auditReady,
        redFlags,
    };
}

// ─── PRE-RELLENADO AUTOMÁTICO ──────────────────────────────────────────────────

export interface PrecomputeInputs {
    /** Cabezas activas en el rebaño. */
    activeHeadcount: number;
    /** Animales con peso reciente (últimos 90 días). */
    weightSamples: Array<{ weightKg: number; daysSinceWeighing: number }>;
    /** Animales con BCS introducido manualmente, si existe. */
    bcsValues?: number[];
    /** Bajas en el último año. */
    deathsLast12m: number;
    /** Nº de tratamientos registrados en último año. */
    treatmentsLast12m: number;
    /** Superficie total de descanso en corrales tipo `cubierto`/`paritorio`/`enfermeria` (m²). */
    coveredShelterM2: number;
    /** ¿Hay corrales con `hasShade=true`? */
    anyShade: boolean;
    /** Días con `heatStressIndex > 72` en `FarmDaily` el último año. */
    heatStressDays: number;
    /** % días vivos del rebaño en parcelas de pasto (del dossier GrazingEvent). */
    pastureDaysPct: number;
    /** Nº de bebederos declarados (suma `hasWater=true` de los corrales activos). */
    waterPoints: number;
}

/**
 * Pre-rellena los indicadores que podemos derivar de la BD. El resto
 * queda en `sin_dato` para que el ganadero los rellene manualmente.
 *
 * Para BCS:
 *   - Si hay valores BCS manuales, se usan.
 *   - Si no, se estima por peso vs rango ideal (~ 600 kg = BCS 3) — esto
 *     es muy aproximado, válido como punto de partida.
 */
export function precomputeIndicators(inputs: PrecomputeInputs): IndicatorValue[] {
    const out: IndicatorValue[] = [];

    // C1 — BCS medio + % BCS bajo
    let bcsAvg: number | null = null;
    let bcsLowPct: number | null = null;
    if (inputs.bcsValues && inputs.bcsValues.length > 0) {
        bcsAvg = inputs.bcsValues.reduce((a, b) => a + b, 0) / inputs.bcsValues.length;
        bcsLowPct =
            (inputs.bcsValues.filter((v) => v <= 2).length / inputs.bcsValues.length) *
            100;
    } else if (inputs.weightSamples.length > 0) {
        // Aproximación gruesa: peso medio adulto / 200 ≈ BCS (200 kg ≈ BCS 1; 600 kg ≈ BCS 3)
        const fresh = inputs.weightSamples.filter((s) => s.daysSinceWeighing <= 90);
        if (fresh.length > 0) {
            const avgWeight =
                fresh.reduce((a, b) => a + b.weightKg, 0) / fresh.length;
            bcsAvg = Math.min(5, Math.max(1, avgWeight / 200));
            bcsLowPct = (fresh.filter((s) => s.weightKg < 350).length / fresh.length) * 100;
        }
    }
    if (bcsAvg != null) out.push({ code: 'BCS_HERD', valueNumeric: bcsAvg, source: 'auto' });
    if (bcsLowPct != null) out.push({ code: 'BCS_LOW_PCT', valueNumeric: bcsLowPct, source: 'auto' });

    // C2 — Puntos de agua
    if (inputs.waterPoints > 0 && inputs.activeHeadcount > 0) {
        out.push({
            code: 'WATER_POINTS_RATIO',
            valueNumeric: inputs.activeHeadcount / inputs.waterPoints,
            source: 'auto',
        });
    }

    // C3 — Superficie de descanso
    if (inputs.coveredShelterM2 > 0 && inputs.activeHeadcount > 0) {
        out.push({
            code: 'LYING_SURFACE_M2',
            valueNumeric: inputs.coveredShelterM2 / inputs.activeHeadcount,
            source: 'auto',
        });
    }

    // C4 — Estrés térmico + sombra
    out.push({
        code: 'HEAT_STRESS_DAYS',
        valueNumeric: inputs.heatStressDays,
        source: 'auto',
    });
    out.push({
        code: 'SHADE_AVAILABLE',
        valueBool: inputs.anyShade,
        source: 'auto',
    });

    // C5 — % días en pasto
    out.push({
        code: 'PASTURE_DAYS_PCT',
        valueNumeric: inputs.pastureDaysPct,
        source: 'auto',
    });

    // C7 — Mortalidad + tasa de tratamientos
    if (inputs.activeHeadcount > 0) {
        out.push({
            code: 'MORTALITY_PCT',
            valueNumeric:
                (inputs.deathsLast12m /
                    Math.max(1, inputs.activeHeadcount + inputs.deathsLast12m)) *
                100,
            source: 'auto',
        });
        out.push({
            code: 'TREATMENT_RATE',
            valueNumeric: inputs.treatmentsLast12m / inputs.activeHeadcount,
            source: 'auto',
        });
    }

    return out;
}

// ─── HELPERS ────────────────────────────────────────────────────────────────────

export function findCriterion(code: string): CriterionDef | undefined {
    return CRITERIA.find((c) => c.code === code);
}

export function findIndicator(code: string): IndicatorDef | undefined {
    for (const crit of CRITERIA) {
        const ind = crit.indicators.find((i) => i.code === code);
        if (ind) return ind;
    }
    return undefined;
}
