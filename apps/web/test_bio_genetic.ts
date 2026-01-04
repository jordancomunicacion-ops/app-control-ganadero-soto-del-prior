
import { BreedManager } from './services/breedManager';

console.log("=== VERIFICACIÓN MODELO BIO-GENÉTICO ===");

// 1. Check Heterosis Levels
console.log("\n--- Casos de Heterosis (Vigor Híbrido) ---");

// A. Low (British x British)
const angHer = BreedManager.calculateHybrid('ANG', 'HER');
// Avg ADG: (1.4 + 1.4)/2 = 1.4. Heterosis ~2% (Same type)
console.log(`Angus x Hereford (British x British):`);
console.log(`- Expected ADG: ~1.43 (+2%)`);
console.log(`- Actual ADG: ${angHer?.adg_feedlot.toFixed(3)}`);

// B. High (Angus x Charolais)
const angCha = BreedManager.calculateHybrid('CHA', 'ANG'); // Sire Charolais
// Avg ADG: (1.5 + 1.4)/2 = 1.45. Heterosis ~5% (Continental x British) -> ADG Boost ~7.5%
console.log(`Charolais x Angus (Continental x British):`);
console.log(`- Expected ADG: ~1.55 (+7.5%)`);
console.log(`- Actual ADG: ${angCha?.adg_feedlot.toFixed(3)}`);

// C. Max (Brahman x Angus)
const braAng = BreedManager.calculateHybrid('BRA', 'ANG');
// Heterosis ~12% (Indicus x Taurus) -> ADG Boost ~18%
console.log(`Brahman x Angus (Indicus x British):`);
console.log(`- Actual ADG: ${braAng?.adg_feedlot.toFixed(3)}`);

// 2. Trait Specificity (Marbling)
console.log("\n--- Heterosis en Marmoleo (Aditivo) ---");
const wagRet = BreedManager.calculateHybrid('WAG', 'RET');
// Wagyu (5) x Retinta (3). Avg = 4. 
// Heterosis should be ZERO for marbling. Maternal bonus if Retinta dam (No, Retinta is <4).
console.log(`Wagyu x Retinta:`);
console.log(`- Sire Marbling: 5, Dam Marbling: 3`);
console.log(`- Target: 4.0 (No heterosis inflation)`);
console.log(`- Result: ${wagRet?.marbling_potential.toFixed(2)}`);

// 3. Maternal Constraint (Uterine Crowding)
console.log("\n--- Restricción Uterina (Maternal Constraint) ---");
// Charolais (Giant) x Betizu (Tiny)
const chaBet = BreedManager.calculateHybrid('CHA', 'BET');
const betCha = BreedManager.calculateHybrid('BET', 'CHA'); // Reciprocal (Tiny Sire, Giant Dam - No constraint)

console.log(`Charolais (1100kg) x Betizu (325kg):`);
console.log(`- Ratio: ${(1100 / 325).toFixed(2)} (Extreme)`);
console.log(`- Penalized ADG (Constraint): ${chaBet?.adg_feedlot.toFixed(3)}`);

console.log(`Betizu x Charolais (Reciprocal):`);
console.log(`- No Constraint ADG: ${betCha?.adg_feedlot.toFixed(3)}`);
console.log(`- Diff Impact: ${((betCha!.adg_feedlot - chaBet!.adg_feedlot)).toFixed(3)} kg/day loss`);

