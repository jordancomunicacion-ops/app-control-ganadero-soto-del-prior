
export interface Breed {
    id: string;
    code: string;
    name: string;
    // Taxonomy & Type
    subspecies: 'Bos taurus' | 'Bos indicus' | 'Cruzado';
    biological_type: 'British' | 'Continental' | 'Rustic_European' | 'Dairy' | 'Indicus' | 'Composite';

    weight_male_adult: number;
    weight_female_adult: number;
    slaughter_age_months: number;
    adg_feedlot: number;
    adg_grazing: number;
    fcr_feedlot: number;
    heat_tolerance: number; // 1-10
    marbling_potential: number; // 1-5
    calving_ease: number; // 1-10 (10=Easy)

    // New Sapiens Params
    milk_potential: number; // 1-5
    conformation_potential: number; // 1-6 (P-S)
    yield_potential: number; // 0.50-0.70

    is_hybrid?: boolean;
    sire_name?: string;
    dam_name?: string;
}

export const BASE_BREEDS: Breed[] = [
    // 1. Infiltración Alta (British)
    { id: 'WAG', code: 'WAG', name: 'Wagyu', subspecies: 'Bos taurus', biological_type: 'British', weight_male_adult: 850, weight_female_adult: 550, slaughter_age_months: 29, adg_feedlot: 0.90, adg_grazing: 0.60, fcr_feedlot: 8.5, heat_tolerance: 5, marbling_potential: 5, calving_ease: 9, milk_potential: 2, conformation_potential: 3, yield_potential: 0.58 },
    { id: 'ANG', code: 'ANG', name: 'Angus', subspecies: 'Bos taurus', biological_type: 'British', weight_male_adult: 900, weight_female_adult: 500, slaughter_age_months: 18, adg_feedlot: 1.40, adg_grazing: 0.90, fcr_feedlot: 7.9, heat_tolerance: 4, marbling_potential: 4, calving_ease: 8, milk_potential: 3, conformation_potential: 4, yield_potential: 0.60 },

    // 2. Crecimiento Magro / Conformación (Continental)
    { id: 'CHA', code: 'CHA', name: 'Charolais', subspecies: 'Bos taurus', biological_type: 'Continental', weight_male_adult: 1100, weight_female_adult: 800, slaughter_age_months: 24, adg_feedlot: 1.50, adg_grazing: 1.00, fcr_feedlot: 7.2, heat_tolerance: 3, marbling_potential: 2, calving_ease: 4, milk_potential: 2, conformation_potential: 5, yield_potential: 0.65 },
    { id: 'LIM', code: 'LIM', name: 'Limousin', subspecies: 'Bos taurus', biological_type: 'Continental', weight_male_adult: 950, weight_female_adult: 650, slaughter_age_months: 16, adg_feedlot: 1.40, adg_grazing: 0.90, fcr_feedlot: 7.4, heat_tolerance: 4, marbling_potential: 3, calving_ease: 6, milk_potential: 2, conformation_potential: 5, yield_potential: 0.64 },
    { id: 'BDA', code: 'BDA', name: 'Blonde d\'Aquitaine', subspecies: 'Bos taurus', biological_type: 'Continental', weight_male_adult: 1200, weight_female_adult: 700, slaughter_age_months: 18, adg_feedlot: 1.60, adg_grazing: 1.10, fcr_feedlot: 7.1, heat_tolerance: 3, marbling_potential: 2, calving_ease: 5, milk_potential: 2, conformation_potential: 5, yield_potential: 0.67 },
    { id: 'AZB', code: 'AZB', name: 'Azul Belga', subspecies: 'Bos taurus', biological_type: 'Continental', weight_male_adult: 1175, weight_female_adult: 775, slaughter_age_months: 16, adg_feedlot: 1.70, adg_grazing: 1.00, fcr_feedlot: 6.8, heat_tolerance: 1, marbling_potential: 1, calving_ease: 2, milk_potential: 2, conformation_potential: 6, yield_potential: 0.70 },
    { id: 'PIR', code: 'PIR', name: 'Pirenaica', subspecies: 'Bos taurus', biological_type: 'Rustic_European', weight_male_adult: 900, weight_female_adult: 600, slaughter_age_months: 18, adg_feedlot: 1.30, adg_grazing: 0.85, fcr_feedlot: 7.8, heat_tolerance: 5, marbling_potential: 3, calving_ease: 7, milk_potential: 2, conformation_potential: 4, yield_potential: 0.62 },

    // 3. Rústicas Adaptadas
    { id: 'MOR', code: 'MOR', name: 'Morucha', subspecies: 'Bos taurus', biological_type: 'Rustic_European', weight_male_adult: 900, weight_female_adult: 500, slaughter_age_months: 30, adg_feedlot: 1.10, adg_grazing: 0.70, fcr_feedlot: 8.4, heat_tolerance: 8, marbling_potential: 3, calving_ease: 8, milk_potential: 2, conformation_potential: 2, yield_potential: 0.54 },
    { id: 'RET', code: 'RET', name: 'Retinta', subspecies: 'Bos taurus', biological_type: 'Rustic_European', weight_male_adult: 1000, weight_female_adult: 580, slaughter_age_months: 30, adg_feedlot: 1.10, adg_grazing: 0.75, fcr_feedlot: 8.3, heat_tolerance: 8, marbling_potential: 3, calving_ease: 8, milk_potential: 2, conformation_potential: 3, yield_potential: 0.56 },
    { id: 'BER', code: 'BER', name: 'Berrenda', subspecies: 'Bos taurus', biological_type: 'Rustic_European', weight_male_adult: 800, weight_female_adult: 500, slaughter_age_months: 23, adg_feedlot: 1.10, adg_grazing: 0.70, fcr_feedlot: 8.3, heat_tolerance: 8, marbling_potential: 3, calving_ease: 8, milk_potential: 2, conformation_potential: 3, yield_potential: 0.55 },
    { id: 'BET', code: 'BET', name: 'Betizu', subspecies: 'Bos taurus', biological_type: 'Rustic_European', weight_male_adult: 450, weight_female_adult: 325, slaughter_age_months: 36, adg_feedlot: 0.90, adg_grazing: 0.55, fcr_feedlot: 9.2, heat_tolerance: 7, marbling_potential: 2, calving_ease: 10, milk_potential: 1, conformation_potential: 2, yield_potential: 0.50 },

    // 4. Doble Propósito / Lecheras (Dairy)
    { id: 'SIM', code: 'SIM', name: 'Simmental', subspecies: 'Bos taurus', biological_type: 'Dairy', weight_male_adult: 1100, weight_female_adult: 750, slaughter_age_months: 18, adg_feedlot: 1.50, adg_grazing: 0.85, fcr_feedlot: 7.0, heat_tolerance: 4, marbling_potential: 3, calving_ease: 6, milk_potential: 3, conformation_potential: 5, yield_potential: 0.63 },
    { id: 'HER', code: 'HER', name: 'Hereford', subspecies: 'Bos taurus', biological_type: 'British', weight_male_adult: 1000, weight_female_adult: 580, slaughter_age_months: 20, adg_feedlot: 1.40, adg_grazing: 0.80, fcr_feedlot: 7.8, heat_tolerance: 3, marbling_potential: 3, calving_ease: 7, milk_potential: 2, conformation_potential: 4, yield_potential: 0.58 },
    { id: 'HOL', code: 'HOL', name: 'Holstein', subspecies: 'Bos taurus', biological_type: 'Dairy', weight_male_adult: 1000, weight_female_adult: 650, slaughter_age_months: 20, adg_feedlot: 1.20, adg_grazing: 0.60, fcr_feedlot: 8.5, heat_tolerance: 2, marbling_potential: 2, calving_ease: 5, milk_potential: 5, conformation_potential: 2, yield_potential: 0.52 },
    { id: 'FRI', code: 'FRI', name: 'Frisona', subspecies: 'Bos taurus', biological_type: 'Dairy', weight_male_adult: 950, weight_female_adult: 600, slaughter_age_months: 20, adg_feedlot: 1.15, adg_grazing: 0.60, fcr_feedlot: 8.6, heat_tolerance: 2, marbling_potential: 2, calving_ease: 5, milk_potential: 5, conformation_potential: 2, yield_potential: 0.51 },

    // 5. Indicus
    { id: 'BRA', code: 'BRA', name: 'Brahman', subspecies: 'Bos indicus', biological_type: 'Indicus', weight_male_adult: 900, weight_female_adult: 550, slaughter_age_months: 24, adg_feedlot: 1.10, adg_grazing: 0.80, fcr_feedlot: 8.0, heat_tolerance: 10, marbling_potential: 2, calving_ease: 9, milk_potential: 3, conformation_potential: 3, yield_potential: 0.57 },
    { id: 'NEL', code: 'NEL', name: 'Nelore', subspecies: 'Bos indicus', biological_type: 'Indicus', weight_male_adult: 900, weight_female_adult: 550, slaughter_age_months: 26, adg_feedlot: 1.05, adg_grazing: 0.75, fcr_feedlot: 8.2, heat_tolerance: 10, marbling_potential: 2, calving_ease: 9, milk_potential: 2, conformation_potential: 3, yield_potential: 0.58 },
    { id: 'DRM', code: 'DRM', name: 'Droughtmaster', subspecies: 'Cruzado', biological_type: 'Composite', weight_male_adult: 900, weight_female_adult: 550, slaughter_age_months: 24, adg_feedlot: 1.20, adg_grazing: 0.90, fcr_feedlot: 7.9, heat_tolerance: 9, marbling_potential: 3, calving_ease: 9, milk_potential: 2, conformation_potential: 3, yield_potential: 0.58 },
];

