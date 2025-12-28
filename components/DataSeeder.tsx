import React, { useEffect, useRef } from 'react';
import { useStorage } from '@/context/StorageContext';
import { EventManager } from '@/services/eventManager';

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

        const targetOxenCrotals = ['ES104332181960', 'ES338908386379', 'ES026542351161'];
        const targetCowsCrotals = ['ES000000000001', 'ES000000000002', 'ES000000000003', 'ES000000000004'];

        let changed = false;

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

        const shouldRunEnrichment = (isFreshImport || hasBadData) && !seededRef.current;

        if (shouldRunEnrichment && !changed) {
            console.log("Starting Data Enrichment & Reparation Engine...");
            // RESET EVENTS for clean regeneration if we are repairing bad data
            if (hasBadData) {
                console.log("Bad data detected - Wiping events for fresh regeneration.");
                events = [];
            }
            let historyEvents: any[] = [...events];

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

            // 3. CORE: Biomimetic History Generator (Forward Simulation)
            const generateBiomimeticHistory = (animal: any) => {
                const birthDate = new Date(animal.birthDate || animal.birth);
                const now = new Date();

                // A. Genetic Potential (Base Gain per Day)
                // Limousin/Cross standard: 0.7 to 1.2 kg/day depending on genetics
                // We assign a fixed "Genetic Factor" to this animal if not already present? 
                // For now, deterministic random based on clean ID or just Math.random() since it's a seed.
                // Let's make it slighty random but consistent if we re-ran strictly (which we don't here).
                const geneticBase = 0.85 + (Math.random() * 0.35); // Range: 0.85 - 1.20 kg/day

                const birthWeight = 40;
                let simWeight = birthWeight;
                let currentDate = new Date(birthDate);

                // Start simulation from birth
                const months: any[] = [];

                while (currentDate < now) {
                    const m = currentDate.getMonth();
                    const ageMonths = (currentDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

                    // State Factor
                    let stateFactor = 1.0;
                    if (ageMonths < 12) stateFactor = 1.4; // Rapid juvenile growth
                    else if (ageMonths > 72) stateFactor = 0.9; // Senior slow down

                    // Pregnancy/Lactation Logic
                    if ((animal.category === 'Vaca' || animal.category === 'Nodriza') && ageMonths > 24) {
                        const cyclePos = ageMonths % 14;
                        if (cyclePos < 9) stateFactor = 1.1; // Pregnant (gaining mass)
                        else stateFactor = 0.8; // Lactating (energy drain)
                    }

                    const climatic = getClimateFactor(m);
                    const diet = getDietFactor(animal, m, ageMonths);

                    const combinedFactor = stateFactor * climatic * diet;
                    const daysInMonth = 30.44;
                    const monthlyGain = geneticBase * combinedFactor * daysInMonth;

                    simWeight += monthlyGain;

                    // Track for events
                    months.push({ date: new Date(currentDate), m, diet, simWeight });
                    currentDate.setMonth(currentDate.getMonth() + 1);
                }

                // B. Generate Events from Timeline
                months.forEach((step, idx) => {
                    // Add periodic weighing or significant diet change events
                    const isMontaneraStart = step.m === 9 && step.diet === 1.5;
                    const isMontaneraEnd = step.m === 1 && step.diet === 1.5;
                    const isYearlyCheck = step.date.getMonth() === 5; // June check

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
                            desc: `Pesaje de Control: ${Math.floor(step.simWeight)}kg`,
                            weight: Math.floor(step.simWeight),
                            status: 'completed'
                        });
                    }
                });

                // C. UPDATE ANIMAL STATE (Emergent Property)
                const finalWeight = Math.floor(simWeight);
                animal.currentWeight = finalWeight;
                animal.weight = finalWeight; // Update base prop too for consistency

                // Final Weighing Event
                historyEvents.push({
                    id: generateUUID(),
                    type: 'Pesaje',
                    animalId: animal.id,
                    animalCrotal: animal.crotal || animal.id,
                    date: new Date().toISOString().split('T')[0],
                    desc: `Pesaje Actual (Recalculado): ${finalWeight}kg`,
                    weight: finalWeight,
                    status: 'completed'
                });
            };

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
                        // Only persist Ghost Calves active in the last 18 months
                        const isRecent = (now.getTime() - exitDate.getTime()) < (1000 * 60 * 60 * 24 * 30 * 18);

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
                                breed: (cow.breed === 'Limousin' || cow.breed === 'Limousina') ? 'Limousin' : `F1 ${cow.breed || 'Cruzada'} x Limousin`,
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
                            generateBiomimeticHistory(ghostCalf);
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
            animals.forEach(animal => {
                // Skip if it's the external sire (don't manage his weight history)
                if (animal.id === bullId && animal.name === 'Toro Externo') return;

                // Only run for those we haven't just generated ghost history for (optimization?)
                // Actually, safer to just run for everyone to ensure consistency.
                if (!animal.isGhost) {
                    generateBiomimeticHistory(animal);
                }
            });

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

        // 5. Sanitation: Dedup & Event Consistency
        const uniqueAnimalsMap = new Map();
        animals.forEach(a => {
            uniqueAnimalsMap.set(a.id, a);
        });

        let statusChanged = false;
        const activeEvents = ['Sacrificio', 'Muerte', 'Venta', 'Salida'];
        const cleanAnimals = Array.from(uniqueAnimalsMap.values()).map((a: any) => {
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

        // Detect if we removed duplicates or changed statuses
        if (cleanAnimals.length !== animals.length) {
            console.log(`Removed ${animals.length - cleanAnimals.length} duplicates.`);
            changed = true;
        }

        if (changed || fincasChanged || statusChanged) {
            write(animalsKey, cleanAnimals);
            write(fincasKey, fincas);
            write('events', events);
            console.log('Advanced Data Seeding & Migration Completed');
        }

        seededRef.current = true;
    }, [isLoaded, read, write]);

    return null;
}
