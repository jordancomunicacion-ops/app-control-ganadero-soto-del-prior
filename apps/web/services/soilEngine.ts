// =============================================================================
// SOIL ENGINE
// =============================================================================
//
// Modelado científico del suelo y su capacidad para ganadería extensiva.
//
// Convenciones y fuentes:
//   - Clasificación principal: FAO World Reference Base for Soil Resources
//     (WRB 2022, IUSS Working Group). Cada entrada lleva su grupo de
//     referencia + calificador y, donde aplica, su equivalente USDA Soil
//     Taxonomy.
//   - Textura: 12 clases del triángulo USDA (Sand, Loamy Sand, Sandy Loam,
//     Loam, Silt Loam, Silt, Sandy Clay Loam, Clay Loam, Silty Clay Loam,
//     Sandy Clay, Silty Clay, Clay).
//   - Parámetros hidráulicos por textura: Carsel & Parrish 1988 / VIC model
//     soil-texture tables (bulk density, porosity, FC, WP, Ksat).
//   - Capacidad de carga (LU/ha): Pulido et al. 2014 (dehesa Extremadura,
//     0.1–0.9 cows/ha; media 0.37 LU/ha; producción 1140–3436 kg MS/ha).
//   - Erosión K (USLE): Wischmeier & Smith 1978.
//   - Land Capability Class: USDA NRCS soil survey manual (I–VIII).
//   - Mediterranean soil dominance: JRC ESDB / European Soil Atlas — Calcisols,
//     Cambisols, Fluvisols, Kastanozems, Leptosols, Luvisols, Regosols,
//     Vertisols dominan tierra cultivable mediterránea.

// ──────────────────────────────────────────────────────────────────────────
// CLASIFICACIONES Y CATEGORÍAS
// ──────────────────────────────────────────────────────────────────────────

export type USDATextureClass =
    | 'Sand' | 'Loamy Sand' | 'Sandy Loam' | 'Loam' | 'Silt Loam' | 'Silt'
    | 'Sandy Clay Loam' | 'Clay Loam' | 'Silty Clay Loam'
    | 'Sandy Clay' | 'Silty Clay' | 'Clay';

export type WRBReferenceGroup =
    | 'Cambisol' | 'Luvisol' | 'Calcisol' | 'Vertisol'
    | 'Regosol' | 'Leptosol' | 'Fluvisol' | 'Gleysol'
    | 'Histosol' | 'Phaeozem' | 'Kastanozem' | 'Solonchak'
    | 'Andosol' | 'Acrisol' | 'Arenosol' | 'Planosol' | 'Podzol';

export type USDASoilOrder =
    | 'Entisols' | 'Inceptisols' | 'Mollisols' | 'Alfisols' | 'Ultisols'
    | 'Vertisols' | 'Aridisols' | 'Andisols' | 'Histosols' | 'Spodosols' | 'Oxisols';

/**
 * Grupo hidrológico NRCS (USDA). Determina escorrentía:
 *   A = baja escorrentía (suelos arenosos)
 *   B = moderadamente baja
 *   C = moderadamente alta
 *   D = alta escorrentía (arcillas, capa impermeable)
 */
export type HydrologicSoilGroup = 'A' | 'B' | 'C' | 'D';

/**
 * USDA Land Capability Class (I–VIII).
 *   I-IV  = aptas para cultivo (mejorando limitaciones)
 *   V-VIII = no aptas para cultivo, sí para pastoreo / forestal / vida silvestre
 */
export type LandCapabilityClass = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII' | 'VIII';

// Shared with feedDatabase. Imported instead of re-declared to avoid
// duplicate symbols when both modules are imported together.
import type { ClimateZone } from './feedDatabase';
export type { ClimateZone };

// ──────────────────────────────────────────────────────────────────────────
// SCHEMA
// ──────────────────────────────────────────────────────────────────────────

export interface SoilType {
    // ── Identificación ────────────────────────────────────────────────────
    id: string;
    name: string;                          // Nombre comercial / didáctico
    wrb_group?: WRBReferenceGroup;         // FAO WRB grupo de referencia
    wrb_qualifier?: string;                // Cálcico / Crómico / Vértico ...
    usda_order?: USDASoilOrder;            // Equivalente USDA Soil Taxonomy
    description?: string;

    // ── Textura (USDA triangle) ───────────────────────────────────────────
    texture: string;                       // Etiqueta legible
    texture_class?: USDATextureClass;      // Clase USDA exacta
    sand_pct?: number;                     // % arena (0.05-2 mm)
    silt_pct?: number;                     // % limo (0.002-0.05 mm)
    clay_pct?: number;                     // % arcilla (<0.002 mm)
    coarse_fragments_pct?: number;         // % gravas/pedregosidad >2 mm

    // ── Hidráulica del perfil (Carsel & Parrish 1988) ─────────────────────
    bulk_density_g_cm3?: number;           // densidad aparente (1.0-1.7)
    porosity?: number;                     // porosidad total (0-1)
    field_capacity?: number;               // CC volumétrica (0-1)
    wilting_point?: number;                // PMP volumétrico (0-1)
    awc_mm_per_m?: number;                 // agua disponible mm/m
    ksat_mm_h?: number;                    // conductividad hidráulica saturada
    effective_depth_cm?: number;           // profundidad útil para raíces

    // ── Química ───────────────────────────────────────────────────────────
    ph_typical: number;
    ph_min?: number;
    ph_max?: number;
    organic_matter_pct?: number;           // MO en horizonte A
    cec_cmol_kg?: number;                  // Capacidad de Intercambio Catiónico
    base_saturation_pct?: number;          // % saturación de bases
    free_lime_pct?: number;                // CaCO3 libre (relevante en Calcisoles)
    salinity_ec_ds_m?: number;             // CE extracto saturado (S si >4)
    esp_pct?: number;                      // % sodio intercambiable (sódico si >15)

    // ── Riesgos físicos y degradación ─────────────────────────────────────
    water_retention: 'Baja' | 'Media' | 'Alta' | 'Media-Baja' | 'Media-Alta';
    drainage: 'Lento' | 'Medio' | 'Rápido' | 'Medio-Lento' | 'Medio-Rápido';
    hydrologic_group?: HydrologicSoilGroup; // NRCS A/B/C/D
    erodibility_k?: number;                // factor K USLE (0.02-0.69)
    compaction_sensitivity?: 'baja' | 'media' | 'alta';
    acidification_rate?: 'baja' | 'media' | 'alta'; // tasa de pérdida bases anual
    expansive?: boolean;                   // arcillas smectíticas — Vertisoles
    skeletal?: boolean;                    // pedregoso, <50 cm útiles

    risks: string[];                       // Lista cualitativa para UI

    // ── Aptitud y uso ─────────────────────────────────────────────────────
    land_capability_class?: LandCapabilityClass;
    recommended_uses: string[];
    productive_objectives: string[];
    climate_zones?: ClimateZone[];         // dónde es típico encontrarlo

    // ── Capacidad de carga ganadera ──────────────────────────────────────
    // Carga base (LU/ha) bajo precipitación 600 mm. Se escala por
    // SoilEngine.estimateCarryingCapacity con la lluvia real y el % cobertura
    // arbórea.
    baseline_carrying_capacity_lu_ha?: number;
    // Riesgo de daño por pezuña en condiciones de humedad alta.
    hoof_damage_risk?: 'bajo' | 'medio' | 'alto';
    // Habitabilidad para parásitos gastrointestinales (humedad + materia).
    parasite_habitat_index?: number;       // 0-1
    // Deficiencias minerales típicas en pastos sobre este suelo.
    typical_mineral_deficiencies?: ('Cu' | 'Co' | 'Se' | 'Zn' | 'I' | 'Mg' | 'P' | 'Mn' | 'Fe' | 'N')[];

