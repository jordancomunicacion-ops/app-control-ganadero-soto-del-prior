/**
 * KPIEngine — KPIs ejecutivos para el dashboard con semáforo rojo/ámbar/verde.
 *
 * Funciones puras (sin acceso a BD). Reciben los datos preagregados desde
 * el server action correspondiente y devuelven un array de `KPI` listo para
 * pintar en el `KPIScoreboard`.
 *
 * Todos los umbrales se basan en referencias de campo para vacuno carne
 * extensivo español/Mediterráneo. Se exponen como constantes editables
 * para que el ganadero pueda ajustarlos en el futuro.
 */

import { intensitySemaphore } from './emissionEngine';

export type KPIStatus = 'verde' | 'ambar' | 'rojo' | 'sin_dato';
export type KPIDirection = 'higher_better' | 'lower_better';

export interface KPI {
    /** Clave estable para mapear en UI / navegar al drill-down. */
    id: string;
    /** Texto humano corto (≤20 chars). */
    label: string;
    /** Valor numérico ya formateado a string para mostrar (incluye unidad). */
    valueText: string;
    /** Valor crudo (sin formato) — útil para drill-down. */
    rawValue: number | null;
    /** Estado de semáforo. */
    status: KPIStatus;
    /** Sentido: si más alto es mejor o más bajo es mejor (para flecha UI). */
    direction: KPIDirection;
    /** Sección a la que enlaza el drill-down ('animals', 'reports'…). */
    drilldownTab?: string;
    /** Frase corta explicando por qué el KPI tiene ese estado. */
    hint?: string;
}

// ─── UMBRALES POR DEFECTO ──────────────────────────────────────────────────────

export const KPI_THRESHOLDS = {
    /** GMD vacuno carne extensivo: verde ≥ 0.9 kg/día, ámbar ≥ 0.6, rojo < 0.6. */
    gmd: { verde: 0.9, ambar: 0.6 },
    /** Mortalidad anual %: verde ≤ 3 %, ámbar ≤ 5 %, rojo > 5 %. */
    mortalidad: { verde: 3, ambar: 5 },
    /** Intervalo entre partos (días): verde ≤ 380, ámbar ≤ 420, rojo > 420. */
    iep: { verde: 380, ambar: 420 },
    /**
     * Edad primer parto (meses): verde ≤ 30, ámbar ≤ 36, rojo > 36.
     * Razas extensivas tradicionales españolas (Pirenaica, Avileña) pueden
     * llegar a 34-36 meses sin que sea alarmante; el umbral está calibrado
     * para favorecer la mejora reproductiva sin penalizar el extensivo puro.
     */
    edadPrimerParto: { verde: 30, ambar: 36 },
    /** €/kg canal: el semáforo aquí es contra precio de mercado (margen). */
    margenEuroKg: { verde: 1.5, ambar: 0.5 },
    /** Carga ganadera ratio (LU actual / soportable). */
    carga: { verde: 1.0, ambar: 1.2 },
    /** Alertas activas: verde 0, ámbar ≤ 3, rojo > 3. */
    alertas: { verde: 0, ambar: 3 },
    /**
     * €/vaca/año (margen neto al destete tras costes anuales): verde ≥250 €,
     * ámbar ≥100 €, rojo <100 €. Referencias vacuno carne extensivo español.
     */
    productividadVaca: { verde: 250, ambar: 100 },
} as const;

// ─── HELPERS DE CLASIFICACIÓN ──────────────────────────────────────────────────

/**
 * Clasifica un valor numérico según umbrales y dirección (más alto/más bajo
 * es mejor). Devuelve 'sin_dato' si el valor es null/NaN.
 */
export function classify(
    value: number | null | undefined,
    thresholds: { verde: number; ambar: number },
    direction: KPIDirection,
): KPIStatus {
    if (value == null || Number.isNaN(value)) return 'sin_dato';
    if (direction === 'higher_better') {
        if (value >= thresholds.verde) return 'verde';
        if (value >= thresholds.ambar) return 'ambar';
        return 'rojo';
    }
    // lower_better
    if (value <= thresholds.verde) return 'verde';
    if (value <= thresholds.ambar) return 'ambar';
    return 'rojo';
}

// ─── CÁLCULOS A PARTIR DE DATOS PREAGREGADOS ───────────────────────────────────
//
// Cada función recibe ya el "agregado" mínimo necesario; el server action
// se encarga de leer Prisma y construir estos snapshots. Esto mantiene el
// motor probable con datos sintéticos.

export interface KPIInputs {
    /** Cabezas activas (excluyendo bajas). */
    activeHeadcount: number;
    /** GMD medio del rebaño en el periodo analizado (kg/día). */
    gmdAverage: number | null;
    /** Mortalidad anual (%). Bajas en el último año / cabezas iniciales × 100. */
    mortalidadPct: number | null;
    /** Intervalo entre partos medio en días. */
    iepDias: number | null;
    /** Edad media al primer parto en meses. */
    edadPrimerPartoMeses: number | null;
    /** Intensidad de huella: kg CO₂eq por kg canal producido. */
    co2eqPorKgCanal: number | null;
    /**
     * Margen €/kg canal (precio SEUROP esperado − coste estimado por kg).
     * Si no se ha calculado todavía, pasar null.
     */
    margenEuroPorKgCanal: number | null;
    /** Carga ganadera ratio actual (LU / LU soportable). */
    cargaRatio: number | null;
    /** Nº de alertas activas en el rebaño. */
    alertasActivas: number;
    /**
     * Margen neto medio de la vaca nodriza al destete (€/vaca/año) calculado
     * con `cowProductivityEngine` y los costes default sectoriales. Null si
     * la finca no tiene hembras reproductoras (≥18 m).
     */
    productividadVacaEur: number | null;
}

