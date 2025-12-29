
export interface Breed {
    id: string;
    code: string;
    name: string;
    subspecies: 'Bos taurus' | 'Bos indicus' | 'Cruzado';
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
    // 1. Infiltración Alta
    { id: 'WAG', code: 'WAG', name: 'Wagyu', subspecies: 'Bos taurus', weight_male_adult: 850, weight_female_adult: 550, slaughter_age_months: 29, adg_feedlot: 0.90, adg_grazing: 0.60, fcr_feedlot: 8.5, heat_tolerance: 5, marbling_potential: 5, calving_ease: 9, milk_potential: 2, conformation_potential: 3, yield_potential: 0.58 },
    { id: 'ANG', code: 'ANG', name: 'Angus', subspecies: 'Bos taurus', weight_male_adult: 900, weight_female_adult: 500, slaughter_age_months: 18, adg_feedlot: 1.40, adg_grazing: 0.90, fcr_feedlot: 7.9, heat_tolerance: 4, marbling_potential: 4, calving_ease: 8, milk_potential: 3, conformation_potential: 4, yield_potential: 0.60 },

    // 2. Crecimiento Magro / Conformación
    { id: 'CHA', code: 'CHA', name: 'Charolais', subspecies: 'Bos taurus', weight_male_adult: 1100, weight_female_adult: 800, slaughter_age_months: 24, adg_feedlot: 1.50, adg_grazing: 1.00, fcr_feedlot: 7.2, heat_tolerance: 3, marbling_potential: 2, calving_ease: 4, milk_potential: 2, conformation_potential: 5, yield_potential: 0.65 },
    { id: 'LIM', code: 'LIM', name: 'Limousin', subspecies: 'Bos taurus', weight_male_adult: 950, weight_female_adult: 650, slaughter_age_months: 16, adg_feedlot: 1.40, adg_grazing: 0.90, fcr_feedlot: 7.4, heat_tolerance: 4, marbling_potential: 3, calving_ease: 6, milk_potential: 2, conformation_potential: 5, yield_potential: 0.64 },
    { id: 'BDA', code: 'BDA', name: 'Blonde d\'Aquitaine', subspecies: 'Bos taurus', weight_male_adult: 1200, weight_female_adult: 700, slaughter_age_months: 18, adg_feedlot: 1.60, adg_grazing: 1.10, fcr_feedlot: 7.1, heat_tolerance: 3, marbling_potential: 2, calving_ease: 5, milk_potential: 2, conformation_potential: 5, yield_potential: 0.67 },
    { id: 'AZB', code: 'AZB', name: 'Azul Belga', subspecies: 'Bos taurus', weight_male_adult: 1175, weight_female_adult: 775, slaughter_age_months: 16, adg_feedlot: 1.70, adg_grazing: 1.00, fcr_feedlot: 6.8, heat_tolerance: 1, marbling_potential: 1, calving_ease: 2, milk_potential: 2, conformation_potential: 6, yield_potential: 0.70 },
    { id: 'PIR', code: 'PIR', name: 'Pirenaica', subspecies: 'Bos taurus', weight_male_adult: 900, weight_female_adult: 600, slaughter_age_months: 18, adg_feedlot: 1.30, adg_grazing: 0.85, fcr_feedlot: 7.8, heat_tolerance: 5, marbling_potential: 3, calving_ease: 7, milk_potential: 2, conformation_potential: 4, yield_potential: 0.62 },

    // 3. Rústicas Adaptadas
    { id: 'MOR', code: 'MOR', name: 'Morucha', subspecies: 'Bos taurus', weight_male_adult: 900, weight_female_adult: 500, slaughter_age_months: 30, adg_feedlot: 1.10, adg_grazing: 0.70, fcr_feedlot: 8.4, heat_tolerance: 8, marbling_potential: 3, calving_ease: 8, milk_potential: 2, conformation_potential: 2, yield_potential: 0.54 },
    { id: 'RET', code: 'RET', name: 'Retinta', subspecies: 'Bos taurus', weight_male_adult: 1000, weight_female_adult: 580, slaughter_age_months: 30, adg_feedlot: 1.10, adg_grazing: 0.75, fcr_feedlot: 8.3, heat_tolerance: 8, marbling_potential: 3, calving_ease: 8, milk_potential: 2, conformation_potential: 3, yield_potential: 0.56 },
    { id: 'BER', code: 'BER', name: 'Berrenda', subspecies: 'Bos taurus', weight_male_adult: 800, weight_female_adult: 500, slaughter_age_months: 23, adg_feedlot: 1.10, adg_grazing: 0.70, fcr_feedlot: 8.3, heat_tolerance: 8, marbling_potential: 3, calving_ease: 8, milk_potential: 2, conformation_potential: 3, yield_potential: 0.55 },
    { id: 'BET', code: 'BET', name: 'Betizu', subspecies: 'Bos taurus', weight_male_adult: 450, weight_female_adult: 325, slaughter_age_months: 36, adg_feedlot: 0.90, adg_grazing: 0.55, fcr_feedlot: 9.2, heat_tolerance: 7, marbling_potential: 2, calving_ease: 10, milk_potential: 1, conformation_potential: 2, yield_potential: 0.50 },

