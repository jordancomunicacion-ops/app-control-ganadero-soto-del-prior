// =============================================================================
// ROTATION ENGINE — sugerencias de rotación de cultivos
// =============================================================================
//
// Reglas agronómicas codificadas (FAO, INIA-CSIC, MAPA):
//
//   1. No repetir la MISMA familia dos años seguidos (riesgo
//      autotoxicidad + plagas: pythium, nematodos).
//   2. Después de una LEGUMINOSA, plantar un CEREAL aprovecha el
//      nitrógeno fijado biológicamente (50-100 kg N/ha).
//   3. Después de un CEREAL, plantar una LEGUMINOSA O un BARBECHO
//      restaura fertilidad y rompe ciclo de malas hierbas gramíneas.
//   4. Maíz / Sorgo (cereales de verano agresivos) → preferentemente
//      leguminosa siguiente, nunca otro cereal de verano.
//   5. Alfalfa / Esparceta pluri-anuales: tras 3-5 años se rotan a
//      cereal o cultivo no-leguminoso para evitar autotoxicidad.
//   6. Pradera permanente: ciclo natural sin rotación obligada, pero
//      conviene resembrar parcialmente cada 4-6 años para mantener la
//      mezcla óptima.
//
// Compatible con el ecorrégimen P4 de la PAC (rotación con especies
// mejorantes), que exige al menos 1 leguminosa o 1 mejorante cada 4 años.

import { CROP_CATALOG, type CropDefinition, type CropFamily } from './cropCalendar';

export interface RotationContext {
    annualPrecipMm?: number;
    soilPh?: number;
    slope?: number;
    soilDepthCm?: number;
    isOrganic?: boolean;
}

export interface RotationSuggestion {
    cropId: string;
    cropName: string;
    family: CropFamily;
    rationale: string;
    pacComplianceP4?: boolean; // contribuye al ecorregimen P4
}

const FAMILIES_CEREAL = new Set<CropFamily>(['Cereal Invierno', 'Cereal Verano']);
const FAMILIES_LEGUMINOSA = new Set<CropFamily>(['Leguminosa Anual', 'Leguminosa Perenne']);

function findCrop(id: string): CropDefinition | undefined {
    return CROP_CATALOG.find((c) => c.id === id);
}

/**
 * Dado el cultivo del año anterior, sugiere el siguiente cultivo
 * cumpliendo las reglas agronómicas.
 */
export function suggestNextCrop(
    previousCropId: string,
    ctx: RotationContext = {},
): RotationSuggestion[] {
    const prev = findCrop(previousCropId);
    if (!prev) return [];

    const suggestions: RotationSuggestion[] = [];

    // Regla 1: nunca misma familia
    const candidates = CROP_CATALOG.filter((c) => c.family !== prev.family && c.id !== prev.id);

    for (const c of candidates) {
        let rationale = '';
        let preferred = false;

        // Regla 2: leguminosa → cereal (aprovecha N)
        if (FAMILIES_LEGUMINOSA.has(prev.family) && FAMILIES_CEREAL.has(c.family)) {
            rationale = `Aprovecha el nitrógeno fijado por ${prev.name}`;
            preferred = true;
        }
        // Regla 3: cereal → leguminosa o barbecho
        else if (FAMILIES_CEREAL.has(prev.family) && (FAMILIES_LEGUMINOSA.has(c.family) || c.family === 'Barbecho')) {
            rationale = `Rompe ciclo de malas hierbas gramíneas y restaura fertilidad`;
            preferred = true;
        }
        // Regla 4: maíz/sorgo → solo leguminosa
        else if (prev.family === 'Cereal Verano' && FAMILIES_LEGUMINOSA.has(c.family)) {
            rationale = `Recupera nitrógeno consumido por el cereal de verano`;
            preferred = true;
        }
        // Regla 5: alfalfa o pradera perenne → cualquier no-leguminosa
        else if (prev.family === 'Leguminosa Perenne' && !FAMILIES_LEGUMINOSA.has(c.family) && c.family !== 'Barbecho') {
            rationale = `Romper ciclo de la leguminosa perenne tras 3-5 años de cultivo`;
            preferred = true;
        }

        // Filtros de contexto
        if (!agronomicallyFeasible(c, ctx)) continue;

        // Solo añadimos las preferidas; si quedaran fuera filtramos al final
        if (preferred) {
            suggestions.push({
                cropId: c.id,
                cropName: c.name,
                family: c.family,
                rationale,
                pacComplianceP4: FAMILIES_LEGUMINOSA.has(c.family) || !!c.fixesNitrogen,
            });
        }
    }

    // Si por contexto no hay preferidas, devolver todas las admisibles que no
    // sean misma familia, con rationale neutro.
    if (suggestions.length === 0) {
        for (const c of candidates) {
            if (!agronomicallyFeasible(c, ctx)) continue;
            suggestions.push({
                cropId: c.id,
                cropName: c.name,
                family: c.family,
                rationale: `Rotación admisible — diferente familia que ${prev.name}`,
                pacComplianceP4: FAMILIES_LEGUMINOSA.has(c.family) || !!c.fixesNitrogen,
            });
        }
    }

    return suggestions;
}

