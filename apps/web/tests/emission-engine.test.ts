import { describe, it, expect } from 'vitest';
import {
    GWP_CH4,
    GWP_N2O,
    TIER1_ENTERIC_EF,
    YM_DEFAULT,
    GE_PER_KG_DM,
    MJ_PER_KG_CH4,
    aggregateFarmEmissions,
    classifyAnimal,
    computeGroupEmissions,
    entericFactor,
    intensitySemaphore,
} from '@/services/emissionEngine';

// Tests anclados a valores IPCC 2019 Refinement (Vol 4 Ch 10/11) y GWP100
// AR6 (IPCC 2021). Verifican que el motor reproduce los rangos publicados
// para vacuno carne extensivo en Western Europe.

describe('entericFactor', () => {
    it('Tier 1 devuelve los EFs IPCC Western Europe por categoría', () => {
        const t1 = entericFactor('vaca_seca');
        expect(t1.tier).toBe('Tier1');
        expect(t1.kgCh4PerHeadYear).toBe(TIER1_ENTERIC_EF.vaca_seca);
        expect(t1.kgCh4PerHeadYear).toBeGreaterThan(50);
        expect(t1.kgCh4PerHeadYear).toBeLessThan(120);
    });

    it('Tier 2 con DMI usa la fórmula GE × Ym × 365 / 55.65', () => {
        // Vaca adulta extensivo: DMI ~ 12 kg MS/día, Ym 6.3%
        const t2 = entericFactor('vaca_seca', 12, 0.063);
        expect(t2.tier).toBe('Tier2');
        // Cálculo de referencia
        const expected = (12 * GE_PER_KG_DM * 0.063 * 365) / MJ_PER_KG_CH4;
        expect(t2.kgCh4PerHeadYear).toBeCloseTo(expected, 4);
        // Y cae en el rango razonable (80-110 kg CH4/cab/año para vaca adulta).
        expect(t2.kgCh4PerHeadYear).toBeGreaterThan(70);
        expect(t2.kgCh4PerHeadYear).toBeLessThan(120);
    });

    it('Ym más bajo (75% concentrado) baja el factor entérico', () => {
        const adulta = entericFactor('vaca_seca', 12, YM_DEFAULT);
        const cebadero = entericFactor('vaca_seca', 12, 0.04);
        expect(cebadero.kgCh4PerHeadYear).toBeLessThan(adulta.kgCh4PerHeadYear);
        // ~37% menos
        const ratio = cebadero.kgCh4PerHeadYear / adulta.kgCh4PerHeadYear;
        expect(ratio).toBeCloseTo(0.04 / 0.063, 2);
    });
});

describe('computeGroupEmissions — vaca de cría extensivo año completo', () => {
    const result = computeGroupEmissions({
        group: 'vaca_seca',
        headcount: 50,
        periodDays: 365,
        fracPasture: 1, // dehesa / extensivo puro
    });

    it('emisión entérica total cae en el orden esperado IPCC', () => {
        // 50 vacas × 86 kg CH4/cab/año = 4300 kg CH4
        expect(result.ch4Enteric).toBeCloseTo(50 * 86, 1);
    });

    it('emisión CH4 manure es baja en pastoreo (≤ 2 kg/cab/año)', () => {
        expect(result.ch4Manure / result.headcount).toBeLessThanOrEqual(2);
    });

    it('CO2eq total se reparte como cabría esperar (entérico domina)', () => {
        expect(result.co2eqEnteric).toBeGreaterThan(result.co2eqManure);
        expect(result.co2eqEnteric).toBeGreaterThan(result.co2eqN2O);
        // CH4 entérico > 60% del total
        expect(result.co2eqEnteric / result.co2eqTotal).toBeGreaterThan(0.6);
    });

    it('aplica los GWP AR6 correctamente', () => {
        const expectedEnteric = result.ch4Enteric * GWP_CH4;
        expect(result.co2eqEnteric).toBeCloseTo(expectedEnteric, 3);
        const expectedN2O = (result.n2oManure + result.n2oSoil) * GWP_N2O;
        expect(result.co2eqN2O).toBeCloseTo(expectedN2O, 3);
    });
});

describe('computeGroupEmissions — prorrateo por periodo', () => {
    it('30 días = 1/12 de un año aprox', () => {
        const anual = computeGroupEmissions({
            group: 'vaca_seca',
            headcount: 100,
            periodDays: 365,
        });
        const mes = computeGroupEmissions({
            group: 'vaca_seca',
            headcount: 100,
            periodDays: 30,
        });
        const ratio = mes.co2eqTotal / anual.co2eqTotal;
        expect(ratio).toBeCloseTo(30 / 365, 4);
    });
});

