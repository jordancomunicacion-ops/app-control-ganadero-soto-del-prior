/**
 * CowProductivityEngine — Productividad biológica y económica de la vaca nodriza.
 *
 * La vaca nodriza no produce kg directamente: produce un ternero por ciclo
 * reproductivo (IEP). La productividad anualizada se calcula como:
 *
 *   kg/vaca/año = peso_destete × tasa_destete × (365 / IEP)
 *
 * El sistema modela dos escenarios económicos:
 *   1. **Venta al destete** — pago directo en €/kg vivo del ternero a ~180 d
 *      y ~220 kg. Es el modelo extensivo clásico.
 *   2. **Cebo posterior** — el ternero se ceba hasta sacrificio (~14 m,
 *      ~480 kg vivo, ~270 kg canal) y se valora contra el grid SEUROP del
 *      `PriceEngine`. Margen mayor pero añade costes de cebo imputables
 *      a la vaca (la madre soporta el coste hasta el sacrificio si el
 *      ganadero los integra).
 *
 * Defaults calibrados para vacuno carne extensivo español (Pirenaica,
 * Avileña, Limusina cruzada y razas autóctonas similares).
 *
 * Diseño: motor puro, sin BD. Recibe datos del rebaño preagregados o
 * de la vaca individual (con su historial real) y devuelve los KPIs
 * económicos. Los server actions inyectan el lookup de precios SEUROP
 * para que se use el `Price` real cuando esté disponible.
 */

// ─── PARÁMETROS POR DEFECTO ────────────────────────────────────────────────────

/**
 * Defaults sectoriales vacuno carne extensivo España. Pueden ser
 * sobrescritos por animal o por finca cuando se conozca el valor real.
 */
export const COW_DEFAULTS = {
    /** Edad al destete típica (días). */
    weaningDays: 180,
    /** Peso medio al destete (kg vivo). */
    weaningWeightKg: 220,
    /** GMD del ternero pre-destete (kg/día). */
    preWeaningGmdKgPerDay: 1.0,
    /** Tasa de destete (terneros destetados vivos / partos esperados). */
    weaningRate: 0.85,
    /** IEP óptimo (días). */
    iepDays: 390,
    /** Precio del ternero al destete (€/kg vivo, ternero de pasto). */
    weaningPricePerKg: 4.2,
    /** Peso vivo al sacrificio del ternero cebado (kg). */
    slaughterLiveWeightKg: 480,
    /** Edad al sacrificio (meses) del ternero cebado. */
    slaughterAgeMonths: 14,
    /** Rendimiento canal medio (canal / vivo). */
    carcassYield: 0.56,
    /** Conformación SEUROP por defecto (R = regular). */
    defaultConformation: 'R' as const,
    /** Engrasamiento SEUROP por defecto (1-5). */
    defaultFat: 3,
    /** Coste estimado del periodo de cebo (€ por ternero, alimentación + sanidad + manejo). */
    fatteningCostEur: 350,
} as const;

// ─── TIPOS ─────────────────────────────────────────────────────────────────────

export interface CowProductivityInput {
    /** IEP real o estimado (días). Default `COW_DEFAULTS.iepDays`. */
    iepDays?: number;
    /** Tasa de destete (0–1). Default `COW_DEFAULTS.weaningRate`. */
    weaningRate?: number;
    /** Peso al destete (kg vivo). Default `COW_DEFAULTS.weaningWeightKg`. */
    weaningWeightKg?: number;
    /** Precio €/kg vivo del ternero al destete. */
    weaningPricePerKg?: number;
}

export interface BiologicalProductivity {
    /** Partos esperados por año (365 / IEP). */
    partsPerYear: number;
    /** Terneros destetados por vaca y año (partsPerYear × weaningRate). */
    weanedPerYear: number;
    /** Kg de ternero producidos por vaca y año al destete. */
    kgWeanedPerYear: number;
}

export interface WeaningSaleResult {
    /** Ingreso bruto por vaca/año si todos los terneros se venden al destete. */
    grossRevenueEur: number;
    /** Precio €/kg vivo usado. */
    pricePerKg: number;
}

