// =============================================================================
// FEED SELECTION ENGINE
// =============================================================================
//
// Puntúa cada alimento de FEED_DATABASE para un contexto (finca, animal,
// objetivo). El resultado se usa por `generateSmartDiet` y por la UI para
// proponer alternativas locales al usuario.
//
// Modelo de scoring (0-100):
//   1. Soil match (drainage + pH + slope) — 25 pts
//   2. Climate match (zone + precipitation) — 25 pts
//   3. Breed biotype affinity — 20 pts
//   4. Objective fit (energy, protein, fiber para el estado) — 20 pts
//   5. Seasonal availability — 10 pts
//
// Penalizaciones (no son sumas, son flags que se restan):
//   - Acidosis risk vs objective
//   - Bloat risk vs forage type
//
// Fuentes para el match agronómico:
//   - SoilEngine (mismo drenaje/pH del SOIL_DATABASE)
//   - Khan 2012, AFRC 1993 (fiber requirements)
//   - Bos taurus vs indicus comparative digestion (Cambridge BJN 2008)

import type {
    BiologicalType,
    ClimateZone,
    FeedItem,
    SoilDrainage,
} from './feedDatabase';
import { FEED_DATABASE } from './feedDatabase';
import { SoilEngine } from './soilEngine';

export interface FarmAgronomicContext {
    /** Climate zone (derived from coords + WeatherService.analyzeClimate). */
    climate_zone?: ClimateZone;
    /** Annual precipitation, mm — for rainfed feasibility. */
    annual_precip_mm?: number;
    /** Average annual temperature, °C. */
    avg_annual_temp_c?: number;
    /** Soil id from SoilEngine — used to resolve drainage and pH. */
    soil_id?: string;
    /** Optional override: explicit drainage. */
    soil_drainage?: SoilDrainage;
    /** Optional override: explicit pH. */
    soil_ph?: number;
    /** Slope in % of the parcel. */
    slope_pct?: number;
    /** Production system label as used elsewhere ("Montanera", "Extensivo"...). */
    feeding_system?: string;
}

export interface AnimalAgronomicContext {
    biological_type?: BiologicalType;
    brahman_percent?: number;
    age_months?: number;
    sex?: string;
    /** UI objective string (Mantenimiento / Recría / Cebo / Acabado / Calidad...). */
    objective?: string;
}

export interface FeedFitResult {
    feed: FeedItem;
    score: number;
    reasons: string[];
    warnings: string[];
}

const MAX_SCORE = 100;

function classifyClimateFromAnalysis(avgTempC: number, annualPrecipMm: number): ClimateZone {
    if (avgTempC >= 14 && annualPrecipMm < 500) return 'Mediterranean_dry';
    if (avgTempC >= 12 && annualPrecipMm < 800) return 'Mediterranean_humid';
    if (avgTempC < 8) return 'Mountain';
    if (annualPrecipMm >= 800 && avgTempC >= 10 && avgTempC <= 15) return 'Atlantic';
    return 'Continental';
}

function resolveSoilParams(ctx: FarmAgronomicContext): {
    drainage?: SoilDrainage;
    ph?: number;
} {
    if (ctx.soil_drainage || ctx.soil_ph) {
        return { drainage: ctx.soil_drainage, ph: ctx.soil_ph };
    }
    if (ctx.soil_id) {
        const soil = SoilEngine.getSoilById(ctx.soil_id);
        if (soil) return { drainage: soil.drainage as SoilDrainage, ph: soil.ph_typical };
    }
    return {};
}

export function inferClimateZone(ctx: FarmAgronomicContext): ClimateZone | undefined {
    if (ctx.climate_zone) return ctx.climate_zone;
    if (ctx.avg_annual_temp_c !== undefined && ctx.annual_precip_mm !== undefined) {
        return classifyClimateFromAnalysis(ctx.avg_annual_temp_c, ctx.annual_precip_mm);
    }
    return undefined;
}

// ───────────────────────────────────────────────────────────────────────────
// SCORING PRIMITIVES
// ───────────────────────────────────────────────────────────────────────────