export const BreedManager = {
    getAllBreeds(): Breed[] {
        return BASE_BREEDS;
    },

    getBreedById(id: string): Breed | undefined {
        return BASE_BREEDS.find(b => b.id === id || b.code === id);
    },

    getBreedByName(name: string): Breed | undefined {
        return BASE_BREEDS.find(b => b.name.toLowerCase() === name.toLowerCase());
    },

    /**
     * Calculate F1 Hybrid Metrics with Advanced Bio-Genetic Model
     * Uses:
     * 1. Genetic Distance Matrix (Heterosis Factor)
     * 2. Trait-Specific Heterosis (ADG vs Marbling)
     * 3. Maternal Constraints (Uterine Crowding)
     */
    calculateHybrid(sireId: string, damId: string): Breed | null {
        const sire = this.getBreedById(sireId);
        const dam = this.getBreedById(damId);

        if (!sire || !dam) return null;

        // --- 1. GENETIC DISTANCE HETEROSIS CALCULATION ---
        const typeGroups = {
            'British': 1, // Early, Fat
            'Continental': 2, // Lean, Yield
            'Rustic_European': 3, // Hardy, Slow
            'Dairy': 4, // Metabolic, High Milk
            'Indicus': 5, // Adaptation, Heat
            'Composite': 3 // Generic
        };

        const sireG = typeGroups[sire.biological_type] || 3;
        const damG = typeGroups[dam.biological_type] || 3;

        let heterosisFactor = 0.0;

        if (sireG === damG) {
            // Same Biological Type (Angus x Hereford) -> Low Heterosis
            heterosisFactor = 0.02; // 2%
        } else {
            // Different Biological Type (Angus x Charolais) -> High Heterosis (Complementarity)
            heterosisFactor = 0.05; // 5%
        }

        // Special Boost: Indicus x Taurus
        const isIndicusSire = sire.biological_type === 'Indicus';
        const isIndicusDam = dam.biological_type === 'Indicus';
        if (isIndicusSire !== isIndicusDam) {
            heterosisFactor = 0.12; // 12% Classic Hybrid Vigor explosion
        }

        // --- 2. TRAIT SPECIFIC HETEROSIS ---
        // Growth (ADG): High Heritability but also High Heterosis
        const h_adg = heterosisFactor * 1.5; // Growth benefits most
        // Yield: Moderate
        const h_yield = heterosisFactor * 0.5;
        // Marbling: Low (Additive)
        const h_marbling = 0; // Purely additive usually, maybe 1% if lucky, sticking to 0 for accuracy

        // --- 3. MATERNAL CONSTRAINT (Physiological Dampening) ---
        // If Sire is massive and Dam is tiny, the calf is restricted in utero.
        // It enters part of the penalty into ADG Potential until it catches up (compensatory growth later, but average is lower).
        const sizeRatio = sire.weight_male_adult / dam.weight_female_adult;
        let uterinePenalty = 1.0;

        // Critical Thresholds for Restriction
        if (sizeRatio > 1.3 && dam.weight_female_adult < 600) {
            // Big Sire on Small Dam (e.g. Charolais on Betizu)
            // Uterine Crowding reduces birth weight and early ADG
            uterinePenalty = 0.95; // 5% loss of genetic potential gain
        }

        // --- 4. LACTATION IMPACT (Maternal Environment) ---
        // Milk drives weaning weight and frame development
        let milkAdgMultiplier = 1.0;
        if (dam.milk_potential >= 4) milkAdgMultiplier = 1.06; // +6%
        if (dam.milk_potential <= 1) milkAdgMultiplier = 0.94; // -6%


        // --- CALCULATION CORE ---

        // A. Growth (ADG)
        // Base Average
        const avgAdgFeedlot = (sire.adg_feedlot + dam.adg_feedlot) / 2;
        // Apply Model: (Avg * Heterosis) * Constraint * Milk
        const finalAdg = avgAdgFeedlot * (1 + h_adg) * uterinePenalty * milkAdgMultiplier;

        // B. Yield (Canal)
        const avgYieldPot = ((sire.yield_potential || 0.58) + (dam.yield_potential || 0.58)) / 2;
        const finalYield = avgYieldPot + h_yield; // Additive + Bonus

        // C. Marbling (Additive + Epigenetics)
        let avgMarbling = (sire.marbling_potential + dam.marbling_potential) / 2;
        // Maternal Epigenetics: Fat mothers program fat offspring
        if (dam.marbling_potential >= 4) avgMarbling += 0.5;
        const finalMarbling = avgMarbling + h_marbling; // Almost direct average

        // D. Calving Ease (Dystocia Risk)
        let calvingPenalty = 0;
        if (sizeRatio > 1.15) {
            const excess = sizeRatio - 1.15;
            calvingPenalty = excess * 12; // Steep penalty for mismatch
        }
        const baseCalving = (sire.calving_ease * 0.3) + (dam.calving_ease * 0.7);
        const finalCalving = Math.max(1, baseCalving - calvingPenalty);

        // E. Conformation (Structure)
        const avgConf = ((sire.conformation_potential || 3) + (dam.conformation_potential || 3)) / 2;
        // Milk supports bone structure
        let milkConfBonus = 0;
        if (dam.milk_potential >= 4) milkConfBonus = 0.3;
        if (dam.milk_potential <= 1) milkConfBonus = -0.2;

        const finalConf = avgConf + milkConfBonus;

        return {
            id: `FIX_${sire.code}_${dam.code}`,
            code: `${sire.code}x${dam.code}`,
            name: `F1 ${dam.name} x ${sire.name}`,
            subspecies: 'Cruzado',
            biological_type: 'Composite',

            // Physical Size (dimorphism averaged)
            weight_male_adult: ((sire.weight_male_adult + dam.weight_male_adult) / 2) * (1 + h_adg),
            weight_female_adult: ((sire.weight_female_adult + dam.weight_female_adult) / 2) * (1 + h_adg),

            slaughter_age_months: (sire.slaughter_age_months + dam.slaughter_age_months) / 2,

            adg_feedlot: finalAdg,
            adg_grazing: finalAdg * 0.7, // Approx ratio
            fcr_feedlot: ((sire.fcr_feedlot + dam.fcr_feedlot) / 2) * (1 - (heterosisFactor * 0.8)), // Efficiency improves with heterosis

            heat_tolerance: Math.max(sire.heat_tolerance, dam.heat_tolerance), // Dominant trait usually
            marbling_potential: finalMarbling,
            calving_ease: finalCalving,

            milk_potential: (sire.milk_potential + dam.milk_potential) / 2,
            conformation_potential: finalConf,
            yield_potential: finalYield,

            is_hybrid: true,
            sire_name: sire.name,
            dam_name: dam.name
        };
    }
};
