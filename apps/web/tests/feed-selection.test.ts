import { describe, it, expect } from 'vitest';
import {
    scoreFeedFit,
    suggestFeeds,
    suggestRationSkeleton,
    inferClimateZone,
    type FarmAgronomicContext,
    type AnimalAgronomicContext,
} from '@/services/feedSelectionEngine';
import { FEED_DATABASE } from '@/services/feedDatabase';
import { SoilEngine } from '@/services/soilEngine';

// =============================================================================
// FEED DATABASE INTEGRITY
// =============================================================================

describe('feedDatabase integrity', () => {
    it('all entries have unique IDs', () => {
        const ids = FEED_DATABASE.map((f) => f.id);
        const uniq = new Set(ids);
        expect(uniq.size).toBe(ids.length);
    });

    it('Mediterranean-relevant feeds are populated (50+ feeds total)', () => {
        expect(FEED_DATABASE.length).toBeGreaterThanOrEqual(45);
    });

    it('dehesa seasonal pasture variants exist (spring/summer/autumn/winter)', () => {
        const seasons = ['F01_SPRING', 'F01_SUMMER', 'F01_AUTUMN', 'F01_WINTER'];
        for (const id of seasons) {
            expect(FEED_DATABASE.find((f) => f.id === id)).toBeDefined();
        }
    });

    it('acorn variants differ in oleic content (encina > roble)', () => {
        const encina = FEED_DATABASE.find((f) => f.id === 'BELLHO_01')!;
        const roble = FEED_DATABASE.find((f) => f.id === 'BELLRO_01')!;
        expect(encina.oleic_pct_dm!).toBeGreaterThan(roble.oleic_pct_dm!);
    });

    it('protein concentrates have RUP defined', () => {
        const proteins = ['P01', 'P02', 'P_SUN', 'P_COT', 'P_GLUTEN_MEAL', 'P_LUPIN'];
        for (const id of proteins) {
            const f = FEED_DATABASE.find((x) => x.id === id)!;
            expect(f.rup_pct_cp).toBeDefined();
            expect(f.rup_pct_cp).toBeGreaterThan(0);
        }
    });

    it('rapeseed has higher RUP than soybean (Feedipedia: 48 % vs 30 %)', () => {
        const soy = FEED_DATABASE.find((f) => f.id === 'P01')!;
        const colza = FEED_DATABASE.find((f) => f.id === 'P02')!;
        expect(colza.rup_pct_cp!).toBeGreaterThan(soy.rup_pct_cp!);
    });

    it('corn gluten meal has the highest RUP among standard proteins (~70 %)', () => {
        const gluten = FEED_DATABASE.find((f) => f.id === 'P_GLUTEN_MEAL')!;
        expect(gluten.rup_pct_cp!).toBeGreaterThanOrEqual(65);
    });

    it('forages classified as low acidosis risk; cereals as high', () => {
        const forage = FEED_DATABASE.find((f) => f.id === 'F01_SPRING')!;
        const maize = FEED_DATABASE.find((f) => f.id === 'C01')!;
        expect(forage.acidosis_risk).toBe('low');
        expect(maize.acidosis_risk).toBe('high');
    });
});

// =============================================================================
// CLIMATE INFERENCE
// =============================================================================

describe('inferClimateZone', () => {
    it('low precip + warm → Mediterranean_dry', () => {
        expect(inferClimateZone({ avg_annual_temp_c: 16, annual_precip_mm: 400 })).toBe('Mediterranean_dry');
    });

    it('moderate precip + warm → Mediterranean_humid', () => {
        expect(inferClimateZone({ avg_annual_temp_c: 14, annual_precip_mm: 650 })).toBe('Mediterranean_humid');
    });

    it('high precip + moderate → Atlantic', () => {
        expect(inferClimateZone({ avg_annual_temp_c: 12, annual_precip_mm: 900 })).toBe('Atlantic');
    });

    it('cold → Mountain', () => {
        expect(inferClimateZone({ avg_annual_temp_c: 6, annual_precip_mm: 900 })).toBe('Mountain');
    });

    it('explicit climate_zone wins over computed', () => {
        const zone = inferClimateZone({ climate_zone: 'Continental', avg_annual_temp_c: 16, annual_precip_mm: 400 });
        expect(zone).toBe('Continental');
    });
});

