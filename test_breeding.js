const BreedingEngine = require('./breeding-engine.js');

// Mock Data based on User's Example
// Cruce: Brahman (padre) × Limousin (madre)
// 3.1. Peso adulto: 1000 (padre) / 650 (madre)
// 3.2. ADG Feedlot: 1.2 (padre) / 1.4 (madre) <-- Note: User ex says 1.2/1.4, likely swapped in text vs standard, but I'll use these values.
// 3.3. Rendimiento: 58 (padre) / 63 (madre) <-- BreedingEngine doesnt calc yield yet, but I'll check other stats.

const sire = {
    id: 1,
    code: 'BRA',
    name: 'Brahman',
    subspecies: 'Bos indicus',
    weight_male_adult: 1000,
    weight_female_adult: 700, // Guess
    adg_feedlot: 1.2,
    adg_grazing: 1.0,
    fcr_feedlot: 7.0,
    slaughter_age_months: 30,
    heat_tolerance: 'Muy Alta',
    marbling: 'Baja',
    calving_ease: 'Alta' // User ex didn't specify, standard Indicus bias
};

const dam = {
    id: 2,
    code: 'LIM',
    name: 'Limousin',
    subspecies: 'Bos taurus',
    weight_male_adult: 650, // User ex says 650 for calculation (likely Female weight used for dam potential? or Male equivalent? User formula used 650).
    // Actually formula said: Peso adulto = 0.6*P_padre + 0.4*P_madre. 
    // Usually comparisons use same-sex weights. If dam is 650 that's likely female weight. Sire 1000 is male.
    // I will set weight_male_adult to 650 for Dam just to match the user's math for the test.
    weight_female_adult: 650,
    adg_feedlot: 1.4,
    adg_grazing: 1.1,
    fcr_feedlot: 5.0,
    slaughter_age_months: 16,
    heat_tolerance: 'Baja',
    marbling: 'Baja',
    calving_ease: 'Alta'
};

// Adjust Dam male weight to match user's apparent math inputs for exact verification
dam.weight_male_adult = 650;

console.log('--- Corriendo Simulación: Brahman (P) x Limousin (M) ---');
console.log(`Padre: ${sire.name} (${sire.weight_male_adult}kg, ADG ${sire.adg_feedlot})`);
console.log(`Madre: ${dam.name} (${dam.weight_male_adult}kg, ADG ${dam.adg_feedlot})`);

const f1 = BreedingEngine.calculateHybrid(sire, dam);

console.log('\n--- Resultados F1 ---');
console.log(`Nombre: ${f1.name}`);
console.log(`Peso Adulto (Macho): ${f1.weight_male_adult.toFixed(2)} kg (Esperado: ~880)`);
console.log(`ADG Feedlot: ${f1.adg_feedlot.toFixed(4)} kg/d (Esperado: ~1.365)`);
console.log(`FCR: ${f1.fcr_feedlot.toFixed(2)}`);
console.log(`Termotolerancia: ${f1.heat_tolerance}`);
console.log(`Genética Adicional:`, f1._genetics);