    // ── Servicios ecosistémicos ───────────────────────────────────────────
    carbon_sequestration_t_ha_y?: number;  // potencial de captura t CO2-eq/ha·año

    // ── Índices legacy (compatibles con cálculos existentes) ─────────────
    indices: {
        retention: number;                 // 0-1
        drainage: number;                  // 0-1
        fertility: number;                 // 0-1
        risk_waterlogging: number;         // 0-1
        risk_drought: number;              // 0-1
        risk_erosion: number;              // 0-1
    };
}

// ──────────────────────────────────────────────────────────────────────────
// USDA TEXTURE HYDRAULIC TABLE (Carsel & Parrish 1988 / VIC)
// Usado por classifyTexture() y como referencia para nuevas entradas.
// ──────────────────────────────────────────────────────────────────────────
export const USDA_TEXTURE_HYDRAULICS: Record<USDATextureClass, {
    bulk_density: number; porosity: number; field_capacity: number;
    wilting_point: number; ksat_cm_h: number; brooks_corey_n: number;
    sand_pct: number; silt_pct: number; clay_pct: number;
}> = {
    'Sand':            { bulk_density: 1.49, porosity: 0.43, field_capacity: 0.08, wilting_point: 0.03, ksat_cm_h: 38.41, brooks_corey_n: 12.30, sand_pct: 92, silt_pct: 5,  clay_pct: 3 },
    'Loamy Sand':      { bulk_density: 1.52, porosity: 0.42, field_capacity: 0.15, wilting_point: 0.06, ksat_cm_h: 10.87, brooks_corey_n: 11.98, sand_pct: 82, silt_pct: 12, clay_pct: 6 },
    'Sandy Loam':      { bulk_density: 1.57, porosity: 0.40, field_capacity: 0.21, wilting_point: 0.09, ksat_cm_h:  5.24, brooks_corey_n: 12.68, sand_pct: 65, silt_pct: 25, clay_pct: 10 },
    'Loam':            { bulk_density: 1.49, porosity: 0.43, field_capacity: 0.29, wilting_point: 0.14, ksat_cm_h:  1.97, brooks_corey_n: 13.60, sand_pct: 40, silt_pct: 40, clay_pct: 20 },
    'Silt Loam':       { bulk_density: 1.42, porosity: 0.46, field_capacity: 0.32, wilting_point: 0.12, ksat_cm_h:  3.96, brooks_corey_n: 10.58, sand_pct: 20, silt_pct: 65, clay_pct: 15 },
    'Silt':            { bulk_density: 1.28, porosity: 0.52, field_capacity: 0.28, wilting_point: 0.08, ksat_cm_h:  8.59, brooks_corey_n:  9.10, sand_pct:  6, silt_pct: 88, clay_pct: 6 },
    'Sandy Clay Loam': { bulk_density: 1.60, porosity: 0.39, field_capacity: 0.27, wilting_point: 0.17, ksat_cm_h:  2.40, brooks_corey_n: 18.32, sand_pct: 60, silt_pct: 13, clay_pct: 27 },
    'Clay Loam':       { bulk_density: 1.43, porosity: 0.46, field_capacity: 0.34, wilting_point: 0.21, ksat_cm_h:  1.77, brooks_corey_n: 17.04, sand_pct: 32, silt_pct: 34, clay_pct: 34 },
    'Silty Clay Loam': { bulk_density: 1.38, porosity: 0.48, field_capacity: 0.36, wilting_point: 0.21, ksat_cm_h:  4.57, brooks_corey_n: 16.96, sand_pct: 10, silt_pct: 56, clay_pct: 34 },
    'Sandy Clay':      { bulk_density: 1.57, porosity: 0.41, field_capacity: 0.31, wilting_point: 0.23, ksat_cm_h:  1.19, brooks_corey_n: 27.00, sand_pct: 52, silt_pct:  6, clay_pct: 42 },
    'Silty Clay':      { bulk_density: 1.35, porosity: 0.49, field_capacity: 0.37, wilting_point: 0.25, ksat_cm_h:  2.95, brooks_corey_n: 20.52, sand_pct:  6, silt_pct: 47, clay_pct: 47 },
    'Clay':            { bulk_density: 1.39, porosity: 0.47, field_capacity: 0.36, wilting_point: 0.27, ksat_cm_h:  3.18, brooks_corey_n: 16.56, sand_pct: 22, silt_pct: 20, clay_pct: 58 },
};

// ──────────────────────────────────────────────────────────────────────────
// SOIL DATABASE — entradas científicas WRB + 5 legacy (1-5) preservadas
// ──────────────────────────────────────────────────────────────────────────
//
// Los IDs '1'..'5' se mantienen para compatibilidad con farms ya creadas.
// Los nuevos suelos usan IDs descriptivos basados en el código WRB.
//
// AWC (mm/m) calculado como (FC - WP) × 1000.
// Hydrologic Group asignado por NRCS table (Sand→A, Loam→B, Clay Loam→C, Clay→D).

