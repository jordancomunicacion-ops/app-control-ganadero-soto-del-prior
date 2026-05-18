// =============================================================================
// CROP CALENDAR
// =============================================================================
//
// Calendario agronómico mediterráneo: para cada cultivo de uso ganadero
// definimos los meses de siembra, máxima producción y cosecha, además de
// la familia (para la rotación) y el biotipo de animal al que sirve mejor.
//
// Fuentes principales:
//   - CICYTEX (Junta Extremadura) — Cultivos forrajeros y pastos
//   - INRA-CIRAD-AFZ Feed Tables
//   - MAPA — Anuario de estadística agraria
//   - Robles 2017 — Sulla y esparceta en climas mediterráneos
//   - Asturias / Cantabria coop guides para zonas atlánticas
//
// Los meses se expresan como índice 0-11 (enero=0, diciembre=11) para
// alinearse con `new Date().getMonth()`.

export type CropFamily =
    | 'Cereal Invierno'
    | 'Cereal Verano'
    | 'Leguminosa Anual'
    | 'Leguminosa Perenne'
    | 'Pradera Perenne'
    | 'Pradera Anual'
    | 'Forraje Especial'
    | 'Tubérculo'
    | 'Barbecho';

export type AnimalCompat =
    | 'British'
    | 'Continental'
    | 'Rustic_European'
    | 'Dairy'
    | 'Indicus'
    | 'Composite'
    | 'Recria_joven'   // terneros y novillas pequeñas
    | 'Acabado'        // animales en cebo / acabado
    | 'Mantenimiento'; // vacas secas, bueyes

export interface CropDefinition {
    id: string;
    name: string;
    family: CropFamily;
    // Meses (0-11) en los que se siembra el cultivo en climas mediterráneos.
    sowMonths: number[];
    // Meses en los que está pastoreable / en pico productivo.
    productiveMonths: number[];
    // Meses en los que se cosecha (grano, ensilado, henificado).
    harvestMonths: number[];
    // Compatibilidad nutricional con tipos de animal.
    animalCompat: AnimalCompat[];
    // Rango ideal de precipitación anual (mm).
    precipMin?: number;
    precipMax?: number;
    // Rango ideal de pH del suelo.
    phMin?: number;
    phMax?: number;
    // Pendiente máxima (%) practicable con maquinaria estándar.
    maxSlopePct?: number;
    // Banderas funcionales útiles para la rotación.
    fixesNitrogen?: boolean;        // leguminosas
    breaksCereal?: boolean;         // sirve como "ruptura" en rotación de cereal
    soilDepthMinCm?: number;        // profundidad útil mínima
    notes?: string;
}

// =============================================================================
// CATÁLOGO DE CULTIVOS
// =============================================================================

