// =============================================================================
// FEED DATABASE
// =============================================================================
//
// Composición nutricional y preferencias agronómicas de cada alimento.
//
// Sources used to populate each numeric field:
//   - INRA-CIRAD-AFZ (https://feedtables.com/) — base de datos europea de
//     referencia para rumiantes (>200 alimentos, valores in vivo).
//   - Feedipedia (https://www.feedipedia.org/) — fichas detalladas por
//     alimento, FAO/INRA/CIRAD.
//   - NASEM 2016 "Nutrient Requirements of Beef Cattle, 8th ed."
//   - Khan et al. 2012 "Fat and fatty acid content and composition of
//     forages: A meta-analysis" — Anim Feed Sci Tech.
//   - Rabhi et al. 2017 PMC5602967 — composición Quercus mediterráneos.
//   - Viera et al. 2024 ITACyL eurocarne #330 — corrector oleico + lecitina.
//   - Cerdeño et al. 2006 — dehesa salmantina, variación estacional pasto.
//   - Robles et al. 2017 — sulla, esparceta y leguminosas mediterráneas.
//
// Convenciones:
//   - oleic_pct_dm: % ácido oleico (C18:1) sobre MS — usado por lipidEngine.
//   - rup_pct_cp:   % de la proteína bruta que es by-pass (RUP).
//   - ndf_pct_dm:   % NDF sobre MS — fibra detergente neutra.
//   - climate_zones, soil_drainage_pref, soil_ph_min/max: usados por
//     feedSelectionEngine para puntuar el ajuste agronómico.

export type ClimateZone =
    | 'Mediterranean_dry'      // <500 mm, veranos secos (Andalucía sur, Extremadura sur)
    | 'Mediterranean_humid'    // 500-800 mm (Salamanca, Cáceres norte, Toledo)
    | 'Atlantic'               // >800 mm, suaves (Cantábrico, Galicia)
    | 'Continental'            // amplitud térmica grande (Castilla León interior, Aragón)
    | 'Mountain'               // estaciones cortas, fríos
    | 'Tropical'               // climas tropicales (Canarias bajas, ultramar)
    | 'Universal_byproduct';   // subproductos industriales — independiente de clima

export type SoilDrainage = 'Rápido' | 'Medio-Rápido' | 'Medio' | 'Medio-Lento' | 'Lento';

export type BiologicalType = 'British' | 'Continental' | 'Rustic_European' | 'Dairy' | 'Indicus' | 'Composite';

export type CropKind =
    | 'cereal_winter' | 'cereal_summer'
    | 'legume_annual' | 'legume_perennial'
    | 'forage_perennial' | 'forage_annual'
    | 'native_pasture'
    | 'oilseed_byproduct'
    | 'cereal_byproduct'
    | 'industrial_byproduct'
    | 'tuber'
    | 'shrub_browse'
    | 'fat_supplement'
    | 'mineral_supplement'
    | 'fermentation_product'
    | 'specialty';

export interface FeedItem {
    // ── Identidad ──────────────────────────────────────────────────────────
    id: string;
    name: string;
    category: 'Forraje' | 'Concentrado' | 'Suplemento' | 'Ecológico';
    description?: string;
    is_ecological?: boolean;

    // ── Composición proximal (todo % sobre MS salvo dm_percent) ────────────
    dm_percent: number;            // Materia Seca % (as fed → DM)
    energy_mcal: number;           // NEg Mcal/kg MS (modelo NRC)
    protein_percent: number;       // PB % CP
    fiber_percent: number;         // Fibra (FDN aproximado para legacy)
    cost_per_kg: number;           // €/kg fresco

    // ── Extensiones químicas (opcionales — se rellenan donde hay datos) ────
    ndf_pct_dm?: number;           // Neutral Detergent Fiber, % MS
    adf_pct_dm?: number;           // Acid Detergent Fiber, % MS
    starch_pct_dm?: number;        // Almidón, % MS (clave acidosis/energía)
    sugar_pct_dm?: number;         // Azúcares solubles, % MS
    ether_extract_pct_dm?: number; // Grasa bruta / extracto etéreo, % MS
    ash_pct_dm?: number;           // Cenizas, % MS

    // ── Perfil lipídico ────────────────────────────────────────────────────
    oleic_pct_dm?: number;         // C18:1 sobre MS — gate sinergia oleico+lecitina
    linoleic_pct_dm?: number;      // C18:2 sobre MS — omega-6
    linolenic_pct_dm?: number;     // C18:3 sobre MS — omega-3 (pasto/colza)

    // ── Proteína: calidad ──────────────────────────────────────────────────
    rup_pct_cp?: number;           // % RUP (by-pass) sobre PB — NASEM Tablas
    lysine_pct_cp?: number;        // Lys g/100g CP (factor limitante en cereales)
    methionine_pct_cp?: number;    // Met g/100g CP

    // ── Minerales clave (% sobre MS) ───────────────────────────────────────
    calcium_pct_dm?: number;
    phosphorus_pct_dm?: number;
    magnesium_pct_dm?: number;
    potassium_pct_dm?: number;
    sodium_pct_dm?: number;

    // ── Riesgos funcionales (puntuación cualitativa) ──────────────────────
    acidosis_risk?: 'low' | 'medium' | 'high';   // alto si almidón>50% + fermentación rápida
    bloat_risk?: 'low' | 'medium' | 'high';      // alto en leguminosas verdes
    palatability?: number;                        // 1 (rechazado) – 5 (muy apetecible)

    // ── Origen y matching agronómico ───────────────────────────────────────
    crop_kind?: CropKind;
    climate_zones?: ClimateZone[];                // zonas donde tiene sentido producirlo o usarlo
    soil_drainage_pref?: SoilDrainage[];          // drenajes compatibles del suelo
    soil_ph_min?: number;
    soil_ph_max?: number;
    slope_max_pct?: number;                       // pendiente máxima viable
    min_annual_precip_mm?: number;                // lluvia mínima (rainfed) anual

    // ── Disponibilidad estacional (meses 0-11 con producción fresca) ───────
    season_months?: number[];

    // ── Afinidad por biotipo (donde brilla nutricionalmente) ──────────────
    biotype_affinity?: BiologicalType[];

    // ── Banderas funcionales ───────────────────────────────────────────────
    is_local_spain?: boolean;                     // origen ibérico → menos huella
    is_byproduct?: boolean;                       // subproducto industrial
    is_fat_supplement?: boolean;                  // aceite, sebo, grasa protegida
}

