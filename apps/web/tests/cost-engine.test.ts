import { describe, it, expect } from 'vitest';
import {
    computeProductionCost,
    imputeRationCost,
    imputeBreedingDepreciation,
} from '@/services/costEngine';

describe('computeProductionCost', () => {
    it('agrega categorías y calcula €/kg canal', () => {
        const r = computeProductionCost({
            periodDays: 365,
            averageHeadcount: 50,
            costsByCategory: {
                alimentacion: 30000,
                sanidad: 3000,
                mano_obra: 8000,
                amortizacion: 5000,
                otros: 1000,
            },
            carcassKg: 12000,
            liveWeightKg: 22000,
            weanedCalves: 35,
            averageSeuropPricePerKgCarcass: 5.6,
        });
        expect(r.totalCost).toBe(47000);
        expect(r.costPerKgCarcass).toBeCloseTo(47000 / 12000, 3);
        expect(r.costPerKgLive).toBeCloseTo(47000 / 22000, 3);
        expect(r.costPerWeaned).toBeCloseTo(47000 / 35, 3);
        expect(r.costPerHeadYear).toBe(47000 / 50);
    });

    it('calcula margen y break-even cuando hay precio SEUROP', () => {
        const r = computeProductionCost({
            periodDays: 365,
            averageHeadcount: 50,
            costsByCategory: { alimentacion: 24000 },
            carcassKg: 8000,
            averageSeuropPricePerKgCarcass: 5.0,
        });
        const expectedCost = 24000 / 8000; // 3.0
        expect(r.costPerKgCarcass).toBeCloseTo(expectedCost, 3);
        expect(r.marginPerKgCarcass).toBeCloseTo(5.0 - expectedCost, 3);
        expect(r.marginTotal).toBeCloseTo((5.0 - expectedCost) * 8000, 1);
        expect(r.breakEvenPricePerKgCarcass).toBeCloseTo(expectedCost, 3);
    });

    it('si no hay producción, los KPIs por kg son null sin romper', () => {
        const r = computeProductionCost({
            periodDays: 365,
            averageHeadcount: 50,
            costsByCategory: { alimentacion: 10000 },
        });
        expect(r.costPerKgCarcass).toBeNull();
        expect(r.costPerKgLive).toBeNull();
        expect(r.costPerWeaned).toBeNull();
        expect(r.marginPerKgCarcass).toBeNull();
    });

    it('share % suma 100 cuando hay coste total', () => {
        const r = computeProductionCost({
            periodDays: 365,
            averageHeadcount: 30,
            costsByCategory: {
                alimentacion: 12000,
                sanidad: 3000,
                mano_obra: 5000,
            },
        });
        const total = Object.values(r.sharePct).reduce((a, b) => a + b, 0);
        expect(total).toBeCloseTo(100, 1);
        expect(r.sharePct.alimentacion).toBeCloseTo(60, 1);
    });

    it('share % es 0 en todas las categorías si total = 0', () => {
        const r = computeProductionCost({
            periodDays: 365,
            averageHeadcount: 30,
            costsByCategory: {},
        });
        for (const v of Object.values(r.sharePct)) expect(v).toBe(0);
    });
});

describe('imputeRationCost', () => {
    it('multiplica por días aplicados', () => {
        const c = imputeRationCost({
            items: [
                { amountFreshKg: 8, costPerKgFresh: 0.25 }, // 2 €/día
                { amountFreshKg: 2, costPerKgFresh: 0.4 }, // 0.8 €/día
            ],
            daysApplied: 30,
        });
        expect(c).toBeCloseTo(30 * (8 * 0.25 + 2 * 0.4), 3);
    });

    it('ignora días negativos', () => {
        expect(
            imputeRationCost({
                items: [{ amountFreshKg: 5, costPerKgFresh: 0.3 }],
                daysApplied: -10,
            }),
        ).toBe(0);
    });

    it('precio nulo no rompe', () => {
        const c = imputeRationCost({
            items: [{ amountFreshKg: 5, costPerKgFresh: 0 }],
            daysApplied: 10,
        });
        expect(c).toBe(0);
    });
});

describe('imputeBreedingDepreciation', () => {
    it('aplica fórmula estándar con defaults', () => {
        // (1400 - 800) / 8 = 75 €/vaca/año
        const c = imputeBreedingDepreciation({
            nVacas: 50,
            periodDays: 365,
        });
        expect(c).toBeCloseTo(50 * 75, 1);
    });

    it('prorratea por periodo', () => {
        const annual = imputeBreedingDepreciation({
            nVacas: 50,
            periodDays: 365,
        });
        const monthly = imputeBreedingDepreciation({
            nVacas: 50,
            periodDays: 30,
        });
        expect(monthly).toBeCloseTo(annual * (30 / 365), 2);
    });

    it('evita amortización negativa si desvieje > compra', () => {
        const c = imputeBreedingDepreciation({
            nVacas: 10,
            periodDays: 365,
            precioCompra: 800,
            precioDesvieje: 1200,
            vidaUtilAnios: 8,
        });
        expect(c).toBe(0);
    });

    it('respeta vida útil mínima 1', () => {
        const c = imputeBreedingDepreciation({
            nVacas: 1,
            periodDays: 365,
            precioCompra: 1000,
            precioDesvieje: 0,
            vidaUtilAnios: 0,
        });
        // clamp a 1 año: 1000 €
        expect(c).toBe(1000);
    });
});