/**
 * Construye el cuadro de mando completo desde los inputs. Es la única
 * función pública que necesita la UI.
 */
export function buildKPIBoard(inputs: KPIInputs): KPI[] {
    const fmtNumber = (n: number | null, digits = 2, unit = ''): string => {
        if (n == null || Number.isNaN(n)) return '—';
        return `${n.toFixed(digits)}${unit ? ` ${unit}` : ''}`;
    };

    return [
        // Headcount: no tiene semáforo, solo informativo.
        {
            id: 'headcount',
            label: 'Cabezas activas',
            valueText: String(inputs.activeHeadcount),
            rawValue: inputs.activeHeadcount,
            status: inputs.activeHeadcount > 0 ? 'verde' : 'sin_dato',
            direction: 'higher_better',
            drilldownTab: 'animals',
            hint: 'Animales no dados de baja, vendidos ni sacrificados.',
        },
        {
            id: 'gmd',
            label: 'GMD medio',
            valueText: fmtNumber(inputs.gmdAverage, 2, 'kg/día'),
            rawValue: inputs.gmdAverage,
            status: classify(inputs.gmdAverage, KPI_THRESHOLDS.gmd, 'higher_better'),
            direction: 'higher_better',
            drilldownTab: 'reports',
            hint: 'Ganancia media diaria del rebaño en el último periodo con pesos.',
        },
        {
            id: 'mortalidad',
            label: 'Mortalidad anual',
            valueText: fmtNumber(inputs.mortalidadPct, 1, '%'),
            rawValue: inputs.mortalidadPct,
            status: classify(
                inputs.mortalidadPct,
                KPI_THRESHOLDS.mortalidad,
                'lower_better',
            ),
            direction: 'lower_better',
            drilldownTab: 'events',
            hint: 'Bajas en los últimos 365 días / cabezas medias.',
        },
        {
            id: 'iep',
            label: 'IEP medio',
            valueText: fmtNumber(inputs.iepDias, 0, 'días'),
            rawValue: inputs.iepDias,
            status: classify(inputs.iepDias, KPI_THRESHOLDS.iep, 'lower_better'),
            direction: 'lower_better',
            drilldownTab: 'reports',
            hint: 'Intervalo entre partos. Ideal < 380 días en vacuno carne.',
        },
        {
            id: 'edad_primer_parto',
            label: '1.er parto',
            valueText: fmtNumber(inputs.edadPrimerPartoMeses, 1, 'meses'),
            rawValue: inputs.edadPrimerPartoMeses,
            status: classify(
                inputs.edadPrimerPartoMeses,
                KPI_THRESHOLDS.edadPrimerParto,
                'lower_better',
            ),
            direction: 'lower_better',
            drilldownTab: 'reports',
            hint: 'Edad media de las hembras al primer parto.',
        },
        {
            id: 'huella_carbono',
            label: 'Huella canal',
            valueText: fmtNumber(inputs.co2eqPorKgCanal, 1, 'kg CO₂eq/kg'),
            rawValue: inputs.co2eqPorKgCanal,
            status:
                inputs.co2eqPorKgCanal == null
                    ? 'sin_dato'
                    : intensitySemaphore(inputs.co2eqPorKgCanal),
            direction: 'lower_better',
            drilldownTab: 'reports',
            hint: 'Intensidad de emisión IPCC 2019 — Tier 1 o 2 según datos disponibles.',
        },
        {
            id: 'margen_canal',
            label: 'Margen canal',
            valueText: fmtNumber(inputs.margenEuroPorKgCanal, 2, '€/kg'),
            rawValue: inputs.margenEuroPorKgCanal,
            status: classify(
                inputs.margenEuroPorKgCanal,
                KPI_THRESHOLDS.margenEuroKg,
                'higher_better',
            ),
            direction: 'higher_better',
            drilldownTab: 'reports',
            hint: 'Precio SEUROP estimado − coste de producción estimado por kg canal.',
        },
        {
            id: 'carga',
            label: 'Carga ganadera',
            valueText:
                inputs.cargaRatio == null
                    ? '—'
                    : `${(inputs.cargaRatio * 100).toFixed(0)} %`,
            rawValue: inputs.cargaRatio,
            status: classify(inputs.cargaRatio, KPI_THRESHOLDS.carga, 'lower_better'),
            direction: 'lower_better',
            drilldownTab: 'farms',
            hint: 'LU actual / LU soportable. Modelo Pulido 2014 + suelo + clima.',
        },
        {
            id: 'alertas',
            label: 'Alertas activas',
            valueText: String(inputs.alertasActivas),
            rawValue: inputs.alertasActivas,
            status: classify(
                inputs.alertasActivas,
                KPI_THRESHOLDS.alertas,
                'lower_better',
            ),
            direction: 'lower_better',
            drilldownTab: 'events',
            hint: 'Alertas no resueltas generadas por el motor de reglas.',
        },
        {
            id: 'productividad_vaca',
            label: '€/vaca/año',
            valueText: fmtNumber(inputs.productividadVacaEur, 0, '€'),
            rawValue: inputs.productividadVacaEur,
            status: classify(
                inputs.productividadVacaEur,
                KPI_THRESHOLDS.productividadVaca,
                'higher_better',
            ),
            direction: 'higher_better',
            drilldownTab: 'animals',
            hint: 'Margen neto medio de la vaca nodriza tras costes anuales y venta del ternero al destete.',
        },
    ];
}