export interface SlaughterSaleResult {
    /** Ingreso bruto por vaca/año si todos los terneros se ceban hasta sacrificio. */
    grossRevenueEur: number;
    /** Precio SEUROP €/kg canal aplicado. */
    pricePerKgCarcass: number;
    /** Categoría MAPA usada en la valoración (A, Z, V…). */
    mapaCategory: string;
    /** Coste de cebo imputado (€/vaca/año). */
    fatteningCostEur: number;
    /** Ingreso neto tras descontar el cebo. */
    netRevenueEur: number;
}

export interface CostBreakdown {
    /** Coste alimentación de la vaca (no del ternero). */
    feedEur: number;
    /** Coste sanitario imputado. */
    healthEur: number;
    /** Amortización biológica del vientre. */
    depreciationEur: number;
    /** Mano de obra prorrateada. */
    laborEur: number;
    /** Otros (servicios, financieros). */
    otherEur: number;
    /** Total anual por vaca. */
    totalEur: number;
}

export interface ProductivityResult {
    biological: BiologicalProductivity;
    atWeaning: WeaningSaleResult;
    atSlaughter: SlaughterSaleResult;
    /** Ingreso neto si el modelo principal de la finca es destete. */
    netAtWeaningEur: number | null;
    /** Ingreso neto si el modelo principal es cebo. */
    netAtSlaughterEur: number | null;
    /** Costes anuales imputados a la vaca. */
    costs?: CostBreakdown;
    /** Resumen textual del cálculo para mostrar al usuario. */
    explanation: string;
}

// ─── CÁLCULOS BIOLÓGICOS ───────────────────────────────────────────────────────

export function biologicalProductivity(
    input: CowProductivityInput = {},
): BiologicalProductivity {
    const iep = Math.max(280, input.iepDays ?? COW_DEFAULTS.iepDays);
    const rate = clamp01(input.weaningRate ?? COW_DEFAULTS.weaningRate);
    const weight = Math.max(0, input.weaningWeightKg ?? COW_DEFAULTS.weaningWeightKg);

    const partsPerYear = 365 / iep;
    const weanedPerYear = partsPerYear * rate;
    const kgWeanedPerYear = weanedPerYear * weight;

    return { partsPerYear, weanedPerYear, kgWeanedPerYear };
}

// ─── ESCENARIO 1 — VENTA AL DESTETE ────────────────────────────────────────────

export function revenueAtWeaning(input: CowProductivityInput = {}): WeaningSaleResult {
    const bio = biologicalProductivity(input);
    const pricePerKg = input.weaningPricePerKg ?? COW_DEFAULTS.weaningPricePerKg;
    return {
        grossRevenueEur: bio.kgWeanedPerYear * pricePerKg,
        pricePerKg,
    };
}

// ─── ESCENARIO 2 — CEBO POSTERIOR Y VENTA SEUROP ───────────────────────────────

/**
 * Tipo del lookup SEUROP. Igual contrato que `PriceEngine.calculateSalesPriceWithLookup`.
 * Devuelve €/100 kg canal para una clave o `undefined` si no hay precio.
 */
export type SeuropPriceLookup = (code: string) => number | undefined;

export interface SlaughterParams {
    /** Peso vivo al sacrificio (kg). Default 480. */
    liveWeightKg?: number;
    /** Edad al sacrificio (meses). Default 14. */
    ageMonths?: number;
    /** Rendimiento canal. Default 0.56. */
    carcassYield?: number;
    /** Conformación SEUROP del ternero cebado. Default R. */
    conformation?: string;
    /** Engrasamiento SEUROP (1-5). Default 3. */
    fat?: number;
    /** Coste imputado de cebo (€/ternero). Default 350. */
    fatteningCostEur?: number;
}

/**
 * Valora el ternero cebado contra el grid SEUROP usando el lookup
 * inyectado (el mismo contrato que el `PriceEngine`).
 */
