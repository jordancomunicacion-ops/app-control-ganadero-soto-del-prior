/**
 * ForageBalanceEngine — Balance forrajero mensual.
 *
 * Cruza dos fuentes de información que ya existen en la app:
 *
 *   - **Producción esperada**: `CropRotation.expectedYieldT` ×
 *     parcelas activas en cada mes (entre `sowDate` y `harvestDate`).
 *     Solo cuentan rotaciones cuyo `destinationFor` es consumible por
 *     el ganado: pastoreo directo, henificación, ensilado o grano propio.
 *
 *   - **Demanda del rebaño**: Σ (DMI medio por categoría × cabezas
 *     activas × 30 días). Asume DMI estable durante el mes.
 *
 * Devuelve, para cada mes:
 *   - Producción acumulada en kg materia seca (MS).
 *   - Demanda en kg MS.
 *   - Balance (producción − demanda).
 *   - Cobertura (producción / demanda).
 *   - Estado verde/ámbar/rojo.
 *
 * Y recomendaciones cuantitativas cuando hay déficit:
 *   - Hectáreas adicionales necesarias del cultivo más rentable.
 *   - Volumen aproximado de compra externa en kg MS.
 *
 * El motor es puro — los server actions extraen rotaciones y raciones
 * de Prisma y se las pasan ya agregadas.
 */

// ─── TIPOS ─────────────────────────────────────────────────────────────────────

/** Rotación simplificada del schema (lo que el motor necesita). */
export interface RotationInput {
    plotId: string;
    plotSurfaceHa: number;
    cropName: string;
    cropFamily?: string | null;
    sowDate: Date;
    harvestDate: Date | null;
    /** Producción total esperada en toneladas (de toda la parcela). */
    expectedYieldT: number | null;
    destinationFor: string | null;
}

/** Categoría animal con su DMI medio (kg MS/día) y cabezas. */
export interface HerdGroup {
    label: string;
    dmiKgPerDay: number;
    headcount: number;
}

export type BalanceStatus = 'excedente' | 'verde' | 'ambar' | 'rojo' | 'sin_dato';

export interface MonthBalance {
    /** Year-month en formato `YYYY-MM`. */
    yearMonth: string;
    productionKgDM: number;
    demandKgDM: number;
    balanceKgDM: number;
    /** Producción / demanda; >1 = excedente. */
    coverageRatio: number;
    status: BalanceStatus;
    /** Rotaciones activas en el mes. */
    activeRotations: Array<{
        plotId: string;
        cropName: string;
        contributedKgDM: number;
    }>;
}

export interface BalanceRecommendation {
    /** Mes objetivo. */
    yearMonth: string;
    /** Déficit en kg MS. */
    deficitKgDM: number;
    /** Sugerencia: hectáreas extra del cultivo principal. */
    suggestedHaExtra: number | null;
    /** Cultivo recomendado para esas hectáreas. */
    suggestedCrop?: string;
    /** Alternativa: compra externa (kg MS). */
    suggestedPurchaseKgDM: number;
}

export interface ForageBalanceResult {
    months: MonthBalance[];
    annualProductionKgDM: number;
    annualDemandKgDM: number;
    annualCoverage: number;
    deficitMonths: number;
    excessMonths: number;
    recommendations: BalanceRecommendation[];
}

// ─── CONSTANTES (referencias técnicas) ─────────────────────────────────────────

/**
 * Fracción de materia seca por destino. Aproximaciones operativas:
 *   - pastoreo_directo: 25 % MS (pasto fresco ~20-30 %).
 *   - henificacion: 85 % MS (heno seco).
 *   - ensilado: 35 % MS (silo húmedo).
 *   - grano: 88 % MS.
 *   - mejora_suelo / venta: 0 (no consume el ganado).
 */
const DM_FRACTION: Record<string, number> = {
    pastoreo_directo: 0.25,
    henificacion: 0.85,
    ensilado: 0.35,
    grano: 0.88,
    consumo_animal: 0.5,
    mejora_suelo: 0,
    venta: 0,
};

/** DMI por categoría de vacuno carne (kg MS/día). Valores operativos típicos. */
export const DEFAULT_DMI: Record<string, number> = {
    vaca_seca: 12,
    vaca_lactante: 14,
    toro: 14,
    novilla: 10,
    ternero: 5,
    becerro: 3,
};

