
// test_logic_sapiens.ts
// Script de Verificación de Lógica Sistémica

import { GeneticsEngine } from './services/geneticsEngine';
import { NutritionEngine } from './services/nutritionEngine';
import { SystemicEngine } from './services/systemicEngine';

async function runTest() {
    console.log("🚀 Iniciando Test de Lógica Sistémica (Teoría Sapiens)...\n");

    // 1. Simular Razas
    const breedWagyu = { code: 'WAG', name: 'Wagyu', marblingPotential: 5, adgFeedlot: 0.9, heatTolerance: 0.4 };
    const breedCharolais = { code: 'CHA', name: 'Charolais', marblingPotential: 2, adgFeedlot: 1.6, heatTolerance: 0.3 };
    const breedMorucha = { code: 'MOR', name: 'Morucha', marblingPotential: 3, adgFeedlot: 1.1, heatTolerance: 0.9 };

    console.log("--- 1. Determinación de Tipo Funcional (Regla A3) ---");

    const typeWagyu = GeneticsEngine.determineFunctionalType(breedWagyu);
    console.log(`🐂 Wagyu -> ${typeWagyu} (Esperado: infiltracion)`);

    const typeCha = GeneticsEngine.determineFunctionalType(breedCharolais);
    console.log(`🐂 Charolais -> ${typeCha} (Esperado: crecimiento_magro)`);

    const typeMor = GeneticsEngine.determineFunctionalType(breedMorucha);
    console.log(`🐂 Morucha -> ${typeMor} (Esperado: rustica_adaptada)`);

    console.log("\n--- 2. Objetivos Nutricionales (Regla A5) ---");

    // Caso A: Wagyu terminación
    const targetsWagyu = NutritionEngine.calculateKPITargets(
        { breed: 'Wagyu', sex: 'Macho', weight: 600, ageMonths: 24, functionalType: typeWagyu, stage: 'terminado' },
        'Engorde Premium',
        'Intensivo'
    );
    console.log("🎯 Wagyu Terminado:");
    console.log(`   - EN: ${targetsWagyu.energyDensity} (Esp: 2.9)`);
    console.log(`   - Conc Max: ${targetsWagyu.maxConcentrate}% (Esp: 85%)`);

    // Caso B: Morucha Extensivo
    const targetsMorucha = NutritionEngine.calculateKPITargets(
        { breed: 'Morucha', sex: 'Hembra', weight: 450, ageMonths: 18, functionalType: typeMor, stage: 'recria' },
        'Mantenimiento',
        'Extensivo'
    );
    console.log("🎯 Morucha Extensivo:");
    console.log(`   - Concentrado Max: ${targetsMorucha.maxConcentrate}% (Esp: ~30-40%)`);
    console.log(`   - Fibra Min: ${targetsMorucha.fiberMin}% (Esp: 30%)`);

    console.log("\n--- 3. Motor Sistémico: Alertas y Calidad (Reglas A6, A7) ---");

    // Simular un día de un Wagyu con dieta de alta energía pero bajo marmoleo genético (Test de coherencia)
    // Supongamos un animal mestizo 'FakeWagyu' con potencial bajo pero dieta alta energía
    const prediction = SystemicEngine.predictMeatQuality(
        2, // Marbling pot bajo
        120, // Días cebado
        2.9, // Alta energía
        true // Bellota
    );
    console.log(`🔮 Predicción Calidad (Mestizo con Dieta Top): Index ${prediction.qualityIndex}/100`);
    console.log(`   - Marmoleo Predicho: BMS ${prediction.predMarbling.toFixed(1)}`);

    // Alerta de Acidosis
    const alerts = SystemicEngine.checkAlerts(
        { fcrObserved: 6.0, dietFdn: 15, dietEnergy: 3.0 }, // FDN muy bajo, Energía muy alta
        { refFcr: 6.0, refAdg: 1.0 },
        'Intensivo'
    );
    console.log("🚨 Test de Alertas (Dieta Acidótica):");
    alerts.forEach(a => console.log(`   - [${a.level}] ${a.message}`));

    console.log("\n✅ Test Completado.");
}

runTest();
