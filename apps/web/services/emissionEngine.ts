/**
 * EmissionEngine — Huella de carbono ganadera (IPCC 2019 Refinement).
 *
 * Cubre vacuno carne extensivo / semi-extensivo en clima mediterráneo,
 * que es el caso de SOTO del PRIOR (Fustiñana, Navarra). Devuelve kg CO₂eq
 * por finca, grupo de animales y unidad de producto (kg vivo / kg canal).
 *
 * Fuentes y supuestos:
 *   - IPCC 2019 Refinement Vol 4 Ch 10 (fermentación entérica) y Ch 11
 *     (gestión de estiércol + N₂O suelos).
 *   - Western Europe Tier 1 EFs salvo cuando se aporta DMI real (Tier 2).
 *   - GWP 100-year del 6.º informe (AR6 WG1, 2021): CH₄ no-fósil = 27.0;
 *     N₂O = 273. (Si necesitas comparar con inventario nacional MITECO
 *     que aún usa AR5, divide por 28/27 o 265/273 según corresponda.)
 *
 * Diseño:
 *   - Funciones puras. No tocan la base de datos. Los `EmissionRecord`
 *     se persisten desde un cron/job que llama a `aggregateFarmEmissions`.
 *   - Inputs mínimos: nº cabezas por categoría y duración del periodo.
 *     Si se aporta DMI medio (kg MS/día) se sube a Tier 2 entérico.
 *
 * Limitaciones explícitas:
 *   - Tier 1 asume animales adultos en mantenimiento; subestima ligeramente
 *     periodos de crecimiento intenso. Si vas a usar esto para acceder a
 *     primas climáticas, pásalo a Tier 2 alimentando `dmiKgDay` desde
 *     DailyMetric o desde la ración real.
 *   - El cálculo de N excretado usa valores por defecto IPCC para vacuno
 *     carne (~62 kg N/cab/año vaca adulta). Sustituirlos por valores reales
 *     cuando se conozca la dieta proteica.
 */

// ─── CONSTANTES IPCC 2019 / AR6 ────────────────────────────────────────────────

/** GWP100 AR6 (IPCC 2021 WG1 Ch 7 Table 7.SM.7). */
export const GWP_CH4 = 27.0;       // CH4 no fósil
export const GWP_N2O = 273;

/**
 * Factor entérico Tier 1 — Western Europe, vacuno no lechero
 * (IPCC 2019 Vol 4 Ch 10 Table 10.11). Valores anuales por cabeza.
 *
 * Ajustes por categoría — al desagregar entre adultos en mantenimiento
 * (vacas de cría, toros) y crecimiento (terneros, novillas) usamos
 * valores derivados del rango "other cattle" 55 ± 8 kg CH₄/cab/año.
 */
export const TIER1_ENTERIC_EF: Record<EmissionGroup, number> = {
    vaca_seca: 86,        // vaca de cría adulta, Western Europe
    vaca_lactante: 100,   // vaca de cría con lactancia (ajuste IPCC)
    toro: 90,
    novilla: 57,
    ternero: 40,
    total: 65,
};

/** Excreción anual de nitrógeno por cabeza (kg N/cab/año). IPCC default Europe. */
export const N_EXCRETION_KG_YEAR: Record<EmissionGroup, number> = {
    vaca_seca: 62,
    vaca_lactante: 78,
    toro: 80,
    novilla: 50,
    ternero: 24,
    total: 55,
};

/** CH4 manure management — kg CH4/cab/año. Default IPCC pasture/range. */
export const MANURE_CH4_EF_PASTURE: Record<EmissionGroup, number> = {
    vaca_seca: 1.5,
    vaca_lactante: 2.0,
    toro: 2.0,
    novilla: 1.0,
    ternero: 0.5,
    total: 1.2,
};

/** CH4 manure si estabulado en slurry/solid storage (kg CH4/cab/año). */
export const MANURE_CH4_EF_HOUSED: Record<EmissionGroup, number> = {
    vaca_seca: 9,
    vaca_lactante: 13,
    toro: 10,
    novilla: 7,
    ternero: 4,
    total: 8,
};

