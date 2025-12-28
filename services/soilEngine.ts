
export interface SoilType {
    id: string;
    name: string;
    texture: string;
    ph_typical: number;
    water_retention: 'Baja' | 'Media' | 'Alta' | 'Media-Baja' | 'Media-Alta';
    drainage: 'Lento' | 'Medio' | 'Rápido' | 'Medio-Lento' | 'Medio-Rápido';
    risks: string[];
    recommended_uses: string[];
    productive_objectives: string[];
    indices: {
        retention: number;
        drainage: number;
        fertility: number;
        risk_waterlogging: number;
        risk_drought: number;
        risk_erosion: number;
    };
}

export const SOIL_DATABASE: SoilType[] = [
    {
        id: '1',
        name: 'Arcilloso',
        texture: 'Arcillosa',
        ph_typical: 6.0,
        water_retention: 'Alta',
        drainage: 'Lento',
        risks: ['Encharcamiento', 'Agrietamiento en sequía'],
        recommended_uses: ['Pradera permanente', 'Pastoreo controlado'],
        productive_objectives: ['Cría extensiva', 'Doble propósito'],
        indices: { retention: 0.90, drainage: 0.20, fertility: 0.80, risk_waterlogging: 0.90, risk_drought: 0.20, risk_erosion: 0.40 }
    },
    {
        id: '2',
        name: 'Arenoso',
        texture: 'Arenosa',
        ph_typical: 5.5,
        water_retention: 'Baja',
        drainage: 'Rápido',
        risks: ['Sequía', 'Lixiviación de nutrientes', 'Erosión eólica'],
        recommended_uses: ['Cultivos de invierno', 'Pastoreo invernal'],
        productive_objectives: ['Recría', 'Cebo ligero'],
        indices: { retention: 0.30, drainage: 0.90, fertility: 0.40, risk_waterlogging: 0.10, risk_drought: 0.90, risk_erosion: 0.70 }
    },
    {
        id: '3',
        name: 'Franco (Loam)',
        texture: 'Franca',
        ph_typical: 6.5,
        water_retention: 'Media',
        drainage: 'Medio',
        risks: ['Ninguno grave'],
        recommended_uses: ['Policultivo', 'Maíz forrajero', 'Alfalfa'],
        productive_objectives: ['Engorde intensivo', 'Alto rendimiento'],
        indices: { retention: 0.60, drainage: 0.60, fertility: 0.85, risk_waterlogging: 0.30, risk_drought: 0.30, risk_erosion: 0.30 }
    },
    {
        id: '4',
        name: 'Franco-Arcilloso',
        texture: 'Franco-Arcillosa',
        ph_typical: 6.8,
        water_retention: 'Alta',
        drainage: 'Medio-Lento',
        risks: ['Compactación'],
        recommended_uses: ['Praderas de alto rendimiento', 'Cereales'],
        productive_objectives: ['Leche', 'Cría intensiva'],
        indices: { retention: 0.75, drainage: 0.45, fertility: 0.90, risk_waterlogging: 0.50, risk_drought: 0.20, risk_erosion: 0.40 }
    },
    {
        id: '5',
        name: 'Franco-Arenoso',
        texture: 'Franco-Arenosa',
        ph_typical: 6.2,
        water_retention: 'Media-Baja',
        drainage: 'Rápido',
        risks: ['Erosión', 'Lavado nutrientes'],
        recommended_uses: ['Hortícolas', 'Leguminosas anuales'],
        productive_objectives: ['Rotación rápida', 'Pastoreo estacional'],
        indices: { retention: 0.45, drainage: 0.80, fertility: 0.60, risk_waterlogging: 0.20, risk_drought: 0.70, risk_erosion: 0.50 }
    }
];

