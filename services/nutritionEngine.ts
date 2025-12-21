export interface Breed {
    id?: string;
    name: string;
    adg_feedlot?: number;
    adg_grazing?: number;
    weight_female_adult?: number;
    weight_male_adult?: number;
    fcr_feedlot?: number;
    [key: string]: any;
}

export interface DietStats {
    totalEnergyMcal: number;
    totalProteinG: number;
    dmiKg: number;
    [key: string]: any;
}

export interface MetricResult {
    val: string;
    unit: string;
    status: string;
    color: string;
}

export const NutritionEngine = {
    /**
     * Calculate Recommended Diet Targets based on Breed and Weight
     */
    calculateDiet(breed: Breed | null, weightKg: number, ageMonths: number) {
        if (!weightKg) return null;

        // 1. Estimate Dry Matter Intake (DMI) Capacity
        let dmiPercent = 2.7;
        if (weightKg > 400) dmiPercent = 2.3;
        else if (weightKg < 150) dmiPercent = 3.0;

        const maxIntake = weightKg * (dmiPercent / 100);

        // 2. Determine Target ADG (Genetics)
        const geneticMaxADG = (breed && breed.adg_feedlot) ? Number(breed.adg_feedlot) : 1.4;

        // 3. Calculate Requirements for this Target ADG
        // NEm (Maintenance) = 0.077 * BW^0.75
        const netEnergyMaint = 0.077 * Math.pow(weightKg, 0.75);

        // NEg (Growth) = 0.0635 * BW^0.75 * ADG^1.097
        const netEnergyGrowth = 0.0635 * Math.pow(weightKg, 0.75) * Math.pow(geneticMaxADG, 1.097);

        const totalEnergyReq = netEnergyMaint + netEnergyGrowth;
        const requiredMcalPerKg = totalEnergyReq / maxIntake;

        return {
            dmiKg: parseFloat(maxIntake.toFixed(2)),
            dmiPercent: dmiPercent,
            targetADG: geneticMaxADG,
            requiredEnergyDensity: parseFloat(requiredMcalPerKg.toFixed(2)),
            maintenanceEnergy: parseFloat(netEnergyMaint.toFixed(2))
        };
    },

    /**
     * Calculate Actual Performance based on Diet
     */
    calculatePerformance(breed: Breed | null, dietStats: DietStats, currentWeight: number) {
        if (!dietStats || !currentWeight) return { predictedADG: 0, limitingFactor: 'Data Missing' };

        // 1. Maintenance Requirement (NEm)
        const NEm_req = 0.077 * Math.pow(currentWeight, 0.75);

        // 2. Energy Available for Growth (NEg)
        let NE_available_for_growth = dietStats.totalEnergyMcal - NEm_req;

        // 3. Predict ADG from Energy
        // NRC Reverse formula
        let energyADG = 0;
        if (NE_available_for_growth > 0) {
            const denom = 0.0635 * Math.pow(currentWeight, 0.75);
            energyADG = Math.pow(NE_available_for_growth / denom, 0.9115);
        } else {
            // Weight Loss Scenario
            energyADG = (NE_available_for_growth / NEm_req) * 0.5;
        }

        // 4. Protein Check
        let proteinADG = energyADG;
        const cpPercent = (dietStats.totalProteinG / (dietStats.dmiKg * 1000)) * 100;

        if (cpPercent < 10 && energyADG > 0.5) {
            proteinADG = energyADG * 0.7;
        }
        if (cpPercent < 6) {
            proteinADG = Math.min(energyADG, 0.1);
        }

        // 5. Genetic Ceiling
        const geneticMax = ((breed && breed.adg_feedlot) ? Number(breed.adg_feedlot) : 1.5) * 1.2;
        const finalADG = Math.min(energyADG, proteinADG, geneticMax);

        // 6. Identify Limiting Factor
        let limitingFactor = 'Energy';
        if (proteinADG < energyADG) limitingFactor = 'Protein';
        if (finalADG >= geneticMax) limitingFactor = 'Simulación Genética (Max)';

        if (limitingFactor === 'Energy' && finalADG < geneticMax * 0.8) {
            limitingFactor = 'Energía (Dieta Extensiva)';
        }

        if (NE_available_for_growth < 0) limitingFactor = 'Déficit Energético';

        return {
            predictedADG: parseFloat(finalADG.toFixed(2)),
            limitingFactor: limitingFactor,
            maintenanceReqTags: parseFloat(NEm_req.toFixed(2)),
            growthEnergyAvailable: parseFloat(NE_available_for_growth.toFixed(2))
        };
    },

    // Lifecycle Stages Constants
    LIFECYCLE_CONSTANTS: {
        FEMALE: [
            { id: 'lactancia', name: 'Lactancia', maxAgeMonths: 3, req: { pb: '18-20%', en: '2.4-2.6', fdn: '<15%', adg: '0.8-1.2 kg/d' }, diet: 'Leche + pasto tierno', risks: 'Diarreas, Coccidiosis' },
            { id: 'pre_destete', name: 'Pre-destete', maxAgeMonths: 7, req: { pb: '16-18%', en: '2.5-2.7', fdn: '20-25%', adg: '0.7-1.0 kg/d' }, diet: 'Pasto joven + creep feeding', risks: 'Retraso ruminal' },
            { id: 'recria', name: 'Recría / I.A.', maxAgeMonths: 15, req: { pb: '14-16%', en: '2.2-2.4', fdn: '30-40%', adg: '0.7-0.9 kg/d' }, diet: 'Forraje + proteico estratégico', risks: 'Crecimiento Compensador falso' },
            { id: 'vaca_vacia', name: 'Vaca Vacía (Mantenimiento)', maxAgeMonths: 999, req: { pb: '8-10%', en: '1.8-2.0', fdn: '45-55%' }, diet: 'Forraje mantenimiento + mineral', risks: 'Sobrenutrición (Grasa)' },
            { id: 'lactancia_adulta', name: 'Vaca Lactante (General)', maxAgeMonths: 999, req: { pb: '12-14%', en: '2.4-2.6', fdn: '30-40%' }, diet: 'Pasto buena calidad + suplemento', risks: 'Tetania, Cetosis' }
        ],
        MALE: [
            { id: 'lactancia', name: 'Lactancia', maxAgeMonths: 2, req: { pb: '18-20%', en: '2.6-2.8', fdn: '<15%', adg: '0.9-1.2 kg/d' }, diet: 'Leche + preiniciador' },
            { id: 'transicion', name: 'Transición', maxAgeMonths: 6, req: { pb: '15-17%', en: '2.5-2.7', fdn: '20-30%', adg: '1.0-1.3 kg/d' }, diet: 'Pasto joven + concentrado' },
            { id: 'cebo', name: 'Cebo (Feedlot)', maxAgeMonths: 14, req: { pb: '13-14%', en: '2.8-3.1', fdn: '12-20%', adg: '1.4-1.8 kg/d' }, diet: 'Alta energía (Grano)', risks: 'Acidosis, Timpanismo' },
            { id: 'toros', name: 'Toros Reproductores', maxAgeMonths: 999, req: { pb: '10-12%', en: '2.0-2.2', fdn: '40-50%', adg: '0.0 kg/d' }, diet: 'Mantenimiento activo' }
        ],
        OX: [
            { id: 'lactancia', name: 'Lactancia', maxAgeMonths: 2, req: { pb: '18-20%', en: '2.6-2.8', fdn: '<15%', adg: '0.9-1.2 kg/d' }, diet: 'Leche + preiniciador' },
            { id: 'transicion', name: 'Transición', maxAgeMonths: 6, req: { pb: '15-17%', en: '2.5-2.7', fdn: '20-30%', adg: '0.8-1.0 kg/d' }, diet: 'Pasto joven + concentrado' },
            { id: 'recria_buey', name: 'Recría Buey (Crecimiento Lento)', maxAgeMonths: 36, req: { pb: '12-14%', en: '2.2-2.4', fdn: '30-40%', adg: '0.5-0.7 kg/d' }, diet: 'Pasto abundante / Forraje' },
            { id: 'acabado_buey', name: 'Acabado Buey Premium', maxAgeMonths: 999, req: { pb: '10-12%', en: '2.8-3.0', fdn: '20-30%', adg: '1.0-1.2 kg/d' }, diet: 'Energía alta, Maduración lenta / Bellota (Futuro)' }
        ],
        SPECIAL: {
            GESTACION_MEDIA: { id: 'gestacion_media', name: 'Gestación Confirmada', req: { pb: '10-12%', en: '2.0-2.2', fdn: '45-55%' }, diet: 'Forraje + Mineral Calcio/Fosforo', risks: 'Hipocalcemia post-parto' },
            GESTACION_SECA: { id: 'gestacion_seca', name: 'Gestación Avanzada (Vaca Seca)', req: { pb: '10-12%', en: '2.0-2.2', fdn: '45-55%' }, diet: 'Forraje + Sales Aniónicas', risks: 'Fiebre de leche' },
            EARLY_LACTATION_GESTATION: {
                id: 'lactancia_gestacion',
                name: 'Lactancia + Gestación Temprana',
                req: { pb: '13-15%', en: '2.6-2.8', fdn: '32-35%' },
                diet: 'Pasto Premium / Silo Maíz + Concentrado',
                risks: 'Pérdida BCS, Infertilidad, Ketosis'
            }
        }
    },

    determineStage(ageMonths: number, sex: string, isPregnant = false, monthsPregnant = 0, daysPostPartum = 999) {
        // 1. Adult Female Logic (> 15 months)
        if (sex === 'Hembra' && ageMonths > 15) {
            if (daysPostPartum < 90 && isPregnant && monthsPregnant < 3) {
                return this.LIFECYCLE_CONSTANTS.SPECIAL.EARLY_LACTATION_GESTATION;
            }
            if (isPregnant && monthsPregnant >= 7) {
                return this.LIFECYCLE_CONSTANTS.SPECIAL.GESTACION_SECA;
            }
            if (daysPostPartum < 305) {
                return this.LIFECYCLE_CONSTANTS.FEMALE.find((s: any) => s.id === 'lactancia_adulta');
            }
            if (isPregnant) {
                return this.LIFECYCLE_CONSTANTS.SPECIAL.GESTACION_MEDIA;
            }
            return this.LIFECYCLE_CONSTANTS.FEMALE.find((s: any) => s.id === 'vaca_vacia');
        }

        // 2. Select List based on Sex
        let list = this.LIFECYCLE_CONSTANTS.FEMALE;
        if (sex === 'Macho') list = this.LIFECYCLE_CONSTANTS.MALE;
        else if (sex === 'Castrado' || sex === 'Buey') list = this.LIFECYCLE_CONSTANTS.OX;

        // 3. Find matching stage by age
        const stage = list.find((s: any) => ageMonths <= s.maxAgeMonths) || list[list.length - 1];
        return stage;
    },

    NutrientBalance: {
        getEnvironmentalImpact(balance: any, weightGain: number): MetricResult {
            if (weightGain <= 0.1) return { val: '-', unit: '', status: 'Mantenimiento', color: 'orange' };

            const nExcretedPerKg = balance.nitrogen.excretion / weightGain;

            let status = 'Bajo';
            let color = 'green';

            if (nExcretedPerKg > 150) {
                status = 'Crítico (>150g N/kg)';
                color = '#dc2626';
            } else if (nExcretedPerKg > 100) {
                status = 'Medio-Alto';
                color = '#ca8a04';
            } else {
                status = 'Óptimo (<100g N/kg)';
                color = '#16a34a'; // Green
            }

            return {
                val: nExcretedPerKg.toFixed(0),
                unit: 'g N / kg ganancia',
                status: status,
                color: color
            };
        }
    },

    // Bellota Protocol
    BELLOTA_PROTOCOL: {
        isBellotaSeason(dateString?: string) {
            const d = dateString ? new Date(dateString) : new Date();
            const month = d.getMonth(); // 0-11
            // Season: Oct (9), Nov (10), Dec (11), Jan (0)
            return (month >= 9 || month === 0);
        }
    }
};
