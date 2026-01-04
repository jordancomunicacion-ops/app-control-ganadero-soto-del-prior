
import { BreedManager } from './services/breedManager';
import { CarcassEngine } from './services/carcassEngine';

async function runReciprocalTest() {
    console.log("🧬 TEST CRUCES RECÍPROCOS: ¿Importa quién es la madre?");

    const wagyu = BreedManager.getBreedById('WAG')!;
    const betizu = BreedManager.getBreedById('BET')!;

    // CASE A: Father Wagyu x Mother Betizu
    // Expectation: 
    // - Marbling: Average (W5 + B2) / 2 = 3.5. NO maternal bonus (Betizu marbling 2 < 4).
    // - Milk Effect: Betizu milk 1 (Poor) -> Penalty to conformation.
    // - Calving: Harder (Wagyu sire on Betizu small dam).
    const f1_WB = BreedManager.calculateHybrid('WAG', 'BET'); // Sire, Dam
    const res_WB = CarcassEngine.calculateCarcass(500, 20, f1_WB!, 2.8, 1.0, {
        fatherBreed: wagyu, motherBreed: betizu, sex: 'Macho'
    });

    // CASE B: Father Betizu x Mother Wagyu
    // Expectation:
    // - Marbling: Average 3.5 + Maternal Bonus (Wagyu marbling 5 >= 4) -> 4.0.
    // - Milk Effect: Wagyu milk 2 (Normal) -> No penalty/bonus.
    // - Calving: Easier (Betizu sire on Wagyu dam).
    const f1_BW = BreedManager.calculateHybrid('BET', 'WAG'); // Sire, Dam
    const res_BW = CarcassEngine.calculateCarcass(500, 20, f1_BW!, 2.8, 1.0, {
        fatherBreed: betizu, motherBreed: wagyu, sex: 'Macho'
    });

    console.log(`\n1. WAGYU (P) x BETIZU (M)`);
    console.log(`   - Madre: ${betizu.name} (Milk: ${betizu.milk_potential}, Marb: ${betizu.marbling_potential})`);
    console.log(`   - Marmoleo Potencial (Genetico): ${f1_WB?.marbling_potential}`);
    console.log(`   - Resultado BMS: ${res_WB.bms}`);
    console.log(`   - Conformación: ${res_WB.conformation}`);
    console.log(`   - Calving Ease (Hybrid): ${f1_WB?.calving_ease.toFixed(1)}`);

    console.log(`\n2. BETIZU (P) x WAGYU (M)`);
    console.log(`   - Madre: ${wagyu.name} (Milk: ${wagyu.milk_potential}, Marb: ${wagyu.marbling_potential})`);
    console.log(`   - Marmoleo Potencial (Genetico): ${f1_BW?.marbling_potential}`);
    console.log(`   - Resultado BMS: ${res_BW.bms}`);
    console.log(`   - Conformación: ${res_BW.conformation}`);
    console.log(`   - Calving Ease (Hybrid): ${f1_BW?.calving_ease.toFixed(1)}`);

    console.log("\n--- ANALISIS DIFERENCIAL ---");
    const diffMarbling = res_BW.marbling_score - res_WB.marbling_score;
    if (diffMarbling > 0) {
        console.log(`✅ EFECTO MATERNO CONFIRMADO: El cruce con madre Wagyu tiene ${diffMarbling.toFixed(1)} puntos más de marmoleo.`);
    } else {
        console.log(`❌ FALLO: No se detecta diferencia en marmoleo.`);
    }

    if (f1_BW!.calving_ease > f1_WB!.calving_ease) {
        console.log(`✅ FACILIDAD DE PARTO: Mejor con madre grande (Wagyu) que pequeña (Betizu).`);
    }

    if (res_WB.conformation !== res_BW.conformation) {
        console.log(`✅ IMPRONTA ESTRUCTURAL: La leche de la madre afectó la conformación.`);
    }
}

runReciprocalTest();
