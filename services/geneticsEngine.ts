
export const GeneticsEngine = {
    /**
     * Determine functional type based on breed characteristics
     * Regla A3: Asignación de "tipo funcional"
     */
    determineFunctionalType(breed: { code: string, marblingPotential: number, adgFeedlot: number, heatTolerance: number, milkPotential?: number, conformationPotential?: number }): 'infiltracion' | 'crecimiento_magro' | 'rustica_adaptada' | 'composito' | 'aptitud_lechera' | 'carnica_general' | 'doble_proposito' {

        // 1. Infiltración (Wagyu, Angus top)
        if (breed.marblingPotential >= 4) {
            return 'infiltracion';
        }

        // 2. Aptitud Lechera (Simmental, Pardo Suizo)
        // High Milk + Moderate Conformation
        if ((breed.milkPotential || 1) >= 4) {
            return 'aptitud_lechera';
        }

        // 3. Crecimiento Magro / Hipertrofia (Azul Belga)
        // Extreme Conformation
        if ((breed.conformationPotential || 3) >= 6) {
            return 'crecimiento_magro';
        }

        // 4. Cárnica General (Limousin, Blonde, Charolais)
        // Good conformation, good growth, low marbling
        if ((breed.conformationPotential || 3) >= 5) {
            return 'carnica_general';
        }

        // 5. Rústica Adaptada (Brahman, Morucha pura)
        // High Heat Tolerance OR High Rusticity traits
        if (breed.heatTolerance >= 0.8 || breed.code === 'MOR') {
            return 'rustica_adaptada';
        }

        // 6. Doble Propósito (Retinta, Avileña, Simmental Mix)
        // Balance of traits
        if (breed.adgFeedlot > 1.0 && breed.heatTolerance < 0.8) {
            return 'doble_proposito';
        }

        // Default
        return 'rustica_adaptada';
    },

    /**
     * Construct F1 Genotype Label
     * Regla A4: Coherencia Genética
     */
    generateGenotypeLabel(motherBreedName: string, fatherBreedName: string, isF1: boolean): string {
        if (isF1) {
            return `F1 ${motherBreedName} x ${fatherBreedName}`;
        }
        return 'Mestizo Indeterminado';
    },

    /**
     * Calculate Hybrid Vigor (Heterosis) Bonus
     * Simple MVP model: +5% performance for F1
     */
    calculateHeterosisBonus(isF1: boolean, isComposito: boolean): number {
        if (isF1) return 1.05;
        if (isComposito) return 1.03;
        return 1.0;
    }
};
