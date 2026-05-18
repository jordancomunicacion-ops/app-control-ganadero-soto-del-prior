import { describe, it, expect } from 'vitest';
import { hliThresholdByGenotype, heatBrahmanGuess } from '@/services/nutritionEngine';
import { BreedManager } from '@/services/breedManager';
import { computeDietOleic, buildLipidProfile, oleicThresholdMet } from '@/services/lipidEngine';
import { FEED_DATABASE } from '@/services/feedDatabase';

// All numeric ranges in this file are bounded by the published literature
// cited in the source files. Tests here guard the calibration so future
// edits don't silently drift off-evidence.

describe('HLI thresholds by genotype (Gaughan/Mader 2008)', () => {
    it('Bos taurus puro (negro) umbral = 86', () => {
        expect(hliThresholdByGenotype(0)).toBe(86);
    });

    it('Bos indicus puro umbral = 96', () => {
        expect(hliThresholdByGenotype(1)).toBe(96);
    });

    it('F1 50% Brahman interpola a ~91', () => {
        expect(hliThresholdByGenotype(0.5)).toBe(91);
    });

    it('Brangus (37.5%) interpola a ~89.75', () => {
        expect(hliThresholdByGenotype(0.375)).toBeCloseTo(89.75, 1);
    });

    it('clampa valores fuera de rango', () => {
        expect(hliThresholdByGenotype(-0.5)).toBe(86);
        expect(hliThresholdByGenotype(1.5)).toBe(96);
    });
});

describe('heatBrahmanGuess', () => {
    it('Brahman puro → 1.0', () => {
        const brahman = BreedManager.getBreedById('BRA')!;
        expect(heatBrahmanGuess(brahman)).toBe(1.0);
    });

    it('Angus (British) → 0', () => {
        const angus = BreedManager.getBreedById('ANG')!;
        expect(heatBrahmanGuess(angus)).toBe(0);
    });

    it('Droughtmaster (Composite explícito) → 0.5', () => {
        const drm = BreedManager.getBreedById('DRM')!;
        expect(heatBrahmanGuess(drm)).toBe(0.5);
    });

    it('Charolais (Continental) → 0', () => {
        const cha = BreedManager.getBreedById('CHA')!;
        expect(heatBrahmanGuess(cha)).toBe(0);
    });
});

describe('Heterosis British × Continental (Cundiff USMARC)', () => {
    it('cruce BxC produce heterosis mayor que BxB o CxC', () => {
        const bxc = BreedManager.calculateHybrid('ANG', 'CHA')!; // British sire × Continental dam
        const bxb = BreedManager.calculateHybrid('ANG', 'HER')!; // British × British
        const cxc = BreedManager.calculateHybrid('CHA', 'LIM')!; // Continental × Continental
        // El ADG del F1 BxC debe estar por encima del promedio aritmético
        // padre/madre en mayor proporción que en BxB o CxC.
        const angus = BreedManager.getBreedById('ANG')!;
        const cha = BreedManager.getBreedById('CHA')!;
        const her = BreedManager.getBreedById('HER')!;
        const lim = BreedManager.getBreedById('LIM')!;
        const bxcBoost = bxc.adg_feedlot / ((angus.adg_feedlot + cha.adg_feedlot) / 2);
        const bxbBoost = bxb.adg_feedlot / ((angus.adg_feedlot + her.adg_feedlot) / 2);
        const cxcBoost = cxc.adg_feedlot / ((cha.adg_feedlot + lim.adg_feedlot) / 2);
        expect(bxcBoost).toBeGreaterThan(bxbBoost);
        expect(bxcBoost).toBeGreaterThan(cxcBoost);
    });
});