describe('computeGroupEmissions — estabulado vs pastoreo', () => {
    it('estabulado total dispara CH4 manure y N2O manure', () => {
        const pasto = computeGroupEmissions({
            group: 'vaca_seca',
            headcount: 50,
            periodDays: 365,
            fracPasture: 1,
        });
        const establo = computeGroupEmissions({
            group: 'vaca_seca',
            headcount: 50,
            periodDays: 365,
            fracPasture: 0,
        });
        expect(establo.ch4Manure).toBeGreaterThan(pasto.ch4Manure * 3);
        expect(establo.n2oManure).toBeGreaterThan(pasto.n2oManure);
        // Pero el entérico no cambia
        expect(establo.ch4Enteric).toBeCloseTo(pasto.ch4Enteric, 4);
    });
});

describe('intensidad por kg canal', () => {
    it('FAO referencia (~22 kg CO2eq / kg canal vacuno extensivo)', () => {
        // 50 vacas / año, destete del 60% (30 terneros) ~ 250 kg vivo c/u →
        // 30 × 250 = 7500 kg vivo. Rendimiento canal 55% → ~4125 kg canal.
        // Esto es exigente para extensivo; el orden de magnitud esperado
        // está entre 20 y 35 kg CO2eq/kg canal.
        const r = computeGroupEmissions({
            group: 'vaca_seca',
            headcount: 50,
            periodDays: 365,
            fracPasture: 1,
            carcassKg: 4125,
        });
        expect(r.intensityPerKgCarcass).toBeDefined();
        expect(r.intensityPerKgCarcass!).toBeGreaterThan(20);
        expect(r.intensityPerKgCarcass!).toBeLessThan(45);
    });

    it('semáforo coherente con umbrales', () => {
        expect(intensitySemaphore(18)).toBe('verde');
        expect(intensitySemaphore(28)).toBe('ambar');
        expect(intensitySemaphore(40)).toBe('rojo');
    });
});

describe('aggregateFarmEmissions', () => {
    it('agrega varios grupos en una finca y devuelve un total coherente', () => {
        const { byGroup, total } = aggregateFarmEmissions([
            { group: 'vaca_seca', headcount: 40, periodDays: 365, fracPasture: 1 },
            { group: 'toro', headcount: 2, periodDays: 365, fracPasture: 1 },
            { group: 'novilla', headcount: 8, periodDays: 365, fracPasture: 1 },
            { group: 'ternero', headcount: 25, periodDays: 365, fracPasture: 1 },
        ], { liveWeightKg: 7500, carcassKg: 4125 });

        expect(byGroup).toHaveLength(4);
        expect(total.headcount).toBe(75);
        const sumOfGroups = byGroup.reduce((a, b) => a + b.co2eqTotal, 0);
        expect(total.co2eqTotal).toBeCloseTo(sumOfGroups, 3);
        expect(total.intensityPerKgCarcass).toBeDefined();
        expect(total.intensityPerKgLive).toBeDefined();
    });

    it('si cualquier grupo aporta DMI, la metodología total es Tier 2', () => {
        const { total } = aggregateFarmEmissions([
            { group: 'vaca_seca', headcount: 10, periodDays: 30 },
            { group: 'ternero', headcount: 5, periodDays: 30, dmiKgDay: 4 },
        ]);
        expect(total.methodology).toBe('IPCC2019_Tier2');
    });
});

describe('classifyAnimal', () => {
    const ref = new Date('2026-05-20');

    it('< 12 meses → ternero (independiente del sexo)', () => {
        expect(classifyAnimal({
            sex: 'M',
            birthDate: '2025-09-01',
            referenceDate: ref,
        })).toBe('ternero');
        expect(classifyAnimal({
            sex: 'H',
            birthDate: '2025-09-01',
            referenceDate: ref,
        })).toBe('ternero');
    });

    it('macho adulto → toro', () => {
        expect(classifyAnimal({
            sex: 'M',
            birthDate: '2022-01-01',
            referenceDate: ref,
        })).toBe('toro');
    });

    it('hembra 18 meses sin parir → novilla', () => {
        expect(classifyAnimal({
            sex: 'H',
            birthDate: '2024-11-01',
            referenceDate: ref,
        })).toBe('novilla');
    });

    it('hembra adulta no lactante → vaca_seca', () => {
        expect(classifyAnimal({
            sex: 'H',
            birthDate: '2020-01-01',
            referenceDate: ref,
        })).toBe('vaca_seca');
    });

    it('hembra adulta lactante → vaca_lactante', () => {
        expect(classifyAnimal({
            sex: 'H',
            birthDate: '2020-01-01',
            referenceDate: ref,
            lactating: true,
        })).toBe('vaca_lactante');
    });
});
