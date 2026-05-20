'use server';

import { prisma } from '@/lib/prisma';
import {
    requireEffectiveUserId,
    assertFarmOwnership,
    assertAnimalOwnership,
} from '@/lib/server-utils';
import {
    computeCowIndividual,
    computeCowProductivity,
    defaultCowCosts,
    COW_DEFAULTS,
    type CowIndividualResult,
    type ProductivityResult,
    type SeuropPriceLookup,
} from '@/services/cowProductivityEngine';
import { PriceEngine } from '@/services/priceEngine';

/**
 * Server actions de productividad de la vaca nodriza.
 *
 * Hidrata el motor `cowProductivityEngine` con:
 *   - El historial de partos del animal (ManagementEvent type='parto').
 *   - Los pesos al destete del ternero (Weight con animalId del cría).
 *   - El lookup de precios SEUROP real (modelo `Price`, refrescado por
 *     cron semanal). Si la BD no tiene precio para un código concreto,
 *     cae a los `PriceEngine.defaultPrices` estáticos.
 */

// ─── HELPER COMÚN ──────────────────────────────────────────────────────────────

/**
 * Construye el lookup SEUROP combinando los precios reales de BD con los
 * defaults del PriceEngine. Si la BD no tiene un código, devuelve `undefined`
 * para que el motor caiga al siguiente nivel (clase, letra, fallback 500).
 */
async function buildSeuropLookup(): Promise<SeuropPriceLookup> {
    // Tomamos el precio más reciente por código.
    const rows = await prisma.price.findMany({
        orderBy: { createdAt: 'desc' },
        select: { code: true, pricePer100Kg: true },
    });
    const latest = new Map<string, number>();
    for (const r of rows) {
        if (!latest.has(r.code)) latest.set(r.code, r.pricePer100Kg);
    }
    return (code: string) => {
        if (latest.has(code)) return latest.get(code);
        // fallback a los defaults del PriceEngine
        return PriceEngine.defaultPrices[code];
    };
}

// ─── PRODUCTIVIDAD INDIVIDUAL DE UNA VACA ──────────────────────────────────────

export async function getCowProductivity(
    animalId: string,
): Promise<CowIndividualResult | { error: 'not_a_breeding_female' }> {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertAnimalOwnership(animalId, effectiveUserId, callerRole);

    const animal = await prisma.animal.findUnique({
        where: { id: animalId },
        select: { id: true, sex: true, birthDate: true, status: true },
    });
    if (!animal) throw new Error('Animal no encontrado');
    if (animal.sex !== 'H') {
        // No es hembra; este motor no aplica.
        return { error: 'not_a_breeding_female' };
    }

    // Historial de partos
    const partos = await prisma.managementEvent.findMany({
        where: { animalId, type: 'parto' },
        orderBy: { date: 'asc' },
        select: { date: true },
    });

    // Pesos al destete: terneros cuya madre es esta vaca y que tienen
    // pesos cerca de la fecha esperada de destete (~180 d post-parto).
    // Buscamos primero los terneros (motherId = este animal).
    const offspring = await prisma.animal.findMany({
        where: { motherId: animalId },
        select: { id: true, birthDate: true },
    });
    const offspringIds = offspring.map((o) => o.id);
    const weaningWeights: number[] = [];
    if (offspringIds.length > 0) {
        const weights = await prisma.weight.findMany({
            where: { animalId: { in: offspringIds } },
            select: { animalId: true, date: true, weightKg: true },
            orderBy: { date: 'asc' },
        });
        for (const ternero of offspring) {
            // Buscar el peso más cercano a 180 días de nacimiento (ventana ±30 días).
            const desiredDate = new Date(
                ternero.birthDate.getTime() + COW_DEFAULTS.weaningDays * 86_400_000,
            );
            const candidates = weights.filter((w) => w.animalId === ternero.id);
            if (candidates.length === 0) continue;
            const closest = candidates.reduce((best, w) => {
                const dist = Math.abs(w.date.getTime() - desiredDate.getTime());
                if (!best || dist < best.dist) return { weight: w.weightKg, dist };
                return best;
            }, null as { weight: number; dist: number } | null);
            if (closest && closest.dist < 60 * 86_400_000) {
                weaningWeights.push(closest.weight);
            }
        }
    }

    const seuropLookup = await buildSeuropLookup();
    return computeCowIndividual(
        {
            partosDates: partos.map((p) => p.date),
            weaningWeightsKg: weaningWeights.length > 0 ? weaningWeights : undefined,
        },
        {
            seuropLookup,
            costs: defaultCowCosts(),
        },
    );
}