// =============================================================================
// FEED_DATABASE — datos verificados contra INRA-CIRAD-AFZ / Feedipedia / NASEM
// =============================================================================
export const FEED_DATABASE: FeedItem[] = [
    // ───────────────────────────────────────────────────────────────────────
    // FORRAJES — PASTO DEHESA POR ESTACIÓN
    // Cerdeño et al. 2006, García-Ciudad et al. 2009 (variación CP/MOd)
    // ───────────────────────────────────────────────────────────────────────
    { id: 'F01_SPRING', name: 'Pasto Dehesa (Primavera)', category: 'Forraje', dm_percent: 22, energy_mcal: 1.38, protein_percent: 17, fiber_percent: 45,
        ndf_pct_dm: 45, adf_pct_dm: 26, starch_pct_dm: 0, sugar_pct_dm: 9, ether_extract_pct_dm: 3.2, ash_pct_dm: 9,
        oleic_pct_dm: 0.15, linoleic_pct_dm: 0.25, linolenic_pct_dm: 1.50,
        rup_pct_cp: 25, calcium_pct_dm: 0.55, phosphorus_pct_dm: 0.30, magnesium_pct_dm: 0.20, potassium_pct_dm: 2.6,
        acidosis_risk: 'low', bloat_risk: 'medium', palatability: 5,
        crop_kind: 'native_pasture', climate_zones: ['Mediterranean_humid', 'Mediterranean_dry', 'Continental'],
        soil_drainage_pref: ['Medio', 'Medio-Lento', 'Lento'], soil_ph_min: 5.5, soil_ph_max: 7.5, slope_max_pct: 25,
        season_months: [3, 4, 5], biotype_affinity: ['Rustic_European', 'British', 'Continental'],
        is_local_spain: true, cost_per_kg: 0.10,
        description: 'Pasto dehesa pico vegetativo. Alto CP, digestibilidad ~70 %, alto α-linolénico (omega-3)',
    },
    { id: 'F01_SUMMER', name: 'Pasto Dehesa (Verano Seco)', category: 'Forraje', dm_percent: 65, energy_mcal: 0.90, protein_percent: 5, fiber_percent: 65,
        ndf_pct_dm: 68, adf_pct_dm: 42, starch_pct_dm: 0, sugar_pct_dm: 3, ether_extract_pct_dm: 1.5, ash_pct_dm: 8,
        oleic_pct_dm: 0.05, linoleic_pct_dm: 0.10, linolenic_pct_dm: 0.30,
        rup_pct_cp: 35, calcium_pct_dm: 0.40, phosphorus_pct_dm: 0.15, magnesium_pct_dm: 0.15, potassium_pct_dm: 1.5,
        acidosis_risk: 'low', bloat_risk: 'low', palatability: 2,
        crop_kind: 'native_pasture', climate_zones: ['Mediterranean_dry', 'Mediterranean_humid', 'Continental'],
        soil_drainage_pref: ['Rápido', 'Medio-Rápido', 'Medio'], soil_ph_min: 5.5, soil_ph_max: 8.0, slope_max_pct: 30,
        season_months: [6, 7, 8], biotype_affinity: ['Rustic_European', 'Indicus'],
        is_local_spain: true, cost_per_kg: 0.05,
        description: 'Pasto reseco. CP cae −64 %, digestibilidad ~55 %. Solo cubre mantenimiento de razas rústicas',
    },
    { id: 'F01_AUTUMN', name: 'Pasto Dehesa (Otoño Post-Lluvia)', category: 'Forraje', dm_percent: 25, energy_mcal: 1.30, protein_percent: 14, fiber_percent: 48,
        ndf_pct_dm: 48, adf_pct_dm: 28, starch_pct_dm: 0, sugar_pct_dm: 7, ether_extract_pct_dm: 2.8, ash_pct_dm: 9,
        oleic_pct_dm: 0.13, linoleic_pct_dm: 0.22, linolenic_pct_dm: 1.20,
        rup_pct_cp: 26, calcium_pct_dm: 0.50, phosphorus_pct_dm: 0.28, magnesium_pct_dm: 0.18, potassium_pct_dm: 2.4,
        acidosis_risk: 'low', bloat_risk: 'medium', palatability: 5,
        crop_kind: 'native_pasture', climate_zones: ['Mediterranean_humid', 'Mediterranean_dry'],
        soil_drainage_pref: ['Medio', 'Medio-Lento'], soil_ph_min: 5.5, soil_ph_max: 7.5,
        season_months: [9, 10, 11], biotype_affinity: ['Rustic_European', 'British'],
        is_local_spain: true, cost_per_kg: 0.10,
        description: 'Rebrote otoñal. Digestibilidad ~68 %, recupera CP',
    },
    { id: 'F01_WINTER', name: 'Pasto Dehesa (Invierno)', category: 'Forraje', dm_percent: 28, energy_mcal: 1.15, protein_percent: 9, fiber_percent: 55,
        ndf_pct_dm: 55, adf_pct_dm: 33, starch_pct_dm: 0, sugar_pct_dm: 5, ether_extract_pct_dm: 2.2, ash_pct_dm: 9,
        oleic_pct_dm: 0.10, linoleic_pct_dm: 0.18, linolenic_pct_dm: 0.85,
        rup_pct_cp: 30, calcium_pct_dm: 0.45, phosphorus_pct_dm: 0.22, magnesium_pct_dm: 0.15, potassium_pct_dm: 2.0,
        acidosis_risk: 'low', bloat_risk: 'low', palatability: 3,
        crop_kind: 'native_pasture', climate_zones: ['Mediterranean_humid', 'Mediterranean_dry', 'Continental'],
        soil_drainage_pref: ['Medio', 'Medio-Lento'], soil_ph_min: 5.5, soil_ph_max: 7.5,
        season_months: [0, 1, 2, 11], biotype_affinity: ['Rustic_European'],
        is_local_spain: true, cost_per_kg: 0.08,
        description: 'Crecimiento lento. Digestibilidad ~60 %. Suplementar proteína',
    },
    { id: 'F01', name: 'Pasto Natural (genérico)', category: 'Forraje', dm_percent: 22, energy_mcal: 1.28, protein_percent: 13, fiber_percent: 45,
        ndf_pct_dm: 50, adf_pct_dm: 30, ether_extract_pct_dm: 2.5, ash_pct_dm: 8,
        oleic_pct_dm: 0.15, linoleic_pct_dm: 0.20, linolenic_pct_dm: 1.10,
        rup_pct_cp: 25, calcium_pct_dm: 0.50, phosphorus_pct_dm: 0.25, magnesium_pct_dm: 0.18, potassium_pct_dm: 2.2,
        acidosis_risk: 'low', bloat_risk: 'medium', palatability: 4,
        crop_kind: 'native_pasture', climate_zones: ['Mediterranean_humid', 'Atlantic', 'Continental'],
        soil_drainage_pref: ['Medio', 'Medio-Lento'], soil_ph_min: 5.5, soil_ph_max: 7.5,
        biotype_affinity: ['Rustic_European', 'British'], is_local_spain: true, cost_per_kg: 0.12,
        description: 'Mantenimiento y recría',
    },

    // ───────────────────────────────────────────────────────────────────────
    // FORRAJES SEMBRADOS — Praderas, henos, ensilados
    // ───────────────────────────────────────────────────────────────────────
    { id: 'F02', name: 'Ryegrass Italiano', category: 'Forraje', dm_percent: 23, energy_mcal: 1.35, protein_percent: 15, fiber_percent: 45,
        ndf_pct_dm: 48, adf_pct_dm: 27, sugar_pct_dm: 12, ether_extract_pct_dm: 3.0, ash_pct_dm: 9,
        oleic_pct_dm: 0.18, linoleic_pct_dm: 0.30, linolenic_pct_dm: 1.80,
        rup_pct_cp: 22, calcium_pct_dm: 0.50, phosphorus_pct_dm: 0.32, magnesium_pct_dm: 0.18, potassium_pct_dm: 2.9,
        acidosis_risk: 'low', bloat_risk: 'medium', palatability: 5,
        crop_kind: 'forage_annual', climate_zones: ['Atlantic', 'Mediterranean_humid'],
        soil_drainage_pref: ['Medio', 'Medio-Lento'], soil_ph_min: 5.5, soil_ph_max: 7.5, min_annual_precip_mm: 600,
        biotype_affinity: ['Dairy', 'Continental', 'British'], is_local_spain: true, cost_per_kg: 0.13,
        description: 'Pradera anual de alta productividad. Necesita 600 mm/año',
    },
    { id: 'F03', name: 'Heno de Pradera', category: 'Forraje', dm_percent: 88, energy_mcal: 1.10, protein_percent: 10, fiber_percent: 60,
        ndf_pct_dm: 62, adf_pct_dm: 38, ether_extract_pct_dm: 2.0, ash_pct_dm: 7,
        oleic_pct_dm: 0.10, linoleic_pct_dm: 0.20, linolenic_pct_dm: 0.50,
        rup_pct_cp: 30, calcium_pct_dm: 0.55, phosphorus_pct_dm: 0.22, magnesium_pct_dm: 0.15, potassium_pct_dm: 1.8,
        acidosis_risk: 'low', bloat_risk: 'low', palatability: 3,
        crop_kind: 'forage_perennial', climate_zones: ['Atlantic', 'Mediterranean_humid', 'Continental'],
        soil_drainage_pref: ['Medio', 'Medio-Lento'], soil_ph_min: 5.5, soil_ph_max: 7.5,
        biotype_affinity: ['Rustic_European'], is_local_spain: true, cost_per_kg: 0.12,
        description: 'Heno de pradera natural. Mantenimiento',
    },
    { id: 'F04', name: 'Heno de Alfalfa', category: 'Forraje', dm_percent: 89, energy_mcal: 1.25, protein_percent: 18, fiber_percent: 45,
        ndf_pct_dm: 42, adf_pct_dm: 33, ether_extract_pct_dm: 2.5, ash_pct_dm: 9,
        oleic_pct_dm: 0.09, linoleic_pct_dm: 0.40, linolenic_pct_dm: 1.20,
        rup_pct_cp: 28, lysine_pct_cp: 4.8, calcium_pct_dm: 1.50, phosphorus_pct_dm: 0.28, magnesium_pct_dm: 0.30, potassium_pct_dm: 2.5,
        acidosis_risk: 'low', bloat_risk: 'medium', palatability: 5,
        crop_kind: 'legume_perennial', climate_zones: ['Continental', 'Mediterranean_humid'],
        soil_drainage_pref: ['Rápido', 'Medio'], soil_ph_min: 6.2, soil_ph_max: 8.0, slope_max_pct: 10, min_annual_precip_mm: 500,
        biotype_affinity: ['Dairy', 'Continental', 'British'], is_local_spain: true, cost_per_kg: 0.18,
        description: 'Recría y lactación. Alto Ca, alta proteína. Sensible a encharcamiento',
    },
    { id: 'F04_DH', name: 'Alfalfa Deshidratada (pellet)', category: 'Concentrado', dm_percent: 91, energy_mcal: 1.35, protein_percent: 17, fiber_percent: 42,
        ndf_pct_dm: 40, adf_pct_dm: 30, ether_extract_pct_dm: 2.8, ash_pct_dm: 10,
        oleic_pct_dm: 0.10, linoleic_pct_dm: 0.45, linolenic_pct_dm: 0.95,
        rup_pct_cp: 35, calcium_pct_dm: 1.50, phosphorus_pct_dm: 0.30, magnesium_pct_dm: 0.30, potassium_pct_dm: 2.5,
        acidosis_risk: 'low', bloat_risk: 'low', palatability: 5,
        crop_kind: 'legume_perennial', climate_zones: ['Universal_byproduct'], is_byproduct: true,
        biotype_affinity: ['Dairy', 'Continental'], cost_per_kg: 0.28,
        description: 'Alfalfa deshidratada peletizada. RUP elevado por calor, sin bloat',
    },
    { id: 'F05', name: 'Ensilado de Maíz', category: 'Forraje', dm_percent: 32, energy_mcal: 1.60, protein_percent: 8, fiber_percent: 42,
        ndf_pct_dm: 45, adf_pct_dm: 24, starch_pct_dm: 28, ether_extract_pct_dm: 3.2, ash_pct_dm: 5,
        oleic_pct_dm: 0.70, linoleic_pct_dm: 1.60, linolenic_pct_dm: 0.20,
        rup_pct_cp: 35, calcium_pct_dm: 0.25, phosphorus_pct_dm: 0.22, magnesium_pct_dm: 0.18, potassium_pct_dm: 1.1,
        acidosis_risk: 'medium', bloat_risk: 'low', palatability: 5,
        crop_kind: 'cereal_summer', climate_zones: ['Continental', 'Mediterranean_humid', 'Atlantic'],
        soil_drainage_pref: ['Medio', 'Medio-Lento'], soil_ph_min: 5.8, soil_ph_max: 8.0, slope_max_pct: 8, min_annual_precip_mm: 500,
        biotype_affinity: ['Dairy', 'Continental', 'British'], is_local_spain: true, cost_per_kg: 0.09,
        description: 'Ensilado planta entera. Alto almidón + fibra. Engorde / lactancia',
    },
    { id: 'F05_GRASS', name: 'Ensilado de Hierba', category: 'Forraje', dm_percent: 35, energy_mcal: 1.30, protein_percent: 14, fiber_percent: 50,
        ndf_pct_dm: 53, adf_pct_dm: 33, sugar_pct_dm: 4, ether_extract_pct_dm: 3.5, ash_pct_dm: 9,
        oleic_pct_dm: 0.15, linoleic_pct_dm: 0.25, linolenic_pct_dm: 1.40,
        rup_pct_cp: 22, calcium_pct_dm: 0.60, phosphorus_pct_dm: 0.30, magnesium_pct_dm: 0.20, potassium_pct_dm: 2.8,
        acidosis_risk: 'low', bloat_risk: 'low', palatability: 4,
        crop_kind: 'forage_perennial', climate_zones: ['Atlantic', 'Mediterranean_humid'],
        soil_drainage_pref: ['Medio', 'Medio-Lento'],
        biotype_affinity: ['Dairy', 'Continental'], is_local_spain: true, cost_per_kg: 0.10,
        description: 'Ensilado de pradera. Conserva omega-3 del pasto fresco',
    },
    { id: 'F03_OAT', name: 'Heno de Avena-Veza', category: 'Forraje', dm_percent: 90, energy_mcal: 1.20, protein_percent: 13, fiber_percent: 55,
        ndf_pct_dm: 57, adf_pct_dm: 35, ether_extract_pct_dm: 2.5, ash_pct_dm: 9,
        oleic_pct_dm: 0.12, linoleic_pct_dm: 0.30, linolenic_pct_dm: 0.70,
        rup_pct_cp: 25, calcium_pct_dm: 0.85, phosphorus_pct_dm: 0.25, magnesium_pct_dm: 0.20, potassium_pct_dm: 2.2,
        acidosis_risk: 'low', bloat_risk: 'low', palatability: 4,
        crop_kind: 'cereal_winter', climate_zones: ['Mediterranean_dry', 'Mediterranean_humid', 'Continental'],
        soil_drainage_pref: ['Rápido', 'Medio', 'Medio-Lento'], soil_ph_min: 5.5, soil_ph_max: 8.0, slope_max_pct: 15, min_annual_precip_mm: 350,
        biotype_affinity: ['Rustic_European', 'British'], is_local_spain: true, cost_per_kg: 0.13,
        description: 'Asociación cereal-leguminosa. Bajo bloat, buen perfil para invernada',
    },
    { id: 'F_SULLA', name: 'Sulla (Hedysarum coronarium)', category: 'Forraje', dm_percent: 22, energy_mcal: 1.40, protein_percent: 19, fiber_percent: 40,
        ndf_pct_dm: 42, adf_pct_dm: 30, ether_extract_pct_dm: 3.0, ash_pct_dm: 10,
        oleic_pct_dm: 0.10, linoleic_pct_dm: 0.35, linolenic_pct_dm: 1.30,
        rup_pct_cp: 40, calcium_pct_dm: 1.40, phosphorus_pct_dm: 0.30, magnesium_pct_dm: 0.25,
        acidosis_risk: 'low', bloat_risk: 'low', palatability: 5,
        crop_kind: 'legume_perennial', climate_zones: ['Mediterranean_dry', 'Mediterranean_humid'],
        soil_drainage_pref: ['Rápido', 'Medio'], soil_ph_min: 6.0, soil_ph_max: 8.2, slope_max_pct: 20, min_annual_precip_mm: 400,
        biotype_affinity: ['Rustic_European', 'Continental'], is_local_spain: true, cost_per_kg: 0.14,
        description: 'Leguminosa mediterránea anti-bloat (taninos condensados). Excelente para dehesa',
    },
    { id: 'F_SAINFOIN', name: 'Esparceta (Onobrychis viciifolia)', category: 'Forraje', dm_percent: 24, energy_mcal: 1.35, protein_percent: 17, fiber_percent: 42,
        ndf_pct_dm: 44, adf_pct_dm: 32, ether_extract_pct_dm: 2.5, ash_pct_dm: 8,
        oleic_pct_dm: 0.10, linoleic_pct_dm: 0.30, linolenic_pct_dm: 1.20,
        rup_pct_cp: 45, calcium_pct_dm: 1.20, phosphorus_pct_dm: 0.25,
        acidosis_risk: 'low', bloat_risk: 'low', palatability: 5,
        crop_kind: 'legume_perennial', climate_zones: ['Mediterranean_dry', 'Continental'],
        soil_drainage_pref: ['Rápido', 'Medio'], soil_ph_min: 6.5, soil_ph_max: 8.4, slope_max_pct: 25, min_annual_precip_mm: 350,
        biotype_affinity: ['Rustic_European', 'Continental'], is_local_spain: true, cost_per_kg: 0.14,
        description: 'Leguminosa rústica tolerante a calizos. Sin riesgo de meteorismo, alto RUP por taninos',
    },
    { id: 'F_CLOVER', name: 'Trébol Subterráneo', category: 'Forraje', dm_percent: 20, energy_mcal: 1.45, protein_percent: 22, fiber_percent: 35,
        ndf_pct_dm: 38, adf_pct_dm: 27, ether_extract_pct_dm: 3.5, ash_pct_dm: 11,
        oleic_pct_dm: 0.15, linoleic_pct_dm: 0.40, linolenic_pct_dm: 1.60,
        rup_pct_cp: 22, calcium_pct_dm: 1.60, phosphorus_pct_dm: 0.30,
        acidosis_risk: 'low', bloat_risk: 'high', palatability: 5,
        crop_kind: 'legume_annual', climate_zones: ['Mediterranean_dry', 'Mediterranean_humid'],
        soil_drainage_pref: ['Medio', 'Rápido'], soil_ph_min: 5.0, soil_ph_max: 6.5, slope_max_pct: 20, min_annual_precip_mm: 400,
        biotype_affinity: ['Rustic_European', 'British'], is_local_spain: true, cost_per_kg: 0.13,
        description: 'Auto-resembrante anual de dehesa. Cuidado con meteorismo en verde puro',
    },
    { id: 'F_FESTUCA', name: 'Festuca Alta', category: 'Forraje', dm_percent: 23, energy_mcal: 1.25, protein_percent: 14, fiber_percent: 50,
        ndf_pct_dm: 55, adf_pct_dm: 32, ether_extract_pct_dm: 2.5, ash_pct_dm: 8,
        oleic_pct_dm: 0.15, linoleic_pct_dm: 0.25, linolenic_pct_dm: 1.30,
        rup_pct_cp: 25, calcium_pct_dm: 0.40, phosphorus_pct_dm: 0.28,
        acidosis_risk: 'low', bloat_risk: 'low', palatability: 3,
        crop_kind: 'forage_perennial', climate_zones: ['Atlantic', 'Mediterranean_humid', 'Continental'],
        soil_drainage_pref: ['Lento', 'Medio-Lento', 'Medio'], soil_ph_min: 5.0, soil_ph_max: 8.0, slope_max_pct: 25, min_annual_precip_mm: 450,
        biotype_affinity: ['Rustic_European'], is_local_spain: true, cost_per_kg: 0.12,
        description: 'Pradera persistente tolerante a encharcamiento y sequía moderada',
    },
    { id: 'paja', name: 'Paja de Cereal', category: 'Forraje', dm_percent: 90, energy_mcal: 0.60, protein_percent: 3, fiber_percent: 75,
        ndf_pct_dm: 78, adf_pct_dm: 50, ether_extract_pct_dm: 1.5, ash_pct_dm: 7,
        oleic_pct_dm: 0.05, linoleic_pct_dm: 0.15, linolenic_pct_dm: 0.10,
        rup_pct_cp: 40, calcium_pct_dm: 0.25, phosphorus_pct_dm: 0.07,
        acidosis_risk: 'low', bloat_risk: 'low', palatability: 1,
        crop_kind: 'cereal_byproduct', climate_zones: ['Universal_byproduct'], is_byproduct: true, is_local_spain: true,
        biotype_affinity: ['Rustic_European', 'Indicus'], cost_per_kg: 0.05,
        description: 'Subproducto. Fibra efectiva, casi nula energía y proteína',
    },

    // ───────────────────────────────────────────────────────────────────────
    // ESPECIAL DEHESA — Bellota
    // Rabhi 2017 PMC5602967 — Q. ilex 7-9 % EE × 63-66 % oleico de FAs
    // ───────────────────────────────────────────────────────────────────────
    { id: 'BELLHO_01', name: 'Bellota Encina (Quercus ilex)', category: 'Forraje', dm_percent: 62, energy_mcal: 2.20, protein_percent: 6, fiber_percent: 22,
        ndf_pct_dm: 22, adf_pct_dm: 14, starch_pct_dm: 45, sugar_pct_dm: 6, ether_extract_pct_dm: 7.4, ash_pct_dm: 2.5,
        oleic_pct_dm: 4.3, linoleic_pct_dm: 1.40, linolenic_pct_dm: 0.05,
        rup_pct_cp: 30, calcium_pct_dm: 0.08, phosphorus_pct_dm: 0.15, magnesium_pct_dm: 0.15, potassium_pct_dm: 0.55,
        acidosis_risk: 'medium', bloat_risk: 'low', palatability: 5,
        crop_kind: 'native_pasture', climate_zones: ['Mediterranean_dry', 'Mediterranean_humid'],
        soil_drainage_pref: ['Rápido', 'Medio-Rápido', 'Medio'], soil_ph_min: 5.0, soil_ph_max: 7.5,
        season_months: [9, 10, 11, 0, 1], biotype_affinity: ['Rustic_European', 'British'], is_local_spain: true, cost_per_kg: 0.10,
        description: 'Bellota encina — alto oleico (63 % de FAs). Acabado calidad oct-feb',
    },
    { id: 'BELLRO_01', name: 'Bellota Roble (Quercus pyrenaica)', category: 'Forraje', dm_percent: 60, energy_mcal: 2.00, protein_percent: 7, fiber_percent: 26,
        ndf_pct_dm: 26, adf_pct_dm: 18, starch_pct_dm: 38, sugar_pct_dm: 5, ether_extract_pct_dm: 5.0, ash_pct_dm: 3,
        oleic_pct_dm: 2.50, linoleic_pct_dm: 1.10, linolenic_pct_dm: 0.05,
        rup_pct_cp: 35, calcium_pct_dm: 0.10, phosphorus_pct_dm: 0.15, magnesium_pct_dm: 0.12,
        acidosis_risk: 'medium', bloat_risk: 'low', palatability: 3,
        crop_kind: 'native_pasture', climate_zones: ['Mediterranean_humid', 'Continental'],
        season_months: [9, 10, 11, 0, 1], biotype_affinity: ['Rustic_European'], is_local_spain: true, cost_per_kg: 0.08,
        description: 'Más taninos amargos. Apetencia inferior a encina',
    },

    // ───────────────────────────────────────────────────────────────────────
    // CORRECTORES DE ACABADO — Viera et al. 2024
    // ───────────────────────────────────────────────────────────────────────
    { id: 'OLEIC_CONC', name: 'Concentrado Alto Oleico (acabado)', category: 'Concentrado', dm_percent: 90, energy_mcal: 2.10, protein_percent: 13, fiber_percent: 14,
        ndf_pct_dm: 16, adf_pct_dm: 7, starch_pct_dm: 38, ether_extract_pct_dm: 8, ash_pct_dm: 5,
        oleic_pct_dm: 3.12, linoleic_pct_dm: 1.20, linolenic_pct_dm: 0.10,
        rup_pct_cp: 35, calcium_pct_dm: 0.80, phosphorus_pct_dm: 0.45,
        acidosis_risk: 'medium', palatability: 4,
        crop_kind: 'specialty', climate_zones: ['Universal_byproduct'], is_byproduct: true,
        biotype_affinity: ['British', 'Composite', 'Rustic_European'], cost_per_kg: 0.34,
        description: 'Corrector 3.12% oleico MS (Viera 2024). Acabado bueyes ≥36m / terneras F1×Angus',
    },
    { id: 'LECITHIN_PROT', name: 'Lecitina de Soja Protegida', category: 'Suplemento', dm_percent: 95, energy_mcal: 1.40, protein_percent: 0, fiber_percent: 0,
        ether_extract_pct_dm: 95, oleic_pct_dm: 0, linoleic_pct_dm: 50, linolenic_pct_dm: 4,
        crop_kind: 'fat_supplement', climate_zones: ['Universal_byproduct'], is_byproduct: true, is_fat_supplement: true, palatability: 3,
        biotype_affinity: ['British', 'Composite', 'Rustic_European'], cost_per_kg: 4.50,
        description: 'EFSA 2016. 0.2–0.5% MS en dietas de acabado oleicas. Mejora absorción intestinal',
    },

    // ───────────────────────────────────────────────────────────────────────
    // CEREALES ENERGÉTICOS
    // Feedipedia: maíz starch 65 %, NDF 10 %, EE 4 % (oleico 28 % de FAs)
    // ───────────────────────────────────────────────────────────────────────
    { id: 'C01', name: 'Maíz Grano', category: 'Concentrado', dm_percent: 87, energy_mcal: 2.05, protein_percent: 9, fiber_percent: 12,
        ndf_pct_dm: 10, adf_pct_dm: 3, starch_pct_dm: 65, ether_extract_pct_dm: 4.0, ash_pct_dm: 1.5,
        oleic_pct_dm: 1.0, linoleic_pct_dm: 2.0, linolenic_pct_dm: 0.05,
        rup_pct_cp: 55, lysine_pct_cp: 2.7, calcium_pct_dm: 0.03, phosphorus_pct_dm: 0.28, magnesium_pct_dm: 0.12, potassium_pct_dm: 0.35,
        acidosis_risk: 'high', palatability: 5,
        crop_kind: 'cereal_summer', climate_zones: ['Continental', 'Mediterranean_humid'],
        soil_drainage_pref: ['Medio', 'Medio-Lento'], soil_ph_min: 5.8, soil_ph_max: 8.0, slope_max_pct: 8, min_annual_precip_mm: 500,
        biotype_affinity: ['British', 'Continental', 'Dairy'], cost_per_kg: 0.25,
        description: 'Estándar del cebo. Starch 65 %, almidón parcialmente by-pass',
    },
    { id: 'C02', name: 'Cebada', category: 'Concentrado', dm_percent: 88, energy_mcal: 1.95, protein_percent: 11, fiber_percent: 18,
        ndf_pct_dm: 19, adf_pct_dm: 6, starch_pct_dm: 58, ether_extract_pct_dm: 1.9, ash_pct_dm: 2.5,
        oleic_pct_dm: 0.23, linoleic_pct_dm: 0.95, linolenic_pct_dm: 0.10,
        rup_pct_cp: 25, lysine_pct_cp: 3.5, calcium_pct_dm: 0.06, phosphorus_pct_dm: 0.36, magnesium_pct_dm: 0.13, potassium_pct_dm: 0.50,
        acidosis_risk: 'high', palatability: 5,
        crop_kind: 'cereal_winter', climate_zones: ['Mediterranean_dry', 'Mediterranean_humid', 'Continental'],
        soil_drainage_pref: ['Rápido', 'Medio'], soil_ph_min: 6.0, soil_ph_max: 8.5, slope_max_pct: 12, min_annual_precip_mm: 350,
        biotype_affinity: ['Rustic_European', 'British', 'Continental'], is_local_spain: true, cost_per_kg: 0.23,
        description: 'Cereal mediterráneo por excelencia. Más fermentación rápida que maíz',
    },
    { id: 'C03', name: 'Trigo', category: 'Concentrado', dm_percent: 87, energy_mcal: 2.00, protein_percent: 12, fiber_percent: 10,
        ndf_pct_dm: 14, adf_pct_dm: 4, starch_pct_dm: 65, ether_extract_pct_dm: 1.8, ash_pct_dm: 1.8,
        oleic_pct_dm: 0.25, linoleic_pct_dm: 0.90, linolenic_pct_dm: 0.08,
        rup_pct_cp: 22, lysine_pct_cp: 2.8, calcium_pct_dm: 0.05, phosphorus_pct_dm: 0.35,
        acidosis_risk: 'high', palatability: 5,
        crop_kind: 'cereal_winter', climate_zones: ['Mediterranean_dry', 'Mediterranean_humid', 'Continental'],
        soil_drainage_pref: ['Medio', 'Medio-Lento'], soil_ph_min: 6.0, soil_ph_max: 8.0, slope_max_pct: 12, min_annual_precip_mm: 450,
        biotype_affinity: ['Dairy', 'Continental'], is_local_spain: true, cost_per_kg: 0.26,
        description: 'Fermentación más rápida que cebada. Riesgo acidosis si >25 % MS',
    },
    { id: 'C04', name: 'DDGS (Maíz)', category: 'Concentrado', dm_percent: 90, energy_mcal: 2.05, protein_percent: 28, fiber_percent: 32,
        ndf_pct_dm: 35, adf_pct_dm: 12, starch_pct_dm: 5, ether_extract_pct_dm: 10, ash_pct_dm: 5,
        oleic_pct_dm: 2.8, linoleic_pct_dm: 4.5, linolenic_pct_dm: 0.20,
        rup_pct_cp: 60, lysine_pct_cp: 3.1, calcium_pct_dm: 0.10, phosphorus_pct_dm: 0.80, magnesium_pct_dm: 0.30, sodium_pct_dm: 0.25,
        acidosis_risk: 'low', palatability: 4,
        crop_kind: 'fermentation_product', climate_zones: ['Universal_byproduct'], is_byproduct: true,
        biotype_affinity: ['Continental', 'Dairy', 'British'], cost_per_kg: 0.28,
        description: 'Sustituto cereal-proteico. Alto RUP (60 %), alto P, alto S — vigilar',
    },
    { id: 'C04W', name: 'DDGS (Trigo)', category: 'Concentrado', dm_percent: 90, energy_mcal: 1.95, protein_percent: 32, fiber_percent: 30,
        ndf_pct_dm: 33, adf_pct_dm: 14, starch_pct_dm: 4, ether_extract_pct_dm: 5, ash_pct_dm: 5,
        oleic_pct_dm: 1.0, linoleic_pct_dm: 2.5, linolenic_pct_dm: 0.20,
        rup_pct_cp: 50, calcium_pct_dm: 0.15, phosphorus_pct_dm: 0.85,
        acidosis_risk: 'low', palatability: 4,
        crop_kind: 'fermentation_product', climate_zones: ['Universal_byproduct'], is_byproduct: true,
        biotype_affinity: ['Continental', 'Dairy'], cost_per_kg: 0.27,
        description: 'Más proteína que DDGS maíz, menos grasa',
    },
    { id: 'C05', name: 'Pulpa de Remolacha', category: 'Concentrado', dm_percent: 91, energy_mcal: 1.85, protein_percent: 9, fiber_percent: 38,
        ndf_pct_dm: 42, adf_pct_dm: 23, starch_pct_dm: 0, sugar_pct_dm: 8, ether_extract_pct_dm: 0.8, ash_pct_dm: 7,
        oleic_pct_dm: 0.08, calcium_pct_dm: 0.90, phosphorus_pct_dm: 0.10, magnesium_pct_dm: 0.20, potassium_pct_dm: 1.1,
        acidosis_risk: 'low', palatability: 4,
        crop_kind: 'industrial_byproduct', climate_zones: ['Universal_byproduct'], is_byproduct: true, is_local_spain: true,
        biotype_affinity: ['Dairy', 'British'], cost_per_kg: 0.22,
        description: 'Fibra digestible no almidón. Excelente complemento de cereales en cebo',
    },
    { id: 'C05_CIT', name: 'Pulpa de Cítricos', category: 'Concentrado', dm_percent: 90, energy_mcal: 1.85, protein_percent: 6, fiber_percent: 22,
        ndf_pct_dm: 23, adf_pct_dm: 19, starch_pct_dm: 1, sugar_pct_dm: 24, ether_extract_pct_dm: 4, ash_pct_dm: 6,
        oleic_pct_dm: 0.20, calcium_pct_dm: 1.80, phosphorus_pct_dm: 0.10,
        acidosis_risk: 'medium', palatability: 4,
        crop_kind: 'industrial_byproduct', climate_zones: ['Universal_byproduct'], is_byproduct: true, is_local_spain: true,
        biotype_affinity: ['Dairy', 'British'], cost_per_kg: 0.20,
        description: 'Alto azúcar y pectina. Sustituto cereal sin riesgo de acidosis severa',
    },
    { id: 'C06', name: 'Cascarilla de Soja', category: 'Concentrado', dm_percent: 90, energy_mcal: 1.55, protein_percent: 12, fiber_percent: 60,
        ndf_pct_dm: 66, adf_pct_dm: 47, starch_pct_dm: 0, ether_extract_pct_dm: 2.0, ash_pct_dm: 5,
        oleic_pct_dm: 0.10, calcium_pct_dm: 0.55, phosphorus_pct_dm: 0.15,
        acidosis_risk: 'low', palatability: 3,
        crop_kind: 'oilseed_byproduct', climate_zones: ['Universal_byproduct'], is_byproduct: true,
        biotype_affinity: ['Dairy', 'Rustic_European'], cost_per_kg: 0.18,
        description: 'Fibra digestible para diluir concentrado sin perder energía',
    },
    { id: 'C_SOR', name: 'Sorgo Grano', category: 'Concentrado', dm_percent: 88, energy_mcal: 1.95, protein_percent: 10, fiber_percent: 14,
        ndf_pct_dm: 13, adf_pct_dm: 5, starch_pct_dm: 62, ether_extract_pct_dm: 3.2, ash_pct_dm: 2,
        oleic_pct_dm: 0.80, linoleic_pct_dm: 1.40, calcium_pct_dm: 0.03, phosphorus_pct_dm: 0.30,
        rup_pct_cp: 50, lysine_pct_cp: 2.0,
        acidosis_risk: 'medium', palatability: 4,
        crop_kind: 'cereal_summer', climate_zones: ['Mediterranean_dry', 'Continental'],
        soil_drainage_pref: ['Rápido', 'Medio-Rápido', 'Medio'], soil_ph_min: 5.8, soil_ph_max: 8.5, slope_max_pct: 12, min_annual_precip_mm: 300,
        biotype_affinity: ['Indicus', 'Rustic_European', 'Continental'], is_local_spain: true, cost_per_kg: 0.22,
        description: 'Cereal tolerante a sequía. Alternativa al maíz en zonas <500 mm/año',
    },
    { id: 'triticale', name: 'Triticale', category: 'Concentrado', dm_percent: 88, energy_mcal: 1.85, protein_percent: 12, fiber_percent: 14,
        ndf_pct_dm: 15, adf_pct_dm: 4, starch_pct_dm: 60, ether_extract_pct_dm: 1.8, ash_pct_dm: 2,
        oleic_pct_dm: 0.30, linoleic_pct_dm: 0.85, calcium_pct_dm: 0.05, phosphorus_pct_dm: 0.36,
        rup_pct_cp: 22, acidosis_risk: 'high', palatability: 4,
        crop_kind: 'cereal_winter', climate_zones: ['Mediterranean_dry', 'Mediterranean_humid', 'Continental', 'Mountain'],
        soil_drainage_pref: ['Rápido', 'Medio', 'Medio-Lento', 'Lento'], soil_ph_min: 5.0, soil_ph_max: 8.0, slope_max_pct: 18, min_annual_precip_mm: 350,
        biotype_affinity: ['Rustic_European', 'Continental'], is_local_spain: true, cost_per_kg: 0.22,
        description: 'Híbrido trigo×centeno. Tolera suelos ácidos/marginales mejor que trigo',
    },
    { id: 'avena', name: 'Avena Grano', category: 'Concentrado', dm_percent: 89, energy_mcal: 1.70, protein_percent: 11, fiber_percent: 28,
        ndf_pct_dm: 30, adf_pct_dm: 14, starch_pct_dm: 40, ether_extract_pct_dm: 5.5, ash_pct_dm: 3,
        oleic_pct_dm: 2.0, linoleic_pct_dm: 1.80, linolenic_pct_dm: 0.10,
        rup_pct_cp: 18, lysine_pct_cp: 4.0, calcium_pct_dm: 0.08, phosphorus_pct_dm: 0.35,
        acidosis_risk: 'medium', palatability: 5,
        crop_kind: 'cereal_winter', climate_zones: ['Mediterranean_humid', 'Continental', 'Atlantic', 'Mountain'],
        soil_drainage_pref: ['Medio', 'Lento', 'Medio-Lento'], soil_ph_min: 5.0, soil_ph_max: 7.5, slope_max_pct: 15, min_annual_precip_mm: 400,
        biotype_affinity: ['Rustic_European', 'British'], is_local_spain: true, cost_per_kg: 0.22,
        description: 'Cereal con mayor EE (5.5 %) y oleico. Energía moderada para recría',
    },
    { id: 'C_RYE', name: 'Centeno Grano', category: 'Concentrado', dm_percent: 88, energy_mcal: 1.85, protein_percent: 11, fiber_percent: 12,
        ndf_pct_dm: 13, adf_pct_dm: 4, starch_pct_dm: 60, ether_extract_pct_dm: 1.6, ash_pct_dm: 2,
        oleic_pct_dm: 0.25, linoleic_pct_dm: 0.80, calcium_pct_dm: 0.06, phosphorus_pct_dm: 0.34,
        rup_pct_cp: 20, acidosis_risk: 'high', palatability: 3,
        crop_kind: 'cereal_winter', climate_zones: ['Continental', 'Mountain', 'Mediterranean_humid'],
        soil_drainage_pref: ['Rápido', 'Medio'], soil_ph_min: 5.0, soil_ph_max: 7.5, slope_max_pct: 15, min_annual_precip_mm: 300,
        biotype_affinity: ['Rustic_European'], is_local_spain: true, cost_per_kg: 0.20,
        description: 'Tolera suelos pobres y ácidos. Limitar al 25 % por palatabilidad',
    },
    { id: 'C_BRAN', name: 'Salvado de Trigo', category: 'Concentrado', dm_percent: 88, energy_mcal: 1.60, protein_percent: 16, fiber_percent: 42,
        ndf_pct_dm: 45, adf_pct_dm: 14, starch_pct_dm: 20, ether_extract_pct_dm: 4, ash_pct_dm: 6,
        oleic_pct_dm: 0.50, linoleic_pct_dm: 2.0, calcium_pct_dm: 0.13, phosphorus_pct_dm: 1.20, magnesium_pct_dm: 0.55,
        rup_pct_cp: 30, acidosis_risk: 'low', palatability: 4,
        crop_kind: 'cereal_byproduct', climate_zones: ['Universal_byproduct'], is_byproduct: true, is_local_spain: true,
        biotype_affinity: ['Dairy', 'Rustic_European'], cost_per_kg: 0.18,
        description: 'Subproducto molinero. Alto P (1.2 %) — atención balance Ca:P',
    },
    { id: 'C_GLUTEN_FEED', name: 'Gluten Feed Maíz', category: 'Concentrado', dm_percent: 90, energy_mcal: 1.80, protein_percent: 22, fiber_percent: 32,
        ndf_pct_dm: 38, adf_pct_dm: 12, starch_pct_dm: 18, ether_extract_pct_dm: 3, ash_pct_dm: 7,
        oleic_pct_dm: 0.6, linoleic_pct_dm: 1.50, calcium_pct_dm: 0.10, phosphorus_pct_dm: 0.95,
        rup_pct_cp: 30, acidosis_risk: 'low', palatability: 4,
        crop_kind: 'cereal_byproduct', climate_zones: ['Universal_byproduct'], is_byproduct: true,
        biotype_affinity: ['Dairy', 'Continental'], cost_per_kg: 0.24,
        description: 'Subproducto molturación húmeda. Energía-proteína balanceada',
    },

    // ───────────────────────────────────────────────────────────────────────
    // PROTEICOS — Feedipedia + INRA-CIRAD-AFZ
    // ───────────────────────────────────────────────────────────────────────
    { id: 'P01', name: 'Harina de Soja 47%', category: 'Concentrado', dm_percent: 88, energy_mcal: 1.90, protein_percent: 47, fiber_percent: 15,
        ndf_pct_dm: 14, adf_pct_dm: 9, starch_pct_dm: 6, ether_extract_pct_dm: 1.5, ash_pct_dm: 7,
        oleic_pct_dm: 0.36, linoleic_pct_dm: 0.75, linolenic_pct_dm: 0.10,
        rup_pct_cp: 30, lysine_pct_cp: 6.2, methionine_pct_cp: 1.4, calcium_pct_dm: 0.35, phosphorus_pct_dm: 0.70,
        acidosis_risk: 'low', palatability: 5,
        crop_kind: 'oilseed_byproduct', climate_zones: ['Universal_byproduct'], is_byproduct: true,
        biotype_affinity: ['Dairy', 'Continental', 'British'], cost_per_kg: 0.42,
        description: 'Estándar global. RUP 30 %, lisina 6.2 g/100g CP',
    },
    { id: 'P02', name: 'Colza/Canola (solvente)', category: 'Concentrado', dm_percent: 89, energy_mcal: 1.70, protein_percent: 38, fiber_percent: 13,
        ndf_pct_dm: 32, adf_pct_dm: 21, ether_extract_pct_dm: 2.4, ash_pct_dm: 7,
        oleic_pct_dm: 0.95, linoleic_pct_dm: 0.50, linolenic_pct_dm: 0.20,
        rup_pct_cp: 48, lysine_pct_cp: 5.3, methionine_pct_cp: 2.0, calcium_pct_dm: 0.86, phosphorus_pct_dm: 1.27,
        acidosis_risk: 'low', palatability: 4,
        crop_kind: 'oilseed_byproduct', climate_zones: ['Universal_byproduct'], is_byproduct: true,
        biotype_affinity: ['Dairy', 'Continental'], cost_per_kg: 0.40,
        description: 'RUP 48 % — superior a soja para vacas alta producción. Alta Ca/P',
    },
    { id: 'P_SUN', name: 'Harina de Girasol (Hi-Pro)', category: 'Concentrado', dm_percent: 89, energy_mcal: 1.55, protein_percent: 32, fiber_percent: 32,
        ndf_pct_dm: 45, adf_pct_dm: 32, ether_extract_pct_dm: 2.2, ash_pct_dm: 7,
        oleic_pct_dm: 0.5, linoleic_pct_dm: 1.0, linolenic_pct_dm: 0.05,
        rup_pct_cp: 28, lysine_pct_cp: 3.5, methionine_pct_cp: 2.3, calcium_pct_dm: 0.44, phosphorus_pct_dm: 1.16,
        acidosis_risk: 'low', palatability: 4,
        crop_kind: 'oilseed_byproduct', climate_zones: ['Universal_byproduct'], is_byproduct: true, is_local_spain: true,
        biotype_affinity: ['Continental', 'Rustic_European'], cost_per_kg: 0.34,
        description: 'Sin factores antinutricionales. Producción ibérica significativa',
    },
    { id: 'P_COT', name: 'Harina de Algodón', category: 'Concentrado', dm_percent: 91, energy_mcal: 1.70, protein_percent: 41, fiber_percent: 23,
        ndf_pct_dm: 28, adf_pct_dm: 18, ether_extract_pct_dm: 1.5, ash_pct_dm: 7,
        oleic_pct_dm: 0.3, linoleic_pct_dm: 0.7, calcium_pct_dm: 0.18, phosphorus_pct_dm: 1.10,
        rup_pct_cp: 43, lysine_pct_cp: 4.4, methionine_pct_cp: 1.5, acidosis_risk: 'low', palatability: 3,
        crop_kind: 'oilseed_byproduct', climate_zones: ['Universal_byproduct'], is_byproduct: true,
        biotype_affinity: ['Continental', 'Dairy'], cost_per_kg: 0.38,
        description: 'Cuidado con gossypol (no terneros lactantes). RUP 43 %',
    },
    { id: 'P_PALM', name: 'Harina de Palmiste', category: 'Concentrado', dm_percent: 90, energy_mcal: 1.65, protein_percent: 17, fiber_percent: 35,
        ndf_pct_dm: 65, adf_pct_dm: 42, ether_extract_pct_dm: 9, ash_pct_dm: 4,
        oleic_pct_dm: 1.5, linoleic_pct_dm: 0.4, calcium_pct_dm: 0.30, phosphorus_pct_dm: 0.65,
        rup_pct_cp: 60, palatability: 3, acidosis_risk: 'low',
        crop_kind: 'oilseed_byproduct', climate_zones: ['Universal_byproduct'], is_byproduct: true,
        biotype_affinity: ['Indicus', 'Rustic_European'], cost_per_kg: 0.26,
        description: 'Subproducto palma. Alto RUP y EE — buena para dietas tropicales',
    },
    { id: 'P_GLUTEN_MEAL', name: 'Gluten Meal de Maíz 60%', category: 'Concentrado', dm_percent: 90, energy_mcal: 2.10, protein_percent: 60, fiber_percent: 5,
        ndf_pct_dm: 8, adf_pct_dm: 4, starch_pct_dm: 18, ether_extract_pct_dm: 5, ash_pct_dm: 2,
        oleic_pct_dm: 1.2, linoleic_pct_dm: 2.5, calcium_pct_dm: 0.06, phosphorus_pct_dm: 0.50,
        rup_pct_cp: 70, lysine_pct_cp: 1.7, methionine_pct_cp: 2.4, palatability: 3, acidosis_risk: 'medium',
        crop_kind: 'cereal_byproduct', climate_zones: ['Universal_byproduct'], is_byproduct: true,
        biotype_affinity: ['Dairy'], cost_per_kg: 0.95,
        description: 'RUP 70 % — proteína by-pass premium. Caro, pobre en lisina',
    },
    { id: 'P03', name: 'Guisante Proteico', category: 'Concentrado', dm_percent: 88, energy_mcal: 1.80, protein_percent: 24, fiber_percent: 14,
        ndf_pct_dm: 14, adf_pct_dm: 7, starch_pct_dm: 48, ether_extract_pct_dm: 1.5, ash_pct_dm: 3,
        oleic_pct_dm: 0.30, linoleic_pct_dm: 0.55, linolenic_pct_dm: 0.05,
        rup_pct_cp: 22, lysine_pct_cp: 7.4, methionine_pct_cp: 1.0, calcium_pct_dm: 0.10, phosphorus_pct_dm: 0.45,
        acidosis_risk: 'medium', palatability: 5,
        crop_kind: 'legume_annual', climate_zones: ['Mediterranean_humid', 'Continental', 'Atlantic'],
        soil_drainage_pref: ['Medio', 'Rápido'], soil_ph_min: 6.0, soil_ph_max: 7.8, slope_max_pct: 12, min_annual_precip_mm: 400,
        biotype_affinity: ['Rustic_European', 'British', 'Continental'], is_local_spain: true, cost_per_kg: 0.38,
        description: 'Proteaginosa KM0. Doble función almidón+proteína, alta lisina',
    },
    { id: 'P_FABA', name: 'Haba (Vicia faba)', category: 'Concentrado', dm_percent: 88, energy_mcal: 1.75, protein_percent: 28, fiber_percent: 14,
        ndf_pct_dm: 15, adf_pct_dm: 10, starch_pct_dm: 42, ether_extract_pct_dm: 1.5, ash_pct_dm: 3.5,
        oleic_pct_dm: 0.30, linoleic_pct_dm: 0.55,
        rup_pct_cp: 20, lysine_pct_cp: 6.5, calcium_pct_dm: 0.13, phosphorus_pct_dm: 0.55,
        acidosis_risk: 'medium', palatability: 4,
        crop_kind: 'legume_annual', climate_zones: ['Mediterranean_dry', 'Mediterranean_humid', 'Continental'],
        soil_drainage_pref: ['Medio', 'Medio-Lento'], soil_ph_min: 6.0, soil_ph_max: 8.0, slope_max_pct: 15, min_annual_precip_mm: 400,
        biotype_affinity: ['Rustic_European', 'British'], is_local_spain: true, cost_per_kg: 0.36,
        description: 'Leguminosa fijadora N2 ideal para rotaciones ibéricas',
    },
    { id: 'P_LUPIN', name: 'Lupino Dulce', category: 'Concentrado', dm_percent: 89, energy_mcal: 1.85, protein_percent: 35, fiber_percent: 16,
        ndf_pct_dm: 22, adf_pct_dm: 17, starch_pct_dm: 1, ether_extract_pct_dm: 7, ash_pct_dm: 3.5,
        oleic_pct_dm: 2.5, linoleic_pct_dm: 2.5, linolenic_pct_dm: 0.50,
        rup_pct_cp: 28, lysine_pct_cp: 4.6, calcium_pct_dm: 0.30, phosphorus_pct_dm: 0.45,
        acidosis_risk: 'low', palatability: 4,
        crop_kind: 'legume_annual', climate_zones: ['Mediterranean_dry', 'Mediterranean_humid'],
        soil_drainage_pref: ['Rápido', 'Medio-Rápido'], soil_ph_min: 4.5, soil_ph_max: 6.8, slope_max_pct: 15, min_annual_precip_mm: 350,
        biotype_affinity: ['Rustic_European'], is_local_spain: true, cost_per_kg: 0.40,
        description: 'Leguminosa tolerante a suelo ácido. EE alto + lipid quality',
    },
    { id: 'P_YEAST', name: 'Levadura (Saccharomyces)', category: 'Suplemento', dm_percent: 95, energy_mcal: 1.90, protein_percent: 47, fiber_percent: 2,
        ndf_pct_dm: 4, ether_extract_pct_dm: 5, ash_pct_dm: 8,
        rup_pct_cp: 50, lysine_pct_cp: 7.5, methionine_pct_cp: 1.5, calcium_pct_dm: 0.20, phosphorus_pct_dm: 1.40,
        acidosis_risk: 'low', palatability: 4,
        crop_kind: 'fermentation_product', climate_zones: ['Universal_byproduct'], is_byproduct: true,
        biotype_affinity: ['Dairy'], cost_per_kg: 1.50,
        description: 'Estabilizador ruminal + proteína. Útil en transición a cebo',
    },
    { id: 'P04', name: 'Urea (NNP)', category: 'Suplemento', dm_percent: 100, energy_mcal: 0, protein_percent: 281, fiber_percent: 0,
        rup_pct_cp: 0, calcium_pct_dm: 0, phosphorus_pct_dm: 0,
        palatability: 1,
        crop_kind: 'mineral_supplement', climate_zones: ['Universal_byproduct'], is_byproduct: true,
        biotype_affinity: ['Indicus', 'Rustic_European'], cost_per_kg: 0.45,
        description: 'NNP — solo >8 meses, máx 1 % MS, vehiculizada con melaza',
    },

    // ───────────────────────────────────────────────────────────────────────
    // SUPLEMENTOS LIPÍDICOS Y BUFFERS
    // ───────────────────────────────────────────────────────────────────────
    { id: 'S_PALM_OIL', name: 'Aceite de Palma (protegido)', category: 'Suplemento', dm_percent: 99, energy_mcal: 4.50, protein_percent: 0, fiber_percent: 0,
        ether_extract_pct_dm: 99, oleic_pct_dm: 39, linoleic_pct_dm: 10,
        crop_kind: 'fat_supplement', climate_zones: ['Universal_byproduct'], is_byproduct: true, is_fat_supplement: true,
        palatability: 2, biotype_affinity: ['Dairy', 'British'], cost_per_kg: 1.30,
        description: 'C16:0 elevado. Energía densa para alta producción. Max 3-5 % MS',
    },
    { id: 'S_TALLOW', name: 'Sebo Animal', category: 'Suplemento', dm_percent: 99, energy_mcal: 5.00, protein_percent: 0, fiber_percent: 0,
        ether_extract_pct_dm: 99, oleic_pct_dm: 42, linoleic_pct_dm: 3,
        crop_kind: 'fat_supplement', climate_zones: ['Universal_byproduct'], is_byproduct: true, is_fat_supplement: true,
        palatability: 3, biotype_affinity: ['British'], cost_per_kg: 0.95,
        description: 'Grasa saturada. Útil en pasta de pienso. Cuidado normativa SANDACH',
    },
    { id: 'S_LINSEED', name: 'Aceite de Lino', category: 'Suplemento', dm_percent: 99, energy_mcal: 4.80, protein_percent: 0, fiber_percent: 0,
        ether_extract_pct_dm: 99, oleic_pct_dm: 20, linoleic_pct_dm: 15, linolenic_pct_dm: 53,
        crop_kind: 'fat_supplement', climate_zones: ['Universal_byproduct'], is_byproduct: true, is_fat_supplement: true,
        palatability: 3, biotype_affinity: ['Dairy', 'British'], cost_per_kg: 2.20,
        description: 'Alto omega-3 (53 %) — para perfiles saludables. Limitar a 100 g/día',
    },
    { id: 'S_MOLASSES', name: 'Melaza de Caña', category: 'Suplemento', dm_percent: 75, energy_mcal: 1.95, protein_percent: 5, fiber_percent: 0,
        sugar_pct_dm: 65, ether_extract_pct_dm: 0.3, ash_pct_dm: 10,
        calcium_pct_dm: 0.90, phosphorus_pct_dm: 0.10, magnesium_pct_dm: 0.40, potassium_pct_dm: 4.0, sodium_pct_dm: 0.2,
        palatability: 5, acidosis_risk: 'medium',
        crop_kind: 'industrial_byproduct', climate_zones: ['Universal_byproduct'], is_byproduct: true,
        biotype_affinity: ['British', 'Dairy', 'Indicus'], cost_per_kg: 0.25,
        description: 'Estimulante de palatabilidad. Vehículo de urea/minerales',
    },
    { id: 'S_BICARB', name: 'Bicarbonato Sódico', category: 'Suplemento', dm_percent: 100, energy_mcal: 0, protein_percent: 0, fiber_percent: 0,
        sodium_pct_dm: 27, ash_pct_dm: 100,
        crop_kind: 'mineral_supplement', is_byproduct: true,
        biotype_affinity: ['Dairy', 'British', 'Continental'], cost_per_kg: 0.65,
        description: 'Tampón ruminal — 100-200 g/d en dietas alto-concentrado',
    },
    { id: 'S_LIME', name: 'Carbonato Cálcico', category: 'Suplemento', dm_percent: 100, energy_mcal: 0, protein_percent: 0, fiber_percent: 0,
        calcium_pct_dm: 38, ash_pct_dm: 100,
        crop_kind: 'mineral_supplement', is_byproduct: true, cost_per_kg: 0.18,
        description: 'Aporte Ca puro. Ajustar a 0.6-0.8 % MS de la dieta',
    },
    { id: 'S_DCP', name: 'Fosfato Bicálcico', category: 'Suplemento', dm_percent: 100, energy_mcal: 0, protein_percent: 0, fiber_percent: 0,
        calcium_pct_dm: 25, phosphorus_pct_dm: 18, ash_pct_dm: 100,
        crop_kind: 'mineral_supplement', is_byproduct: true, cost_per_kg: 0.95,
        description: 'Ajuste Ca:P (target 1.5–2:1). Vital en cebo intensivo de cereales',
    },
    { id: 'S_MGO', name: 'Óxido de Magnesio', category: 'Suplemento', dm_percent: 100, energy_mcal: 0, protein_percent: 0, fiber_percent: 0,
        magnesium_pct_dm: 60, ash_pct_dm: 100,
        crop_kind: 'mineral_supplement', is_byproduct: true, cost_per_kg: 0.55,
        description: 'Prevención hipomagnesemia (tetania de hierba) en primavera',
    },
    { id: 'S01', name: 'Núcleo Mineral General', category: 'Suplemento', dm_percent: 100, energy_mcal: 0, protein_percent: 0, fiber_percent: 0,
        calcium_pct_dm: 18, phosphorus_pct_dm: 8, magnesium_pct_dm: 3, sodium_pct_dm: 8, ash_pct_dm: 100,
        crop_kind: 'mineral_supplement', cost_per_kg: 0.80, description: 'Premix mineral con oligoelementos y vitaminas',
    },
    { id: 'S02', name: 'Premezcla de Engorde', category: 'Suplemento', dm_percent: 95, energy_mcal: 0, protein_percent: 12, fiber_percent: 0,
        crop_kind: 'specialty', cost_per_kg: 0.80, description: 'Mejora FCR. Vehículo de aditivos',
    },
    { id: 'S03', name: 'Vitaminas ADE', category: 'Suplemento', dm_percent: 100, energy_mcal: 0, protein_percent: 0, fiber_percent: 0,
        crop_kind: 'specialty', cost_per_kg: 0.80, description: 'Salud inmunitaria, fertilidad',
    },
    { id: 'S04', name: 'Corrector de Acidosis', category: 'Suplemento', dm_percent: 100, energy_mcal: 0, protein_percent: 0, fiber_percent: 0,
        crop_kind: 'specialty', cost_per_kg: 0.80, description: 'Tampones + levaduras vivas. Estabilidad ruminal',
    },
    { id: 'S_SALT', name: 'Sal Mineral (NaCl)', category: 'Suplemento', dm_percent: 100, energy_mcal: 0, protein_percent: 0, fiber_percent: 0,
        sodium_pct_dm: 39, crop_kind: 'mineral_supplement', cost_per_kg: 0.10,
        description: 'A discreción — 50-100 g/d. Vehículo de oligoelementos',
    },

    // ───────────────────────────────────────────────────────────────────────
    // ECOLÓGICOS — sustitutos certificados
    // ───────────────────────────────────────────────────────────────────────
    { id: 'pienso_eco', name: 'Pienso Ecológico Certificado', category: 'Ecológico', dm_percent: 90, energy_mcal: 1.90, protein_percent: 14, fiber_percent: 14,
        ndf_pct_dm: 18, starch_pct_dm: 45, ether_extract_pct_dm: 4, oleic_pct_dm: 0.80,
        calcium_pct_dm: 0.80, phosphorus_pct_dm: 0.45, rup_pct_cp: 30,
        crop_kind: 'specialty', is_ecological: true, climate_zones: ['Universal_byproduct'],
        biotype_affinity: ['Rustic_European'], cost_per_kg: 0.58,
        description: 'Concentrado balanceado con materias primas ecológicas',
    },
    { id: 'guisante_eco', name: 'Guisante Ecológico', category: 'Ecológico', dm_percent: 90, energy_mcal: 1.80, protein_percent: 22, fiber_percent: 6,
        starch_pct_dm: 48, ether_extract_pct_dm: 1.5, oleic_pct_dm: 0.30,
        rup_pct_cp: 22, calcium_pct_dm: 0.10, phosphorus_pct_dm: 0.45,
        crop_kind: 'legume_annual', is_ecological: true, climate_zones: ['Mediterranean_humid', 'Continental'],
        soil_drainage_pref: ['Medio'], soil_ph_min: 6.0, soil_ph_max: 7.8, min_annual_precip_mm: 400,
        biotype_affinity: ['Rustic_European'], is_local_spain: true, cost_per_kg: 0.45,
        description: 'Leguminosa eco — sustituye a soja convencional',
    },
];
