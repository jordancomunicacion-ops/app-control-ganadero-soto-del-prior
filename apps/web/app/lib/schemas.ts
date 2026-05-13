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
});

export type AnimalInput = z.infer<typeof AnimalSchema>;
export type EventInput = z.infer<typeof EventSchema>;
export type FarmInput = z.infer<typeof FarmSchema>;