export const CROP_CATALOG: CropDefinition[] = [
    // ── CEREALES DE INVIERNO ──────────────────────────────────────────────
    {
        id: 'trigo', name: 'Trigo Blando', family: 'Cereal Invierno',
        sowMonths: [9, 10, 11], productiveMonths: [3, 4, 5], harvestMonths: [5, 6],
        animalCompat: ['Dairy', 'Continental', 'Acabado'],
        precipMin: 450, precipMax: 1000, phMin: 6.0, phMax: 8.0, maxSlopePct: 12,
        breaksCereal: false,
        notes: 'Grano para cebo, paja como forraje seco',
    },
    {
        id: 'cebada', name: 'Cebada', family: 'Cereal Invierno',
        sowMonths: [9, 10, 11], productiveMonths: [3, 4, 5], harvestMonths: [5, 6],
        animalCompat: ['Continental', 'British', 'Rustic_European', 'Acabado', 'Mantenimiento'],
        precipMin: 350, precipMax: 900, phMin: 6.0, phMax: 8.5, maxSlopePct: 12,
        notes: 'El cereal mediterráneo de referencia. Más rústico que el trigo',
    },
    {
        id: 'avena', name: 'Avena', family: 'Cereal Invierno',
        sowMonths: [9, 10, 11], productiveMonths: [2, 3, 4], harvestMonths: [5, 6],
        animalCompat: ['Rustic_European', 'British', 'Recria_joven', 'Mantenimiento'],
        precipMin: 400, precipMax: 1100, phMin: 5.0, phMax: 7.5, maxSlopePct: 15,
        notes: 'Buena pastoreable verde en marzo-abril. Útil en suelos pobres y húmedos',
    },
    {
        id: 'triticale', name: 'Triticale', family: 'Cereal Invierno',
        sowMonths: [9, 10, 11], productiveMonths: [3, 4, 5], harvestMonths: [5, 6],
        animalCompat: ['Rustic_European', 'Continental', 'Mantenimiento'],
        precipMin: 350, precipMax: 900, phMin: 5.5, phMax: 8.0, maxSlopePct: 18,
        notes: 'Híbrido trigo×centeno. Tolera suelos marginales mejor que el trigo',
    },
    {
        id: 'centeno', name: 'Centeno', family: 'Cereal Invierno',
        sowMonths: [9, 10], productiveMonths: [3, 4, 5], harvestMonths: [6, 7],
        animalCompat: ['Rustic_European', 'Mantenimiento'],
        precipMin: 300, precipMax: 800, phMin: 5.0, phMax: 7.5, maxSlopePct: 15,
        notes: 'El más rústico — aguanta suelos pobres y ácidos. Pastoreable invernal',
    },

    // ── LEGUMINOSAS ANUALES ────────────────────────────────────────────────
    {
        id: 'veza', name: 'Veza (Vicia sativa)', family: 'Leguminosa Anual',
        sowMonths: [9, 10, 11], productiveMonths: [3, 4, 5], harvestMonths: [5, 6],
        animalCompat: ['Rustic_European', 'Continental', 'British'],
        precipMin: 350, phMin: 5.5, phMax: 8.0, maxSlopePct: 15,
        fixesNitrogen: true, breaksCereal: true,
        notes: 'Asociada con avena en doble cultivo — heno excelente',
    },
    {
        id: 'guisante', name: 'Guisante Proteico', family: 'Leguminosa Anual',
        sowMonths: [10, 11, 0], productiveMonths: [3, 4], harvestMonths: [5, 6],
        animalCompat: ['Recria_joven', 'British', 'Continental'],
        precipMin: 400, phMin: 6.0, phMax: 7.8, maxSlopePct: 12,
        fixesNitrogen: true, breaksCereal: true,
        notes: 'Proteaginosa KM0. Sustituye a la harina de soja importada',
    },
    {
        id: 'haba', name: 'Haba (Vicia faba)', family: 'Leguminosa Anual',
        sowMonths: [10, 11], productiveMonths: [3, 4], harvestMonths: [5, 6],
        animalCompat: ['Rustic_European', 'British'],
        precipMin: 400, phMin: 6.0, phMax: 8.0, maxSlopePct: 15,
        fixesNitrogen: true, breaksCereal: true,
        notes: 'Excelente para grano y como abono verde. Necesita suelos profundos',
    },
    {
        id: 'lupino', name: 'Lupino Dulce', family: 'Leguminosa Anual',
        sowMonths: [9, 10, 11], productiveMonths: [2, 3, 4], harvestMonths: [5, 6],
        animalCompat: ['Rustic_European'],
        precipMin: 350, phMin: 4.5, phMax: 6.8, maxSlopePct: 15,
        fixesNitrogen: true, breaksCereal: true,
        notes: 'Tolera suelo ácido. Ideal en Cambisol dístrico (Galicia, Sierra)',
    },
    {
        id: 'trebol_sub', name: 'Trébol Subterráneo', family: 'Leguminosa Anual',
        sowMonths: [9, 10], productiveMonths: [1, 2, 3, 4, 5], harvestMonths: [],
        animalCompat: ['Rustic_European', 'British'],
        precipMin: 400, phMin: 5.0, phMax: 6.5, maxSlopePct: 20,
        fixesNitrogen: true,
        notes: 'Auto-resemiente. La leguminosa por excelencia de la dehesa',
    },

    // ── LEGUMINOSAS PERENNES ───────────────────────────────────────────────
    {
        id: 'alfalfa', name: 'Alfalfa', family: 'Leguminosa Perenne',
        sowMonths: [2, 3, 8, 9], productiveMonths: [3, 4, 5, 6, 7, 8, 9, 10], harvestMonths: [4, 5, 6, 7, 8, 9, 10],
        animalCompat: ['Dairy', 'Continental', 'British', 'Recria_joven'],
        precipMin: 500, phMin: 6.2, phMax: 8.0, maxSlopePct: 10,
        fixesNitrogen: true, breaksCereal: true, soilDepthMinCm: 60,
        notes: 'La reina de las leguminosas. 4-6 cortes anuales. No tolera encharcamiento',
    },
    {
        id: 'esparceta', name: 'Esparceta (Sainfoin)', family: 'Leguminosa Perenne',
        sowMonths: [2, 3, 9, 10], productiveMonths: [3, 4, 5, 6], harvestMonths: [5, 6],
        animalCompat: ['Rustic_European', 'Continental'],
        precipMin: 350, phMin: 6.5, phMax: 8.4, maxSlopePct: 25,
        fixesNitrogen: true, breaksCereal: true,
        notes: 'Sin riesgo de meteorismo (taninos). Tolera calizo. Ideal Castilla / Aragón',
    },
    {
        id: 'sulla', name: 'Sulla (Hedysarum coronarium)', family: 'Leguminosa Perenne',
        sowMonths: [9, 10, 11], productiveMonths: [3, 4, 5, 6], harvestMonths: [5, 6],
        animalCompat: ['Rustic_European', 'Continental'],
        precipMin: 400, phMin: 6.0, phMax: 8.2, maxSlopePct: 20,
        fixesNitrogen: true, breaksCereal: true,
        notes: 'Leguminosa mediterránea bianual. Excelente en dehesa salmantina',
    },

    // ── PRADERAS PERENNES ──────────────────────────────────────────────────
    {
        id: 'ryegrass', name: 'Ray-grass Italiano', family: 'Pradera Anual',
        sowMonths: [8, 9, 10], productiveMonths: [10, 11, 2, 3, 4, 5], harvestMonths: [4, 5, 10],
        animalCompat: ['Dairy', 'Continental', 'British'],
        precipMin: 600, phMin: 5.5, phMax: 7.5, maxSlopePct: 15,
        notes: 'Producción intensa pero corta. Buena para invierno + primavera atlántica',
    },
    {
        id: 'festuca', name: 'Festuca Alta', family: 'Pradera Perenne',
        sowMonths: [2, 3, 8, 9], productiveMonths: [2, 3, 4, 5, 9, 10, 11], harvestMonths: [5, 6, 10],
        animalCompat: ['Rustic_European', 'Dairy'],
        precipMin: 450, phMin: 5.0, phMax: 8.0, maxSlopePct: 25,
        notes: 'Tolera suelos pesados y encharcamiento moderado. Persistente',
    },
    {
        id: 'dactilo', name: 'Dáctilo (Dactylis glomerata)', family: 'Pradera Perenne',
        sowMonths: [2, 3, 8, 9], productiveMonths: [3, 4, 5, 9, 10], harvestMonths: [5, 6],
        animalCompat: ['Rustic_European', 'Continental'],
        precipMin: 500, phMin: 5.5, phMax: 8.0, maxSlopePct: 20,
        notes: 'Excelente persistencia en zonas semiáridas con cierta humedad',
    },

    // ── CEREALES DE VERANO ─────────────────────────────────────────────────
    {
        id: 'maiz_forrajero', name: 'Maíz Forrajero', family: 'Cereal Verano',
        sowMonths: [3, 4], productiveMonths: [7, 8], harvestMonths: [8, 9],
        animalCompat: ['Dairy', 'Continental', 'Acabado'],
        precipMin: 500, phMin: 5.8, phMax: 8.0, maxSlopePct: 8, soilDepthMinCm: 50,
        notes: 'Necesita riego o vega. Ensilado fundamental para lechería',
    },
    {
        id: 'sorgo', name: 'Sorgo Forrajero', family: 'Cereal Verano',
        sowMonths: [4, 5], productiveMonths: [7, 8], harvestMonths: [8, 9],
        animalCompat: ['Rustic_European', 'Indicus', 'Continental'],
        precipMin: 250, phMin: 5.5, phMax: 8.5, maxSlopePct: 12,
        notes: 'Tolera mucho mejor la sequía que el maíz. Alternativa secano',
    },
    {
        id: 'girasol', name: 'Girasol', family: 'Cereal Verano',
        sowMonths: [2, 3, 4], productiveMonths: [7, 8], harvestMonths: [8, 9],
        animalCompat: ['Continental', 'Rustic_European'],
        precipMin: 350, phMin: 6.0, phMax: 8.0, maxSlopePct: 12,
        breaksCereal: true,
        notes: 'Buena rotación con cereal. Torta para alimentación animal',
    },

    // ── ESPECIAL / BARBECHO ────────────────────────────────────────────────
    {
        id: 'barbecho', name: 'Barbecho con cubierta', family: 'Barbecho',
        sowMonths: [], productiveMonths: [], harvestMonths: [],
        animalCompat: ['Rustic_European', 'Mantenimiento'],
        breaksCereal: true,
        notes: 'Descanso del suelo. Compatible con ecorregimen P4',
    },
];