    // 4. Doble Propósito / Lecheras
    { id: 'SIM', code: 'SIM', name: 'Simmental', subspecies: 'Bos taurus', weight_male_adult: 1100, weight_female_adult: 750, slaughter_age_months: 18, adg_feedlot: 1.50, adg_grazing: 0.85, fcr_feedlot: 7.0, heat_tolerance: 4, marbling_potential: 3, calving_ease: 6, milk_potential: 3, conformation_potential: 5, yield_potential: 0.63 },
    { id: 'HER', code: 'HER', name: 'Hereford', subspecies: 'Bos taurus', weight_male_adult: 1000, weight_female_adult: 580, slaughter_age_months: 20, adg_feedlot: 1.40, adg_grazing: 0.80, fcr_feedlot: 7.8, heat_tolerance: 3, marbling_potential: 3, calving_ease: 7, milk_potential: 2, conformation_potential: 4, yield_potential: 0.58 },
    { id: 'HOL', code: 'HOL', name: 'Holstein', subspecies: 'Bos taurus', weight_male_adult: 1000, weight_female_adult: 650, slaughter_age_months: 20, adg_feedlot: 1.20, adg_grazing: 0.60, fcr_feedlot: 8.5, heat_tolerance: 2, marbling_potential: 2, calving_ease: 5, milk_potential: 5, conformation_potential: 2, yield_potential: 0.52 },
    { id: 'FRI', code: 'FRI', name: 'Frisona', subspecies: 'Bos taurus', weight_male_adult: 950, weight_female_adult: 600, slaughter_age_months: 20, adg_feedlot: 1.15, adg_grazing: 0.60, fcr_feedlot: 8.6, heat_tolerance: 2, marbling_potential: 2, calving_ease: 5, milk_potential: 5, conformation_potential: 2, yield_potential: 0.51 },

