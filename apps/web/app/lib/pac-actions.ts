'use server';

import { prisma } from '@/lib/prisma';
import {
    requireEffectiveUserId,
    assertFarmOwnership,
} from '@/lib/server-utils';
import { revalidatePath } from 'next/cache';
import { PACSchema } from './schemas';
import { isNurseCow } from '@/lib/animal-roles';

// =============================================================================
// PRECARGA DESDE EL ESTADO REAL DE LA FINCA
// =============================================================================
//
// Calcula los agregados que la PAC requiere a partir de las parcelas de
// cultivo declaradas (CropPlot) y los animales activos. Resultado útil para
// rellenar el formulario sin que el ganadero teclee a mano.

export interface FarmAggregates {
    totalEligibleHa: number;     // suma de superficies de plots + superficie ganadera estimada
    totalLU: number;             // animales activos convertidos a unidades
    numNurseCows: number;        // hembras paridas / Nodriza activas
    numFatteningCalves: number;  // animales en cebo activo
    breakdown: {
        plotsHa: number;
        farmGrazingHa: number;
        plots: number;
    };
}

export async function getFarmAggregatesForPAC(farmId: string): Promise<FarmAggregates> {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(farmId, effectiveUserId, callerRole);

    const [farm, plots, animals, parturitions] = await Promise.all([
        prisma.farm.findUnique({
            where: { id: farmId },
            select: { superficie: true, purpose: true },
        }),
        prisma.cropPlot.findMany({
            where: { farmId },
            select: { id: true, surfaceHa: true },
        }),
        prisma.animal.findMany({
            where: { farmId },
            select: { id: true, sex: true, status: true, category: true, birthDate: true },
        }),
        // Eventos «Parto» registrados en esta finca, para identificar nodrizas reales:
        // nodriza = hembra que YA ha parido al menos una vez (no se infiere por edad).
        prisma.managementEvent.findMany({
            where: { farmId, type: 'Parto' },
            select: { animalId: true, date: true, type: true },
        }),
    ]);

    // Indexar partos por animal.
    const partosByAnimal = new Map<string, { type: string; date: Date }[]>();
    for (const p of parturitions) {
        if (!p.animalId) continue;
        const arr = partosByAnimal.get(p.animalId) ?? [];
        arr.push({ type: p.type, date: p.date });
        partosByAnimal.set(p.animalId, arr);
    }

    const plotsHa = plots.reduce((s, p) => s + (p.surfaceHa ?? 0), 0);
    // superficie de la finca está en m² → ha. Solo cuenta la parte ganadera
    // (es decir, lo NO declarado como cultivo). Para fincas mixtas se asume
    // que las parcelas son una porción del total.
    const farmHaTotal = (farm?.superficie ?? 0) / 10000;
    const farmGrazingHa = farm?.purpose === 'cropland'
        ? 0
        : Math.max(0, farmHaTotal - plotsHa);

    // Animales activos por categoría (NDSU: 1 LU = 1 vaca adulta).
    // Aproximación simplificada según categoría asignada o sexo+edad.
    const excludedStatuses = new Set(['sacrificado', 'muerto', 'vendido', 'baja', 'inactivo', 'retirado']);
    const now = Date.now();
    let totalLU = 0;
    let numNurseCows = 0;
    let numFatteningCalves = 0;

    for (const a of animals) {
        const status = (a.status ?? '').toLowerCase();
        if (excludedStatuses.has(status)) continue;
        const ageMonths = (now - a.birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
        // Conversión a LU
        let lu = 1.0;
        if (ageMonths < 6) lu = 0.4;
        else if (ageMonths < 12) lu = 0.6;
        else if (ageMonths < 24) lu = 0.8;
        totalLU += lu;
        // PAC: la ayuda asociada a vaca nodriza exige que la hembra HAYA PARIDO.
        // Una novilla adulta sin partos NO cuenta (FEGA real decreto 1048/2022,
        // art. 30 «vaca nodriza»). Lo derivamos del histórico de partos.
        if (isNurseCow({ id: a.id, sex: a.sex, birthDate: a.birthDate, events: partosByAnimal.get(a.id) })) {
            numNurseCows++;
        }
        if (ageMonths >= 6 && ageMonths < 18 && (a.sex === 'Macho' || a.sex === 'Castrado')) numFatteningCalves++;
    }

    return {
        totalEligibleHa: parseFloat((plotsHa + farmGrazingHa).toFixed(2)),
        totalLU: parseFloat(totalLU.toFixed(1)),
        numNurseCows,
        numFatteningCalves,
        breakdown: {
            plotsHa: parseFloat(plotsHa.toFixed(2)),
            farmGrazingHa: parseFloat(farmGrazingHa.toFixed(2)),
            plots: plots.length,
        },
    };
}

/**
 * Server actions de PACDeclaration. Una declaración por (farmId, campaignYear).
 */

export async function getPACDeclarations(farmId: string) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(farmId, effectiveUserId, callerRole);
    return prisma.pACDeclaration.findMany({
        where: { farmId },
        orderBy: { campaignYear: 'desc' },
    });
}