// =============================================================================
// SCORING — KEY MATCHING SCENARIOS
// =============================================================================

describe('scoreFeedFit — Mediterranean dry / Rustic_European', () => {
    const dehesaSpring: FarmAgronomicContext = {
        climate_zone: 'Mediterranean_dry',
        annual_precip_mm: 450,
        avg_annual_temp_c: 16,
        soil_drainage: 'Medio-Rápido',
        soil_ph: 6.5,
        slope_pct: 8,
    };
    const moruchaCow: AnimalAgronomicContext = {
        biological_type: 'Rustic_European',
        age_months: 36,
        sex: 'Hembra',
        objective: 'Mantenimiento',
    };

    it('Pasto Dehesa Primavera puntúa alto en dehesa rústica mediterránea', () => {
        const pasto = FEED_DATABASE.find((f) => f.id === 'F01_SPRING')!;
        const fit = scoreFeedFit(pasto, dehesaSpring, moruchaCow);
        expect(fit.score).toBeGreaterThan(60);
    });

    it('Maíz forrajero requiere mucha agua y no encaja en dehesa seca', () => {
        const maizFor = FEED_DATABASE.find((f) => f.id === 'F05')!;
        const fit = scoreFeedFit(maizFor, dehesaSpring, moruchaCow);
        // min_annual_precip_mm 500 vs 450 actual → debe haber warning
        expect(fit.warnings.some((w) => w.includes('precipitación'))).toBe(true);
    });

    it('Sulla y esparceta puntúan más alto que alfalfa en dehesa <500mm', () => {
        const sulla = FEED_DATABASE.find((f) => f.id === 'F_SULLA')!;
        const alfalfa = FEED_DATABASE.find((f) => f.id === 'F04')!;
        const sullaFit = scoreFeedFit(sulla, dehesaSpring, moruchaCow);
        const alfalfaFit = scoreFeedFit(alfalfa, dehesaSpring, moruchaCow);
        // Sulla tolerates 400mm rainfed, alfalfa needs 500mm → sulla wins
        expect(sullaFit.score).toBeGreaterThan(alfalfaFit.score);
    });
});

describe('scoreFeedFit — Atlantic / Dairy', () => {
    const atlanticFarm: FarmAgronomicContext = {
        climate_zone: 'Atlantic',
        annual_precip_mm: 1200,
        avg_annual_temp_c: 12,
        soil_drainage: 'Medio-Lento',
        soil_ph: 6.0,
        slope_pct: 5,
    };
    const dairyCow: AnimalAgronomicContext = {
        biological_type: 'Dairy',
        age_months: 48,
        sex: 'Hembra',
        objective: 'Recría',
    };

    it('Ryegrass italiano y ensilado de hierba dominan en Atlántico dairy', () => {
        const top = suggestFeeds(atlanticFarm, dairyCow, { category: 'Forraje', maxN: 3 });
        const ids = top.map((r) => r.feed.id);
        expect(ids).toContain('F02');
        expect(ids).toContain('F05_GRASS');
    });
});

describe('scoreFeedFit — Continental / Cebo (feedlot)', () => {
    const continental: FarmAgronomicContext = {
        climate_zone: 'Continental',
        annual_precip_mm: 550,
        avg_annual_temp_c: 13,
        soil_drainage: 'Medio',
        soil_ph: 6.8,
    };
    const feedlotBull: AnimalAgronomicContext = {
        biological_type: 'Continental',
        age_months: 14,
        sex: 'Macho',
        objective: 'Cebo (Máximo Crecimiento)',
    };

    it('Maíz y DDGS aparecen en top energéticos para cebo continental', () => {
        const top = suggestFeeds(continental, feedlotBull, { category: 'Concentrado', maxN: 5 });
        const ids = top.map((r) => r.feed.id);
        expect(ids.some((i) => i === 'C01' || i === 'C04')).toBe(true);
    });

    it('Cebada cubre el cebo en clima continental', () => {
        const cebada = FEED_DATABASE.find((f) => f.id === 'C02')!;
        const fit = scoreFeedFit(cebada, continental, feedlotBull);
        expect(fit.score).toBeGreaterThan(50);
        // Cereal en cebo: alta acidosis → debe haber warning
        expect(fit.warnings.some((w) => /acidosis/.test(w))).toBe(true);
    });
});

