
import { PrismaClient } from '@prisma/client';

// Import data directly or redefine it here to avoid TS path issues during seed execution
// Copying structure from services/breedManager.ts and services/feedDatabase.ts to ensure standalone execution

const prisma = new PrismaClient();

const BASE_BREEDS = [
    // 1. Infiltración Alta (Sapiens: Infiltración)
    { id: 'WAG', name: 'Wagyu', subspecies: 'Bos taurus', weight_male_adult: 850, weight_female_adult: 550, slaughter_age_months: 29, adg_feedlot: 0.90, adg_grazing: 0.60, fcr_feedlot: 8.5, heat_tolerance: 0.5, marbling_potential: 5, calving_ease: 0.9, milk_potential: 2, conformation_potential: 3, yield_potential: 0.58 },
    { id: 'ANG', name: 'Angus', subspecies: 'Bos taurus', weight_male_adult: 900, weight_female_adult: 500, slaughter_age_months: 18, adg_feedlot: 1.40, adg_grazing: 0.90, fcr_feedlot: 7.9, heat_tolerance: 0.4, marbling_potential: 4, calving_ease: 0.8, milk_potential: 3, conformation_potential: 4, yield_potential: 0.60 },

    // 2. Crecimiento Magro / Conformación (Sapiens: Crecimiento Magro / Generico)
    { id: 'CHA', name: 'Charolais', subspecies: 'Bos taurus', weight_male_adult: 1100, weight_female_adult: 800, slaughter_age_months: 24, adg_feedlot: 1.50, adg_grazing: 1.00, fcr_feedlot: 7.2, heat_tolerance: 0.3, marbling_potential: 2, calving_ease: 0.4, milk_potential: 2, conformation_potential: 5, yield_potential: 0.65 },
    { id: 'LIM', name: 'Limousin', subspecies: 'Bos taurus', weight_male_adult: 950, weight_female_adult: 650, slaughter_age_months: 16, adg_feedlot: 1.40, adg_grazing: 0.90, fcr_feedlot: 7.4, heat_tolerance: 0.4, marbling_potential: 3, calving_ease: 0.6, milk_potential: 2, conformation_potential: 5, yield_potential: 0.64 },
    { id: 'BDA', name: 'Blonde d\'Aquitaine', subspecies: 'Bos taurus', weight_male_adult: 1200, weight_female_adult: 700, slaughter_age_months: 18, adg_feedlot: 1.60, adg_grazing: 1.10, fcr_feedlot: 7.1, heat_tolerance: 0.3, marbling_potential: 2, calving_ease: 0.5, milk_potential: 2, conformation_potential: 5, yield_potential: 0.67 },
    { id: 'AZB', name: 'Azul Belga', subspecies: 'Bos taurus', weight_male_adult: 1175, weight_female_adult: 775, slaughter_age_months: 16, adg_feedlot: 1.70, adg_grazing: 1.00, fcr_feedlot: 6.8, heat_tolerance: 0.1, marbling_potential: 1, calving_ease: 0.2, milk_potential: 2, conformation_potential: 6, yield_potential: 0.70 },
    { id: 'PIR', name: 'Pirenaica', subspecies: 'Bos taurus', weight_male_adult: 900, weight_female_adult: 600, slaughter_age_months: 18, adg_feedlot: 1.30, adg_grazing: 0.85, fcr_feedlot: 7.8, heat_tolerance: 0.5, marbling_potential: 3, calving_ease: 0.7, milk_potential: 2, conformation_potential: 4, yield_potential: 0.62 },

    // 3. Rústicas Adaptadas (Sapiens: Rustica Adaptada / Doble Proposito)
    { id: 'MOR', name: 'Morucha', subspecies: 'Bos taurus', weight_male_adult: 900, weight_female_adult: 500, slaughter_age_months: 30, adg_feedlot: 1.10, adg_grazing: 0.70, fcr_feedlot: 8.4, heat_tolerance: 0.8, marbling_potential: 3, calving_ease: 0.8, milk_potential: 2, conformation_potential: 2, yield_potential: 0.54 },
    { id: 'RET', name: 'Retinta', subspecies: 'Bos taurus', weight_male_adult: 1000, weight_female_adult: 580, slaughter_age_months: 30, adg_feedlot: 1.10, adg_grazing: 0.75, fcr_feedlot: 8.3, heat_tolerance: 0.8, marbling_potential: 3, calving_ease: 0.8, milk_potential: 2, conformation_potential: 3, yield_potential: 0.56 },
    { id: 'BER', name: 'Berrenda', subspecies: 'Bos taurus', weight_male_adult: 800, weight_female_adult: 500, slaughter_age_months: 23, adg_feedlot: 1.10, adg_grazing: 0.70, fcr_feedlot: 8.3, heat_tolerance: 0.8, marbling_potential: 3, calving_ease: 0.8, milk_potential: 2, conformation_potential: 3, yield_potential: 0.55 },
    { id: 'BET', name: 'Betizu', subspecies: 'Bos taurus', weight_male_adult: 450, weight_female_adult: 325, slaughter_age_months: 36, adg_feedlot: 0.90, adg_grazing: 0.55, fcr_feedlot: 9.2, heat_tolerance: 0.7, marbling_potential: 2, calving_ease: 1.0, milk_potential: 1, conformation_potential: 2, yield_potential: 0.50 },

    // 4. Doble Propósito / Lecheras (Sapiens: Aptitud Lechera / Doble)
    // CORRECCIÓN: Simmental ("Fleckvieh") moderno es doble propósito cárnico, no una simple lechera.
    { id: 'SIM', name: 'Simmental', subspecies: 'Bos taurus', weight_male_adult: 1100, weight_female_adult: 750, slaughter_age_months: 18, adg_feedlot: 1.50, adg_grazing: 0.85, fcr_feedlot: 7.0, heat_tolerance: 0.4, marbling_potential: 3, calving_ease: 0.6, milk_potential: 3, conformation_potential: 5, yield_potential: 0.63 }, // Milk lowered to 3, Conf raised to 5
    { id: 'HER', name: 'Hereford', subspecies: 'Bos taurus', weight_male_adult: 1000, weight_female_adult: 580, slaughter_age_months: 20, adg_feedlot: 1.40, adg_grazing: 0.80, fcr_feedlot: 7.8, heat_tolerance: 0.3, marbling_potential: 3, calving_ease: 0.7, milk_potential: 2, conformation_potential: 4, yield_potential: 0.58 },

    // 4.5. Lecheras Puras (Nuevas)
    { id: 'HOL', name: 'Holstein', subspecies: 'Bos taurus', weight_male_adult: 1000, weight_female_adult: 650, slaughter_age_months: 20, adg_feedlot: 1.20, adg_grazing: 0.60, fcr_feedlot: 8.5, heat_tolerance: 0.2, marbling_potential: 2, calving_ease: 0.5, milk_potential: 5, conformation_potential: 2, yield_potential: 0.52 },
    { id: 'FRI', name: 'Frisona', subspecies: 'Bos taurus', weight_male_adult: 950, weight_female_adult: 600, slaughter_age_months: 20, adg_feedlot: 1.15, adg_grazing: 0.60, fcr_feedlot: 8.6, heat_tolerance: 0.2, marbling_potential: 2, calving_ease: 0.5, milk_potential: 5, conformation_potential: 2, yield_potential: 0.51 },

    // 5. Indicus / Tropicales (Sapiens: Rustica Extrema)
    { id: 'BRA', name: 'Brahman', subspecies: 'Bos indicus', weight_male_adult: 900, weight_female_adult: 550, slaughter_age_months: 24, adg_feedlot: 1.10, adg_grazing: 0.80, fcr_feedlot: 8.0, heat_tolerance: 1.0, marbling_potential: 2, calving_ease: 0.9, milk_potential: 3, conformation_potential: 3, yield_potential: 0.57 },
    { id: 'NEL', name: 'Nelore', subspecies: 'Bos indicus', weight_male_adult: 900, weight_female_adult: 550, slaughter_age_months: 26, adg_feedlot: 1.05, adg_grazing: 0.75, fcr_feedlot: 8.2, heat_tolerance: 1.0, marbling_potential: 2, calving_ease: 0.9, milk_potential: 2, conformation_potential: 3, yield_potential: 0.58 },
    { id: 'DRM', name: 'Droughtmaster', subspecies: 'Cruzado', weight_male_adult: 900, weight_female_adult: 550, slaughter_age_months: 24, adg_feedlot: 1.20, adg_grazing: 0.90, fcr_feedlot: 7.9, heat_tolerance: 0.9, marbling_potential: 3, calving_ease: 0.9, milk_potential: 2, conformation_potential: 3, yield_potential: 0.58 },
];

