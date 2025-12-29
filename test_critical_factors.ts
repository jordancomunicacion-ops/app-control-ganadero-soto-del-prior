
import { BreedManager } from './services/breedManager';

async function verifyCriticalFactors() {
    console.log("⚠️ VERIFICACIÓN DE FACTORES CRÍTICOS (PARTO Y LACTANCIA)");

    const charolais = BreedManager.getBreedById('CHA')!; // 1100kg
    const betizu = BreedManager.getBreedById('BET')!;    // 325kg
    const angus = BreedManager.getBreedById('ANG')!;     // 500kg
    const holstein = BreedManager.getBreedById('HOL')!;  // High Milk

    // 1. TEST DISTOCIA EXTREMA (Flexible Logic Check)
    // Case A: Charolais (Giant) x Betizu (Tiny)
    // Ratio: 1100 / 325 = ~3.38. This should be DISASTROUS.
    const toxicCross = BreedManager.calculateHybrid('CHA', 'BET')!;
    console.log(`\n1. CRUCE DE ALTO RIESGO: Charolais (1100kg) x Betizu (325kg)`);
    console.log(`   - Ratio Peso: ${(charolais.weight_male_adult / betizu.weight_female_adult).toFixed(2)}x`);
    console.log(`   - Facilidad Parto Resultante: [${toxicCross.calving_ease.toFixed(2)}] / 10`);
    if (toxicCross.calving_ease <= 2) console.log("   ✅ CORRECTO: Alerta Roja (Cesárea obligatoria).");
    else console.log("   ❌ ERROR: El sistema no penalizó suficiente.");

    // Case B: Charolais (Giant) x Angus (Medium)
    // Ratio: 1100 / 500 = 2.2. Still dangerous but maybe surviveable?
    // Wait, Angus female is 500. Charolais male 1100. Ratio 2.2 is huge. penalty (2.2-1.15)*10 = 10.5. Calving 1.
    const riskyCross = BreedManager.calculateHybrid('CHA', 'ANG')!;
    console.log(`\n2. CRUCE ARRIESGADO: Charolais (1100kg) x Angus (500kg)`);
    console.log(`   - Ratio Peso: ${(charolais.weight_male_adult / angus.weight_female_adult).toFixed(2)}x`);
    console.log(`   - Facilidad Parto Resultante: [${riskyCross.calving_ease.toFixed(2)}]`);

    // Case C: Angus (Medium) x Charolais (Large Mother)
    // Ratio: 900 / 800 = 1.125. Safe (< 1.15).
    const safeCross = BreedManager.calculateHybrid('ANG', 'CHA')!;
    console.log(`\n3. CRUCE SEGURO: Angus (900kg) x Charolais Madre (800kg)`);
    console.log(`   - Ratio Peso: ${(angus.weight_male_adult / charolais.weight_female_adult).toFixed(2)}x`);
    console.log(`   - Facilidad Parto Resultante: [${safeCross.calving_ease.toFixed(2)}] (Base Avg)`);

    // 2. TEST ESTRÉS LACTANCIA
    // Compare same Sire (Hereford) on different Dams
    const hereford = BreedManager.getBreedById('HER')!;

    // Dam A: Holstein (Milk 5)
    const goodStart = BreedManager.calculateHybrid('HER', 'HOL')!;
    // Dam B: Betizu (Milk 1) - Pretend size mismatch ignored for science
    const badStart = BreedManager.calculateHybrid('HER', 'BET')!;

    console.log(`\n4. EFECTO LACTANCIA (Hereford Sire)`);
    console.log(`   - Madre Holstein (Leche 5) -> ADG: ${goodStart.adg_grazing.toFixed(2)} | Conf: ${goodStart.conformation_potential.toFixed(2)}`);
    console.log(`   - Madre Betizu (Leche 1)   -> ADG: ${badStart.adg_grazing.toFixed(2)} | Conf: ${badStart.conformation_potential.toFixed(2)}`);

    const adgDiff = goodStart.adg_grazing - badStart.adg_grazing;
    if (adgDiff > 0.1) console.log(`   ✅ CORRECTO: El ternero de madre lechera crece más rápido (+${(adgDiff * 1000).toFixed(0)}g/día).`);
}

verifyCriticalFactors();