export const SOIL_DATABASE: SoilType[] = [
    // ── LEGACY 5 ─────────────────────────────────────────────────────────
    {
        id: '1', name: 'Arcilloso (Vertisol)', wrb_group: 'Vertisol', wrb_qualifier: 'Pélico', usda_order: 'Vertisols',
        texture: 'Arcillosa', texture_class: 'Clay', sand_pct: 22, silt_pct: 20, clay_pct: 58,
        bulk_density_g_cm3: 1.39, porosity: 0.47, field_capacity: 0.36, wilting_point: 0.27,
        awc_mm_per_m: 90, ksat_mm_h: 31.8, effective_depth_cm: 80,
        ph_typical: 7.5, ph_min: 6.5, ph_max: 8.4, organic_matter_pct: 1.5, cec_cmol_kg: 45, base_saturation_pct: 90,
        free_lime_pct: 8, salinity_ec_ds_m: 0.6,
        water_retention: 'Alta', drainage: 'Lento', hydrologic_group: 'D',
        erodibility_k: 0.28, compaction_sensitivity: 'alta', acidification_rate: 'baja', expansive: true,
        risks: ['Encharcamiento', 'Agrietamiento en sequía', 'Compactación pezuña', 'Daño cultivo radicular'],
        land_capability_class: 'III',
        recommended_uses: ['Pradera permanente', 'Pastoreo controlado en seco'],
        productive_objectives: ['Cría extensiva', 'Doble propósito'],
        climate_zones: ['Mediterranean_dry', 'Mediterranean_humid', 'Continental'],
        baseline_carrying_capacity_lu_ha: 0.45,
        hoof_damage_risk: 'alto', parasite_habitat_index: 0.7,
        typical_mineral_deficiencies: ['Cu', 'Zn'],
        carbon_sequestration_t_ha_y: 1.2,
        indices: { retention: 0.90, drainage: 0.20, fertility: 0.80, risk_waterlogging: 0.90, risk_drought: 0.20, risk_erosion: 0.40 },
        description: 'Vertisol pélico — arcillas expansivas. Andalucía SW. Fértil pero engorda mucho mojado',
    },
    {
        id: '2', name: 'Arenoso (Arenosol)', wrb_group: 'Arenosol', wrb_qualifier: 'Háplico', usda_order: 'Entisols',
        texture: 'Arenosa', texture_class: 'Sand', sand_pct: 92, silt_pct: 5, clay_pct: 3,
        bulk_density_g_cm3: 1.49, porosity: 0.43, field_capacity: 0.08, wilting_point: 0.03,
        awc_mm_per_m: 50, ksat_mm_h: 384.1, effective_depth_cm: 100,
        ph_typical: 5.5, ph_min: 4.8, ph_max: 6.8, organic_matter_pct: 0.8, cec_cmol_kg: 5, base_saturation_pct: 50,
        water_retention: 'Baja', drainage: 'Rápido', hydrologic_group: 'A',
        erodibility_k: 0.15, compaction_sensitivity: 'baja', acidification_rate: 'alta',
        risks: ['Sequía', 'Lixiviación de nutrientes', 'Erosión eólica', 'Pobreza nutricional'],
        land_capability_class: 'IV',
        recommended_uses: ['Cultivos de invierno', 'Pastoreo invernal', 'Plantaciones leñosas'],
        productive_objectives: ['Recría', 'Cebo ligero'],
        climate_zones: ['Mediterranean_dry', 'Atlantic'],
        baseline_carrying_capacity_lu_ha: 0.20,
        hoof_damage_risk: 'bajo', parasite_habitat_index: 0.2,
        typical_mineral_deficiencies: ['Cu', 'Co', 'Zn', 'P'],
        carbon_sequestration_t_ha_y: 0.4,
        indices: { retention: 0.30, drainage: 0.90, fertility: 0.40, risk_waterlogging: 0.10, risk_drought: 0.90, risk_erosion: 0.70 },
        description: 'Arenosol — drenaje rápido, fertilidad pobre. Riego deficitario o tolerar baja carga',
    },
    {
        id: '3', name: 'Franco (Cambisol Eútrico)', wrb_group: 'Cambisol', wrb_qualifier: 'Eútrico', usda_order: 'Inceptisols',
        texture: 'Franca', texture_class: 'Loam', sand_pct: 40, silt_pct: 40, clay_pct: 20,
        bulk_density_g_cm3: 1.49, porosity: 0.43, field_capacity: 0.29, wilting_point: 0.14,
        awc_mm_per_m: 150, ksat_mm_h: 19.7, effective_depth_cm: 90,
        ph_typical: 6.5, ph_min: 6.0, ph_max: 7.5, organic_matter_pct: 2.5, cec_cmol_kg: 18, base_saturation_pct: 75,
        water_retention: 'Media', drainage: 'Medio', hydrologic_group: 'B',
        erodibility_k: 0.30, compaction_sensitivity: 'media', acidification_rate: 'media',
        risks: ['Ninguno grave'],
        land_capability_class: 'II',
        recommended_uses: ['Policultivo', 'Maíz forrajero', 'Alfalfa', 'Pradera intensiva'],
        productive_objectives: ['Engorde intensivo', 'Alto rendimiento', 'Lechería'],
        climate_zones: ['Mediterranean_humid', 'Atlantic', 'Continental'],
        baseline_carrying_capacity_lu_ha: 1.20,
        hoof_damage_risk: 'medio', parasite_habitat_index: 0.4,
        typical_mineral_deficiencies: [],
        carbon_sequestration_t_ha_y: 1.0,
        indices: { retention: 0.60, drainage: 0.60, fertility: 0.85, risk_waterlogging: 0.30, risk_drought: 0.30, risk_erosion: 0.30 },
        description: 'Cambisol eútrico — el suelo "ideal" balanceado. Salamanca, La Rioja, Castilla y León',
    },
    {
        id: '4', name: 'Franco-Arcilloso (Luvisol)', wrb_group: 'Luvisol', wrb_qualifier: 'Crómico', usda_order: 'Alfisols',
        texture: 'Franco-Arcillosa', texture_class: 'Clay Loam', sand_pct: 32, silt_pct: 34, clay_pct: 34,
        bulk_density_g_cm3: 1.43, porosity: 0.46, field_capacity: 0.34, wilting_point: 0.21,
        awc_mm_per_m: 130, ksat_mm_h: 17.7, effective_depth_cm: 100,
        ph_typical: 6.8, ph_min: 6.0, ph_max: 7.8, organic_matter_pct: 2.0, cec_cmol_kg: 25, base_saturation_pct: 80,
        water_retention: 'Alta', drainage: 'Medio-Lento', hydrologic_group: 'C',
        erodibility_k: 0.32, compaction_sensitivity: 'alta', acidification_rate: 'media',
        risks: ['Compactación', 'Pseudogley en horizonte argílico'],
        land_capability_class: 'II',
        recommended_uses: ['Praderas de alto rendimiento', 'Cereales', 'Olivar'],
        productive_objectives: ['Leche', 'Cría intensiva'],
        climate_zones: ['Mediterranean_humid', 'Continental'],
        baseline_carrying_capacity_lu_ha: 0.90,
        hoof_damage_risk: 'medio', parasite_habitat_index: 0.5,
        typical_mineral_deficiencies: ['Mn'],
        carbon_sequestration_t_ha_y: 1.1,
        indices: { retention: 0.75, drainage: 0.45, fertility: 0.90, risk_waterlogging: 0.50, risk_drought: 0.20, risk_erosion: 0.40 },
        description: 'Luvisol crómico — horizonte argílico con acumulación de arcilla. Cuenca del Tajo',
    },
    {
        id: '5', name: 'Franco-Arenoso (Cambisol)', wrb_group: 'Cambisol', wrb_qualifier: 'Dístrico', usda_order: 'Inceptisols',
        texture: 'Franco-Arenosa', texture_class: 'Sandy Loam', sand_pct: 65, silt_pct: 25, clay_pct: 10,
        bulk_density_g_cm3: 1.57, porosity: 0.40, field_capacity: 0.21, wilting_point: 0.09,
        awc_mm_per_m: 120, ksat_mm_h: 52.4, effective_depth_cm: 80,
        ph_typical: 6.2, ph_min: 5.5, ph_max: 7.0, organic_matter_pct: 1.8, cec_cmol_kg: 10, base_saturation_pct: 60,
        water_retention: 'Media-Baja', drainage: 'Rápido', hydrologic_group: 'A',
        erodibility_k: 0.20, compaction_sensitivity: 'baja', acidification_rate: 'alta',
        risks: ['Erosión', 'Lavado nutrientes'],
        land_capability_class: 'III',
        recommended_uses: ['Hortícolas', 'Leguminosas anuales', 'Pradera de rotación'],
        productive_objectives: ['Rotación rápida', 'Pastoreo estacional'],
        climate_zones: ['Mediterranean_dry', 'Mediterranean_humid', 'Continental'],
        baseline_carrying_capacity_lu_ha: 0.50,
        hoof_damage_risk: 'bajo', parasite_habitat_index: 0.3,
        typical_mineral_deficiencies: ['Cu', 'Co'],
        carbon_sequestration_t_ha_y: 0.6,
        indices: { retention: 0.45, drainage: 0.80, fertility: 0.60, risk_waterlogging: 0.20, risk_drought: 0.70, risk_erosion: 0.50 },
        description: 'Cambisol dístrico (franco-arenoso). Drenaje rápido, baja CIC. Típico dehesa salmantina',
    },

    // ── NUEVOS WRB ────────────────────────────────────────────────────────
    {
        id: 'CAMBISOL_CALCIC', name: 'Cambisol Cálcico (dehesa típica)', wrb_group: 'Cambisol', wrb_qualifier: 'Cálcico', usda_order: 'Inceptisols',
        texture: 'Franco-Arenosa con calizas', texture_class: 'Sandy Loam', sand_pct: 60, silt_pct: 28, clay_pct: 12,
        coarse_fragments_pct: 15, bulk_density_g_cm3: 1.55, porosity: 0.41, field_capacity: 0.22, wilting_point: 0.10,
        awc_mm_per_m: 110, ksat_mm_h: 40, effective_depth_cm: 60,
        ph_typical: 7.8, ph_min: 7.2, ph_max: 8.3, organic_matter_pct: 2.0, cec_cmol_kg: 14, base_saturation_pct: 95,
        free_lime_pct: 12, salinity_ec_ds_m: 0.4,
        water_retention: 'Media-Baja', drainage: 'Medio-Rápido', hydrologic_group: 'B',
        erodibility_k: 0.22, compaction_sensitivity: 'baja', acidification_rate: 'baja',
        risks: ['Sequía estival', 'Bloqueo P por pH alcalino', 'Deficiencia Fe-Zn'],
        land_capability_class: 'IV',
        recommended_uses: ['Dehesa pastoreo', 'Cereal extensivo', 'Olivar', 'Almendro'],
        productive_objectives: ['Cría extensiva', 'Acabado montanera'],
        climate_zones: ['Mediterranean_dry', 'Mediterranean_humid'],
        baseline_carrying_capacity_lu_ha: 0.40,
        hoof_damage_risk: 'bajo', parasite_habitat_index: 0.3,
        typical_mineral_deficiencies: ['Cu', 'Zn', 'Mn', 'P'],
        carbon_sequestration_t_ha_y: 0.7,
        indices: { retention: 0.45, drainage: 0.70, fertility: 0.60, risk_waterlogging: 0.15, risk_drought: 0.75, risk_erosion: 0.40 },
        description: 'Dehesa cacereña/extremeña — horizonte cálcico secundario. Soto del Prior',
    },
    {
        id: 'CAMBISOL_DYSTRIC', name: 'Cambisol Dístrico (ácido)', wrb_group: 'Cambisol', wrb_qualifier: 'Dístrico', usda_order: 'Inceptisols',
        texture: 'Franca', texture_class: 'Loam', sand_pct: 42, silt_pct: 40, clay_pct: 18,
        bulk_density_g_cm3: 1.50, porosity: 0.43, field_capacity: 0.28, wilting_point: 0.14,
        awc_mm_per_m: 140, ksat_mm_h: 22, effective_depth_cm: 80,
        ph_typical: 5.5, ph_min: 4.8, ph_max: 6.2, organic_matter_pct: 3.5, cec_cmol_kg: 13, base_saturation_pct: 45,
        water_retention: 'Media', drainage: 'Medio', hydrologic_group: 'B',
        erodibility_k: 0.28, compaction_sensitivity: 'media', acidification_rate: 'alta',
        risks: ['Acidez', 'Toxicidad Al³⁺', 'Lavado Ca-Mg'],
        land_capability_class: 'III',
        recommended_uses: ['Pradera atlántica', 'Centeno', 'Patata', 'Forestal'],
        productive_objectives: ['Pastoreo intensivo', 'Lechería extensiva'],
        climate_zones: ['Atlantic', 'Mountain'],
        baseline_carrying_capacity_lu_ha: 1.10,
        hoof_damage_risk: 'medio', parasite_habitat_index: 0.6,
        typical_mineral_deficiencies: ['Mg', 'P'],
        carbon_sequestration_t_ha_y: 1.4,
        indices: { retention: 0.60, drainage: 0.55, fertility: 0.65, risk_waterlogging: 0.40, risk_drought: 0.30, risk_erosion: 0.35 },
        description: 'Cambisol dístrico — bases lavadas. Galicia, Asturias, prepirineo. Necesita encalado',
    },
    {
        id: 'CAMBISOL_HUMIC', name: 'Cambisol Húmico (alto pasto)', wrb_group: 'Cambisol', wrb_qualifier: 'Húmico', usda_order: 'Inceptisols',
        texture: 'Franca', texture_class: 'Loam', sand_pct: 38, silt_pct: 42, clay_pct: 20,
        bulk_density_g_cm3: 1.40, porosity: 0.47, field_capacity: 0.32, wilting_point: 0.15,
        awc_mm_per_m: 170, ksat_mm_h: 18, effective_depth_cm: 70,
        ph_typical: 6.0, ph_min: 5.5, ph_max: 6.8, organic_matter_pct: 6.5, cec_cmol_kg: 24, base_saturation_pct: 60,
        water_retention: 'Alta', drainage: 'Medio', hydrologic_group: 'B',
        erodibility_k: 0.26, compaction_sensitivity: 'media', acidification_rate: 'media',
        risks: ['Encharcamiento puntual'],
        land_capability_class: 'III',
        recommended_uses: ['Pastoreo permanente alto', 'Trashumancia'],
        productive_objectives: ['Cría extensiva de calidad'],
        climate_zones: ['Mountain', 'Atlantic'],
        baseline_carrying_capacity_lu_ha: 0.75,
        hoof_damage_risk: 'medio', parasite_habitat_index: 0.5,
        typical_mineral_deficiencies: ['Se', 'I'],
        carbon_sequestration_t_ha_y: 2.0,
        indices: { retention: 0.75, drainage: 0.55, fertility: 0.75, risk_waterlogging: 0.40, risk_drought: 0.20, risk_erosion: 0.25 },
        description: 'Cambisol húmico — pastizal de montaña/cabecera. Alto MO, baja erosión',
    },
    {
        id: 'LUVISOL_CALCIC', name: 'Luvisol Cálcico (terra rossa)', wrb_group: 'Luvisol', wrb_qualifier: 'Cálcico', usda_order: 'Alfisols',
        texture: 'Franco-Arcillosa rojiza', texture_class: 'Clay Loam', sand_pct: 30, silt_pct: 36, clay_pct: 34,
        bulk_density_g_cm3: 1.45, porosity: 0.45, field_capacity: 0.33, wilting_point: 0.20,
        awc_mm_per_m: 130, ksat_mm_h: 15, effective_depth_cm: 110,
        ph_typical: 7.4, ph_min: 7.0, ph_max: 8.0, organic_matter_pct: 1.8, cec_cmol_kg: 28, base_saturation_pct: 95,
        free_lime_pct: 4,
        water_retention: 'Alta', drainage: 'Medio-Lento', hydrologic_group: 'C',
        erodibility_k: 0.30, compaction_sensitivity: 'alta', acidification_rate: 'baja',
        risks: ['Compactación', 'Costra superficial'],
        land_capability_class: 'II',
        recommended_uses: ['Viñedo', 'Olivar', 'Cereal de secano', 'Pradera'],
        productive_objectives: ['Cría extensiva', 'Vinificación'],
        climate_zones: ['Mediterranean_dry', 'Mediterranean_humid'],
        baseline_carrying_capacity_lu_ha: 0.70,
        hoof_damage_risk: 'medio', parasite_habitat_index: 0.4,
        typical_mineral_deficiencies: ['Mn', 'Fe'],
        carbon_sequestration_t_ha_y: 0.9,
        indices: { retention: 0.75, drainage: 0.45, fertility: 0.85, risk_waterlogging: 0.40, risk_drought: 0.25, risk_erosion: 0.45 },
        description: '"Terra rossa" mediterránea. Madrid, Toledo, La Mancha — productiva pero costrosa',
    },
    {
        id: 'CALCISOL_HAPLIC', name: 'Calcisol Háplico', wrb_group: 'Calcisol', wrb_qualifier: 'Háplico', usda_order: 'Aridisols',
        texture: 'Franco-Arcillosa con caliza nodular', texture_class: 'Clay Loam', sand_pct: 28, silt_pct: 32, clay_pct: 40,
        coarse_fragments_pct: 25, bulk_density_g_cm3: 1.50, porosity: 0.43, field_capacity: 0.31, wilting_point: 0.20,
        awc_mm_per_m: 110, ksat_mm_h: 12, effective_depth_cm: 50,
        ph_typical: 8.2, ph_min: 7.8, ph_max: 8.6, organic_matter_pct: 1.2, cec_cmol_kg: 18, base_saturation_pct: 100,
        free_lime_pct: 25, salinity_ec_ds_m: 0.8,
        water_retention: 'Media', drainage: 'Medio-Lento', hydrologic_group: 'C',
        erodibility_k: 0.25, compaction_sensitivity: 'media', acidification_rate: 'baja',
        risks: ['Sequía severa', 'Bloqueo P', 'Costra calcárea (caliche)', 'Deficiencia Fe/Zn'],
        land_capability_class: 'V',
        recommended_uses: ['Cereal extensivo', 'Pastoreo extensivo', 'Almendro', 'Cardicultivos'],
        productive_objectives: ['Cría extensiva'],
        climate_zones: ['Mediterranean_dry'],
        baseline_carrying_capacity_lu_ha: 0.25,
        hoof_damage_risk: 'bajo', parasite_habitat_index: 0.2,
        typical_mineral_deficiencies: ['Cu', 'Zn', 'Fe', 'Mn', 'P'],
        carbon_sequestration_t_ha_y: 0.4,
        indices: { retention: 0.50, drainage: 0.45, fertility: 0.40, risk_waterlogging: 0.20, risk_drought: 0.80, risk_erosion: 0.45 },
        description: 'Aragón, Levante interior, Andalucía oriental. Caliche puede limitar profundidad útil',
    },
    {
        id: 'VERTISOL_CHROMIC', name: 'Vertisol Crómico (tierras negras)', wrb_group: 'Vertisol', wrb_qualifier: 'Crómico', usda_order: 'Vertisols',
        texture: 'Arcillosa esmectítica', texture_class: 'Clay', sand_pct: 20, silt_pct: 25, clay_pct: 55,
        bulk_density_g_cm3: 1.40, porosity: 0.47, field_capacity: 0.40, wilting_point: 0.28,
        awc_mm_per_m: 120, ksat_mm_h: 2, effective_depth_cm: 120,
        ph_typical: 7.8, ph_min: 7.2, ph_max: 8.5, organic_matter_pct: 2.2, cec_cmol_kg: 52, base_saturation_pct: 95,
        free_lime_pct: 6, salinity_ec_ds_m: 1.0,
        water_retention: 'Alta', drainage: 'Lento', hydrologic_group: 'D',
        erodibility_k: 0.20, compaction_sensitivity: 'alta', acidification_rate: 'baja', expansive: true,
        risks: ['Agrietamiento severo verano', 'Encharcamiento invernal', 'Imposible labor en húmedo', 'Lesión pezuña'],
        land_capability_class: 'IV',
        recommended_uses: ['Cereal de invierno', 'Algodón', 'Girasol', 'Pradera permanente seca'],
        productive_objectives: ['Cría extensiva de calidad'],
        climate_zones: ['Mediterranean_dry', 'Mediterranean_humid'],
        baseline_carrying_capacity_lu_ha: 0.55,
        hoof_damage_risk: 'alto', parasite_habitat_index: 0.6,
        typical_mineral_deficiencies: ['P', 'Zn'],
        carbon_sequestration_t_ha_y: 1.3,
        indices: { retention: 0.95, drainage: 0.15, fertility: 0.85, risk_waterlogging: 0.85, risk_drought: 0.30, risk_erosion: 0.30 },
        description: 'Vertisol Andalucía SW / Vega del Guadalquivir — alta fertilidad química, alta dificultad operativa',
    },
    {
        id: 'FLUVISOL', name: 'Fluvisol (vega aluvial)', wrb_group: 'Fluvisol', wrb_qualifier: 'Eútrico', usda_order: 'Entisols',
        texture: 'Franca estratificada', texture_class: 'Loam', sand_pct: 35, silt_pct: 45, clay_pct: 20,
        bulk_density_g_cm3: 1.45, porosity: 0.45, field_capacity: 0.30, wilting_point: 0.13,
        awc_mm_per_m: 170, ksat_mm_h: 25, effective_depth_cm: 120,
        ph_typical: 7.0, ph_min: 6.5, ph_max: 7.8, organic_matter_pct: 2.8, cec_cmol_kg: 22, base_saturation_pct: 85,
        water_retention: 'Alta', drainage: 'Medio', hydrologic_group: 'B',
        erodibility_k: 0.32, compaction_sensitivity: 'media', acidification_rate: 'baja',
        risks: ['Inundación', 'Capa freática alta estacional'],
        land_capability_class: 'I',
        recommended_uses: ['Hortícola', 'Maíz', 'Praderas regadío', 'Alfalfa'],
        productive_objectives: ['Engorde intensivo', 'Lechería'],
        climate_zones: ['Mediterranean_humid', 'Atlantic', 'Continental'],
        baseline_carrying_capacity_lu_ha: 1.80,
        hoof_damage_risk: 'medio', parasite_habitat_index: 0.7,
        typical_mineral_deficiencies: [],
        carbon_sequestration_t_ha_y: 1.5,
        indices: { retention: 0.80, drainage: 0.60, fertility: 0.92, risk_waterlogging: 0.55, risk_drought: 0.15, risk_erosion: 0.30 },
        description: 'Aluvial reciente, máxima productividad agronómica. Vegas Duero, Ebro, Guadalquivir',
    },
    {
        id: 'GLEYSOL', name: 'Gleysol (suelo hidromorfo)', wrb_group: 'Gleysol', wrb_qualifier: 'Húmico', usda_order: 'Inceptisols',
        texture: 'Franco-Arcillo-Limosa', texture_class: 'Silty Clay Loam', sand_pct: 10, silt_pct: 56, clay_pct: 34,
        bulk_density_g_cm3: 1.38, porosity: 0.48, field_capacity: 0.36, wilting_point: 0.21,
        awc_mm_per_m: 150, ksat_mm_h: 45, effective_depth_cm: 50,
        ph_typical: 5.8, ph_min: 5.0, ph_max: 6.8, organic_matter_pct: 5.0, cec_cmol_kg: 22, base_saturation_pct: 55,
        water_retention: 'Alta', drainage: 'Lento', hydrologic_group: 'D',
        erodibility_k: 0.30, compaction_sensitivity: 'alta', acidification_rate: 'media',
        risks: ['Encharcamiento crónico', 'Anaerobiosis radicular', 'Pisada destructiva'],
        land_capability_class: 'V',
        recommended_uses: ['Pradera húmeda permanente', 'Junquera', 'Refugio fauna'],
        productive_objectives: ['Cría rústica'],
        climate_zones: ['Atlantic', 'Mountain'],
        baseline_carrying_capacity_lu_ha: 0.60,
        hoof_damage_risk: 'alto', parasite_habitat_index: 0.9,
        typical_mineral_deficiencies: ['Cu', 'Co', 'Se'],
        carbon_sequestration_t_ha_y: 2.5,
        indices: { retention: 0.92, drainage: 0.10, fertility: 0.70, risk_waterlogging: 0.95, risk_drought: 0.10, risk_erosion: 0.25 },
        description: 'Suelo con napa freática alta. Marismas, valles fluviales, surge gallego. Alto riesgo parasitario',
    },
    {
        id: 'LEPTOSOL', name: 'Leptosol (suelo somero)', wrb_group: 'Leptosol', wrb_qualifier: 'Réndzico', usda_order: 'Entisols',
        texture: 'Pedregosa heterogénea', texture_class: 'Sandy Loam', sand_pct: 55, silt_pct: 30, clay_pct: 15,
        coarse_fragments_pct: 60, bulk_density_g_cm3: 1.60, porosity: 0.39, field_capacity: 0.18, wilting_point: 0.10,
        awc_mm_per_m: 70, ksat_mm_h: 50, effective_depth_cm: 25,
        ph_typical: 7.5, ph_min: 6.5, ph_max: 8.2, organic_matter_pct: 2.5, cec_cmol_kg: 15, base_saturation_pct: 95,
        free_lime_pct: 5,
        water_retention: 'Baja', drainage: 'Rápido', hydrologic_group: 'C', // poca prof = baja capacidad de absorber pulso
        erodibility_k: 0.25, compaction_sensitivity: 'baja', acidification_rate: 'baja', skeletal: true,
        risks: ['Poca profundidad útil', 'Sequía severa', 'Imposible labor mecánica', 'Erosión'],
        land_capability_class: 'VII',
        recommended_uses: ['Pastoreo extensivo', 'Monte mediterráneo', 'Forestal'],
        productive_objectives: ['Cría rústica trashumante'],
        climate_zones: ['Mediterranean_dry', 'Mediterranean_humid', 'Mountain'],
        baseline_carrying_capacity_lu_ha: 0.15,
        hoof_damage_risk: 'bajo', parasite_habitat_index: 0.2,
        typical_mineral_deficiencies: ['P', 'N', 'Zn'],
        carbon_sequestration_t_ha_y: 0.3,
        indices: { retention: 0.25, drainage: 0.80, fertility: 0.35, risk_waterlogging: 0.10, risk_drought: 0.90, risk_erosion: 0.85 },
        description: 'Sierras españolas — limitado en profundidad. Solo razas rústicas con baja carga',
    },
    {
        id: 'REGOSOL_CALCARIC', name: 'Regosol Calcárico (erosionado)', wrb_group: 'Regosol', wrb_qualifier: 'Calcárico', usda_order: 'Entisols',
        texture: 'Franco-Arenosa pobre', texture_class: 'Sandy Loam', sand_pct: 62, silt_pct: 28, clay_pct: 10,
        coarse_fragments_pct: 20, bulk_density_g_cm3: 1.55, porosity: 0.41, field_capacity: 0.20, wilting_point: 0.10,
        awc_mm_per_m: 100, ksat_mm_h: 45, effective_depth_cm: 40,
        ph_typical: 8.0, ph_min: 7.5, ph_max: 8.5, organic_matter_pct: 1.0, cec_cmol_kg: 8, base_saturation_pct: 100,
        free_lime_pct: 15,
        water_retention: 'Baja', drainage: 'Rápido', hydrologic_group: 'A',
        erodibility_k: 0.18, compaction_sensitivity: 'baja', acidification_rate: 'baja',
        risks: ['Erosión hídrica severa', 'Pobreza nutricional', 'Sequía'],
        land_capability_class: 'VI',
        recommended_uses: ['Pastoreo extensivo', 'Reforestación', 'Restauración'],
        productive_objectives: ['Cría rústica'],
        climate_zones: ['Mediterranean_dry'],
        baseline_carrying_capacity_lu_ha: 0.12,
        hoof_damage_risk: 'bajo', parasite_habitat_index: 0.1,
        typical_mineral_deficiencies: ['Cu', 'Zn', 'P', 'N'],
        carbon_sequestration_t_ha_y: 0.3,
        indices: { retention: 0.30, drainage: 0.85, fertility: 0.30, risk_waterlogging: 0.10, risk_drought: 0.85, risk_erosion: 0.80 },
        description: 'Suelos degradados de Almería, Murcia, Albacete. Recuperar antes de pastorear intensivamente',
    },
    {
        id: 'PHAEOZEM', name: 'Phaeozem (tierras negras altas)', wrb_group: 'Phaeozem', wrb_qualifier: 'Háplico', usda_order: 'Mollisols',
        texture: 'Franco-Limosa', texture_class: 'Silt Loam', sand_pct: 20, silt_pct: 65, clay_pct: 15,
        bulk_density_g_cm3: 1.40, porosity: 0.46, field_capacity: 0.31, wilting_point: 0.12,
        awc_mm_per_m: 190, ksat_mm_h: 40, effective_depth_cm: 100,
        ph_typical: 6.5, ph_min: 6.0, ph_max: 7.5, organic_matter_pct: 4.5, cec_cmol_kg: 30, base_saturation_pct: 75,
        water_retention: 'Alta', drainage: 'Medio', hydrologic_group: 'B',
        erodibility_k: 0.38, compaction_sensitivity: 'media', acidification_rate: 'media',
        risks: ['Erosión hídrica si laboreo intenso'],
        land_capability_class: 'I',
        recommended_uses: ['Cereal alto rendimiento', 'Pradera intensiva', 'Maíz forrajero'],
        productive_objectives: ['Engorde intensivo', 'Lechería alta producción'],
        climate_zones: ['Continental', 'Mediterranean_humid'],
        baseline_carrying_capacity_lu_ha: 1.50,
        hoof_damage_risk: 'medio', parasite_habitat_index: 0.5,
        typical_mineral_deficiencies: [],
        carbon_sequestration_t_ha_y: 1.8,
        indices: { retention: 0.85, drainage: 0.60, fertility: 0.95, risk_waterlogging: 0.30, risk_drought: 0.20, risk_erosion: 0.50 },
        description: 'Castilla y León norte / Tierra de Campos. Máxima productividad templada. Mollisol equivalente',
    },
    {
        id: 'SOLONCHAK', name: 'Solonchak (suelo salino)', wrb_group: 'Solonchak', wrb_qualifier: 'Háplico', usda_order: 'Aridisols',
        texture: 'Franco-Arcillosa salina', texture_class: 'Clay Loam', sand_pct: 30, silt_pct: 38, clay_pct: 32,
        bulk_density_g_cm3: 1.50, porosity: 0.43, field_capacity: 0.32, wilting_point: 0.21,
        awc_mm_per_m: 110, ksat_mm_h: 8, effective_depth_cm: 80,
        ph_typical: 8.5, ph_min: 8.0, ph_max: 9.5, organic_matter_pct: 1.0, cec_cmol_kg: 15, base_saturation_pct: 100,
        free_lime_pct: 8, salinity_ec_ds_m: 12, esp_pct: 18,
        water_retention: 'Alta', drainage: 'Lento', hydrologic_group: 'D',
        erodibility_k: 0.28, compaction_sensitivity: 'alta', acidification_rate: 'baja',
        risks: ['Salinidad alta', 'Sodificación', 'Toxicidad para cultivo', 'Pasto raquítico'],
        land_capability_class: 'VII',
        recommended_uses: ['Pastoreo de halófitas', 'Vegetación natural salina'],
        productive_objectives: ['Cría rústica adaptada'],
        climate_zones: ['Mediterranean_dry'],
        baseline_carrying_capacity_lu_ha: 0.10,
        hoof_damage_risk: 'medio', parasite_habitat_index: 0.4,
        typical_mineral_deficiencies: ['Cu', 'Zn'],
        carbon_sequestration_t_ha_y: 0.2,
        indices: { retention: 0.75, drainage: 0.25, fertility: 0.20, risk_waterlogging: 0.55, risk_drought: 0.50, risk_erosion: 0.30 },
        description: 'Marismas Doñana, Mar Menor, vegas saladas Murcia/Almería. Solo halófitas tolerantes',
    },
    {
        id: 'ANDOSOL', name: 'Andosol (suelo volcánico)', wrb_group: 'Andosol', wrb_qualifier: 'Háplico', usda_order: 'Andisols',
        texture: 'Franco-Arenosa con vidrios volcánicos', texture_class: 'Sandy Loam', sand_pct: 55, silt_pct: 35, clay_pct: 10,
        bulk_density_g_cm3: 0.85, porosity: 0.65, field_capacity: 0.35, wilting_point: 0.15,
        awc_mm_per_m: 200, ksat_mm_h: 60, effective_depth_cm: 90,
        ph_typical: 6.2, ph_min: 5.5, ph_max: 7.0, organic_matter_pct: 7.0, cec_cmol_kg: 25, base_saturation_pct: 60,
        water_retention: 'Alta', drainage: 'Medio-Rápido', hydrologic_group: 'B',
        erodibility_k: 0.15, compaction_sensitivity: 'baja', acidification_rate: 'media',
        risks: ['Bloqueo P por alófano'],
        land_capability_class: 'II',
        recommended_uses: ['Pradera intensiva', 'Plátano', 'Hortícola', 'Frutal'],
        productive_objectives: ['Lechería', 'Cría'],
        climate_zones: ['Mountain', 'Tropical'],
        baseline_carrying_capacity_lu_ha: 1.40,
        hoof_damage_risk: 'bajo', parasite_habitat_index: 0.5,
        typical_mineral_deficiencies: ['P'],
        carbon_sequestration_t_ha_y: 2.8,
        indices: { retention: 0.85, drainage: 0.65, fertility: 0.85, risk_waterlogging: 0.25, risk_drought: 0.15, risk_erosion: 0.15 },
        description: 'Canarias volcánicas. Baja densidad aparente característica (alófano)',
    },
];