function scoreSoilMatch(feed: FeedItem, ctx: FarmAgronomicContext): { pts: number; reason?: string; warn?: string } {
    // Subproductos y suplementos no dependen del suelo local — neutro.
    if (feed.is_byproduct || feed.is_fat_supplement || feed.crop_kind === 'mineral_supplement') {
        return { pts: 20 };
    }

    const { drainage, ph } = resolveSoilParams(ctx);
    const slope = ctx.slope_pct;

    let pts = 25;
    const reasons: string[] = [];
    let warn: string | undefined;

    // Drainage
    if (feed.soil_drainage_pref && drainage) {
        if (feed.soil_drainage_pref.includes(drainage)) {
            reasons.push(`drenaje compatible (${drainage})`);
        } else {
            pts -= 10;
            warn = `drenaje del suelo (${drainage}) fuera del rango óptimo`;
        }
    }
    // pH
    if (feed.soil_ph_min !== undefined && feed.soil_ph_max !== undefined && ph !== undefined) {
        if (ph >= feed.soil_ph_min && ph <= feed.soil_ph_max) {
            reasons.push(`pH ${ph} dentro del rango ${feed.soil_ph_min}-${feed.soil_ph_max}`);
        } else {
            pts -= 8;
            warn = `pH del suelo (${ph}) fuera del rango ${feed.soil_ph_min}-${feed.soil_ph_max}`;
        }
    }
    // Slope
    if (feed.slope_max_pct !== undefined && slope !== undefined && slope > feed.slope_max_pct) {
        pts -= 6;
        warn = `pendiente ${slope}% > máximo ${feed.slope_max_pct}% del cultivo`;
    }

    return { pts: Math.max(0, pts), reason: reasons.length ? reasons.join(', ') : undefined, warn };
}

function scoreClimateMatch(feed: FeedItem, ctx: FarmAgronomicContext): { pts: number; reason?: string; warn?: string } {
    if (feed.is_byproduct || feed.is_fat_supplement || feed.crop_kind === 'mineral_supplement') {
        return { pts: 20 };
    }

    const zone = inferClimateZone(ctx);
    const precip = ctx.annual_precip_mm;

    let pts = 25;
    const reasons: string[] = [];
    let warn: string | undefined;

    if (feed.climate_zones && zone) {
        if (feed.climate_zones.includes(zone) || feed.climate_zones.includes('Universal_byproduct')) {
            reasons.push(`zona climática ${zone} apta`);
        } else {
            pts -= 12;
            warn = `cultivo poco adecuado a clima ${zone}`;
        }
    }

    if (feed.min_annual_precip_mm !== undefined && precip !== undefined) {
        if (precip >= feed.min_annual_precip_mm) {
            reasons.push(`precipitación ${precip} mm cubre mínimo ${feed.min_annual_precip_mm}`);
        } else {
            pts -= 10;
            warn = `precipitación ${precip} < requerida ${feed.min_annual_precip_mm} mm — necesitaría riego`;
        }
    }

    return { pts: Math.max(0, pts), reason: reasons.length ? reasons.join(', ') : undefined, warn };
}

function scoreBreedMatch(feed: FeedItem, animal: AnimalAgronomicContext): { pts: number; reason?: string } {
    if (!animal.biological_type || !feed.biotype_affinity) return { pts: 12 };
    if (feed.biotype_affinity.includes(animal.biological_type)) {
        return { pts: 20, reason: `afinidad con biotipo ${animal.biological_type}` };
    }

    // Bos indicus + alta fibra: bonus específico documentado (Cambridge BJN
    // 2008 — Bos indicus aprovecha mejor forrajes <53 % digestibilidad).
    if (
        (animal.biological_type === 'Indicus' || (animal.brahman_percent ?? 0) >= 0.5) &&
        feed.ndf_pct_dm !== undefined &&
        feed.ndf_pct_dm > 55
    ) {
        return { pts: 16, reason: 'Bos indicus aprovecha bien fibra > 55 % NDF (Hunter & Siebert 1985)' };
    }

    return { pts: 8 };
}

