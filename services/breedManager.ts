
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
    yield_potential: number; // Realistic CARCASS yield (0.45 - 0.65)

    is_hybrid?: boolean;
    sire_name?: string;
    dam_name?: string;
}

export const BASE_BREEDS: Breed[] = [
    // 1. Infiltración Alta (British)
    { id: 'WAG', code: 'WAG', name: 'Wagyu', subspecies: 'Bos taurus', biological_type: 'British', weight_male_adult: 850, weight_female_adult: 550, slaughter_age_months: 29, adg_feedlot: 0.90, adg_grazing: 0.60, fcr_feedlot: 8.5, heat_tolerance: 5, marbling_potential: 5, calving_ease: 9, milk_potential: 2, conformation_potential: 3, yield_potential: 0.52 },
    { id: 'ANG', code: 'ANG', name: 'Angus', subspecies: 'Bos taurus', biological_type: 'British', weight_male_adult: 900, weight_female_adult: 500, slaughter_age_months: 18, adg_feedlot: 1.40, adg_grazing: 0.90, fcr_feedlot: 7.9, heat_tolerance: 4, marbling_potential: 4, calving_ease: 8, milk_potential: 3, conformation_potential: 4, yield_potential: 0.54 },
    { id: 'HER', code: 'HER', name: 'Hereford', subspecies: 'Bos taurus', biological_type: 'British', weight_male_adult: 1000, weight_female_adult: 580, slaughter_age_months: 20, adg_feedlot: 1.40, adg_grazing: 0.80, fcr_feedlot: 7.8, heat_tolerance: 3, marbling_potential: 3, calving_ease: 7, milk_potential: 2, conformation_potential: 4, yield_potential: 0.53 },

    // 2. Crecimiento Magro / Conformación (Continental)
    { id: 'CHA', code: 'CHA', name: 'Charolais', subspecies: 'Bos taurus', biological_type: 'Continental', weight_male_adult: 1100, weight_female_adult: 800, slaughter_age_months: 24, adg_feedlot: 1.50, adg_grazing: 1.00, fcr_feedlot: 7.2, heat_tolerance: 3, marbling_potential: 2, calving_ease: 4, milk_potential: 2, conformation_potential: 5, yield_potential: 0.58 },
    { id: 'LIM', code: 'LIM', name: 'Limousin', subspecies: 'Bos taurus', biological_type: 'Continental', weight_male_adult: 950, weight_female_adult: 650, slaughter_age_months: 16, adg_feedlot: 1.40, adg_grazing: 0.90, fcr_feedlot: 7.4, heat_tolerance: 4, marbling_potential: 3, calving_ease: 6, milk_potential: 2, conformation_potential: 5, yield_potential: 0.58 },
    { id: 'BDA', code: 'BDA', name: 'Blonde d\'Aquitaine', subspecies: 'Bos taurus', biological_type: 'Continental', weight_male_adult: 1200, weight_female_adult: 700, slaughter_age_months: 18, adg_feedlot: 1.60, adg_grazing: 1.10, fcr_feedlot: 7.1, heat_tolerance: 3, marbling_potential: 2, calving_ease: 5, milk_potential: 2, conformation_potential: 5, yield_potential: 0.61 },
    { id: 'AZB', code: 'AZB', name: 'Azul Belga', subspecies: 'Bos taurus', biological_type: 'Continental', weight_male_adult: 1175, weight_female_adult: 775, slaughter_age_months: 16, adg_feedlot: 1.70, adg_grazing: 1.00, fcr_feedlot: 6.8, heat_tolerance: 1, marbling_potential: 1, calving_ease: 2, milk_potential: 2, conformation_potential: 6, yield_potential: 0.64 },
    { id: 'PIR', code: 'PIR', name: 'Pirenaica', subspecies: 'Bos taurus', biological_type: 'Rustic_European', weight_male_adult: 900, weight_female_adult: 600, slaughter_age_months: 18, adg_feedlot: 1.30, adg_grazing: 0.85, fcr_feedlot: 7.8, heat_tolerance: 5, marbling_potential: 3, calving_ease: 7, milk_potential: 2, conformation_potential: 4, yield_potential: 0.56 },

    // 3. Rústicas Adaptadas
    { id: 'MOR', code: 'MOR', name: 'Morucha', subspecies: 'Bos taurus', biological_type: 'Rustic_European', weight_male_adult: 900, weight_female_adult: 500, slaughter_age_months: 30, adg_feedlot: 1.10, adg_grazing: 0.70, fcr_feedlot: 8.4, heat_tolerance: 8, marbling_potential: 3, calving_ease: 8, milk_potential: 2, conformation_potential: 2, yield_potential: 0.52 },
    { id: 'RET', code: 'RET', name: 'Retinta', subspecies: 'Bos taurus', biological_type: 'Rustic_European', weight_male_adult: 1000, weight_female_adult: 580, slaughter_age_months: 30, adg_feedlot: 1.10, adg_grazing: 0.75, fcr_feedlot: 8.3, heat_tolerance: 8, marbling_potential: 3, calving_ease: 8, milk_potential: 2, conformation_potential: 3, yield_potential: 0.53 },
    { id: 'BER', code: 'BER', name: 'Berrenda', subspecies: 'Bos taurus', biological_type: 'Rustic_European', weight_male_adult: 800, weight_female_adult: 500, slaughter_age_months: 23, adg_feedlot: 1.10, adg_grazing: 0.70, fcr_feedlot: 8.3, heat_tolerance: 8, marbling_potential: 3, calving_ease: 8, milk_potential: 2, conformation_potential: 3, yield_potential: 0.53 },
    { id: 'BET', code: 'BET', name: 'Betizu', subspecies: 'Bos taurus', biological_type: 'Rustic_European', weight_male_adult: 450, weight_female_adult: 325, slaughter_age_months: 36, adg_feedlot: 0.90, adg_grazing: 0.55, fcr_feedlot: 9.2, heat_tolerance: 7, marbling_potential: 2, calving_ease: 10, milk_potential: 1, conformation_potential: 2, yield_potential: 0.48 },

    // 4. Doble Propósito / Lecheras (Dairy)
    { id: 'SIM', code: 'SIM', name: 'Simmental', subspecies: 'Bos taurus', biological_type: 'Dairy', weight_male_adult: 1100, weight_female_adult: 750, slaughter_age_months: 18, adg_feedlot: 1.50, adg_grazing: 0.85, fcr_feedlot: 7.0, heat_tolerance: 4, marbling_potential: 3, calving_ease: 6, milk_potential: 3, conformation_potential: 5, yield_potential: 0.56 },
    { id: 'HOL', code: 'HOL', name: 'Holstein', subspecies: 'Bos taurus', biological_type: 'Dairy', weight_male_adult: 1000, weight_female_adult: 650, slaughter_age_months: 20, adg_feedlot: 1.20, adg_grazing: 0.60, fcr_feedlot: 8.5, heat_tolerance: 2, marbling_potential: 2, calving_ease: 5, milk_potential: 5, conformation_potential: 2, yield_potential: 0.49 },
    { id: 'FRI', code: 'FRI', name: 'Frisona', subspecies: 'Bos taurus', biological_type: 'Dairy', weight_male_adult: 950, weight_female_adult: 600, slaughter_age_months: 20, adg_feedlot: 1.15, adg_grazing: 0.60, fcr_feedlot: 8.6, heat_tolerance: 2, marbling_potential: 2, calving_ease: 5, milk_potential: 5, conformation_potential: 2, yield_potential: 0.48 },

    // 5. Indicus
    { id: 'BRA', code: 'BRA', name: 'Brahman', subspecies: 'Bos indicus', biological_type: 'Indicus', weight_male_adult: 900, weight_female_adult: 550, slaughter_age_months: 24, adg_feedlot: 1.10, adg_grazing: 0.80, fcr_feedlot: 8.0, heat_tolerance: 10, marbling_potential: 2, calving_ease: 9, milk_potential: 3, conformation_potential: 3, yield_potential: 0.51 },
    { id: 'NEL', code: 'NEL', name: 'Nelore', subspecies: 'Bos indicus', biological_type: 'Indicus', weight_male_adult: 900, weight_female_adult: 550, slaughter_age_months: 26, adg_feedlot: 1.05, adg_grazing: 0.75, fcr_feedlot: 8.2, heat_tolerance: 10, marbling_potential: 2, calving_ease: 9, milk_potential: 2, conformation_potential: 3, yield_potential: 0.52 },
    { id: 'DRM', code: 'DRM', name: 'Droughtmaster', subspecies: 'Cruzado', biological_type: 'Composite', weight_male_adult: 900, weight_female_adult: 550, slaughter_age_months: 24, adg_feedlot: 1.20, adg_grazing: 0.90, fcr_feedlot: 7.9, heat_tolerance: 9, marbling_potential: 3, calving_ease: 9, milk_potential: 2, conformation_potential: 3, yield_potential: 0.53 },
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
     * ASYMMETRIC HYBRID INHERITANCE MODEL
     * Differentiates between Sire (Padre) and Dam (Madre).
     * 1. Maternal Effect: Marbling and Milk are Madre-dominant (60%).
     * 2. Paternal Effect: Conformation and Size are Padre-dominant (60%).
     * 3. Size Mismatch: Large Sire on Small Dam leads to gradual Dystocia Risk.
     */
    calculateHybrid(sireId: string, damId: string): Breed | null {
        const sire = this.getBreedById(sireId);
        const dam = this.getBreedById(damId);

        if (!sire || !dam) return null;

        // --- 1. GENETIC DISTANCE HETEROSIS ---
        const typeGroups = { 'British': 1, 'Continental': 2, 'Rustic_European': 3, 'Dairy': 4, 'Indicus': 5, 'Composite': 3 };
        const sireG = typeGroups[sire.biological_type] || 3;
        const damG = typeGroups[dam.biological_type] || 3;

        let heterosisFactor = (sireG === damG) ? 0.02 : 0.05;
        if (sire.biological_type === 'Indicus' !== (dam.biological_type === 'Indicus')) heterosisFactor = 0.12;

        // --- 2. DYSTOCIA RISK (Gradual Weight Mismatch) ---
        // Reflected from user feedback: "gradual... diferencias del 50%"
        const sizeRatio = sire.weight_male_adult / dam.weight_female_adult;
        let calvingPenalty = 0;

        // Risk starts appearing at 10% difference and grows linearly/sharply
        if (sizeRatio > 1.1) {
            // Formula: Extra risk per 0.01 ratio beyond 1.1
            // e.g. at 1.5 ratio (50% bigger): (1.5 - 1.1) * 20 = 8.0 points penalty.
            calvingPenalty = (sizeRatio - 1.1) * 20;
        }

        // --- 3. ASYMMETRIC WEIGHTING ---
        // S = Sire Weight, D = Dam Weight
        const W_SIRE = 0.6;
        const W_DAM = 0.4;

        // Maternal-biased traits (Madre manda en Grasa y Leche)
        const M_SIRE = 0.4;
        const M_DAM = 0.6;

        // --- 4. CALCULATION CORE ---

        // A. Growth (ADG)
        // Sire dominates growth speed
        const baseAdg = (sire.adg_feedlot * W_SIRE) + (dam.adg_feedlot * W_DAM);
        const milkBonus = dam.milk_potential >= 4 ? 1.05 : (dam.milk_potential <= 2 ? 0.95 : 1.0);
        // User requested removing intrauterine growth penalty ("no influye en la ganancia diaria")
        const finalAdg = baseAdg * (1 + (heterosisFactor * 1.5)) * milkBonus;

        // B. Yield (Canal)
        const finalYield = (sire.yield_potential * W_SIRE) + (dam.yield_potential * W_DAM);

        // C. Marbling (Additive + Maternal Bias)
        const finalMarbling = (sire.marbling_potential * M_SIRE) + (dam.marbling_potential * M_DAM);

        // D. Adult Frame Size
        const finalWeightM = ((sire.weight_male_adult * W_SIRE) + (dam.weight_male_adult * W_DAM)) * (1 + heterosisFactor);
        const finalWeightF = ((sire.weight_female_adult * W_SIRE) + (dam.weight_female_adult * W_DAM)) * (1 + heterosisFactor);

        // E. Conformation (Paternal Dominance)
        const finalConf = (sire.conformation_potential * W_SIRE) + (dam.conformation_potential * W_DAM);

        // F. Calving Ease (Daughter's ability)
        const baseCalving = (sire.calving_ease * 0.3) + (dam.calving_ease * 0.7);
        const finalCalving = Math.max(1, baseCalving - calvingPenalty);

        return {
            id: `F1_${sire.code}_${dam.code}`,
            code: `${sire.code}x${dam.code}`,
            name: `F1 ${dam.name} x ${sire.name}`,
            subspecies: 'Cruzado',
            biological_type: 'Composite',

            weight_male_adult: finalWeightM,
            weight_female_adult: finalWeightF,
            slaughter_age_months: (sire.slaughter_age_months + dam.slaughter_age_months) / 2,
            adg_feedlot: finalAdg,
            adg_grazing: finalAdg * 0.7,
            fcr_feedlot: ((sire.fcr_feedlot + dam.fcr_feedlot) / 2) * (1 - (heterosisFactor * 0.5)),
            heat_tolerance: Math.max(sire.heat_tolerance, dam.heat_tolerance),
            marbling_potential: finalMarbling,
            calving_ease: finalCalving,
            milk_potential: (sire.milk_potential * M_DAM) + (dam.milk_potential * M_SIRE),
            conformation_potential: finalConf,
            yield_potential: finalYield,
            is_hybrid: true,
            sire_name: sire.name,
            dam_name: dam.name
        };
    }
};
