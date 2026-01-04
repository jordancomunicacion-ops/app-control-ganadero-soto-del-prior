import React, { useEffect, useRef } from 'react';
import { useStorage } from '@/context/StorageContext';
import { EventManager } from '@/services/eventManager';
import { CarcassQualityEngine } from '@/services/carcassQualityEngine';

export function DataSeeder() {
    const { read, write, isLoaded } = useStorage();
    const seededRef = useRef(false);

    useEffect(() => {
        if (!isLoaded) return;
        // removed seededRef check to ensure sanitation always runs on load

        const user = read<string>('appSession', '') || read<string>('sessionUser', '');
        if (!user) return;

        const animalsKey = `animals_${user}`;
        const fincasKey = `fincas_${user}`;
        let animals = read<any[]>(animalsKey, []);
        let events = read<any[]>('events', []);
        let fincas = read<any[]>(fincasKey, []);

        let changed = false;

        if (fincas.length === 0) {
            fincas.push({
                id: 'finca-default-001',
                name: 'SOTO del PRIOR',
                municipio: 'Guadalupe',
                municipioCode: '095',
                provinciaCode: '10', // Cáceres
                poligono: '1',
                parcela: '1',
                superficie: 153940, // ~15.39 ha
                recintos: [],
                coords: { lat: 39.452, lng: -5.332 }, // Guadalupe coords
                license: 'ES100950000001',
                maxHeads: 90,
                soilId: 'franco_arenoso',
                corrals: 4,
                feedingSystem: 'extensivo'
            });
            changed = true;
        }

        const targetOxenCrotals = ['ES104332181960', 'ES338908386379', 'ES026542351161'];
        const targetCowsCrotals = ['ES000000000001', 'ES000000000002', 'ES000000000003', 'ES000000000004'];



        const generateUUID = () => {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };

        const addEvent = (evt: any) => {
            if (!events.some(e => e.id === evt.id || (e.type === evt.type && e.date === evt.date && e.animalCrotal === evt.animalCrotal))) {
                events.push(evt);
                changed = true;
            }
        };

        // --- 1. ENRICHMENT ENGINE (HISTORICAL & GENEALOGICAL SIMULATION) ---

        // --- 1. ENRICHMENT ENGINE (HISTORICAL & GENEALOGICAL SIMULATION) ---

        // CHECK FOR REPARATION NEEDED:
        // 1. Fresh Import (animals > 0, events = 0)
        // 2. Wrong Farm Name (needs 'SOTO del PRIOR')
        // 3. Misclassified Bueyes (Name has 'Buey' but category is 'Toro')
        // CHECK FOR REPARATION NEEDED:
        // 1. Fresh Import
        // 2. Wrong Farm Name
        // 3. Misclassified Bueyes
        // 4. WRONG SIRE BREED (Must be Limousin)
        // 5. GENETICS UPDATE (Force update if we find 'Cruzada' ghosts that should be F1)
        // 6. WRONG SIRE NAME (TORO_CHA -> TORO_LIM)
        // CHECK FOR REPARATION NEEDED:
        // 1. Fresh Import
        // 2. Wrong Farm Name
        // 3. Misclassified Bueyes
        // 4. WRONG SIRE BREED (Must be Limousin)
        // 5. GENETICS UPDATE (Force update if we find 'Cruzada' ghosts that should be F1)
        // 6. WRONG SIRE NAME (TORO_CHA -> TORO_LIM)
        // 7. OXEN PATERNITY (Detect if any animal has a father that is a known Ox)
        const oxenSetRaw = new Set(animals.filter(a => a.category === 'Buey' || a.sex === 'Castrado' || (a.name && a.name.toLowerCase().includes('buey'))).map(a => a.id));
        const hasBadData = animals.some(a =>
            a.farm !== 'SOTO del PRIOR' ||
            (a.name && a.name.toLowerCase().includes('buey') && a.category !== 'Buey') ||
            ((a.category === 'Semental' || (a.sex === 'Macho' && a.category === 'Toro' && !a.name.toLowerCase().includes('buey'))) && (a.breed !== 'Limousin' || a.name.includes('TORO_CHA'))) ||
            (a.isGhost && a.breed === 'Cruzada' && a.fatherId) ||
            (a.fatherId && oxenSetRaw.has(a.fatherId)) || // TRIGGER IF invalid father found
            events.some(e => e.desc && (e.desc.includes('TORO_CHA') || e.desc.includes('Charolais'))) // TRIGGER IF old bull name in events
        );
        const isFreshImport = animals.length > 0 && events.length === 0; // Loose check for events

        const isSeededStorage = read<string>('isSeeded_V10', 'false') === 'true'; // Forced V10 for cleanup

        // Trigger if not seeded OR if we detect massive duplication (Safety Valve)
        const ghostCount = animals.filter(a => a.isGhost).length;
        const totalCount = animals.length;
        const isDuplicatesDetected = totalCount > 100 && ghostCount > (totalCount * 0.8);

        const shouldRunEnrichment = !isSeededStorage || isDuplicatesDetected;

        if (shouldRunEnrichment && !changed) {
            console.log("Starting Data Enrichment & Reparation Engine V3 (Weight Recalc)...");
            // RESET EVENTS for clean regeneration if we are repairing bad data
            if (hasBadData) {
                console.log("Bad data detected - Wiping events for fresh regeneration.");
                events = [];
            }
            let historyEvents: any[] = [...events];

            // 0. EMERGENCY PURGE (Before any processing to prevent crash)
            if (isDuplicatesDetected) {
                console.warn("CRITICAL: Massive duplication detected. Purging ghosts immediately.");
                const real = animals.filter(a => !a.isGhost);
                // Keep only last 50 ghosts to be safe, or just 0
                const ghosts = animals.filter(a => a.isGhost).slice(-20);
                animals = [...real, ...ghosts];
                console.log("Purge Result: Reduced animals to " + animals.length);

                // Deep clean events too
                events = events.slice(-500); // Keep last 500
                write('events', events);
                write('isSeeded_V5', 'true');
            }

            // 1. PRE-CLEANUP: FIX NAMES, CATEGORIES & FARM

            // 0. PRE-CLEANUP: FIX NAMES, CATEGORIES & FARM
            const oxenIds = new Set<string>(); // Gather known oxen IDs first
            animals.forEach(a => {
                if (a.category === 'Buey' || a.sex === 'Castrado' || (a.name && a.name.toLowerCase().includes('buey'))) {
                    oxenIds.add(a.id);
                }
            });

            animals.forEach(a => {
                // Fix Farm Name
                a.farm = 'SOTO del PRIOR';
                a.farmId = 'F0SOTO';

                // Fix Oxen (Bueyes)
                if ((a.name && a.name.toLowerCase().includes('buey')) ||
                    (a.type && a.type.toLowerCase().includes('buey')) ||
                    (a.observation && a.observation.toLowerCase().includes('buey'))) {
                    a.category = 'Buey';
                    a.sex = 'Castrado';
                    oxenIds.add(a.id); // Add to set if found here
                }

                // Fix Sire Breed -> Limousin AND Name Consistency
                if ((a.category === 'Semental' || (a.sex === 'Macho' && a.category === 'Toro')) &&
                    a.category !== 'Buey' && a.sex !== 'Castrado') {
                    a.breed = 'Limousin';
                    if (a.name && a.name.includes('TORO_CHA')) {
                        a.name = a.name.replace('TORO_CHA', 'TORO_LIM');
                    }
                }

                // STRICT PARENT CLEANUP: Remove Father if he is a Buey
                if (a.fatherId && oxenIds.has(a.fatherId)) {
                    console.log(`Clearing invalid paternity: ${a.id} had Ox father ${a.fatherId}`);
                    a.fatherId = null;
                    a.father = null;
                }

                // FIX: Remove double F1 in breed name and apply F2 nomenclature
                if (a.breed && (a.breed.includes('F1 F1') || a.breed.match(/F1.*F1/))) {
                    a.breed = a.breed.replace(/F1 F1/g, 'F2').replace(/F1.*F1/g, 'F2');
                }
            });

            // A. IDENTIFY SIRE (SEMENTAL)
            // STRICTER FILTER: Must NOT be Buey/Castrado
            // STRICTER FILTER: Must NOT be Buey/Castrado
            let bull = animals.find(a => (a.category === 'Semental' || (a.sex === 'Macho' && a.category === 'Toro'))
                && a.category !== 'Buey' && a.sex !== 'Castrado');
            if (!bull) {
                // Fallback: Find oldest male > 24m that is NOT castrated
                bull = animals.find(a => a.sex === 'Macho' && a.category !== 'Buey' && a.sex !== 'Castrado' &&
                    (new Date().getFullYear() - new Date(a.birthDate || a.birth).getFullYear()) > 2);
            }
            const bullId = bull ? bull.id : 'unknown_bull';
            // User requested CROTAL for genealogy display instead of Name
            const bullName = bull ? (bull.crotal || bull.name) : 'Toro Externo';
            console.log(`Sire identified: ${bullName}`);

            // A.1 Helper for Realistic IDs
            const generateRealisticCrotal = () => {
                const region = '08'; // Example region
                const numbers = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
                return `ES${region}${numbers}`;
            };

            // --- BIOMIMETIC SIMULATION ENGINE (Reverse-Engineered Metadata) ---

            // 1. HELPER: Climate Factor (Seasonality)
            const getClimateFactor = (month: number) => {
                // Month 0=Jan, 11=Dec.
                // Spring (Mar-May): Lush Pasture (1.2)
                if (month >= 2 && month <= 4) return 1.2;
                // Summer (Jun-Aug): Dry/Heat (0.8)
                if (month >= 5 && month <= 7) return 0.8;
                // Autumn (Sep-Nov): Recovery (1.0)
                if (month >= 8 && month <= 10) return 1.0;
                // Winter (Dec-Feb): Cold (0.9)
                return 0.9;
            };

            // 2. HELPER: Diet Factor
            const getDietFactor = (animal: any, month: number, ageMonths: number) => {
                // Montanera (Oxen Only): Oct-Feb (Months 9,10,11, 0,1)
                const isMontaneraSeason = (month >= 9 || month <= 1);
                const isOx = animal.category === 'Buey' || (animal.sex === 'Macho' && animal.status === 'Castrado');

                if (isOx && isMontaneraSeason && ageMonths > 18) return 1.5; // High gain on acorns
                if (animal.farm && animal.farm.includes('Feedlot')) return 1.3; // Intensive
                return 1.0; // Standard Pasture
            };

            // 3. CORE: Biomimetic History Generator (Forward Simulation with Asymptotic Limit)
            const generateBiomimeticHistory = (animal: any) => {
                // SAFETY CHECK: If animal already has valid history and realistic weight, DO NOT OVERWRITE.
                // This prevents "magic changes" without user request.
                if (animal.monthlyRecords && animal.monthlyRecords.length > 0 && animal.currentWeight > 80 && animal.currentWeight < 1600) {
                    return;
                }

                const birthDate = new Date(animal.birthDate || animal.birth);
                const now = new Date();

                // DETERMINE GENETIC LIMITS (Asymptote)
                let adultWeight = 650; // Default Cow
                if (animal.sex === 'Macho') adultWeight = 1100; // Bull
                if (animal.category === 'Buey' || animal.sex === 'Castrado') adultWeight = 1400; // Ox

                // Adjust for F1/Breed
                if (animal.breed === 'Limousin' || animal.breed === 'Limousina') {
                    adultWeight *= 1.1; // Larger
                } else if (animal.breed === 'Morucha' || animal.breed === 'Avileña' || animal.breed === 'Retinta') {
                    adultWeight *= 0.95; // Rustic slightly smaller
                }

                const birthWeight = 40;
                let simWeight = birthWeight;
                let currentDate = new Date(birthDate);

                // Initialize records
                if (!animal.monthlyRecords) animal.monthlyRecords = [];
                const newRecords: any[] = [];

                // Start simulation from birth
                const months: any[] = [];

                // Growth Rate (k)
                const k = 0.045; // Approx monthly growth rate coefficient

                while (currentDate < now) {
                    const m = currentDate.getMonth();
                    const ageMonths = (currentDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

                    // State Factor
                    let stateFactor = 1.0;

                    // Pregnancy/Lactation Logic
                    if ((animal.category === 'Vaca' || animal.category === 'Nodriza') && ageMonths > 24) {
                        const cyclePos = ageMonths % 14;
                        if (cyclePos < 9) stateFactor = 1.05; // Pregnant
                        else stateFactor = 0.95; // Lactating loss
                    }

                    const climatic = getClimateFactor(m);
                    const diet = getDietFactor(animal, m, ageMonths); // Diet Factor (1.0 - 1.5)

                    // Approximate Diet Energy Mcal
                    const dietEnergy = 2.0 + ((diet - 1.0) * 1.8);

                    // --- VON BERTALANFFY GROWTH ---
                    // Potential Gain based on distance to Adult Weight
                    // Slows down as it approaches limit
                    const remainingGrowth = adultWeight - simWeight;
                    // If negative (overshoot), we lose weight (maintenance cost dominant)

                    let monthlyGain = 0;
                    if (remainingGrowth > 0) {
                        monthlyGain = remainingGrowth * k * diet * climatic * stateFactor;
                    } else {
                        // Maintenance / Fluctuation mode
                        // Can lose weight in bad climate/diet
                        if (diet < 1.0 || climatic < 1.0) {
                            monthlyGain = -15 + (diet * 10) + (climatic * 5); // Loss
                        } else {
                            monthlyGain = 5; // Slow creep or fat deposit
                        }
                    }

                    // Cap monthly gain to realistic bio limits (e.g., max 60kg/month = 2kg/day)
                    if (monthlyGain > 60) monthlyGain = 60;

                    simWeight += monthlyGain;
                    if (simWeight < 40) simWeight = 40; // Floor

                    // METRICS CALCULATION (Using Fixed Logic)
                    // 1. Estimate Carcass (Yield)
                    const thi = (m >= 5 && m <= 8) ? 78 : 65;
                    const breedData = {
                        rc_base: 0.58,
                        marbling_potential: 4,
                        adg_feedlot: 1.2
                    };
                    const adgObs = monthlyGain / 30.44;

                    const carcass = CarcassQualityEngine.estimateCarcassResult(
                        { ageMonths, system: 'Extensivo', sex: animal.sex },
                        simWeight, adgObs, dietEnergy, thi, breedData
                    );

                    // 2. Calculate Quality
                    const quality = CarcassQualityEngine.calculateQualityIndex(
                        { ageMonths, currentWeight: simWeight, sex: animal.sex, rc_percent: carcass.rc_percent },
                        breedData,
                        dietEnergy,
                        adgObs,
                        thi,
                        150,
                        0,
                        1,
                        { isBellota: diet > 1.2, hasLecithin: diet > 1.2 }
                    );

                    months.push({ date: new Date(currentDate), m, diet, simWeight, adgObs, carcass, quality, dietEnergy, thi });

                    newRecords.push({
                        date: new Date(currentDate).toISOString().split('T')[0],
                        weightKg: Math.floor(simWeight),
                        adg: parseFloat(adgObs.toFixed(2)),
                        rc_est: carcass.rc_percent,
                        carcass_weight_est: carcass.carcass_weight,
                        meat_quality_index: quality.iq_score,
                        marbling_est: quality.marbling_est,
                        diet_energy: parseFloat(dietEnergy.toFixed(2)),
                        thi: thi
                    });

                    currentDate.setMonth(currentDate.getMonth() + 1);
                }

                // Update Animal Records
                animal.monthlyRecords = newRecords;

                // B. Generate Events from Timeline
                months.forEach((step, idx) => {
                    const isMontaneraStart = step.m === 9 && step.diet === 1.5;
                    const isMontaneraEnd = step.m === 1 && step.diet === 1.5;
                    const isYearlyCheck = step.date.getMonth() === 5;

                    if (isMontaneraStart) {
                        historyEvents.push({
                            id: generateUUID(),
                            type: 'Alimentación',
                            animalId: animal.id,
                            animalCrotal: animal.crotal || animal.id,
                            date: step.date.toISOString().split('T')[0],
                            desc: 'Inicio Montanera (Bellota).',
                            cost: 120,
                            status: 'completed'
                        });
                    }

                    if (isYearlyCheck || isMontaneraEnd) {
                        historyEvents.push({
                            id: generateUUID(),
                            type: 'Pesaje',
                            animalId: animal.id,
                            animalCrotal: animal.crotal || animal.id,
                            date: step.date.toISOString().split('T')[0],
                            desc: `Pesaje de Control: ${Math.floor(step.simWeight)}kg (Grasa: ${step.quality.marbling_est})`,
                            weight: Math.floor(step.simWeight),
                            status: 'completed'
                        });
                    }
                });

                // C. UPDATE ANIMAL STATE (Emergent Property)
                const finalWeight = Math.floor(simWeight);
                animal.currentWeight = finalWeight;
                animal.weight = finalWeight;

                const lastStep = months[months.length - 1];

                historyEvents.push({
                    id: generateUUID(),
                    type: 'Pesaje',
                    animalId: animal.id,
                    animalCrotal: animal.crotal || animal.id,
                    date: new Date().toISOString().split('T')[0],
                    desc: `Pesaje Actual (Recalculado V6): ${finalWeight}kg. SEUROP: ${lastStep?.carcass.rc_percent}%`,
                    weight: finalWeight,
                    status: 'completed'
                });
            };

            // B. PROCESS COWS (MATERNA) - REPRODUCTION EVENTS ONLY
            // ... (Rest of code remains similar) ...

            // ... (Code cut for brevity of replace block, resuming at critical sections if needed, but ReplaceFileContent requires contiguous block. Checking context lines.)
            // The user wanted simple fix. I will replace the function body of generateBiomimeticHistory up to line 375.

            // Wait, I need to match exact lines to replace correctly.
            // I will use `replace_file_content` but I must be careful with the huge block.
            // Actually, I can just replace the whole logic block which is isolated. 
            // The file view shows lines 222 to 375 is `generateBiomimeticHistory`.

            // I will return the replacement now.
            // Also need to fix the write('isSeeded_V4', 'true') at line 696 to V6.


            // B. PROCESS COWS (MATERNA) - REPRODUCTION EVENTS ONLY
            // (We separate Reproduction from Weight to keep logic clean, then run weight for ALL)
            const cows = animals.filter(a => (a.category === 'Vaca' || a.category === 'Vaca Nodriza' || a.sex === 'Hembra') &&
                (new Date().getTime() - new Date(a.birthDate || a.birth).getTime()) > (1000 * 60 * 60 * 24 * 365 * 2));

            cows.forEach(cow => {
                const cowBirth = new Date(cow.birthDate || cow.birth);
                let cycleDate = new Date(cowBirth);
                cycleDate.setMonth(cycleDate.getMonth() + 24); // First mating at 24m

                const now = new Date();
                let cycleCount = 1;

                while (cycleDate < now) {
                    // 1. Mating Event
                    const matingDate = new Date(cycleDate);
                    historyEvents.push({
                        id: generateUUID(),
                        type: 'Monta Natural',
                        animalId: cow.id,
                        animalCrotal: cow.crotal,
                        date: matingDate.toISOString().split('T')[0],
                        desc: `Monta Natural con ${bullName} (Ciclo ${cycleCount})`,
                        typeData: { bullId: bullId },
                        status: 'completed'
                    });

                    // 2. Calving (283 days later)
                    const calvingDate = new Date(matingDate);
                    calvingDate.setDate(calvingDate.getDate() + 283);

                    if (calvingDate > now) {
                        // Future Calving - Schedule Event
                        historyEvents.push({
                            id: generateUUID(),
                            type: 'Parto Previsto',
                            animalId: cow.id,
                            animalCrotal: cow.crotal,
                            date: calvingDate.toISOString().split('T')[0],
                            desc: `Parto estimado (Ciclo ${cycleCount})`,
                            status: 'scheduled'
                        });
                        break;
                    }

                    // 3. Offspring Handling
                    const calfMatch = animals.find(c => {
                        if (c.id === bullId) return false;
                        const cBirth = new Date(c.birthDate || c.birth);
                        const diffTime = Math.abs(cBirth.getTime() - calvingDate.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return diffDays <= 45 && !c.motherId;
                    });

                    if (calfMatch) {
                        calfMatch.motherId = cow.id;
                        calfMatch.fatherId = bullId;
                        calfMatch.father = bullName;

                        historyEvents.push({
                            id: generateUUID(),
                            type: 'Parto',
                            animalId: cow.id,
                            animalCrotal: cow.crotal,
                            date: calvingDate.toISOString().split('T')[0],
                            desc: `Parto ${cycleCount}: ${calfMatch.sex} (${calfMatch.crotal}) - ACTIVO`,
                            typeData: { calfId: calfMatch.id, calfCrotal: calfMatch.crotal },
                            status: 'completed'
                        });

                        if (!historyEvents.some(e => e.animalId === calfMatch.id && e.type === 'Nacimiento')) {
                            historyEvents.push({
                                id: generateUUID(),
                                type: 'Nacimiento',
                                animalId: calfMatch.id,
                                animalCrotal: calfMatch.crotal,
                                date: calfMatch.birthDate || calvingDate.toISOString().split('T')[0],
                                desc: `Nacimiento en finca. Madre: ${cow.crotal}, Padre: ${bullName}`,
                                status: 'completed'
                            });
                        }
                    } else {
                        // GHOST CALF
                        const isFemale = Math.random() > 0.5;
                        const ghostId = generateRealisticCrotal();
                        const fate = Math.random() > 0.3 ? 'Sacrificado' : 'Vendido';
                        const exitMonths = fate === 'Sacrificado' ? 14 : 6;
                        const exitDate = new Date(calvingDate);
                        exitDate.setMonth(exitDate.getMonth() + exitMonths);
                        if (exitDate > now) exitDate.setTime(now.getTime() - (1000 * 60 * 60 * 24 * 10));

                        // OPTIMIZATION: STORAGE QUOTA PROTECTION
                        // Only persist Ghost Calves active in the last 12 months (Strict)
                        const isRecent = (now.getTime() - exitDate.getTime()) < (1000 * 60 * 60 * 24 * 30 * 12);

                        let slaughterData = {};
                        if (fate === 'Sacrificado') {
                            const cw = 280 + (Math.random() * 100);
                            slaughterData = {
                                carcassWeight: cw.toFixed(1),
                                price: (cw * 5.2).toFixed(2),
                                pricePerKg: 5.2,
                                conf: ['U', 'R', 'O'][Math.floor(Math.random() * 3)],
                                fat: ['2', '3', '4'][Math.floor(Math.random() * 3)]
                            };
                        }

                        if (isRecent) {
                            const ghostCalf = {
                                id: ghostId,
                                crotal: ghostId,
                                name: `(H) ${isFemale ? 'Novilla' : 'Ternero'} ${cycleCount}`,
                                farm: cow.farm || 'SOTO del PRIOR',
                                breed: (cow.breed === 'Limousin' || cow.breed === 'Limousina') ? 'Limousin' :
                                    (cow.breed && cow.breed.includes('F1')) ? `F2 ${cow.breed.replace('F1', '').trim()} x Limousin` :
                                        `F1 ${cow.breed || 'Cruzada'} x Limousin`,
                                sex: isFemale ? 'Hembra' : 'Macho',
                                birthDate: calvingDate.toISOString().split('T')[0],
                                motherId: cow.id,
                                fatherId: bullId,
                                father: bullName,
                                status: fate,
                                exitDate: exitDate.toISOString().split('T')[0],
                                ...slaughterData,
                                isGhost: true
                            };
                            animals.push(ghostCalf);
                            changed = true;

                            // Only generate full history for persisted ghosts
                            // generateBiomimeticHistory(ghostCalf); // DISABLED BY USER REQUEST
                        }

                        historyEvents.push({
                            id: generateUUID(),
                            type: 'Parto',
                            animalId: cow.id,
                            animalCrotal: cow.crotal,
                            date: calvingDate.toISOString().split('T')[0],
                            desc: `Parto ${cycleCount}: ${isFemale ? 'Hembra' : 'Macho'} (${ghostId}) - ${fate} ${!isRecent ? '(Histórico)' : ''}`,
                            typeData: { calfCrotal: ghostId },
                            status: 'completed'
                        });
                    }

                    cycleDate.setMonth(cycleDate.getMonth() + 13);
                    cycleCount++;
                }
            });

            // C. RUN BIO-WEIGHT SIMULATION FOR ALL ACTIVE ANIMALS
            /* DISABLED BY USER REQUEST - REAL DATA MODE
            animals.forEach(animal => {
                // Skip if it's the external sire (don't manage his weight history)
                if (animal.id === bullId && animal.name === 'Toro Externo') return;

                // Only run for those we haven't just generated ghost history for (optimization?)
                // Actually, safer to just run for everyone to ensure consistency.
                if (!animal.isGhost) {
                    generateBiomimeticHistory(animal);
                }
            });
            */

            console.log("Bio-Simulation Complete.");
            // Clean duplicates just in case
            const uniqueids = new Set();
            const uniqueEvents = [];
            for (const e of events.reverse()) { // keep latest?
                if (!uniqueids.has(e.id)) {
                    uniqueids.add(e.id);
                    uniqueEvents.push(e);
                }
            }
            events.length = 0;
            events.push(...uniqueEvents.reverse());

            changed = true;
            console.log("Enrichment Complete. Generated events:", events.length);
        }
        animals.forEach(a => {
            if (a.farm === 'Finca Soto del Prior') {
                a.farm = 'SOTO del PRIOR';
                changed = true;
            }
        });

        if (changed) {
            write(animalsKey, animals);
            write('events', events);
        }

        // 4. One-time Migration: Rename Farm Entity
        let fincasChanged = false;
        fincas.forEach(f => {
            if (f.name === 'Finca Soto del Prior') {
                f.name = 'SOTO del PRIOR';
                fincasChanged = true;
            }
        });

        // 5. Sanitation: Dedup by ID AND Name (Merge duplicates)
        const uniqueAnimalsMap = new Map();
        // First pass: unique by ID
        animals.forEach(a => {
            uniqueAnimalsMap.set(a.id, a);
        });

        // Second pass: unique by Name (keep latest) to fix "Double Seeding"
        const uniqueByName = new Map();
        Array.from(uniqueAnimalsMap.values()).forEach((a: any) => {
            const key = (a.name || 'unknown').trim().toUpperCase();
            // If exists, keep the one with more data or latest
            if (uniqueByName.has(key)) {
                const existing = uniqueByName.get(key);
                // Prefer the one with a real Crotal or ID
                if (!existing.crotal && a.crotal) {
                    uniqueByName.set(key, a);
                }
                // Or just overwrite if we assume later is better? 
                // Let's stick to keeping the first one encountered if we iterate backwards, or logic:
                // Actually, let's keep the one that looks "older" (real seed) vs new gen?
                // Simple logic: Overwrite.
                // uniqueByName.set(key, a); 
                // WAIT: If we have multiple "BUEY_MORU_01" with different IDs, we want to keep ONE.
            } else {
                uniqueByName.set(key, a);
            }
        });

        // Rebuild uniqueAnimalsMap from Unique Names (Aggressive Dedup)
        // Only do this for manually named animals (BUEY_, TORO_, VACA_)
        // UUID-named animals are likely distinct.
        const mergedAnimals = Array.from(uniqueAnimalsMap.values()).filter((a: any) => {
            const nameIdx = (a.name || '').toUpperCase();
            // If this animal is the "chosen one" in the name map, keep it.
            // But we need to be careful not to merge "Novilla 1" and "Novilla 1" if they are different cycles?
            // The issue refers to "BUEY_..." types likely.
            if (nameIdx.includes('BUEY') || nameIdx.includes('TORO') || nameIdx.includes('VACA')) {
                return uniqueByName.get(nameIdx).id === a.id;
            }
            return true;
        });

        let statusChanged = false;
        const activeEvents = ['Sacrificio', 'Muerte', 'Venta', 'Salida'];

        const cleanAnimals = mergedAnimals.map((a: any) => {
            // FIX: Ensure Crotal Exists AND is Valid
            const isFakeCrotal = a.crotal && a.crotal.startsWith('ES099');
            const hasValidId = a.id && a.id.startsWith('ES') && a.id.length > 10;

            if (!a.crotal || (isFakeCrotal && hasValidId)) {
                // 1. Check if ID is already a valid Crotal (ES...)
                if (hasValidId) {
                    a.crotal = a.id;
                } else if (!a.crotal) {
                    // 2. Generate deterministic fake crotal based on ID hash or random
                    const numericHash = a.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
                    const suffix = (numericHash % 10000).toString().padStart(4, '0');
                    // Use a clearly "Mock" range if we must
                    const rand = Math.floor(Math.random() * 9000) + 1000;
                    a.crotal = `ES099000${rand}`;
                }
            }
            // Check events for this animal
            const animalEvents = events.filter(e => e.animalId === a.id);

            // Find any "Exit" event
            const exitEvent = animalEvents.find(e => activeEvents.includes(e.type));

            // If exit event exists and is in the past/today, enforce status
            if (exitEvent) {
                const eventDate = new Date(exitEvent.date);
                const now = new Date();
                if (eventDate <= now) {
                    const oldStatus = a.status;
                    if (exitEvent.type.includes('Sacrificio')) a.status = 'Sacrificado';
                    else if (exitEvent.type === 'Muerte') a.status = 'Muerto';
                    else if (exitEvent.type === 'Venta') a.status = 'Vendido';

                    if (a.status !== oldStatus) statusChanged = true;
                    if (!a.exitDate) a.exitDate = exitEvent.date;
                }
            }
            return a;
        });

        // 6. AGGRESSIVE CLEANUP (Storage Protection)
        // Remove Ghost animals older than 12 months (reduced from 18)
        const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
        const nowMs = new Date().getTime();
        const prunedAnimals = cleanAnimals.filter(a => {
            if (!a.isGhost) return true;
            if (a.status === 'Activo') return true;
            const exitTime = new Date(a.exitDate || a.date || a.createdAt).getTime();
            return (nowMs - exitTime) < ONE_YEAR_MS;
        });

        // Prune monthlyRecords if excessive
        prunedAnimals.forEach(a => {
            if (a.monthlyRecords && a.monthlyRecords.length > 12) {
                a.monthlyRecords = a.monthlyRecords.slice(-12);
            }
        });

        if (cleanAnimals.length !== prunedAnimals.length) {
            console.log(`Pruned ${cleanAnimals.length - prunedAnimals.length} old ghost animals to save space.`);
            changed = true;
        }

        // Detect if we removed duplicates or changed statuses
        if (cleanAnimals.length !== animals.length) {
            console.log(`Removed ${animals.length - cleanAnimals.length} duplicates.`);
            changed = true;
        }

        // 7. EMERGENCY GHOST PURGE (Duplicate Storm Fix)
        if (cleanAnimals.filter(a => a.isGhost).length > 200) {
            console.warn("Detected Ghost Explosion. Purging ALL ghosts for safety reset.");
            // Keep only non-ghosts
            const onlyReal = cleanAnimals.filter(a => !a.isGhost);
            // Replace array
            cleanAnimals.length = 0;
            cleanAnimals.push(...onlyReal);
            changed = true;
        }

        if (changed || fincasChanged || statusChanged) {
            // First try to write isSeeded to prevent loop if main write fails
            write('isSeeded_V10', 'true');

            write(animalsKey, prunedAnimals);
            write(fincasKey, fincas);
            // Limit events to last 1000 if massive
            if (events.length > 1000) {
                events = events.slice(-1000);
                console.warn("Truncating events to last 1000 to prevent overflow.");
            }
            write('events', events);
            console.log('Advanced Data Seeding & Migration Completed');
        }

        seededRef.current = true;
    }, [isLoaded, read, write]);

    return null;
}
