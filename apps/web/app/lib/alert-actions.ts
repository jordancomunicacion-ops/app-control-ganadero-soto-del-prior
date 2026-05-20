'use server';

import { prisma } from '@/lib/prisma';
import {
    requireEffectiveUserId,
    assertFarmOwnership,
} from '@/lib/server-utils';
import { revalidatePath } from 'next/cache';
import {
    DEFAULT_RULES,
    evaluateAll,
    type AlertCandidate,
    type AlertKind,
    type AnimalSnap,
    type FarmSnap,
} from '@/services/alertEngine';
import { estimateCarryingCapacity } from '@/services/soilEngine';
import { buildForageDeficitAlerts } from './forage-actions';

// ─── REGLAS (CRUD) ─────────────────────────────────────────────────────────────

export async function listAlertRules(farmId: string) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(farmId, effectiveUserId, callerRole);

    const existing = await prisma.alertRule.findMany({
        where: { farmId },
        orderBy: { kind: 'asc' },
    });

    // Si la finca aún no tiene reglas, sembramos las defaults.
    if (existing.length === 0) {
        for (const r of DEFAULT_RULES) {
            await prisma.alertRule.upsert({
                where: { farmId_kind: { farmId, kind: r.kind } },
                update: {},
                create: {
                    farmId,
                    kind: r.kind,
                    paramsJson: r.paramsJson,
                    severity: r.severity,
                    enabled: true,
                },
            });
        }
        return prisma.alertRule.findMany({
            where: { farmId },
            orderBy: { kind: 'asc' },
        });
    }
    return existing;
}

export async function upsertAlertRule(input: {
    farmId: string;
    kind: AlertKind;
    enabled: boolean;
    paramsJson: string;
    severity: 'info' | 'warning' | 'critical';
}) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(input.farmId, effectiveUserId, callerRole);

    // Validación ligera del JSON de parámetros.
    try {
        const parsed = JSON.parse(input.paramsJson);
        if (typeof parsed !== 'object' || parsed === null) {
            throw new Error('paramsJson debe ser un objeto JSON');
        }
    } catch (e) {
        throw new Error(`paramsJson inválido: ${(e as Error).message}`);
    }

    const result = await prisma.alertRule.upsert({
        where: { farmId_kind: { farmId: input.farmId, kind: input.kind } },
        update: {
            enabled: input.enabled,
            paramsJson: input.paramsJson,
            severity: input.severity,
        },
        create: {
            farmId: input.farmId,
            kind: input.kind,
            enabled: input.enabled,
            paramsJson: input.paramsJson,
            severity: input.severity,
        },
    });
    revalidatePath('/dashboard');
    return result;
}

// ─── EVALUACIÓN ────────────────────────────────────────────────────────────────

/**
 * Evalúa todas las reglas habilitadas de una finca y persiste alertas
 * nuevas (deduplicadas por `ruleCode` contra el modelo `Alert`).
 *
 * Idempotente: se puede ejecutar varias veces al día sin abrir
 * duplicados — solo se inserta el `ruleCode` si no existe ya activo.
 */