// ──────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────

/**
 * Clasifica una muestra en una de las 12 clases USDA dado el % de
 * arena/limo/arcilla. Algoritmo basado en el triángulo USDA simplificado.
 */
export function classifyUSDATexture(sandPct: number, siltPct: number, clayPct: number): USDATextureClass {
    // Sanity normalization
    const total = sandPct + siltPct + clayPct;
    if (total <= 0) return 'Loam';
    const s = (sandPct / total) * 100;
    const t = (siltPct / total) * 100;
    const c = (clayPct / total) * 100;

    if (c >= 40) {
        if (s >= 45) return 'Sandy Clay';
        if (t >= 40) return 'Silty Clay';
        return 'Clay';
    }
    if (c >= 27) {
        if (s >= 45) return 'Sandy Clay Loam';
        if (t >= 40) return 'Silty Clay Loam';
        return 'Clay Loam';
    }
    if (t >= 80 && c < 12) return 'Silt';
    if (t >= 50) return 'Silt Loam';
    if (s >= 85 && c < 10) return 'Sand';
    if (s >= 70 && c < 15) return 'Loamy Sand';
    if (s >= 50 && c < 20) return 'Sandy Loam';
    return 'Loam';
}

/**
 * Carga sostenible estimada (LU/ha) considerando suelo + clima.
 *
 * Modelo lineal sobre la carga base del suelo:
 *   capacity = baseline × precip_factor × tree_cover_factor
 *
 * precip_factor:
 *   precip < 300 mm  →  0.30
 *   precip 300-500   →  0.30 + (precip-300)/200 * 0.40
 *   precip 500-700   →  0.70 + (precip-500)/200 * 0.30
 *   precip ≥ 700     →  1.00
 *
 * Referencia: Pulido et al. 2014 (dehesa Extremadura): 0.1–0.9 LU/ha
 * según pluviometría y arbolado.
 */
