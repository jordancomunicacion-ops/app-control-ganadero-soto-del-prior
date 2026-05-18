'use server';

import { prisma } from '@/lib/prisma';
import {
    requireEffectiveUserId,
    assertFarmOwnership,
    safeJsonParse,
} from '@/lib/server-utils';
import { estimatePACPayment } from './pac-actions';
import { hasGivenBirth, isNurseCow, classifyFemaleRole, FEMALE_ROLE_LABEL } from '@/lib/animal-roles';

// =============================================================================
// REPORTES — server actions
// =============================================================================
//
// Tres informes alimentados por datos reales de la base:
//   1. Económico: ingresos por ventas/sacrificios + cosechas + ayudas PAC
//                 vs costes en eventos + mortalidad valorada. Stock final.
//   2. Reproductivo: tasas de fertilidad, partos, intervalo, saneamiento.
//   3. Rendimiento (FCR): GMD, ingesta y eficiencia alimentaria por animal.
//
// Todas las acciones validan ownership de la finca y, si se omite farmId,
// agregan sobre TODAS las fincas del usuario (incluidas las asociadas).

// ───────────────────────────────────────────────────────────────────────
// FILTROS COMUNES
// ───────────────────────────────────────────────────────────────────────
//
// Todos los informes aceptan filtros opcionales para acotar el universo
// del análisis. Si todos van vacíos, el informe agrega sobre TODAS las
// fincas del usuario.
//
//   farmId:     restringe a una finca concreta.
//   animalId:   restringe a un único animal (informe individual).
//   corral:     restringe a animales asignados a ese corral.
//   category:   restringe a una categoría textual ('Nodriza', 'Añoja'...).
//   role:       restringe a un rol reproductivo derivado (nodriza, novilla...).
//   breedName:  restringe a una raza.
//   sex:        'Hembra' | 'Macho' | 'Castrado'.
//
// Para Económico/Reproductivo además se pasa `year` (campaña).
//
// Cualquier combinación es válida; si la intersección queda vacía, el
// informe se devuelve con animales = [] (no es un error).

export interface ReportFilters {
    farmId?: string;
    animalId?: string;
    corral?: string;
    category?: string;
    role?: 'nodriza' | 'novilla' | 'anoja' | 'ternera' | 'becerra';
    breedName?: string;
    sex?: 'Hembra' | 'Macho' | 'Castrado';
}

// ───────────────────────────────────────────────────────────────────────
// TYPES
// ───────────────────────────────────────────────────────────────────────

export interface EconomicReport {
    year: number;
    farmName: string;
    income: {
        animalSales: { count: number; totalEur: number; byCategory: Record<string, { count: number; eur: number }> };
        cropSales: { totalEur: number; items: { crop: string; yieldT: number; eur: number }[] };
        pacAids: { campaignYear: number | null; totalEur: number; items: { line: string; amount: number }[] };
        total: number;
    };
    costs: {
        events: { type: string; totalEur: number }[];
        mortality: { count: number; estimatedLossEur: number };
        total: number;
    };
    inventory: {
        totalCount: number;
        totalEstValueEur: number;
        byCategory: { category: string; count: number; avgWeightKg: number; estValueEur: number }[];
    };
    balance: number;
}

export interface ReproductiveReport {
    period: { from: string; to: string };
    farmName: string;
    summary: {
        /**
         * Total de hembras incluidas en el informe (≥18 m). Es la suma de
         * `nurseCows` + `heifers`. Se mantiene por compatibilidad.
         */
        activeFemales: number;
        /** Vacas nodrizas: hembras con ≥1 parto registrado en histórico. */
        nurseCows: number;
        /** Novillas: hembras adultas (≥18 m) que aún NO han parido nunca. */
        heifers: number;
        inseminations: number;
        diagnosesPositive: number;
        diagnosesNegative: number;
        births: number;
        abortions: number;
        fertilityRatePct: number;
        avgCalvingIntervalDays: number | null;
    };
    cows: {
        id: string;
        sex: string;
        ageMonths: number;
        /** true si ya ha parido al menos una vez (vaca nodriza); false = novilla. */
        isNurseCow: boolean;
        parityCount: number;
        lastBirthDate: string | null;
        daysSinceLastBirth: number | null;
        intervalDays: number | null;
        inseminationsInPeriod: number;
        births: number;
        currentStatus: 'Vacía' | 'Inseminada' | 'Gestante' | 'Parida reciente' | 'Postparto' | 'Aborto';
    }[];
    sanitary: {
        lastSaneamiento: { date: string; result: string } | null;
        lastSaneamientoDaysAgo: number | null;
    };
}

