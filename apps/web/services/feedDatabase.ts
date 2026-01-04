export interface FeedItem {
    id: string;
    name: string;
    category: 'Forraje' | 'Concentrado' | 'Suplemento' | 'Ecológico';
    dm_percent: number; // Materia Seca %
    energy_mcal: number; // Mcal NEg/kg MS
    protein_percent: number; // PB %
    fiber_percent: number; // FDN %
    cost_per_kg: number; // €/kg Fresco
    is_ecological?: boolean;
    description?: string;
}

export const FEED_DATABASE: FeedItem[] = [
    // Forrajes Standard
    { id: 'F01', name: 'Pasto Natural', category: 'Forraje', dm_percent: 22, energy_mcal: 1.28, protein_percent: 13, fiber_percent: 45, cost_per_kg: 0.12, description: 'Mantenimiento y recría' },
    { id: 'F02', name: 'Pasto Mejorado (Ryegrass)', category: 'Forraje', dm_percent: 23, energy_mcal: 1.35, protein_percent: 15, fiber_percent: 45, cost_per_kg: 0.12, description: 'Recría y crecimiento' },
    { id: 'F03', name: 'Heno de Pradera', category: 'Forraje', dm_percent: 88, energy_mcal: 1.1, protein_percent: 10, fiber_percent: 60, cost_per_kg: 0.12, description: 'Mantenimiento' },
    { id: 'F04', name: 'Heno de Alfalfa', category: 'Forraje', dm_percent: 89, energy_mcal: 1.25, protein_percent: 18, fiber_percent: 45, cost_per_kg: 0.12, description: 'Recría y lactación. Alto calcio' },
    { id: 'F05', name: 'Ensilado de Maíz', category: 'Forraje', dm_percent: 35, energy_mcal: 1.6, protein_percent: 8, fiber_percent: 49, cost_per_kg: 0.12, description: 'Engorde. Alto aporte energético' },
    { id: 'paja', name: 'Paja de Cereal', category: 'Forraje', dm_percent: 90, energy_mcal: 0.6, protein_percent: 3, fiber_percent: 75, cost_per_kg: 0.05, description: 'Fibra efectiva' },

    // Especial Dehesa
    { id: 'BELLHO_01', name: 'Bellota (Dehesa)', category: 'Forraje', dm_percent: 62, energy_mcal: 2.2, protein_percent: 6, fiber_percent: 22, cost_per_kg: 0.10, description: 'Acabado extensivo estacional. Alta en ácido oleico' },

    // Concentrados Energéticos
    { id: 'C01', name: 'Maíz Grano', category: 'Concentrado', dm_percent: 89, energy_mcal: 2.05, protein_percent: 9, fiber_percent: 12, cost_per_kg: 0.25, description: 'ADG y marmoleo' },
    { id: 'C02', name: 'Cebada', category: 'Concentrado', dm_percent: 88, energy_mcal: 1.95, protein_percent: 11, fiber_percent: 18, cost_per_kg: 0.25, description: 'Engorde seguro' },
    { id: 'C03', name: 'Trigo', category: 'Concentrado', dm_percent: 88, energy_mcal: 2.0, protein_percent: 12, fiber_percent: 10, cost_per_kg: 0.25, description: 'Engorde rápido. Peligro de acidosis' },
    { id: 'C04', name: 'DDGS (Maíz)', category: 'Concentrado', dm_percent: 90, energy_mcal: 2.05, protein_percent: 28, fiber_percent: 32, cost_per_kg: 0.25, description: 'Sustituto de cereal' },
    { id: 'C05', name: 'Pulpa de Remolacha', category: 'Concentrado', dm_percent: 90, energy_mcal: 1.7, protein_percent: 10, fiber_percent: 40, cost_per_kg: 0.25, description: 'Mejora digestibilidad' },
    { id: 'C06', name: 'Cascarilla de Soja', category: 'Concentrado', dm_percent: 90, energy_mcal: 1.4, protein_percent: 14, fiber_percent: 60, cost_per_kg: 0.25, description: 'Fuente de fibra' },
    { id: 'triticale', name: 'Triticale', category: 'Concentrado', dm_percent: 88, energy_mcal: 1.85, protein_percent: 12, fiber_percent: 14, cost_per_kg: 0.24 },
    { id: 'avena', name: 'Avena', category: 'Concentrado', dm_percent: 89, energy_mcal: 1.7, protein_percent: 11, fiber_percent: 28, cost_per_kg: 0.22 },

    // Proteicos
    { id: 'P01', name: 'Harina de Soja 47%', category: 'Concentrado', dm_percent: 88, energy_mcal: 1.9, protein_percent: 47, fiber_percent: 15, cost_per_kg: 0.42, description: 'Construcción muscular' },
    { id: 'P02', name: 'Colza', category: 'Concentrado', dm_percent: 90, energy_mcal: 1.7, protein_percent: 38, fiber_percent: 13, cost_per_kg: 0.42, description: 'Sustituto de soja eficiente' },
    { id: 'P03', name: 'Guisante Proteico', category: 'Concentrado', dm_percent: 88, energy_mcal: 1.6, protein_percent: 24, fiber_percent: 20, cost_per_kg: 0.42, description: 'Recría joven. Producción KM0' },
    { id: 'P04', name: 'Urea (NNP)', category: 'Suplemento', dm_percent: 100, energy_mcal: 0, protein_percent: 281, fiber_percent: 0, cost_per_kg: 0.42, description: 'Solo animales >8 meses' },

    // Suplementos
    { id: 'S01', name: 'Núcleo Mineral', category: 'Suplemento', dm_percent: 100, energy_mcal: 0, protein_percent: 0, fiber_percent: 0, cost_per_kg: 0.80, description: 'Salud general' },
    { id: 'S02', name: 'Premezcla de Engorde', category: 'Suplemento', dm_percent: 95, energy_mcal: 0, protein_percent: 12, fiber_percent: 0, cost_per_kg: 0.80, description: 'Mejorar FCR' },
    { id: 'S03', name: 'Vitaminas ADE', category: 'Suplemento', dm_percent: 100, energy_mcal: 0, protein_percent: 0, fiber_percent: 0, cost_per_kg: 0.80, description: 'Salud inmunitaria' },
    { id: 'S04', name: 'Corrector de Acidosis', category: 'Suplemento', dm_percent: 100, energy_mcal: 0, protein_percent: 0, fiber_percent: 0, cost_per_kg: 0.80, description: 'Estabilidad ruminal' },

    // Ecológicos
    { id: 'pienso_eco', name: 'Pienso Eco Certificado', category: 'Ecológico', dm_percent: 90, energy_mcal: 1.9, protein_percent: 13, fiber_percent: 14, cost_per_kg: 0.58, is_ecological: true },
    { id: 'guisante_eco', name: 'Guisante Eco', category: 'Ecológico', dm_percent: 90, energy_mcal: 1.8, protein_percent: 22, fiber_percent: 6, cost_per_kg: 0.45, is_ecological: true }
];