describe('Heterosis taurus × indicus (Loyola et al. 2020)', () => {
    it('cruce taurus × indicus produce el heterosis máximo', () => {
        const txi = BreedManager.calculateHybrid('ANG', 'BRA')!;
        const txt = BreedManager.calculateHybrid('ANG', 'CHA')!;
        // ADG F1 BRA×ANG debería ser ~12% sobre la media, frente a ~6.5% en BxC.
        const angus = BreedManager.getBreedById('ANG')!;
        const bra = BreedManager.getBreedById('BRA')!;
        const cha = BreedManager.getBreedById('CHA')!;
        const txiBoost = txi.adg_feedlot / ((angus.adg_feedlot + bra.adg_feedlot) / 2);
        const txtBoost = txt.adg_feedlot / ((angus.adg_feedlot + cha.adg_feedlot) / 2);
        expect(txiBoost).toBeGreaterThan(txtBoost);
    });
});

describe('Antagonismo direct-maternal (Quintanilla 2013) en cruces Continental×Continental', () => {
    it('CHA × LIM penaliza milk_potential (≈ −20%)', () => {
        // CHA milk=2, LIM milk=2, ambos conformation_potential = 5
        // Reference sin antagonismo: sire*M_SIRE + dam*M_DAM = 2*0.4 + 2*0.6 = 2.0
        const cxc = BreedManager.calculateHybrid('CHA', 'LIM')!;
        // Con antagonismo: 2.0 * 0.8 = 1.6, suelo Math.max ≥ 1.
        expect(cxc.milk_potential).toBeLessThan(2.0);
        expect(cxc.milk_potential).toBeCloseTo(1.6, 1);
    });

    it('ANG × HER (British×British, ambos baja conformación) NO penaliza milk', () => {
        // conformation_potential ANG=4, HER=4 < 5 → sin penalty
        const ang = BreedManager.getBreedById('ANG')!; // milk_potential = 3
        const her = BreedManager.getBreedById('HER')!; // milk_potential = 2
        const bxb = BreedManager.calculateHybrid('ANG', 'HER')!;
        const expectedNoPenalty = ang.milk_potential * 0.4 + her.milk_potential * 0.6;
        expect(bxb.milk_potential).toBeCloseTo(expectedNoPenalty, 1);
    });
});

describe('computeDietOleic (lipidEngine)', () => {
    const bellota = FEED_DATABASE.find((f) => f.id === 'BELLHO_01')!;
    const paja = FEED_DATABASE.find((f) => f.id === 'paja')!;
    const maiz = FEED_DATABASE.find((f) => f.id === 'C01')!;
    const lecitina = FEED_DATABASE.find((f) => f.id === 'LECITHIN_PROT')!;

    it('ración sin lípidos relevantes → ~0', () => {
        const oleic = computeDietOleic([{ item: paja, amount: 5 }]);
        expect(oleic).toBeLessThan(0.1);
    });

    it('ración con bellota encina > umbral 1.5 % MS', () => {
        const oleic = computeDietOleic([
            { item: paja, amount: 2 },
            { item: bellota, amount: 5 },
        ]);
        // bellota: 5 kg × 62 % MS × 4.3 % oleico = 0.1333 kg oleico
        // paja: 2 × 90 % MS × 0.05 % = 0.0009 kg oleico
        // total dm = 5×0.62 + 2×0.9 = 4.9 kg
        // % oleico = 0.1342 / 4.9 ≈ 2.74 %
        expect(oleic).toBeGreaterThan(1.5);
        expect(oleic).toBeLessThan(3.5);
    });

    it('ración base de maíz + lecitina supera umbral si bellota presente', () => {
        const profile = buildLipidProfile([
            { item: maiz, amount: 3 },
            { item: bellota, amount: 2 },
            { item: lecitina, amount: 0.05 },
        ]);
        expect(profile.hasBellota).toBe(true);
        expect(profile.hasProtectedLecithin).toBe(true);
        expect(oleicThresholdMet(profile)).toBe(true);
    });

    it('ración solo concentrado clásico (sin oleico extra) NO cumple umbral', () => {
        const profile = buildLipidProfile([
            { item: maiz, amount: 4 },
            { item: paja, amount: 2 },
        ]);
        expect(profile.hasBellota).toBe(false);
        expect(profile.hasProtectedLecithin).toBe(false);
        expect(oleicThresholdMet(profile)).toBe(false);
    });
});