export interface FCRReport {
    farmName: string;
    period: { from: string; to: string };
    animals: {
        id: string;
        breed: string | null;
        sex: string | null;
        ageMonths: number;
        currentWeightKg: number | null;
        gmdKgDay: number | null;
        gmdSource: 'pesajes' | 'estimado_breed' | 'sin_datos';
        dmiTargetKg: number | null;
        fcrEstimate: number | null;
    }[];
    summary: {
        animalsCount: number;
        animalsWithWeightHistory: number;
        avgGMD: number | null;
        avgFCR: number | null;
    };
}

// ───────────────────────────────────────────────────────────────────────
// COMMON HELPERS
// ───────────────────────────────────────────────────────────────────────

const EXIT_STATUSES = new Set(['sacrificado', 'vendido']);

function ageMonthsFromBirth(birth: Date | null | undefined, ref: Date = new Date()): number {
    if (!birth) return 0;
    return (ref.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
}

async function resolveFarmIds(callerEffectiveUserId: string, farmId?: string, callerRole?: string): Promise<string[]> {
    if (farmId) {
        await assertFarmOwnership(farmId, callerEffectiveUserId, callerRole ?? 'USER');
        return [farmId];
    }
    const farms = await prisma.farm.findMany({
        where: { userId: callerEffectiveUserId },
        select: { id: true },
    });
    return farms.map((f) => f.id);
}

async function farmNameLabel(farmIds: string[]): Promise<string> {
    if (farmIds.length === 0) return 'Sin fincas';
    if (farmIds.length === 1) {
        const f = await prisma.farm.findUnique({ where: { id: farmIds[0] }, select: { name: true } });
        return f?.name ?? 'Finca';
    }
    return `Todas las fincas (${farmIds.length})`;
}

/**
 * Construye un `where` de Prisma para `Animal` aplicando los filtros del informe.
 * Los filtros `role` no se traducen a SQL (se filtran en memoria contra el histórico
 * de partos), por lo que aquí solo se aplican los que sí pueden ir a la base.
 */
function buildAnimalWhere(filters: ReportFilters, farmIds: string[], extra: Record<string, unknown> = {}) {
    const where: Record<string, unknown> = { farmId: { in: farmIds }, ...extra };
    if (filters.animalId) where.id = filters.animalId;
    if (filters.corral) where.corral = filters.corral;
    if (filters.category) where.category = filters.category;
    if (filters.breedName) where.breedName = filters.breedName;
    if (filters.sex) where.sex = filters.sex;
    return where;
}

/** Filtros en memoria que dependen del histórico de partos. */
function passesRoleFilter(
    role: ReportFilters['role'] | undefined,
    animal: { id: string; sex: string | null; birthDate: Date | null },
    partosByAnimal: Map<string, { type: string; date: Date }[]>,
    now = new Date(),
): boolean {
    if (!role) return true;
    const r = classifyFemaleRole(
        { id: animal.id, sex: animal.sex, birthDate: animal.birthDate, events: partosByAnimal.get(animal.id) },
        now,
    );
    return r === role;
}

/**
 * Devuelve etiqueta del sujeto del informe («Vaca ES1234», «Corral 3»,
 * «Categoría: Añojas»...). Útil en el título del modal.
 */
async function describeSubject(filters: ReportFilters, farmName: string): Promise<string> {
    const parts: string[] = [farmName];
    if (filters.animalId) {
        const a = await prisma.animal.findUnique({
            where: { id: filters.animalId },
            select: { id: true, breedName: true, sex: true },
        });
        if (a) parts.push(`Animal ${a.id}${a.breedName ? ` · ${a.breedName}` : ''}`);
    }
    if (filters.corral) parts.push(`Corral ${filters.corral}`);
    if (filters.category) parts.push(`Categoría: ${filters.category}`);
    if (filters.role) parts.push(`Rol: ${FEMALE_ROLE_LABEL[filters.role]}`);
    if (filters.breedName) parts.push(`Raza ${filters.breedName}`);
    if (filters.sex) parts.push(filters.sex);
    return parts.join(' · ');
}

// ===========================================================================
// 1. INFORME ECONÓMICO
// ===========================================================================

export async function generateEconomicReport(
    opts: ReportFilters & { year?: number } = {},
): Promise<EconomicReport & { subject: string }> {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    const year = opts.year ?? new Date().getFullYear();
    const farmIds = await resolveFarmIds(effectiveUserId, opts.farmId, callerRole);
    const farmName = await farmNameLabel(farmIds);
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);

    // ── Salidas de animales (venta + sacrificio) ──
    const exitedAnimals = await prisma.animal.findMany({
        where: buildAnimalWhere(opts, farmIds, {
            exitDate: { gte: yearStart, lt: yearEnd },
            status: { in: ['Vendido', 'Sacrificado'] },
        }),
        select: {
            id: true, actualPrice: true, actualCategory: true, status: true,
            actualLiveWeight: true, actualCarcassWeight: true,
        },
    });
    const animalSales = { count: 0, totalEur: 0, byCategory: {} as Record<string, { count: number; eur: number }> };
    for (const a of exitedAnimals) {
        const eur = a.actualPrice ?? 0;
        animalSales.count++;
        animalSales.totalEur += eur;
        const cat = a.actualCategory ?? a.status ?? 'Sin categoría';
        const bucket = animalSales.byCategory[cat] ?? { count: 0, eur: 0 };
        bucket.count++;
        bucket.eur += eur;
        animalSales.byCategory[cat] = bucket;
    }
    animalSales.totalEur = parseFloat(animalSales.totalEur.toFixed(2));

    // ── Mortalidad ──
    const deadAnimals = await prisma.animal.findMany({
        where: buildAnimalWhere(opts, farmIds, {
            exitDate: { gte: yearStart, lt: yearEnd },
            status: 'Muerto',
        }),
        select: { id: true, actualLiveWeight: true, currentWeight: true, sex: true, birthDate: true },
    });
    // Estimar pérdida: peso × 2.5 €/kg vivo aproximado (referencia conservadora).
    const avgPricePerKgLive = 2.5;
    let mortalityLoss = 0;
    for (const a of deadAnimals) {
        const w = a.actualLiveWeight ?? a.currentWeight ?? 0;
        mortalityLoss += w * avgPricePerKgLive;
    }
    mortalityLoss = parseFloat(mortalityLoss.toFixed(2));

    // ── Eventos con coste (sanitarios, alimentación, manejo) ──
    // Si hay filtro de animal, los costes solo cuentan eventos asociados a ese animal.
    const events = await prisma.managementEvent.findMany({
        where: {
            farmId: { in: farmIds },
            date: { gte: yearStart, lt: yearEnd },
            cost: { gt: 0 },
            ...(opts.animalId ? { animalId: opts.animalId } : {}),
        },
        select: { type: true, cost: true },
    });
    const eventsByType = new Map<string, number>();
    for (const e of events) {
        eventsByType.set(e.type, (eventsByType.get(e.type) ?? 0) + (e.cost ?? 0));
    }
    const eventsCosts = Array.from(eventsByType.entries())
        .map(([type, totalEur]) => ({ type, totalEur: parseFloat(totalEur.toFixed(2)) }))
        .sort((a, b) => b.totalEur - a.totalEur);

    // ── Cultivos vendidos (CropRotation destinationFor=venta cosechada en el año) ──
    const cropRotations = await prisma.cropRotation.findMany({
        where: {
            plot: { farmId: { in: farmIds } },
            destinationFor: 'venta',
            OR: [
                { harvestDate: { gte: yearStart, lt: yearEnd } },
                { sowDate: { gte: yearStart, lt: yearEnd } },
            ],
        },
        select: { cropName: true, actualYieldT: true, expectedYieldT: true },
    });
    // Precio orientativo por cultivo (€/tonelada, referencias Lonja 2025-2026):
    const cropPriceEurPerT: Record<string, number> = {
        'Trigo Blando': 240, 'Cebada': 220, 'Avena': 215, 'Centeno': 200,
        'Triticale': 215, 'Maíz Forrajero': 180, 'Sorgo Forrajero': 175,
        'Girasol': 480, 'Veza (Vicia sativa)': 280, 'Guisante Proteico': 320,
        'Haba (Vicia faba)': 300, 'Lupino Dulce': 350, 'Alfalfa': 200,
        'Sulla (Hedysarum coronarium)': 220, 'Esparceta (Sainfoin)': 200,
        'Ray-grass Italiano': 160, 'Festuca Alta': 170, 'Dáctilo (Dactylis glomerata)': 170,
        'Trébol Subterráneo': 200,
    };
    const cropSalesItems = cropRotations.map((r) => {
        const yieldT = r.actualYieldT ?? r.expectedYieldT ?? 0;
        const priceT = cropPriceEurPerT[r.cropName] ?? 200;
        return { crop: r.cropName, yieldT, eur: parseFloat((yieldT * priceT).toFixed(2)) };
    });
    const cropSalesTotal = parseFloat(
        cropSalesItems.reduce((s, i) => s + i.eur, 0).toFixed(2),
    );

    // ── Ayudas PAC del año ──
    const pacDecls = await prisma.pACDeclaration.findMany({
        where: { farmId: { in: farmIds }, campaignYear: year },
    });
    const pacItems: { line: string; amount: number }[] = [];
    let pacTotal = 0;
    for (const decl of pacDecls) {
        const ha = decl.totalEligibleHa ?? 0;
        if (decl.estimatedPayment) {
            pacItems.push({ line: `PAC ${decl.farmId.slice(-6)} (campaña ${decl.campaignYear})`, amount: decl.estimatedPayment });
            pacTotal += decl.estimatedPayment;
        } else if (ha > 0) {
            // Re-estimar al vuelo si no hay estimación cacheada
            try {
                const estimate = await estimatePACPayment({
                    eligibleHa: ha,
                    basePayment: decl.basePayment,
                    redistributive: decl.redistributive,
                    youngFarmer: decl.youngFarmer,
                    organicScheme: decl.organicScheme,
                    coupledLivestock: decl.coupledLivestock,
                    ecoSchemes: decl.ecoSchemes,
                });
                for (const it of estimate.items) {
                    pacItems.push({ line: it.line, amount: it.amount });
                }
                pacTotal += estimate.total;
            } catch {
                /* noop */
            }
        }
    }
    pacTotal = parseFloat(pacTotal.toFixed(2));

    // ── Inventario actual valorado ──
    const activeAnimals = await prisma.animal.findMany({
        where: buildAnimalWhere(opts, farmIds, {
            OR: [{ status: null }, { status: { notIn: Array.from(EXIT_STATUSES).concat(['Muerto', 'Baja']) } }],
        }),
        select: { id: true, sex: true, birthDate: true, currentWeight: true, category: true },
    });
    // Si hay filtro de rol, hay que conocer el histórico de partos de las hembras.
    const partosByAnimal = new Map<string, { type: string; date: Date }[]>();
    if (opts.role) {
        const partos = await prisma.managementEvent.findMany({
            where: { farmId: { in: farmIds }, type: 'Parto', animalId: { in: activeAnimals.map((a) => a.id) } },
            select: { animalId: true, type: true, date: true },
        });
        for (const p of partos) {
            if (!p.animalId) continue;
            const arr = partosByAnimal.get(p.animalId) ?? [];
            arr.push({ type: p.type, date: p.date });
            partosByAnimal.set(p.animalId, arr);
        }
    }
    const inventoryByCategory = new Map<string, { count: number; totalWeight: number; totalValue: number }>();
    for (const a of activeAnimals) {
        if (!passesRoleFilter(opts.role, a, partosByAnimal)) continue;
        const ageMonths = ageMonthsFromBirth(a.birthDate);
        // Categoría inferida: si es hembra adulta con partos => Nodriza; si no => Novilla.
        const isNurse = isNurseCow({ id: a.id, sex: a.sex, birthDate: a.birthDate, events: partosByAnimal.get(a.id) });
        const cat = a.category ?? (
            ageMonths < 8 ? 'Ternera blanca' :
                ageMonths < 12 ? 'Ternero' :
                    ageMonths < 24 ? 'Añojo' :
                        a.sex === 'Hembra' ? (isNurse ? 'Vaca nodriza' : 'Novilla') :
                            'Toro'
        );
        const weight = a.currentWeight ?? 0;
        // Estimación grosera de valor con PriceEngine asumiendo peso vivo
        // = peso × 0.55 RC × 7.5 €/kg canal. Equivalente conservador.
        const valEur = weight * 0.55 * 7.5;
        const bucket = inventoryByCategory.get(cat) ?? { count: 0, totalWeight: 0, totalValue: 0 };
        bucket.count++;
        bucket.totalWeight += weight;
        bucket.totalValue += valEur;
        inventoryByCategory.set(cat, bucket);
    }
    const inventoryRows = Array.from(inventoryByCategory.entries()).map(([cat, b]) => ({
        category: cat,
        count: b.count,
        avgWeightKg: b.count > 0 ? parseFloat((b.totalWeight / b.count).toFixed(1)) : 0,
        estValueEur: parseFloat(b.totalValue.toFixed(2)),
    }));
    inventoryRows.sort((a, b) => b.estValueEur - a.estValueEur);
    const totalEstValue = parseFloat(inventoryRows.reduce((s, r) => s + r.estValueEur, 0).toFixed(2));

    // ── Totales ──
    const totalIncome = parseFloat((animalSales.totalEur + cropSalesTotal + pacTotal).toFixed(2));
    const totalCosts = parseFloat((eventsCosts.reduce((s, e) => s + e.totalEur, 0) + mortalityLoss).toFixed(2));
    const balance = parseFloat((totalIncome - totalCosts).toFixed(2));

    return {
        year,
        farmName,
        subject: await describeSubject(opts, farmName),
        income: {
            animalSales,
            cropSales: { totalEur: cropSalesTotal, items: cropSalesItems },
            pacAids: { campaignYear: pacDecls[0]?.campaignYear ?? null, totalEur: pacTotal, items: pacItems },
            total: totalIncome,
        },
        costs: {
            events: eventsCosts,
            mortality: { count: deadAnimals.length, estimatedLossEur: mortalityLoss },
            total: totalCosts,
        },
        inventory: {
            totalCount: inventoryRows.reduce((s, r) => s + r.count, 0),
            totalEstValueEur: totalEstValue,
            byCategory: inventoryRows,
        },
        balance,
    };
}