    // 5. Indicus / Tropicales
    { id: 'BRA', code: 'BRA', name: 'Brahman', subspecies: 'Bos indicus', weight_male_adult: 900, weight_female_adult: 550, slaughter_age_months: 24, adg_feedlot: 1.10, adg_grazing: 0.80, fcr_feedlot: 8.0, heat_tolerance: 10, marbling_potential: 2, calving_ease: 9, milk_potential: 3, conformation_potential: 3, yield_potential: 0.57 },
    { id: 'NEL', code: 'NEL', name: 'Nelore', subspecies: 'Bos indicus', weight_male_adult: 900, weight_female_adult: 550, slaughter_age_months: 26, adg_feedlot: 1.05, adg_grazing: 0.75, fcr_feedlot: 8.2, heat_tolerance: 10, marbling_potential: 2, calving_ease: 9, milk_potential: 2, conformation_potential: 3, yield_potential: 0.58 },
    { id: 'DRM', code: 'DRM', name: 'Droughtmaster', subspecies: 'Cruzado', weight_male_adult: 900, weight_female_adult: 550, slaughter_age_months: 24, adg_feedlot: 1.20, adg_grazing: 0.90, fcr_feedlot: 7.9, heat_tolerance: 9, marbling_potential: 3, calving_ease: 9, milk_potential: 2, conformation_potential: 3, yield_potential: 0.58 },
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
     * Calculate F1 Hybrid Metrics with Heterosis (Vigor Híbrido)
     */
    calculateHybrid(sireId: string, damId: string): Breed | null {
        const sire = this.getBreedById(sireId);
        const dam = this.getBreedById(damId);

        if (!sire || !dam) return null;

        // Determine Heterosis Factors
        const isIndicusSire = sire.subspecies === 'Bos indicus' || sire.name.includes('Brahman');
        const isIndicusDam = dam.subspecies === 'Bos indicus' || dam.name.includes('Brahman');
        const isDifferentSubspecies = isIndicusSire !== isIndicusDam;

        // Multipliers (Base Heterosis + Indicus Boost)
        const heterosisADG = isDifferentSubspecies ? 0.08 : 0.03; // +8% or +3%
        const heterosisFCR = isDifferentSubspecies ? 0.05 : 0.02; // -5% or -2% (Improvements)
        const heterosisFertility = isDifferentSubspecies ? 0.15 : 0.05; // Not used directly in breed obj but good to know

        // --- 1. DYSTOCIA CALCULATION (Flexible Mismatch Logic) ---
        // Ratio of Sire Size to Dam Size
        const sizeRatio = sire.weight_male_adult / dam.weight_female_adult; // e.g., 1200 / 400 = 3.0 (Extreme) or 1.1 (Safe)

        let calvingPenalty = 0;
        // Safe Zone: Ratio <= 1.15 (Sire is up to 15% bigger than dam)
        // Danger Zone: Ratio > 1.15
        if (sizeRatio > 1.15) {
            const excess = sizeRatio - 1.15;
            // Graduated Penalty: Non-linear scaling
            // 1.25 ratio (+10% excess) -> 0.1 * 10 = -1.0 point
            // 1.50 ratio (+35% excess) -> 0.35 * 10 = -3.5 points (Severe)
            // 2.00 ratio (Double size) -> 0.85 * 10 = -8.5 points (Impossible)
            calvingPenalty = excess * 10;
        }

        const baseCalving = (sire.calving_ease * 0.3) + (dam.calving_ease * 0.7);
        const finalCalvingEase = Math.max(1, baseCalving - calvingPenalty);

        // --- 2. LACTATION IMPACT (Maternal Programming) ---
        // Milk affects early growth trajectory (ADG) and structural development (Conformation)
        let milkConformationBonus = 0;
        let milkAdgMultiplier = 1.0;

        if (dam.milk_potential >= 4) {
            milkConformationBonus = 0.3;  // Good start -> Better frame
            milkAdgMultiplier = 1.08;     // +8% Lifetime growth momentum
        } else if (dam.milk_potential <= 1) {
            milkConformationBonus = -0.3; // Stunted
            milkAdgMultiplier = 0.92;     // -8% Lifetime lag
        }

        // --- 3. TRAIT AVERAGE ---
        const avgMarbling = (sire.marbling_potential + dam.marbling_potential) / 2;
        const avgConformation = ((sire.conformation_potential || 3) + (dam.conformation_potential || 3)) / 2;
        const avgYield = ((sire.yield_potential || 0.58) + (dam.yield_potential || 0.58)) / 2;

        return {
            id: `FIX_${sire.code}_${dam.code}`,
            code: `${sire.code}x${dam.code}`,
            name: `F1 ${dam.name} x ${sire.name}`,
            subspecies: 'Cruzado',
            weight_male_adult: (sire.weight_male_adult * 0.5) + (dam.weight_male_adult * 0.5),
            weight_female_adult: (sire.weight_female_adult * 0.5) + (dam.weight_female_adult * 0.5),

            // ADG: Average + Heterosis + Lactation Momentum
            adg_feedlot: (((sire.adg_feedlot + dam.adg_feedlot) / 2) * (1 + heterosisADG)) * milkAdgMultiplier,
            adg_grazing: (((sire.adg_grazing + dam.adg_grazing) / 2) * (1 + heterosisADG)) * milkAdgMultiplier,

            // FCR: Average * (1 - Heterosis)
            fcr_feedlot: ((sire.fcr_feedlot + dam.fcr_feedlot) / 2) * (1 - heterosisFCR),

            slaughter_age_months: (sire.slaughter_age_months + dam.slaughter_age_months) / 2,

            // Traits
            heat_tolerance: Math.max(sire.heat_tolerance, dam.heat_tolerance),
            marbling_potential: avgMarbling, // CarcassEngine adds epigentic bonus later if needed, or we do it here? 
            // CarcassEngine has the check, let's leave straightforward avg here or sync? 
            // Let's rely on CarcassEngine for the +0.5 marbling bonus to avoid double counting if we call both.
            calving_ease: finalCalvingEase, // Impacted by mismatch

            // New Sapiens Average + Milk Effect
            milk_potential: (sire.milk_potential + dam.milk_potential) / 2, // Genotype average
            conformation_potential: avgConformation + milkConformationBonus,
            yield_potential: avgYield,

            is_hybrid: true,
            sire_name: sire.name,
            dam_name: dam.name
        };
    }
};
