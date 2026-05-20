'use server';

import { prisma } from '@/lib/prisma';
import {
    requireEffectiveUserId,
    assertFarmOwnership,
} from '@/lib/server-utils';
import { revalidatePath } from 'next/cache';
import {
    CRITERIA,
    PRINCIPLES,
    findCriterion,
    findIndicator,
    precomputeIndicators,
    scoreAssessment,
    type AssessmentScore,
    type IndicatorValue,
    type WelfareProtocol,
} from '@/services/welfareEngine';
import { getGrazingTraceability } from './grazing-actions';

/**
 * Server actions del módulo de bienestar animal (Welfair / B+ PAWS).
 *
 *   - Crear una sesión de evaluación (`WelfareAssessment`).
 *   - Pre-rellenar automáticamente lo que ya sabemos (`precompute`)
 *     mirando Animal/Weight/HealthRecord/Corral/FarmDaily/GrazingEvent.
 *   - Editar manualmente cada indicador (`updateIndicator`).
 *   - Recalcular score con `scoreAssessment` y persistirlo.
 *   - Listar evaluaciones pasadas, exportar dossier.
 */

// ─── CRUD ASSESSMENT ───────────────────────────────────────────────────────────

export async function createAssessment(input: {
    farmId: string;
    protocol: WelfareProtocol;
    notes?: string;
}) {
    const { callerId, effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(input.farmId, effectiveUserId, callerRole);

    const result = await prisma.welfareAssessment.create({
        data: {
            farmId: input.farmId,
            protocol: input.protocol,
            notes: input.notes,
            createdBy: callerId,
        },
    });

    // Materializar filas vacías para todos los indicadores del catálogo,
    // así la UI puede iterar sin lógica adicional.
    const rows: Array<{
        assessmentId: string;
        principle: number;
        criterion: string;
        indicatorCode: string;
    }> = [];
    for (const c of CRITERIA) {
        for (const ind of c.indicators) {
            rows.push({
                assessmentId: result.id,
                principle: c.principle,
                criterion: c.code,
                indicatorCode: ind.code,
            });
        }
    }
    await prisma.welfareIndicator.createMany({ data: rows });

    revalidatePath('/dashboard');
    return result;
}

export async function listAssessments(farmId: string) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertFarmOwnership(farmId, effectiveUserId, callerRole);
    return prisma.welfareAssessment.findMany({
        where: { farmId },
        orderBy: { date: 'desc' },
        take: 50,
    });
}

export async function deleteAssessment(id: string) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    const a = await prisma.welfareAssessment.findUnique({
        where: { id },
        select: { farmId: true },
    });
    if (!a) throw new Error('Evaluación no encontrada');
    await assertFarmOwnership(a.farmId, effectiveUserId, callerRole);
    await prisma.welfareAssessment.delete({ where: { id } });
    revalidatePath('/dashboard');
}

// ─── LECTURA + SCORE ───────────────────────────────────────────────────────────

export interface AssessmentDetail {
    assessment: {
        id: string;
        farmId: string;
        date: Date;
        protocol: WelfareProtocol;
        status: string;
        auditorName: string | null;
        notes: string | null;
    };
    catalog: typeof CRITERIA;
    principles: typeof PRINCIPLES;
    indicators: Array<{
        id: string;
        principle: number;
        criterion: string;
        indicatorCode: string;
        label: string;
        valueKind: string;
        unit?: string;
        help: string;
        valueNumeric: number | null;
        valueText: string | null;
        valueBool: boolean | null;
        notes: string | null;
        source: string;
        evidenceUrls: string[];
    }>;
    score: AssessmentScore;
}

export async function getAssessmentDetail(id: string): Promise<AssessmentDetail> {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    const a = await prisma.welfareAssessment.findUnique({
        where: { id },
        include: { indicators: true },
    });
    if (!a) throw new Error('Evaluación no encontrada');
    await assertFarmOwnership(a.farmId, effectiveUserId, callerRole);

    const indicators = a.indicators.map((ind) => {
        const def = findIndicator(ind.indicatorCode);
        return {
            id: ind.id,
            principle: ind.principle,
            criterion: ind.criterion,
            indicatorCode: ind.indicatorCode,
            label: def?.label ?? ind.indicatorCode,
            valueKind: def?.valueKind ?? 'numeric',
            unit: def?.unit,
            help: def?.help ?? '',
            valueNumeric: ind.valueNumeric,
            valueText: ind.valueText,
            valueBool: ind.valueBool,
            notes: ind.notes,
            source: ind.source,
            evidenceUrls: ind.evidenceUrls,
        };
    });

    const values: IndicatorValue[] = a.indicators.map((ind) => ({
        code: ind.indicatorCode,
        valueNumeric: ind.valueNumeric,
        valueText: ind.valueText,
        valueBool: ind.valueBool,
        source: ind.source as 'manual' | 'auto',
    }));
    const score = scoreAssessment(values, a.protocol as WelfareProtocol);

    return {
        assessment: {
            id: a.id,
            farmId: a.farmId,
            date: a.date,
            protocol: a.protocol as WelfareProtocol,
            status: a.status,
            auditorName: a.auditorName,
            notes: a.notes,
        },
        catalog: CRITERIA,
        principles: PRINCIPLES,
        indicators,
        score,
    };
}