// ===========================================================================
// 2. INFORME REPRODUCTIVO
// ===========================================================================

export async function generateReproductiveReport(
    opts: ReportFilters & { year?: number } = {},
): Promise<ReproductiveReport & { subject: string }> {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    const year = opts.year ?? new Date().getFullYear();
    const farmIds = await resolveFarmIds(effectiveUserId, opts.farmId, callerRole);
    const farmName = await farmNameLabel(farmIds);
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);

    // ── Hembras activas con edad reproductiva (>=18 meses) ──
    // El filtro fuerza siempre sex=Hembra (el reproductivo no aplica a machos),
    // pero respeta animalId/corral/category/breedName si vinieron.
    const females = await prisma.animal.findMany({
        where: buildAnimalWhere({ ...opts, sex: 'Hembra' }, farmIds, {
            OR: [{ status: null }, { status: { notIn: ['Muerto', 'Vendido', 'Sacrificado', 'Baja'] } }],
        }),
        select: { id: true, sex: true, birthDate: true, status: true, category: true },
    });

    // ── Eventos reproductivos del periodo + histórico ──
    const reproductiveEvents = await prisma.managementEvent.findMany({
        where: {
            farmId: { in: farmIds },
            type: { in: ['Inseminación', 'Diagnóstico Gestación', 'Parto', 'Aborto'] },
            ...(opts.animalId ? { animalId: opts.animalId } : {}),
        },
        select: { id: true, type: true, date: true, animalId: true, details: true, eventData: true, status: true },
    });

    // Agrupar por animal
    const eventsByAnimal = new Map<string, typeof reproductiveEvents>();
    for (const e of reproductiveEvents) {
        if (!e.animalId) continue;
        const arr = eventsByAnimal.get(e.animalId) ?? [];
        arr.push(e);
        eventsByAnimal.set(e.animalId, arr);
    }

    // Computar por hembra
    const cows: ReproductiveReport['cows'] = [];
    const today = new Date();
    let totalIntervalDays = 0;
    let cowsWithInterval = 0;

    for (const f of females) {
        const ageMonths = ageMonthsFromBirth(f.birthDate, today);
        if (ageMonths < 18) continue; // novillas <18m no entran en métricas reproductivas

        const evts = (eventsByAnimal.get(f.id) ?? []).sort((a, b) => b.date.getTime() - a.date.getTime());

        const partos = evts.filter((e) => e.type === 'Parto').sort((a, b) => b.date.getTime() - a.date.getTime());
        const lastBirth = partos[0]?.date ?? null;
        const previousBirth = partos[1]?.date ?? null;
        const intervalDays = (lastBirth && previousBirth)
            ? Math.floor((lastBirth.getTime() - previousBirth.getTime()) / (1000 * 60 * 60 * 24))
            : null;
        if (intervalDays) {
            totalIntervalDays += intervalDays;
            cowsWithInterval++;
        }

        const inseminationsInPeriod = evts.filter((e) => e.type === 'Inseminación' && e.date >= yearStart && e.date < yearEnd).length;
        const birthsInPeriod = partos.filter((e) => e.date >= yearStart && e.date < yearEnd).length;
        const daysSinceLastBirth = lastBirth
            ? Math.floor((today.getTime() - lastBirth.getTime()) / (1000 * 60 * 60 * 24))
            : null;

        // Estado actual: derivar del último evento relevante
        let currentStatus: ReproductiveReport['cows'][number]['currentStatus'] = 'Vacía';
        const lastEvent = evts[0];
        if (lastEvent) {
            const daysSinceLastEvent = (today.getTime() - lastEvent.date.getTime()) / (1000 * 60 * 60 * 24);
            if (lastEvent.type === 'Parto' && daysSinceLastEvent < 60) currentStatus = 'Parida reciente';
            else if (lastEvent.type === 'Parto') currentStatus = 'Postparto';
            else if (lastEvent.type === 'Aborto') currentStatus = 'Aborto';
            else if (lastEvent.type === 'Diagnóstico Gestación') {
                const data = safeJsonParse<{ result?: string }>(lastEvent.eventData, {});
                const isPositive = (data.result ?? '').toLowerCase().includes('positiv')
                    || (lastEvent.details ?? '').toLowerCase().includes('gestan')
                    || (lastEvent.details ?? '').toLowerCase().includes('preñ');
                currentStatus = isPositive ? 'Gestante' : 'Vacía';
            } else if (lastEvent.type === 'Inseminación') {
                currentStatus = 'Inseminada';
            }
        }

        const parityCount = partos.length;
        const isNurse = hasGivenBirth({ id: f.id, sex: f.sex, birthDate: f.birthDate, parityCount });
        // Si vino filtro de rol, descartamos las que no encajen
        // (nodriza ⇔ ha parido; novilla ⇔ ≥18 m sin partos).
        if (opts.role === 'nodriza' && !isNurse) continue;
        if (opts.role === 'novilla' && isNurse) continue;

        cows.push({
            id: f.id,
            sex: f.sex,
            ageMonths: parseFloat(ageMonths.toFixed(1)),
            isNurseCow: isNurse,
            parityCount,
            lastBirthDate: lastBirth?.toISOString().split('T')[0] ?? null,
            daysSinceLastBirth,
            intervalDays,
            inseminationsInPeriod,
            births: birthsInPeriod,
            currentStatus,
        });
    }
    cows.sort((a, b) => (b.daysSinceLastBirth ?? Infinity) - (a.daysSinceLastBirth ?? Infinity));
    const nurseCows = cows.filter((c) => c.isNurseCow).length;
    const heifers = cows.length - nurseCows;

    // Agregados del rebaño
    const periodInseminations = reproductiveEvents.filter((e) => e.type === 'Inseminación' && e.date >= yearStart && e.date < yearEnd).length;
    const periodBirths = reproductiveEvents.filter((e) => e.type === 'Parto' && e.date >= yearStart && e.date < yearEnd).length;
    const periodAbortions = reproductiveEvents.filter((e) => e.type === 'Aborto' && e.date >= yearStart && e.date < yearEnd).length;
    const periodDiagnoses = reproductiveEvents.filter((e) => e.type === 'Diagnóstico Gestación' && e.date >= yearStart && e.date < yearEnd);
    const diagnosesPositive = periodDiagnoses.filter((e) => {
        const data = safeJsonParse<{ result?: string }>(e.eventData, {});
        return (data.result ?? '').toLowerCase().includes('positiv')
            || (e.details ?? '').toLowerCase().includes('gestan');
    }).length;
    const diagnosesNegative = periodDiagnoses.length - diagnosesPositive;
    const fertilityRatePct = periodInseminations > 0
        ? parseFloat(((diagnosesPositive / periodInseminations) * 100).toFixed(1))
        : 0;
    const avgInterval = cowsWithInterval > 0
        ? Math.round(totalIntervalDays / cowsWithInterval)
        : null;

    // Saneamiento
    const lastSaneamiento = await prisma.managementEvent.findFirst({
        where: { farmId: { in: farmIds }, type: 'Saneamiento' },
        orderBy: { date: 'desc' },
        select: { date: true, details: true, eventData: true },
    });
    let sanitaryResult: { date: string; result: string } | null = null;
    if (lastSaneamiento) {
        const data = safeJsonParse<{ result?: string }>(lastSaneamiento.eventData, {});
        sanitaryResult = {
            date: lastSaneamiento.date.toISOString().split('T')[0],
            result: data.result ?? (lastSaneamiento.details ?? '').toLowerCase().includes('positiv') ? 'Positivo' : 'Negativo',
        };
    }
    const sanitaryDaysAgo = lastSaneamiento
        ? Math.floor((today.getTime() - lastSaneamiento.date.getTime()) / (1000 * 60 * 60 * 24))
        : null;

    return {
        period: {
            from: yearStart.toISOString().split('T')[0],
            to: new Date(yearEnd.getTime() - 1).toISOString().split('T')[0],
        },
        farmName,
        subject: await describeSubject(opts, farmName),
        summary: {
            activeFemales: cows.length,
            nurseCows,
            heifers,
            inseminations: periodInseminations,
            diagnosesPositive,
            diagnosesNegative,
            births: periodBirths,
            abortions: periodAbortions,
            fertilityRatePct,
            avgCalvingIntervalDays: avgInterval,
        },
        cows,
        sanitary: {
            lastSaneamiento: sanitaryResult,
            lastSaneamientoDaysAgo: sanitaryDaysAgo,
        },
    };
}

