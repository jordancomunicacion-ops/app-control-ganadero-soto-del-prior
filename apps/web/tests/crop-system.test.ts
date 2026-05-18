import { describe, it, expect } from 'vitest';
import {
    CROP_CATALOG,
    calendarForMonth,
    scoreCropFit,
    fullYearCalendar,
} from '@/services/cropCalendar';
import {
    suggestNextCrop,
    buildRotationPlan,
    compliesWithP4,
} from '@/services/rotationEngine';

// =============================================================================
// CROP CATALOG INTEGRITY
// =============================================================================

describe('CROP_CATALOG', () => {
    it('contiene los cultivos básicos del cinturón mediterráneo', () => {
        const ids = CROP_CATALOG.map((c) => c.id);
        for (const required of ['trigo', 'cebada', 'avena', 'centeno', 'veza', 'alfalfa', 'esparceta', 'sulla', 'ryegrass', 'maiz_forrajero', 'sorgo']) {
            expect(ids).toContain(required);
        }
    });

    it('todos los cultivos tienen meses de siembra definidos (excepto barbecho)', () => {
        for (const crop of CROP_CATALOG) {
            if (crop.family === 'Barbecho') continue;
            expect(crop.sowMonths.length).toBeGreaterThan(0);
        }
    });

    it('cereales de invierno siembran entre septiembre y noviembre', () => {
        const cereales = CROP_CATALOG.filter((c) => c.family === 'Cereal Invierno');
        for (const c of cereales) {
            expect(c.sowMonths.every((m) => m >= 8 || m <= 1)).toBe(true);
        }
    });

    it('cereales de verano siembran entre marzo y junio', () => {
        const cereales = CROP_CATALOG.filter((c) => c.family === 'Cereal Verano');
        for (const c of cereales) {
            expect(c.sowMonths.every((m) => m >= 2 && m <= 5)).toBe(true);
        }
    });

    it('leguminosas tienen fixesNitrogen = true', () => {
        const leguminosas = CROP_CATALOG.filter((c) => c.family.includes('Leguminosa'));
        for (const c of leguminosas) {
            expect(c.fixesNitrogen).toBe(true);
        }
    });
});

// =============================================================================
// SCORE CROP FIT
// =============================================================================

describe('scoreCropFit', () => {
    const alfalfa = CROP_CATALOG.find((c) => c.id === 'alfalfa')!;
    const sulla = CROP_CATALOG.find((c) => c.id === 'sulla')!;

    it('alfalfa en suelo neutro + bastante agua puntúa alto', () => {
        const fit = scoreCropFit(alfalfa, { climate: { annualPrecip: 700 }, soilPh: 7.0, slope: 5 });
        expect(fit.score).toBeGreaterThanOrEqual(60);
        expect(fit.reasons.length).toBeGreaterThan(0);
    });

    it('alfalfa en suelo ácido genera warning', () => {
        const fit = scoreCropFit(alfalfa, { climate: { annualPrecip: 700 }, soilPh: 5.0, slope: 5 });
        expect(fit.warnings.some((w) => /pH/.test(w))).toBe(true);
    });

    it('sulla puntúa mejor que alfalfa en clima seco 400 mm', () => {
        const fitSulla = scoreCropFit(sulla, { climate: { annualPrecip: 400 }, soilPh: 7.5, slope: 10 });
        const fitAlfalfa = scoreCropFit(alfalfa, { climate: { annualPrecip: 400 }, soilPh: 7.5, slope: 10 });
        expect(fitSulla.score).toBeGreaterThan(fitAlfalfa.score);
    });
});

// =============================================================================
// CALENDARIO MENSUAL
// =============================================================================

