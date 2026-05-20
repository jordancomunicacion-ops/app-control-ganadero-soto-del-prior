'use server';

import { prisma } from '@/lib/prisma';
import {
    requireEffectiveUserId,
    assertFarmOwnership,
} from '@/lib/server-utils';
import {
    computeForageBalance,
    categoryToDmi,
    DEFAULT_DMI,
    type ForageBalanceResult,
    type HerdGroup,
    type RotationInput,
} from '@/services/forageBalanceEngine';

/**
 * Server actions del Calendario forrajero.
 *
 * El balance se calcula:
 *   1) Recogiendo las `CropRotation` activas de TODAS las parcelas de la
 *      finca principal Y sus fincas asociadas (parentFarmId apuntando a
 *      ella). Esto refleja la realidad: una finca ganadera puede tener
 *      parcelas dentro y parcelas en fincas separadas que la abastecen.
 *   2) Construyendo grupos de demanda a partir de los animales activos
 *      del rebaño, clasificados por categoría.
 *   3) Llamando al motor `computeForageBalance`.
 *
 * No persistimos el resultado — siempre se recalcula al consultarlo.
 * Es rápido (motor puro, ~12 meses × decenas de parcelas).
 */

export interface ForageDashboard {
    farmId: string;
    farmName: string;
    horizonMonths: number;
    rotations: number;
    parcelasInternas: number;
    parcelasAsociadas: number;
    headcount: number;
    balance: ForageBalanceResult;
}

export async function getForageDashboard(
    farmId: string,
    options?: { monthsAhead?: number; startDate?: string },
): Promise<ForageDashboard> {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(farmId, effectiveUserId, callerRole);

    const farm = await prisma.farm.findUnique({
        where: { id: farmId },
        select: { id: true, name: true },
    });
    if (!farm) throw new Error('Finca no encontrada');

    // IDs de fincas asociadas (parentFarmId apuntando a la principal).
    const associated = await prisma.farm.findMany({
        where: { parentFarmId: farmId },
        select: { id: true },
    });
    const allFarmIds = [farmId, ...associated.map((a) => a.id)];

    // Rotaciones activas: las que tienen sowDate dentro del último año
    // o harvestDate futura, en parcelas de cualquier finca del conjunto.
    const horizonStart = options?.startDate
        ? new Date(options.startDate)
        : new Date();
    const horizonEnd = new Date(
        horizonStart.getTime() + (options?.monthsAhead ?? 12) * 30 * 86_400_000,
    );

    const prismaRotations = await prisma.cropRotation.findMany({
        where: {
            plot: { farmId: { in: allFarmIds } },
            OR: [
                { harvestDate: null },
                { harvestDate: { gte: horizonStart } },
            ],
            sowDate: { lte: horizonEnd },
        },
        include: {
            plot: {
                select: { id: true, surfaceHa: true, farmId: true, name: true },
            },
        },
    });

    const rotations: RotationInput[] = prismaRotations.map((r) => ({
        plotId: r.plot.id,
        plotSurfaceHa: r.plot.surfaceHa,
        cropName: r.cropName,
        cropFamily: r.cropFamily,
        sowDate: r.sowDate,
        harvestDate: r.harvestDate,
        expectedYieldT: r.expectedYieldT,
        destinationFor: r.destinationFor,
    }));

    // Demanda: animales activos en la finca principal.
    const inactiveStates = new Set([
        'sacrificado', 'muerto', 'vendido', 'baja', 'inactivo', 'retirado',
    ]);
    const animals = await prisma.animal.findMany({
        where: { farmId },
        select: { id: true, category: true, status: true, sex: true, birthDate: true },
    });
    const active = animals.filter(
        (a) => !a.status || !inactiveStates.has(a.status.toLowerCase()),
    );

    const groups = buildGroups(active);

    const balance = computeForageBalance(rotations, groups, {
        startDate: horizonStart,
        monthsAhead: options?.monthsAhead ?? 12,
    });

    const internas = prismaRotations.filter(
        (r) => r.plot.farmId === farmId,
    );
    const externas = prismaRotations.filter(
        (r) => r.plot.farmId !== farmId,
    );

    return {
        farmId,
        farmName: farm.name,
        horizonMonths: options?.monthsAhead ?? 12,
        rotations: prismaRotations.length,
        parcelasInternas: new Set(internas.map((r) => r.plot.id)).size,
        parcelasAsociadas: new Set(externas.map((r) => r.plot.id)).size,
        headcount: active.length,
        balance,
    };
}

