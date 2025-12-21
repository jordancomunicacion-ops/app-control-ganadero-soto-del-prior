// Nutrition Engine
// "The Brain" for integrating Breed Metrics, Feed Energy, and Soil Constraints.

const NutritionEngine = {

    /**
     * Calculate Recommended Diet Targets based on Breed and Weight
     * @param {Object} breed - Breed object
     * @param {number} weightKg - Current animal weight
     * @param {number} ageMonths - Animal age
     * @returns {Object} { dmiTarget, energyTarget, projectedGain }
     */
    calculateDiet(breed, weightKg, ageMonths) {
        if (!breed || !weightKg) return null;

        // 1. Estimate Dry Matter Intake (DMI) Capacity
        // Formula: DMI (%BW) = 2.5 + 0.1 * (Weight / 100) - (Age / 20) ... Simplified Model
        // Using a robust curve:
        // Young (100-200kg): ~2.8-3.0%
        // Finishing (500kg): ~2.2-2.4%
        let dmiPercent = 2.7;
        if (weightKg > 400) dmiPercent = 2.3;
        else if (weightKg < 150) dmiPercent = 3.0;

        const maxIntake = weightKg * (dmiPercent / 100);

        // 2. Determine Target ADG (Genetics)
        const geneticMaxADG = breed.adg_feedlot || 1.4;

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
     * REACTIVE CORE: Calculate Actual Performance based on Diet
     * @param {Object} breed - Breed Genetics
     * @param {Object} dietStats - { totalEnergyMcal, totalProteinG, dmiKg }
     * @param {number} currentWeight - Kg
     * @returns {Object} { predictedADG, limitingFactor, energyBalance }
     */
    calculatePerformance(breed, dietStats, currentWeight) {
        if (!breed || !dietStats || !currentWeight) return { predictedADG: 0, limitingFactor: 'Data Missing' };

        // 1. Maintenance Requirement (NEm)
        // NRC 1996: NEm (Mcal/d) = 0.077 * BW^0.75
        const NEm_req = 0.077 * Math.pow(currentWeight, 0.75);

        // 2. Energy Available for Growth (NEg)
        // Total Intake - Maintenance
        let NE_available_for_growth = dietStats.totalEnergyMcal - NEm_req;

        // 3. Predict ADG from Energy (Energy Allowable Gain)
        // NRC Reverse formula: ADG = (NEg_available / (0.0635 * BW^0.75)) ^ (1/1.097)
        let energyADG = 0;
        if (NE_available_for_growth > 0) {
            const denom = 0.0635 * Math.pow(currentWeight, 0.75);
            energyADG = Math.pow(NE_available_for_growth / denom, 0.9115); // 1 / 1.097 approx 0.9115
        } else {
            // Weight Loss Scenario
            // Approx loss calculation (simplified)
            energyADG = (NE_available_for_growth / NEm_req) * 0.5; // Rough estimate of loss
        }

        // 4. Protein Check (Protein Allowable Gain) - Simplified
        // Approx: 150g Protein required for 1kg Maintenance+Gain roughly, scaling with weight.
        // Let's use a Liebig limiter: If CP is very low, reduce ADG.
        // Maintenance CP (g) ~ 2-3 g/kg BW? Or simplified: CP% < 10% limits growth.
        let proteinADG = energyADG;
        const cpPercent = (dietStats.totalProteinG / (dietStats.dmiKg * 1000)) * 100;

        if (cpPercent < 10 && energyADG > 0.5) {
            proteinADG = energyADG * 0.7; // Penalty for low protein
        }
        if (cpPercent < 6) {
            proteinADG = Math.min(energyADG, 0.1); // Maintenance only
        }

        // 5. Genetic Ceiling
        const geneticMax = (breed.adg_feedlot || 1.5) * 1.2; // Allow +20% over average
        let finalADG = Math.min(energyADG, proteinADG, geneticMax);

        // 6. Identify Limiting Factor
        let limitingFactor = 'Energy';
        if (proteinADG < energyADG) limitingFactor = 'Protein';
        if (finalADG >= geneticMax) limitingFactor = 'Simulación Genética (Max)';

        // Clarify Energy Limit if it's just normal extensive growth vs feedlot potential
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

        // Rule 1: Acidosis Risk (Starch Limit)
        const maxStarch = this.BENCHMARKS?.LIMITS?.ACIDOSIS_STARCH || 0.6;
        if (concentrateRatio > maxStarch) {
            alerts.push({
                level: 'warning',
                message: `⚠️ Riesgo Acidosis: Concentrado muy alto (${(concentrateRatio * 100).toFixed(0)}% > ${(maxStarch * 100).toFixed(0)}%). Aumentar fibra efectiva.`
            });
        }

        // Rule 1b: Breed specific acidosis
        if ((breedName.includes('brahman') || breedName.includes('nelore')) && concentrateRatio > 0.5) {
            alerts.push({
                level: 'warning',
                message: `⚠️ Alerta Racial (${breed.name}): Raza sensible a acidosis. Reducir concentrado (<50%).`
            });
        }

        // --- BELLOTA PROTOCOL LOGIC ---
        let bellotaKg = 0;
        feedItems.forEach(item => {
            if ((item.feed.name || '').toLowerCase().includes('bellota')) bellotaKg += item.kg;
        });
        const bellotaRatio = totalKg > 0 ? bellotaKg / totalKg : 0;

        if (bellotaRatio > 0) {
            // 1. Season Check
            if (!this.BELLOTA_PROTOCOL.isBellotaSeason()) {
                alerts.push({
                    level: 'warning',
                    message: '⚠️ Protocolo Bellota: Fuera de temporada (Oct-Ene). Verificar disponibilidad.'
                });
            }

            // 2. Fiber Check (Stricter: > 28% FDN physically effective)
            // Using NDF as proxy. Normal limit is 20%, Bellota requires 28%.
            if ((totalFiber / totalKg) < 0.28) {
                alerts.push({
                    level: 'danger',
                    message: '⛔ Protocolo Bellota: Falta Fibra Efectiva (FDN < 28%). Riesgo grave de acidosis.'
                });
            }

            // 3. Protein Supplement Check (Mandatory leguminous/cake > 30% PB)
            const hasProteinSupp = feedItems.some(item =>
                ((item.feed.type === 'Proteico' || item.feed.cp_percent >= 30) || (item.feed.name || '').toLowerCase().includes('leguminosa'))
                && item.kg > 0.1
            );
            if (!hasProteinSupp) {
                alerts.push({
                    level: 'danger',
                    message: '⛔ Protocolo Bellota: Requiere suplemento proteico (Torta/Leguminosa >30% PB).'
                });
            }

            // 4. Max Inclusion / Penalty
            // "Penalización si > 30–40 % MS total"
            if (bellotaRatio > 0.40) {
                alerts.push({
                    level: 'warning',
                    message: `⚠️ Exceso Bellota (>40% MS). Riesgo alto de acidosis. Limitar o aumentar fibra.`
                });
            }
        } else {
            // Only reduce starch alert if NOT detecting bellota explicitly but maybe high starch from other sources?
            // Actually, if bellota is present, we skipped the generic checks below? No, we just added specific ones.
            // But Bellota IS high starch/energy.
        }

        if (bellotaKg > 0) {
            // If Bellota is present, we might want to suppress the GENERIC starch warning if it's redundant with the Bellota warning
            // or if Bellota starch is considered differently.
            // For now, we leave the generic starch check (Rule 1 at line 135) as it checks Total Starch. 
            // Bellota is ~60% starch/energy roughly (implied by high energy).
            // But we already added specific Bellota warnings.
        }

        // Rule 2: Minimum Fiber
        if ((totalFiber / totalKg) < 0.2) {
            alerts.push({
                level: 'caution',
                message: `⚠️ Fibra baja (<20% FDN). Riesgo salud ruminal, desplazamiento abomaso.`
            });
        }

        // Rule 3: Legume Bloat (Timpanismo)
        // Simplified: Check if "Leguminosa" type > 50%
        let legumeKg = 0;
        feedItems.forEach(item => {
            if ((item.feed.type || '').toLowerCase().includes('leguminosa') || (item.feed.name || '').toLowerCase().includes('alfalfa') || (item.feed.name || '').toLowerCase().includes('trébol')) {
                legumeKg += item.kg;
            }
        });
        const legumeRatio = legumeKg / totalKg;
        const maxLegume = this.BENCHMARKS?.LIMITS?.BLOAT_LEGUME || 0.5;

        if (legumeRatio > maxLegume) {
            alerts.push({
                level: 'warning',
                message: `⚠️ Riesgo Timpanismo: Exceso de leguminosas frescas (>50%). Usar antiespumante o mezclar con paja.`
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
        // Fix: Use getFeeds() helper
        const allFeeds = (window.FeedDataManager && window.FeedDataManager.getFeeds) ? window.FeedDataManager.getFeeds() : {};

        viableCrops.forEach(crop => {
            // crop object comes from soil-manager getFeedRecommendations
            // structure: { id_suelo, tipo_alimento, nombre_alimento, ... }
            const cropName = crop.nombre_alimento;
            if (cropName) {
                compatibleFeeds.push(`Cultivo Recomendado: ${cropName} (${crop.tipo || 'Forraje'})`);
            }
        });

        return compatibleFeeds;
    },

    // --- VACUNO DE BELLOTA PROTOCOL ---
    BELLOTA_PROTOCOL: {
        SEASON_START: { month: 9, day: 1 }, // Oct 1 (Month 0-indexed)
        SEASON_END: { month: 0, day: 31 },  // Jan 31

        isBellotaSeason(dateString = null) {
            const d = dateString ? new Date(dateString) : new Date();
            const month = d.getMonth(); // 0-11

            // Season: Oct (9), Nov (10), Dec (11), Jan (0)
            return (month >= 9 || month === 0);
        },

        // Bellota Nutritional Profile (Reference)
        // Used for quality calculations if 'Bellota' is detected in diet
        PROFILE: {
            oleicTarget: 55, // % Oleic in fat
            colorTarget: 'Amarillo Dorado'
        }
    },

    // Lifecycle Stages Data (Updated with User Specs & SGPGyC 2021)
    LIFECYCLE_CONSTANTS: {
        FEMALE: [
            { id: 'lactancia', name: 'Lactancia', maxAgeMonths: 3, req: { pb: '18-20%', en: '2.4-2.6', fdn: '<15%', adg: '0.8-1.2 kg/d' }, diet: 'Leche + pasto tierno', risks: 'Diarreas, Coccidiosis' },
            { id: 'pre_destete', name: 'Pre-destete', maxAgeMonths: 7, req: { pb: '16-18%', en: '2.5-2.7', fdn: '20-25%', adg: '0.7-1.0 kg/d' }, diet: 'Pasto joven + creep feeding', risks: 'Retraso ruminal' },
            { id: 'recria', name: 'Recría / I.A.', maxAgeMonths: 15, req: { pb: '14-16%', en: '2.2-2.4', fdn: '30-40%', adg: '0.7-0.9 kg/d' }, diet: 'Forraje + proteico estratégico', risks: 'Crecimiento Compensador falso' },

            // ADULT FEMALE STAGES (Explicit split)
            { id: 'vaca_vacia', name: 'Vaca Vacía (Mantenimiento)', maxAgeMonths: 999, req: { pb: '8-10%', en: '1.8-2.0', fdn: '45-55%' }, diet: 'Forraje mantenimiento + mineral', risks: 'Sobrenutrición (Grasa)' },
            { id: 'lactancia_adulta', name: 'Vaca Lactante (General)', maxAgeMonths: 999, req: { pb: '12-14%', en: '2.4-2.6', fdn: '30-40%' }, diet: 'Pasto buena calidad + suplemento', risks: 'Tetania, Cetosis' }
        ],
        MALE: [
            { id: 'lactancia', name: 'Lactancia', maxAgeMonths: 2, req: { pb: '18-20%', en: '2.6-2.8', fdn: '<15%', adg: '0.9-1.2 kg/d' }, diet: 'Leche + preiniciador' },
            { id: 'transicion', name: 'Transición', maxAgeMonths: 6, req: { pb: '15-17%', en: '2.5-2.7', fdn: '20-30%', adg: '1.0-1.3 kg/d' }, diet: 'Pasto joven + concentrado' },
            { id: 'cebo', name: 'Cebo (Feedlot)', maxAgeMonths: 14, req: { pb: '13-14%', en: '2.8-3.1', fdn: '12-20%', adg: '1.4-1.8 kg/d' }, diet: 'Alta energía (Grano)', risks: 'Acidosis, Timpanismo' },
            { id: 'toros', name: 'Toros Reproductores', maxAgeMonths: 999, req: { pb: '10-12%', en: '2.0-2.2', fdn: '40-50%', adg: '0.0 kg/d' }, diet: 'Mantenimiento activo' }
        ],
        OX: [ // CASTRAMIENTO / BUEY
            { id: 'lactancia', name: 'Lactancia', maxAgeMonths: 2, req: { pb: '18-20%', en: '2.6-2.8', fdn: '<15%', adg: '0.9-1.2 kg/d' }, diet: 'Leche + preiniciador' },
            { id: 'transicion', name: 'Transición', maxAgeMonths: 6, req: { pb: '15-17%', en: '2.5-2.7', fdn: '20-30%', adg: '0.8-1.0 kg/d' }, diet: 'Pasto joven + concentrado' },
            { id: 'recria_buey', name: 'Recría Buey (Crecimiento Lento)', maxAgeMonths: 36, req: { pb: '12-14%', en: '2.2-2.4', fdn: '30-40%', adg: '0.5-0.7 kg/d' }, diet: 'Pasto abundante / Forraje' },
            { id: 'acabado_buey', name: 'Acabado Buey Premium', maxAgeMonths: 999, req: { pb: '10-12%', en: '2.8-3.0', fdn: '20-30%', adg: '1.0-1.2 kg/d' }, diet: 'Energía alta, Maduración lenta / Bellota (Futuro)' }
        ],
        SPECIAL: {
            GESTACION_MEDIA: { id: 'gestacion_media', name: 'Gestación Confirmada', req: { pb: '10-12%', en: '2.0-2.2', fdn: '45-55%' }, diet: 'Forraje + Mineral Calcio/Fosforo', risks: 'Hipocalcemia post-parto' },
            GESTACION_SECA: { id: 'gestacion_seca', name: 'Gestación Avanzada (Vaca Seca)', req: { pb: '10-12%', en: '2.0-2.2', fdn: '45-55%' }, diet: 'Forraje + Sales Aniónicas', risks: 'Fiebre de leche' },

            // KEY NEW STAGE: Double Burden
            EARLY_LACTATION_GESTATION: {
                id: 'lactancia_gestacion',
                name: 'Lactancia + Gestación Temprana',
                req: { pb: '13-15%', en: '2.6-2.8', fdn: '32-35%' }, // High Specs
                diet: 'Pasto Premium / Silo Maíz + Concentrado',
                risks: 'Pérdida BCS, Infertilidad, Ketosis'
            }
        }
    },

    // Benchmarks SGPGyC 2021 & Generic
    BENCHMARKS: {
        CONSUMO_ANUAL_MADRES: 366, // kg pienso/año
        CONSUMO_ANUAL_CEBO: 1645, // kg pienso/año
        COSTE_PIENSO_MADRES: 289.71, // €/t
        COSTE_PIENSO_CEBO: 307.04, // €/t
        LIMITS: {
            ACIDOSIS_STARCH: 0.60, // 60% max starch
            BLOAT_LEGUME: 0.50, // Risk > 50% fresh legume
            KETOSIS_ENERGY: 1.8 // Mcal ME minimum for high production
        }
    },

    /**
     * Calculate Total Digestible Nutrients (NDT estimate)
     * NDT = PB + (Grasa * 2.25) + Fibra + ELN
     */
    calculateNDT(feedProfile) {
        // Assuming profile has percentages. This is a rough proxy if fields missing.
        const pb = parseFloat(feedProfile.pb || feedProfile.PB || 10);
        const ee = parseFloat(feedProfile.fat || feedProfile.Grasa || 2);
        const fib = parseFloat(feedProfile.fiber || feedProfile.Fibra || 20);
        const ash = 8; // Estimate
        const eln = 100 - (pb + ee + fib + ash);

        return pb + (ee * 2.25) + fib + eln;
    },

    /**
     * Determine Lifecycle Stage
     * Priority Logic: Lact+Pre > Lact > Gest_Seca > Gest > Empty
     */
    determineStage(ageMonths, sex, isPregnant = false, monthsPregnant = 0, daysPostPartum = 999, bcs = 3.0) {
        // 1. Adult Female Logic (> 15 months)
        if (sex === 'Hembra' && ageMonths > 15) {

            // Case 4: Lactancia Temprana + Gestación Temprana (Alta Demanda)
            // Regla: Días PostParto < 90 AND Gestación < 3 meses
            if (daysPostPartum < 90 && isPregnant && monthsPregnant < 3) {
                return this.LIFECYCLE_CONSTANTS.SPECIAL.EARLY_LACTATION_GESTATION;
            }

            // Case 2/3: Lactancia (Vaca Abierta o preñada pero lactando fuera de zona de peligro)
            // Asumimos lactancia activa si < 305 días postparto (o flag externo, pero usamos días por ahora)
            // NOTA: Si está muy avanzada la gestación (>7m) debería estar seca. Si sigue lactando, es un manejo incorrecto, 
            // pero el sistema debería recomendar Secado. 
            // Para simplificar, si está gestante > 7 meses, forzamos etapa "Seca" (o alerta)

            if (isPregnant && monthsPregnant >= 7) {
                return this.LIFECYCLE_CONSTANTS.SPECIAL.GESTACION_SECA;
            }

            if (daysPostPartum < 305) {
                // Lactancia General
                return this.LIFECYCLE_CONSTANTS.FEMALE.find(s => s.id === 'lactancia_adulta');
            }

            // Case: Gestación (confirmada) pero no lactando (o ya secada < 7 meses)
            if (isPregnant) {
                return this.LIFECYCLE_CONSTANTS.SPECIAL.GESTACION_MEDIA;
            }

            // Case: Vaca Vacía / Mantenimiento
            return this.LIFECYCLE_CONSTANTS.FEMALE.find(s => s.id === 'vaca_vacia');
        }

        // 2. Select List based on Sex
        let list = this.LIFECYCLE_CONSTANTS.FEMALE;
        if (sex === 'Macho') list = this.LIFECYCLE_CONSTANTS.MALE;
        else if (sex === 'Castrado' || sex === 'Buey') list = this.LIFECYCLE_CONSTANTS.OX;

        // 3. Find matching stage by age
        // Find the first stage where age fits
        const stage = list.find(s => ageMonths <= s.maxAgeMonths) || list[list.length - 1];

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
    },

    // --- EXTENSIVE MANAGEMENT (DEHESA) ---
    Extensive: {
        // Standard: 0.70 UGM/ha
        calculateStockingRate(totalUGM, hectares) {
            if (!hectares || hectares <= 0) return 0;
            return totalUGM / hectares;
        },

        checkSustainability(ugmPerHa) {
            const limit = 0.70; // UGM/ha local standard
            if (ugmPerHa > 0.95) return { status: 'CRITICAL', msg: 'Sobrepastoreo crítico (>0.95 UGM/ha). Riesgo erosión y escasez.' };
            if (ugmPerHa > limit) return { status: 'WARNING', msg: 'Sobrecarga (>0.70 UGM/ha). Necesaria suplementación.' };
            return { status: 'OK', msg: 'Carga ganadera sostenible.' };
        },

        // Estimate Pasture Availability (Simplified Model)
        // Returns kg DM/ha/day
        estimatePastureGrowth(season, rainfallLastMonth, soilQualityIndex = 0.5) {
            // Basal growth * Soil Factor * Rain Factor
            let baseGrowth = 0; // kg DM/ha/day
            const rainFactor = Math.min(rainfallLastMonth / 50, 1.5); // Cap at 1.5x for 75mm

            switch (season.toLowerCase()) {
                case 'primavera': baseGrowth = 45; break; // Explosion
                case 'verano': baseGrowth = 5; break; // Drought
                case 'otoño': baseGrowth = 25; break; // Secondary peak
                case 'invierno': baseGrowth = 10; break; // Cold
            }

            return baseGrowth * (0.8 + (soilQualityIndex * 0.4)) * rainFactor;
        }
    },

    // --- QUALITY & HEALTH MODULE ---
    Quality: {
        predictCarcass(dietComposition, breedType) {
            // Diet effects: Grain -> Fat/Marbling, Grass -> Lean/Yellow Fat
            let marblingScore = 0;
            let fatColor = 'Blanca';
            const notes = [];

            // --- BELLOTA / MONTANERA EFFECT ---
            // If Bellota is present significantly (>10% inferred) or protocol active
            const isBellota = dietComposition.isBellota || dietComposition.bellotaPercent > 0.10; // Old check
            const isHighOleic = dietComposition.isHighOleic;

            // Precise Check for Bellota de Encina (User ID)
            // The dietComposition object usually comes from analyzeDietImpact or similar. 
            // We'll trust 'isBellota' comes from the Calculator toggle/feed check.

            if (dietComposition.concentrate > 0.6 && !isBellota) {
                marblingScore += 2; // High grain (Feedlot standard)
                fatColor = 'Blanca brillante';
            } else if (isBellota) {
                // USER SPEC: +10-25% Intramuscular Fat -> Marbling ++
                // USER SPEC: Color 'Amarillo Dorado', Saturación C* high
                marblingScore += 2.5; // High bonus (User said +2 previously, now confirms high fat)
                fatColor = 'Amarillo Dorado (Alto Oleico / Bellota)';
                notes.push('🌰 Calidad Bellota: 60% Ácido Oleico. Alta estabilidad oxidativa.');
                notes.push('✨ Incremento de grasa intramuscular (+25%). Aroma intenso.');
            } else if (isHighOleic) {
                marblingScore += 1.5; // High Oleic Supplement
                fatColor = 'Crema/Amarillenta (Alto Oleico)';
                notes.push('✨ Dieta Alto-Oleico: Perfil lipídico mejorado (Substitución Bellota).');
            } else if (dietComposition.pasture > 0.8) {
                marblingScore -= 1; // Leaner
                fatColor = 'Amarillenta (Beta-carotenos)';
            } else if (dietComposition.silage_maize > 0.5) {
                marblingScore += 1;
                fatColor = 'Crema';
            }

            // Flax Effect
            if (dietComposition.hasFlax) {
                notes.push('Alta en Omega-3. Riesgo Oxidación (Rancidez) si maduración > 14 días.');
            }

            // Bellota Antioxidants
            if (isBellota || isHighOleic) {
                notes.push('✅ Mayor estabilidad oxidativa (Antioxidantes naturales/Lecitina).');
            }

            return { score: marblingScore, fatColor, notes: notes.join(' ') };
        },

        predictSeurop(breed, currentWeight, ageMonths, dietComposition) {
            // Predict Conformation (S-E-U-R-O-P) and Fat (1-5)
            // Simplified Model based on Genetic Potential + Diet Energy

            // 1. Conformation (Muscularity)
            // Base on Breed Type (Beef vs Dairy vs Rustic)
            let confScore = 3; // 'R' default
            const breedName = (breed.name || '').toLowerCase();

            if (breedName.includes('limousin') || breedName.includes('blonde') || breedName.includes('azul')) confScore = 5; // 'E'
            else if (breedName.includes('charolais') || breedName.includes('angus') || breedName.includes('hereford')) confScore = 4; // 'U'
            else if (breedName.includes('frisona') || breedName.includes('holstein')) confScore = 1; // 'P' or 'O'
            else if (breedName.includes('cruce') || breedName.includes('cross')) confScore = 3.5; // 'R/U'

            // Diet Bonus (High Protein/Energy pushes muscle slightly if genetics allow)
            if (dietComposition.concentrate > 0.5 && confScore < 5) confScore += 0.5;

            // Bellota Bonus (Energy density w/o acidosis allows higher growth/conformation)
            if ((dietComposition.isBellota || dietComposition.isHighOleic) && confScore < 5) {
                confScore += 0.5;
            }

            // Map Score to Letter
            const confMap = ['P', 'O', 'R', 'U', 'E', 'S'];
            const confIndex = Math.min(Math.max(Math.round(confScore), 1), 5); // 1-5 index for array access 0-5? 
            // array 0=P(score 1), 1=O(score 2), 2=R(score 3), 3=U(score 4), 4=E(score 5), 5=S(score 6)
            // Let's align: P=0..1, O=2, R=3, U=4, E=5, S=6
            const letter = confMap[Math.min(Math.round(confScore - 1), 5)] || 'R';

            // 2. Fat Class (1-5)
            // Driven by Energy Intake (Starch) and Age
            let fatScore = 2; // Lean default
            if (ageMonths > 12) fatScore = 3;
            if (dietComposition.concentrate > 0.6) fatScore += 1;
            if (breedName.includes('wagyu') || breedName.includes('angus')) fatScore += 1; // Natural fattening

            // Cap at 5
            fatScore = Math.min(fatScore, 5);

            return {
                conformation: letter,
                fat: fatScore,
                classification: `${letter}${fatScore}`
            };
        },

        predictYield(conformation, breed, sex, dietComposition) {
            // Base Yield for Standard Conformation
            const yieldMap = { 'S': 64, 'E': 61, 'U': 59, 'R': 57, 'O': 54, 'P': 50 };
            let yieldPct = yieldMap[conformation] || 57;

            // 1. Breed Modifier
            const breedName = (breed.name || '').toLowerCase();
            if (breedName.includes('azul') || breedName.includes('belga')) yieldPct += 2; // Double muscling
            else if (breedName.includes('limousin') || breedName.includes('blonde')) yieldPct += 1.5;
            else if (breedName.includes('frisona') || breedName.includes('holstein')) yieldPct -= 2; // Dairy structure

            // 2. Sex Modifier
            if (sex && sex.toLowerCase() === 'macho') yieldPct += 1; // Bulls yield higher than steers/heifers
            // Cows (older females) might yield lower due to fat/organ size, already covered partly by conformation map if they score O/P.

            // 3. Diet Modifier (Gut Fill Effect)
            // High Concentrate -> Less Gut Fill -> Higher "Yield" (Carcass/Live)
            if (dietComposition.concentrate > 0.60) yieldPct += 1;
            else if (dietComposition.pasture > 0.70) yieldPct -= 1.5; // High gut fill

            return parseFloat(yieldPct.toFixed(1));
        },

        assessTropicalSuitability(climate, feedPrices) {
            if (climate === 'tropical' && feedPrices.concentrate > 0.40) {
                return ['Clitoria ternatea', 'Neonotonia wightii', 'Soya forrajera'];
            }
            return [];
        }
    },

    // --- NUTRIENT BALANCE MODULE (N/P) ---
    NutrientBalance: {
        /**
         * Calculate N and P Balance (MAPA 2019 Basis)
         * @param {Object} animal - { weight, ageMonths, sex, isPregnant, monthsPregnant, weightGainKg }
         * @param {Object} diet - { dmiKg, proteinPercent, phosphorusPercent }
         * @param {Object} production - { milkYieldKg, milkProteinPercent }
         */
        calculate(animal, diet, production) {
            const results = {
                nitrogen: { intake: 0, retention: 0, excretion: 0, efficiency: 0 },
                phosphorus: { intake: 0, retention: 0, excretion: 0, efficiency: 0 }
            };

            // 1. INTAKE
            // N (g/d) = DMI * (PB%/100) * 1000 * 0.16 (1g N = 6.25g Prot => 1/6.25 = 0.16)
            const crudeProteinKg = diet.dmiKg * (diet.proteinPercent / 100);
            results.nitrogen.intake = (crudeProteinKg * 1000) * 0.16;

            // P (g/d) = DMI * (P%/100) * 1000
            const phosphorusKg = diet.dmiKg * (diet.phosphorusPercent / 100);
            results.phosphorus.intake = phosphorusKg * 1000;

            // 2. RETENTION

            // A. Growth (Tejido Magro/Óseo)
            // Ref: ~21g N/kg gain, ~4g P/kg gain
            const weightGain = Math.max(0, animal.weightGainKg || 0);
            const n_ret_growth = weightGain * 21;
            const p_ret_growth = weightGain * 4;

            // B. Milk (Lactation) - "0.16" factor explicitly requested
            // N_leche = Litros * (Prot_milk%/100) * 1000 * 0.16
            const milkYield = production.milkYieldKg || 0;
            const milkProt = production.milkProteinPercent || 3.2;
            const milkP_conc = 1.9; // g/L approx

            const n_ret_milk = milkYield * (milkProt / 100) * 1000 * 0.16;
            const p_ret_milk = milkYield * milkP_conc;

            // C. Gestation (Fetus - Late Stage)
            // Ref: 1-2g N/d, 0.5g P/d in last trimester (> 7 months)
            let n_ret_fetus = 0;
            let p_ret_fetus = 0;
            if (animal.isPregnant && animal.monthsPregnant > 7) {
                n_ret_fetus = 1.5; // Avg 
                p_ret_fetus = 0.5; // Avg
            }

            // TOTAL RETENTION
            results.nitrogen.retention = n_ret_growth + n_ret_milk + n_ret_fetus;
            results.phosphorus.retention = p_ret_growth + p_ret_milk + p_ret_fetus;

            // 3. EXCRETION & EFFICIENCY
            results.nitrogen.excretion = Math.max(0, results.nitrogen.intake - results.nitrogen.retention);
            results.phosphorus.excretion = Math.max(0, results.phosphorus.intake - results.phosphorus.retention);

            if (results.nitrogen.intake > 0) {
                results.nitrogen.efficiency = (results.nitrogen.retention / results.nitrogen.intake) * 100;
            }
            if (results.phosphorus.intake > 0) {
                results.phosphorus.efficiency = (results.phosphorus.retention / results.phosphorus.intake) * 100;
            }

            return results;
        },

        checkEfficiency(balance) {
            const alerts = [];
            // Nitrogen Checks
            if (balance.nitrogen.efficiency < 15) {
                alerts.push({ type: 'danger', msg: '⚠️ Eficiencia N muy baja (<15%). Exceso de proteína o bajo crecimiento.' });
            } else if (balance.nitrogen.efficiency < 25) {
                alerts.push({ type: 'warning', msg: 'ℹ️ Eficiencia N mejorable (Obj: >25%).' });
            } else if (balance.nitrogen.efficiency > 40) {
                // Too high might indicate protein deficiency limiting potential? Unlikely in beef but possible.
                alerts.push({ type: 'success', msg: '✅ Alta eficiencia de conversión N.' });
            }

            // Phosphorus Checks
            if (balance.phosphorus.efficiency < 20) {
                alerts.push({ type: 'danger', msg: '⚠️ Eficiencia P baja. Revisar minerales.' });
            }

            return alerts;
        },

        getEnvironmentalImpact(balance, weightGain) {
            // KPI: Excretion per kg of Gain (or per Liter if Dairy, keep simple for now)
            // If weightGain is small/zero (maintenance), this metric explodes, handle gracefully.
            if (weightGain <= 0.1) return { label: 'Mantenimiento (Alto Impacto Relativo)', color: 'orange' };

            const nExcretedPerKg = balance.nitrogen.excretion / weightGain; // g N / kg gain

            // Benchmarks (Approx):
            // Good: < 150g N / kg gain? 
            // Feedlot steer: Intake ~150g N, Retain ~30g N => Excrete ~120g N. Gain ~1.5kg.
            // Excretion/Gain = 120/1.5 = 80g N/kg Gain.

            let status = 'Bajo';
            let color = 'green';

            if (nExcretedPerKg > 150) {
                status = 'Crítico (>150g N/kg ganancia)';
                color = '#dc2626'; // Red
            } else if (nExcretedPerKg > 100) {
                status = 'Medio-Alto';
                color = '#ca8a04'; // Yellow
            } else {
                status = 'Óptimo (<100g N/kg)';
                color = '#16a34a'; // Green
            }

            return {
                val: nExcretedPerKg.toFixed(0),
                unit: 'g N / kg prod',
                status: status,
                color: color
            };
        }
    },

    /**
     * Get Expected Transition Events for an Animal
     * @param {Object} animal - Animal object with birthDate
     * @returns {Array} - List of potential events [{ date: 'YYYY-MM-DD', newStage: 'Name', diet: 'Diet Info' }]
     */
    getTransitionEvents(animal) {
        if (!animal || !animal.birthDate) return [];

        const birth = new Date(animal.birthDate);
        const events = [];
        const sex = animal.sex || 'Hembra';
        const list = (sex === 'Macho') ? this.LIFECYCLE_CONSTANTS.MALE : this.LIFECYCLE_CONSTANTS.FEMALE;

        // Iterate through stages to find transition points (Age Limits)
        list.forEach((stage, index) => {
            // We want an event when they *enter* the NEXT stage. 
            // So if current stage ends at 2 months, the event is at 2 months to start the next one.
            // Exception: The last stage has no "next" stage usually.

            if (stage.maxAgeMonths < 900) { // Ignore "Rest of life" stages like Reposicion > 999
                const nextStage = list[index + 1];
                if (nextStage) {
                    const transitionDate = new Date(birth);
                    transitionDate.setDate(transitionDate.getDate() + (stage.maxAgeMonths * 30)); // Approx month

                    events.push({
                        date: transitionDate.toISOString().split('T')[0],
                        newStage: nextStage.name,
                        diet: nextStage.diet,
                        ageMonths: stage.maxAgeMonths
                    });
                }
            }
        });

        return events;
    }
};

window.NutritionEngine = NutritionEngine;
