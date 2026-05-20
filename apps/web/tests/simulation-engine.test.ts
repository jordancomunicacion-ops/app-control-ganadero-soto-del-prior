import { describe, it, expect } from 'vitest';
import {
    runScenario,
    sensitivityAnalysis,
    tornadoChart,
    type ScenarioBaseline,
} from '@/services/simulationEngine';

const BASELINE: ScenarioBaseline = {
    averageHeadcount: 50,
    expectedCarcassKg: 8000,
    priceSeurop: 5.0,
    gmd: 0.9,
    mortalidadPct: 3,
    iepDias: 380,
    costeAlimAnualEur: 25000,
    costeSanidadAnualEur: 3000,
    costeManoObraAnualEur: 8000,
    otrosCostesAnualEur: 2000,
};

describe('runScenario', () => {
    it('sin deltas devuelve el baseline limpio', () => {
        const r = runScenario(BASELINE);
        expect(r.carcassKg).toBeCloseTo(8000, 1);
        expect(r.ingresos).toBeCloseTo(8000 * 5.0, 1);
        expect(r.costeTotal).toBe(25000 + 3000 + 8000 + 2000);
        expect(r.margenTotal).toBeCloseTo(r.ingresos - r.costeTotal, 1);
    });

    it('+10% precio SEUROP: ingresos suben, coste igual', () => {
        const base = runScenario(BASELINE);
        const r = runScenario(BASELINE, { priceSeurop: 0.1 });
        expect(r.ingresos).toBeCloseTo(base.ingresos * 1.1, 1);
        expect(r.costeTotal).toBeCloseTo(base.costeTotal, 1);
        expect(r.margenTotal).toBeGreaterThan(base.margenTotal);
    });

    it('+10% mortalidad reduce producción y margen', () => {
        const base = runScenario(BASELINE);
        const r = runScenario(BASELINE, { mortalidadPct: 0.1 });
        expect(r.carcassKg).toBeLessThan(base.carcassKg);
        expect(r.margenTotal).toBeLessThan(base.margenTotal);
    });

    it('IEP más alto reduce producción', () => {
        const base = runScenario(BASELINE);
        const r = runScenario(BASELINE, { iepDias: 0.1 }); // 380 → 418
        expect(r.carcassKg).toBeLessThan(base.carcassKg);
    });

    it('+10% GMD aumenta producción proporcionalmente', () => {
        const base = runScenario(BASELINE);
        const r = runScenario(BASELINE, { gmd: 0.1 });
        expect(r.carcassKg).toBeCloseTo(base.carcassKg * 1.1, 1);
    });

    it('combinación de palancas se compone multiplicativamente', () => {
        const r = runScenario(BASELINE, {
            priceSeurop: 0.1,
            gmd: 0.05,
            mortalidadPct: -0.5,
        });
        expect(r.margenTotal).toBeGreaterThan(runScenario(BASELINE).margenTotal);
    });

    it('+15% coste alimentación reduce margen pero no producción', () => {
        const base = runScenario(BASELINE);
        const r = runScenario(BASELINE, { costeAlim: 0.15 });
        expect(r.carcassKg).toBeCloseTo(base.carcassKg, 1);
        expect(r.margenTotal).toBeLessThan(base.margenTotal);
        expect(r.costeTotal - base.costeTotal).toBeCloseTo(25000 * 0.15, 1);
    });
});

describe('sensitivityAnalysis', () => {
    it('produce filas para todas las palancas × todos los deltas', () => {
        const { rows } = sensitivityAnalysis(BASELINE, [-0.1, 0.1]);
        // 7 palancas × 2 deltas = 14 filas
        expect(rows).toHaveLength(14);
    });

    it('baseMargin coincide con runScenario sin deltas', () => {
        const base = runScenario(BASELINE);
        const { baseMargin } = sensitivityAnalysis(BASELINE);
        expect(baseMargin).toBeCloseTo(base.margenTotal, 3);
    });
});

describe('tornadoChart', () => {
    it('ordena por impacto descendente', () => {
        const rows = tornadoChart(BASELINE, 0.1);
        for (let i = 1; i < rows.length; i++) {
            expect(rows[i - 1].rangeAbs).toBeGreaterThanOrEqual(rows[i].rangeAbs);
        }
    });

    it('para "higher_better", subir mejora (bestCase positivo)', () => {
        const rows = tornadoChart(BASELINE, 0.1);
        const price = rows.find((r) => r.lever === 'priceSeurop');
        expect(price).toBeDefined();
        expect(price!.bestCase).toBeGreaterThan(0);
        expect(price!.worstCase).toBeLessThan(0);
    });

    it('para "lower_better" (mortalidad), bajar mejora', () => {
        const rows = tornadoChart(BASELINE, 0.1);
        const mort = rows.find((r) => r.lever === 'mortalidadPct');
        expect(mort).toBeDefined();
        expect(mort!.bestCase).toBeGreaterThanOrEqual(0);
        expect(mort!.worstCase).toBeLessThanOrEqual(0);
    });

    it('precio e IEP dominan sobre los costes (más sensibilidad)', () => {
        const rows = tornadoChart(BASELINE, 0.1);
        // El precio SEUROP y el IEP son las dos palancas top en este
        // baseline (ingresos = 40 000 €, mientras el coste alim ronda
        // los 25 000 €). El rango |max − min| de ambas debe superar al
        // de coste alimentación.
        const top2 = new Set([rows[0].lever, rows[1].lever]);
        expect(top2.has('priceSeurop')).toBe(true);
        expect(top2.has('iepDias')).toBe(true);

        const alim = rows.find((r) => r.lever === 'costeAlim')!;
        expect(rows[0].rangeAbs).toBeGreaterThan(alim.rangeAbs);
    });
});