/** EF3 — N2O directo en pasto/dehesa (kg N2O-N por kg N excretado). */
export const EF3_PASTURE = 0.006;

/** EF3 — N2O directo en solid storage (estiércol estabulado). */
export const EF3_SOLID_STORAGE = 0.01;

/** FracGasMS — fracción de N volatilizado en pasto. */
export const FRAC_GAS_PASTURE = 0.21;
/** EF4 — N2O por deposición atmosférica (kg N2O-N por kg NH3-N volatilizado). */
export const EF4 = 0.014;
/** FracLeach — fracción de N lixiviado en pasto (clima húmedo). */
export const FRAC_LEACH_PASTURE = 0.24;
/** EF5 — N2O por lixiviación. */
export const EF5 = 0.011;

/** Factor conversión metano Ym (% energía bruta → CH4) — adultos. */
export const YM_DEFAULT = 0.063; // 6.3 % IPCC 2019 Tier 2 default adultos
/** GE bruta media del forraje pasto/heno típico (MJ/kg MS). */
export const GE_PER_KG_DM = 18.45;
/** Energía contenida en 1 kg de CH4 (MJ). */
export const MJ_PER_KG_CH4 = 55.65;

/** Conversión N → N2O (peso molecular). */
const N_TO_N2O = 44 / 28;

// ─── TIPOS ─────────────────────────────────────────────────────────────────────

export type EmissionGroup =
    | 'vaca_seca'
    | 'vaca_lactante'
    | 'toro'
    | 'novilla'
    | 'ternero'
    | 'total';

export interface EmissionGroupInput {
    /** Nombre del grupo / categoría animal. */
    group: EmissionGroup;
    /**
     * Nº de cabezas equivalentes durante el periodo. Si el periodo es
     * < 1 año, escalar fuera: este motor calcula en base anual y luego
     * prorratea por `periodDays / 365`.
     */
    headcount: number;
    /** Días del periodo evaluado (p.ej. 30 si es un mes). */
    periodDays: number;
    /**
     * Fracción del tiempo en pasto vs estabulado (0–1). 1 = todo el
     * periodo en pasto; 0 = todo el periodo en establo. Default 1 para
     * extensivo / dehesa.
     */
    fracPasture?: number;
    /**
     * DMI medio en kg MS/día (Tier 2). Si se aporta, se calcula el factor
     * entérico con la fórmula IPCC GE × Ym / 55.65; si no, se usa Tier 1.
     */
    dmiKgDay?: number;
    /**
     * Override del Ym (factor conversión metano, 0–0.1). Default 0.063.
     * Bajarlo a 0.04 si la ración tiene >75 % concentrado.
     */
    ym?: number;
    /**
     * Producción del grupo en el periodo: kg de canal y kg de peso vivo
     * generados (destete, sacrificio, ventas). Sirven para calcular la
     * intensidad de emisión.
     */
    liveWeightKg?: number;
    carcassKg?: number;
}

export interface EmissionResult {
    group: EmissionGroup;
    headcount: number;
    periodDays: number;
    fracPasture: number;

    ch4Enteric: number;   // kg CH4 en el periodo
    ch4Manure: number;
    n2oManure: number;    // kg N2O directo + indirecto
    n2oSoil: number;      // kg N2O deposiciones directas en pasto

    co2eqEnteric: number; // kg CO2eq
    co2eqManure: number;
    co2eqN2O: number;
    co2eqTotal: number;

    liveWeightKg?: number;
    carcassKg?: number;
    intensityPerKgLive?: number;
    intensityPerKgCarcass?: number;

    methodology: 'IPCC2019_Tier1' | 'IPCC2019_Tier2';
}

// ─── FUNCIONES PURAS DE CÁLCULO ────────────────────────────────────────────────

/**
 * Factor entérico anual (kg CH4/cab/año) por Tier.
 *
 * Tier 2 si se aporta `dmiKgDay`. Fórmula IPCC 2019 Eq 10.21:
 *   EF = (GE × Ym × 365) / 55.65
 * donde GE = DMI × 18.45 MJ/kg MS.
 *
 * Tier 1: tabla por defecto Western Europe por categoría.
 */