export async function evaluateAlertRules(farmId: string): Promise<{
    candidates: number;
    inserted: number;
}> {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(farmId, effectiveUserId, callerRole);

    // Reglas activas
    const rules = await prisma.alertRule.findMany({
        where: { farmId, enabled: true },
    });
    if (rules.length === 0) return { candidates: 0, inserted: 0 };

    // ── Snapshot animales ────────────────────────────────────────────────────
    const animals = await prisma.animal.findMany({
        where: { farmId },
        select: {
            id: true,
            sex: true,
            birthDate: true,
            status: true,
        },
    });
    const animalIds = animals.map((a) => a.id);

    const [allWeights, allEvents, healthOpen] = await Promise.all([
        prisma.weight.findMany({
            where: { animalId: { in: animalIds } },
            select: { animalId: true, date: true, weightKg: true },
            orderBy: { date: 'asc' },
        }),
        prisma.managementEvent.findMany({
            where: {
                farmId,
                animalId: { in: animalIds },
                type: { in: ['cubricion', 'parto'] },
            },
            select: { animalId: true, type: true, date: true },
            orderBy: { date: 'asc' },
        }),
        prisma.healthRecord.findMany({
            where: {
                animalId: { in: animalIds },
                withdrawalMeatUntil: { not: null },
            },
            select: { animalId: true, withdrawalMeatUntil: true },
        }),
    ]);

    const weightsByAnimal = new Map<string, typeof allWeights>();
    for (const w of allWeights) {
        const list = weightsByAnimal.get(w.animalId) ?? [];
        list.push(w);
        weightsByAnimal.set(w.animalId, list);
    }
    const cubricionByAnimal = new Map<string, Date>();
    const partoByAnimal = new Map<string, Date>();
    for (const e of allEvents) {
        if (!e.animalId) continue;
        if (e.type === 'cubricion') cubricionByAnimal.set(e.animalId, e.date);
        if (e.type === 'parto') partoByAnimal.set(e.animalId, e.date);
    }
    const withdrawalByAnimal = new Map<string, Date>();
    for (const h of healthOpen) {
        if (!h.withdrawalMeatUntil) continue;
        const prev = withdrawalByAnimal.get(h.animalId);
        if (!prev || h.withdrawalMeatUntil > prev) {
            withdrawalByAnimal.set(h.animalId, h.withdrawalMeatUntil);
        }
    }

    const animalSnaps: AnimalSnap[] = animals.map((a) => {
        const weights = weightsByAnimal.get(a.id) ?? [];
        const last = weights[weights.length - 1];
        const prev = weights[weights.length - 2];
        return {
            id: a.id,
            sex: a.sex,
            birthDate: a.birthDate,
            status: a.status,
            lastWeight: last ? { date: last.date, weightKg: last.weightKg } : undefined,
            secondLastWeight: prev
                ? { date: prev.date, weightKg: prev.weightKg }
                : undefined,
            lastCubricion: cubricionByAnimal.get(a.id),
            // expectedCalvingDate se podría derivar si hay parto programado
            // futuro — por ahora dejamos que el motor estime desde cubricion.
            nearestWithdrawalEnd: withdrawalByAnimal.get(a.id),
        };
    });

    // ── Snapshot finca ───────────────────────────────────────────────────────
    const farm = await prisma.farm.findUnique({
        where: { id: farmId },
        select: {
            id: true,
            superficie: true,
            soilId: true,
            climateStudy: true,
        },
    });
    const nextCampaign = await prisma.campaignSchedule.findFirst({
        where: { farmId, completedAt: null, scheduledFor: { gte: new Date() } },
        orderBy: { scheduledFor: 'asc' },
        select: { kind: true, scheduledFor: true },
    });

    let cargaRatio: number | undefined;
    if (farm && farm.superficie > 0) {
        const haUtil = farm.superficie / 10000;
        const climate = safeJSONParse<{ annualPrecip?: number }>(
            farm.climateStudy ?? '',
        );
        const annualPrecip = climate?.annualPrecip ?? 500;
        const cap = farm.soilId
            ? estimateCarryingCapacity(farm.soilId, annualPrecip, 30).lu_per_ha
            : 0.4;
        const supportable = cap * haUtil;
        const inactiveStates = new Set([
            'sacrificado',
            'muerto',
            'vendido',
            'baja',
            'inactivo',
            'retirado',
        ]);
        const activeHeads = animals.filter(
            (a) => !a.status || !inactiveStates.has(a.status.toLowerCase()),
        ).length;
        if (supportable > 0) cargaRatio = activeHeads / supportable;
    }

    const farmSnap: FarmSnap = {
        farmId,
        cargaRatio,
        nextCampaign: nextCampaign
            ? { kind: nextCampaign.kind, scheduledFor: nextCampaign.scheduledFor }
            : undefined,
    };

    // ── Evaluación ───────────────────────────────────────────────────────────
    const candidates = evaluateAll({
        animals: animalSnaps,
        farms: [farmSnap],
        rules: rules.map((r) => ({
            kind: r.kind as AlertKind,
            paramsJson: r.paramsJson,
            severity: r.severity as 'info' | 'warning' | 'critical',
        })),
    });

    // Regla `forage_deficit` — vive fuera del motor puro porque requiere
    // cruzar producción esperada de cultivos (`CropRotation`) con demanda
    // del rebaño (`Ration` × cabezas). Llamamos a su builder dedicado.
    const forageRule = rules.find((r) => r.kind === 'forage_deficit');
    if (forageRule) {
        const params = safeParse<{ minCoveragePct?: number }>(forageRule.paramsJson) ?? {};
        const forageCandidates = await buildForageDeficitAlerts(farmId, params);
        candidates.push(
            ...forageCandidates.map((c) => ({
                farmScoped: true as const,
                farmId: c.farmId,
                type: c.type as AlertKind,
                severity:
                    (forageRule.severity as 'info' | 'warning' | 'critical') ??
                    c.severity,
                message: c.message,
                ruleCode: c.ruleCode,
                date: c.date,
            })),
        );
    }

    // Idempotencia: no insertar si ya existe Alert con mismo ruleCode no resuelto.
    const inserted = await persistCandidates(candidates);

    // Marca evaluación
    await prisma.alertRule.updateMany({
        where: { farmId, enabled: true },
        data: { lastEvalAt: new Date() },
    });
    revalidatePath('/dashboard');

    return { candidates: candidates.length, inserted };
}