// ─── PRODUCTIVIDAD MEDIA DE LA FINCA ───────────────────────────────────────────

export interface FarmProductivitySummary {
    farmId: string;
    breedingFemalesCount: number;
    /** Media de €/vaca/año al destete (bruto). */
    avgWeaningRevenueEur: number;
    /** Media de €/vaca/año al cebo (neto tras cebo). */
    avgSlaughterNetRevenueEur: number;
    /** Media de margen neto al destete (resta costes default). */
    avgNetWeaningEur: number;
    /** Media de margen neto al cebo. */
    avgNetSlaughterEur: number;
    /** Total agregado de la finca, escenario destete. */
    farmTotalWeaningEur: number;
    /** Total agregado de la finca, escenario cebo. */
    farmTotalSlaughterEur: number;
    /** Por vaca: top productividad. */
    topPerformers: Array<{ animalId: string; netAtWeaningEur: number }>;
    /** Por vaca: peor productividad. */
    bottomPerformers: Array<{ animalId: string; netAtWeaningEur: number }>;
}

export async function getFarmProductivitySummary(
    farmId: string,
): Promise<FarmProductivitySummary> {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(farmId, effectiveUserId, callerRole);

    const inactive = new Set([
        'sacrificado', 'muerto', 'vendido', 'baja', 'inactivo', 'retirado',
    ]);
    const animals = await prisma.animal.findMany({
        where: { farmId, sex: 'H' },
        select: { id: true, birthDate: true, status: true },
    });
    const activeFemales = animals.filter(
        (a) => !a.status || !inactive.has(a.status.toLowerCase()),
    );

    // Hembras reproductoras: ≥ 18 meses.
    const now = new Date();
    const adultas = activeFemales.filter((a) => {
        const months =
            (now.getTime() - a.birthDate.getTime()) /
            (1000 * 60 * 60 * 24 * 30.4375);
        return months >= 18;
    });

    if (adultas.length === 0) {
        return {
            farmId,
            breedingFemalesCount: 0,
            avgWeaningRevenueEur: 0,
            avgSlaughterNetRevenueEur: 0,
            avgNetWeaningEur: 0,
            avgNetSlaughterEur: 0,
            farmTotalWeaningEur: 0,
            farmTotalSlaughterEur: 0,
            topPerformers: [],
            bottomPerformers: [],
        };
    }

    const seuropLookup = await buildSeuropLookup();
    const costs = defaultCowCosts();

    // Cargamos en bloque eventos y descendencia para no hacer N+1.
    const adultaIds = adultas.map((a) => a.id);
    const [partos, offspring] = await Promise.all([
        prisma.managementEvent.findMany({
            where: { animalId: { in: adultaIds }, type: 'parto' },
            orderBy: { date: 'asc' },
            select: { animalId: true, date: true },
        }),
        prisma.animal.findMany({
            where: { motherId: { in: adultaIds } },
            select: { id: true, motherId: true, birthDate: true },
        }),
    ]);
    const partosByCow = new Map<string, Date[]>();
    for (const p of partos) {
        if (!p.animalId) continue;
        const list = partosByCow.get(p.animalId) ?? [];
        list.push(p.date);
        partosByCow.set(p.animalId, list);
    }

    const offspringIds = offspring.map((o) => o.id);
    const weights = offspringIds.length > 0
        ? await prisma.weight.findMany({
              where: { animalId: { in: offspringIds } },
              select: { animalId: true, date: true, weightKg: true },
          })
        : [];

    const weightsByCalf = new Map<string, { date: Date; weightKg: number }[]>();
    for (const w of weights) {
        const list = weightsByCalf.get(w.animalId) ?? [];
        list.push({ date: w.date, weightKg: w.weightKg });
        weightsByCalf.set(w.animalId, list);
    }
    const offspringByMother = new Map<string, { id: string; birthDate: Date }[]>();
    for (const o of offspring) {
        if (!o.motherId) continue;
        const list = offspringByMother.get(o.motherId) ?? [];
        list.push({ id: o.id, birthDate: o.birthDate });
        offspringByMother.set(o.motherId, list);
    }

    const perCow: Array<{ animalId: string; result: CowIndividualResult }> = [];
    for (const adulta of adultas) {
        const partosDates = partosByCow.get(adulta.id) ?? [];
        const myOffspring = offspringByMother.get(adulta.id) ?? [];
        const weaningWeightsKg: number[] = [];
        for (const ternero of myOffspring) {
            const desiredDate = new Date(
                ternero.birthDate.getTime() + COW_DEFAULTS.weaningDays * 86_400_000,
            );
            const cand = weightsByCalf.get(ternero.id) ?? [];
            if (cand.length === 0) continue;
            const closest = cand.reduce(
                (best, w) => {
                    const dist = Math.abs(w.date.getTime() - desiredDate.getTime());
                    if (!best || dist < best.dist) return { weight: w.weightKg, dist };
                    return best;
                },
                null as { weight: number; dist: number } | null,
            );
            if (closest && closest.dist < 60 * 86_400_000) {
                weaningWeightsKg.push(closest.weight);
            }
        }

        const result = computeCowIndividual(
            {
                partosDates,
                weaningWeightsKg: weaningWeightsKg.length > 0 ? weaningWeightsKg : undefined,
            },
            { seuropLookup, costs },
        );
        perCow.push({ animalId: adulta.id, result });
    }

    const sumWeaning = perCow.reduce(
        (a, b) => a + b.result.atWeaning.grossRevenueEur,
        0,
    );
    const sumSlaughter = perCow.reduce(
        (a, b) => a + b.result.atSlaughter.netRevenueEur,
        0,
    );
    const sumNetW = perCow.reduce(
        (a, b) => a + (b.result.netAtWeaningEur ?? 0),
        0,
    );
    const sumNetS = perCow.reduce(
        (a, b) => a + (b.result.netAtSlaughterEur ?? 0),
        0,
    );

    const sortedByNetW = [...perCow].sort(
        (a, b) =>
            (b.result.netAtWeaningEur ?? 0) - (a.result.netAtWeaningEur ?? 0),
    );

    return {
        farmId,
        breedingFemalesCount: adultas.length,
        avgWeaningRevenueEur: sumWeaning / adultas.length,
        avgSlaughterNetRevenueEur: sumSlaughter / adultas.length,
        avgNetWeaningEur: sumNetW / adultas.length,
        avgNetSlaughterEur: sumNetS / adultas.length,
        farmTotalWeaningEur: sumWeaning,
        farmTotalSlaughterEur: sumSlaughter,
        topPerformers: sortedByNetW.slice(0, 5).map((p) => ({
            animalId: p.animalId,
            netAtWeaningEur: p.result.netAtWeaningEur ?? 0,
        })),
        bottomPerformers: sortedByNetW.slice(-5).reverse().map((p) => ({
            animalId: p.animalId,
            netAtWeaningEur: p.result.netAtWeaningEur ?? 0,
        })),
    };
}

// ─── PRODUCTIVIDAD «GENÉRICA» PARA SIMULACIÓN ──────────────────────────────────

/**
 * Calcula la productividad para los parámetros indicados, sin asociar a
 * un animal concreto. Lo usa el SimulationManager para mover palancas.
 */
export async function simulateCowProductivity(input: {
    iepDays?: number;
    weaningRate?: number;
    weaningWeightKg?: number;
    weaningPricePerKg?: number;
    fatteningCostEur?: number;
}): Promise<ProductivityResult> {
    await requireEffectiveUserId();
    const seuropLookup = await buildSeuropLookup();
    return computeCowProductivity({
        input: {
            iepDays: input.iepDays,
            weaningRate: input.weaningRate,
            weaningWeightKg: input.weaningWeightKg,
            weaningPricePerKg: input.weaningPricePerKg,
        },
        slaughter: {
            fatteningCostEur: input.fatteningCostEur,
        },
        seuropLookup,
        costs: defaultCowCosts(),
    });
}
