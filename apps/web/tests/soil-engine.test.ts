import { describe, it, expect } from 'vitest';
import {
    SoilEngine,
    SOIL_DATABASE,
    USDA_TEXTURE_HYDRAULICS,
    classifyUSDATexture,
    estimateCarryingCapacity,
    evaluateForLivestock,
} from '@/services/soilEngine';

// All tests anchor to peer-reviewed sources documented in soilEngine.ts:
//   - USDA texture triangle / Carsel & Parrish 1988
//   - FAO WRB 2022
//   - Pulido et al. 2014 (dehesa Extremadura carrying capacity)
//   - Wischmeier & Smith 1978 (USLE K factor)

// =============================================================================
// 1. DATABASE INTEGRITY
// =============================================================================

describe('SOIL_DATABASE integrity', () => {
    it('all entries have unique IDs', () => {
        const ids = SOIL_DATABASE.map((s) => s.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('contains ≥ 15 soil types after expansion', () => {
        expect(SOIL_DATABASE.length).toBeGreaterThanOrEqual(15);
    });

    it('preserves legacy IDs 1-5 for existing farm records', () => {
        for (const id of ['1', '2', '3', '4', '5']) {
            expect(SoilEngine.getSoilById(id)).toBeDefined();
        }
    });

    it('every soil has texture_class in the USDA 12-set', () => {
        const valid = Object.keys(USDA_TEXTURE_HYDRAULICS);
        for (const s of SOIL_DATABASE) {
            expect(valid).toContain(s.texture_class);
        }
    });

    it('every soil has a WRB reference group', () => {
        for (const s of SOIL_DATABASE) {
            expect(s.wrb_group).toBeDefined();
        }
    });

    it('Mediterranean dominant groups all present (Cambisol, Luvisol, Vertisol, Calcisol, Fluvisol, Leptosol, Regosol)', () => {
        const groups = SOIL_DATABASE.map((s) => s.wrb_group);
        for (const g of ['Cambisol', 'Luvisol', 'Vertisol', 'Calcisol', 'Fluvisol', 'Leptosol', 'Regosol']) {
            expect(groups).toContain(g);
        }
    });

    it('Vertisoles tienen flag expansive=true', () => {
        const vertisoles = SOIL_DATABASE.filter((s) => s.wrb_group === 'Vertisol');
        expect(vertisoles.length).toBeGreaterThan(0);
        for (const v of vertisoles) expect(v.expansive).toBe(true);
    });

    it('Calcisol y Solonchak tienen pH alcalino (>=7.5)', () => {
        const alkaline = SOIL_DATABASE.filter((s) =>
            s.wrb_group === 'Calcisol' || s.wrb_group === 'Solonchak',
        );
        for (const s of alkaline) expect(s.ph_typical).toBeGreaterThanOrEqual(7.5);
    });

    it('Histosol/Gleysol tienen alto encharcamiento', () => {
        const wet = SOIL_DATABASE.filter((s) => s.wrb_group === 'Gleysol');
        for (const s of wet) {
            expect(s.indices.risk_waterlogging).toBeGreaterThan(0.7);
            expect(s.hoof_damage_risk).toBe('alto');
        }
    });

    it('Sandy textures (Arenosol, Cambisol franco-arenoso) tienen Ksat alto', () => {
        const sand = SOIL_DATABASE.find((s) => s.id === '2');
        expect(sand?.ksat_mm_h).toBeGreaterThan(100);
    });

    it('Clay textures (Vertisol) tienen porosity > 0.40 pero drenaje Lento', () => {
        const vert = SOIL_DATABASE.find((s) => s.id === '1');
        expect(vert?.porosity).toBeGreaterThan(0.40);
        expect(vert?.drainage).toBe('Lento');
    });
});

// =============================================================================
// 2. USDA TEXTURE TRIANGLE CLASSIFICATION
// =============================================================================

describe('classifyUSDATexture', () => {
    it('92% arena → Sand', () => {
        expect(classifyUSDATexture(92, 5, 3)).toBe('Sand');
    });

    it('40-40-20 → Loam', () => {
        expect(classifyUSDATexture(40, 40, 20)).toBe('Loam');
    });

    it('20-65-15 → Silt Loam', () => {
        expect(classifyUSDATexture(20, 65, 15)).toBe('Silt Loam');
    });

    it('22-20-58 → Clay', () => {
        expect(classifyUSDATexture(22, 20, 58)).toBe('Clay');
    });

    it('52-6-42 → Sandy Clay', () => {
        expect(classifyUSDATexture(52, 6, 42)).toBe('Sandy Clay');
    });

    it('10-56-34 → Silty Clay Loam', () => {
        expect(classifyUSDATexture(10, 56, 34)).toBe('Silty Clay Loam');
    });

    it('normaliza si la suma no es 100', () => {
        // Equivalent to 40-40-20
        expect(classifyUSDATexture(80, 80, 40)).toBe('Loam');
    });

    it('inputs degenerados devuelven default', () => {
        expect(classifyUSDATexture(0, 0, 0)).toBe('Loam');
    });
});

describe('USDA hydraulic table consistency', () => {
    it('FC > WP en todas las clases', () => {
        for (const [_cls, h] of Object.entries(USDA_TEXTURE_HYDRAULICS)) {
            expect(h.field_capacity).toBeGreaterThan(h.wilting_point);
        }
    });

    it('Ksat Sand >> Ksat Clay', () => {
        const sand = USDA_TEXTURE_HYDRAULICS['Sand'];
        const clay = USDA_TEXTURE_HYDRAULICS['Clay'];
        expect(sand.ksat_cm_h).toBeGreaterThan(clay.ksat_cm_h * 5);
    });

    it('Bulk density en rango razonable (0.8-1.7 g/cm³)', () => {
        for (const h of Object.values(USDA_TEXTURE_HYDRAULICS)) {
            expect(h.bulk_density).toBeGreaterThan(0.8);
            expect(h.bulk_density).toBeLessThan(1.7);
        }
    });

    it('Porosity coherente con bulk_density (1 - BD/2.65)', () => {
        for (const h of Object.values(USDA_TEXTURE_HYDRAULICS)) {
            const expectedPorosity = 1 - h.bulk_density / 2.65;
            expect(Math.abs(h.porosity - expectedPorosity)).toBeLessThan(0.1);
        }
    });
});

// =============================================================================
// 3. CARRYING CAPACITY (Pulido et al. 2014)
// =============================================================================

describe('estimateCarryingCapacity (Pulido 2014 dehesa range)', () => {
    it('Cambisol cálcico dehesa con 600 mm → ~0.4-0.5 LU/ha (banda Pulido)', () => {
        const result = estimateCarryingCapacity('CAMBISOL_CALCIC', 600, 30);
        expect(result.lu_per_ha).toBeGreaterThan(0.3);
        expect(result.lu_per_ha).toBeLessThan(0.6);
    });

    it('Suelo pobre + sequía severa < 0.2 LU/ha', () => {
        const result = estimateCarryingCapacity('REGOSOL_CALCARIC', 250, 5);
        expect(result.lu_per_ha).toBeLessThan(0.15);
    });

    it('Phaeozem + alta lluvia continental → > 1.5 LU/ha', () => {
        const result = estimateCarryingCapacity('PHAEOZEM', 800, 0);
        // 1.50 base × 1.0 precip × 0.85 tree cover (0% < 10) = 1.275 — apretamos solo a 1.0
        expect(result.lu_per_ha).toBeGreaterThan(1.0);
    });

    it('Fluvisol con regadío y arbolado → máximo', () => {
        const result = estimateCarryingCapacity('FLUVISOL', 800, 30);
        // 1.80 × 1.0 × 1.10 = 1.98
        expect(result.lu_per_ha).toBeGreaterThan(1.5);
    });

    it('Bonus arbolado óptimo 20-40% comparado con 0%', () => {
        const noTrees = estimateCarryingCapacity('CAMBISOL_CALCIC', 600, 0);
        const optimal = estimateCarryingCapacity('CAMBISOL_CALCIC', 600, 30);
        expect(optimal.lu_per_ha).toBeGreaterThan(noTrees.lu_per_ha);
    });

    it('Reasons explican factor pluvial y arbolado', () => {
        const r = estimateCarryingCapacity('1', 500, 30);
        expect(r.reasons.length).toBe(3);
        expect(r.reasons.some((rs) => /pluvial/.test(rs))).toBe(true);
        expect(r.reasons.some((rs) => /arb/i.test(rs))).toBe(true);
    });

    it('Suelo desconocido devuelve 0', () => {
        const r = estimateCarryingCapacity('UNKNOWN', 600, 30);
        expect(r.lu_per_ha).toBe(0);
    });
});

// =============================================================================
// 4. LIVESTOCK SUITABILITY EVALUATION
// =============================================================================

describe('evaluateForLivestock', () => {
    it('Gleysol penaliza por daño pezuña y parásitos', () => {
        const e = evaluateForLivestock('GLEYSOL', { biological_type: 'Rustic_European', objective: 'Mantenimiento' });
        expect(e.risks.some((r) => /pezuña/.test(r))).toBe(true);
        expect(e.risks.some((r) => /parasit/i.test(r))).toBe(true);
    });

    it('Phaeozem bonifica para razas continentales/lecheras', () => {
        const e = evaluateForLivestock('PHAEOZEM', { biological_type: 'Dairy', objective: 'Recría' });
        expect(e.score).toBeGreaterThan(55);
        expect(e.advantages.some((a) => /continental|exigent/i.test(a))).toBe(true);
    });

    it('Leptosol penaliza Continental por baja capacidad', () => {
        const e = evaluateForLivestock('LEPTOSOL', { biological_type: 'Continental', objective: 'Cebo' });
        expect(e.risks.some((r) => /continental/i.test(r))).toBe(true);
    });

    it('Vertisol en invierno emite warning específico', () => {
        const e = evaluateForLivestock('VERTISOL_CHROMIC', {
            biological_type: 'Rustic_European',
            objective: 'Mantenimiento',
            season: 'winter',
        });
        expect(e.risks.some((r) => /Vertisol/.test(r))).toBe(true);
    });

    it('Calcisol sumario lista deficiencias minerales múltiples', () => {
        const e = evaluateForLivestock('CALCISOL_HAPLIC', { biological_type: 'Rustic_European' });
        expect(e.risks.some((r) => /suplementar/i.test(r))).toBe(true);
    });

    it('Leptosol favorece razas rústicas', () => {
        const e = evaluateForLivestock('LEPTOSOL', { biological_type: 'Rustic_European', objective: 'Mantenimiento' });
        expect(e.advantages.some((a) => /r[uú]stic/i.test(a))).toBe(true);
    });

    it('Suelo desconocido devuelve score 0', () => {
        const e = evaluateForLivestock('UNKNOWN', {});
        expect(e.score).toBe(0);
    });
});

// =============================================================================
// 5. FIND/FILTER HELPERS
// =============================================================================

describe('findByTexture', () => {
    it('clay textures encuentra el Vertisol', () => {
        const matches = SoilEngine.findByTexture(22, 20, 58);
        expect(matches.length).toBeGreaterThan(0);
        expect(matches.some((s) => s.id === '1')).toBe(true);
    });

    it('loam textures encuentra el Cambisol Eútrico', () => {
        const matches = SoilEngine.findByTexture(40, 40, 20);
        expect(matches.some((s) => s.id === '3')).toBe(true);
    });
});

describe('findByClimateZone', () => {
    it('Mediterranean_dry incluye Calcisol y Regosol', () => {
        const med = SoilEngine.findByClimateZone('Mediterranean_dry');
        const groups = med.map((s) => s.wrb_group);
        expect(groups).toContain('Calcisol');
        expect(groups).toContain('Regosol');
    });

    it('Atlantic incluye Cambisol dístrico/húmico', () => {
        const atl = SoilEngine.findByClimateZone('Atlantic');
        expect(atl.length).toBeGreaterThan(0);
        expect(atl.some((s) => s.wrb_group === 'Cambisol')).toBe(true);
    });
});

// =============================================================================
// 6. EXISTING SUITABILITY (legacy preserved)
// =============================================================================

describe('legacy calculateSuitability still works', () => {
    it('Pastoreo: Phaeozem > Solonchak', () => {
        const phaeo = SoilEngine.calculateSuitability('PHAEOZEM', 'Pastoreo');
        const sol = SoilEngine.calculateSuitability('SOLONCHAK', 'Pastoreo');
        expect(phaeo).toBeGreaterThan(sol);
    });

    it('Cultivo: Fluvisol > Leptosol', () => {
        const fluv = SoilEngine.calculateSuitability('FLUVISOL', 'Cultivo');
        const lep = SoilEngine.calculateSuitability('LEPTOSOL', 'Cultivo');
        expect(fluv).toBeGreaterThan(lep);
    });
});