/** Días por mes (aproximación para cómputo mensual constante). */
const DAYS_PER_MONTH = 30;

// ─── CÁLCULO PRINCIPAL ─────────────────────────────────────────────────────────

/**
 * Calcula el balance forrajero mes a mes para un horizonte de 12 meses
 * a partir de `startDate`. Por defecto, los próximos 12 meses desde hoy.
 */
export function computeForageBalance(
    rotations: RotationInput[],
    groups: HerdGroup[],
    options: { startDate?: Date; monthsAhead?: number } = {},
): ForageBalanceResult {
    const startDate = options.startDate ?? firstOfMonth(new Date());
    const monthsAhead = options.monthsAhead ?? 12;

    // Demanda mensual constante (cabezas y DMI no varían).
    const dailyDemand = groups.reduce(
        (acc, g) => acc + g.dmiKgPerDay * g.headcount,
        0,
    );
    const monthlyDemand = dailyDemand * DAYS_PER_MONTH;

    const months: MonthBalance[] = [];

    for (let i = 0; i < monthsAhead; i++) {
        const monthStart = addMonths(startDate, i);
        const monthEnd = addMonths(monthStart, 1);
        const yearMonth = `${monthStart.getFullYear()}-${pad2(monthStart.getMonth() + 1)}`;

        let productionKgDM = 0;
        const active: MonthBalance['activeRotations'] = [];

        for (const rot of rotations) {
            // Una rotación contribuye a un mes si parte de ese mes cae
            // dentro del intervalo de cultivo.
            const harvest = rot.harvestDate ?? endOfNextYear(rot.sowDate);
            if (harvest <= monthStart) continue; // ya cosechó antes
            if (rot.sowDate >= monthEnd) continue; // aún no sembrado

            // El rendimiento esperado se reparte entre los meses que
            // dura la rotación activa, proporcional al solape.
            const totalDays = Math.max(
                1,
                (harvest.getTime() - rot.sowDate.getTime()) / 86_400_000,
            );
            const overlapStart =
                rot.sowDate > monthStart ? rot.sowDate : monthStart;
            const overlapEnd = harvest < monthEnd ? harvest : monthEnd;
            const overlapDays = Math.max(
                0,
                (overlapEnd.getTime() - overlapStart.getTime()) / 86_400_000,
            );
            if (overlapDays <= 0) continue;

            const fraction = overlapDays / totalDays;
            const expectedTotalT = rot.expectedYieldT ?? 0;
            const dmFraction =
                DM_FRACTION[rot.destinationFor ?? 'consumo_animal'] ?? 0;
            // Convertimos toneladas frescas → kg MS reales aprovechables.
            const contributedKgDM = expectedTotalT * 1000 * dmFraction * fraction;

            if (contributedKgDM > 0) {
                productionKgDM += contributedKgDM;
                active.push({
                    plotId: rot.plotId,
                    cropName: rot.cropName,
                    contributedKgDM,
                });
            }
        }

        const balanceKgDM = productionKgDM - monthlyDemand;
        const coverageRatio = monthlyDemand > 0
            ? productionKgDM / monthlyDemand
            : (productionKgDM > 0 ? Infinity : 1);
        const status = classifyBalance(coverageRatio, monthlyDemand);

        months.push({
            yearMonth,
            productionKgDM,
            demandKgDM: monthlyDemand,
            balanceKgDM,
            coverageRatio,
            status,
            activeRotations: active,
        });
    }

    // Agregados anuales y recomendaciones.
    const annualProductionKgDM = months.reduce(
        (a, m) => a + m.productionKgDM,
        0,
    );
    const annualDemandKgDM = months.reduce((a, m) => a + m.demandKgDM, 0);
    const annualCoverage =
        annualDemandKgDM > 0
            ? annualProductionKgDM / annualDemandKgDM
            : 1;

    const deficitMonths = months.filter(
        (m) => m.status === 'rojo' || m.status === 'ambar',
    ).length;
    const excessMonths = months.filter((m) => m.status === 'excedente').length;

    const recommendations = buildRecommendations(months, rotations);

    return {
        months,
        annualProductionKgDM,
        annualDemandKgDM,
        annualCoverage,
        deficitMonths,
        excessMonths,
        recommendations,
    };
}

