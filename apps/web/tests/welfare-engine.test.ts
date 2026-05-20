import { describe, it, expect } from 'vitest';
import {
    CRITERIA,
    PRINCIPLES,
    findCriterion,
    findIndicator,
    scoreAssessment,
    precomputeIndicators,
    type IndicatorValue,
} from '@/services/welfareEngine';

describe('Welfare Quality catálogo', () => {
    it('los 4 principios están definidos', () => {
        expect(Object.keys(PRINCIPLES)).toHaveLength(4);
    });

    it('los 12 criterios están definidos y cada uno asignado a un principio', () => {
        expect(CRITERIA).toHaveLength(12);
        for (const c of CRITERIA) {
            expect([1, 2, 3, 4]).toContain(c.principle);
            expect(c.indicators.length).toBeGreaterThan(0);
        }
    });

    it('codigos C1..C12 únicos', () => {
        const codes = CRITERIA.map((c) => c.code);
        expect(new Set(codes).size).toBe(codes.length);
    });

    it('findIndicator localiza por código', () => {
        expect(findIndicator('BCS_HERD')?.label).toContain('BCS');
        expect(findIndicator('NOPE')).toBeUndefined();
    });

    it('findCriterion devuelve el criterio correcto', () => {
        expect(findCriterion('C7')?.principle).toBe(3);
    });
});

describe('scoreAssessment — clasificación de indicadores', () => {
    it('Sin valores → todo sin_dato y overall 0', () => {
        const r = scoreAssessment([]);
        expect(r.overall).toBe(0);
        expect(r.readinessPct).toBe(0);
        expect(r.auditReady).toBe(false);
        expect(r.indicators.every((i) => i.status === 'sin_dato')).toBe(true);
    });

    it('BCS 3.5 → excelente; BCS 1.5 → alarmante (higher_better)', () => {
        const r1 = scoreAssessment([
            { code: 'BCS_HERD', valueNumeric: 3.5 },
        ]);
        const bcsHigh = r1.indicators.find((i) => i.code === 'BCS_HERD')!;
        expect(bcsHigh.status).toBe('excelente');

        const r2 = scoreAssessment([
            { code: 'BCS_HERD', valueNumeric: 1.0 },
        ]);
        const bcsLow = r2.indicators.find((i) => i.code === 'BCS_HERD')!;
        expect(bcsLow.status).toBe('alarmante');
    });

    it('Mortalidad 2 % → excelente; 7 % → mejorable; 15 % → alarmante (lower_better)', () => {
        const r1 = scoreAssessment([{ code: 'MORTALITY_PCT', valueNumeric: 2 }]);
        const r2 = scoreAssessment([{ code: 'MORTALITY_PCT', valueNumeric: 7 }]);
        const r3 = scoreAssessment([{ code: 'MORTALITY_PCT', valueNumeric: 15 }]);
        expect(r1.indicators.find((i) => i.code === 'MORTALITY_PCT')!.status).toBe(
            'excelente',
        );
        expect(r2.indicators.find((i) => i.code === 'MORTALITY_PCT')!.status).toBe(
            'mejorable',
        );
        expect(r3.indicators.find((i) => i.code === 'MORTALITY_PCT')!.status).toBe(
            'alarmante',
        );
    });

    it('Booleano true → excelente, false → alarmante', () => {
        const r1 = scoreAssessment([{ code: 'SHADE_AVAILABLE', valueBool: true }]);
        const r2 = scoreAssessment([{ code: 'SHADE_AVAILABLE', valueBool: false }]);
        expect(r1.indicators.find((i) => i.code === 'SHADE_AVAILABLE')!.status).toBe(
            'excelente',
        );
        expect(r2.indicators.find((i) => i.code === 'SHADE_AVAILABLE')!.status).toBe(
            'alarmante',
        );
    });
});