/**
 * Persiste candidatas en el modelo `Alert`. Solo guarda candidatas
 * vinculadas a un animal (las farm-scoped quedan pendientes hasta que
 * extendamos `Alert` con `farmId` opcional — sale del scope Sprint 1).
 *
 * Para alertas farm-scoped se podrían usar como Toast en UI a partir
 * de un getter dedicado; por ahora, las devolvemos pero no se persisten.
 */
async function persistCandidates(candidates: AlertCandidate[]): Promise<number> {
    const animalOnly = candidates.filter((c) => c.animalId);
    if (animalOnly.length === 0) return 0;

    const codes = animalOnly.map((c) => c.ruleCode);
    const existing = await prisma.alert.findMany({
        where: { ruleCode: { in: codes }, resolvedAt: null },
        select: { ruleCode: true },
    });
    const existingSet = new Set(existing.map((e) => e.ruleCode));

    const toCreate = animalOnly.filter((c) => !existingSet.has(c.ruleCode));
    if (toCreate.length === 0) return 0;

    await prisma.alert.createMany({
        data: toCreate.map((c) => ({
            animalId: c.animalId!,
            date: c.date,
            type: c.type,
            severity: c.severity,
            message: c.message,
            ruleCode: c.ruleCode,
        })),
    });
    return toCreate.length;
}

function safeJSONParse<T>(raw: string): T | null {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

function safeParse<T>(raw: string): T | null {
    return safeJSONParse<T>(raw);
}

// ─── HELPERS DE LECTURA ────────────────────────────────────────────────────────

export async function listActiveAlerts(farmId: string) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(farmId, effectiveUserId, callerRole);

    return prisma.alert.findMany({
        where: {
            resolvedAt: null,
            animal: { farmId },
        },
        include: {
            animal: {
                select: { id: true, sex: true, category: true },
            },
        },
        orderBy: [{ severity: 'desc' }, { date: 'desc' }],
    });
}

export async function resolveAlert(alertId: string) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    const alert = await prisma.alert.findUnique({
        where: { id: alertId },
        include: { animal: { select: { farmId: true } } },
    });
    if (!alert) throw new Error('Alerta no encontrada');
    await assertFarmOwnership(alert.animal.farmId, effectiveUserId, callerRole);

    await prisma.alert.update({
        where: { id: alertId },
        data: { resolvedAt: new Date() },
    });
    revalidatePath('/dashboard');
}