function scoreObjectiveMatch(feed: FeedItem, animal: AnimalAgronomicContext): { pts: number; reason?: string; warn?: string } {
    const obj = (animal.objective || '').toLowerCase();
    if (!obj) return { pts: 10 };

    const energy = feed.energy_mcal;
    const protein = feed.protein_percent;
    const ndf = feed.ndf_pct_dm ?? feed.fiber_percent ?? 0;
    let pts = 20;
    let reason: string | undefined;
    let warn: string | undefined;

    if (obj.includes('manten')) {
        // Mantenimiento: bajos requisitos, prioriza forraje.
        if (feed.category === 'Forraje' && energy < 1.6) {
            reason = 'forraje compatible con mantenimiento';
        } else if (feed.category === 'Suplemento') {
            pts = 5;
        } else if (energy > 2.0) {
            pts = 5;
            warn = 'energía elevada para mantenimiento';
        }
    } else if (obj.includes('recr')) {
        // Recría: crecimiento moderado, balance proteína + fibra.
        if (protein >= 13 && energy >= 1.4 && energy <= 2.0 && ndf < 55) {
            reason = 'balance proteína/energía/fibra ideal para recría';
        } else if (energy > 2.1) {
            pts = 10;
            warn = 'demasiado energético — acelera cebo no recría';
        }
    } else if (obj.includes('cebo')) {
        // Cebo máximo crecimiento: alta energía, almidón controlado.
        if (energy >= 1.9 || feed.starch_pct_dm !== undefined && feed.starch_pct_dm > 35) {
            reason = 'alta densidad energética para cebo';
        } else if (energy < 1.4 && feed.category === 'Concentrado') {
            pts = 8;
        }
    } else if (obj.includes('acabado') || obj.includes('calidad')) {
        // Acabado / Calidad: oleico + maduración, no proteína alta.
        if ((feed.oleic_pct_dm ?? 0) > 1.5) {
            reason = 'alto oleico (Viera 2024) — favorece infiltración';
        } else if (feed.id === 'LECITHIN_PROT') {
            reason = 'lecitina protegida — sinergia con dieta oleica';
        } else if (protein > 18) {
            pts = 10;
            warn = 'proteína alta en acabado promueve músculo y limita marbling';
        }
    } else if (obj.includes('eficiencia')) {
        // Eficiencia económica: cost/Mcal alta.
        const mcalPerEuro = energy / feed.cost_per_kg;
        if (mcalPerEuro >= 8) {
            reason = `${mcalPerEuro.toFixed(1)} Mcal/€ — coste óptimo`;
        }
    }

    return { pts: Math.max(0, pts), reason, warn };
}

function scoreSeasonMatch(feed: FeedItem, currentMonth = new Date().getMonth()): { pts: number; reason?: string; warn?: string } {
    // Subproductos y suplementos siempre disponibles.
    if (feed.is_byproduct || feed.is_fat_supplement || !feed.season_months) {
        return { pts: 10 };
    }
    if (feed.season_months.includes(currentMonth)) {
        return { pts: 10, reason: 'temporada de producción activa' };
    }
    return { pts: 3, warn: 'fuera de temporada — requiere stock' };
}

function scoreFunctionalRisks(feed: FeedItem, animal: AnimalAgronomicContext): { warnings: string[] } {
    const warnings: string[] = [];
    const obj = (animal.objective || '').toLowerCase();

    if (feed.acidosis_risk === 'high' && obj.includes('cebo')) {
        warnings.push('riesgo acidosis: incluir tampón ruminal y mantener FDN ≥ 18 %');
    }
    if (feed.bloat_risk === 'high') {
        warnings.push('riesgo meteorismo en verde puro — pastorear con cereal o gramínea');
    }
    if (feed.id === 'P04' && (animal.age_months ?? 0) < 8) {
        warnings.push('Urea contraindicada en animales <8 meses');
    }
    if (feed.id === 'P_COT' && (animal.age_months ?? 12) < 6) {
        warnings.push('Harina de algodón: gossypol — evitar en lactantes');
    }
    return { warnings };
}

