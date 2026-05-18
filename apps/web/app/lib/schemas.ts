import { z } from 'zod';

export const AnimalSchema = z.object({
    id: z.string().min(1, 'El crotal es obligatorio'),
    farmId: z.string().min(1, 'La finca es obligatoria'),
    sex: z.string().min(1, 'El sexo es obligatorio'),
    birth: z.string().min(1, 'La fecha de nacimiento es obligatoria').refine(
        (v) => !isNaN(Date.parse(v)),
        'Fecha de nacimiento inválida'
    ),
    breed: z.string().optional(),
    weight: z.coerce.number().optional(),
    notes: z.string().optional(),
    father: z.string().optional(),
    mother: z.string().optional(),
    corral: z.string().optional(),
    name: z.string().optional(),
});

export const EventSchema = z.object({
    type: z.string().min(1, 'El tipo de evento es obligatorio'),
    date: z.string().min(1, 'La fecha es obligatoria').refine(
        (v) => !isNaN(Date.parse(v)),
        'Fecha inválida'
    ),
    farmId: z.string().min(1, 'La finca es obligatoria'),
    desc: z.string().optional(),
    notes: z.string().optional(),
    cost: z.coerce.number().optional(),
    status: z.enum(['scheduled', 'pending', 'completed']).optional(),
    animalId: z.string().optional(),
    typeData: z.record(z.string(), z.unknown()).optional(),
});

export const FarmSchema = z.object({
    name: z.string().min(1, 'El nombre de la finca es obligatorio'),
    municipio: z.string().optional(),
    municipioCode: z.string().optional(),
    provinciaCode: z.string().optional(),
    poligono: z.string().optional(),
    parcela: z.string().optional(),
    superficie: z.coerce.number().optional(),
    recintos: z.array(z.unknown()).optional(),
    coords: z.record(z.string(), z.unknown()).optional(),
    slope: z.coerce.number().optional(),
    license: z.string().optional(),
    maxHeads: z.coerce.number().optional(),
    soilId: z.string().optional(),
    corrals: z.coerce.number().optional(),
    corralNames: z.array(z.string()).optional(),
    feedingSystem: z.string().optional(),
    irrigationCoef: z.coerce.number().optional(),
    climateStudy: z.record(z.string(), z.unknown()).optional(),
    cropsRecommendation: z.array(z.unknown()).optional(),
    breedsRecommendation: z.array(z.unknown()).optional(),
    f1Recommendation: z.array(z.unknown()).optional(),
    // Nuevos: tipo e intencionalidad de la finca
    farmType: z.enum(['extensivo', 'semi_intensivo', 'intensivo']).optional(),
    purpose: z.enum(['livestock', 'cropland', 'mixed']).optional(),
    // Jerarquía: vínculo opcional a la finca principal de la explotación.
    // null = finca principal; valor = finca de producción asociada.
    parentFarmId: z.string().nullable().optional(),
});

// =============================================================================
// CORRAL — recintos dentro de la finca ganadera
// =============================================================================
export const CorralKindEnum = z.enum([
    'pasto',
    'pasto_mejorado',
    'cementado_silo',
    'cubierto',
    'cebadero',
    'paritorio',
    'enfermeria',
    'manejo',
]);

export const CorralSchema = z.object({
    farmId: z.string().min(1, 'La finca es obligatoria'),
    name: z.string().min(1, 'El nombre del corral es obligatorio'),
    kind: CorralKindEnum,
    surfaceM2: z.coerce.number().min(0).optional(),
    capacityLU: z.coerce.number().min(0).optional(),
    hasShade: z.coerce.boolean().optional(),
    hasWater: z.coerce.boolean().optional(),
    hasFeeder: z.coerce.boolean().optional(),
    hasSilo: z.coerce.boolean().optional(),
    // Vínculo a la parcela de cultivo que se pastorea sobre este corral.
    // Solo se usa cuando kind === 'pasto_mejorado'.
    linkedPlotId: z.string().nullable().optional(),
    // @deprecated — texto libre legacy; usar linkedPlot.rotations.
    currentCrop: z.string().optional(),
    notes: z.string().optional(),
});

// =============================================================================
// CROP PLOT — parcelas de cultivo
// =============================================================================
export const CropPlotSchema = z.object({
    farmId: z.string().min(1, 'La finca es obligatoria'),
    name: z.string().min(1, 'El nombre de la parcela es obligatorio'),
    surfaceHa: z.coerce.number().min(0, 'La superficie debe ser >= 0'),
    soilId: z.string().optional(),
    irrigated: z.coerce.boolean().optional(),
    irrigationType: z.enum(['aspersion', 'goteo', 'inundacion', 'pivot']).optional(),
    sigpacPoligono: z.string().optional(),
    sigpacParcela: z.string().optional(),
    sigpacRecinto: z.string().optional(),
    pacUseCode: z.string().optional(),
    pacRegime: z.enum(['secano', 'regadio']).optional(),
    notes: z.string().optional(),
});

// =============================================================================
// CROP ROTATION — siembra concreta en una parcela
// =============================================================================
export const CropRotationSchema = z.object({
    plotId: z.string().min(1, 'La parcela es obligatoria'),
    cropName: z.string().min(1, 'El cultivo es obligatorio'),
    cropFamily: z.string().optional(),
    sowDate: z.string().min(1, 'La fecha de siembra es obligatoria').refine(
        (v) => !isNaN(Date.parse(v)),
        'Fecha de siembra inválida',
    ),
    harvestDate: z.string().nullable().optional().refine(
        (v) => !v || !isNaN(Date.parse(v)),
        'Fecha de cosecha inválida',
    ),
    expectedYieldT: z.coerce.number().min(0).optional(),
    actualYieldT: z.coerce.number().min(0).optional(),
    // Destino productivo de la siembra. 'consumo_animal' se mantiene como
    // valor legacy compatible con datos antiguos que no distinguían
    // pastoreo directo vs cosecha.
    destinationFor: z.enum([
        'pastoreo_directo',
        'henificacion',
        'ensilado',
        'grano',
        'venta',
        'mejora_suelo',
        'consumo_animal', // legacy
    ]).optional(),
    notes: z.string().optional(),
});

// =============================================================================
// PAC DECLARATION — campaña anual
// =============================================================================
export const PACSchema = z.object({
    farmId: z.string().min(1, 'La finca es obligatoria'),
    campaignYear: z.coerce.number().int().min(2020).max(2050),
    status: z.enum(['borrador', 'presentada', 'aprobada', 'rechazada', 'cobrada']).optional(),
    basePayment: z.coerce.boolean().optional(),
    redistributive: z.coerce.boolean().optional(),
    youngFarmer: z.coerce.boolean().optional(),
    organicScheme: z.coerce.boolean().optional(),
    coupledLivestock: z.coerce.boolean().optional(),
    ecoSchemes: z.array(z.string()).optional(),
    totalEligibleHa: z.coerce.number().min(0).optional(),
    totalLU: z.coerce.number().min(0).optional(),
    estimatedPayment: z.coerce.number().min(0).optional(),
    notes: z.string().optional(),
});

export type AnimalInput = z.infer<typeof AnimalSchema>;
export type EventInput = z.infer<typeof EventSchema>;
export type FarmInput = z.infer<typeof FarmSchema>;
export type CorralInput = z.infer<typeof CorralSchema>;
export type CropPlotInput = z.infer<typeof CropPlotSchema>;
export type CropRotationInput = z.infer<typeof CropRotationSchema>;
export type PACInput = z.infer<typeof PACSchema>;