export function revenueAtSlaughter(
    input: CowProductivityInput,
    slaughter: SlaughterParams,
    seuropLookup: SeuropPriceLookup,
): SlaughterSaleResult {
    const bio = biologicalProductivity(input);

    const liveKg = Math.max(0, slaughter.liveWeightKg ?? COW_DEFAULTS.slaughterLiveWeightKg);
    const ageM = slaughter.ageMonths ?? COW_DEFAULTS.slaughterAgeMonths;
    const yieldRatio = clamp01(slaughter.carcassYield ?? COW_DEFAULTS.carcassYield);
    const conformation = (slaughter.conformation ?? COW_DEFAULTS.defaultConformation).toUpperCase();
    const fat = Math.max(1, Math.min(5, Math.round(slaughter.fat ?? COW_DEFAULTS.defaultFat)));
    const fatteningCost = slaughter.fatteningCostEur ?? COW_DEFAULTS.fatteningCostEur;

    const carcassKg = liveKg * yieldRatio;

    // Determinamos la categoría MAPA exactamente como el PriceEngine:
    //   < 8 m → V; 8-12 m → Z; 12-24 m macho no castrado → A.
    let category: string;
    if (ageM < 8) category = 'V';
    else if (ageM < 12) category = 'Z';
    else category = 'A'; // El cebo típico cae aquí (12-14 m).

    const exactCode = `${category}${conformation}${fat}`;
    const classCode = `${category}${conformation}`;
    const pricePer100Kg =
        seuropLookup(exactCode) ??
        seuropLookup(classCode) ??
        seuropLookup(category) ??
        500;
    const pricePerKgCarcass = pricePer100Kg / 100;

    // Ingreso bruto = terneros destetados × valor canal cada uno.
    const revenuePerCalf = carcassKg * pricePerKgCarcass;
    const grossRevenueEur = bio.weanedPerYear * revenuePerCalf;
    const fatteningEur = bio.weanedPerYear * fatteningCost;

    return {
        grossRevenueEur,
        pricePerKgCarcass,
        mapaCategory: category,
        fatteningCostEur: fatteningEur,
        netRevenueEur: grossRevenueEur - fatteningEur,
    };
}

// ─── COSTES ANUALES DE LA VACA ─────────────────────────────────────────────────

/**
 * Coste anual imputable a una vaca nodriza. Por defecto utiliza referencias
 * sectoriales vacuno carne extensivo (zonas dehesa / Navarra). El motor de
 * costes general (`CostEngine`) puede sobrescribirlos con datos reales.
 */
export const COW_COST_DEFAULTS: CostBreakdown = {
    feedEur: 280, // suplementación + pasto valorizado
    healthEur: 40, // saneamientos + tratamientos puntuales
    depreciationEur: 75, // (1400 − 800) / 8 años de vida útil
    laborEur: 90, // mano de obra prorrateada
    otherEur: 25,
    totalEur: 510,
};

export function defaultCowCosts(): CostBreakdown {
    return { ...COW_COST_DEFAULTS };
}

// ─── CÁLCULO COMPLETO ─────────────────────────────────────────────────────────

export interface ComputeArgs {
    input?: CowProductivityInput;
    slaughter?: SlaughterParams;
    seuropLookup?: SeuropPriceLookup;
    costs?: CostBreakdown;
}

/**
 * Calcula los dos escenarios económicos y los costes netos. Si no se
 * aporta `seuropLookup`, el escenario de cebo se calcula con los precios
 * estáticos del `PriceEngine` (importados por el caller).
 */