/**
 * Agrupa animales activos en `HerdGroup`s para el motor. Si no hay
 * categoría poblada, deriva por edad/sexo igual que el dashboard.
 */
function buildGroups(
    animals: Array<{ category: string | null; sex: string; birthDate: Date }>,
): HerdGroup[] {
    const grouped = new Map<string, { dmi: number; count: number }>();
    const now = new Date();
    for (const a of animals) {
        let cat = a.category ?? null;
        if (!cat || cat === 'Sin Clasificar') {
            const months =
                (now.getTime() - a.birthDate.getTime()) /
                (1000 * 60 * 60 * 24 * 30.4375);
            if (a.sex === 'M') {
                if (months < 12) cat = 'Ternero';
                else if (months < 24) cat = 'Añojo';
                else cat = 'Toro';
            } else {
                if (months < 12) cat = 'Ternera';
                else if (months < 24) cat = 'Novilla';
                else cat = 'Vaca';
            }
        }
        const dmi = categoryToDmi(cat);
        const prev = grouped.get(cat) ?? { dmi, count: 0 };
        prev.count++;
        grouped.set(cat, prev);
    }
    return Array.from(grouped.entries()).map(([label, v]) => ({
        label,
        dmiKgPerDay: v.dmi,
        headcount: v.count,
    }));
}

// ─── INTEGRACIÓN CON ALERTAS ───────────────────────────────────────────────────

/**
 * Genera candidatos a alerta de tipo `forage_deficit` para la finca.
 * Se llama desde el cron del AlertEngine cuando la regla está activa.
 *
 * Devuelve solo los meses con cobertura < 0.85 (umbral por defecto;
 * ajustable en `AlertRule.paramsJson.minCoveragePct`).
 *
 * No persiste nada: solo devuelve la lista. La persistencia la hace el
 * orquestador genérico de alertas, igual que con las otras reglas.
 */
export async function buildForageDeficitAlerts(
    farmId: string,
    params: { minCoveragePct?: number } = {},
): Promise<Array<{
    farmId: string;
    type: 'forage_deficit';
    severity: 'warning' | 'critical';
    message: string;
    ruleCode: string;
    date: Date;
}>> {
    const dashboard = await getForageDashboard(farmId);
    const minCoverage = (params.minCoveragePct ?? 85) / 100;
    const now = new Date();
    const out: Array<{
        farmId: string;
        type: 'forage_deficit';
        severity: 'warning' | 'critical';
        message: string;
        ruleCode: string;
        date: Date;
    }> = [];
    for (const m of dashboard.balance.months) {
        if (m.demandKgDM === 0) continue;
        if (m.coverageRatio >= minCoverage) continue;
        out.push({
            farmId,
            type: 'forage_deficit',
            severity: m.coverageRatio < 0.6 ? 'critical' : 'warning',
            message: `Mes ${m.yearMonth}: cobertura forrajera ${(m.coverageRatio * 100).toFixed(0)} % (faltan ${(m.demandKgDM - m.productionKgDM).toFixed(0)} kg MS).`,
            ruleCode: `FORAGE_DEFICIT_${farmId}_${m.yearMonth}`,
            date: now,
        });
    }
    return out;
}

// ─── HELPER PARA UI ────────────────────────────────────────────────────────────

export async function listFarmsForForage(): Promise<Array<{
    id: string;
    name: string;
}>> {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    const farms = await prisma.farm.findMany({
        where:
            callerRole === 'ADMIN'
                ? { parentFarmId: null }
                : { userId: effectiveUserId, parentFarmId: null },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
    });
    return farms;
}

