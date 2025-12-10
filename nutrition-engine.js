// Nutrition Engine
// "The Brain" for integrating Breed Metrics, Feed Energy, and Soil Constraints.

const NutritionEngine = {

    /**
     * Calculate Recommended Diet Targets
     * @param {Object} breed - Breed object from BreedDataManager
     * @param {number} weightKg - Current animal weight
     * @param {number} ageMonths - Animal age
     * @returns {Object} { dmiTarget, energyTarget, projectedGain }
     */
    calculateDiet(breed, weightKg, ageMonths) {
        if (!breed || !weightKg) return null;

        // 1. Estimate Dry Matter Intake (DMI) as % of Body Weight
        // General rule: 2.5% to 3.0% for growing cattle
        let dmiPercent = 2.5;

        // Adjust based on breed efficiency (using the new metric)
        // kg_PV_por_kg_MS = 1 / FCR. Higher is better efficiency (more gain per feed).
        // If efficiency is high, they might need LESS feed for same gain, or gain MORE.
        // Let's assume standard intake, but project gain based on efficiency.

        const efficiency = breed.kg_PV_por_kg_MS || 0.15; // default if missing (FCR ~6.6)

        // Target Gain (ADG)
        // Feedlot vs Grazing context would be ideal, assuming Feedlot for high output
        const targetADG = breed.adg_feedlot || 1.0;

        // Required Feed (kg MS) = Gain / Efficiency
        // Example: 1.5 kg gain / 0.15 eff = 10 kg feed.
        const requiredFeedMS = targetADG / efficiency;

        // Check if this intake is physically possible (Max ~3% BW)
        const maxIntake = weightKg * 0.032; // 3.2% max limit
        const actualIntake = Math.min(requiredFeedMS, maxIntake);

        // Recalculate Projected Gain constraints based on actual intake
        const projectedGain = actualIntake * efficiency;

        return {
            dmiKg: parseFloat(actualIntake.toFixed(2)),
            dmiPercent: parseFloat(((actualIntake / weightKg) * 100).toFixed(2)),
            targetADG: targetADG,
            projectedADG: parseFloat(projectedGain.toFixed(2)),
            efficiency: efficiency,
            note: projectedGain < targetADG ? 'Limitado por capacidad de ingesta' : 'Potencial máximo alcanzable'
        };
    },

    /**
     * Validate a Proposed Diet against Breed Constraints
     * @param {Object} breed 
     * @param {Array} feedItems - [{feed: FeedObj, kg: number}]
     */
    validateDiet(breed, feedItems) {
        const alerts = [];
        const breedName = breed.name.toLowerCase();

        // Calculate total composition
        let totalKg = 0;
        let totalStarch = 0; // rough proxy via grain types
        let totalFiber = 0; // NDF

        feedItems.forEach(item => {
            totalKg += item.kg;
            if (item.feed.type === 'Concentrado') totalStarch += item.kg; // Simplified
            if (item.feed.ndf_percent) totalFiber += (item.feed.ndf_percent / 100) * item.kg;
        });

        const concentrateRatio = totalStarch / totalKg;

        // Rule 1: Brahman/Indicus starch sensitivity (Example from user prompt)
        // "Brahman no debe recibir dietas muy ricas en almidón sin fibra efectiva"
        if ((breedName.includes('brahman') || breedName.includes('nelore')) && concentrateRatio > 0.6) {
            alerts.push({
                level: 'warning',
                message: `⚠️ Alerta Racial (${breed.name}): Alta proporción de concentrados (>60%). Riesgo de acidosis. Aumentar fibra.`
            });
        }

        // Rule 2: Minimum Fiber
        if ((totalFiber / totalKg) < 0.2) {
            alerts.push({
                level: 'caution',
                message: `⚠️ Fibra baja (<20% FDN). Riesgo salud ruminal.`
            });
        }

        return { isValid: alerts.length === 0, alerts };
    },

    /**
     * Suggest Feeds based on Farm Soil
     * @param {Object} farmSoil - { pH, drainage } from Farm Data
     * @returns {Array} - List of compatible Feed Names
     */
    getCompatibleFeeds(farmSoil) {
        if (!window.SoilDataManager) return [];
        const viableCrops = window.SoilDataManager.filterCropsForSoil(farmSoil);

        // Now find matching Feeds in FeedDataManager
        // Matches "Crop Name" to "Feed Name" (fuzzy match)
        const compatibleFeeds = [];

        // This relies on feed names containing crop names (e.g. "Maíz" -> "Maíz Forrajero")
        // In a real app we'd have a link ID. We'll use string matching.
        const allFeeds = window.FeedDataManager.defaultData; // or loaded data

        viableCrops.forEach(crop => {
            const cropKey = crop.cultivo_forrajero.toLowerCase();

            // Check against all feeds
            // Note: FeedDataManager doesn't expose a simple list easily unless we access internal or use parse.
            // We'll simplisticly return the Crop Names suggesting "Cultivar: X"
            compatibleFeeds.push(`Cultivo Recomendado: ${crop.cultivo_forrajero}`);
        });

        return compatibleFeeds;
    },
    // Lifecycle Stages Data (User Provided)
    LIFECYCLE_CONSTANTS: {
        FEMALE: [
            { id: 'lactancia', name: 'Lactancia', maxAgeMonths: 2, req: { pb: '18-20%', en: '1.6-1.8', fdn: '<10%', adg: '0.8-1.2 kg/d' }, diet: 'Leche + pasto tierno', risks: 'Diarreas' },
            { id: 'pre_destete', name: 'Pre-destete', maxAgeMonths: 7, req: { pb: '16-18%', en: '1.4-1.6', fdn: '25-35%', adg: '0.7-1.0 kg/d' }, diet: 'Pasto joven + creep feeding', risks: 'Retraso ruminal' },
            { id: 'backgrounding', name: 'Transición / Backgrounding', maxAgeMonths: 12, req: { pb: '13-15%', en: '1.3-1.5', fdn: '35-45%', adg: '0.8-1.0 kg/d' }, diet: 'Forraje medio + grano moderado', risks: 'Ruminitis' },
            { id: 'reposicion', name: 'Reposición / Mantenimiento', maxAgeMonths: 999, req: { pb: '10-12%', en: '1.1-1.3', fdn: '45-55%', adg: '0.4-0.6 kg/d' }, diet: 'Pasto + mineral', risks: 'Engrasamiento' }
        ],
        MALE: [
            { id: 'lactancia', name: 'Lactancia', maxAgeMonths: 2, req: { pb: '18-20%', en: '1.6-1.8', fdn: '<10%', adg: '0.8-1.2 kg/d' }, diet: 'Leche + preiniciador' },
            { id: 'pre_destete', name: 'Pre-destete', maxAgeMonths: 7, req: { pb: '16-18%', en: '1.4-1.6', fdn: '25-35%', adg: '0.9-1.2 kg/d' }, diet: 'Pasto joven + creep' },
            { id: 'backgrounding', name: 'Transición / Backgrounding', maxAgeMonths: 12, req: { pb: '13-15%', en: '1.3-1.5', fdn: '35-45%', adg: '0.9-1.1 kg/d' }, diet: 'Forraje + algo de grano' },
            { id: 'engorde', name: 'Engorde / Cebo', maxAgeMonths: 999, req: { pb: '12-14%', en: '>2.0-2.2', fdn: '15-25%', adg: '1.2-1.5 kg/d' }, diet: 'Ración alta energía', risks: 'Acidosis' }
        ],
        SPECIAL: {
            GESTACION: { id: 'gestacion', name: 'Gestación (Pre-parto)', req: { pb: '10-12%', en: '1.2-1.35', fdn: '45-55%' }, diet: 'Forraje + mineral', risks: 'Parto difícil' }
        }
    },

    /**
     * Determine Lifecycle Stage
     */
    determineStage(animalAgeMonths, sex, isPregnant = false) {
        // 1. Special Case: Pregnant (Last Trimester ideally, but generic for now)
        if (sex === 'Hembra' && isPregnant) {
            return this.LIFECYCLE_CONSTANTS.SPECIAL.GESTACION;
        }

        // 2. Select List based on Sex
        const list = (sex === 'Macho') ? this.LIFECYCLE_CONSTANTS.MALE : this.LIFECYCLE_CONSTANTS.FEMALE;

        // 3. Find matching stage by age
        // Find the first stage where age fits
        const stage = list.find(s => animalAgeMonths <= s.maxAgeMonths) || list[list.length - 1];

        return stage;
    },

    /**
     * Get HTML Summary of Requirements
     */
    getStageHtml(stage) {
        if (!stage) return '';
        const r = stage.req;
        return `
            <div style="margin-top: 10px; padding: 10px; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px;">
                <h4 style="margin: 0 0 5px 0; color: #92400e;">📌 Etapa: ${stage.name}</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 0.9em;">
                    <div><strong>Protein (PB):</strong> ${r.pb}</div>
                    <div><strong>Energía (EN):</strong> ${r.en}</div>
                    <div><strong>Fibra (FDN):</strong> ${r.fdn}</div>
                    ${r.adg ? `<div><strong>ADG Meta:</strong> ${r.adg}</div>` : ''}
                </div>
                <div style="margin-top: 5px; font-style: italic; color: #666; font-size: 0.9em;">
                    🍽️ <strong>Dieta:</strong> ${stage.diet}
                    ${stage.risks ? `<br>⚠️ <strong>Riesgo:</strong> ${stage.risks}` : ''}
                </div>
            </div>
        `;
    }

};

window.NutritionEngine = NutritionEngine;