export async function upsertPACDeclaration(data: unknown) {
    const parsed = PACSchema.safeParse(data);
    if (!parsed.success) {
        const messages = parsed.error.issues.map((e) => e.message).join(', ');
        throw new Error(`Datos inválidos: ${messages}`);
    }
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(parsed.data.farmId, effectiveUserId, callerRole);

    const payload = {
        farmId: parsed.data.farmId,
        campaignYear: parsed.data.campaignYear,
        status: parsed.data.status ?? 'borrador',
        basePayment: parsed.data.basePayment ?? false,
        redistributive: parsed.data.redistributive ?? false,
        youngFarmer: parsed.data.youngFarmer ?? false,
        organicScheme: parsed.data.organicScheme ?? false,
        coupledLivestock: parsed.data.coupledLivestock ?? false,
        ecoSchemes: parsed.data.ecoSchemes ?? [],
        totalEligibleHa: parsed.data.totalEligibleHa,
        totalLU: parsed.data.totalLU,
        estimatedPayment: parsed.data.estimatedPayment,
        notes: parsed.data.notes,
    };

    const result = await prisma.pACDeclaration.upsert({
        where: { farmId_campaignYear: { farmId: parsed.data.farmId, campaignYear: parsed.data.campaignYear } },
        update: {
            status: payload.status,
            basePayment: payload.basePayment,
            redistributive: payload.redistributive,
            youngFarmer: payload.youngFarmer,
            organicScheme: payload.organicScheme,
            coupledLivestock: payload.coupledLivestock,
            ecoSchemes: payload.ecoSchemes,
            totalEligibleHa: payload.totalEligibleHa,
            totalLU: payload.totalLU,
            estimatedPayment: payload.estimatedPayment,
            notes: payload.notes,
        },
        create: payload,
    });

    revalidatePath('/dashboard');
    return result;
}

export async function deletePACDeclaration(declarationId: string) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    const current = await prisma.pACDeclaration.findUnique({
        where: { id: declarationId },
        select: { farmId: true },
    });
    if (!current) throw new Error('PAC declaration not found');
    await assertFarmOwnership(current.farmId, effectiveUserId, callerRole);
    await prisma.pACDeclaration.delete({ where: { id: declarationId } });
    revalidatePath('/dashboard');
    return { success: true };
}

// =============================================================================
// ESTIMACIÓN AUXILIAR
// =============================================================================
//
// Cálculo simplificado del importe estimado para la campaña 2024-2027
// (no oficial — solo orientativo, los valores reales dependen de coeficientes
// publicados por FEGA cada año). Útil como referencia interna.
//
// Tarifas indicativas tras la reforma PAC 2023:
//   - Pago básico (Ayuda Básica a la Renta): ~50 €/ha admisible
//   - Complemento redistributivo: +30 €/ha primeras 30 ha
//   - Joven agricultor: +60 €/ha primeras 100 ha durante 5 años
//   - Eco-régimen P1 (pastoreo extensivo): ~62 €/ha
//   - Eco-régimen P4 (rotación con especies mejorantes): ~46 €/ha cultivo
//   - Eco-régimen P5 (siembra directa): ~120 €/ha
//   - Ecológico: ~150 €/ha cultivo / ~50 €/ha pastos
//   - Ayuda asociada vacuno cría extensiva: ~95 €/cabeza nodriza
//   - Ayuda asociada cebo: ~80 €/animal cebado

export interface PACEstimateInput {
    eligibleHa: number;
    numNurseCows?: number;
    numFatteningCalves?: number;
    basePayment?: boolean;
    redistributive?: boolean;
    youngFarmer?: boolean;
    organicScheme?: boolean;
    coupledLivestock?: boolean;
    ecoSchemes?: string[];
}

export interface PACEstimateOutput {
    items: Array<{ line: string; amount: number; note: string }>;
    total: number;
}

export async function estimatePACPayment(input: PACEstimateInput): Promise<PACEstimateOutput> {
    // Esta acción no modifica estado, así que basta con requerir sesión.
    await requireEffectiveUserId();

    const items: Array<{ line: string; amount: number; note: string }> = [];

    if (input.basePayment) {
        const amount = parseFloat((input.eligibleHa * 50).toFixed(2));
        items.push({ line: 'Pago Básico Renta', amount, note: `${input.eligibleHa} ha × 50 €/ha` });
    }
    if (input.redistributive) {
        const eligibleHa = Math.min(input.eligibleHa, 30);
        const amount = parseFloat((eligibleHa * 30).toFixed(2));
        items.push({ line: 'Complemento Redistributivo', amount, note: `Primeras ${eligibleHa} ha × 30 €/ha` });
    }
    if (input.youngFarmer) {
        const eligibleHa = Math.min(input.eligibleHa, 100);
        const amount = parseFloat((eligibleHa * 60).toFixed(2));
        items.push({ line: 'Ayuda Joven Agricultor', amount, note: `${eligibleHa} ha × 60 €/ha (5 primeros años)` });
    }
    if (input.organicScheme) {
        const amount = parseFloat((input.eligibleHa * 80).toFixed(2));
        items.push({ line: 'Producción Ecológica', amount, note: `${input.eligibleHa} ha × 80 €/ha (media pastos/cultivo)` });
    }
    if (input.coupledLivestock) {
        const cows = input.numNurseCows ?? 0;
        const cebo = input.numFatteningCalves ?? 0;
        if (cows > 0) items.push({ line: 'Ayuda Asociada Vacas Nodrizas', amount: parseFloat((cows * 95).toFixed(2)), note: `${cows} cabezas × 95 €` });
        if (cebo > 0) items.push({ line: 'Ayuda Asociada Cebo', amount: parseFloat((cebo * 80).toFixed(2)), note: `${cebo} animales × 80 €` });
    }
    const ecoRates: Record<string, number> = {
        P1: 62, P2: 50, P3: 70, P4: 46, P5: 120,
        P6: 40, P7: 35, P8: 145, P9: 90,
    };
    for (const code of input.ecoSchemes ?? []) {
        const rate = ecoRates[code];
        if (!rate) continue;
        const amount = parseFloat((input.eligibleHa * rate).toFixed(2));
        items.push({ line: `Eco-régimen ${code}`, amount, note: `${input.eligibleHa} ha × ${rate} €/ha (orientativo FEGA)` });
    }

    const total = parseFloat(items.reduce((s, i) => s + i.amount, 0).toFixed(2));
    return { items, total };
}