describe('calendarForMonth', () => {
    it('octubre (mes 9) recomienda siembra de cereales invierno', () => {
        const rec = calendarForMonth(9, { climate: { annualPrecip: 600 }, soilPh: 7.0 });
        const sowing = rec.filter((r) => r.activity === 'siembra').map((r) => r.crop.family);
        expect(sowing).toContain('Cereal Invierno');
    });

    it('mayo (mes 4) está dominado por pastoreo y cosechas', () => {
        const rec = calendarForMonth(4, { climate: { annualPrecip: 600 }, soilPh: 7.0 });
        const activities = new Set(rec.map((r) => r.activity));
        expect(activities.has('pastoreo') || activities.has('cosecha')).toBe(true);
    });

    it('si la pluviometría es muy baja, no recomienda maíz forrajero', () => {
        const rec = calendarForMonth(3, { climate: { annualPrecip: 100 }, soilPh: 7.0 });
        expect(rec.find((r) => r.crop.id === 'maiz_forrajero')).toBeUndefined();
    });

    it('fullYearCalendar devuelve 12 meses', () => {
        const year = fullYearCalendar({ climate: { annualPrecip: 600 }, soilPh: 7.0 });
        expect(Object.keys(year).length).toBe(12);
    });
});

// =============================================================================
// ROTATION ENGINE
// =============================================================================

describe('suggestNextCrop', () => {
    it('después de un cereal invierno sugiere leguminosa o barbecho', () => {
        const next = suggestNextCrop('cebada', { annualPrecipMm: 600, soilPh: 7.0 });
        expect(next.length).toBeGreaterThan(0);
        const families = next.map((s) => s.family);
        // Al menos una leguminosa o barbecho entre las preferidas
        const hasImprover = families.some((f) => f.includes('Leguminosa') || f === 'Barbecho');
        expect(hasImprover).toBe(true);
    });

    it('después de una leguminosa sugiere un cereal', () => {
        const next = suggestNextCrop('veza', { annualPrecipMm: 600, soilPh: 7.0 });
        const cereals = next.filter((s) => s.family.includes('Cereal'));
        expect(cereals.length).toBeGreaterThan(0);
    });

    it('después de maíz forrajero sugiere leguminosa para recuperar nitrógeno', () => {
        const next = suggestNextCrop('maiz_forrajero', { annualPrecipMm: 600, soilPh: 7.0 });
        expect(next.some((s) => s.family.includes('Leguminosa'))).toBe(true);
    });

    it('descarta cultivos con pluviometría insuficiente', () => {
        const next = suggestNextCrop('cebada', { annualPrecipMm: 150, soilPh: 7.0 });
        // 150 mm es < 0.7 × precipMin de la mayoría de leguminosas (que piden 350+)
        expect(next.find((s) => s.cropId === 'alfalfa')).toBeUndefined();
        expect(next.find((s) => s.cropId === 'maiz_forrajero')).toBeUndefined();
    });
});

describe('buildRotationPlan', () => {
    it('genera plan de 4 años con familias variadas', () => {
        const plan = buildRotationPlan('cebada', 4, { annualPrecipMm: 600, soilPh: 7.0 });
        expect(plan.length).toBeGreaterThan(0);
        expect(plan.length).toBeLessThanOrEqual(4);
        const families = new Set(plan.map((p) => p.family));
        // Plan razonable: al menos 2 familias distintas
        expect(families.size).toBeGreaterThanOrEqual(2);
    });

    it('plan empieza con el cultivo inicial declarado', () => {
        const plan = buildRotationPlan('alfalfa', 3, { annualPrecipMm: 600, soilPh: 7.0 });
        expect(plan[0].cropId).toBe('alfalfa');
        expect(plan[0].rationale).toContain('inicial');
    });

    it('cultivo desconocido devuelve plan vacío', () => {
        const plan = buildRotationPlan('quinoa_no_existe', 3);
        expect(plan).toEqual([]);
    });
});

describe('compliesWithP4 (ecorregimen PAC)', () => {
    it('rotación con leguminosa cada 4 años cumple P4', () => {
        const rotation = [
            { cropId: 'cebada' },
            { cropId: 'veza' },
            { cropId: 'trigo' },
            { cropId: 'cebada' },
        ];
        expect(compliesWithP4(rotation)).toBe(true);
    });

    it('cuatro cereales seguidos no cumple P4', () => {
        const rotation = [
            { cropId: 'cebada' },
            { cropId: 'trigo' },
            { cropId: 'avena' },
            { cropId: 'centeno' },
        ];
        expect(compliesWithP4(rotation)).toBe(false);
    });

    it('rotaciones de <4 años no cumplen (no suficiente ventana)', () => {
        expect(compliesWithP4([{ cropId: 'veza' }, { cropId: 'cebada' }])).toBe(false);
    });
});