export const SoilEngine = {
    getAllSoils(): SoilType[] {
        return SOIL_DATABASE;
    },

    getSoilById(id: string): SoilType | undefined {
        return SOIL_DATABASE.find(s => s.id === id);
    },

    /**
     * Advanced Crop Recommendation Engine
     */
    getRecommendedCrops(soilId: string, climate?: { avgTemp: number; annualPrecip: number }, slope: number = 0): { crop: string; reason: string; type: string }[] {
        const soil = this.getSoilById(soilId);
        if (!soil) return [];

        const recs: { crop: string; reason: string; type: string }[] = [];

        // Database of Crops with requirements
        const CROPS = [
            // CEREALES (Invierno)
            { name: 'Trigo Blando', type: 'Cereal Invierno', min_precip: 450, max_slope: 12, ph_min: 6.0, ph_max: 8.0, drainage: ['Medio', 'Rápido', 'Medio-Lento'], season: 'Otoño' },
            { name: 'Cebada', type: 'Cereal Invierno', min_precip: 350, max_slope: 12, ph_min: 6.0, ph_max: 8.5, drainage: ['Medio', 'Rápido'], season: 'Otoño' },
            { name: 'Avena', type: 'Cereal Invierno', min_precip: 400, max_slope: 15, ph_min: 5.0, ph_max: 7.5, drainage: ['Medio', 'Lento', 'Medio-Lento'], season: 'Otoño' },
            { name: 'Triticale', type: 'Cereal Invierno', min_precip: 350, max_slope: 15, ph_min: 5.5, ph_max: 8.0, drainage: ['Medio', 'Medio-Lento'], season: 'Otoño' },
            { name: 'Centeno', type: 'Cereal Invierno', min_precip: 300, max_slope: 15, ph_min: 5.0, ph_max: 8.0, drainage: ['Rápido', 'Medio'], season: 'Otoño' },

            // FORRAJES
            { name: 'Ray-grass Italiano', type: 'Pradera', min_precip: 600, max_slope: 15, ph_min: 5.5, ph_max: 7.5, drainage: ['Medio', 'Lento', 'Medio-Lento'], season: 'Otoño' },
            { name: 'Festuca Alta', type: 'Pradera', min_precip: 450, max_slope: 15, ph_min: 5.0, ph_max: 8.0, drainage: ['Lento', 'Medio-Lento', 'Medio'], season: 'Otoño' },
            { name: 'Alfalfa', type: 'Leguminosa', min_precip: 500, max_slope: 10, ph_min: 6.2, ph_max: 8.2, drainage: ['Rápido', 'Medio'], season: 'Primavera' }, // Muy sensible a encharcamiento
            { name: 'Vezas', type: 'Leguminosa', min_precip: 350, max_slope: 15, ph_min: 5.5, ph_max: 8.0, drainage: ['Rápido', 'Medio', 'Medio-Lento'], season: 'Otoño' },
            { name: 'Trébol Subterráneo', type: 'Leguminosa', min_precip: 400, max_slope: 20, ph_min: 5.0, ph_max: 6.5, drainage: ['Medio', 'Rápido', 'Medio-Lento'], season: 'Otoño' },

            // ESTIVALES
            { name: 'Maíz Forrajero', type: 'Cereal Verano', min_precip: 300, max_slope: 8, ph_min: 5.8, ph_max: 8.0, drainage: ['Medio', 'Medio-Lento'], season: 'Primavera' }, // Requires irrigation usually, low slope
            { name: 'Sorgo', type: 'Cereal Verano', min_precip: 250, max_slope: 10, ph_min: 5.5, ph_max: 8.5, drainage: ['Medio', 'Rápido'], season: 'Primavera' },
        ];

        for (const crop of CROPS) {
            const reasons: string[] = [];
            let valid = true;

            // 1. Slope Check (Strict)
            if (slope > crop.max_slope) {
                // If slope is high, reject most crops.
                // Strict check: User said 20% is huge. Keep machinery crops < 12-15%.
                valid = false;
            }

            // 2. pH Check
            if (soil.ph_typical < crop.ph_min || soil.ph_typical > crop.ph_max) {
                valid = false;
            }

            // 3. Drainage Check
            // We map strict "Arcilloso" -> Lento. "Arenoso" -> Rápido.
            // Check if soil drainage is in accepted list
            if (!crop.drainage.includes(soil.drainage)) {
                valid = false;
            }

            // 4. Climate Check
            if (climate) {
                // Precip check (Assuming rainfed logic primarily, but Maíz/Sorgo might be irrigated)
                // If precipitation is way too low (< min_precip - 200), hard fail.
                // If it's close, maybe warn. Here we do simple check.
                if (climate.annualPrecip < crop.min_precip && crop.name !== 'Maíz Forrajero') {
                    // Allow Maíz assuming irrigation potential if not strict rainfed mode
                    // But for this logic, let's be strict on rainfed for now unless specified.
                    // Actually let's assume if it is "Cereal Verano", user might irrigate, but let's stick to rainfed min logic.
                    if (climate.annualPrecip < crop.min_precip * 0.7) valid = false; // Tolerance
                }
            }

            if (valid) {
                // Generate friendly reason
                if (slope > 8 && slope <= crop.max_slope) reasons.push("Pendiente límite");
                if (climate && climate.annualPrecip > crop.min_precip + 200) reasons.push("Clima favorable");

                // Add specific soil reasons
                if (crop.name === 'Alfalfa' && soil.drainage === 'Rápido') reasons.push("Excelente drenaje");
                if (crop.name === 'Festuca Alta' && (soil.drainage === 'Lento' || soil.drainage === 'Medio-Lento')) reasons.push("Tolera suelo pesado");

                recs.push({
                    crop: crop.name,
                    type: `${crop.type} (${crop.season})`,
                    reason: reasons.length ? reasons.join('. ') : 'Condiciones aptas.'
                });
            }
        }

        // Special Case: High Slope (> 15%)
        if (slope > 15) {
            // Only hardy pastures or trees (not implemented yet).
            // Explicitly recommend "Pastos Permanentes" or "Reforestación" if not already covered.
            recs.push({ crop: 'Prado Natural', type: 'Pradera', reason: 'Pendiente alta: evitar laboreo.' });
        }

        return recs;
    },

    /**
     * Calculate Suitability Score (0-100) for a given Objective
     */
    calculateSuitability(soilId: string, objective: 'Pastoreo' | 'Cultivo' | 'Engorde'): number {
        const soil = this.getSoilById(soilId);
        if (!soil) return 0;
        const i = soil.indices;

        if (objective === 'Pastoreo') {
            // Needs resilience (trampling) -> Good drainage prevents mud, but need retention for grass
            // Balanced: Retention * 0.4 + Drainage * 0.4 + Fertility * 0.2
            let score = (i.retention * 40) + (i.drainage * 40) + (i.fertility * 20);
            if (i.risk_waterlogging > 0.7) score -= 20; // Mud risk
            return Math.min(100, Math.max(0, score));
        }

        if (objective === 'Cultivo') {
            // Needs Fertility and Structure
            return Math.min(100, (i.fertility * 60) + (i.drainage * 20) + (i.retention * 20));
        }

        if (objective === 'Engorde') {
            // Indirect: How good is it for producing high quality feed? Similar to Cultivo
            return Math.min(100, (i.fertility * 70) + (i.drainage * 30));
        }

        return 50;
    }
};