export function estimateCarryingCapacity(
    soilId: string,
    annualPrecipMm: number,
    treeCoverPct = 30,
): { lu_per_ha: number; reasons: string[] } {
    const soil = SoilEngine.getSoilById(soilId);
    if (!soil) return { lu_per_ha: 0, reasons: ['Suelo desconocido'] };

    const baseline = soil.baseline_carrying_capacity_lu_ha ?? 0.4;

    let precipFactor: number;
    if (annualPrecipMm < 300) precipFactor = 0.30;
    else if (annualPrecipMm < 500) precipFactor = 0.30 + ((annualPrecipMm - 300) / 200) * 0.40;
    else if (annualPrecipMm < 700) precipFactor = 0.70 + ((annualPrecipMm - 500) / 200) * 0.30;
    else precipFactor = 1.00;

    // Tree cover bonus (sombra + bellota). Pulido: óptimo 20-40 %.
    const treeFactor = treeCoverPct >= 20 && treeCoverPct <= 40 ? 1.10
        : treeCoverPct >= 10 && treeCoverPct <= 60 ? 1.00
        : 0.85;

    const capacity = baseline * precipFactor * treeFactor;

    const reasons = [
        `Base ${baseline.toFixed(2)} LU/ha por suelo`,
        `× ${precipFactor.toFixed(2)} ajuste pluvial (${annualPrecipMm} mm)`,
        `× ${treeFactor.toFixed(2)} cobertura arbórea (${treeCoverPct}%)`,
    ];

    return { lu_per_ha: parseFloat(capacity.toFixed(2)), reasons };
}