export function computeCowProductivity(args: ComputeArgs = {}): ProductivityResult {
    const bio = biologicalProductivity(args.input);
    const weaningRes = revenueAtWeaning(args.input);
    const slaughterParams: SlaughterParams = args.slaughter ?? {};
    const fallbackLookup: SeuropPriceLookup = () => undefined;
    const slaughterRes = revenueAtSlaughter(
        args.input ?? {},
        slaughterParams,
        args.seuropLookup ?? fallbackLookup,
    );

    const costs = args.costs;
    const netAtWeaningEur = costs ? weaningRes.grossRevenueEur - costs.totalEur : null;
    const netAtSlaughterEur = costs ? slaughterRes.netRevenueEur - costs.totalEur : null;

    const explanation = [
        `${bio.partsPerYear.toFixed(2)} partos/año (IEP ${args.input?.iepDays ?? COW_DEFAULTS.iepDays} días).`,
        `${(args.input?.weaningRate ?? COW_DEFAULTS.weaningRate) * 100}% destete → ${bio.weanedPerYear.toFixed(2)} terneros/año.`,
        `${bio.kgWeanedPerYear.toFixed(0)} kg vivos producidos al destete por vaca y año.`,
        `Venta al destete: ${weaningRes.grossRevenueEur.toFixed(0)} €/año bruto.`,
        `Cebo y sacrificio (SEUROP ${slaughterRes.mapaCategory}${(slaughterParams.conformation ?? COW_DEFAULTS.defaultConformation)}${slaughterParams.fat ?? COW_DEFAULTS.defaultFat}): ${slaughterRes.netRevenueEur.toFixed(0)} €/año neto tras cebo.`,
    ].join(' ');

    return {
        biological: bio,
        atWeaning: weaningRes,
        atSlaughter: slaughterRes,
        netAtWeaningEur,
        netAtSlaughterEur,
        costs,
        explanation,
    };
}

// ─── PRODUCTIVIDAD INDIVIDUAL (CON HISTORIAL REAL) ─────────────────────────────

export interface CowHistory {
    /** Fechas de parto registradas (ordenadas ascendentemente). */
    partosDates: Date[];
    /**
     * Pesos al destete de los terneros producidos por esta vaca, si se
     * registraron. Cada entrada corresponde al ternero del parto del mismo índice.
     */
    weaningWeightsKg?: number[];
}

export interface CowIndividualResult extends ProductivityResult {
    /** IEP real medido (días). Null si <2 partos. */
    actualIepDays: number | null;
    /** Nº de partos registrados. */
    partosCount: number;
    /** Tasa de destete observada (terneros destetados / partos). */
    observedWeaningRate: number | null;
    /** Peso medio al destete observado (kg). Null si no hay registros. */
    averageWeaningWeightKg: number | null;
}

/**
 * Calcula la productividad para una vaca concreta, mezclando su historial
 * real (IEP medido y peso medio observado al destete) con los defaults
 * cuando no hay datos suficientes.
 */
export function computeCowIndividual(
    history: CowHistory,
    args: Omit<ComputeArgs, 'input'> & { fallback?: CowProductivityInput } = {},
): CowIndividualResult {
    const dates = [...history.partosDates].sort((a, b) => a.getTime() - b.getTime());
    let iepReal: number | null = null;
    if (dates.length >= 2) {
        const intervals: number[] = [];
        for (let i = 1; i < dates.length; i++) {
            const diff = (dates[i].getTime() - dates[i - 1].getTime()) / 86_400_000;
            if (diff > 240 && diff < 1000) intervals.push(diff);
        }
        if (intervals.length > 0) {
            iepReal = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        }
    }

    const weights = (history.weaningWeightsKg ?? []).filter((w) => w > 0);
    const weightAvg = weights.length > 0
        ? weights.reduce((a, b) => a + b, 0) / weights.length
        : null;

    const observedWeaningRate =
        history.weaningWeightsKg && dates.length > 0
            ? history.weaningWeightsKg.filter((w) => w > 0).length / dates.length
            : null;

    const input: CowProductivityInput = {
        ...(args.fallback ?? {}),
        ...(iepReal != null ? { iepDays: iepReal } : {}),
        ...(weightAvg != null ? { weaningWeightKg: weightAvg } : {}),
        ...(observedWeaningRate != null ? { weaningRate: observedWeaningRate } : {}),
    };

    const result = computeCowProductivity({
        ...args,
        input,
    });

    return {
        ...result,
        actualIepDays: iepReal,
        partosCount: dates.length,
        observedWeaningRate,
        averageWeaningWeightKg: weightAvg,
    };
}

// ─── HELPERS ───────────────────────────────────────────────────────────────────

function clamp01(x: number): number {
    if (!Number.isFinite(x)) return 0;
    return Math.max(0, Math.min(1, x));
}