// ===========================================================================
// 3. INFORME DE RENDIMIENTO (FCR)
// ===========================================================================

export async function generateFCRReport(
    opts: ReportFilters = {},
): Promise<FCRReport & { subject: string }> {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    const farmIds = await resolveFarmIds(effectiveUserId, opts.farmId, callerRole);
    const farmName = await farmNameLabel(farmIds);
    const today = new Date();
    const periodFrom = new Date(today);
    periodFrom.setMonth(periodFrom.getMonth() - 6);

    const animals = await prisma.animal.findMany({
        where: buildAnimalWhere(opts, farmIds, {
            OR: [{ status: null }, { status: { notIn: ['Muerto', 'Vendido', 'Sacrificado', 'Baja'] } }],
        }),
        select: {
            id: true, sex: true, birthDate: true, currentWeight: true, breedName: true,
            corral: true, category: true,
            weights: {
                where: { date: { gte: periodFrom, lte: today } },
                orderBy: { date: 'asc' },
                select: { date: true, weightKg: true },
            },
        },
        take: 500,
    });

    // Si vino filtro de rol, necesitamos los partos para resolver nodriza/novilla.
    const partosByAnimalFCR = new Map<string, { type: string; date: Date }[]>();
    if (opts.role) {
        const partos = await prisma.managementEvent.findMany({
            where: { farmId: { in: farmIds }, type: 'Parto', animalId: { in: animals.map((a) => a.id) } },
            select: { animalId: true, type: true, date: true },
        });
        for (const p of partos) {
            if (!p.animalId) continue;
            const arr = partosByAnimalFCR.get(p.animalId) ?? [];
            arr.push({ type: p.type, date: p.date });
            partosByAnimalFCR.set(p.animalId, arr);
        }
    }

    // Asumimos consumo medio de 2.2 % PV de MS/día como capacidad estándar.
    // FCR estimado = DMI / GMD si GMD > 0; si no, NaN.
    const animalRows: FCRReport['animals'] = [];
    let sumGMD = 0, countGMD = 0;
    let sumFCR = 0, countFCR = 0;
    let withHistory = 0;

    for (const a of animals) {
        if (!passesRoleFilter(opts.role, a, partosByAnimalFCR, today)) continue;
        const ageMonths = parseFloat(ageMonthsFromBirth(a.birthDate, today).toFixed(1));
        const weight = a.currentWeight ?? null;
        let gmd: number | null = null;
        let source: FCRReport['animals'][number]['gmdSource'] = 'sin_datos';

        if (a.weights.length >= 2) {
            const first = a.weights[0];
            const last = a.weights[a.weights.length - 1];
            const days = (last.date.getTime() - first.date.getTime()) / (1000 * 60 * 60 * 24);
            if (days > 0 && last.weightKg > first.weightKg) {
                gmd = parseFloat(((last.weightKg - first.weightKg) / days).toFixed(2));
                source = 'pesajes';
                withHistory++;
            }
        }
        if (gmd === null && weight) {
            // Fallback: GMD nominal según edad y categoría
            if (ageMonths < 6) gmd = 0.8;
            else if (ageMonths < 12) gmd = 1.0;
            else if (ageMonths < 24) gmd = 1.2;
            else gmd = 0.2;
            source = 'estimado_breed';
        }

        const dmiKg = weight ? parseFloat((weight * 0.022).toFixed(1)) : null;
        const fcr = (gmd && gmd > 0 && dmiKg) ? parseFloat((dmiKg / gmd).toFixed(2)) : null;

        if (gmd !== null) { sumGMD += gmd; countGMD++; }
        if (fcr !== null) { sumFCR += fcr; countFCR++; }

        animalRows.push({
            id: a.id,
            breed: a.breedName,
            sex: a.sex,
            ageMonths,
            currentWeightKg: weight,
            gmdKgDay: gmd,
            gmdSource: source,
            dmiTargetKg: dmiKg,
            fcrEstimate: fcr,
        });
    }

    animalRows.sort((a, b) => (b.fcrEstimate ?? 0) - (a.fcrEstimate ?? 0));

    return {
        farmName,
        subject: await describeSubject(opts, farmName),
        period: {
            from: periodFrom.toISOString().split('T')[0],
            to: today.toISOString().split('T')[0],
        },
        animals: animalRows,
        summary: {
            animalsCount: animalRows.length,
            animalsWithWeightHistory: withHistory,
            avgGMD: countGMD > 0 ? parseFloat((sumGMD / countGMD).toFixed(2)) : null,
            avgFCR: countFCR > 0 ? parseFloat((sumFCR / countFCR).toFixed(2)) : null,
        },
    };
}