describe('scoreFeedFit — Bos indicus + fibra alta (Hunter & Siebert 1985)', () => {
    const tropical: FarmAgronomicContext = {
        climate_zone: 'Universal_byproduct',
        annual_precip_mm: 900,
        avg_annual_temp_c: 24,
        soil_drainage: 'Medio',
        soil_ph: 6.5,
    };
    const brahman: AnimalAgronomicContext = {
        biological_type: 'Indicus',
        brahman_percent: 1.0,
        age_months: 24,
        sex: 'Macho',
        objective: 'Recría',
    };

    it('Cascarilla de soja (NDF 66 %) bonifica para Bos indicus', () => {
        const cascarilla = FEED_DATABASE.find((f) => f.id === 'C06')!;
        const fit = scoreFeedFit(cascarilla, tropical, brahman);
        expect(fit.reasons.some((r) => /indicus|fibra/i.test(r))).toBe(true);
    });
});

// =============================================================================
// SOIL INTEGRATION
// =============================================================================

describe('Soil integration', () => {
    it('Arcilloso (lento) bonifica festuca, penaliza alfalfa', () => {
        const arcilloso = SoilEngine.getSoilById('1');
        expect(arcilloso).toBeDefined();
        const farm: FarmAgronomicContext = { soil_id: '1', climate_zone: 'Atlantic', annual_precip_mm: 700 };
        const animal: AnimalAgronomicContext = { biological_type: 'Rustic_European', objective: 'Mantenimiento' };
        const festuca = FEED_DATABASE.find((f) => f.id === 'F_FESTUCA')!;
        const alfalfa = FEED_DATABASE.find((f) => f.id === 'F04')!;
        const fitFestuca = scoreFeedFit(festuca, farm, animal);
        const fitAlfalfa = scoreFeedFit(alfalfa, farm, animal);
        expect(fitFestuca.score).toBeGreaterThan(fitAlfalfa.score);
    });
});

// =============================================================================
// SKELETON FOR RATION
// =============================================================================

describe('suggestRationSkeleton', () => {
    it('Dehesa cebo: devuelve forage + energy + protein concretos', () => {
        const farm: FarmAgronomicContext = {
            climate_zone: 'Mediterranean_dry',
            annual_precip_mm: 450,
            soil_id: '5', // Franco-Arenoso
            slope_pct: 10,
        };
        const animal: AnimalAgronomicContext = {
            biological_type: 'Rustic_European',
            age_months: 15,
            sex: 'Macho',
            objective: 'Cebo (Máximo Crecimiento)',
        };
        const sk = suggestRationSkeleton(farm, animal);
        expect(sk.forage).toBeDefined();
        expect(sk.energy).toBeDefined();
        expect(sk.protein).toBeDefined();
    });

    it('Ecológico filtrado correctamente', () => {
        const farm: FarmAgronomicContext = { climate_zone: 'Mediterranean_humid', annual_precip_mm: 700 };
        const animal: AnimalAgronomicContext = { biological_type: 'Rustic_European', objective: 'Recría' };
        const top = suggestFeeds(farm, animal, { onlyEcological: true, maxN: 5 });
        for (const r of top) expect(r.feed.is_ecological).toBe(true);
    });

    it('onlyLocal devuelve solo materias primas ibéricas', () => {
        const farm: FarmAgronomicContext = { climate_zone: 'Mediterranean_dry', annual_precip_mm: 450 };
        const animal: AnimalAgronomicContext = { biological_type: 'Rustic_European', objective: 'Cebo' };
        const top = suggestFeeds(farm, animal, { onlyLocal: true, maxN: 8 });
        expect(top.length).toBeGreaterThan(0);
        for (const r of top) expect(r.feed.is_local_spain).toBe(true);
    });
});
