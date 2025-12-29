
import { CarcassEngine } from './services/carcassEngine';
import { BreedManager } from './services/breedManager';

async function verify() {
    console.log('--- Verification: Castrado/Ox Logic ---');
    const breed = BreedManager.getBreedById('LIM')!;
    const weight = 700;
    const age = 40;
    const energy = 2.8;
    const adg = 1.0;

    // 1. Bull (Macho)
    const bull = CarcassEngine.calculateCarcass(weight, age, breed, energy, adg, { sex: 'Macho' });
    console.log(`Bull (Macho): Yield ${bull.rc_percent}%, Marbling ${bull.marbling_score}, Conf ${bull.conformation}`);

    // 2. Castrado (Ox)
    const ox = CarcassEngine.calculateCarcass(weight, age, breed, energy, adg, { sex: 'Castrado', isOx: true });
    console.log(`Ox (Castrado): Yield ${ox.rc_percent}%, Marbling ${ox.marbling_score}, Conf ${ox.conformation}`);

    // Analysis
    console.log('\n--- Analysis ---');
    console.log(`Yield Delta (Ox - Bull): ${(ox.rc_percent - bull.rc_percent).toFixed(2)}% (Expected: Negative, ~-2.5%)`);
    // Bull gets +0.02 (+2%), Ox gets -0.005 (-0.5%). Total diff ~2.5%.

    console.log(`Marbling Delta (Ox - Bull): ${(ox.marbling_score - bull.marbling_score).toFixed(2)} (Expected: Positive, +0.8)`);
    // Ox gets +0.5 base + 0.3 old bonus = +0.8. Bull gets 0. (Assuming other factors same)

    console.log(`Conformation Delta (Ox - Bull): Check manually (Bull +0.5, Ox +0.0 => Diff -0.5)`);
}

verify().catch(console.error);