// ===========================================================================
// LISTADO DE ANIMALES / CORRALES (para los selectores de filtros)
// ===========================================================================

/**
 * Devuelve listas ligeras para poblar los selectores del modal de informes:
 * animales activos (id + raza + corral + sexo + categoría), corrales y razas
 * distintos en la finca / fincas del usuario.
 */
export async function getReportFilterOptions(farmId?: string): Promise<{
    animals: { id: string; label: string; corral: string | null; sex: string | null; breedName: string | null; category: string | null }[];
    corrals: string[];
    categories: string[];
    breeds: string[];
}> {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    const farmIds = await resolveFarmIds(effectiveUserId, farmId, callerRole);
    const animals = await prisma.animal.findMany({
        where: {
            farmId: { in: farmIds },
            OR: [{ status: null }, { status: { notIn: ['Muerto', 'Vendido', 'Sacrificado', 'Baja'] } }],
        },
        select: { id: true, sex: true, breedName: true, corral: true, category: true, birthDate: true },
        orderBy: { id: 'asc' },
        take: 2000,
    });
    const now = new Date();
    const list = animals.map((a) => {
        const ageMonths = ageMonthsFromBirth(a.birthDate, now);
        const ageLabel = ageMonths >= 12 ? `${(ageMonths / 12).toFixed(1)}a` : `${ageMonths.toFixed(0)}m`;
        const tags = [a.sex, a.breedName, a.category, ageLabel].filter(Boolean).join(' · ');
        return {
            id: a.id,
            label: `${a.id} — ${tags}`,
            corral: a.corral,
            sex: a.sex,
            breedName: a.breedName,
            category: a.category,
        };
    });
    const corrals = Array.from(new Set(animals.map((a) => a.corral).filter((c): c is string => !!c))).sort();
    const categories = Array.from(new Set(animals.map((a) => a.category).filter((c): c is string => !!c))).sort();
    const breeds = Array.from(new Set(animals.map((a) => a.breedName).filter((c): c is string => !!c))).sort();
    return { animals: list, corrals, categories, breeds };
}

