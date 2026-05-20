/**
 * SimulationEngine — "¿qué pasaría si…?" sobre el cuadro económico.
 *
 * Recibe un `baseline` con las variables clave del negocio y un
 * `scenario` con deltas (%) sobre cada una. Devuelve el resultado y un
 * análisis de sensibilidad (tornado) que cuantifica la influencia de
 * cada variable cuando varía ±5/10/15/20 %.
 *
 * Variables soportadas en el baseline:
 *   - `priceSeurop`             € / kg canal
 *   - `gmd`                     kg / día
 *   - `mortalidadPct`           %
 *   - `iepDias`                 días entre partos
 *   - `costeAlimEurosKgMs`      coste medio de la ración por kg materia seca
 *   - `costeSanidadAnualEur`    coste sanitario anual
 *   - `costeManoObraAnualEur`   coste anual de personal
 *
 * Cada variable cae en una de dos familias:
 *   - "ingresos" (priceSeurop, gmd, iepDias, mortalidadPct)
 *   - "costes" (alimentación, sanidad, mano de obra)
 *
 * El motor es puro — no toca la BD.
 */

export interface ScenarioBaseline {
    /** Cabezas medias del rebaño. */
    averageHeadcount: number;
    /** Producción esperada de canal en kg/año a partir de los animales. */
    expectedCarcassKg: number;
    /** Precio SEUROP medio actual (€/kg canal). */
    priceSeurop: number;
    /** GMD medio actual (kg/día). */
    gmd: number;
    /** Mortalidad anual %. */
    mortalidadPct: number;
    /** Intervalo entre partos (días). */
    iepDias: number;
    /** Coste alimentación anual estimado en € (todo el rebaño). */
    costeAlimAnualEur: number;
    /** Coste sanidad anual € (todo el rebaño). */
    costeSanidadAnualEur: number;
    /** Coste mano de obra anual €. */
    costeManoObraAnualEur: number;
    /** Otros costes anuales fijos (servicios, amortizaciones…). */
    otrosCostesAnualEur: number;
}

/**
 * Cada delta es un multiplicador relativo. 0 = no cambio; +0.10 = +10 %;
 * -0.05 = -5 %. Para mortalidad subir significa MÁS bajas (peor); para
 * precio o GMD subir es mejor; para IEP subir es peor (más días entre
 * partos = menos terneros).
 */
export interface ScenarioDeltas {
    priceSeurop?: number;
    gmd?: number;
    mortalidadPct?: number;
    iepDias?: number;
    costeAlim?: number;
    costeSanidad?: number;
    costeManoObra?: number;
    otrosCostes?: number;
}

export interface ScenarioResult {
    /** kg canal estimados con los deltas aplicados. */
    carcassKg: number;
    /** Ingresos totales: carcassKg × precio. */
    ingresos: number;
    /** Coste total: alimentación + sanidad + mano obra + otros. */
    costeTotal: number;
    /** Ingresos − coste total. */
    margenTotal: number;
    /** Margen normalizado por kg canal. */
    margenPorKgCanal: number;
    /** Ingresos − coste alimentación (margen sobre alimento). */
    margenBrutoAlimentacion: number;
}

/**
 * Aplica los deltas al baseline y devuelve los resultados económicos.
 *
 * Modelo simplificado:
 *   - **Mortalidad**: reduce carcass directamente (1 - mortPct / 100).
 *   - **IEP**: a mayor IEP, menos partos por vaca y por tanto menos
 *     terneros. Proxy: factor = 365 / iep aplicado al carcassKg de cría.
 *     Como aquí trabajamos con `expectedCarcassKg` ya estimado a IEP
 *     base, ajustamos por la ratio (iepBase / iepNuevo).
 *   - **GMD**: subidas de GMD se traducen en mayor peso al sacrificio
 *     y por tanto en más kg canal — aplicamos misma proporción.
 *   - **Precio SEUROP** y **costes** entran directos.
 */