/**
 * Evalúa la idoneidad del suelo para una raza/objetivo dado.
 * Devuelve un score 0-100 + riesgos específicos.
 */
export function evaluateForLivestock(
    soilId: string,
    context: {
        biological_type?: string;
        objective?: string;
        season?: 'spring' | 'summer' | 'autumn' | 'winter';
    },
): { score: number; risks: string[]; advantages: string[] } {
    const soil = SoilEngine.getSoilById(soilId);
    if (!soil) return { score: 0, risks: ['Suelo desconocido'], advantages: [] };

    let score = 50;
    const risks: string[] = [];
    const advantages: string[] = [];

    // Hoof damage por humedad/expansividad
    if (soil.hoof_damage_risk === 'alto') {
        score -= 10;
        risks.push('alto riesgo de daño en pezuña — rotar parcelas en lluvia');
    } else if (soil.hoof_damage_risk === 'bajo') {
        score += 5;
        advantages.push('bajo riesgo de daño en pezuña');
    }

    // Parásitos
    if ((soil.parasite_habitat_index ?? 0) >= 0.7) {
        score -= 8;
        risks.push('alto índice de hábitat parasitario — calendario antihelmíntico estricto');
    }

    // Deficiencias minerales típicas → necesidad de suplementación
    if ((soil.typical_mineral_deficiencies?.length ?? 0) >= 3) {
        score -= 6;
        risks.push(`suplementar: ${soil.typical_mineral_deficiencies?.join(', ')}`);
    }

    // Capacidad de carga
    const cap = soil.baseline_carrying_capacity_lu_ha ?? 0;
    if (cap >= 1.0) {
        score += 15;
        advantages.push(`alta capacidad de carga base (${cap} LU/ha)`);
    } else if (cap < 0.3) {
        score -= 10;
        risks.push('capacidad de carga baja — solo razas rústicas con baja densidad');
    }

    // Idoneidad por raza
    const biotype = context.biological_type;
    if (biotype === 'Rustic_European' && cap < 0.5) {
        score += 8;
        advantages.push('compatible con razas rústicas adaptadas');
    } else if ((biotype === 'Continental' || biotype === 'Dairy') && cap >= 1.0) {
        score += 8;
        advantages.push('soporta razas exigentes (continental/lechera)');
    } else if ((biotype === 'Continental' || biotype === 'Dairy') && cap < 0.5) {
        score -= 10;
        risks.push('baja capacidad de carga limita razas continentales/lecheras');
    }

    // Estacionalidad: arcillas se vuelven trampa en invierno
    if (context.season === 'winter' && soil.expansive) {
        score -= 8;
        risks.push('Vertisol en invierno: agrietado/encharcado — restringir pastoreo');
    }
    if (context.season === 'summer' && (soil.indices.risk_drought ?? 0) >= 0.8) {
        score -= 8;
        risks.push('alto riesgo de sequía estival — prever suplementación forraje');
    }

    return { score: Math.max(0, Math.min(100, score)), risks, advantages };
}