// ─── ACTUALIZACIÓN DE INDICADORES ──────────────────────────────────────────────

export async function updateIndicator(input: {
    indicatorId: string;
    valueNumeric?: number | null;
    valueText?: string | null;
    valueBool?: boolean | null;
    notes?: string | null;
}) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    const ind = await prisma.welfareIndicator.findUnique({
        where: { id: input.indicatorId },
        include: { assessment: { select: { farmId: true } } },
    });
    if (!ind) throw new Error('Indicador no encontrado');
    await assertFarmOwnership(
        ind.assessment.farmId,
        effectiveUserId,
        callerRole,
    );

    // Validación de rango básico según definición.
    const def = findIndicator(ind.indicatorCode);
    if (def?.valueKind === 'percent' && input.valueNumeric != null) {
        if (input.valueNumeric < 0 || input.valueNumeric > 100) {
            throw new Error('Porcentaje fuera de rango 0-100');
        }
    }

    const updated = await prisma.welfareIndicator.update({
        where: { id: input.indicatorId },
        data: {
            valueNumeric: input.valueNumeric ?? null,
            valueText: input.valueText ?? null,
            valueBool: input.valueBool ?? null,
            notes: input.notes ?? null,
            source: 'manual',
        },
    });

    // Re-puntuar y persistir overall score.
    await recomputeOverallScore(ind.assessmentId);

    revalidatePath('/dashboard');
    return updated;
}

async function recomputeOverallScore(assessmentId: string): Promise<void> {
    const a = await prisma.welfareAssessment.findUnique({
        where: { id: assessmentId },
        include: { indicators: true },
    });
    if (!a) return;
    const values: IndicatorValue[] = a.indicators.map((ind) => ({
        code: ind.indicatorCode,
        valueNumeric: ind.valueNumeric,
        valueText: ind.valueText,
        valueBool: ind.valueBool,
        source: ind.source as 'manual' | 'auto',
    }));
    const score = scoreAssessment(values, a.protocol as WelfareProtocol);
    await prisma.welfareAssessment.update({
        where: { id: assessmentId },
        data: { overallScore: score.overall },
    });

    // Persistir status + score por indicador para que la UI no recalcule.
    for (const ind of a.indicators) {
        const s = score.indicators.find((i) => i.code === ind.indicatorCode);
        if (s) {
            await prisma.welfareIndicator.update({
                where: { id: ind.id },
                data: { score: s.score, status: s.status },
            });
        }
    }
}

// ─── PRE-RELLENADO AUTOMÁTICO ──────────────────────────────────────────────────

/**
 * Pre-rellena los indicadores derivables de la BD para una evaluación
 * existente. No pisa valores `manual` introducidos por el usuario:
 * solo escribe sobre filas que aún no tienen valor o ya tenían `source='auto'`.
 */