// ─── CLASIFICACIÓN ─────────────────────────────────────────────────────────────

function classifyBalance(coverage: number, demand: number): BalanceStatus {
    if (demand === 0) return 'sin_dato';
    if (coverage >= 1.5) return 'excedente';
    if (coverage >= 1.0) return 'verde';
    if (coverage >= 0.7) return 'ambar';
    return 'rojo';
}

// ─── RECOMENDACIONES ───────────────────────────────────────────────────────────

function buildRecommendations(
    months: MonthBalance[],
    rotations: RotationInput[],
): BalanceRecommendation[] {
    // Cultivo de referencia: el más usado en el plan (por superficie × yield).
    const cropByName = new Map<
        string,
        { totalT: number; ha: number; destination: string | null }
    >();
    for (const rot of rotations) {
        const prev = cropByName.get(rot.cropName) ?? {
            totalT: 0,
            ha: 0,
            destination: rot.destinationFor,
        };
        prev.totalT += rot.expectedYieldT ?? 0;
        prev.ha += rot.plotSurfaceHa;
        prev.destination = prev.destination ?? rot.destinationFor;
        cropByName.set(rot.cropName, prev);
    }
    let referenceCrop: { name: string; yieldKgDMperHa: number } | null = null;
    for (const [name, info] of cropByName.entries()) {
        if (info.ha === 0) continue;
        const dmFraction = DM_FRACTION[info.destination ?? 'consumo_animal'] ?? 0;
        const yieldKgDMperHa = (info.totalT * 1000 * dmFraction) / info.ha;
        if (
            !referenceCrop ||
            yieldKgDMperHa > referenceCrop.yieldKgDMperHa
        ) {
            referenceCrop = { name, yieldKgDMperHa };
        }
    }

    const recs: BalanceRecommendation[] = [];
    for (const m of months) {
        if (m.status !== 'rojo' && m.status !== 'ambar') continue;
        const deficitKgDM = Math.max(0, m.demandKgDM - m.productionKgDM);
        let suggestedHaExtra: number | null = null;
        if (referenceCrop && referenceCrop.yieldKgDMperHa > 0) {
            // Anualizamos: si el cultivo de referencia produce N kg/ha al año,
            // un mes necesita N/12 kg/ha. Para cubrir el déficit:
            const perHaPerMonth = referenceCrop.yieldKgDMperHa / 12;
            if (perHaPerMonth > 0) {
                suggestedHaExtra = deficitKgDM / perHaPerMonth;
            }
        }
        recs.push({
            yearMonth: m.yearMonth,
            deficitKgDM,
            suggestedHaExtra,
            suggestedCrop: referenceCrop?.name,
            suggestedPurchaseKgDM: deficitKgDM,
        });
    }
    return recs;
}

// ─── HELPERS DE FECHA ──────────────────────────────────────────────────────────

function firstOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number): Date {
    return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function pad2(n: number): string {
    return n < 10 ? `0${n}` : String(n);
}
function endOfNextYear(d: Date): Date {
    // Si la rotación no tiene harvestDate, se asume que termina al cabo
    // de un año natural desde la siembra.
    return new Date(d.getFullYear() + 1, d.getMonth(), d.getDate());
}

// ─── PARSER DE CATEGORÍAS A DMI ────────────────────────────────────────────────

/**
 * Mapeo heurístico de categorías heterogéneas que llegan del catálogo
 * (Vacas, Novillas, Terneros, Toros, etc.) al DMI por defecto. Útil para
 * el server action al construir los `HerdGroup`.
 */
export function categoryToDmi(category: string | null | undefined): number {
    if (!category) return DEFAULT_DMI.vaca_seca;
    const c = category.toLowerCase();
    if (c.includes('lact')) return DEFAULT_DMI.vaca_lactante;
    if (c.includes('toro')) return DEFAULT_DMI.toro;
    if (c.includes('novill') || c.includes('utrer')) return DEFAULT_DMI.novilla;
    if (c.includes('añoj') || c.includes('terner')) return DEFAULT_DMI.ternero;
    if (c.includes('becerr')) return DEFAULT_DMI.becerro;
    return DEFAULT_DMI.vaca_seca;
}
