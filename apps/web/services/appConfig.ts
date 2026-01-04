export const AppConfig = {
    carcass: {
        rc_adjust: {
            w_age: 0.015,
            w_energy: 0.010,
            w_adg: 0.010,
            w_stress: -0.010,
            age_ref_start_months: 12,
            age_ref_end_months: 24,
            EN_min: 1.30,
            EN_max: 2.20,
            THI_threshold: 72,
            THI_max: 84,
            adg_ratio_min: 0.8,
            adg_ratio_max: 1.2
        },
        defaults: {
            rc_feedlot: 0.59,
            rc_grazing: 0.56,
            rc_mixed: 0.575
        }
    },
    quality: {
        weights: {
            w_genetic: 0.40,
            w_energy: 0.25,
            w_finish: 0.15,
            w_adg: 0.20,
            w_stress_penalty: 0.10
        },
        refs: {
            finish_days_ref: 90,
            EN_min: 1.30,
            EN_max: 2.20,
            THI_threshold: 72,
            THI_max: 84,
            ADG_min: 0.6,
            ADG_max: 1.6
        },
        finishing_rule: {
            EN_finish_threshold: 1.85,
            concentrate_share_threshold: 0.40
        }
    }
};
