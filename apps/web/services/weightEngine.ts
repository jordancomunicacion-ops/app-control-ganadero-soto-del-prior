
import { BreedManager, Breed } from './breedManager';

// --- CONSTANTS ---
// Diet Quality Factors (0.0 to 2.0) - Multiplier for the "Potential Daily Gain"
const DIET_QUALITY_MILK = 1.2;
const DIET_QUALITY_WEANING = 0.5; // Stress period
const DIET_QUALITY_FEEDLOT = 1.3; // High energy
const DIET_QUALITY_MONTANERA = 1.5; // Acorns (High Fat/Energy)
const DIET_QUALITY_SPRING = 1.1; // Good pasture
const DIET_QUALITY_SUMMER = 0.4; // Dry pasture
const DIET_QUALITY_AUTUMN = 0.9; // Regrowth
const DIET_QUALITY_WINTER = 0.6; // Cold/Scarcity

// Maturation Rates (k) for Von Bertalanffy roughly adapted for daily/monthly steps
// Higher = Faster maturity (Early breeds)
const K_MATURITY_EARLY = 0.0025; // Daily rate approx
const K_MATURITY_LATE = 0.0018;

export const WeightEngine = {

    isBuey(animal: any, ageMonths: number): boolean {
        if (animal?.category === 'Buey') return true;
        if (animal?.sex === 'Castrado' && ageMonths > 12) return true;
        return false;
    },

    /**
     * Preserved Logic: System Inference
     * Maps farm names or animal properties to the production system.
     */
    inferSystem(animal: any): string {
        const farm = (animal.farm || '').toLowerCase();

        // 1. Feedlot / Intensive
        if (farm.includes('feedlot') || farm.includes('cebo')) {
            return 'Intensivo (Feedlot)';
        }

        // 2. Montanera (SOTO del PRIOR specifics)
        // User Logic: "SOTO del PRIOR" implies capability for Montanera
        if (animal.farm === 'SOTO del PRIOR' || farm.includes('dehesa') || farm.includes('soto')) {
            return 'Montanera (Bellota)';
        }

        // 3. Default
        return 'Extensivo (Pastoreo)';
    },

    /**
     * Get Repro Adjustment (Fetus weight, etc.)
     * Returns absolute KG adjustment to add to base weight.
     */
    getReproStatus(animal: any, events: any[], simulationDate: Date): number {
        if (animal.sex !== 'Hembra') return 0;
        if (!events || events.length === 0) return 0;

        // Sort events descending
        const sortedEvents = [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Find events relevant relative to simulationDate
        const validEvents = sortedEvents.filter(e => new Date(e.date) <= simulationDate);

        const lastParto = validEvents.find(e => e.type === 'Parto');
        const lastInsem = validEvents.find(e => e.type === 'Inseminación' || e.type === 'Monta');

        // GESTATION
        if (lastInsem && (!lastParto || new Date(lastInsem.date) > new Date(lastParto.date))) {
            const daysGest = (simulationDate.getTime() - new Date(lastInsem.date).getTime()) / (1000 * 60 * 60 * 24);
            const monthsGest = daysGest / 30.44;

            // Should verify if diagnosis was negative, but assuming success for simulation if no negative diagnosis
            if (monthsGest > 8.5) return 50;
            if (monthsGest > 7.5) return 30;
            if (monthsGest > 6.0) return 15;
        }

        // LACTATION (Body Condition Loss)
        if (lastParto) {
            const daysPost = (simulationDate.getTime() - new Date(lastParto.date).getTime()) / (1000 * 60 * 60 * 24);
            if (daysPost < 90) return -35;
            if (daysPost < 150) return -15;
        }

        return 0;
    },

    /**
     * MAIN SIMULATION LOGIC (Von Bertalanffy Model)
     * dW/dt = k * (W_inf - W_current)
     */
    calculateRealisticWeight(animal: any, system: string, events: any[] = []): number {
        if (!animal.birth && !animal.birthDate) return 0;
        const birthDate = new Date(animal.birth || animal.birthDate);
        const now = new Date();

        // 1. DETERMINE GENETIC POTENTIAL (Asymptote W_inf)
        // 1. DETERMINE GENETIC POTENTIAL (Asymptote W_inf)
        let breed = BreedManager.getBreedByName(animal.breed);

        // --- 1.1 ROBUST DETECTION (Copied from Inventory) ---
        // Normalize: "Betizú" -> "betizu"
        const rawBreed = animal.breed || '';
        const normalizedBreed = rawBreed.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (!breed && normalizedBreed) {
            if (normalizedBreed.includes('betizu')) {
                breed = {
                    id: 'MANUAL_BETIZU', code: 'BET', name: 'Betizu',
                    biological_type: 'Rustic_European', weight_female_adult: 320, weight_male_adult: 450,
                    adg_feedlot: 0.6, slaughter_age_months: 36
                } as any;
            }
            else if (normalizedBreed.includes('limousin') || normalizedBreed.includes('limusin')) {
                breed = {
                    id: 'MANUAL_LIM', code: 'LIM', name: 'Limousin',
                    biological_type: 'Continental', weight_female_adult: 700, weight_male_adult: 1100,
                    adg_feedlot: 1.4, slaughter_age_months: 18
                } as any;
            }
            else if (normalizedBreed.includes('charol')) {
                breed = {
                    id: 'MANUAL_CHA', code: 'CHA', name: 'Charolais',
                    biological_type: 'Continental', weight_female_adult: 800, weight_male_adult: 1200,
                    adg_feedlot: 1.5, slaughter_age_months: 18
                } as any;
            }
            else if (normalizedBreed.includes('avile')) {
                breed = {
                    id: 'MANUAL_AVI', code: 'AVI', name: 'Avileña',
                    biological_type: 'Rustic_European', weight_female_adult: 550, weight_male_adult: 900,
                    adg_feedlot: 1.1, slaughter_age_months: 24
                } as any;
            }
            else if (normalizedBreed.includes('retinta')) {
                breed = {
                    id: 'MANUAL_RET', code: 'RET', name: 'Retinta',
                    biological_type: 'Rustic_European', weight_female_adult: 580, weight_male_adult: 950,
                    adg_feedlot: 1.1, slaughter_age_months: 24
                } as any;
            }
            else if (normalizedBreed.includes('morucha')) {
                breed = {
                    id: 'MANUAL_MOR', code: 'MOR', name: 'Morucha',
                    biological_type: 'Rustic_European', weight_female_adult: 550, weight_male_adult: 900,
                    adg_feedlot: 1.1, slaughter_age_months: 24
                } as any;
            }
            else if (normalizedBreed.includes('frison')) {
                breed = {
                    id: 'MANUAL_FRI', code: 'FRI', name: 'Frisona',
                    biological_type: 'Dairy', weight_female_adult: 650, weight_male_adult: 1000,
                    adg_feedlot: 1.2, slaughter_age_months: 22
                } as any;
            }
            else if (normalizedBreed.includes('wagyu')) {
                breed = {
                    id: 'MANUAL_WAG', code: 'WAG', name: 'Wagyu',
                    biological_type: 'British', weight_female_adult: 550, weight_male_adult: 850,
                    adg_feedlot: 0.9, slaughter_age_months: 30
                } as any;
            }
            else if (normalizedBreed.includes('mestiz') || normalizedBreed.includes('cruzad')) {
                breed = {
                    id: 'MANUAL_MIX', code: 'MIX', name: 'Mestiza',
                    biological_type: 'Rustic_European', weight_female_adult: 580, weight_male_adult: 950,
                    adg_feedlot: 1.2, slaughter_age_months: 24
                } as any;
            }
        }

        let adultWeight = 600; // Default
        let maturationRate = 0.0020; // Default

        if (breed) {
            adultWeight = animal.sex === 'Hembra' ? breed.weight_female_adult : breed.weight_male_adult;

            // Adjust Maturation Rate based on breed type / biological type
            if (breed.biological_type === 'Rustic_European') {
                maturationRate = 0.0018; // Slower maturity
            } else if (breed.biological_type === 'Continental') {
                maturationRate = 0.0022; // Fast growth but late maturity? Actually they grow fast.
            } else if (breed.biological_type === 'British' || breed.slaughter_age_months < 20) {
                maturationRate = 0.0025; // Early maturity (Angus)
            }
        }

        // Adjust Asymptote for Oxen
        const isEventuallyBuey = animal.category === 'Buey' || animal.sex === 'Castrado';
        if (isEventuallyBuey) {
            adultWeight = adultWeight * 1.25; // 25% larger frame potential
            maturationRate = maturationRate * 0.85; // Grows slower/longer
        }

        // 2. SIMULATION LOOP
        let currentWeight = 40; // Birth
        if (breed) currentWeight = breed.weight_female_adult * 0.07;

        let simDate = new Date(birthDate);
        const maxMonths = 240;
        let monthsSimulated = 0;

        while (simDate < now && monthsSimulated < maxMonths) {
            const ageMonths = monthsSimulated;
            const monthOfYear = simDate.getMonth(); // 0-11

            // A. Determine Diet Factor
            let dietFactor = 1.0;

            // Phase 1: Lactation (0-6m) - Diet is Milk (High Value)
            if (ageMonths <= 6) {
                dietFactor = DIET_QUALITY_MILK;
                // Feedlot creep feeding?
                if (system.includes('Feedlot')) dietFactor *= 1.1;
            }
            // Phase 2: Weaning (6-7m) - Stress
            else if (ageMonths <= 7) {
                dietFactor = DIET_QUALITY_WEANING;
            }
            // Phase 3: Adult/Growing
            else {
                if (system.includes('Feedlot')) {
                    dietFactor = DIET_QUALITY_FEEDLOT;
                }
                else if (system.includes('Montanera')) {
                    // Check Montanera Season AND Buey eligibility
                    const isMontaneraSeason = [9, 10, 11, 0, 1].includes(monthOfYear); // Oct-Feb
                    const canEatBellota = (isEventuallyBuey && ageMonths > 12);

                    if (isMontaneraSeason && canEatBellota) dietFactor = DIET_QUALITY_MONTANERA;
                    else {
                        // Extensive fallback
                        if ([6, 7, 8].includes(monthOfYear)) dietFactor = DIET_QUALITY_SUMMER;
                        else if ([2, 3, 4, 5].includes(monthOfYear)) dietFactor = DIET_QUALITY_SPRING;
                        else dietFactor = DIET_QUALITY_WINTER; // Low if not eating Bellota
                    }
                }
                else {
                    // Extensive Standard
                    if ([6, 7, 8].includes(monthOfYear)) dietFactor = DIET_QUALITY_SUMMER;
                    else if ([2, 3, 4, 5].includes(monthOfYear)) dietFactor = DIET_QUALITY_SPRING;
                    else if ([9, 10].includes(monthOfYear)) dietFactor = DIET_QUALITY_AUTUMN;
                    else dietFactor = DIET_QUALITY_WINTER;
                }
            }

            // B. Calculate Gain using Von Bertalanffy Derivative
            // Gain = k * (Limit - Current) * Diet
            // If animal is above limit (e.g. became skinny?), it loses weight? 
            // In this model, if diet is poor (<1.0), we should dampen the gain or even lose.

            // Refined Logic:
            // Potential Gain = k * (Adult - Current)
            // Actual Gain = Potential * DietFactor
            // BUT: If DietFactor is very low (<0.5), we might lose weight (maintenance cost).
            // Let's simplified: 
            // 1. Calculate Potential Anabolic Gain
            let potentialGain = maturationRate * (adultWeight - currentWeight);

            // 2. Apply Diet Modulo
            // If diet is 1.0, we simulate "normal" growth towards asymptote.
            // If diet is > 1.0 (Feedlot), we grow faster (effectively increasing k locally or overshooting).
            // If diet is < 0.5 (Summer), we might plateau or drop.

            let dailyGain = potentialGain * dietFactor;

            // 3. Maintenance Cost Penalty?
            // As weight increases, maintenance increases. The formula (A-W) handles "slowing down".
            // But real starvation (Summer) should lose weight.
            // If Diet < 0.5 (Summer), treat as negative relative to maintenance?
            if (dietFactor < 0.5 && ageMonths > 6) {
                // Force stagnation or slight loss
                dailyGain = (dietFactor - 0.5) * 0.5; // Negative small amount
            }

            // Step (roughly 30 days)
            const daysInMonth = 30.44;
            currentWeight += dailyGain * daysInMonth;

            // Advance
            simDate.setMonth(simDate.getMonth() + 1);
            monthsSimulated++;
        }

        // 3. APPLY REPRODUCTIVE ADJUSTMENTS (Instantaneous)
        // These are temporary mass (fetus is expelled, fat is burned)
        const reproAdj = this.getReproStatus(animal, events, now);
        currentWeight += reproAdj;

        // Safety Floor
        if (currentWeight < 40) currentWeight = 40;

        return parseFloat(currentWeight.toFixed(1));
    }
};