export function runScenario(
    baseline: ScenarioBaseline,
    deltas: ScenarioDeltas = {},
): ScenarioResult {
    const factor = (delta?: number) => 1 + (delta ?? 0);

    const priceSeurop = baseline.priceSeurop * factor(deltas.priceSeurop);
    const gmd = baseline.gmd * factor(deltas.gmd);
    const mortalidadPct = baseline.mortalidadPct * factor(deltas.mortalidadPct);
    const iepDias = baseline.iepDias * factor(deltas.iepDias);

    // Producción ajustada: efecto compuesto de GMD, mortalidad e IEP.
    const gmdFactor = baseline.gmd > 0 ? gmd / baseline.gmd : 1;
    const mortalityFactor =
        (1 - mortalidadPct / 100) / (1 - baseline.mortalidadPct / 100);
    const iepFactor = baseline.iepDias > 0 ? baseline.iepDias / iepDias : 1;
    const carcassKg =
        baseline.expectedCarcassKg * gmdFactor * mortalityFactor * iepFactor;

    const costeAlim = baseline.costeAlimAnualEur * factor(deltas.costeAlim);
    const costeSanidad =
        baseline.costeSanidadAnualEur * factor(deltas.costeSanidad);
    const costeManoObra =
        baseline.costeManoObraAnualEur * factor(deltas.costeManoObra);
    const otros = baseline.otrosCostesAnualEur * factor(deltas.otrosCostes);

    const costeTotal = costeAlim + costeSanidad + costeManoObra + otros;
    const ingresos = carcassKg * priceSeurop;
    const margenTotal = ingresos - costeTotal;
    const margenPorKgCanal = carcassKg > 0 ? margenTotal / carcassKg : 0;
    const margenBrutoAlimentacion = ingresos - costeAlim;

    return {
        carcassKg,
        ingresos,
        costeTotal,
        margenTotal,
        margenPorKgCanal,
        margenBrutoAlimentacion,
    };
}

// ─── ANÁLISIS DE SENSIBILIDAD (TORNADO) ────────────────────────────────────────

export type SensitivityLever = keyof ScenarioDeltas;

export const SENSITIVITY_LEVERS: Array<{
    key: SensitivityLever;
    label: string;
    direction: 'higher_better' | 'lower_better';
}> = [
    { key: 'priceSeurop', label: 'Precio SEUROP', direction: 'higher_better' },
    { key: 'gmd', label: 'GMD', direction: 'higher_better' },
    { key: 'iepDias', label: 'IEP', direction: 'lower_better' },
    { key: 'mortalidadPct', label: 'Mortalidad', direction: 'lower_better' },
    { key: 'costeAlim', label: 'Coste alimentación', direction: 'lower_better' },
    { key: 'costeSanidad', label: 'Coste sanidad', direction: 'lower_better' },
    { key: 'costeManoObra', label: 'Coste mano de obra', direction: 'lower_better' },
];

export interface SensitivityRow {
    lever: SensitivityLever;
    label: string;
    deltaPct: number;
    margenTotal: number;
    diffVsBaseline: number;
}

/**
 * Calcula el efecto de mover una palanca a ±N % manteniendo el resto en
 * baseline. Devuelve, para cada palanca y cada delta, el margen
 * resultante y la diferencia frente al baseline. Lo usa el tornado chart
 * del UI.
 */
export function sensitivityAnalysis(
    baseline: ScenarioBaseline,
    deltas: number[] = [-0.2, -0.15, -0.1, -0.05, 0.05, 0.1, 0.15, 0.2],
): { baseMargin: number; rows: SensitivityRow[] } {
    const baseResult = runScenario(baseline);
    const baseMargin = baseResult.margenTotal;
    const rows: SensitivityRow[] = [];
    for (const lever of SENSITIVITY_LEVERS) {
        for (const d of deltas) {
            const r = runScenario(baseline, { [lever.key]: d });
            rows.push({
                lever: lever.key,
                label: lever.label,
                deltaPct: d * 100,
                margenTotal: r.margenTotal,
                diffVsBaseline: r.margenTotal - baseMargin,
            });
        }
    }
    return { baseMargin, rows };
}

/**
 * Resumen "tornado": para cada palanca, calcula el rango entre la peor
 * y la mejor variación. Sirve para ordenar las palancas por influencia
 * económica y pintar barras horizontales en la UI.
 */
export interface TornadoRow {
    lever: SensitivityLever;
    label: string;
    rangeAbs: number; // |max - min|
    bestCase: number;
    worstCase: number;
}

export function tornadoChart(
    baseline: ScenarioBaseline,
    pct = 0.1,
): TornadoRow[] {
    const baseResult = runScenario(baseline);
    const baseMargin = baseResult.margenTotal;
    const rows: TornadoRow[] = [];
    for (const lever of SENSITIVITY_LEVERS) {
        const up = runScenario(baseline, { [lever.key]: pct }).margenTotal;
        const down = runScenario(baseline, { [lever.key]: -pct }).margenTotal;
        const bestCase =
            lever.direction === 'higher_better'
                ? up - baseMargin
                : down - baseMargin;
        const worstCase =
            lever.direction === 'higher_better'
                ? down - baseMargin
                : up - baseMargin;
        rows.push({
            lever: lever.key,
            label: lever.label,
            rangeAbs: Math.abs(bestCase - worstCase),
            bestCase,
            worstCase,
        });
    }
    return rows.sort((a, b) => b.rangeAbs - a.rangeAbs);
}
