// Carcass & Quality Calculation Engine
// Depends on: AppConfig

const CarcassAndQualityEngine = {

    // Helper: Clamp
    clamp(x, min, max) {
        return Math.max(min, Math.min(max, x));
    },

    // Helper: Normalize 0-1
    normalize(x, min, max) {
        if (max === min) return 0;
        return this.clamp((x - min) / (max - min), 0, 1);
    },

    // 3.2 Calculate Diet Energy (Weighted by MS)
    calculateDietEnergy(dietItems) {
        // dietItems: Array of { kg_as_fed, ms_percent (0-100), en_mcal }
        if (!dietItems || dietItems.length === 0) return 0;

        let totalKgMS = 0;
        let totalEnergy = 0;

        dietItems.forEach(item => {
            const ms = parseFloat(item.ms_percent) || 88; // Default to 88% DM if missing
            const kgMS = (parseFloat(item.kg_as_fed) || 0) * (ms / 100);
            const en = parseFloat(item.en_mcal) || 0;

            if (kgMS > 0) {
                totalKgMS += kgMS;
                totalEnergy += kgMS * en;
            }
        });

        if (totalKgMS === 0) return 0;
        return totalEnergy / totalKgMS; // Weighted Average
    },

    // 3.3 Calculate THI
    calculateTHI(tempC, rhPercent) {
        // THI = (1.8*T + 32) - (0.55 - 0.0055*RH) * ((1.8*T + 32) - 58)
        if (tempC === null || tempC === undefined) return 0;

        // Proxy if RH missing: Assume 50%
        const rh = (rhPercent === null || rhPercent === undefined) ? 50 : rhPercent;

        const tf = (1.8 * tempC) + 32;
        const thi = tf - (0.55 - 0.0055 * rh) * (tf - 58);
        return thi;
    },

    // 3.4 & 3.5 Handled by caller (App) to get ADG_obs

    // ==========================================
    // 4. CARCASS YIELD ESTIMATION
    // ==========================================
    estimateCarcassResult(animal, currentWeight, adgObs, dietEnergy, thi, breedData) {
        const C = AppConfig.carcass.rc_adjust;

        // Base RC
        let rcBase = parseFloat(breedData.rc_base);
        if (isNaN(rcBase)) {
            const sys = (animal.system || 'Intensivo').toLowerCase();
            if (sys.includes('pastoreo')) rcBase = AppConfig.carcass.defaults.rc_grazing;
            else if (sys.includes('mixto')) rcBase = AppConfig.carcass.defaults.rc_mixed;
            else rcBase = AppConfig.carcass.defaults.rc_feedlot;
        }

        // Indices
        const ageMonths = parseFloat(animal.ageMonths || 12);
        const idxAge = this.normalize(ageMonths, C.age_ref_start_months, C.age_ref_end_months);

        const idxEnergy = this.normalize(dietEnergy, C.EN_min, C.EN_max);

        // ADG Ratio
        let adgPred = parseFloat(breedData.adg_feedlot || 1.2); // Default
        // Adjust pred based on system if needed, but keeping simple
        if (adgPred === 0) adgPred = 1.2;
        const ratioAdg = adgObs / adgPred;
        const idxAdg = this.normalize(ratioAdg, C.adg_ratio_min, C.adg_ratio_max);

        // Stress
        const idxStress = this.normalize(thi, C.THI_threshold, C.THI_max);

        // Delta
        const deltaRc = (C.w_age * idxAge) +
            (C.w_energy * idxEnergy) +
            (C.w_adg * idxAdg) +
            (C.w_stress * idxStress); // Note: w_stress is negative in config? NO, logic: +Stress should reduce RC.
        // Use additive delta, so if w_stress is negative number in config, it works.
        // Current Config: -0.010. Correct.

        // Limits
        const minRc = parseFloat(breedData.rc_min) || 0.54;
        const maxRc = parseFloat(breedData.rc_max) || 0.66;

        const rcEst = this.clamp(rcBase + deltaRc, minRc, maxRc);
        const cwEst = currentWeight * rcEst;

        return {
            rc_est: parseFloat(rcEst.toFixed(4)),
            rc_percent: parseFloat((rcEst * 100).toFixed(2)),
            carcass_weight: parseFloat(cwEst.toFixed(1))
        };
    },

    // ==========================================
    // 5. MEAT QUALITY INDEX (IQ) & MARBLING (Wagyu Logic)
    // ==========================================
    calculateQualityIndex(animal, breedData, dietEnergy, adgObs, thi, daysOnFinishing, dietStability, healthStatus, options = {}) {
        // animal: { ageMonths, weight, system, breed_name }
        // dietEnergy: Mcal/kg MS (avg)
        // adgObs: kg/day observed/predicted
        // thi: Temperature Humidity Index (avg)
        // daysOnFinishing: Days on high energy diet
        // options: { isBellota, hasLecithin, ... }
        // Defaults if breedData is incomplete (Robustness)
        const params = {
            nei_min: breedData.nei_min || 12,
            nei_max: breedData.nei_max || 18,
            dof_min: breedData.dof_min || 90,
            dof_max: breedData.dof_max || 200,
            adg_min: breedData.adg_min_quality || 0.6, // Note: breed-manager maps this to adg_min_quality
            adg_max: breedData.adg_max_quality || 1.4,
            conc_min: breedData.conc_min || 0.45,
            conc_max: breedData.conc_max || 0.85,
            thi_comfort: breedData.thi_comfort || 72,
            thi_max: breedData.thi_max || 84,
            changes_limit: breedData.changes_30d_limit || 4,
            weights: breedData.weights || {
                w_dof: 1.0, w_nei: 1.0, w_conc: 0.6, w_adg: 0.8,
                w_heat: 1.0, w_stab: 0.8, w_health: 0.7, z0: 1.0, k: 3.0
            }
        };

        const W = params.weights;

        // --- 1. NORMALIZATION ---

        // Energy (NEI approx via Diet Energy * DMI estimate)
        // We only have mcal/kg (dietEnergy). Est DMI if not provided? 
        // Caller should ideally provide NEI, but let's approximate: 
        // NEI = dietEnergy (Mcal/kg) * DMI (kg). 
        // DMI typically 2% ~ 2.2% BW. Let's use breed-specific DMI if avail relative to current Weight
        const currentWeight = parseFloat(animal.weight || animal.currentWeight || 500);
        const dmiPct = breedData.dmi_pct_pv || 0.021;
        const estimatedNEI = dietEnergy * (currentWeight * dmiPct);

        const NEI_n = this.normalize(estimatedNEI, params.nei_min, params.nei_max);

        // Days on Finishing
        const DOF_n = this.normalize(daysOnFinishing, params.dof_min, params.dof_max);

        // ADG (Quality optimization, not Max gain)
        const ADG_n = this.normalize(adgObs, params.adg_min, params.adg_max);

        // Concentrate % (Approximation based on Energy)
        // High energy (2.8+) => High concentrate. Low energy (2.0) => Low.
        // Map 2.0-3.0 Mcal to 0-100% Conc roughly for scoring?
        // Let's rely on Energy primarily, but if we had Conc % use it. 
        // For now, reuse Energy norm as proxy for Concentrate, weighted lower.
        const Conc_n = NEI_n;

        // --- 2. PENALTIES ---

        // Heat Stress
        const HeatPenalty = this.clamp((thi - params.thi_comfort) / (params.thi_max - params.thi_comfort), 0, 1);

        // Diet Stability (Caller provides 0-1 score where 1 is stable, 0 is chaotic? 
        // Or count of changes? The prompt used 'count'.
        // Let's assume dietStability input is 'count of changes' for consistency with prompt logic
        // StabilityPenalty = clamp(changes / limit, 0, 1)
        const changes = (typeof dietStability === 'number') ? dietStability : 0;
        const StabilityPenalty = this.clamp(changes / params.changes_limit, 0, 1);

        // Health Events (0 = Healthy, 1 = Sick)
        // Input healthStatus expected as 0..1 penalty or event count?
        // Let's assume input is a normalized penalty (0=good, 1=bad) or binary.
        const HealthPenalty = this.clamp(healthStatus, 0, 1);

        // --- 3. Z-SCORE CALCULATION ---

        let Z = (W.w_dof * DOF_n) +
            (W.w_nei * NEI_n) +
            (W.w_conc * Conc_n) +
            (W.w_adg * ADG_n) -
            (W.w_heat * HeatPenalty) -
            (W.w_stab * StabilityPenalty) -
            (W.w_health * HealthPenalty) -
            W.z0;

        // Boost for Marbling Potential (Genetics)
        // Add direct genetic bonus to Z or scale result?
        // Prompt says: "Pesos del modelo (ajustados por marbling_potencial)". 
        // In our data, we already selected weights based on breed type in CSV?
        // Actually the CSV has fixed weights per breed. Perfect.
        // But we should ensure high genetic potential breeds don't get capped easily if conditions are poor?
        // The formula handles it via weights. However, a breed with Potential 5 vs 2 should behave differently.
        // The CSV weights reflect this (Wagyu w_DOF=1.6 vs Brahman w_DOF=0.6).

        // --- 4. SIGMOID SCORE (0-100) ---
        const MarblingScore_100 = 100 / (1 + Math.exp(-W.k * Z));

        // --- 5. OUTPUTS & CONVERSIONS ---

        // Genetic Ceiling (Potential 1-5) from CSV
        const MaxPotential = parseFloat(breedData.marbling_potential) || 3; // Default 3 (Media)

        // Map MarblingScore_100 to a 1-5 scale, capped by genetic potential
        // Linear mapping: 0% -> 1, 100% -> MaxPotential
        let Marbling_1_5 = this.clamp(1 + (MarblingScore_100 / 100) * (MaxPotential - 1), 1, MaxPotential);

        // Efficiency Ratio (0-1)
        const efficiency = MarblingScore_100 / 100;

        // --- 5. RESULT ---
        // Lecithin Synergy (Viera et al.)
        // If Bellota (High Oleic) + Lecithin => Significant IMF boost
        let synergyBonus = 0;

        // Check flags passed via options (9th arugment expected, or we check arguments)
        // We update the signature to: calculateQualityIndex(animal, breedData, dietEnergy, adgObs, thi, daysOnFinishing, dietStability, healthStatus, options = {})

        const isBellota = options && (options.isBellota || options.highOleic);
        const hasLecithin = options && options.hasLecithin;

        if (isBellota && hasLecithin) {
            // Synergy Active!
            // Check animal type
            const isOx = (animal.sex === 'Macho' && (animal.ageMonths || 0) > 30 && (animal.isCastrated || animal.stage === 'buey'));

            if (isOx) {
                synergyBonus = 0.6; // Large bonus for Oxen (+40% IMF roughly maps to +0.6 on 1-5 scale)
            } else {
                synergyBonus = 0.25; // Smaller bonus for females/others
            }
        }

        Marbling_1_5 += synergyBonus;


        // --- GENETIC FLEXIBILITY (New) ---
        // If efficiency is exceptionally high (>95%), allow a small overflow beyond the genetic ceiling.
        // "Every animal is a world": Exceptionally well-managed animals can outperform their average breed stats.
        if (efficiency > 0.95) {
            // Bonus Factor: Logarithmic scale to prevent realistic unlimited growth
            // If efficiency is 1.0 (100%), bonus is max.
            // Let's allow up to +0.5 marbling points for perfect 100% score (e.g. Limousin 3.0 -> 3.5)
            // Or if really exceptional (e.g., Z score was huge), efficiency might theoretically exceed 1.0 if we hadn't clamped? 
            // Actually MarblingScore_100 is sigmoid 0-100.
            // Let's use the raw Z score to drive the "Overflow".
            // If Z > 2.0 (approx 98%), add bonus.

            // Simplified: Map 95-100 linear or quadratic to a 0.5 bonus?
            // Let's use a "Soft Cap" break.
            const bonus = overflow * 0.6; // Max +0.6 points
            Marbling_1_5 += bonus;
        }

        Marbling_1_5 = this.clamp(Marbling_1_5, 1, 5);

        // BMS Approximation (Japan 1-12) based on the Absolute Marbling Score
        // Map 1-5 to 1-12. (1->1, 5->12). Factor = 2.75
        const BMS_1_12 = this.clamp(1 + (Marbling_1_5 - 1) * 2.75, 1, 12);

        // Premium Badge? (Requires Absolute High Marbling > 4.2 approx BMS 10+)
        const isPremium = Marbling_1_5 >= 4.2;

        // Estimate Conformation (SEUROP) from Yield
        // Logic: >62%=S, >60%=E, >57%=U, >55%=R, >50%=O, else P
        let seurop = 'P';
        const rc = animal.rc_percent || 55; // Default to 55 if missing check
        if (rc >= 62) seurop = 'S';
        else if (rc >= 60) seurop = 'E';
        else if (rc >= 57) seurop = 'U';
        else if (rc >= 55) seurop = 'R';
        else if (rc >= 50) seurop = 'O';

        return {
            iq_score: parseFloat(MarblingScore_100.toFixed(1)), // Keep IQ as "Efficiency %" (0-100 of potential)
            marbling_est: parseFloat(Marbling_1_5.toFixed(1)),
            bms_est: parseFloat(BMS_1_12.toFixed(1)),
            conformation_est: this.estimateConformation(animal.rc_percent || 55), // SEUROP
            is_premium: isPremium,
            details: {
                z_score: parseFloat(Z.toFixed(2)),
                nei_n: parseFloat(NEI_n.toFixed(2)),
                dof_n: parseFloat(DOF_n.toFixed(2)),
                heat_penalty: parseFloat(HeatPenalty.toFixed(2)),
                stability_penalty: parseFloat(StabilityPenalty.toFixed(2))
            }
        };
    },

    isFinishingDiet(dietEnergy, concentrateRatio) {
        const R = AppConfig.quality.finishing_rule;
        return (dietEnergy >= R.EN_finish_threshold) || (concentrateRatio >= R.concentrate_share_threshold);
    },

    estimateConformation(yieldPct) {
        if (!yieldPct) return 'R';
        if (yieldPct >= 62) return 'S'; // Superior
        if (yieldPct >= 60) return 'E'; // Excelente
        if (yieldPct >= 57) return 'U'; // Muy Buena
        if (yieldPct >= 55) return 'R'; // Buena
        if (yieldPct >= 50) return 'O'; // Menos Buena
        return 'P'; // Mediocre
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CarcassAndQualityEngine;
} else {
    window.CarcassAndQualityEngine = CarcassAndQualityEngine;
}