export function entericFactor(
    group: EmissionGroup,
    dmiKgDay?: number,
    ym: number = YM_DEFAULT,
): { kgCh4PerHeadYear: number; tier: 'Tier1' | 'Tier2' } {
    if (typeof dmiKgDay === 'number' && dmiKgDay > 0) {
        const gePerDay = dmiKgDay * GE_PER_KG_DM; // MJ/día
        const kg = (gePerDay * ym * 365) / MJ_PER_KG_CH4;
        return { kgCh4PerHeadYear: kg, tier: 'Tier2' };
    }
    return { kgCh4PerHeadYear: TIER1_ENTERIC_EF[group], tier: 'Tier1' };
}

/**
 * Calcula emisiones de un grupo durante el periodo solicitado.
 * Todo se computa en base anual y se prorratea por (periodDays / 365).
 */
export function computeGroupEmissions(input: EmissionGroupInput): EmissionResult {
    const fracPasture = clamp01(input.fracPasture ?? 1);
    const periodFrac = input.periodDays / 365;

    const enteric = entericFactor(input.group, input.dmiKgDay, input.ym);
    const ch4Enteric = enteric.kgCh4PerHeadYear * input.headcount * periodFrac;

    // Manure CH4 — mezcla de pasto y estabulado
    const manureEfAnnual =
        MANURE_CH4_EF_PASTURE[input.group] * fracPasture +
        MANURE_CH4_EF_HOUSED[input.group] * (1 - fracPasture);
    const ch4Manure = manureEfAnnual * input.headcount * periodFrac;

    // N excretado en el periodo (kg N)
    const nExcreted = N_EXCRETION_KG_YEAR[input.group] * input.headcount * periodFrac;

    // N2O directo de deposiciones en pasto (suelo) + estiércol estabulado
    const nPasture = nExcreted * fracPasture;
    const nHoused = nExcreted * (1 - fracPasture);

    const n2oSoilN = nPasture * EF3_PASTURE;
    const n2oManureDirectN = nHoused * EF3_SOLID_STORAGE;

    // N2O indirecto (volatilización + lixiviación) — aplicado a la fracción
    // depositada en pasto, donde estas pérdidas son dominantes.
    const n2oVolatN = nPasture * FRAC_GAS_PASTURE * EF4;
    const n2oLeachN = nPasture * FRAC_LEACH_PASTURE * EF5;

    const n2oSoil = (n2oSoilN + n2oVolatN + n2oLeachN) * N_TO_N2O;
    const n2oManure = n2oManureDirectN * N_TO_N2O;

    const co2eqEnteric = ch4Enteric * GWP_CH4;
    const co2eqManure = ch4Manure * GWP_CH4;
    const co2eqN2O = (n2oSoil + n2oManure) * GWP_N2O;
    const co2eqTotal = co2eqEnteric + co2eqManure + co2eqN2O;

    const intensityPerKgLive =
        input.liveWeightKg && input.liveWeightKg > 0
            ? co2eqTotal / input.liveWeightKg
            : undefined;
    const intensityPerKgCarcass =
        input.carcassKg && input.carcassKg > 0
            ? co2eqTotal / input.carcassKg
            : undefined;

    return {
        group: input.group,
        headcount: input.headcount,
        periodDays: input.periodDays,
        fracPasture,
        ch4Enteric,
        ch4Manure,
        n2oManure,
        n2oSoil,
        co2eqEnteric,
        co2eqManure,
        co2eqN2O,
        co2eqTotal,
        liveWeightKg: input.liveWeightKg,
        carcassKg: input.carcassKg,
        intensityPerKgLive,
        intensityPerKgCarcass,
        methodology: enteric.tier === 'Tier2' ? 'IPCC2019_Tier2' : 'IPCC2019_Tier1',
    };
}

/**
 * Agrega varios grupos en una sola finca y devuelve el total más los
 * desgloses por grupo. Listo para persistir como `EmissionRecord`.
 *
 * `farmLiveWeightKg` y `farmCarcassKg` son las producciones totales del
 * periodo (suma de ventas/sacrificios/destetes según corresponda).
 */