export async function precomputeAssessment(assessmentId: string): Promise<{
    updated: number;
}> {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    const a = await prisma.welfareAssessment.findUnique({
        where: { id: assessmentId },
        select: { farmId: true },
    });
    if (!a) throw new Error('Evaluación no encontrada');
    await assertFarmOwnership(a.farmId, effectiveUserId, callerRole);

    const farmId = a.farmId;

    // Recolectar inputs del rebaño y la finca.
    const inactive = new Set([
        'sacrificado', 'muerto', 'vendido', 'baja', 'inactivo', 'retirado',
    ]);
    const animals = await prisma.animal.findMany({
        where: { farmId },
        select: { id: true, status: true, exitDate: true },
    });
    const active = animals.filter(
        (an) => !an.status || !inactive.has(an.status.toLowerCase()),
    );
    const oneYearAgo = new Date(Date.now() - 365 * 86_400_000);
    const deathsLast12m = animals.filter(
        (an) =>
            an.status?.toLowerCase() === 'muerto' &&
            an.exitDate &&
            an.exitDate >= oneYearAgo,
    ).length;

    const weights = await prisma.weight.findMany({
        where: { animalId: { in: active.map((x) => x.id) } },
        select: { animalId: true, date: true, weightKg: true },
        orderBy: { date: 'desc' },
    });
    const seen = new Set<string>();
    const lastByAnimal: Array<{ weightKg: number; daysSinceWeighing: number }> = [];
    for (const w of weights) {
        if (seen.has(w.animalId)) continue;
        seen.add(w.animalId);
        lastByAnimal.push({
            weightKg: w.weightKg,
            daysSinceWeighing: (Date.now() - w.date.getTime()) / 86_400_000,
        });
    }

    const treatmentsLast12m = await prisma.healthRecord.count({
        where: {
            animal: { farmId },
            appliedAt: { gte: oneYearAgo },
        },
    });

    const corrals = await prisma.corral.findMany({
        where: { farmId },
        select: { surfaceM2: true, kind: true, hasShade: true, hasWater: true },
    });
    const coveredShelterM2 = corrals
        .filter((c) =>
            ['cubierto', 'paritorio', 'enfermeria', 'cementado_silo'].includes(
                c.kind,
            ),
        )
        .reduce((acc, c) => acc + (c.surfaceM2 ?? 0), 0);
    const anyShade = corrals.some((c) => c.hasShade);
    const waterPoints = corrals.filter((c) => c.hasWater).length;

    const heatStressRows = await prisma.farmDaily.findMany({
        where: {
            farmId,
            date: { gte: oneYearAgo },
            heatStressIndex: { gt: 72 },
        },
        select: { id: true },
    });

    // % días en pasto a partir del dossier de trazabilidad (Sprint 4.3).
    let pastureDaysPct = 100;
    try {
        const trace = await getGrazingTraceability({ farmId });
        pastureDaysPct = trace.rebanio.pctPasto;
    } catch {
        // si el ganadero todavía no usa pastoreo, asumimos 100% extensivo.
    }

    const autoValues = precomputeIndicators({
        activeHeadcount: active.length,
        weightSamples: lastByAnimal,
        deathsLast12m,
        treatmentsLast12m,
        coveredShelterM2,
        anyShade,
        heatStressDays: heatStressRows.length,
        pastureDaysPct,
        waterPoints,
    });

    // Aplicar a las filas existentes — solo si source no es 'manual'.
    let updated = 0;
    for (const v of autoValues) {
        const row = await prisma.welfareIndicator.findFirst({
            where: { assessmentId, indicatorCode: v.code },
        });
        if (!row) continue;
        if (row.source === 'manual' && (row.valueNumeric != null || row.valueBool != null)) {
            continue;
        }
        await prisma.welfareIndicator.update({
            where: { id: row.id },
            data: {
                valueNumeric: v.valueNumeric ?? null,
                valueBool: v.valueBool ?? null,
                source: 'auto',
            },
        });
        updated++;
    }

    await recomputeOverallScore(assessmentId);
    revalidatePath('/dashboard');
    return { updated };
}

// ─── DOSSIER EXPORTABLE ────────────────────────────────────────────────────────

export interface WelfareDossier {
    meta: {
        farmId: string;
        farmName: string;
        farmLicense: string | null;
        protocol: WelfareProtocol;
        date: Date;
        auditorName: string | null;
    };
    score: AssessmentScore;
    indicators: AssessmentDetail['indicators'];
    generadoEn: Date;
}

export async function getWelfareDossier(assessmentId: string): Promise<WelfareDossier> {
    const detail = await getAssessmentDetail(assessmentId);
    const farm = await prisma.farm.findUnique({
        where: { id: detail.assessment.farmId },
        select: { name: true, license: true },
    });
    return {
        meta: {
            farmId: detail.assessment.farmId,
            farmName: farm?.name ?? 'Finca',
            farmLicense: farm?.license ?? null,
            protocol: detail.assessment.protocol,
            date: detail.assessment.date,
            auditorName: detail.assessment.auditorName,
        },
        score: detail.score,
        indicators: detail.indicators,
        generadoEn: new Date(),
    };
}

export async function updateAssessmentMeta(input: {
    id: string;
    status?: string;
    auditorName?: string | null;
    notes?: string | null;
}) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    const a = await prisma.welfareAssessment.findUnique({
        where: { id: input.id },
        select: { farmId: true },
    });
    if (!a) throw new Error('Evaluación no encontrada');
    await assertFarmOwnership(a.farmId, effectiveUserId, callerRole);

    const result = await prisma.welfareAssessment.update({
        where: { id: input.id },
        data: {
            ...(input.status ? { status: input.status } : {}),
            ...(input.auditorName !== undefined
                ? { auditorName: input.auditorName }
                : {}),
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
        },
    });
    revalidatePath('/dashboard');
    return result;
}

void findCriterion; // re-export silenciado para evitar tree-shake en bundle