// ──────────────────────────────────────────────────────────────────────────
// SOIL ENGINE — API EXPUESTA
// ──────────────────────────────────────────────────────────────────────────
export const SoilEngine = {
    getAllSoils(): SoilType[] {
        return SOIL_DATABASE;
    },

    getSoilById(id: string): SoilType | undefined {
        return SOIL_DATABASE.find(s => s.id === id);
    },

    /**
     * Find soils that match a textural sample. Useful when the user gives
     * sand/silt/clay percentages from a lab analysis.
     */
    findByTexture(sandPct: number, siltPct: number, clayPct: number): SoilType[] {
        const cls = classifyUSDATexture(sandPct, siltPct, clayPct);
        return SOIL_DATABASE.filter(s => s.texture_class === cls);
    },

    /**
     * Soils typical of a climate zone (WRB-based association).
     */
    findByClimateZone(zone: string): SoilType[] {
        return SOIL_DATABASE.filter(s => s.climate_zones?.includes(zone as ClimateZone));
    },

    classifyUSDATexture,
    estimateCarryingCapacity,
    evaluateForLivestock,
    USDA_TEXTURE_HYDRAULICS,

    /**
     * Advanced Crop Recommendation Engine (preserved + enriched).
     */
    getRecommendedCrops(soilId: string, climate?: { avgTemp: number; annualPrecip: number }, slope: number = 0): { crop: string; reason: string; type: string }[] {
        const soil = this.getSoilById(soilId);
        if (!soil) return [];

        const recs: { crop: string; reason: string; type: string }[] = [];
        const CROPS = [
            { name: 'Trigo Blando', type: 'Cereal Invierno', min_precip: 450, max_slope: 12, ph_min: 6.0, ph_max: 8.0, drainage: ['Medio', 'Rápido', 'Medio-Lento'], season: 'Otoño' },
            { name: 'Cebada', type: 'Cereal Invierno', min_precip: 350, max_slope: 12, ph_min: 6.0, ph_max: 8.5, drainage: ['Medio', 'Rápido', 'Medio-Rápido'], season: 'Otoño' },
            { name: 'Avena', type: 'Cereal Invierno', min_precip: 400, max_slope: 15, ph_min: 5.0, ph_max: 7.5, drainage: ['Medio', 'Lento', 'Medio-Lento'], season: 'Otoño' },
            { name: 'Triticale', type: 'Cereal Invierno', min_precip: 350, max_slope: 15, ph_min: 5.5, ph_max: 8.0, drainage: ['Medio', 'Medio-Lento'], season: 'Otoño' },
            { name: 'Centeno', type: 'Cereal Invierno', min_precip: 300, max_slope: 15, ph_min: 5.0, ph_max: 8.0, drainage: ['Rápido', 'Medio'], season: 'Otoño' },
            { name: 'Ray-grass Italiano', type: 'Pradera', min_precip: 600, max_slope: 15, ph_min: 5.5, ph_max: 7.5, drainage: ['Medio', 'Lento', 'Medio-Lento'], season: 'Otoño' },
            { name: 'Festuca Alta', type: 'Pradera', min_precip: 450, max_slope: 15, ph_min: 5.0, ph_max: 8.0, drainage: ['Lento', 'Medio-Lento', 'Medio'], season: 'Otoño' },
            { name: 'Alfalfa', type: 'Leguminosa', min_precip: 500, max_slope: 10, ph_min: 6.2, ph_max: 8.2, drainage: ['Rápido', 'Medio'], season: 'Primavera' },
            { name: 'Vezas', type: 'Leguminosa', min_precip: 350, max_slope: 15, ph_min: 5.5, ph_max: 8.0, drainage: ['Rápido', 'Medio', 'Medio-Lento'], season: 'Otoño' },
            { name: 'Trébol Subterráneo', type: 'Leguminosa', min_precip: 400, max_slope: 20, ph_min: 5.0, ph_max: 6.5, drainage: ['Medio', 'Rápido', 'Medio-Lento'], season: 'Otoño' },
            { name: 'Sulla', type: 'Leguminosa', min_precip: 400, max_slope: 20, ph_min: 6.0, ph_max: 8.2, drainage: ['Rápido', 'Medio'], season: 'Otoño' },
            { name: 'Esparceta', type: 'Leguminosa', min_precip: 350, max_slope: 25, ph_min: 6.5, ph_max: 8.4, drainage: ['Rápido', 'Medio'], season: 'Otoño' },
            { name: 'Maíz Forrajero', type: 'Cereal Verano', min_precip: 300, max_slope: 8, ph_min: 5.8, ph_max: 8.0, drainage: ['Medio', 'Medio-Lento'], season: 'Primavera' },
            { name: 'Sorgo', type: 'Cereal Verano', min_precip: 250, max_slope: 10, ph_min: 5.5, ph_max: 8.5, drainage: ['Medio', 'Rápido'], season: 'Primavera' },
        ];

        for (const crop of CROPS) {
            const reasons: string[] = [];
            let valid = true;

            if (slope > crop.max_slope) valid = false;
            if (soil.ph_typical < crop.ph_min || soil.ph_typical > crop.ph_max) valid = false;
            if (!crop.drainage.includes(soil.drainage)) valid = false;

            if (climate) {
                if (climate.annualPrecip < crop.min_precip && crop.name !== 'Maíz Forrajero') {
                    if (climate.annualPrecip < crop.min_precip * 0.7) valid = false;
                }
            }

            if (valid) {
                if (slope > 8 && slope <= crop.max_slope) reasons.push('Pendiente límite');
                if (climate && climate.annualPrecip > crop.min_precip + 200) reasons.push('Clima favorable');
                if (crop.name === 'Alfalfa' && soil.drainage === 'Rápido') reasons.push('Excelente drenaje');
                if (crop.name === 'Festuca Alta' && (soil.drainage === 'Lento' || soil.drainage === 'Medio-Lento')) reasons.push('Tolera suelo pesado');
                if ((crop.name === 'Sulla' || crop.name === 'Esparceta') && soil.free_lime_pct && soil.free_lime_pct > 5) reasons.push('Tolera calizo');

                recs.push({
                    crop: crop.name,
                    type: `${crop.type} (${crop.season})`,
                    reason: reasons.length ? reasons.join('. ') : 'Condiciones aptas.',
                });
            }
        }

        if (slope > 15) {
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
            let score = (i.retention * 40) + (i.drainage * 40) + (i.fertility * 20);
            if (i.risk_waterlogging > 0.7) score -= 20;
            return Math.min(100, Math.max(0, score));
        }
        if (objective === 'Cultivo') {
            return Math.min(100, (i.fertility * 60) + (i.drainage * 20) + (i.retention * 20));
        }
        if (objective === 'Engorde') {
            return Math.min(100, (i.fertility * 70) + (i.drainage * 30));
        }
        return 50;
    },
};
