/**
 * CostEngine — Costes de producción €/kg canal en vacuno carne extensivo.
 *
 * Imputa cuatro grandes bloques y los normaliza por unidad de producto:
 *
 *   1) **Alimentación** — desde Ration × días × precio del feed. El server
 *      action acumula este coste por animal antes de pasarlo al motor.
 *
 *   2) **Sanidad** — desde `CostEntry` con `source='health'` (medicamentos,
 *      productos del kardex que entraron con coste, tratamientos con coste
 *      explícito). Ya queda persistido por las actions del Sprint 2.4.
 *
 *   3) **Amortización biológica del vientre** — (precio compra − precio
 *      desvieje) / vida útil. Con `vidaUtilAnios = 8` por defecto si no se
 *      aporta. Para extensivo español la vida útil suele ir de 7 a 10 años
 *      (Pirenaica, Avileña, Limusina cruzada).
 *
 *   4) **Otros costes** — mano de obra (input mensual prorrateado),
 *      energía, mantenimiento, financieros. Vienen como `CostEntry`
 *      manuales o agregados ya calculados.
 *
 * Salidas:
 *   - €/kg canal — el indicador de cabecera.
 *   - €/kg vivo, €/ternero destetado, €/cabeza/año.
 *   - Margen vs precio SEUROP medio del periodo.
 *   - Punto de equilibrio (break-even) — €/kg canal mínimo para no perder.
 *
 * El motor es puro: recibe agregados y devuelve resultados. La extracción
 * de datos vive en `app/lib/cost-actions.ts`.
 */

export type CostCategory =
    | 'alimentacion'
    | 'sanidad'
    | 'mano_obra'
    | 'amortizacion'
    | 'servicios'
    | 'otros';

export interface CostInputs {
    /** Periodo evaluado en días (típicamente 365 para anual). */
    periodDays: number;
    /** Cabezas medias en el periodo (no las activas hoy: la media). */
    averageHeadcount: number;
    /** Costes desglosados por categoría en €. */
    costsByCategory: Partial<Record<CostCategory, number>>;
    /** Producción del periodo en kg canal. */
    carcassKg?: number;
    /** Producción del periodo en kg vivo total. */
    liveWeightKg?: number;
    /** Nº de terneros destetados en el periodo. */
    weanedCalves?: number;
    /** Precio SEUROP medio del periodo (€/kg canal). Si no se aporta, no se calcula margen. */
    averageSeuropPricePerKgCarcass?: number;
}

export interface CostResult {
    totalCost: number;
    byCategory: Record<CostCategory, number>;
    /** Coste medio por cabeza y año, normalizando por el periodo. */
    costPerHeadYear: number;
    /** €/kg canal producido. */
    costPerKgCarcass: number | null;
    /** €/kg vivo producido. */
    costPerKgLive: number | null;
    /** €/ternero destetado. */
    costPerWeaned: number | null;
    /** Margen €/kg canal vs precio SEUROP medio. */
    marginPerKgCarcass: number | null;
    /** Margen total del periodo en €. */
    marginTotal: number | null;
    /** Precio mínimo de equilibrio (€/kg canal). Igual a costPerKgCarcass. */
    breakEvenPricePerKgCarcass: number | null;
    /** % que cada categoría representa del total. */
    sharePct: Record<CostCategory, number>;
}

const CATEGORIES: CostCategory[] = [
    'alimentacion',
    'sanidad',
    'mano_obra',
    'amortizacion',
    'servicios',
    'otros',
];

/**
 * Calcula el coste de producción y los KPIs derivados.
 */
export function computeProductionCost(inputs: CostInputs): CostResult {
    const byCategory: Record<CostCategory, number> = Object.fromEntries(
        CATEGORIES.map((c) => [c, inputs.costsByCategory[c] ?? 0]),
    ) as Record<CostCategory, number>;

    const totalCost = Object.values(byCategory).reduce((a, b) => a + b, 0);
    const periodYears = inputs.periodDays / 365;

    const costPerHeadYear =
        inputs.averageHeadcount > 0 && periodYears > 0
            ? totalCost / inputs.averageHeadcount / periodYears
            : 0;

    const costPerKgCarcass =
        inputs.carcassKg && inputs.carcassKg > 0
            ? totalCost / inputs.carcassKg
            : null;
    const costPerKgLive =
        inputs.liveWeightKg && inputs.liveWeightKg > 0
            ? totalCost / inputs.liveWeightKg
            : null;
    const costPerWeaned =
        inputs.weanedCalves && inputs.weanedCalves > 0
            ? totalCost / inputs.weanedCalves
            : null;

    let marginPerKgCarcass: number | null = null;
    let marginTotal: number | null = null;
    if (
        inputs.averageSeuropPricePerKgCarcass != null &&
        costPerKgCarcass != null &&
        inputs.carcassKg
    ) {
        marginPerKgCarcass =
            inputs.averageSeuropPricePerKgCarcass - costPerKgCarcass;
        marginTotal = marginPerKgCarcass * inputs.carcassKg;
    }

    const sharePct: Record<CostCategory, number> = Object.fromEntries(
        CATEGORIES.map((c) => [
            c,
            totalCost > 0 ? (byCategory[c] / totalCost) * 100 : 0,
        ]),
    ) as Record<CostCategory, number>;

    return {
        totalCost,
        byCategory,
        costPerHeadYear,
        costPerKgCarcass,
        costPerKgLive,
        costPerWeaned,
        marginPerKgCarcass,
        marginTotal,
        breakEvenPricePerKgCarcass: costPerKgCarcass,
        sharePct,
    };
}

// ─── HELPERS DE IMPUTACIÓN ─────────────────────────────────────────────────────

/**
 * Imputa coste alimentación de una ración. La ración se asume estable
 * durante `daysApplied` (mientras no haya una nueva ración del mismo
 * animal). El precio sale del catálogo `Feed.costPerKgFresh`.
 *
 *   coste = Σ (amountFreshKg × costPerKgFresh × daysApplied)
 */
export function imputeRationCost(args: {
    items: Array<{ amountFreshKg: number; costPerKgFresh: number }>;
    daysApplied: number;
}): number {
    const daily = args.items.reduce(
        (acc, it) => acc + it.amountFreshKg * (it.costPerKgFresh ?? 0),
        0,
    );
    return daily * Math.max(0, args.daysApplied);
}

/**
 * Amortización biológica del vientre (vaca de cría) prorrateada al
 * periodo evaluado.
 *
 *   anual = (precioCompra − precioDesvieje) / vidaUtilAnios
 *   periodo = anual × (periodDays / 365) × nVacas
 *
 * Si faltan datos, usa los valores de referencia para vacuno carne
 * extensivo español (orientativos):
 *   - precioCompra default = 1400 € (novilla preñada)
 *   - precioDesvieje default = 800 € (vaca al matadero)
 *   - vidaUtilAnios default = 8
 */
export function imputeBreedingDepreciation(args: {
    nVacas: number;
    periodDays: number;
    precioCompra?: number;
    precioDesvieje?: number;
    vidaUtilAnios?: number;
}): number {
    const compra = args.precioCompra ?? 1400;
    const desvieje = args.precioDesvieje ?? 800;
    const vida = Math.max(1, args.vidaUtilAnios ?? 8);
    const anual = Math.max(0, compra - desvieje) / vida;
    return anual * args.nVacas * (args.periodDays / 365);
}