export function aggregateFarmEmissions(
    groups: EmissionGroupInput[],
    farmTotals?: { liveWeightKg?: number; carcassKg?: number },
): { byGroup: EmissionResult[]; total: EmissionResult } {
    const byGroup = groups.map((g) => computeGroupEmissions(g));

    const sum = (key: keyof EmissionResult): number =>
        byGroup.reduce((acc, r) => acc + ((r[key] as number) || 0), 0);

    const totalHeads = sum('headcount');
    const totalFracPasture =
        totalHeads > 0
            ? byGroup.reduce(
                  (acc, r) => acc + r.fracPasture * r.headcount,
                  0,
              ) / totalHeads
            : 1;

    const co2eqTotal = sum('co2eqTotal');
    const liveWeightKg = farmTotals?.liveWeightKg;
    const carcassKg = farmTotals?.carcassKg;
    const longestPeriod = byGroup.reduce(
        (a, r) => Math.max(a, r.periodDays),
        0,
    );

    const total: EmissionResult = {
        group: 'total',
        headcount: totalHeads,
        periodDays: longestPeriod,
        fracPasture: totalFracPasture,
        ch4Enteric: sum('ch4Enteric'),
        ch4Manure: sum('ch4Manure'),
        n2oManure: sum('n2oManure'),
        n2oSoil: sum('n2oSoil'),
        co2eqEnteric: sum('co2eqEnteric'),
        co2eqManure: sum('co2eqManure'),
        co2eqN2O: sum('co2eqN2O'),
        co2eqTotal,
        liveWeightKg,
        carcassKg,
        intensityPerKgLive:
            liveWeightKg && liveWeightKg > 0 ? co2eqTotal / liveWeightKg : undefined,
        intensityPerKgCarcass:
            carcassKg && carcassKg > 0 ? co2eqTotal / carcassKg : undefined,
        methodology: byGroup.some((r) => r.methodology === 'IPCC2019_Tier2')
            ? 'IPCC2019_Tier2'
            : 'IPCC2019_Tier1',
    };

    return { byGroup, total };
}

/**
 * Clasifica un animal en una categoría IPCC a partir de sexo, edad y
 * `category` heurístico de la app. Útil para construir los inputs a partir
 * del catálogo `Animal` antes de llamar al motor.
 */
export function classifyAnimal(args: {
    sex: 'M' | 'H' | string;
    birthDate: Date | string;
    referenceDate: Date;
    category?: string | null;
    /** Está actualmente en lactación (madre con cría reciente). */
    lactating?: boolean;
}): EmissionGroup {
    const birth =
        typeof args.birthDate === 'string'
            ? new Date(args.birthDate)
            : args.birthDate;
    const ageMonths =
        (args.referenceDate.getTime() - birth.getTime()) /
        (1000 * 60 * 60 * 24 * 30.4375);
    const sex = (args.sex || '').toUpperCase();

    if (ageMonths < 12) return 'ternero';
    if (sex === 'M') return 'toro';
    // Hembras
    if (ageMonths < 28) return 'novilla'; // no parida aún
    return args.lactating ? 'vaca_lactante' : 'vaca_seca';
}

/**
 * Bandera de intensidad para el dashboard (semáforo).
 *
 * Umbrales orientativos para vacuno carne extensivo en clima mediterráneo
 * (referencia: FAO 2017 y MITECO inventario nacional GEI). Ajustables.
 */
export function intensitySemaphore(
    kgCo2eqPerKgCarcass: number,
): 'verde' | 'ambar' | 'rojo' {
    if (kgCo2eqPerKgCarcass <= 22) return 'verde';
    if (kgCo2eqPerKgCarcass <= 32) return 'ambar';
    return 'rojo';
}

// ─── HELPERS ────────────────────────────────────────────────────────────────────

function clamp01(x: number): number {
    if (Number.isNaN(x)) return 1;
    if (x < 0) return 0;
    if (x > 1) return 1;
    return x;
}
