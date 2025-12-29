
import { CarcassEngine } from './services/carcassEngine';
import { CarcassQualityEngine } from './services/carcassQualityEngine';
import { BreedManager } from './services/breedManager';

// Mock AppConfig to match expected structure in CarcassQualityEngine
const AppConfig = {
    carcass: {
        rc_adjust: {
            age_ref_start_months: 12, age_ref_end_months: 24,
            EN_min: 2.0, EN_max: 3.0,
            adg_ratio_min: 0.8, adg_ratio_max: 1.2,
            THI_threshold: 72, THI_max: 85,
            w_age: 0.02, w_energy: 0.03, w_adg: 0.02, w_stress: -0.03
        },
        defaults: { rc_grazing: 0.54, rc_mixed: 0.56, rc_feedlot: 0.58 }
    },
    quality: {
        finishing_rule: { EN_finish_threshold: 2.5, concentrate_share_threshold: 0.6 }
    }
};

// Monkey patch AppConfig into CarcassQualityEngine or just rely on its imports if it works. 
// Since we are running ts-node, it will load the real AppConfig if available. 
// If it fails, I'll know. For now, I'll rely on the existing file imports in the service files.

// Define 3 Test Cases (Bueyes)
const testAnimals = [
    { name: 'Buey 1 (Younger)', weight: 600, ageMonths: 36, breedCode: 'LIM', sex: 'Castrado', system: 'Dehesa' },
    { name: 'Buey 2 (Mature)', weight: 750, ageMonths: 48, breedCode: 'RET', sex: 'Castrado', system: 'Montanera' },
    { name: 'Buey 3 (Old/Heavy)', weight: 900, ageMonths: 60, breedCode: 'AVI', sex: 'Castrado', system: 'Intensivo' }
];

async function runComparison() {
    console.log('--- Reproduction Script: 3 Bueyes Analysis ---');

    for (const animal of testAnimals) {
        console.log(`\nAnalyzing: ${animal.name} (${animal.breedCode}, ${animal.weight}kg, ${animal.ageMonths}m, ${animal.sex})`);

        // Handle 'AVI' which might be 'AVILEÑA' or 'RET' fallback if not found
        let breed = BreedManager.getBreedById(animal.breedCode);
        if (!breed) {
            console.log(`Breed ${animal.breedCode} not found, falling back to RET`);
            breed = BreedManager.getBreedById('RET')!;
        }

        // Mock data
        const dietEnergy = 2.8; // High energy
        const adg = 1.0;
        const thi = 65; // Comfortable

        // 1. New Engine (CarcassEngine)
        try {
            const resNew = CarcassEngine.calculateCarcass(
                animal.weight,
                animal.ageMonths,
                breed,
                dietEnergy,
                adg,
                {
                    sex: animal.sex as 'Macho' | 'Hembra' | 'Castrado',
                    isOx: true,
                    isBellota: animal.system === 'Montanera',
                    currentMonth: 0 // January
                }
            );
            console.log(`[CarcassEngine] Yield: ${resNew.rc_percent}%, Weight: ${resNew.carcass_weight}, Marbling: ${resNew.marbling_score} (BMS ${resNew.bms}), SEUROP: ${resNew.conformation}, Premium: ${resNew.is_premium}`);
        } catch (e) {
            console.error('[CarcassEngine] Error:', e);
        }

        // 2. Old Engine (CarcassQualityEngine)
        try {
            // Mock breedData similar to how Breed properties map
            const breedData = {
                rc_base: breed.yield_potential || 0.58,
                rc_min: 0.54, rc_max: 0.70,
                adg_feedlot: breed.adg_feedlot,
                marbling_potential: breed.marbling_potential,
                ...breed
            };

            const resOldYield = CarcassQualityEngine.estimateCarcassResult(
                { ageMonths: animal.ageMonths, system: animal.system, sex: animal.sex },
                animal.weight,
                adg,
                dietEnergy,
                thi,
                breedData
            );

            const resOldQuality = CarcassQualityEngine.calculateQualityIndex(
                { ageMonths: animal.ageMonths, currentWeight: animal.weight, sex: animal.sex },
                breedData,
                dietEnergy,
                adg,
                thi,
                150, // DOF
                0, // Stability
                1, // Health
                { isBellota: animal.system === 'Montanera' }
            );

            console.log(`[CarcassQualityEngine] Yield: ${resOldYield.rc_percent}%, Weight: ${resOldYield.carcass_weight}, Marbling: ${resOldQuality.marbling_est} (BMS ${resOldQuality.bms_est}), SEUROP: ${resOldQuality.conformation_est}`);
        } catch (e) {
            console.error('[CarcassQualityEngine] Error:', e);
        }
    }
}

runComparison().catch(console.error);
