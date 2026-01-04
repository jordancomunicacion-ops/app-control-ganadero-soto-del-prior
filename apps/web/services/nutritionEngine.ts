
import { Breed } from './breedManager';

export interface DietRequirement {
    pb_percent: number;
    em_mcal: number;
    fdn_min: number;
    dmi_capacity_kg: number; // Intake Capacity
}

export interface DietAlert {
    code: 'ACIDOSIS' | 'LOW_FIBER' | 'BLOAT' | 'BELLOTA_FIBER' | 'BELLOTA_PROTEIN' | 'BELLOTA_TOXICITY' | 'LOW_N_EFF' | 'HIGH_POLLUTION' | 'OK';
    level: 'warning' | 'critical' | 'success';
    message: string;
    action?: string;
}

export interface SynergyResult {
    active: boolean;
    name: string;
    bonus_marbling: number;
    bonus_yield: number;
    description: string;
}

export interface KPITargets {
    adg: number;     // Target Average Daily Gain
    fcr: number;     // Target Feed Conversion Ratio
    energyDensity: number; // Mcal/kg DM
    proteinDensity: number; // % CP
    fiberMin: number; // % FDN
    maxConcentrate: number; // % Max concentrates allowed
}

export const NutritionEngine = {
    BELLOTA_PROTOCOL: {
        season_start_month: 9, // Oct
        season_end_month: 1,   // Feb
        min_oleic_acid: 55,
        min_age_months: 14,
        max_bellota_percent: 40,
        min_fdn_bellota: 28,
        min_protein_bellota: 12,
        // Types
        TYPE_ENCINA: 'ENCINA', // High Oleic
        TYPE_ROBLE: 'ROBLE'    // High Tannins
    },

    /**
     * Calculate KPI Targets based on Objective, Breed, and System
     * Refactor A5: "La dieta recomendada = función de (etapa × tipo_funcional × entorno × manejo)"
     */
    calculateKPITargets(
        animal: { breed: string, sex: string, weight: number, ageMonths: number, functionalType?: string, stage?: string, biological_type?: string },
        objective: string,
        system: string
    ): KPITargets {
        // Defaults (Maintenance / Rustica Base)
        let targets: KPITargets = {
            adg: 0.1, fcr: 0, energyDensity: 2.0, proteinDensity: 10, fiberMin: 35, maxConcentrate: 30
        };

        // Auto-detect Functional Type from Biological Type (if not explicit)
        let fType = animal.functionalType || 'rustica_adaptada';

        if (!animal.functionalType && animal.biological_type) {
            if (animal.biological_type === 'Rustic_European') fType = 'rustica_adaptada';
            else if (animal.biological_type === 'Continental') fType = 'crecimiento_magro'; // Charolais like
            else if (animal.biological_type === 'British') fType = 'infiltracion'; // Angus
            else if (animal.biological_type === 'Dairy') fType = 'aptitud_lechera';
            else if (animal.biological_type === 'Indicus') fType = 'rustica_adaptada';
        }

        const currentStage = animal.stage || (animal.ageMonths < 8 ? 'recria' : 'terminado');

        // --- REGLAS DETERMINISTAS POR TIPO FUNCIONAL (A5) ---

        // 1. Razas Infiltración (Wagyu, Angus-High)
        if (fType === 'infiltracion') {
            if (currentStage === 'terminado' || objective.includes('Engorde') || objective.includes('Cebo') || objective.includes('Eficiencia')) {
                // Objetivo Calidad > Velocidad
                targets.energyDensity = 2.9; // High Energy for marbling
                targets.proteinDensity = 12; // Lower protein to avoid late frame growth
                targets.fiberMin = 15;       // Risk of acidosis managed by alerts
                targets.maxConcentrate = 85;
                targets.adg = 0.9;           // Slower, physiological gain
                targets.fcr = 8.5;           // High FCR expected (fat deposition cost)
            } else {
                // Recría: Preparar estructura
                targets.energyDensity = 2.4;
                targets.proteinDensity = 14;
                targets.adg = 0.8;
            }
        }

        // 2. Crecimiento Magro (Charolais, Limousin)
        else if (fType === 'crecimiento_magro') {
            if (currentStage === 'terminado' || objective.includes('Engorde') || objective.includes('Cebo') || objective.includes('Eficiencia')) {
                // Maximizando músculo
                targets.energyDensity = 2.8;
                targets.proteinDensity = 14.5; // High protein for muscle
                targets.fiberMin = 18;
                targets.maxConcentrate = 80;
                targets.adg = 1.6;             // Aggressive gain
                targets.fcr = 5.8;             // Efficient conversion expected
            } else {
                targets.energyDensity = 2.5;
                targets.proteinDensity = 16;   // Max frame growth
                targets.adg = 1.1;
                targets.fcr = 5.5;
            }
        }

        // 3. Rústica / Adaptada (Morucha, Avileña)
        else if (fType === 'rustica_adaptada') {
            // Prioridad: Coste bajo, fibra, salud
            targets.energyDensity = 2.2;
            targets.proteinDensity = 11;
            targets.fiberMin = 30;         // High fiber health
            targets.maxConcentrate = 40;   // Low supplement
            targets.adg = 0.7;             // Moderate gain
            targets.fcr = 7.5;             // Pasture efficiency

            if (system.includes('Montanera')) {
                targets.adg = 1.0;         // Boost in montanera
                targets.energyDensity = 2.8;
            }
        }

        // 4. Aptitud Lechera (Simmental, Pardo)
        else if (fType === 'aptitud_lechera') {
            // Prioridad: Soporte a lactancia y crecimiento estructura
            targets.energyDensity = 2.6;
            targets.proteinDensity = 15;   // High protein requirement
            targets.fiberMin = 25;
            targets.maxConcentrate = 60;
            targets.adg = 1.2;
            targets.fcr = 6.5;
        }

        // 5. Cárnica General (Limousin, Blonde)
        else if (fType === 'carnica_general') {
            // Balance entre crecimiento y estructura
            targets.energyDensity = 2.7;
            targets.proteinDensity = 14;
            targets.fiberMin = 20;
            targets.maxConcentrate = 70;
            targets.adg = 1.4;
            targets.fcr = 6.2;
        }

        // 6. Doble Propósito (Retinta Estándar, Avileña buena)
        else if (fType === 'doble_proposito') {
            targets.energyDensity = 2.4;
            targets.proteinDensity = 12.5;
            targets.fiberMin = 28;
            targets.maxConcentrate = 50;
            targets.adg = 0.9;
            targets.fcr = 7.2;
        }

        // 4. Composito (F1s) - Hybrid Vigor logic handled by higher ADG targets implicitly or adjustment
        if (fType === 'composito') {
            // Intermediate/Best of both: e.g. F1 Wagyu x Morucha
            targets.adg *= 1.1; // 10% Heterosis boost on target
            targets.fcr *= 0.95; // Better efficiency
        }

        // --- OBJECTIVE OVERRIDES ---
        if (objective === 'Eficiencia Económica') {
            // Reduce max ADG potential slightly to prioritize cheaper feed
            targets.adg *= 0.9;
            targets.maxConcentrate *= 0.8; // Reduce expensive feed limit
            targets.energyDensity = Math.max(2.0, targets.energyDensity * 0.95);
        } else if (objective === 'Mantenimiento') {
            targets.energyDensity = 2.0;
            targets.adg = 0.1;
            targets.maxConcentrate = 10;
        }

        // --- SYSTEM CONSTRAINTS (Overrides) ---
        if (system.includes('Extensivo') && !system.includes('Montanera')) {
            targets.maxConcentrate = Math.min(targets.maxConcentrate, 30);
            targets.adg = Math.min(targets.adg, 0.8);
        }

        return targets;
    },

    /**
     * Generate Smart Diet Recommendation
     * Returns a list of ingredients and amounts to meet targets.
     */
    generateSmartDiet(
        targets: KPITargets,
        animal: { weight: number },
        system: string,
        ingredientsDB: any[] // Provide list of available feeds
    ): { feed_id: string, feed_name: string, dm_kg: number }[] {
        const diet: { feed_id: string, feed_name: string, dm_kg: number }[] = [];

        // Est. DMI limit
        const dmiLimit = animal.weight * 0.025; // 2.5% BW
        let currentDmi = 0;

        // --- SPECIAL PROTOCOLS ---

        // 1. MONTANERA (Bellota + Soja)
        if (system.includes('Montanera')) {
            // Safety Forage (Minimum)
            // 'paja' ID inferred from previous code
            // User feedback: "Necesita algo de fibra". Increased to 15% to satisfy FDN requirements (>20%)
            const forageAmount = dmiLimit * 0.15;
            diet.push({ feed_id: 'paja', feed_name: 'Paja de Cereales', dm_kg: parseFloat(forageAmount.toFixed(1)) });
            currentDmi += forageAmount;

            const remaining = dmiLimit - currentDmi;

            // Bellota (80% of rest) - ID: BELLHO_01
            // Default generic name, UI will refine type logic
            const bellotaAmount = remaining * 0.80;
            diet.push({ feed_id: 'BELLHO_01', feed_name: 'Bellota de Encina', dm_kg: parseFloat(bellotaAmount.toFixed(1)) });

            // Soja (20% of rest) - ID: P01
            const sojaAmount = remaining * 0.20;
            diet.push({ feed_id: 'P01', feed_name: 'Soja (Harina 44%)', dm_kg: parseFloat(sojaAmount.toFixed(1)) });

            return diet;
        }

        // --- STANDARD LOGIC ---
        // Basic Solver: Fill Fiber > Fill Energy > Fill Protein

        // 1. BASE: FORAGE
        let forageId = 'paja';
        let forageName = 'Paja de Cereales';
        let forageAmount = dmiLimit * 0.2;

        // If High Performance (Marbling/Feedlot) -> Less Forage
        if (targets.energyDensity > 2.7) forageAmount = dmiLimit * 0.12;

        // If Rustica/Maintenance -> More Forage
        if (targets.energyDensity < 2.3) forageAmount = dmiLimit * 0.50;

        if (system.includes('Extensivo')) {
            forageId = 'F01';
            forageName = 'Pasto Dehesa (Primavera)';
        } else if (system.includes('Ecológico')) {
            forageId = 'F03'; // Heno
            forageName = 'Heno de Avena';
        }

        diet.push({ feed_id: forageId, feed_name: forageName, dm_kg: parseFloat(forageAmount.toFixed(1)) });
        currentDmi += forageAmount;

        // 2. FILLER: ENERGY
        let energyId = 'C01'; // Maiz
        let energyName = 'Maíz (Grano)';

        // Use Barley for Rustic? (Cheaper/Lower Energy?)
        if (targets.energyDensity < 2.5) {
            energyId = 'C02'; // Cebada
            energyName = 'Cebada';
        }

        if (system.includes('Ecológico')) {
            energyId = 'C01'; // Assuming Corn is allowed or swapping to Tritordeum if ID known. 
            // Let's stick to C01 for now as generic Cereal.
            energyName = 'Cereal Ecológico';
        }

        let remainingDmi = dmiLimit - currentDmi;
        // Basic Logic from targets (Regla A5 details here are implicitly handled by targets.maxConcentrate and energyDensity)
        // If targets.maxConcentrate is low (Rustica), we limit energy filler
        let energyAmount = remainingDmi * 0.6; // Default

        // Adjust based on targets (Simplistic solver)
        if (targets.energyDensity > 2.6) {
            energyAmount = remainingDmi * 0.8; // High energy
        }
        if (targets.maxConcentrate < 60) {
            energyAmount = Math.min(energyAmount, dmiLimit * (targets.maxConcentrate / 100));
        }

        diet.push({ feed_id: energyId, feed_name: energyName, dm_kg: parseFloat(energyAmount.toFixed(1)) });
        currentDmi += energyAmount;

        // 3. CORRECTOR: PROTEIN
        remainingDmi = dmiLimit - currentDmi;
        if (remainingDmi > 0) {
            let proteinId = 'P01'; // Soja
            let proteinName = 'Soja (Harina 44%)';

            if (system.includes('Ecológico')) {
                // Eco protein? Maybe Peas. Assuming 'P01' is conventional soy. 
                // Using 'Guisantes' if ID exists, otherwise keep generic.
                proteinName = 'Guisantes Proteicos';
            }

            diet.push({ feed_id: proteinId, feed_name: proteinName, dm_kg: parseFloat(remainingDmi.toFixed(1)) });
        }

        return diet;
    },

    // --- EXISTING CALCULATIONS (Preserved and Updated if needed) ---
    calculateRequirements(
        weight: number,
        adgTarget: number,
        ageMonths: number,
        state: 'Cebo' | 'Mantenimiento' | 'Gestante' | 'Lactancia',
        sex: 'Macho' | 'Hembra' | 'Castrado'
    ): DietRequirement {
        // ... (Same as before, good baseline) ...
        // Re-implementing essentially the same logic for compatibility
        // DMI (Dry Matter Intake) Estimation Curve
        // Standard: 2.5% for growing calves.
        // Finishing (>400kg): 2.2%.
        // Heavy Finishing / Oxen (>700kg): Drops due to physical capacity and fatness (1.8% - 2.0%)
        let dmi_pct = 0.025;
        if (weight > 400) dmi_pct = 0.022;
        if (weight > 700) dmi_pct = 0.019; // Optimized for heavy oxen
        if (state === 'Mantenimiento' && weight > 600) dmi_pct = 0.018;

        const dmi_capacity_kg = weight * dmi_pct;

        const metabolicWeight = Math.pow(weight, 0.75);
        let nem_req = 0.077 * metabolicWeight;
        if (state === 'Mantenimiento') nem_req *= 1.20;

        let sexFactor = 1.0;
        if (sex === 'Hembra') sexFactor = 1.15;
        if (sex === 'Castrado') sexFactor = 1.10;

        const neg_req = (0.05 * metabolicWeight * Math.pow(adgTarget, 1.1)) * sexFactor;
        const total_NE_mcal = nem_req + neg_req;
        const required_Mcal_kg = total_NE_mcal / dmi_capacity_kg;

        let cp_pct = 12;
        if (state === 'Mantenimiento') cp_pct = 8.5;
        else if (state === 'Lactancia') cp_pct = 15.0;
        else if (weight < 300) cp_pct = 16.0;
        else if (weight > 500) cp_pct = 11.5;

        let fdn_min = 30;
        if (state === 'Cebo') fdn_min = 15;
        if (state === 'Lactancia') fdn_min = 28;

        return {
            pb_percent: cp_pct,
            em_mcal: parseFloat(required_Mcal_kg.toFixed(2)),
            fdn_min: fdn_min,
            dmi_capacity_kg: parseFloat(dmi_capacity_kg.toFixed(1))
        };
    },

    validateDiet(
        activeFeeds: { item: any, amount: number }[], // Item + Fresh Amount
        metrics: { totalDMI: number, totalFDN: number, totalProteinVal: number, totalEnergy: number, reqs: DietRequirement },
        system: string
    ): DietAlert[] {
        const alerts: DietAlert[] = [];
        if (metrics.totalDMI <= 0) return alerts;

        const fdnPct = (metrics.totalFDN / metrics.totalDMI); // As decimal (0.30 = 30%)
        const cpPct = (metrics.totalProteinVal / 10 / metrics.totalDMI); // As decimal (0.12 = 12%)

        const safeSystem = String(system || '');

        // 1. ACIDOSIS RISK
        // General Rule: FDN < 28% is risk in Extensive. Feedlots tolerate down to 15% with management.
        let minFdn = 0.28;
        if (safeSystem.includes('Cebo') || safeSystem.includes('Intensivo')) minFdn = 0.15;

        if (fdnPct < minFdn) {
            alerts.push({
                code: 'ACIDOSIS',
                level: 'critical',
                message: `Riesgo de Acidosis: Fibra muy baja (${(fdnPct * 100).toFixed(1)}%). Mínimo recomendado: ${(minFdn * 100).toFixed(0)}%.`,
                action: 'Aumente la proporción de forraje o fibra efectiva.'
            });
        }
        else if (fdnPct < (minFdn + 0.04)) { // Warning zone
            alerts.push({
                code: 'LOW_FIBER',
                level: 'warning',
                message: `Fibra ajustada (${(fdnPct * 100).toFixed(1)}%). Vigile la rumia.`,
                action: 'Considere añadir algo más de paja o heno.'
            });
        }

        // 2. METEORISMO (Bloat)
        // Heuristic: If Legumes > 50% OR FDN < 20% (Double Trigger)
        const legumeKg = activeFeeds.filter(f => f.item.category === 'Leguminosa' || f.item.name.includes('Alfalfa') || f.item.name.includes('Trébol')).reduce((s, f) => s + (f.amount * (f.item.dm_percent / 100)), 0);
        const legumePct = legumeKg / metrics.totalDMI;

        if (legumePct > 0.5 || (legumePct > 0.3 && fdnPct < 0.22)) {
            alerts.push({
                code: 'BLOAT',
                level: 'critical',
                message: 'Alto Riesgo de Meteorismo (Hinchazón).',
                action: 'Exceso de leguminosas. Añada paja o aceite/bloque anti-meteorismo.'
            });
        }

        // 3. BELLOTA SPECIFIC RISKS
        if (safeSystem.includes('Montanera')) {
            const bellotaKg = activeFeeds.filter(f => f.item.name.toLowerCase().includes('bellota')).reduce((s, f) => s + (f.amount * (f.item.dm_percent / 100)), 0);
            const bellotaPct = bellotaKg / metrics.totalDMI;

            const forageKg = activeFeeds.filter(f => f.item.category === 'Forraje').reduce((s, f) => s + (f.amount * (f.item.dm_percent / 100)), 0);
            const foragePct = forageKg / metrics.totalDMI;

            // BELLOTA_FIBER
            if (bellotaPct > 0 && foragePct < 0.10) {
                alerts.push({
                    code: 'BELLOTA_FIBER',
                    level: 'critical',
                    message: 'Falta de Fibra en Montanera.',
                    action: 'La bellota no tiene fibra efectiva. El animal DEBE comer hierba o paja.'
                });
            }

            // BELLOTA_PROTEIN
            // If Bellota is high (>60%) and CP is low (<10%), muscle growth will stop.
            if (bellotaPct > 0.6 && cpPct < 0.10) {
                alerts.push({
                    code: 'BELLOTA_PROTEIN',
                    level: 'warning',
                    message: 'Déficit Proteico en Montanera.',
                    action: 'La bellota es energética pero baja en proteína. Suplemente con torta de girasol/soja si busca crecimiento.'
                });
            }

            // BELLOTA_TOXICITY (Tannins)
            // Mock check: If 'Roble' type (higher tannin) is selected > 50%
            const robleKg = activeFeeds.filter(f => f.item.name.toLowerCase().includes('roble')).reduce((s, f) => s + (f.amount * (f.item.dm_percent / 100)), 0);
            if (robleKg / metrics.totalDMI > 0.5) {
                alerts.push({
                    code: 'BELLOTA_TOXICITY',
                    level: 'warning',
                    message: 'Precaución: Exceso de Taninos (Roble).',
                    action: 'Carga alta de bellota amarga. Vigile el estreñimiento o rechazo.'
                });
            }
        }

        // 4. NITROGEN EFFICIENCY & POLLUTION
        const requiredCP = metrics.reqs.pb_percent / 100; // e.g. 0.13

        // Low Efficiency: We are feeding LESS protein than needed (-2% margin)
        if (cpPct < (requiredCP - 0.02)) {
            alerts.push({
                code: 'LOW_N_EFF',
                level: 'critical',
                message: `Déficit de Proteína (${(cpPct * 100).toFixed(1)}% vs ${(requiredCP * 100).toFixed(1)}%).`,
                action: 'El crecimiento se detendrá. Añada proteaginosas.'
            });
        }

        // Pollution: We are feeding TOO MUCH protein (> +4% margin)
        // Costly and polluting.
        if (cpPct > (requiredCP + 0.04)) {
            alerts.push({
                code: 'HIGH_POLLUTION',
                level: 'warning',
                message: `Exceso de Nitrógeno (+${((cpPct - requiredCP) * 100).toFixed(1)}%). Contaminante y caro.`,
                action: 'Reduzca la proteína para mejorar la eficiencia económica y ambiental.'
            });
        }

        return alerts;
    },

    calculateSynergies(
        rationIngredients: { feed_name: string }[],
        animal: { sex: string, ageMonths: number },
        options: { bellotaType?: string } = {}
    ): SynergyResult[] {
        const results: SynergyResult[] = [];
        const names = rationIngredients.map(i => i.feed_name.toLowerCase());
        const hasBellota = names.some(n => n.includes('bellota'));
        const hasLecithin = names.some(n => n.includes('lecitina') || n.includes('harina de soja'));

        if (hasBellota && hasLecithin) {
            let boost = 0.5;
            if (animal.sex === 'Castrado' || animal.sex === 'Buey') boost = 0.8;

            // NEW: Type specific boost
            let desc = '🔥 Bellota + Lecitina: Infiltración mejorada.';
            if (options.bellotaType === 'ENCINA') {
                boost += 0.4; // 1.2 Total for Castrado
                desc = '🔥 Bellota Encina (Alto Oleico): Infiltración Máxima.';
            } else if (options.bellotaType === 'ROBLE') {
                // Std boost
                desc = '🍂 Bellota Roble (Taninos): Sabor Intenso.';
            }

            results.push({
                active: true, name: 'ACIDOS_GRASOS_EMULSIONADOS', bonus_marbling: boost, bonus_yield: 1.5,
                description: desc
            });
        }
        return results;
    },

    checkBellotaCompliance(animal: { ageMonths: number }, currentMonth: number) {
        // Preserved
        const validMonths = [9, 10, 11, 0, 1];
        if (!validMonths.includes(currentMonth)) return { compliant: false, reason: 'Fuera temporada' };
        if (animal.ageMonths < 14) return { compliant: false, reason: 'Muy joven <14m' };
        return { compliant: true };
    },

    calculateNitrogenBalance(weight: number, adg: number, dietPbPercent: number, dmiKg: number) {
        // Preserved
        const proteinIntakeG = dmiKg * (dietPbPercent / 100) * 1000;
        const nIntake = proteinIntakeG / 6.25;
        const nRetained = adg * 1000 * 0.027;
        const nExcreted = Math.max(0, nIntake - nRetained);
        const effic = nIntake > 0 ? (nRetained / nIntake) * 100 : 0;
        const excretionPerGain = adg > 0.1 ? nExcreted / adg : 0;
        return {
            n_intake_g: nIntake.toFixed(1),
            n_retained_g: nRetained.toFixed(1),
            n_excreted_g: nExcreted.toFixed(1),
            efficiency_pct: effic.toFixed(1),
            excretion_per_gain: excretionPerGain.toFixed(1),
            is_critical: excretionPerGain > 150
        };
    },

    predictPerformance(
        breed: Breed,
        dietEnergy: number,
        dmi: number,
        weight: number,
        options: { currentMonth?: number, activeSynergies?: string[] } = {}
    ): number {
        // Preserved
        let nemReq = 0.077 * Math.pow(weight, 0.75);

        // Biological Type Adjustments (Consistent with Inventory)
        if (breed.biological_type === 'Rustic_European') nemReq *= 0.9;
        else if (breed.biological_type === 'Continental') nemReq *= 1.05;
        else if (breed.biological_type === 'Dairy') nemReq *= 1.25;
        else if (breed.biological_type === 'Indicus') nemReq *= 0.85;

        if (options.currentMonth !== undefined) {
            const m = options.currentMonth;
            if (m >= 5 && m <= 8 && (breed.heat_tolerance || 5) < 5) nemReq *= 1.25; // Summer
            if ((m === 11 || m <= 1) && breed.code === 'AZB') nemReq *= 1.15; // Winter
        }
        const totalEnergy = dietEnergy * dmi;
        const energyForGain = totalEnergy - nemReq;
        let estADG = energyForGain * 0.35;

        // Functional Type Effect? 
        // Logic generally handled via breed.adg_feedlot cap, but could be enhanced here.
        // For MVP, keeping standard breed params is fine as targets drive the diet design.

        if (options.activeSynergies?.includes('ACIDOS_GRASOS_EMULSIONADOS')) estADG *= 1.10;
        if (estADG > 0) estADG = Math.min(estADG, breed.adg_feedlot * 1.2);
        else estADG = Math.max(estADG, -2.0);

        return parseFloat(estADG.toFixed(2));
    }
};
