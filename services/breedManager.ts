
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
    conformation_potential?: number; // 1=P ... 6=S
    yield_potential?: number; // 0.50 - 0.70
    is_hybrid?: boolean;
    sire_name?: string;
    dam_name?: string;
}

export const BASE_BREEDS: Breed[] = [
    { id: 'WAG', code: 'WAG', name: 'Wagyu', subspecies: 'Bos taurus', weight_male_adult: 850, weight_female_adult: 550, slaughter_age_months: 29, adg_feedlot: 0.90, adg_grazing: 0.60, fcr_feedlot: 8.5, heat_tolerance: 5, marbling_potential: 5, calving_ease: 9 },
    { id: 'ANG', code: 'ANG', name: 'Angus', subspecies: 'Bos taurus', weight_male_adult: 900, weight_female_adult: 500, slaughter_age_months: 18, adg_feedlot: 1.40, adg_grazing: 0.90, fcr_feedlot: 7.9, heat_tolerance: 4, marbling_potential: 4, calving_ease: 8 },
    { id: 'HER', code: 'HER', name: 'Hereford', subspecies: 'Bos taurus', weight_male_adult: 1000, weight_female_adult: 580, slaughter_age_months: 20, adg_feedlot: 1.40, adg_grazing: 0.80, fcr_feedlot: 7.8, heat_tolerance: 3, marbling_potential: 3, calving_ease: 7 },
    { id: 'CHA', code: 'CHA', name: 'Charolais', subspecies: 'Bos taurus', weight_male_adult: 1100, weight_female_adult: 800, slaughter_age_months: 24, adg_feedlot: 1.50, adg_grazing: 1.00, fcr_feedlot: 7.2, heat_tolerance: 3, marbling_potential: 2, calving_ease: 4 },
    { id: 'LIM', code: 'LIM', name: 'Limousin', subspecies: 'Bos taurus', weight_male_adult: 950, weight_female_adult: 650, slaughter_age_months: 16, adg_feedlot: 1.40, adg_grazing: 0.90, fcr_feedlot: 7.4, heat_tolerance: 4, marbling_potential: 3, calving_ease: 6 },
    { id: 'BRA', code: 'BRA', name: 'Brahman', subspecies: 'Bos indicus', weight_male_adult: 900, weight_female_adult: 550, slaughter_age_months: 24, adg_feedlot: 1.10, adg_grazing: 0.80, fcr_feedlot: 8.0, heat_tolerance: 10, marbling_potential: 2, calving_ease: 9 },
    { id: 'NEL', code: 'NEL', name: 'Nelore', subspecies: 'Bos indicus', weight_male_adult: 900, weight_female_adult: 550, slaughter_age_months: 26, adg_feedlot: 1.05, adg_grazing: 0.75, fcr_feedlot: 8.2, heat_tolerance: 10, marbling_potential: 2, calving_ease: 9 },
    { id: 'RET', code: 'RET', name: 'Retinta', subspecies: 'Bos taurus', weight_male_adult: 1000, weight_female_adult: 580, slaughter_age_months: 30, adg_feedlot: 1.10, adg_grazing: 0.75, fcr_feedlot: 8.3, heat_tolerance: 8, marbling_potential: 3, calving_ease: 8 },
    { id: 'MOR', code: 'MOR', name: 'Morucha', subspecies: 'Bos taurus', weight_male_adult: 900, weight_female_adult: 500, slaughter_age_months: 30, adg_feedlot: 1.10, adg_grazing: 0.70, fcr_feedlot: 8.4, heat_tolerance: 8, marbling_potential: 3, calving_ease: 8 },
    { id: 'PIR', code: 'PIR', name: 'Pirenaica', subspecies: 'Bos taurus', weight_male_adult: 800, weight_female_adult: 525, slaughter_age_months: 18, adg_feedlot: 1.30, adg_grazing: 0.85, fcr_feedlot: 7.8, heat_tolerance: 5, marbling_potential: 3, calving_ease: 7 },
    { id: 'BET', code: 'BET', name: 'Betizu', subspecies: 'Bos taurus', weight_male_adult: 450, weight_female_adult: 325, slaughter_age_months: 36, adg_feedlot: 0.90, adg_grazing: 0.55, fcr_feedlot: 9.2, heat_tolerance: 7, marbling_potential: 2, calving_ease: 10 },
    { id: 'BER', code: 'BER', name: 'Berrenda', subspecies: 'Bos taurus', weight_male_adult: 800, weight_female_adult: 500, slaughter_age_months: 23, adg_feedlot: 1.10, adg_grazing: 0.70, fcr_feedlot: 8.3, heat_tolerance: 8, marbling_potential: 3, calving_ease: 8 },
    { id: 'SIM', code: 'SIM', name: 'Simmental', subspecies: 'Bos taurus', weight_male_adult: 1100, weight_female_adult: 750, slaughter_age_months: 18, adg_feedlot: 1.40, adg_grazing: 0.80, fcr_feedlot: 7.5, heat_tolerance: 4, marbling_potential: 3, calving_ease: 6 },
    { id: 'BDA', code: 'BDA', name: 'Blonde d\'Aquitaine', subspecies: 'Bos taurus', weight_male_adult: 1200, weight_female_adult: 700, slaughter_age_months: 18, adg_feedlot: 1.60, adg_grazing: 1.10, fcr_feedlot: 7.1, heat_tolerance: 3, marbling_potential: 2, calving_ease: 5 },
    { id: 'AZB', code: 'AZB', name: 'Azul Belga', subspecies: 'Bos taurus', weight_male_adult: 1175, weight_female_adult: 775, slaughter_age_months: 16, adg_feedlot: 1.70, adg_grazing: 1.00, fcr_feedlot: 6.8, heat_tolerance: 1, marbling_potential: 1, calving_ease: 2 },
    { id: 'DRM', code: 'DRM', name: 'Droughtmaster', subspecies: 'Cruzado', weight_male_adult: 900, weight_female_adult: 550, slaughter_age_months: 24, adg_feedlot: 1.20, adg_grazing: 0.90, fcr_feedlot: 7.9, heat_tolerance: 9, marbling_potential: 3, calving_ease: 9 },
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

        return {
            id: `FIX_${sire.code}_${dam.code}`,
            code: `${sire.code}x${dam.code}`,
            name: `F1 ${dam.name} x ${sire.name}`,
            subspecies: 'Cruzado',
            weight_male_adult: (sire.weight_male_adult * 0.5) + (dam.weight_male_adult * 0.5),
            weight_female_adult: (sire.weight_female_adult * 0.5) + (dam.weight_female_adult * 0.5),

            // ADG: Average + Heterosis
            adg_feedlot: ((sire.adg_feedlot + dam.adg_feedlot) / 2) * (1 + heterosisADG),
            adg_grazing: ((sire.adg_grazing + dam.adg_grazing) / 2) * (1 + heterosisADG),

            // FCR: Average * (1 - Heterosis) -> Lower is better
            fcr_feedlot: ((sire.fcr_feedlot + dam.fcr_feedlot) / 2) * (1 - heterosisFCR),

            slaughter_age_months: (sire.slaughter_age_months + dam.slaughter_age_months) / 2,

            // Traits: Weighted averages
            heat_tolerance: Math.max(sire.heat_tolerance, dam.heat_tolerance), // Dominant trait often
            marbling_potential: (sire.marbling_potential + dam.marbling_potential) / 2,
            calving_ease: (sire.calving_ease * 0.4) + (dam.calving_ease * 0.6), // Dam matters more for calving

            is_hybrid: true,
            sire_name: sire.name,
            dam_name: dam.name
        };
    }
};
