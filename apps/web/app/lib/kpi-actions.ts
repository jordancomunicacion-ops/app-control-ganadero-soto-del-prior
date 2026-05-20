'use server';

import { prisma } from '@/lib/prisma';
import { requireEffectiveUserId } from '@/lib/server-utils';
import { buildKPIBoard, type KPI, type KPIInputs } from '@/services/kpiEngine';
import {
    aggregateFarmEmissions,
    classifyAnimal,
    type EmissionGroup,
} from '@/services/emissionEngine';
import { estimateCarryingCapacity } from '@/services/soilEngine';
import { getFarmCosts } from './cost-actions';
import { getFarmProductivitySummary } from './productivity-actions';

/**
 * Calcula el cuadro de KPIs ejecutivos para todas las fincas del usuario
 * efectivo. Si `farmId` se aporta, restringe al ámbito de esa finca.
 *
 * El cómputo se hace en memoria sobre las entidades que ya tenemos
 * (Animal, Weight, ManagementEvent, Alert) más el motor de huella IPCC.
 * Los campos económicos (margen €/kg) quedan como `null` hasta el Sprint 3
 * cuando llegue el CostEngine; el motor de KPIs ya los renderiza con un
 * estado 'sin_dato' que no penaliza el semáforo.
 */
export async function getDashboardKPIs(farmId?: string): Promise<KPI[]> {
    const { effectiveUserId } = await requireEffectiveUserId();

    // Resolver fincas accesibles
    const farms = await prisma.farm.findMany({
        where: {
            userId: effectiveUserId,
            ...(farmId ? { id: farmId } : {}),
        },
        select: {
            id: true,
            superficie: true,
            soilId: true,
            climateStudy: true,
        },
    });
    const farmIds = farms.map((f) => f.id);
    if (farmIds.length === 0) return buildKPIBoard(emptyInputs());

    // Animales activos (estado normalizado).
    const inactiveStates = new Set([
        'sacrificado',
        'muerto',
        'vendido',
        'baja',
        'inactivo',
        'retirado',
    ]);

    const animals = await prisma.animal.findMany({
        where: { farmId: { in: farmIds } },
        select: {
            id: true,
            sex: true,
            birthDate: true,
            status: true,
            farmId: true,
            exitDate: true,
            deathReason: true,
            actualCarcassWeight: true,
        },
    });

    const activeAnimals = animals.filter(
        (a) => !a.status || !inactiveStates.has(a.status.toLowerCase()),
    );

    // ── Mortalidad anual % ────────────────────────────────────────────────────
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const recentDeaths = animals.filter(
        (a) =>
            a.status?.toLowerCase() === 'muerto' &&
            a.exitDate &&
            a.exitDate.getTime() >= oneYearAgo.getTime(),
    ).length;
    const baseHeadcount = Math.max(activeAnimals.length + recentDeaths, 1);
    const mortalidadPct = (recentDeaths / baseHeadcount) * 100;

    // ── GMD medio (kg/día) ────────────────────────────────────────────────────
    // Para evitar cargar todos los pesos, hacemos el cálculo a nivel SQL:
    // último peso vs primero por animal.
    const weights = await prisma.weight.findMany({
        where: { animalId: { in: activeAnimals.map((a) => a.id) } },
        select: { animalId: true, date: true, weightKg: true },
        orderBy: { date: 'asc' },
    });
    const byAnimal = new Map<string, typeof weights>();
    for (const w of weights) {
        if (!byAnimal.has(w.animalId)) byAnimal.set(w.animalId, []);
        byAnimal.get(w.animalId)!.push(w);
    }
    const gmdValues: number[] = [];
    byAnimal.forEach((list) => {
        if (list.length < 2) return;
        const first = list[0];
        const last = list[list.length - 1];
        const days =
            (last.date.getTime() - first.date.getTime()) / (1000 * 60 * 60 * 24);
        if (days < 14) return; // pocos días → ruidoso
        const gmd = (last.weightKg - first.weightKg) / days;
        if (Number.isFinite(gmd) && gmd > -2 && gmd < 5) gmdValues.push(gmd);
    });
    const gmdAverage = gmdValues.length
        ? gmdValues.reduce((a, b) => a + b, 0) / gmdValues.length
        : null;

    // ── IEP medio (intervalo entre partos en días) ───────────────────────────
    // ManagementEvent.type === 'parto' agrupado por animalId.
    const partos = await prisma.managementEvent.findMany({
        where: {
            farmId: { in: farmIds },
            type: 'parto',
            animalId: { in: activeAnimals.map((a) => a.id) },
        },
        select: { animalId: true, date: true },
        orderBy: { date: 'asc' },
    });
    const partosPorVaca = new Map<string, Date[]>();
    for (const p of partos) {
        if (!p.animalId) continue;
        if (!partosPorVaca.has(p.animalId)) partosPorVaca.set(p.animalId, []);
        partosPorVaca.get(p.animalId)!.push(p.date);
    }
    const ieps: number[] = [];
    partosPorVaca.forEach((list) => {
        for (let i = 1; i < list.length; i++) {
            const diff =
                (list[i].getTime() - list[i - 1].getTime()) /
                (1000 * 60 * 60 * 24);
            if (diff > 240 && diff < 1000) ieps.push(diff);
        }
    });
    const iepDias = ieps.length
        ? ieps.reduce((a, b) => a + b, 0) / ieps.length
        : null;

    // ── Edad primer parto (meses) ─────────────────────────────────────────────
    const primerasFechas: number[] = [];
    partosPorVaca.forEach((fechas, animalId) => {
        const animal = activeAnimals.find((a) => a.id === animalId);
        if (!animal) return;
        const primero = fechas[0];
        const meses =
            (primero.getTime() - animal.birthDate.getTime()) /
            (1000 * 60 * 60 * 24 * 30.4375);
        if (meses > 18 && meses < 60) primerasFechas.push(meses);
    });
    const edadPrimerPartoMeses = primerasFechas.length
        ? primerasFechas.reduce((a, b) => a + b, 0) / primerasFechas.length
        : null;

    // ── Huella de carbono (kg CO2eq / kg canal) ──────────────────────────────
    const refDate = new Date();
    const byGroup = new Map<EmissionGroup, number>();
    for (const a of activeAnimals) {
        const g = classifyAnimal({
            sex: a.sex,
            birthDate: a.birthDate,
            referenceDate: refDate,
        });
        byGroup.set(g, (byGroup.get(g) || 0) + 1);
    }
    // Producción de canal en el último año
    const carcassKgLastYear = animals
        .filter(
            (a) =>
                a.actualCarcassWeight &&
                a.exitDate &&
                a.exitDate.getTime() >= oneYearAgo.getTime(),
        )
        .reduce((acc, a) => acc + (a.actualCarcassWeight ?? 0), 0);

    let co2eqPorKgCanal: number | null = null;
    if (byGroup.size > 0) {
        const groups = Array.from(byGroup.entries()).map(([group, headcount]) => ({
            group,
            headcount,
            periodDays: 365,
            fracPasture: 1,
        }));
        const { total } = aggregateFarmEmissions(groups, {
            carcassKg: carcassKgLastYear > 0 ? carcassKgLastYear : undefined,
        });
        co2eqPorKgCanal = total.intensityPerKgCarcass ?? null;
    }

    // ── Carga ganadera ratio ─────────────────────────────────────────────────
    let cargaRatio: number | null = null;
    {
        let totalCurrentLU = 0;
        let totalSupportableLU = 0;
        for (const f of farms) {
            const haUtil = f.superficie ? f.superficie / 10000 : 0; // m² → ha
            if (haUtil <= 0) continue;
            const climateStudy = f.climateStudy
                ? safeJSONParse<{ annualPrecip?: number }>(f.climateStudy)
                : null;
            const annualPrecip = climateStudy?.annualPrecip ?? 500;
            const cap = f.soilId
                ? estimateCarryingCapacity(f.soilId, annualPrecip, 30).lu_per_ha
                : 0.4;
            const supportable = cap * haUtil;
            const currentLU = activeAnimals.filter((a) => a.farmId === f.id).length;
            totalCurrentLU += currentLU;
            totalSupportableLU += supportable;
        }
        if (totalSupportableLU > 0) {
            cargaRatio = totalCurrentLU / totalSupportableLU;
        }
    }

    // ── Alertas activas ──────────────────────────────────────────────────────
    const alertasActivas = await prisma.alert.count({
        where: {
            resolvedAt: null,
            animal: { farmId: { in: farmIds } },
        },
    });

    // ── Margen €/kg canal (CostEngine — Sprint 3) ───────────────────────────
    //
    // Iteramos por finca y agregamos margen ponderado por kg canal. Si
    // no hay producción, el margen queda en null (estado 'sin_dato').
    let margenEuroPorKgCanal: number | null = null;
    {
        let weightedMargin = 0;
        let totalCarcass = 0;
        for (const fId of farmIds) {
            try {
                const cb = await getFarmCosts(fId);
                if (
                    cb.result.marginPerKgCarcass != null &&
                    cb.inputs.carcassKg > 0
                ) {
                    weightedMargin +=
                        cb.result.marginPerKgCarcass * cb.inputs.carcassKg;
                    totalCarcass += cb.inputs.carcassKg;
                }
            } catch {
                /* ignorar finca sin datos */
            }
        }
        if (totalCarcass > 0) {
            margenEuroPorKgCanal = weightedMargin / totalCarcass;
        }
    }

    // ── Productividad media por vaca nodriza (€/vaca/año al destete) ──────────
    //
    // Sumamos los márgenes netos de cada finca pesados por su número de
    // hembras reproductoras. Si la finca aún no tiene hembras adultas, queda null.
    let productividadVacaEur: number | null = null;
    {
        let weightedNet = 0;
        let totalCows = 0;
        for (const fId of farmIds) {
            try {
                const p = await getFarmProductivitySummary(fId);
                if (p.breedingFemalesCount > 0) {
                    weightedNet +=
                        p.avgNetWeaningEur * p.breedingFemalesCount;
                    totalCows += p.breedingFemalesCount;
                }
            } catch {
                /* finca sin acceso o sin datos */
            }
        }
        if (totalCows > 0) {
            productividadVacaEur = weightedNet / totalCows;
        }
    }

    const inputs: KPIInputs = {
        activeHeadcount: activeAnimals.length,
        gmdAverage,
        mortalidadPct,
        iepDias,
        edadPrimerPartoMeses,
        co2eqPorKgCanal,
        margenEuroPorKgCanal,
        cargaRatio,
        alertasActivas,
        productividadVacaEur,
    };

    return buildKPIBoard(inputs);
}

function emptyInputs(): KPIInputs {
    return {
        activeHeadcount: 0,
        gmdAverage: null,
        mortalidadPct: null,
        iepDias: null,
        edadPrimerPartoMeses: null,
        co2eqPorKgCanal: null,
        margenEuroPorKgCanal: null,
        cargaRatio: null,
        alertasActivas: 0,
        productividadVacaEur: null,
    };
}

function safeJSONParse<T>(raw: string): T | null {
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}
