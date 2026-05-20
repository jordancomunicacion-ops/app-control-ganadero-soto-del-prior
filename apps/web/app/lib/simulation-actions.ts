'use server';

import { prisma } from '@/lib/prisma';
import {
    requireEffectiveUserId,
    assertFarmOwnership,
} from '@/lib/server-utils';
import { revalidatePath } from 'next/cache';
import {
    runScenario,
    sensitivityAnalysis,
    tornadoChart,
    type ScenarioBaseline,
    type ScenarioDeltas,
    type ScenarioResult,
} from '@/services/simulationEngine';
import { getFarmCosts } from './cost-actions';

/**
 * Server actions del módulo "¿qué pasaría si?".
 *
 * El baseline se construye combinando:
 *   - `getFarmCosts` (Sprint 3.1) para todos los costes y producción.
 *   - Datos del rebaño (ManagementEvent partos, Weight, mortalidad de
 *     animales con status='muerto') para IEP, GMD y mortalidad.
 *
 * Las simulaciones se persisten en el modelo `Simulation` ya definido
 * en Sprint 0, guardando baseline + scenario + result como JSON.
 */

export async function getFarmBaseline(farmId: string): Promise<ScenarioBaseline> {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(farmId, effectiveUserId, callerRole);

    const cost = await getFarmCosts(farmId);

    // GMD medio del rebaño (mismo cálculo que kpi-actions, simplificado).
    const animals = await prisma.animal.findMany({
        where: { farmId },
        select: { id: true, status: true, sex: true, birthDate: true, exitDate: true },
    });
    const inactive = new Set(['sacrificado', 'muerto', 'vendido', 'baja', 'inactivo', 'retirado']);
    const activeIds = animals
        .filter((a) => !a.status || !inactive.has(a.status.toLowerCase()))
        .map((a) => a.id);

    const weights = await prisma.weight.findMany({
        where: { animalId: { in: activeIds } },
        orderBy: { date: 'asc' },
        select: { animalId: true, date: true, weightKg: true },
    });
    const byAnimal = new Map<string, typeof weights>();
    for (const w of weights) {
        const list = byAnimal.get(w.animalId) ?? [];
        list.push(w);
        byAnimal.set(w.animalId, list);
    }
    const gmdValues: number[] = [];
    byAnimal.forEach((list) => {
        if (list.length < 2) return;
        const first = list[0];
        const last = list[list.length - 1];
        const days = (last.date.getTime() - first.date.getTime()) / 86_400_000;
        if (days < 14) return;
        const gmd = (last.weightKg - first.weightKg) / days;
        if (Number.isFinite(gmd) && gmd > -2 && gmd < 5) gmdValues.push(gmd);
    });
    const gmd = gmdValues.length
        ? gmdValues.reduce((a, b) => a + b, 0) / gmdValues.length
        : 0.9; // default conservador extensivo

    // IEP medio
    const partos = await prisma.managementEvent.findMany({
        where: { farmId, type: 'parto', animalId: { in: activeIds } },
        orderBy: { date: 'asc' },
        select: { animalId: true, date: true },
    });
    const partosByAnimal = new Map<string, Date[]>();
    for (const p of partos) {
        if (!p.animalId) continue;
        const list = partosByAnimal.get(p.animalId) ?? [];
        list.push(p.date);
        partosByAnimal.set(p.animalId, list);
    }
    const ieps: number[] = [];
    partosByAnimal.forEach((list) => {
        for (let i = 1; i < list.length; i++) {
            const diff =
                (list[i].getTime() - list[i - 1].getTime()) / 86_400_000;
            if (diff > 240 && diff < 1000) ieps.push(diff);
        }
    });
    const iepDias = ieps.length
        ? ieps.reduce((a, b) => a + b, 0) / ieps.length
        : 380;

    // Mortalidad anual
    const oneYearAgo = new Date(Date.now() - 365 * 86_400_000);
    const deaths = animals.filter(
        (a) =>
            a.status?.toLowerCase() === 'muerto' &&
            a.exitDate &&
            a.exitDate >= oneYearAgo,
    ).length;
    const totalForMort = Math.max(activeIds.length + deaths, 1);
    const mortalidadPct = (deaths / totalForMort) * 100;

    // Coste por categoría desde la salida del CostEngine
    const c = cost.result.byCategory;

    return {
        averageHeadcount: cost.inputs.averageHeadcount,
        expectedCarcassKg: cost.inputs.carcassKg || 0,
        priceSeurop: cost.inputs.averageSeuropPricePerKgCarcass ?? 5.0,
        gmd,
        mortalidadPct,
        iepDias,
        costeAlimAnualEur: c.alimentacion,
        costeSanidadAnualEur: c.sanidad,
        costeManoObraAnualEur: c.mano_obra,
        otrosCostesAnualEur: c.amortizacion + c.servicios + c.otros,
    };
}

export interface ScenarioRun {
    baseline: ScenarioBaseline;
    baselineResult: ScenarioResult;
    scenario: ScenarioDeltas;
    scenarioResult: ScenarioResult;
    sensitivity: ReturnType<typeof sensitivityAnalysis>;
    tornado: ReturnType<typeof tornadoChart>;
}

export async function runScenarioForFarm(
    farmId: string,
    deltas: ScenarioDeltas,
): Promise<ScenarioRun> {
    const baseline = await getFarmBaseline(farmId);
    const baselineResult = runScenario(baseline);
    const scenarioResult = runScenario(baseline, deltas);
    const sensitivity = sensitivityAnalysis(baseline);
    const tornado = tornadoChart(baseline, 0.1);
    return { baseline, baselineResult, scenario: deltas, scenarioResult, sensitivity, tornado };
}

// ─── PERSISTENCIA ──────────────────────────────────────────────────────────────

export async function saveSimulation(input: {
    farmId: string;
    name: string;
    baseline: ScenarioBaseline;
    scenario: ScenarioDeltas;
    result: ScenarioResult;
    notes?: string;
}) {
    const { callerId, effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(input.farmId, effectiveUserId, callerRole);

    const sim = await prisma.simulation.create({
        data: {
            farmId: input.farmId,
            createdBy: callerId,
            name: input.name,
            baselineJson: JSON.stringify(input.baseline),
            scenarioJson: JSON.stringify(input.scenario),
            resultJson: JSON.stringify(input.result),
            notes: input.notes,
        },
    });
    revalidatePath('/dashboard');
    return sim;
}

export async function listSimulations(farmId: string) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(farmId, effectiveUserId, callerRole);
    return prisma.simulation.findMany({
        where: { farmId },
        orderBy: { createdAt: 'desc' },
        take: 50,
    });
}

export async function deleteSimulation(id: string) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    const sim = await prisma.simulation.findUnique({
        where: { id },
        select: { farmId: true },
    });
    if (!sim) throw new Error('Simulación no encontrada');
    await assertFarmOwnership(sim.farmId, effectiveUserId, callerRole);
    await prisma.simulation.delete({ where: { id } });
    revalidatePath('/dashboard');
}