const FEED_DATABASE = [
    { id: 'F01', name: 'Pasto Natural', category: 'Forraje', dm_percent: 22, energy_mcal: 1.28, protein_percent: 13, fiber_percent: 45, cost_per_kg: 0.12 },
    { id: 'paja', name: 'Paja de Cereal', category: 'Forraje', dm_percent: 90, energy_mcal: 0.6, protein_percent: 3, fiber_percent: 75, cost_per_kg: 0.05 },
    { id: 'BELLHO_01', name: 'Bellota (Dehesa)', category: 'Forraje', dm_percent: 62, energy_mcal: 2.2, protein_percent: 6, fiber_percent: 22, cost_per_kg: 0.10 },
    { id: 'C01', name: 'Maíz Grano', category: 'Concentrado', dm_percent: 89, energy_mcal: 2.05, protein_percent: 9, fiber_percent: 12, cost_per_kg: 0.25 },
    { id: 'P01', name: 'Harina de Soja 47%', category: 'Concentrado', dm_percent: 88, energy_mcal: 1.9, protein_percent: 47, fiber_percent: 15, cost_per_kg: 0.42 },
];

async function main() {
    console.log("🌱 Iniciando siembra de datos (Teoría Sapiens)...");

    // 1. Crear Granja por defecto
    const farm = await prisma.farm.upsert({
        where: { id: 'FARM_SOTO_01' },
        update: {},
        create: {
            id: 'FARM_SOTO_01',
            name: 'Soto del Prior',
            defaultManagementSystem: 'mixto',
            lat: 39.8,
            lon: -6.0
        }
    });
    console.log(`✅ Granja creada: ${farm.name}`);

    // 2. Sembrar Razas (Breeds)
    for (const b of BASE_BREEDS) {
        await prisma.breed.upsert({
            where: { id: b.id },
            update: {
                // Update params in case they changed in code
                refAdgFeedlot: b.adg_feedlot,
                refAdgPasture: b.adg_grazing,
                heatTolerance: b.heat_tolerance,
                marblingPotential: b.marbling_potential,
                milkPotential: b.milk_potential,
                conformationPotential: b.conformation_potential,
                yieldPotential: b.yield_potential
            },
            create: {
                id: b.id,
                name: b.name,
                subspecies: b.subspecies,
                adultMaleWeight: b.weight_male_adult,
                adultFemaleWeight: b.weight_female_adult,
                refAdgFeedlot: b.adg_feedlot,
                refAdgPasture: b.adg_grazing,
                refFcrFeedlot: b.fcr_feedlot,
                heatTolerance: b.heat_tolerance,
                marblingPotential: b.marbling_potential,
                calvingEase: b.calving_ease,
                milkPotential: b.milk_potential,
                conformationPotential: b.conformation_potential,
                yieldPotential: b.yield_potential
            }
        });
    }
    console.log(`✅ ${BASE_BREEDS.length} Razas sembradas.`);

    // 3. Sembrar Alimentos (Feeds)
    for (const f of FEED_DATABASE) {
        // Mock ADF (Acid Detergent Fiber) as ~60% of FDN if not present exactly in legacy
        // Or keep simple. Schema has ADF, we'll estimate or leave 0.
        const estAdf = f.fiber_percent * 0.6;

        await prisma.feed.upsert({
            where: { id: f.id },
            update: {},
            create: {
                id: f.id,
                name: f.name,
                category: f.category,
                dmPercent: f.dm_percent,
                netEnergyMcalKgDm: f.energy_mcal,
                cpPercentDm: f.protein_percent,
                fdnPercentDm: f.fiber_percent,
                adfPercentDm: estAdf,
                costPerKgFresh: f.cost_per_kg
            }
        });
    }
    console.log(`✅ ${FEED_DATABASE.length} Alimentos base sembrados.`);

    console.log("🌿 Siembra completada con éxito.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
