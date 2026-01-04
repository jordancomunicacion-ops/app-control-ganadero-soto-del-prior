
import { BreedManager } from './services/breedManager';
import { CarcassEngine } from './services/carcassEngine';

function logResult(title: string, result: any, breed: any) {
    console.log(`\n--- ${title} ---`);
    console.log(`Raza: ${breed.name} (${breed.code})`);
    console.log(`Potenciales (Puros/Híbridos):`);
    console.log(`  - Marmoleo: ${breed.marbling_potential}`);
    console.log(`  - Conformación: ${breed.conformation_potential}`);
    console.log(`  - Rendimiento: ${breed.yield_potential}`);
    console.log(`RESULTADOS CANAL (Cebo Intensivo 15 meses, 3.0 Mcal/kg):`);
    console.log(`  > Clasificación: [${result.conformation}]`);
    console.log(`  > Grasa (BMS):   [${result.bms}] / 12`);
    console.log(`  > Rendimiento:   ${result.rc_percent}%`);
}

async function runTest() {
    console.log("🚀 Iniciando Simulación de Cruces F1 (Teoría Sapiens)...");

    // Escenario 1: Betizu (Rústica/Baja prod) x Wagyu (Infiltración extrema)
    // Objetivo: Ver si la Wagyu "arregla" el marmoleo de la Betizu.
    const betizu = BreedManager.getBreedById('BET')!;
    const wagyu = BreedManager.getBreedById('WAG')!;

    // Manual Hybrid Calculation specifically to verify inherited props
    // Using helper if available, or manual derivation
    const f1_BW = BreedManager.calculateHybrid('WAG', 'BET');

    if (f1_BW) {
        const res_BW = CarcassEngine.calculateCarcass(
            500, 18, f1_BW, 2.9, 1.2, { sex: 'Macho', currentMonth: 5, fatherBreed: wagyu, motherBreed: betizu }
        );
        logResult("CRUCE 1: Betizu (Madre) x Wagyu (Padre)", res_BW, f1_BW);
    }

    // Escenario 2: Limousin (Cárnica) x Simmental (Cárnica/Doble)
    // Objetivo: Confirmar "Super Animal" de conformación.
    const lim = BreedManager.getBreedById('LIM')!;
    const sim = BreedManager.getBreedById('SIM')!;
    const f1_LS = BreedManager.calculateHybrid('LIM', 'SIM');

    if (f1_LS) {
        const res_LS = CarcassEngine.calculateCarcass(
            600, 16, f1_LS, 2.9, 1.5, { sex: 'Macho', currentMonth: 5, fatherBreed: lim, motherBreed: sim }
        );
        logResult("CRUCE 2: Simmental (Madre) x Limousin (Padre)", res_LS, f1_LS);
    }

    // Escenario 3: Comparativa Pura (Simmental vs Holstein)
    // Objetivo: Verificar que Simmental NO es lechera en rendimiento cárnico.
    const hol = BreedManager.getBreedById('HOL')!;

    const res_SIM_Pure = CarcassEngine.calculateCarcass(600, 18, sim, 2.9, 1.4, { sex: 'Macho' });
    const res_HOL_Pure = CarcassEngine.calculateCarcass(600, 18, hol, 2.9, 1.2, { sex: 'Macho' }); // Same diet

    console.log(`\n--- COMPARATIVA PURA: Simmental vs Holstein ---`);
    console.log(`Dieta Idéntica (Altas calorías).`);
    console.log(`SIMMENTAL -> Conf: [${res_SIM_Pure.conformation}] | RC: ${res_SIM_Pure.rc_percent}%`);
    console.log(`HOLSTEIN  -> Conf: [${res_HOL_Pure.conformation}] | RC: ${res_HOL_Pure.rc_percent}%`);

    if (res_SIM_Pure.conformation > res_HOL_Pure.conformation) {
        console.log("✅ CHECK: Simmental supera ampliamente a Holstein en canal.");
    } else {
        console.log("❌ ERROR: Simmental no se distingue de Holstein.");
    }
}

runTest();
