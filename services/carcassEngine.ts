
import { Breed } from './breedManager';

export interface CarcassResult {
    rc_est: number; // 0.60 etc
    rc_percent: number; // 60%
    carcass_weight: number;
    marbling_score: number; // 1-5 (Genetic + Diet)
    bms: number; // 1-12 (Standard Scale)
    conformation: string; // S, E, U, R, O, P
    synergy_bonus_applied: number;
    is_premium: boolean;
}

export const CarcassEngine = {
    /**
     * Clamp helper
     */
    clamp(num: number, min: number, max: number) {
        return Math.min(Math.max(num, min), max);
    },

    /**
     * Normalize helper
     */
    norm(val: number, min: number, max: number) {
        return this.clamp((val - min) / (max - min), 0, 1);
    },

    /**
     * Calculate Realistic Carcass Metrics (Bio-Physical Model)
     */
    calculateCarcass(
        currentWeight: number,
        ageMonths: number,
        breed: Breed,
        dietEnergyMcal: number,
        adg: number,
        options: {
            isBellota?: boolean,
            hasLecithin?: boolean,
            isOx?: boolean,
            sex?: 'Macho' | 'Hembra' | 'Castrado',
            synergyBonuses?: { marbling: number, yield_percent: number },
            currentMonth?: number, // 0-11
            fatherBreed?: Breed, // New: Specific genetics
            motherBreed?: Breed  // New: Specific genetics
        } = {}
    ): CarcassResult {
        // 1. Determine Effective Genetics (Hybrid Logic)
        let effectiveBreed = { ...breed };

        // If strict parents provided, calculate hybrid values
        if (options.fatherBreed && options.motherBreed && options.fatherBreed.name !== options.motherBreed.name) {
            // Simple Dominance/Average Logic
            effectiveBreed.conformation_potential = (options.fatherBreed.conformation_potential! + options.motherBreed.conformation_potential!) / 2;
            effectiveBreed.marbling_potential = (options.fatherBreed.marbling_potential + options.motherBreed.marbling_potential) / 2;
            effectiveBreed.yield_potential = ((options.fatherBreed.yield_potential || 0.58) + (options.motherBreed.yield_potential || 0.58)) / 2;

            // MATERNAL EFFECT (Epigenetics & Metabolic Programming)
            // 1. Marbling: High fat mothers program offspring for better fat deposition
            if (options.motherBreed.marbling_potential >= 4) {
                effectiveBreed.marbling_potential += 0.5;
            }

            // 2. Milk: High milk mothers ensure better structural development (weaning weight)
            // Bonus to conformation potential if mother is good milker
            if (options.motherBreed.milk_potential >= 4) {
                effectiveBreed.conformation_potential = (effectiveBreed.conformation_potential || 3) + 0.3;
            }
            // Penalty if mother is poor milker (stunted growth start)
            if (options.motherBreed.milk_potential <= 1) {
                effectiveBreed.conformation_potential = (effectiveBreed.conformation_potential || 3) - 0.2;
            }

            // HETEROSIS (Hybrid Vigor) - Boosts Yield/Resilience slightly
            effectiveBreed.yield_potential = (effectiveBreed.yield_potential || 0.58) + 0.01; // +1% yield for hybrids
        }

        // --- 1. YIELD CALCULATION (Rendimiento Canal) ---
        // Base Yield comes strictly from Genetics (e.g. Limousin 62%, Angus 58%)
        // If data missing, fallback to Type-based Assumption
        let baseYield = effectiveBreed.yield_potential || 0.53;
        if (!effectiveBreed.yield_potential) {
            if (breed.code === 'AZB') baseYield = 0.63; // Hyper-muscular
            else if (breed.code === 'LIM' || breed.code === 'BDA') baseYield = 0.59;
            else if (breed.code === 'CHA') baseYield = 0.58;
            else if (breed.code === 'ANG' || breed.code === 'HER') baseYield = 0.55;
        }

        // Sex Adjustment (Biology)
        if (options.sex === 'Macho') baseYield += 0.01; // Bulls slightly denser
        if (options.sex === 'Hembra') baseYield -= 0.02; // Females have more visceral waste
        if (options.sex === 'Castrado' || options.isOx) baseYield -= 0.01;

        // Physiological Checks
        // Energy Diet pushes "Finish"
        const energyFactor = this.norm(dietEnergyMcal, 1.5, 3.0) * 0.012; // Max +1.2% (Reduced from 2%)

        // Age Factor: Maturity fills the frame
        const ageFactor = this.norm(ageMonths, 12, 36) * 0.010; // Max +1.0% (Reduced from 1.5%)

        // Synergy (Metabolic Efficiency Bonus)
        const synergyYield = options.synergyBonuses ? (options.synergyBonuses.yield_percent / 100) : 0;

        let rc = baseYield + energyFactor + ageFactor + synergyYield;
        console.log('[CarcassEngine] Yield Calc:', { baseYield, energyFactor, ageFactor, synergyYield, rc, breedCode: breed.code });
        rc = this.clamp(rc, 0.45, 0.70); // Realistic Biological Extremes

        // --- 2. MARBLING (Intramuscular Fat) ---
        // Dynamics: Genetics (Base) + Diet (Fuel) + Climate (Condition)

        // A. Genetics (Modified by Hybrid Logic)
        let marblingScoreInternal = effectiveBreed.marbling_potential || 1;

        // B. Diet Energy (The "Finisher" Factor)
        // Exponential curve: High energy allows expression of genetic potential
        const energyFactorMarbling = this.norm(dietEnergyMcal, 1.6, 3.0); // Starts at 1.6 instead of 2.0
        const dietBonus = energyFactorMarbling * 2.0; // Max +2.0 points from diet alone
        marblingScoreInternal += dietBonus;

        // C. Age/Weight (Maturity)
        // Marbling happens LATE. Penalize if young/light.
        const maturity = this.norm(currentWeight, 300, 600);
        marblingScoreInternal *= (0.5 + (maturity * 0.5)); // 50% penalty if very young, 100% potential if mature

        // D. Synergies (e.g. Bellota)
        if (options.isBellota) {
            marblingScoreInternal += 0.8; // Significant boost for acorn-fed finishers
        }

        if (options.synergyBonuses?.marbling) {
            marblingScoreInternal += options.synergyBonuses.marbling;
        }

        // E. Climate Stress (Cortisol reduces intramuscular fat deposition)
        if (options.currentMonth !== undefined) {
            const m = options.currentMonth;
            const isSummer = m >= 5 && m <= 8;
            if (isSummer) {
                const tolerance = effectiveBreed.heat_tolerance || 5;
                if (tolerance < 5) marblingScoreInternal -= 0.5; // Stress penalty
            }

        }

        // F. Castration/Ox Bonus (Marbling)
        // Castrates deposit fat much better than Bulls
        if (options.sex === 'Castrado' || options.isOx) {
            marblingScoreInternal += 0.5; // Significant bonus for steer/ox
            if (ageMonths > 36) marblingScoreInternal += 0.3; // Old ox bonus
        }

        // Cap Logic for Internal Score (approx 1-6 range internally before BMS map)
        marblingScoreInternal = Math.max(1, marblingScoreInternal);

        // BMS Scale (1-12 standard)
        // Map 1-6 internal score to 1-12 BMS
        // 1->1, 3->4, 5->8, 6->10+
        let bms = Math.round(1 + ((marblingScoreInternal - 1) * 2.2));
        bms = this.clamp(bms, 1, 12);

        // Convert BMS back to 1-5 scale output if needed, or just allow the internal score to be the "marbling_score"
        const finalMarblingScore = this.clamp(marblingScoreInternal, 1, 5);

        // --- 3. CONFORMATION (SEUROP) ---
        // Dynamic Logic: Genetics + Diet + Adaptation

        // A. Genetic Potential (Modified by Hybrid Logic)
        const pot = effectiveBreed.conformation_potential || 3; // 1=P ... 6=S
        let score = pot;

        // B. Diet Impact (The "Angus to S" Factor)
        const dietBonusConformation = this.norm(dietEnergyMcal, 1.8, 2.8) * 1.5; // More responsive range 1.8-2.8
        score += dietBonusConformation;

        // C. Climate Adaptation (Genetics vs Environment)
        // If heat tolerant breed in summer -> Bonus (Thrives)
        if (options.currentMonth !== undefined) {
            const m = options.currentMonth;
            const isSummer = m >= 5 && m <= 8; // Jun-Sep
            const tolerance = effectiveBreed.heat_tolerance || 5; // 1-10

            if (isSummer) {
                if (tolerance >= 8) score += 0.3; // Thrives in heat (Brahman)
                if (tolerance <= 3) score -= 0.5; // Suffers in heat (Angus/Hereford)
            }
        }

        // D. Synergy Bonus
        // Not implemented specifically for conformation yet, but reserved

        // E. Structural Adjustments
        // Bulls are blockier (+0.5), Cows angular (-0.5)
        if (options.sex === 'Macho') score += 0.5;
        if (options.sex === 'Hembra' && breed.code !== 'AZB') score -= 0.5;
        if (options.sex === 'Castrado' || options.isOx) score += 0.0; // Neutral (Better than cow, less than bull)

        // Weight Check (RELATIVE MATURITY) - Fix for small breeds
        const targetAdultWeight = options.sex === 'Hembra' ? effectiveBreed.weight_female_adult : effectiveBreed.weight_male_adult;
        const maturityRatio = currentWeight / (targetAdultWeight || 600); // Guard against missing data

        if (maturityRatio < 0.75) {
            // Penalize only if immature relative to THEIR potential
            // e.g. Betizu at 320kg is 1.0 maturity -> No penalty.
            // Limousin at 320kg is 0.4 maturity -> Heavy penalty.
            const immaturity = 0.75 - maturityRatio;
        } else if (maturityRatio > 1.15) {
            // "Analytic" Overweight Check: Fat vs Muscle?
            // User Feedback: If animal is heavy but NOT on intensive feedlot diet, it's superior growth (Muscle).
            // If animal is heavy AND on intensive diet, it's likely Over-Finished (Fat).

            if (dietEnergyMcal > 2.75) {
                // High Energy Density (>2.75 Mcal usually means hefty concentrates)
                // Case: Cebo / Feedlot Over-Finished -> Penalty (Patchy Fat)
                const overweight = maturityRatio - 1.15;
                score -= Math.min(overweight * 2, 1.0);
            } else {
                // Moderate/Low Energy Density (Pasture/Forage based)
                // Case: Superior Genetic Development (Growing faster than breed avg on natural diet)
                // Reward: Bonus for superior frame/muscularity
                score += 0.5;
            }
        }

        // Final Score Calculation
        score = Math.round(score);
        score = Math.min(Math.max(score, 1), 6); // Clamp P to S

        const maps = ['P', 'O', 'R', 'U', 'E', 'S'];
        const conf = maps[score - 1] || 'R';

        return {
            rc_est: parseFloat(rc.toFixed(4)),
            rc_percent: parseFloat((rc * 100).toFixed(2)),
            carcass_weight: parseFloat((currentWeight * rc).toFixed(1)),
            marbling_score: parseFloat(finalMarblingScore.toFixed(1)),
            bms: this.clamp(bms, 1, 12),
            conformation: conf,
            synergy_bonus_applied: options.synergyBonuses?.marbling || 0,
            // Premium Logic: Conformation U/E/S AND Marbling (BMS) >= 5
            is_premium: score >= 4 && bms >= 5
        };
    }
};