// =============================================================================
// CALENDARIO POR MES
// =============================================================================

export interface MonthlyRecommendation {
    crop: CropDefinition;
    activity: 'siembra' | 'pastoreo' | 'cosecha' | 'mantenimiento';
    score: number; // 0-100, basado en idoneidad clima/suelo + matching animal
    reason: string;
}

export interface AgronomicMatchContext {
    climate?: { avgTemp?: number; annualPrecip?: number };
    soilPh?: number;
    slope?: number;
    soilDepthCm?: number;
    animalBiotype?: AnimalCompat;
    animalObjective?: 'Recria_joven' | 'Acabado' | 'Mantenimiento';
}

/**
 * Devuelve para cada mes (0-11) los cultivos relevantes, anotando qué
 * actividad principal corresponde (siembra / pastoreo / cosecha) y un
 * score de idoneidad basado en suelo, clima, pendiente y biotipo animal.
 */
export function calendarForMonth(
    month: number,
    ctx: AgronomicMatchContext = {},
): MonthlyRecommendation[] {
    const recs: MonthlyRecommendation[] = [];

    for (const crop of CROP_CATALOG) {
        const isSow = crop.sowMonths.includes(month);
        const isProductive = crop.productiveMonths.includes(month);
        const isHarvest = crop.harvestMonths.includes(month);
        if (!isSow && !isProductive && !isHarvest) continue;

        const fit = scoreCropFit(crop, ctx);
        if (fit.score < 30) continue; // no recomendar si la idoneidad es muy baja

        const activity: MonthlyRecommendation['activity'] =
            isSow ? 'siembra' : isProductive ? 'pastoreo' : 'cosecha';

        recs.push({
            crop,
            activity,
            score: fit.score,
            reason: fit.reasons.join(' · '),
        });
    }

    return recs.sort((a, b) => b.score - a.score);
}

