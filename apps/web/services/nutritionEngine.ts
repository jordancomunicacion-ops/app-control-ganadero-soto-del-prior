
import { Breed } from './breedManager';
import { suggestRationSkeleton } from './feedSelectionEngine';

/**
 * Estimate Brahman (Bos indicus) fraction from a breed object when the
 * caller doesn't supply one explicitly. Used to scale HLI thresholds and
 * Mateescu et al. (2020) body-temperature plasticity slopes.
 */
export function heatBrahmanGuess(breed: Breed): number {
    if (breed.biological_type === 'Indicus') return 1.0;
    if (breed.biological_type === 'Composite') return 0.5;
    if (breed.code === 'DRM') return 0.5; // Droughtmaster
    return 0;
}

/**
 * HLI critical threshold by genotype (Gaughan/Mader 2008, J Anim Sci).
 * Linear interpolation between unshaded black Bos taurus (86) and Bos
 * indicus (96) by Brahman fraction.
 */
export function hliThresholdByGenotype(brahmanPct: number): number {
    const p = Math.max(0, Math.min(1, brahmanPct));
    return 86 + 10 * p;
}

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
    // Confidence in the predicted effect, based on whether the animal /
    // ration profile matches conditions where the literature has measured
    // the effect (vs. extrapolated heuristically).
    confidence?: 'high' | 'moderate' | 'low';
}