// ───────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ───────────────────────────────────────────────────────────────────────────

export function scoreFeedFit(
    feed: FeedItem,
    farm: FarmAgronomicContext,
    animal: AnimalAgronomicContext,
): FeedFitResult {
    const reasons: string[] = [];
    const warnings: string[] = [];

    const soil = scoreSoilMatch(feed, farm);
    if (soil.reason) reasons.push(soil.reason);
    if (soil.warn) warnings.push(soil.warn);

    const climate = scoreClimateMatch(feed, farm);
    if (climate.reason) reasons.push(climate.reason);
    if (climate.warn) warnings.push(climate.warn);

    const breed = scoreBreedMatch(feed, animal);
    if (breed.reason) reasons.push(breed.reason);

    const objective = scoreObjectiveMatch(feed, animal);
    if (objective.reason) reasons.push(objective.reason);
    if (objective.warn) warnings.push(objective.warn);

    const season = scoreSeasonMatch(feed);
    if (season.reason) reasons.push(season.reason);
    if (season.warn) warnings.push(season.warn);

    const risks = scoreFunctionalRisks(feed, animal);
    warnings.push(...risks.warnings);

    let score = soil.pts + climate.pts + breed.pts + objective.pts + season.pts;
    // Risk-flag deductions
    score -= risks.warnings.length * 3;
    score = Math.max(0, Math.min(MAX_SCORE, score));

    return { feed, score, reasons, warnings };
}

/**
 * Devuelve los alimentos mejor puntuados, ordenados de mayor a menor.
 *
 * @param farm     Contexto agronómico de la finca
 * @param animal   Contexto fisiológico del animal
 * @param maxN     Número máximo de alimentos a devolver
 * @param filters  Filtros opcionales: solo categoría X, solo locales, etc.
 */
export function suggestFeeds(
    farm: FarmAgronomicContext,
    animal: AnimalAgronomicContext,
    options: {
        maxN?: number;
        category?: FeedItem['category'];
        onlyLocal?: boolean;
        onlyEcological?: boolean;
        excludeIds?: string[];
        minScore?: number;
    } = {},
): FeedFitResult[] {
    const maxN = options.maxN ?? 10;
    const minScore = options.minScore ?? 0;
    const exclude = new Set(options.excludeIds ?? []);

    const scored = FEED_DATABASE.filter((f) => {
        if (exclude.has(f.id)) return false;
        if (options.category && f.category !== options.category) return false;
        if (options.onlyLocal && !f.is_local_spain) return false;
        if (options.onlyEcological && !f.is_ecological) return false;
        return true;
    }).map((feed) => scoreFeedFit(feed, farm, animal));

    return scored
        .filter((r) => r.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxN);
}

/**
 * Helper: returns the best forage + best energy + best protein for the
 * given context. Useful as input to `generateSmartDiet` so the standard
 * ration is built from locally-adapted, climate-fitting ingredients
 * instead of fixed IDs.
 */
export function suggestRationSkeleton(
    farm: FarmAgronomicContext,
    animal: AnimalAgronomicContext,
): { forage?: FeedItem; energy?: FeedItem; protein?: FeedItem } {
    const forageCandidates = suggestFeeds(farm, animal, { category: 'Forraje', maxN: 3 });
    const concentrateCandidates = suggestFeeds(farm, animal, { category: 'Concentrado', maxN: 8 });

    const energyCandidate = concentrateCandidates.find(
        (r) => (r.feed.starch_pct_dm ?? 0) >= 40 || r.feed.energy_mcal >= 1.9,
    );
    const proteinCandidate = concentrateCandidates.find((r) => r.feed.protein_percent >= 25);

    return {
        forage: forageCandidates[0]?.feed,
        energy: energyCandidate?.feed,
        protein: proteinCandidate?.feed,
    };
}