/**
 * Puntúa un cultivo concreto para un contexto dado.
 */
export function scoreCropFit(
    crop: CropDefinition,
    ctx: AgronomicMatchContext,
): { score: number; reasons: string[]; warnings: string[] } {
    let score = 50;
    const reasons: string[] = [];
    const warnings: string[] = [];

    // Precipitación
    if (crop.precipMin && ctx.climate?.annualPrecip !== undefined) {
        if (ctx.climate.annualPrecip >= crop.precipMin) {
            score += 10;
            reasons.push(`lluvia ${ctx.climate.annualPrecip} mm cumple mínimo ${crop.precipMin}`);
        } else if (ctx.climate.annualPrecip < crop.precipMin * 0.5) {
            // Por debajo del 50 % del mínimo el cultivo no es viable rainfed
            // bajo ningún margen razonable → hard reject.
            score = 0;
            warnings.push(`lluvia muy insuficiente (${ctx.climate.annualPrecip} mm es <50% del mínimo ${crop.precipMin})`);
        } else {
            score -= 20;
            warnings.push(`lluvia insuficiente (${ctx.climate.annualPrecip} < ${crop.precipMin} mm)`);
        }
    }

    // pH
    if (crop.phMin && crop.phMax && ctx.soilPh !== undefined) {
        if (ctx.soilPh >= crop.phMin && ctx.soilPh <= crop.phMax) {
            score += 10;
            reasons.push(`pH ${ctx.soilPh} en rango`);
        } else {
            score -= 12;
            warnings.push(`pH ${ctx.soilPh} fuera de [${crop.phMin}-${crop.phMax}]`);
        }
    }

    // Pendiente
    if (crop.maxSlopePct !== undefined && ctx.slope !== undefined) {
        if (ctx.slope <= crop.maxSlopePct) {
            score += 5;
        } else {
            score -= 10;
            warnings.push(`pendiente ${ctx.slope}% > ${crop.maxSlopePct}% admisible`);
        }
    }

    // Profundidad del suelo
    if (crop.soilDepthMinCm && ctx.soilDepthCm !== undefined && ctx.soilDepthCm < crop.soilDepthMinCm) {
        score -= 15;
        warnings.push(`suelo somero (${ctx.soilDepthCm} < ${crop.soilDepthMinCm} cm)`);
    }

    // Compatibilidad con animal
    if (ctx.animalBiotype && crop.animalCompat.includes(ctx.animalBiotype)) {
        score += 15;
        reasons.push(`buen ajuste con biotipo ${ctx.animalBiotype}`);
    }
    if (ctx.animalObjective && crop.animalCompat.includes(ctx.animalObjective)) {
        score += 10;
        reasons.push(`apropiado para fase ${ctx.animalObjective}`);
    }

    score = Math.max(0, Math.min(100, score));
    return { score, reasons, warnings };
}

/**
 * Genera el calendario completo del año (12 meses) ordenado.
 */
export function fullYearCalendar(ctx: AgronomicMatchContext = {}): Record<number, MonthlyRecommendation[]> {
    const out: Record<number, MonthlyRecommendation[]> = {};
    for (let m = 0; m < 12; m++) out[m] = calendarForMonth(m, ctx);
    return out;
}

export const MONTH_NAMES_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const;