function agronomicallyFeasible(crop: CropDefinition, ctx: RotationContext): boolean {
    if (crop.precipMin && ctx.annualPrecipMm !== undefined && ctx.annualPrecipMm < crop.precipMin * 0.7) return false;
    if (crop.phMin && ctx.soilPh !== undefined && ctx.soilPh < crop.phMin - 0.3) return false;
    if (crop.phMax && ctx.soilPh !== undefined && ctx.soilPh > crop.phMax + 0.3) return false;
    if (crop.maxSlopePct !== undefined && ctx.slope !== undefined && ctx.slope > crop.maxSlopePct) return false;
    if (crop.soilDepthMinCm && ctx.soilDepthCm !== undefined && ctx.soilDepthCm < crop.soilDepthMinCm) return false;
    return true;
}

// =============================================================================
// PLAN PLURIANUAL
// =============================================================================

export interface RotationPlanYear {
    year: number;
    cropId: string;
    cropName: string;
    family: CropFamily;
    rationale: string;
}

/**
 * Genera un plan de rotación a N años a partir de un cultivo inicial.
 * Aplica las reglas iterativamente.
 */
export function buildRotationPlan(
    initialCropId: string,
    years: number,
    ctx: RotationContext = {},
    startYear = new Date().getFullYear(),
): RotationPlanYear[] {
    const plan: RotationPlanYear[] = [];
    const initial = findCrop(initialCropId);
    if (!initial) return plan;

    plan.push({
        year: startYear,
        cropId: initial.id,
        cropName: initial.name,
        family: initial.family,
        rationale: 'Cultivo inicial declarado',
    });

    let prevId = initialCropId;
    for (let i = 1; i < years; i++) {
        const suggestions = suggestNextCrop(prevId, ctx);
        if (suggestions.length === 0) break;
        const next = suggestions[0]; // toma el primero (preferente)
        plan.push({
            year: startYear + i,
            cropId: next.cropId,
            cropName: next.cropName,
            family: next.family,
            rationale: next.rationale,
        });
        prevId = next.cropId;
    }

    return plan;
}

// =============================================================================
// COMPLIANCE PAC ECORREGIMEN P4
// =============================================================================

/**
 * Verifica si una secuencia de cultivos cumple el ecorregimen P4
 * (rotación con especies mejorantes): al menos un cultivo mejorante
 * (leguminosa o no-cereal fijador de N) cada 4 años.
 */
export function compliesWithP4(rotation: Array<{ cropId: string }>): boolean {
    if (rotation.length < 4) return false;
    const window = rotation.slice(-4);
    const hasImprover = window.some((r) => {
        const c = findCrop(r.cropId);
        return c && (FAMILIES_LEGUMINOSA.has(c.family) || !!c.fixesNitrogen);
    });
    return hasImprover;
}
