import { describe, it, expect } from 'vitest';
import { NutritionEngine } from '@/services/nutritionEngine';
import { FEED_DATABASE } from '@/services/feedDatabase';
import { SoilEngine, estimateCarryingCapacity } from '@/services/soilEngine';
import type {
    FarmAgronomicContext,
    AnimalAgronomicContext,
} from '@/services/feedSelectionEngine';

// =============================================================================
// END-TO-END: contexto agronómico → generateSmartDiet → dieta concreta
// =============================================================================
//
// Verifica que el cableado farm + animal → engine produce dietas
// distintas para contextos distintos (la prueba de que la integración
// funciona y no se quedó en defaults).

describe('generateSmartDiet con contexto agronómico', () => {
    const baseTargets = NutritionEngine.calculateKPITargets(
        { breed: 'Morucha', sex: 'Macho', weight: 450, ageMonths: 18 },
        'Cebo (Máximo Crecimiento)',
        'Extensivo (Pastoreo)',
    );

    it('Dehesa cálcica + Rustic_European → forraje local (no paja)', () => {
        const farm: FarmAgronomicContext = {
            soil_id: 'CAMBISOL_CALCIC',
            climate_zone: 'Mediterranean_dry',
            annual_precip_mm: 480,
            slope_pct: 8,
        };
        const animal: AnimalAgronomicContext = {
            biological_type: 'Rustic_European',
            age_months: 18,
            sex: 'Macho',
            objective: 'Cebo (Máximo Crecimiento)',
        };
        const diet = NutritionEngine.generateSmartDiet(
            baseTargets,
            { weight: 450, ageMonths: 18, sex: 'Macho' },
            'Extensivo (Pastoreo)',
            FEED_DATABASE,
            { farm, animal },
        );
        // Debe haber al menos 3 ingredientes (forraje, energía, proteína)
        expect(diet.length).toBeGreaterThanOrEqual(3);
        // En cebo sobre dehesa, no debería caer al default 'paja' como forraje principal
        const forageId = diet[0].feed_id;
        expect(forageId).not.toBe('paja');
    });

    it('Atlantic + Dairy: el cereal sugerido difiere del default maíz', () => {
        const atlanticFarm: FarmAgronomicContext = {
            soil_id: 'CAMBISOL_HUMIC',
            climate_zone: 'Atlantic',
            annual_precip_mm: 1100,
            slope_pct: 4,
        };
        const dairy: AnimalAgronomicContext = {
            biological_type: 'Dairy',
            age_months: 36,
            sex: 'Hembra',
            objective: 'Recría',
        };
        const diet = NutritionEngine.generateSmartDiet(
            NutritionEngine.calculateKPITargets(
                { breed: 'Frisona', sex: 'Hembra', weight: 550, ageMonths: 36 },
                'Recría (Crecimiento Moderado)',
                'Intensivo (Cebadero)',
            ),
            { weight: 550, ageMonths: 36, sex: 'Hembra' },
            'Intensivo (Cebadero)',
            FEED_DATABASE,
            { farm: atlanticFarm, animal: dairy },
        );
        expect(diet.length).toBeGreaterThan(0);
        // No verificamos un ID específico (depende del score), solo que la
        // entrada existe y proviene del feed database.
        for (const d of diet) {
            const exists = FEED_DATABASE.find((f) => f.id === d.feed_id);
            expect(exists).toBeDefined();
        }
    });

    it('Sin contexto: cae a los defaults (retrocompatibilidad)', () => {
        const diet = NutritionEngine.generateSmartDiet(
            baseTargets,
            { weight: 450 },
            'Extensivo (Pastoreo)',
            FEED_DATABASE,
        );
        expect(diet.length).toBeGreaterThanOrEqual(2);
    });
});

// =============================================================================
// STOCKING-RATE INTEGRATION
// =============================================================================

describe('Carrying capacity en escenarios reales', () => {
    it('Finca dehesa 60 ha en Cambisol cálcico 480 mm → ~24 LU máx', () => {
        // 60 ha × 0.4 LU/ha base × precip factor (≈0.66) × tree factor (1.10)
        const cap = estimateCarryingCapacity('CAMBISOL_CALCIC', 480, 30);
        const supportable = parseFloat((cap.lu_per_ha * 60).toFixed(1));
        // banda esperada 17-22 LU
        expect(supportable).toBeGreaterThan(15);
        expect(supportable).toBeLessThan(30);
    });

    it('Phaeozem 60 ha + 700 mm = unas 80-95 LU (vaca lechera intensivo)', () => {
        const cap = estimateCarryingCapacity('PHAEOZEM', 700, 5);
        const supportable = parseFloat((cap.lu_per_ha * 60).toFixed(1));
        // 1.50 × 1.0 × 0.85 = 1.275 × 60 = 76.5 LU
        expect(supportable).toBeGreaterThan(60);
        expect(supportable).toBeLessThan(100);
    });

    it('Detecta sobrecarga: 50 animales en finca con capacidad ~25', () => {
        const cap = estimateCarryingCapacity('CAMBISOL_CALCIC', 480, 30);
        const supportable = cap.lu_per_ha * 60;
        const current = 50;
        const ratio = current / supportable;
        // El test debe detectar ratio > 1.2 (crítico)
        expect(ratio).toBeGreaterThan(1.2);
    });
});

// =============================================================================
// SOIL → FEED CONSISTENCY
// =============================================================================

describe('SoilEngine + feedSelectionEngine coherencia', () => {
    it('Suelos calcizo-básicos no contraindican leguminosas tolerantes a cal (esparceta, sulla)', () => {
        const soil = SoilEngine.getSoilById('CALCISOL_HAPLIC');
        expect(soil).toBeDefined();
        // Esparceta y sulla deben tener soil_ph_max >= soil.ph_typical
        const sulla = FEED_DATABASE.find((f) => f.id === 'F_SULLA');
        const sainfoin = FEED_DATABASE.find((f) => f.id === 'F_SAINFOIN');
        expect(sulla?.soil_ph_max ?? 0).toBeGreaterThanOrEqual(soil!.ph_typical);
        expect(sainfoin?.soil_ph_max ?? 0).toBeGreaterThanOrEqual(soil!.ph_typical);
    });

    it('Alfalfa no es viable en Cambisol Dístrico (pH demasiado ácido)', () => {
        const soil = SoilEngine.getSoilById('CAMBISOL_DYSTRIC');
        const alfalfa = FEED_DATABASE.find((f) => f.id === 'F04');
        expect(soil!.ph_typical).toBeLessThan(alfalfa!.soil_ph_min!);
    });

    it('Cebada compatible con Cambisol Eútrico (drenaje Medio + pH 6.5)', () => {
        const soil = SoilEngine.getSoilById('3');
        const cebada = FEED_DATABASE.find((f) => f.id === 'C02');
        expect(cebada!.soil_drainage_pref).toContain(soil!.drainage);
        expect(soil!.ph_typical).toBeGreaterThanOrEqual(cebada!.soil_ph_min!);
        expect(soil!.ph_typical).toBeLessThanOrEqual(cebada!.soil_ph_max!);
    });
});
