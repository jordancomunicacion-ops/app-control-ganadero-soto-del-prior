import { describe, it, expect } from 'vitest';
import {
    COW_DEFAULTS,
    COW_COST_DEFAULTS,
    biologicalProductivity,
    revenueAtWeaning,
    revenueAtSlaughter,
    computeCowProductivity,
    computeCowIndividual,
    defaultCowCosts,
    type SeuropPriceLookup,
} from '@/services/cowProductivityEngine';

// Lookup SEUROP de prueba — refleja precios típicos lonja Salamanca dic 2025.
const seuropMock: SeuropPriceLookup = (code) => {
    const prices: Record<string, number> = {
        AR3: 758.0, // añojo R3 (12-24m, conformación R, engrasamiento 3)
        AR: 758.0,
        A: 750.0,
        ZR3: 780.0,
        VR3: 800.0,
    };
    return prices[code];
};

describe('biologicalProductivity', () => {
    it('Con defaults: ~85 % destete × (365/390) × 220 kg ≈ 175 kg/vaca/año', () => {
        const r = biologicalProductivity();
        expect(r.partsPerYear).toBeCloseTo(365 / 390, 3);
        expect(r.weanedPerYear).toBeCloseTo((365 / 390) * 0.85, 3);
        expect(r.kgWeanedPerYear).toBeCloseTo(175, 0); // 175 kg redondeado
    });

    it('IEP 365 días → 1 parto/año exacto', () => {
        const r = biologicalProductivity({ iepDays: 365 });
        expect(r.partsPerYear).toBe(1);
    });

    it('IEP 420 días → menos producción anual', () => {
        const r = biologicalProductivity({ iepDays: 420 });
        expect(r.partsPerYear).toBeLessThan(1);
        expect(r.kgWeanedPerYear).toBeLessThan(175);
    });

    it('clamp IEP mínimo a 280 días para evitar valores absurdos', () => {
        const r = biologicalProductivity({ iepDays: 100 });
        expect(r.partsPerYear).toBeLessThanOrEqual(365 / 280);
    });

    it('tasa de destete del 100 % maximiza producción', () => {
        const a = biologicalProductivity({ weaningRate: 0.85 });
        const b = biologicalProductivity({ weaningRate: 1.0 });
        expect(b.kgWeanedPerYear).toBeGreaterThan(a.kgWeanedPerYear);
    });
});

describe('revenueAtWeaning', () => {
    it('precio default 4.20 €/kg × 175 kg ≈ 735 €/año', () => {
        const r = revenueAtWeaning();
        expect(r.pricePerKg).toBe(4.2);
        expect(r.grossRevenueEur).toBeCloseTo(175 * 4.2, 0);
    });

    it('respeta override de precio', () => {
        const r = revenueAtWeaning({ weaningPricePerKg: 5.0 });
        expect(r.pricePerKg).toBe(5.0);
        // ~875 €/año
        expect(r.grossRevenueEur).toBeGreaterThan(850);
    });
});

describe('revenueAtSlaughter', () => {
    it('Valoración SEUROP de ternero cebado a 14 m → categoría A', () => {
        const r = revenueAtSlaughter({}, {}, seuropMock);
        expect(r.mapaCategory).toBe('A');
        // 480 × 0.56 = 268.8 kg canal × 7.58 €/kg ≈ 2038 € por ternero
        // × 0.795 terneros/año ≈ 1620 € bruto
        // − 350 × 0.795 = 278 cebo → ~1340 € neto
        expect(r.grossRevenueEur).toBeGreaterThan(1500);
        expect(r.fatteningCostEur).toBeCloseTo(0.85 * (365 / 390) * 350, 0);
        expect(r.netRevenueEur).toBeLessThan(r.grossRevenueEur);
    });

    it('Si la edad sacrificio es < 12 m, cae en categoría Z', () => {
        const r = revenueAtSlaughter({}, { ageMonths: 10 }, seuropMock);
        expect(r.mapaCategory).toBe('Z');
    });

    it('Si la edad sacrificio es < 8 m, cae en categoría V', () => {
        const r = revenueAtSlaughter({}, { ageMonths: 7 }, seuropMock);
        expect(r.mapaCategory).toBe('V');
    });

    it('Sin precio en lookup usa fallback de 500 €/100kg', () => {
        const empty: SeuropPriceLookup = () => undefined;
        const r = revenueAtSlaughter({}, {}, empty);
        expect(r.pricePerKgCarcass).toBeCloseTo(5.0, 2);
    });
});

