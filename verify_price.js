
const fs = require('fs');
const path = require('path');

// Mock window and localStorage
global.window = {};
global.document = { addEventListener: () => { } };
global.localStorage = {
    getItem: (key) => null, // Simulate empty storage
    setItem: (key, val) => { }
};

// Load MarketDataManager
const marketCode = fs.readFileSync(path.join(__dirname, 'market-data-manager.js'), 'utf8');
eval(marketCode);

const MarketDataManager = global.window.MarketDataManager;
MarketDataManager.init();

// Test Case: Vaca (D) R3
// Animal Data for "Vaca": Female, > 48 months
const animalVaca = {
    ageMonths: 60,
    sex: 'Hembra',
    isParida: true
};

const price = MarketDataManager.getBeefPrice('Vaca', 'R', '3', animalVaca);
console.log('Result for Vaca (D) R3:', price);

if (!price.price || price.price === 0) {
    console.log('❌ ISSUE CONFIRMED: No price found in default state (returns 0).');
} else {
    console.log('✅ Price found:', price.price);
}