import type { FeedItem } from './feedDatabase';

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
        const targets: KPITargets = {
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
            targets.proteinDensity = Math.min(targets.proteinDensity, 9);
            targets.fiberMin = 30;
        } else if (
            objective.includes('Acabado') ||
            objective.includes('Calidad') ||
            objective === 'Engorde'
        ) {
            // Finishing phase: cap gain, push energy, reduce protein to avoid
            // late-frame muscle growth, allow more concentrate. Marbling and
            // subcutaneous fat are the priority here.
            targets.energyDensity = Math.max(targets.energyDensity, 2.75);
            targets.proteinDensity = Math.min(targets.proteinDensity, 12);
            targets.fiberMin = Math.min(targets.fiberMin, 18);
            targets.maxConcentrate = Math.max(targets.maxConcentrate, 75);
            targets.adg = Math.min(targets.adg, 1.0);
            targets.fcr = Math.max(targets.fcr, 8.0);
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
     *
     * When `farm` and `breed` context are provided, the ration is built from
     * the highest-scoring feeds for that soil + climate + breed combination
     * (see feedSelectionEngine). Without context, falls back to standard
     * dehesa defaults (pasto + cebada/maíz + harina de soja).
     */
    generateSmartDiet(
        targets: KPITargets,
        animal: { weight: number; ageMonths?: number; sex?: string },
        system: string,
        _ingredientsDB: FeedItem[],
        context?: {
            farm?: import('./feedSelectionEngine').FarmAgronomicContext;
            animal?: import('./feedSelectionEngine').AnimalAgronomicContext;
        },
    ): { feed_id: string, feed_name: string, dm_kg: number }[] {
        const diet: { feed_id: string, feed_name: string, dm_kg: number }[] = [];

        // Capacidad de ingesta (curva consistente con calculateRequirements).
        let dmiPct = 0.025;
        if (animal.weight > 400) dmiPct = 0.022;
        if (animal.weight > 700) dmiPct = 0.019;
        const dmiLimit = animal.weight * dmiPct;
        let currentDmi = 0;

        // --- SPECIAL PROTOCOLS ---

        // 1. MONTANERA — vacuno extensivo en dehesa
        //
        // La práctica real (Viera et al. 2024, ITACyL eurocarne #330) NO es
        // "80% bellota + 20% soja" — eso corresponde al cerdo ibérico. En
        // vacuno la base sigue siendo el pasto, la bellota es un complemento
        // estacional (oct-feb) y el efecto de calidad documentado proviene
        // de la suplementación con concentrado alto-oleico (3.12 % oleico MS
        // en bueyes, 1.7 % en terneras) más, opcionalmente, lecitina de soja
        // protegida (0.5 % MS en bueyes, 0.2 % en terneras).
        //
        // El protocolo de acabado completo (con lecitina) solo se activa
        // cuando se justifica científicamente: bueyes ≥36m castrados con
        // objetivo Calidad/Acabado, o terneras F1 con biotipo Británico
        // (Angus-paternal). Para terneros pequeños se aplica el patrón
        // base sin el añadido proteico-graso.
        if (system.includes('Montanera')) {
            const ageM = animal.ageMonths ?? 24;
            const sex = (animal.sex ?? '').toLowerCase();
            const isMatureFinisher = ageM >= 36 && (sex === 'castrado' || sex === 'buey');
            const isFinishingObjective = targets.energyDensity >= 2.7;

            // Forraje base (pasto de dehesa + paja de respaldo): 50–55 % MS
            const forageAmount = dmiLimit * 0.55;
            diet.push({
                feed_id: 'F01',
                feed_name: 'Pasto Dehesa (libre pastoreo)',
                dm_kg: parseFloat(forageAmount.toFixed(1)),
            });
            currentDmi += forageAmount;

            // Bellota estacional. Encina por defecto (mayor oleico). Cuota
            // realista 15–25 % MS según carga ganadera, no 80 %.
            const bellotaAmount = ageM >= 14 ? dmiLimit * 0.22 : 0;
            if (bellotaAmount > 0) {
                diet.push({
                    feed_id: 'BELLHO_01',
                    feed_name: 'Bellota Encina (estacional)',
                    dm_kg: parseFloat(bellotaAmount.toFixed(1)),
                });
                currentDmi += bellotaAmount;
            }

            // Concentrado corrector alto-oleico — solo si objetivo de acabado.
            if (isFinishingObjective) {
                const concAmount = dmiLimit * 0.20;
                diet.push({
                    feed_id: 'OLEIC_CONC',
                    feed_name: 'Concentrado Alto Oleico (acabado)',
                    dm_kg: parseFloat(concAmount.toFixed(1)),
                });
                currentDmi += concAmount;
            }

            // Lecitina protegida: solo el perfil compatible con el estudio.
            //   - Bueyes ≥36m castrados: 0.5 % MS
            //   - Terneras F1 ((Rust×Cont)×British) jóvenes en acabado: 0.2 %
            //     MS — pero detectar el cruce F1×Angus requiere genética, así
            //     que aquí solo se sugiere si edad 6–18m y objetivo Calidad.
            if (isMatureFinisher && isFinishingObjective) {
                const lecAmount = dmiLimit * 0.005; // 0.5 % MS
                diet.push({
                    feed_id: 'LECITHIN_PROT',
                    feed_name: 'Lecitina Soja Protegida (0.5 % MS, buey)',
                    dm_kg: parseFloat(lecAmount.toFixed(2)),
                });
            } else if (isFinishingObjective && ageM >= 6 && ageM <= 18) {
                const lecAmount = dmiLimit * 0.002; // 0.2 % MS
                diet.push({
                    feed_id: 'LECITHIN_PROT',
                    feed_name: 'Lecitina Soja Protegida (0.2 % MS, ternera)',
                    dm_kg: parseFloat(lecAmount.toFixed(2)),
                });
            }

            // Pequeño proteico para terneros en recría dentro de Montanera.
            if (!isFinishingObjective && ageM < 14) {
                const remaining = Math.max(0, dmiLimit - currentDmi);
                if (remaining > 0) {
                    const proteinAmount = remaining * 0.5;
                    diet.push({
                        feed_id: 'P01',
                        feed_name: 'Harina de Soja 47%',
                        dm_kg: parseFloat(proteinAmount.toFixed(1)),
                    });
                }
            }

            return diet;
        }

        // --- STANDARD LOGIC ---
        // Resolución por capas: forraje → energía → proteína. Cuando hay
        // contexto agronómico, los IDs concretos vienen del motor de
        // selección (feedSelectionEngine) que puntúa por suelo + clima +
        // raza + objetivo. Sin contexto, se usan defaults dehesa.
        // Import estático: no hay ciclo (nutritionEngine → feedSelectionEngine
        // → soilEngine → feedDatabase, todo unidireccional).
        const skeleton = context?.farm && context?.animal
            ? suggestRationSkeleton(context.farm, context.animal)
            : undefined;

        // 1. BASE: FORAGE
        let forageId = skeleton?.forage?.id ?? 'paja';
        let forageName = skeleton?.forage?.name ?? 'Paja de Cereal';

        if (!skeleton?.forage) {
            if (system.includes('Extensivo')) {
                forageId = 'F01';
                forageName = 'Pasto Dehesa';
            } else if (system.includes('Ecológico')) {
                forageId = 'F03';
                forageName = 'Heno de Pradera';
            }
        }

        let forageAmount = dmiLimit * 0.2;
        if (targets.energyDensity > 2.7) forageAmount = dmiLimit * 0.12;
        if (targets.energyDensity < 2.3) forageAmount = dmiLimit * 0.50;

        diet.push({ feed_id: forageId, feed_name: forageName, dm_kg: parseFloat(forageAmount.toFixed(1)) });
        currentDmi += forageAmount;

        // 2. FILLER: ENERGY
        let energyId = skeleton?.energy?.id ?? 'C01';
        let energyName = skeleton?.energy?.name ?? 'Maíz Grano';

        if (!skeleton?.energy) {
            // Cebada para baja densidad (climas Med. secos, dieta económica);
            // maíz para densidad alta (cebo y lactancia).
            if (targets.energyDensity < 2.5) {
                energyId = 'C02';
                energyName = 'Cebada';
            }
            if (system.includes('Ecológico')) {
                energyId = 'pienso_eco';
                energyName = 'Pienso Ecológico Certificado';
            }
        }

        let remainingDmi = dmiLimit - currentDmi;
        let energyAmount = remainingDmi * 0.6;
        if (targets.energyDensity > 2.6) energyAmount = remainingDmi * 0.8;
        if (targets.maxConcentrate < 60) {
            energyAmount = Math.min(energyAmount, dmiLimit * (targets.maxConcentrate / 100));
        }

        diet.push({ feed_id: energyId, feed_name: energyName, dm_kg: parseFloat(energyAmount.toFixed(1)) });
        currentDmi += energyAmount;

        // 3. CORRECTOR: PROTEIN
        remainingDmi = dmiLimit - currentDmi;
        if (remainingDmi > 0) {
            let proteinId = skeleton?.protein?.id ?? 'P01';
            let proteinName = skeleton?.protein?.name ?? 'Harina de Soja 47%';

            if (!skeleton?.protein && system.includes('Ecológico')) {
                proteinId = 'guisante_eco';
                proteinName = 'Guisante Ecológico';
            }

            diet.push({ feed_id: proteinId, feed_name: proteinName, dm_kg: parseFloat(remainingDmi.toFixed(1)) });
        }

        return diet;
    },

    // --- ABSOLUTE REQUIREMENTS PER ANIMAL ---
    //
    // `state` describes the physiological / management situation. It must
    // stay aligned with the user-visible objective handled in
    // `calculateKPITargets` and with the hook's mapping. New states
    // ('Recría', 'Calidad') were added so the requirements no longer collapse
    // moderate growth and finishing into "Cebo".
    calculateRequirements(
        weight: number,
        adgTarget: number,
        ageMonths: number,
        state: 'Cebo' | 'Mantenimiento' | 'Recría' | 'Calidad' | 'Gestante' | 'Lactancia',
        sex: 'Macho' | 'Hembra' | 'Castrado'
    ): DietRequirement {
        // Dry-matter intake curve. Capacity drops with weight (physical fill)
        // and with maintenance/finishing states where the animal is no longer
        // pushing intake to grow.
        let dmi_pct = 0.025;
        if (weight > 400) dmi_pct = 0.022;
        if (weight > 700) dmi_pct = 0.019;
        if (state === 'Mantenimiento') {
            // Dry cows / mature bulls don't drive intake; cap at 2.0% (and 1.8%
            // for the very heavy frames previously handled).
            dmi_pct = weight > 600 ? 0.018 : Math.min(dmi_pct, 0.020);
        } else if (state === 'Calidad' && weight > 500) {
            // Finishing animals start refusing once subcutaneous fat builds.
            dmi_pct = Math.min(dmi_pct, 0.020);
        }

        const dmi_capacity_kg = weight * dmi_pct;

        const metabolicWeight = Math.pow(weight, 0.75);
        let nem_req = 0.077 * metabolicWeight; // Mcal NE/day
        if (state === 'Mantenimiento') nem_req *= 1.20;
        else if (state === 'Lactancia') nem_req *= 1.40;

        let sexFactor = 1.0;
        if (sex === 'Hembra') sexFactor = 1.15;
        if (sex === 'Castrado') sexFactor = 1.10;

        const safeAdg = Math.max(0, adgTarget); // negative ADG isn't a feed problem
        const neg_req = (0.05 * metabolicWeight * Math.pow(safeAdg, 1.1)) * sexFactor;
        const total_NE_mcal = nem_req + neg_req;
        const required_Mcal_kg = total_NE_mcal / dmi_capacity_kg;

        // Crude protein floor (% of DM) by state, then refined by weight class.
        let cp_pct: number;
        if (state === 'Mantenimiento') cp_pct = 8.5;
        else if (state === 'Lactancia') cp_pct = 15.0;
        else if (state === 'Gestante') cp_pct = 10.5;
        else if (state === 'Recría') cp_pct = weight < 300 ? 16.0 : 13.0;
        else if (state === 'Calidad') cp_pct = 11.0; // Finishing: avoid late frame growth
        else if (weight < 300) cp_pct = 16.0;
        else if (weight > 500) cp_pct = 11.5;
        else cp_pct = 12.0;

        // Minimum NDF (% of DM) for healthy rumen function.
        let fdn_min = 30;
        if (state === 'Cebo') fdn_min = 15;
        else if (state === 'Calidad') fdn_min = 18;
        else if (state === 'Recría') fdn_min = 22;
        else if (state === 'Lactancia') fdn_min = 28;

        return {
            pb_percent: cp_pct,
            em_mcal: parseFloat(required_Mcal_kg.toFixed(2)),
            fdn_min: fdn_min,
            dmi_capacity_kg: parseFloat(dmi_capacity_kg.toFixed(1)),
        };
    },

    validateDiet(
        activeFeeds: { item: FeedItem; amount: number }[], // Item + Fresh Amount
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
        const legumeKg = activeFeeds.filter(f => (f.item.category as string) === 'Leguminosa' || f.item.name.includes('Alfalfa') || f.item.name.includes('Trébol')).reduce((s, f) => s + (f.amount * (f.item.dm_percent / 100)), 0);
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

    /**
     * Calibrated against Viera et al. (2024) "Calidad de la carne de bueyes
     * y terneras criadas en la dehesa: efecto de la inclusión de lecitina
     * de soja en dietas de acabado ricas en ácido oleico" — eurocarne #330,
     * ITACyL, oct 2024.
     *
     * The study tested two profiles:
     *   1. Bueyes Morucha castrados 4-6 años, 60 d maduración, dieta cebo
     *      3.12 % oleico MS + 0.5 % lecitina protegida → +5 puntos absolutos
     *      de grasa intramuscular (12.2 → 17.3 %), ↓ AGS y ↑ AGM en grasa
     *      subcutánea.
     *   2. Terneras F1 (Morucha × Charolés) × Angus 12-14 m, 14 d maduración,
     *      dieta cebo 1.7 % oleico MS + 0.2 % lecitina → +26 % AGP en grasa
     *      subcutánea, sin cambio significativo en grasa IM (ya muy alta).
     *
     * The study does NOT measure ADG or carcass yield, so neither is boosted
     * here. Only the marbling axis carries a real effect; yield gets a small
     * conservative heuristic flagged as low-confidence.
     *
     * @param options.maturationDays  post-slaughter dry-aging plan in days
     * @param options.oleicPctDM      total dietary oleic acid (% of DM) if
     *                                already computed from the ration
     */
    calculateSynergies(
        rationIngredients: { feed_name: string; oleic_pct_dm?: number }[],
        animal: { sex: string; ageMonths: number; biological_type?: string; breed_code?: string },
        options: { bellotaType?: 'ENCINA' | 'ROBLE'; maturationDays?: number; oleicPctDM?: number } = {},
    ): SynergyResult[] {
        const results: SynergyResult[] = [];
        if (!rationIngredients || rationIngredients.length === 0) return results;

        const names = rationIngredients.map((i) => (i.feed_name || '').toLowerCase());

        const hasBellota = names.some((n) => n.includes('bellota'));
        const hasOleicConc = names.some((n) => n.includes('oleico') || n.includes('alto oleico'));
        const hasLecithin = names.some((n) => n.includes('lecitina'));
        // Plain "harina de soja" is NOT protected lecithin (estudio Viera et al.
        // usa lecitinas encapsuladas, aprobadas EFSA 2016). No la contamos.

        // Total dietary oleic from the ration, falling back to the explicit
        // option or to "bellota presente ⇒ asumimos umbral cumplido".
        const dietOleic =
            options.oleicPctDM ??
            rationIngredients.reduce((sum, i) => sum + (i.oleic_pct_dm ?? 0), 0);
        const oleicEnough = dietOleic >= 1.5 || hasBellota || hasOleicConc;

        if (!oleicEnough || !hasLecithin) return results;

        const sex = (animal.sex || '').toLowerCase();
        const ageM = animal.ageMonths || 0;
        const biotype = animal.biological_type;
        const maturation = options.maturationDays ?? 0;

        const isMatureCastrate = (sex === 'castrado' || sex === 'buey') && ageM >= 36;
        const isYoungBritishFinisher =
            ageM >= 6 && ageM <= 18 && (biotype === 'British' || biotype === 'Composite');

        let bonus_marbling = 0;
        let bonus_yield = 0;
        let description = '';
        let confidence: 'high' | 'moderate' | 'low' = 'low';
        let name = 'ACIDOS_GRASOS_EMULSIONADOS';

        if (isMatureCastrate) {
            // Perfil "Buey Morucha" — efecto máximo demostrado.
            bonus_marbling = 0.6;
            if (options.bellotaType === 'ENCINA' || dietOleic >= 3.0) bonus_marbling += 0.2;
            if (maturation >= 60) bonus_marbling += 0.2; // flavor + estabilidad oxidativa
            bonus_yield = 1.0; // heurística conservadora, NO probada en el estudio
            name = 'ACIDOS_GRASOS_EMULSIONADOS_BUEY';
            description = `🥩 Buey castrado ≥36m + oleico + lecitina protegida${maturation ? ` + maduración ${maturation}d` : ''}: infiltración intramuscular máxima (Viera et al. 2024, ITACyL).`;
            confidence = 'high';
        } else if (isYoungBritishFinisher) {
            // Perfil "Ternera F1×Angus" — efecto moderado demostrado.
            bonus_marbling = 0.3;
            if (maturation >= 14) bonus_marbling += 0.1;
            bonus_yield = 0.3;
            name = 'ACIDOS_GRASOS_EMULSIONADOS_F1';
            description = `🥩 Ternera F1 biotipo Británico (Angus paternal) + oleico + lecitina: perfil graso subcutáneo más insaturado, +AGP (Viera et al. 2024).`;
            confidence = 'moderate';
        } else {
            // Combinación detectada pero perfil del animal no respaldado por
            // el estudio. Aviso, no boost.
            name = 'OLEICO_LECITINA_NO_VALIDADO';
            description =
                'ℹ️ Oleico + lecitina protegida en la ración, pero el efecto solo está demostrado en bueyes castrados ≥36m o terneras F1 con Angus. Sin bonus aplicado.';
            confidence = 'low';
            results.push({
                active: false,
                name,
                bonus_marbling: 0,
                bonus_yield: 0,
                description,
                confidence,
            });
            return results;
        }

        results.push({
            active: true,
            name,
            bonus_marbling,
            bonus_yield,
            description,
            confidence,
        });
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
        options: {
            currentMonth?: number;
            activeSynergies?: string[];
            // Composición de Bos indicus 0–1. Si se omite, se infiere del
            // biotipo. Brahman puro = 1, Brangus 3/8 = 0.375, etc.
            brahmanPercent?: number;
            // Heat-stress context (THI peak diario, idealmente media de los
            // últimos 7 días). Si está presente, sustituye la heurística
            // mes-basada por umbrales HLI por genotipo (Gaughan et al. 2008).
            thi?: number;
        } = {},
    ): number {
        // NEm base — NASEM 2016 (BCNRM): 0.077 Mcal NE/d por kg BW^0.75.
        let nemReq = 0.077 * Math.pow(weight, 0.75);

        // Ajustes por biotipo. Multiplicadores alineados con NASEM 2016 /
        // Galyean & Tedeschi 2021 (Energy Requirements PMC8229771):
        //   Bos indicus: 0.90 (NRC: "10 % less NEm than Bos taurus")
        //   British taurus: 1.00 (referencia)
        //   Continental: 1.05 (mayor frame, más mantenimiento)
        //   Rustic European: 0.90 (frame pequeño + adaptación)
        //   Dairy: 1.20 (mayor metabolismo basal)
        //   Composite: media ponderada vía brahmanPercent abajo
        switch (breed.biological_type) {
            case 'British':
                nemReq *= 1.0;
                break;
            case 'Continental':
                nemReq *= 1.05;
                break;
            case 'Rustic_European':
                nemReq *= 0.9;
                break;
            case 'Dairy':
                nemReq *= 1.2;
                break;
            case 'Indicus':
                nemReq *= 0.9;
                break;
            case 'Composite':
                // Mezcla taurus/indicus: 1.0 (taurus) → 0.9 (indicus) lineal.
                nemReq *= 1.0 - 0.1 * (options.brahmanPercent ?? 0.5);
                break;
            default:
                nemReq *= 1.0;
        }

        // Stress térmico — modelo HLI por genotipo cuando se proporciona THI;
        // fallback mes-basado para retro-compatibilidad.
        if (options.thi !== undefined) {
            // Umbrales Gaughan et al. 2008 (J Anim Sci). Convertimos HLI ≈ THI
            // para feedlot pastoreado (simplificación: en datos reales, HLI
            // incorpora radiación y viento; sin ellos usamos THI como proxy).
            const brahmanPct = options.brahmanPercent ?? heatBrahmanGuess(breed);
            const thiThreshold = hliThresholdByGenotype(brahmanPct);
            const excess = options.thi - thiThreshold;
            if (excess > 0) {
                // Penalización: cada unidad sobre umbral cuesta DMI y NEg.
                // Pendiente de temp corporal por 5 THI: 0.417 °C (Angus puro)
                // → 0.194 °C (Brahman puro). Convertimos esa plasticidad a
                // multiplicador de NEm (a más sensibilidad, más mantenimiento
                // basal para termorregulación).
                const sensitivity = 0.417 - 0.223 * brahmanPct; // Mateescu 2020
                nemReq *= 1 + (excess * sensitivity) / 25;
            }
        } else if (options.currentMonth !== undefined) {
            const m = options.currentMonth;
            if (m >= 5 && m <= 8 && (breed.heat_tolerance || 5) < 5) nemReq *= 1.25; // Verano
            if ((m === 11 || m <= 1) && breed.code === 'AZB') nemReq *= 1.15; // Invierno
        }
        const totalEnergy = dietEnergy * dmi;
        const energyForGain = totalEnergy - nemReq;
        let estADG = energyForGain * 0.35;

        // Functional Type Effect? 
        // Logic generally handled via breed.adg_feedlot cap, but could be enhanced here.
        // For MVP, keeping standard breed params is fine as targets drive the diet design.

        // The oleic+lecithin synergy (Viera et al. 2024, ITACyL) does NOT
        // measure ADG; it measures meat composition (IM fat %, fatty-acid
        // profile, color, sensorial). Applying a +10% ADG boost from the
        // synergy was not evidence-based and has been removed. The synergy
        // affects marbling (handled in CarcassEngine) and yield (modestly).
        if (estADG > 0) estADG = Math.min(estADG, breed.adg_feedlot * 1.2);
        else estADG = Math.max(estADG, -2.0);

        return parseFloat(estADG.toFixed(2));
    }
};
