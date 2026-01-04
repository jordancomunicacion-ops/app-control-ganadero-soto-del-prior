
import { SoilEngine } from './services/soilEngine';
import { BreedManager } from './services/breedManager';
import { MarketData } from './services/marketData';
import { LifecycleEngine } from './services/lifecycleEngine';
import { SigpacService } from './services/sigpacService';
import { WeatherService } from './services/weatherService';
import { CarcassEngine } from './services/carcassEngine';
import { NutritionEngine } from './services/nutritionEngine';

async function runSimulation() {
    console.log('--- 🚀 DEEP LEGACY LOGIC VERIFICATION ---');

    // 1. Breed & Heterosis
    console.log('\n--- 1. BREED & HETEROSIS ---');
    const lim = BreedManager.getBreedById('LIM');
    const bra = BreedManager.getBreedById('BRA');
    console.log(`Sire: ${lim?.name}, Dam: ${bra?.name}`);

    // Create Hybrid
    const hybrid = BreedManager.calculateHybrid('LIM', 'BRA');
    if (hybrid) {
        console.log(`✅ Hybrid Created: ${hybrid.name} (Code: ${hybrid.code})`);
        console.log(`   Heterosis Gain: ADG Feedlot ${hybrid.adg_feedlot.toFixed(2)} (vs Avg ${((lim!.adg_feedlot + bra!.adg_feedlot) / 2).toFixed(2)})`);
        console.log(`   Heat Tolerance: ${hybrid.heat_tolerance} (Matches Brahman)`);
    }

    // 2. Nutrition & Bellota
    console.log('\n--- 2. NUTRITION & BELLOTA ---');
    const animal = { ageMonths: 15, weight: 450, sex: 'Macho' };

    // Check Bellota (Month 10 = November)
    const bellotaCheck = NutritionEngine.checkBellotaCompliance(animal, 10);
    console.log(`Bellota Check (Nov, 15m): ${bellotaCheck.compliant ? '✅ Compliant' : '❌ Failed'}`);

    // Requirements
    const reqs = NutritionEngine.calculateRequirements(450, 1.2, 15, 'Cebo');
    console.log(`Requirements (450kg, Cebo): PB ${reqs.pb_percent}%, EM ${reqs.em_mcal} Mcal`);

    // Nitrogen Balance
    const eco = NutritionEngine.calculateNitrogenBalance(450, 1.2, 14, 9.5); // 14% CP, 9.5kg DMI
    console.log(`Eco-Impact: N Excreted: ${eco.n_excreted_g}g/day (Eff: ${eco.efficiency_pct}%)`);

    // 3. Carcass & Yield
    console.log('\n--- 3. CARCASS & QUALITY ---');
    // Simulate finishing phase with High Energy
    const carcass = CarcassEngine.calculateCarcass(550, 18, hybrid!, 2.6, 1.3, { isBellota: true, hasLecithin: true, isOx: false });
    console.log(`Weight 550kg -> Carcass: ${carcass.carcass_weight}kg (Yield: ${carcass.rc_percent}%)`);
    console.log(`Marbling Score: ${carcass.marbling_score} (BMS ${carcass.bms})`);
    console.log(`SEUROP: ${carcass.conformation} (Premium: ${carcass.is_premium})`);
    console.log(`Synergy Bonus: +${carcass.synergy_bonus_applied} (Bellota+Lecithin)`);

    // 4. Lifecycle & Events
    console.log('\n--- 4. LIFECYCLE AUTOMATION ---');
    const alerts = LifecycleEngine.getLifecycleAlerts({ birthDate: new Date(new Date().setMonth(new Date().getMonth() - 7)).toISOString(), sex: 'Macho', id: '123' } as any);
    alerts.forEach(a => console.log(`🔔 Alert: ${a.type} - ${a.desc}`));

    // 5. External Data
    console.log('\n--- 5. EXTERNAL DATA ---');
    console.log('Fetching SIGPAC (Mocked/Real)...');
    const parcel = await SigpacService.fetchParcelData(10, 31, 1, 1); // Caceres example
    if (parcel) console.log(`   SIGPAC: Pol ${parcel.poligono} Parc ${parcel.parcela} - ${parcel.use} (${parcel.area_ha} ha)`);

    console.log('Fetching Weather (Mocked/Real)...');
    if (parcel && parcel.coordinates) {
        const weather = await WeatherService.getCurrentWeather(parcel.coordinates.lat, parcel.coordinates.lon);
        if (weather) console.log(`   Weather: ${weather.weather_desc}, ${weather.temperature}°C`);
    }

    console.log('\n✅ SIMULATION COMPLETE');
}

runSimulation().catch(console.error);