describe('computeCowProductivity (integración)', () => {
    it('Sin costes: netos son null', () => {
        const r = computeCowProductivity();
        expect(r.netAtWeaningEur).toBeNull();
        expect(r.netAtSlaughterEur).toBeNull();
    });

    it('Con costes default: margen positivo en cebo, ajustado en destete', () => {
        const r = computeCowProductivity({
            costs: defaultCowCosts(),
            seuropLookup: seuropMock,
        });
        expect(r.netAtWeaningEur).toBeGreaterThan(150); // margen flojo pero positivo
        expect(r.netAtSlaughterEur).toBeGreaterThan(r.netAtWeaningEur!);
    });

    it('Mejorando IEP y tasa destete sube margen >30 %', () => {
        const base = computeCowProductivity({ costs: defaultCowCosts() });
        const better = computeCowProductivity({
            input: { iepDays: 365, weaningRate: 0.92 },
            costs: defaultCowCosts(),
        });
        expect(better.netAtWeaningEur!).toBeGreaterThan(base.netAtWeaningEur! * 1.3);
    });

    it('La explicación menciona partos/año y €/año', () => {
        const r = computeCowProductivity({ seuropLookup: seuropMock });
        expect(r.explanation).toMatch(/partos\/año/);
        expect(r.explanation).toMatch(/€\/año/);
    });
});

describe('computeCowIndividual (con historial)', () => {
    it('Calcula IEP real con 3 partos', () => {
        const partos = [
            new Date('2023-04-01'),
            new Date('2024-05-15'), // 410 días
            new Date('2025-06-10'), // 391 días
        ];
        const r = computeCowIndividual({ partosDates: partos });
        expect(r.actualIepDays).not.toBeNull();
        expect(r.actualIepDays!).toBeGreaterThan(390);
        expect(r.actualIepDays!).toBeLessThan(420);
        expect(r.partosCount).toBe(3);
    });

    it('Con un solo parto no calcula IEP, usa default', () => {
        const r = computeCowIndividual({ partosDates: [new Date('2024-04-01')] });
        expect(r.actualIepDays).toBeNull();
        // partsPerYear igual al default (365/390)
        expect(r.biological.partsPerYear).toBeCloseTo(365 / COW_DEFAULTS.iepDays, 3);
    });

    it('Usa el peso de destete observado si lo aporta', () => {
        const r = computeCowIndividual({
            partosDates: [new Date('2023-04-01'), new Date('2024-05-01')],
            weaningWeightsKg: [240, 250],
        });
        expect(r.averageWeaningWeightKg).toBe(245);
        // ahora produce más kg/año que el default 220
        expect(r.biological.kgWeanedPerYear).toBeGreaterThan(175);
    });

    it('Una vaca improductiva (IEP >450) debería tener margen muy bajo', () => {
        const partos = [
            new Date('2022-01-01'),
            new Date('2023-04-15'), // 469 días — muy mala
            new Date('2024-08-20'), // 493 días
        ];
        const r = computeCowIndividual(
            { partosDates: partos },
            { costs: defaultCowCosts() },
        );
        expect(r.actualIepDays!).toBeGreaterThan(450);
        expect(r.netAtWeaningEur!).toBeLessThan(150);
    });
});

describe('Defaults — referencia sectorial', () => {
    it('los defaults son coherentes con vacuno carne extensivo español', () => {
        expect(COW_DEFAULTS.weaningDays).toBeGreaterThanOrEqual(150);
        expect(COW_DEFAULTS.weaningDays).toBeLessThanOrEqual(220);
        expect(COW_DEFAULTS.weaningWeightKg).toBeGreaterThanOrEqual(180);
        expect(COW_DEFAULTS.weaningWeightKg).toBeLessThanOrEqual(280);
        expect(COW_DEFAULTS.weaningRate).toBeGreaterThanOrEqual(0.7);
        expect(COW_DEFAULTS.weaningRate).toBeLessThanOrEqual(0.95);
        expect(COW_DEFAULTS.iepDays).toBeGreaterThanOrEqual(360);
        expect(COW_DEFAULTS.iepDays).toBeLessThanOrEqual(450);
        // Sanity: GMD × días = peso destete (220 = 1.0 × ~180) con margen.
        const expectedGain = COW_DEFAULTS.preWeaningGmdKgPerDay * COW_DEFAULTS.weaningDays;
        // Permitimos peso nacimiento ~40 kg → 40 + 180 = 220.
        expect(expectedGain + 40).toBeCloseTo(COW_DEFAULTS.weaningWeightKg, 0);
    });

    it('los costes default son razonables (~500 €/vaca/año)', () => {
        expect(COW_COST_DEFAULTS.totalEur).toBeGreaterThanOrEqual(400);
        expect(COW_COST_DEFAULTS.totalEur).toBeLessThanOrEqual(700);
    });
});