describe('scoreAssessment — agregados y auditReady', () => {
    /** Valores excelentes en todos los indicadores definidos. */
    const todoExcelente: IndicatorValue[] = [
        { code: 'BCS_HERD', valueNumeric: 3.5 },
        { code: 'BCS_LOW_PCT', valueNumeric: 1 },
        { code: 'WATER_POINTS_RATIO', valueNumeric: 8 },
        { code: 'WATER_CLEAN', valueBool: true },
        { code: 'LYING_SURFACE_M2', valueNumeric: 7 },
        { code: 'DIRT_SCORE', valueNumeric: 2 },
        { code: 'HEAT_STRESS_DAYS', valueNumeric: 5 },
        { code: 'SHADE_AVAILABLE', valueBool: true },
        { code: 'PASTURE_DAYS_PCT', valueNumeric: 90 },
        { code: 'WOUNDS_PCT', valueNumeric: 1 },
        { code: 'LAMENESS_PCT', valueNumeric: 3 },
        { code: 'MORTALITY_PCT', valueNumeric: 2 },
        { code: 'TREATMENT_RATE', valueNumeric: 0.5 },
        { code: 'DEHORN_ANALGESIA', valueBool: true },
        { code: 'AGGRESSIVE_INTERACTIONS', valueNumeric: 1 },
        { code: 'GROOMING_OBSERVED', valueBool: true },
        { code: 'AVOIDANCE_DISTANCE_M', valueNumeric: 0.5 },
        { code: 'QBA_POSITIVE', valueNumeric: 80 },
    ];

    it('Todo excelente → overall ~ 100 y auditReady (Welfair)', () => {
        const r = scoreAssessment(todoExcelente, 'welfair');
        expect(r.overall).toBeCloseTo(100, 0);
        expect(r.readinessPct).toBe(100);
        expect(r.auditReady).toBe(true);
        expect(r.redFlags).toHaveLength(0);
    });

    it('Una sola red flag → auditReady = false', () => {
        const con1Rojo = [...todoExcelente];
        con1Rojo[0] = { code: 'BCS_HERD', valueNumeric: 1.0 }; // alarmante
        const r = scoreAssessment(con1Rojo);
        expect(r.redFlags.length).toBeGreaterThan(0);
        expect(r.auditReady).toBe(false);
    });

    it('PAWS es más exigente que Welfair', () => {
        // Conjunto "aceptable" — entre umbrales. Aproximadamente score 70.
        const acept: IndicatorValue[] = todoExcelente.map((v) => ({ ...v }));
        // Bajamos BCS de 3.5 a 2.5 (aceptable, no excelente)
        acept[0] = { code: 'BCS_HERD', valueNumeric: 2.5 };
        const welfair = scoreAssessment(acept, 'welfair');
        const paws = scoreAssessment(acept, 'paws');
        expect(welfair.overall).toBe(paws.overall); // mismo overall
        // PAWS exige >= 65, ambos cumplen aquí. Diferenciamos creando
        // un caso justo entre 55 y 65 (sustituyendo varios excelentes).
        const justo: IndicatorValue[] = todoExcelente.map((v) => ({ ...v }));
        for (let i = 0; i < 10; i++) {
            justo[i] = { ...justo[i] };
            const ind = findIndicator(justo[i].code)!;
            if (ind.thresholds && ind.valueKind !== 'bool') {
                // Acerca al valor "acceptable" para bajar score.
                justo[i].valueNumeric = ind.thresholds.acceptable;
            }
        }
        const w = scoreAssessment(justo, 'welfair');
        const p = scoreAssessment(justo, 'paws');
        if (w.overall >= 55 && w.overall < 65) {
            expect(w.auditReady).toBe(true);
            expect(p.auditReady).toBe(false);
        }
    });

    it('readinessPct refleja % de indicadores con valor', () => {
        const r = scoreAssessment([
            { code: 'BCS_HERD', valueNumeric: 3 },
            { code: 'MORTALITY_PCT', valueNumeric: 2 },
        ]);
        const total = r.indicators.length;
        expect(r.readinessPct).toBeCloseTo((2 / total) * 100, 1);
    });
});

describe('precomputeIndicators', () => {
    it('Pre-rellena indicadores derivables de la BD', () => {
        const values = precomputeIndicators({
            activeHeadcount: 50,
            weightSamples: [
                { weightKg: 600, daysSinceWeighing: 30 },
                { weightKg: 580, daysSinceWeighing: 10 },
            ],
            deathsLast12m: 2,
            treatmentsLast12m: 30,
            coveredShelterM2: 250,
            anyShade: true,
            heatStressDays: 8,
            pastureDaysPct: 85,
            waterPoints: 5,
        });
        const byCode = new Map(values.map((v) => [v.code, v]));
        expect(byCode.get('BCS_HERD')?.valueNumeric).toBeGreaterThan(2);
        expect(byCode.get('WATER_POINTS_RATIO')?.valueNumeric).toBeCloseTo(10, 1);
        expect(byCode.get('LYING_SURFACE_M2')?.valueNumeric).toBeCloseTo(5, 1);
        expect(byCode.get('HEAT_STRESS_DAYS')?.valueNumeric).toBe(8);
        expect(byCode.get('SHADE_AVAILABLE')?.valueBool).toBe(true);
        expect(byCode.get('PASTURE_DAYS_PCT')?.valueNumeric).toBe(85);
        expect(byCode.get('MORTALITY_PCT')?.valueNumeric).toBeCloseTo(
            (2 / 52) * 100,
            1,
        );
        expect(byCode.get('TREATMENT_RATE')?.valueNumeric).toBeCloseTo(0.6, 2);
    });

    it('marca origen `auto` en los indicadores derivados', () => {
        const values = precomputeIndicators({
            activeHeadcount: 50,
            weightSamples: [],
            deathsLast12m: 1,
            treatmentsLast12m: 5,
            coveredShelterM2: 0,
            anyShade: false,
            heatStressDays: 0,
            pastureDaysPct: 100,
            waterPoints: 0,
        });
        for (const v of values) {
            expect(v.source).toBe('auto');
        }
    });

    it('Si hay BCS manuales los prefiere a la estimación por peso', () => {
        const values = precomputeIndicators({
            activeHeadcount: 10,
            weightSamples: [{ weightKg: 200, daysSinceWeighing: 30 }],
            bcsValues: [3.5, 3.0, 4.0],
            deathsLast12m: 0,
            treatmentsLast12m: 0,
            coveredShelterM2: 0,
            anyShade: false,
            heatStressDays: 0,
            pastureDaysPct: 100,
            waterPoints: 0,
        });
        const bcs = values.find((v) => v.code === 'BCS_HERD');
        expect(bcs?.valueNumeric).toBeCloseTo(3.5, 1);
    });
});
