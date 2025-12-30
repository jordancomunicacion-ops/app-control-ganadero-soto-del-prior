import { AppConfig } from './appConfig';
import { Breed } from './breedManager';

interface AnimalInput {
    ageMonths?: number;
    weight?: number;
    currentWeight?: number;
    system?: string;
    breed_name?: string;
    rc_percent?: number;
    sex?: string;
}

interface QualityOptions {
    isBellota?: boolean;
    highOleic?: boolean;
    hasLecithin?: boolean;
}

interface CarcassEstResult {
    rc_est: number;
    rc_percent: number;
    carcass_weight: number;
}

export const CarcassQualityEngine = {
    // Helper: Clamp
    clamp(x: number, min: number, max: number) {
        return Math.max(min, Math.min(max, x));
    },

    // Helper: Normalize 0-1
    normalize(x: number, min: number, max: number) {
        if (max === min) return 0;
        return this.clamp((x - min) / (max - min), 0, 1);
    },

    calculateTHI(tempC: number, rhPercent: number) {
        if (tempC === null || tempC === undefined) return 0;
        const rh = (rhPercent === null || rhPercent === undefined) ? 50 : rhPercent;
        const tf = (1.8 * tempC) + 32;
        const thi = tf - (0.55 - 0.0055 * rh) * (tf - 58);
        return thi;
    },

    estimateCarcassResult(animal: AnimalInput, currentWeight: number, adgObs: number, dietEnergy: number, thi: number, breedData: any): CarcassEstResult {
        const C = AppConfig.carcass.rc_adjust;

        // Base RC
        let rcBase = parseFloat(breedData.yield_potential || breedData.rc_base);
        if (isNaN(rcBase)) {
            const sys = (animal.system || 'Intensivo').toLowerCase();
            if (sys.includes('pastoreo')) rcBase = AppConfig.carcass.defaults.rc_grazing;
            else if (sys.includes('mixto')) rcBase = AppConfig.carcass.defaults.rc_mixed;
            else rcBase = AppConfig.carcass.defaults.rc_feedlot;
        }

        // Indices
        const ageMonths = animal.ageMonths || 12;
        const idxAge = this.normalize(ageMonths, C.age_ref_start_months, C.age_ref_end_months);
        const idxEnergy = this.normalize(dietEnergy, C.EN_min, C.EN_max);

        // ADG Ratio
        let adgPred = parseFloat(breedData.adg_feedlot || '1.2');
        if (adgPred === 0) adgPred = 1.2;
        const ratioAdg = adgObs / adgPred;
        const idxAdg = this.normalize(ratioAdg, C.adg_ratio_min, C.adg_ratio_max);

        // Stress
        const idxStress = this.normalize(thi, C.THI_threshold, C.THI_max);

        // Delta
        const deltaRc = (C.w_age * idxAge) +
            (C.w_energy * idxEnergy) +
            (C.w_adg * idxAdg) +
            (C.w_stress * idxStress);

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

    calculateQualityIndex(animal: AnimalInput, breedData: any, dietEnergy: number, adgObs: number, thi: number, daysOnFinishing: number, dietStability: number, healthStatus: number, options: QualityOptions = {}) {
        const params = {
            nei_min: breedData.nei_min || 12,
            nei_max: breedData.nei_max || 18,
            dof_min: breedData.dof_min || 90,
            dof_max: breedData.dof_max || 200,
            adg_min: breedData.adg_min_quality || 0.6,
            adg_max: breedData.adg_max_quality || 1.4,
            thi_comfort: breedData.thi_comfort || 72,
            thi_max: breedData.thi_max || 84,
            changes_limit: breedData.changes_30d_limit || 4,
            weights: breedData.weights || {
                w_dof: 1.0, w_nei: 1.0, w_conc: 0.6, w_adg: 0.8,
                w_heat: 1.0, w_stab: 0.8, w_health: 0.7, z0: 1.0, k: 3.0
            }
        };

        const W = params.weights;

        // Normalization
        const currentWeight = animal.weight || animal.currentWeight || 500;
        const dmiPct = breedData.dmi_pct_pv || 0.021;
        const estimatedNEI = dietEnergy * (currentWeight * dmiPct);

        const NEI_n = this.normalize(estimatedNEI, params.nei_min, params.nei_max);
        const DOF_n = this.normalize(daysOnFinishing, params.dof_min, params.dof_max);
        const ADG_n = this.normalize(adgObs, params.adg_min, params.adg_max);
        const Conc_n = NEI_n; // Proxy

        // Penalties
        const HeatPenalty = this.clamp((thi - params.thi_comfort) / (params.thi_max - params.thi_comfort), 0, 1);
        const StabilityPenalty = this.clamp(dietStability / params.changes_limit, 0, 1);
        const HealthPenalty = this.clamp(healthStatus, 0, 1);

        // Z-Score
        const Z = (W.w_dof * DOF_n) +
            (W.w_nei * NEI_n) +
            (W.w_conc * Conc_n) +
            (W.w_adg * ADG_n) -
            (W.w_heat * HeatPenalty) -
            (W.w_stab * StabilityPenalty) -
            (W.w_health * HealthPenalty) -
            W.z0;

        // Sigmoid Score
        const MarblingScore_100 = 100 / (1 + Math.exp(-W.k * Z));

        // Outputs
        const MaxPotential = parseFloat(breedData.marbling_potential) || 3;
        let Marbling_1_5 = this.clamp(1 + (MarblingScore_100 / 100) * (MaxPotential - 1), 1, MaxPotential);

        // Synergy
        const isBellota = options && (options.isBellota || options.highOleic);
        const hasLecithin = options && options.hasLecithin;

        if (isBellota && hasLecithin) {
            let synergyBonus = 0.25;
            // Is Ox check approximation
            // Is Ox check (Castrado or Old Bull)
            if ((animal.sex === 'Macho' || animal.sex === 'Castrado') && (animal.ageMonths || 0) > 30) synergyBonus = 0.6;
            Marbling_1_5 += synergyBonus;
        }

        Marbling_1_5 = this.clamp(Marbling_1_5, 1, 5);

        // BMS
        const BMS_1_12 = this.clamp(1 + (Marbling_1_5 - 1) * 2.75, 1, 12);
        const isPremium = Marbling_1_5 >= 4.2;

        return {
            iq_score: parseFloat(MarblingScore_100.toFixed(1)),
            marbling_est: parseFloat(Marbling_1_5.toFixed(1)),
            bms_est: parseFloat(BMS_1_12.toFixed(1)),
            conformation_est: this.estimateConformation(animal.rc_percent || 55),
            is_premium: isPremium
        };
    },

    isFinishingDiet(dietEnergy: number, concentrateRatio: number) {
        const R = AppConfig.quality.finishing_rule;
        return (dietEnergy >= R.EN_finish_threshold) || (concentrateRatio >= R.concentrate_share_threshold);
    },

    estimateConformation(yieldPct: number) {
        if (!yieldPct) return 'R';
        if (yieldPct >= 64) return 'S';
        if (yieldPct >= 62) return 'E';
        if (yieldPct >= 60) return 'U';
        if (yieldPct >= 57) return 'R';
        if (yieldPct >= 54) return 'O';
        return 'P';
    }
};
