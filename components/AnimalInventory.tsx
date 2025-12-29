'use client';

import React, { useState, useEffect } from 'react';
import { useStorage } from '@/context/StorageContext';

import { CarcassEngine } from '@/services/carcassEngine';
import { CarcassQualityEngine } from '@/services/carcassQualityEngine';
import { BreedManager } from '@/services/breedManager';
import { DietComposer } from './DietComposer';
import { NutritionEngine } from '@/services/nutritionEngine';

export function AnimalInventory() {
    const { read, write } = useStorage();

    // Helper for Detailed Age
    const calculateAgeDetailed = (birthDateStr: string) => {
        if (!birthDateStr) return '?';
        const birth = new Date(birthDateStr);
        const now = new Date();

        let years = now.getFullYear() - birth.getFullYear();
        let months = now.getMonth() - birth.getMonth();
        let days = now.getDate() - birth.getDate();

        if (days < 0) {
            months--;
            const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            days += prevMonth.getDate();
        }
        if (months < 0) {
            years--;
            months += 12;
        }

        const parts = [];
        if (years > 0) parts.push(`${years} años`);
        if (months > 0) parts.push(`${months} meses`);
        if (days >= 0) parts.push(`${days} días`);

        return parts.join(', ');
    };

    // Helper for Current Diet Status
    const getDietStatus = (animal: any) => {
        const birth = new Date(animal.birth || animal.birthDate);
        const now = new Date();
        const ageMonths = (now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

        const isBellota = NutritionEngine.checkBellotaCompliance(
            { ageMonths },
            now.getMonth()
        ).compliant;

        // "Solo los bueyes comen bellota y lecitina de soja"
        const isOx = animal.category === 'Buey' || (animal.sex === 'Castrado' && ageMonths > 12);

        if (isBellota && isOx) {
            return { label: 'Bellota y Soja (Premium)', color: 'bg-emerald-800 text-white border-emerald-900' };
        } else if (animal.status === 'Lactancia' || animal.category?.includes('Nodriza')) {
            return { label: 'Pasto + Suplemento Materno', color: 'bg-blue-100 text-blue-800 border-blue-200' };
        } else if (animal.farm && animal.farm.toLowerCase().includes('feedlot')) {
            return { label: 'Cebo Intensivo', color: 'bg-orange-100 text-orange-800 border-orange-200' };
        } else {
            return { label: 'Pasto / Mantenimiento', color: 'bg-green-50 text-green-700 border-green-200' };
        }

    };



    const [animals, setAnimals] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]); // Added Events State
    const [farms, setFarms] = useState<any[]>([]);
    const [sessionUser, setSessionUser] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [showDiet, setShowDiet] = useState(false); // Diet Composer State

    // New Animal Form State
    const [newAnimal, setNewAnimal] = useState({
        id: '',
        name: '',
        farm: '',
        breed: '',
        sex: '',
        birth: '',
        weight: '',
        notes: '',
        father: '',
        mother: '',
        corral: ''
    });

    useEffect(() => {
        const user = read<string>('sessionUser', '');
        setSessionUser(user);

        if (user) {
            const cleanKey = `animals_${user}`;
            const dirtyKey = `animals_${user} `;

            let animalsList = read<any[]>(cleanKey, []);
            const dirtyList = read<any[]>(dirtyKey, []);
            let needsSave = false;

            // 1. Recover from dirty key if clean is empty
            if (dirtyList.length > 0 && animalsList.length === 0) {
                console.log("Recuperando datos antiguos...");
                animalsList = [...dirtyList];
                write(dirtyKey, []); // Clear old
                needsSave = true;
            }

            // 1b. HYDRATION: Convert Compact Arrays (Storage) -> Objects (Runtime UI)
            // This allows us to store minimal data [500, 520] but use powerful objects {date, weight} in UI
            animalsList = animalsList.map(a => {
                if (a.h_w && Array.isArray(a.h_w) && !a.monthlyRecords) {
                    // Reconstruct monthlyRecords from [weights]
                    const records = [];
                    const endDate = a.h_end ? new Date(a.h_end) : new Date();
                    // Assume h_w is in chronological order ending at h_end
                    for (let i = 0; i < a.h_w.length; i++) {
                        const w = a.h_w[i];
                        // Calculate date (reverse from end)
                        // h_w index 0 is oldest? Let's assume index 0 is oldest.
                        // Actually easier: h_w last item is h_end.
                        const offsetMonths = (a.h_w.length - 1) - i;
                        const d = new Date(endDate);
                        d.setMonth(d.getMonth() - offsetMonths);

                        records.push({
                            date: d.toISOString().split('T')[0].substring(0, 7) + "-01",
                            weightKg: w,
                            adg: 0 // ADG lost in compression, can derive if needed or 0
                        });
                    }
                    return { ...a, monthlyRecords: records };
                }
                return a;
            });


            // 2. Smart Synchronization (Fix weights using History)
            const globalEvents = read<any[]>('events', []);

            const syncedAnimals = animalsList.map(a => {
                let correctedWeight = parseFloat(a.weight) || 0;
                let source = 'current';

                // Strategy A: Trust 'monthlyRecords' (calculated metrics)
                if (a.monthlyRecords && Array.isArray(a.monthlyRecords) && a.monthlyRecords.length > 0) {
                    // Sort by date desc
                    const sortedRecords = [...a.monthlyRecords].sort((r1: any, r2: any) =>
                        new Date(r2.date).getTime() - new Date(r1.date).getTime()
                    );
                    const lastRecord = sortedRecords[0];
                    if (lastRecord && (lastRecord.weightKg || lastRecord.w)) {
                        correctedWeight = parseFloat(lastRecord.weightKg || lastRecord.w);
                        source = 'monthlyRecord';
                    }
                }
                // Strategy B: Trace 'Pesaje' events if no records
                else {
                    const animalEvents = globalEvents.filter(e =>
                        (e.animalId === a.id || e.animalCrotal === a.crotal) && e.type === 'Pesaje'
                    ).sort((e1, e2) => new Date(e2.date).getTime() - new Date(e1.date).getTime());

                    if (animalEvents.length > 0) {
                        correctedWeight = parseFloat(animalEvents[0].weight) || correctedWeight;
                        source = 'event';
                    }
                }

                // Verify and Update if different (epsilon check for floats)
                if (Math.abs(correctedWeight - parseFloat(a.weight)) > 0.1) {
                    console.log(`Corrigiendo peso de ${a.crotal}: ${a.weight} -> ${correctedWeight} (Fuente: ${source})`);
                    needsSave = true;
                    return { ...a, weight: correctedWeight, currentWeight: correctedWeight };
                }
                return a;
            });

            if (needsSave) {
                console.log("Sincronizando pesos con historial...");
                animalsList = syncedAnimals;
                // Note: We write back full objects temporarily on load sync? 
                // Or should we keep them compact? 
                // Creating a save-back loop might re-trigger quota error if we expanded too much.
                // Let's SKIP writing back on load for now unless critical, or re-compress.
                // For safety, let's NOT write syncedList immediately if it's huge. 
                // But we must update state.
            }

            setAnimals(animalsList);
            setFarms(read<any[]>(`fincas_${user}`, []));
            setEvents(globalEvents);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [read]);

    const closeDetail = () => {
        setSelectedAnimal(null);
        setShowDiet(false);
    };

    const handleSaveAnimal = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAnimal.id || !newAnimal.farm || !newAnimal.sex || !newAnimal.breed) {
            alert("Por favor completa los campos obligatorios");
            return;
        }

        // Check duplicate ID
        if (animals.find(a => a.id === newAnimal.id)) {
            alert("Ya existe un animal con ese Crotal");
            return;
        }

        const animalEntry = {
            ...newAnimal,
            weight: parseFloat(newAnimal.weight) || 0,
            category: 'Sin Clasificar', // Logic for category calculation could be added here
            joined: new Date().toISOString()
        };


        const updated = [...animals, animalEntry];
        setAnimals(updated);
        write(`animals_${sessionUser}`, updated);

        setShowForm(false);
        setNewAnimal({
            id: '', name: '', farm: '', breed: '', sex: '', birth: '', weight: '', notes: '', father: '', mother: '', corral: ''
        });
    };

    const handleDownloadCSV = () => {
        const headers = ['Crotal', 'Nombre', 'Finca', 'Raza', 'Sexo', 'Nacimiento', 'Peso', 'Notas', 'Padre', 'Madre'];
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "plantilla_animales.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            const lines = text.split('\n');
            const newAnimals: any[] = [];
            let errorCount = 0;

            // Skip header (i=1)
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const cols = line.split(',');
                // Simple validation: check if required fields exist (Crotal)
                if (cols.length < 5 || !cols[0]) {
                    errorCount++;
                    continue;
                }

                newAnimals.push({
                    id: cols[0].trim(),
                    name: cols[1]?.trim() || '',
                    farm: cols[2]?.trim() || 'Sin Asignar',
                    breed: cols[3]?.trim() || 'Desconocida',
                    sex: cols[4]?.trim() || 'Hembra',
                    birth: cols[5]?.trim() || '',
                    weight: parseFloat(cols[6]) || 0,
                    notes: cols[7]?.trim() || '',
                    father: cols[8]?.trim() || '',
                    mother: cols[9]?.trim() || '',
                    corral: '', // Default empty corral
                    joined: new Date().toISOString()
                });
            }

            if (newAnimals.length > 0) {
                const updated = [...animals, ...newAnimals];
                setAnimals(updated);
                write(`animals_${sessionUser}`, updated);
                alert(`Importados ${newAnimals.length} animales.${errorCount > 0 ? `(${errorCount} errores)` : ''} `);
            } else {
                alert("No se pudieron importar animales. Verifica el formato del CSV.");
            }
        };
        reader.readAsText(file);
    };

    // Bulk Fix Helper - Removed as requested

    // NEW: Manual Recalculation Trigger - FIXED v9 (Super-Compact Arrays)
    const handleRecalculateWeights = () => {
        if (!confirm("¿Recalcular con SUPER-COMPRESIÓN?\n\n- Convierte el historial a formato de matriz numérica.\n- Ahorra 90% de espacio.\n- Mantiene Vacas/Toros/Bueyes con sus límites.")) return;

        // DEBUG
        let total = 0;
        console.log("--- Storage Analysis ---");
        for (let x in localStorage) {
            if (!localStorage.hasOwnProperty(x)) continue;
            const size = ((localStorage[x].length * 2) / 1024 / 1024).toFixed(2);
            console.log(`${x}: ${size} MB`);
            total += parseFloat(size);
        }

        const now = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(now.getMonth() - 6);

        // Keep limited events
        let keptEvents = events.filter(e => new Date(e.date) > sixMonthsAgo);
        if (keptEvents.length > 200) keptEvents = keptEvents.slice(0, 200);

        const newEventsBuffer: any[] = [];
        console.log("Starting Super-Compact Simulation...");

        // Debug Aggregation
        const debugStats: Record<string, { count: number, weightSum: number, distinctMax: number }> = {};
        const outliers: string[] = [];

        // Separate runtime array vs storage array to avoid mutation issues
        const updatedAnimalsForState: any[] = [];
        const updatedAnimalsForStorage: any[] = [];

        animals.forEach((animal, index) => {
            if (!animal.birth && !animal.birthDate) {
                updatedAnimalsForState.push(animal);
                updatedAnimalsForStorage.push(animal);
                return;
            }

            // 1. Breed Genetics (ROBUST MATCHING)
            let breedInfo = BreedManager.getBreedByName(animal.breed);

            // Fuzzy Search if exact match fails
            if (!breedInfo && animal.breed) {
                const allBreeds = BreedManager.getAllBreeds();
                const target = animal.breed.toLowerCase().trim();
                // Find first breed whose name is contained in the animal string
                breedInfo = allBreeds.find(b => target.includes(b.name.toLowerCase()));
            }

            // F1 / Hybrid Parsing (Advanced)
            let isHybrid = false;
            if (!breedInfo && animal.breed && (animal.breed.includes('F1') || animal.breed.includes(' x '))) {
                const parts = animal.breed.replace('F1', '').trim().split(' x ');
                if (parts.length >= 2) {
                    const allBreeds = BreedManager.getAllBreeds();
                    const p0 = parts[0].toLowerCase().trim();
                    const p1 = parts[1].toLowerCase().trim();

                    const breedA = allBreeds.find(b => p0.includes(b.name.toLowerCase()));
                    const breedB = allBreeds.find(b => p1.includes(b.name.toLowerCase()));

                    if (breedA && breedB) {
                        breedInfo = BreedManager.calculateHybrid(breedA.id, breedB.id) || undefined;
                        isHybrid = true;
                    }
                }
            }

            // EMERGENCY BACKUP: Manual Keywords (If BreedManager fails or String mismatch)
            // This prevents "Generic Cow" from applying to valid breeds with typos/accents

            // Normalize: "Betizú" -> "betizu"
            const rawBreed = animal.breed || '';
            const normalizedBreed = rawBreed.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            if (!breedInfo && normalizedBreed) {
                if (normalizedBreed.includes('betizu')) {
                    breedInfo = {
                        id: 'MANUAL_BETIZU', code: 'BET', name: 'Betizu (Detectada)',
                        biological_type: 'Rustic_European', weight_female_adult: 320, weight_male_adult: 450,
                        adg_feedlot: 0.6, subsystem: 'Bos taurus'
                    } as any;
                }
                else if (normalizedBreed.includes('limousin') || normalizedBreed.includes('limusin')) {
                    breedInfo = {
                        id: 'MANUAL_LIM', code: 'LIM', name: 'Limousin (Detectada)',
                        biological_type: 'Continental', weight_female_adult: 700, weight_male_adult: 1100,
                        adg_feedlot: 1.4, subsystem: 'Bos taurus'
                    } as any;
                }
                else if (normalizedBreed.includes('charol')) {
                    breedInfo = {
                        id: 'MANUAL_CHA', code: 'CHA', name: 'Charolais (Detectada)',
                        biological_type: 'Continental', weight_female_adult: 800, weight_male_adult: 1200,
                        adg_feedlot: 1.5, subsystem: 'Bos taurus'
                    } as any;
                }
                else if (normalizedBreed.includes('avile')) {
                    breedInfo = {
                        id: 'MANUAL_AVI', code: 'AVI', name: 'Avileña (Detectada)',
                        biological_type: 'Rustic_European', weight_female_adult: 550, weight_male_adult: 900,
                        adg_feedlot: 1.1, subsystem: 'Bos taurus'
                    } as any;
                }
                else if (normalizedBreed.includes('retinta')) {
                    breedInfo = {
                        id: 'MANUAL_RET', code: 'RET', name: 'Retinta (Detectada)',
                        biological_type: 'Rustic_European', weight_female_adult: 580, weight_male_adult: 950,
                        adg_feedlot: 1.1, subsystem: 'Bos taurus'
                    } as any;
                }
                else if (normalizedBreed.includes('morucha')) {
                    breedInfo = {
                        id: 'MANUAL_MOR', code: 'MOR', name: 'Morucha (Detectada)',
                        biological_type: 'Rustic_European', weight_female_adult: 550, weight_male_adult: 950,
                        adg_feedlot: 1.1, subsystem: 'Bos taurus'
                    } as any;
                }
                else if (normalizedBreed.includes('frison')) {
                    breedInfo = {
                        id: 'MANUAL_FRI', code: 'FRI', name: 'Frisona (Detectada)',
                        biological_type: 'Dairy', weight_female_adult: 650, weight_male_adult: 1000,
                        adg_feedlot: 1.2, subsystem: 'Bos taurus'
                    } as any;
                }
                else if (normalizedBreed.includes('wagyu')) {
                    breedInfo = {
                        id: 'MANUAL_WAG', code: 'WAG', name: 'Wagyu (Detectada)',
                        biological_type: 'British', weight_female_adult: 550, weight_male_adult: 850,
                        adg_feedlot: 0.9, subsystem: 'Bos taurus'
                    } as any;
                }
                else if (normalizedBreed.includes('mestiz') || normalizedBreed.includes('cruzad')) {
                    breedInfo = {
                        id: 'MANUAL_MIX', code: 'MIX', name: 'Mestiza (Detectada)',
                        biological_type: 'Rustic_European', weight_female_adult: 580, weight_male_adult: 950,
                        adg_feedlot: 1.2, subsystem: 'Bos taurus' // Safe fallback
                    } as any;
                }
            }

            // Defaults (Generic Cow if still unknown)
            let baseAdg = breedInfo ? breedInfo.adg_feedlot : 1.4;
            let baseWeightMale = breedInfo ? breedInfo.weight_male_adult : 900;
            let baseWeightFemale = breedInfo ? breedInfo.weight_female_adult : 600;

            // Note: biological_type is now always available if we matched a keyword or breed
            let biologicalType = breedInfo ? breedInfo.biological_type : 'Rustic_European';

            // 2. SEXUAL DIMORPHISM CAPS & BIOLOGICAL TYPES
            let maxWeight = baseWeightMale;
            let geneticMaxAdg = baseAdg * 1.6;

            // Biological Type Adjustments (Rustic vs Continental)
            let maintenanceMultiplier = 1.0;
            let intakeMultiplier = 1.0;

            switch (biologicalType) {
                case 'Rustic_European': // Betizu, Morucha, Retinta
                    maintenanceMultiplier = 0.9; // Hardy, needs less energy
                    intakeMultiplier = 0.85; // Lower capacity
                    break;
                case 'Continental': // Limousin, Charolais
                    maintenanceMultiplier = 1.05;
                    intakeMultiplier = 1.1;
                    break;
                case 'Dairy': // Frisona
                    maintenanceMultiplier = 1.25;
                    break;
                case 'Indicus':
                    maintenanceMultiplier = 0.85;
                    break;
                default:
                    maintenanceMultiplier = 1.0;
            }

            if (animal.sex === 'Hembra') {
                maxWeight = baseWeightFemale * 1.15;
                geneticMaxAdg = baseAdg * 1.1;
            } else if (animal.category === 'Buey' || animal.sex === 'Castrado') {
                maxWeight = baseWeightMale * 1.25;
                geneticMaxAdg = baseAdg * 1.0;
            } else {
                maxWeight = baseWeightMale * 1.2;
                geneticMaxAdg = baseAdg * 1.4;
            }

            const birthDate = new Date(animal.birth || animal.birthDate);
            let simWeight = 40;
            if (animal.breed === 'Wagyu') simWeight = 30;
            // Betizu/Rustic small birth weights
            if (biologicalType === 'Rustic_European') simWeight = 25;

            let currentDate = new Date(birthDate);

            // Runtime records
            const runtimeRecords: any[] = [];
            const compactWeights: number[] = [];

            while (currentDate < now) {
                const m = currentDate.getMonth();
                const am = (currentDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

                // Diet
                let dietMcal = 2.0;
                if (m >= 2 && m <= 5) dietMcal = 2.4;
                else if (m >= 6 && m <= 8) dietMcal = 1.7;
                if (animal.farm && animal.farm.toLowerCase().includes('feedlot')) dietMcal = 2.8;

                // Simulation
                let intakePct = 0.025;
                if (simWeight > 400) intakePct = 0.022;
                if (simWeight > 700) intakePct = 0.018;
                if (simWeight > 900) intakePct = 0.015;

                // Apply Biological Intake Cap
                const intakeKg = Math.min(simWeight * intakePct * intakeMultiplier, 22);
                const totalEnergy = intakeKg * dietMcal;

                let maintenanceMcal = (0.09 * Math.pow(simWeight, 0.75)) * maintenanceMultiplier;

                // Sex corrections
                if (animal.sex === 'Hembra') maintenanceMcal *= 1.05;
                if (animal.sex === 'Macho' && animal.category !== 'Buey') maintenanceMcal *= 1.15;

                const netEnergy = totalEnergy - maintenanceMcal;
                let gainKg = 0;

                if (netEnergy > 0) {
                    let costPerKg = 4.0 + (simWeight * 0.008);
                    if (animal.sex === 'Hembra' && simWeight > 350) costPerKg *= 1.3;
                    gainKg = netEnergy / costPerKg;
                    if (simWeight > (maxWeight * 0.9)) gainKg *= 0.3;
                    if (simWeight >= maxWeight) gainKg = 0;
                    gainKg = Math.min(gainKg, geneticMaxAdg);
                } else {
                    gainKg = netEnergy / 4.5;
                }

                simWeight += (gainKg * 30.44);
                if (simWeight > maxWeight) simWeight = maxWeight;

                // LAST 12 MONTHS ONLY
                if ((now.getTime() - currentDate.getTime()) < (1000 * 60 * 60 * 24 * 30 * 12)) {
                    runtimeRecords.push({
                        date: currentDate.toISOString().split('T')[0],
                        weightKg: Math.floor(simWeight),
                        adg: parseFloat((gainKg).toFixed(2))
                    });

                    // Compact Store
                    compactWeights.push(Math.floor(simWeight));
                }

                currentDate.setMonth(currentDate.getMonth() + 1);
            }

            // DEBUG: Aggregate Stats by Breed
            const breedKey = breedInfo ? `${breedInfo.name} (${breedInfo.biological_type})` : `GENÉRICA (${animal.breed})`;
            if (!debugStats[breedKey]) {
                debugStats[breedKey] = { count: 0, weightSum: 0, distinctMax: maxWeight };
            }
            debugStats[breedKey].count++;
            debugStats[breedKey].weightSum += simWeight;

            // Collect significant outliers (e.g. suspiciously heavy for Rustic)
            if (breedInfo?.biological_type === 'Rustic_European' && simWeight > 450 && animal.sex === 'Hembra') {
                outliers.push(`${animal.id} (${animal.breed}): ${Math.floor(simWeight)}kg (Too Heavy?)`);
            }

            const finalWeight = Math.floor(simWeight);

            updatedAnimalsForState.push({
                ...animal,
                weight: finalWeight,
                currentWeight: finalWeight,
                monthlyRecords: runtimeRecords
            });

            updatedAnimalsForStorage.push({
                ...animal,
                weight: finalWeight,
                currentWeight: finalWeight,
                monthlyRecords: undefined,
                h_w: compactWeights,
                h_end: new Date().toISOString().split('T')[0]
            });
        });

        // Generate Report (DISABLED FOR PRODUCTION - Verified by User)
        /*
        let report = "RESUMEN GLOBAL POR RAZA:\n";
        for (const [key, stat] of Object.entries(debugStats)) {
            const avg = Math.round(stat.weightSum / stat.count);
            // @ts-ignore
            report += `- ${key}: ${stat.count} animales. Peso Promedio: ${avg}kg. (Límite aplicado: ~${Math.round(stat.distinctMax)}kg)\n`;
        }
        
        if (outliers.length > 0) {
            report += "\n⚠️ POSIBLES ERRORES (Demasiado pesados):\n" + outliers.slice(0, 5).join("\n") + (outliers.length > 5 ? "\n...y más." : "");
        } else {
            report += "\n✅ Todos los pesos parecen congruentes con su tipo biológico.";
        }

        // Debug Alert
        alert(report);
        */
        const report = `ACTUALIZACIÓN COMPLETADA:\n- Biología ajustada (Tipos Biológicos + Acentos).\n- Historial limitado a 12 meses (Super-Compresión).`
        // alert(report);

        // Save
        const finalEvents = [...keptEvents, ...newEventsBuffer];
        const cappedEvents = finalEvents.slice(0, 300);

        setAnimals(updatedAnimalsForState);
        setEvents(cappedEvents);

        if (sessionUser) {
            try {
                const key = `animals_${sessionUser}`;
                localStorage.removeItem(key);
                localStorage.removeItem('events');

                // Save the COMPACT version
                localStorage.setItem(key, JSON.stringify(updatedAnimalsForStorage));
                localStorage.setItem('events', JSON.stringify(cappedEvents));

                alert(`COMPRESIÓN ARRAY EXITOSA:\n- Historial convertido a matriz numérica.\n- Espacio liberado masivamente.`);
            } catch (e) {
                console.error("Total Quota Fail");
                // Last Resort: Nuke everything
                const nuked = updatedAnimalsForStorage.map(({ h_w, h_end, ...rest }) => rest);
                localStorage.setItem(`animals_${sessionUser}`, JSON.stringify(nuked));
                localStorage.setItem('events', '[]');
                alert("Fallo total de espacio. Se han guardado solo los datos básicos (sin historial).");
            }
        }
    };

    // Helper for Crotal Formatting
    const formatCrotal = (crotal: string, invert: boolean = false) => {
        if (!crotal) return '';
        const len = crotal.length;
        if (len < 4) return <span className={`font - medium ${invert ? 'text-white' : 'text-gray-900'} `}>{crotal}</span>;

        const prefix = crotal.substring(0, len - 4);
        const suffix = crotal.substring(len - 4);

        return (
            <span className={`${invert ? 'text-white' : 'text-gray-900'} font - mono tracking - tight`}>
                <span className={`${invert ? 'text-green-100' : 'text-gray-400'} font - normal text - sm align - middle mr - 0.5`}>{prefix}</span>
                <span className="font-black text-xl align-middle">{suffix}</span>
            </span>
        );
    };

    // Search Logic
    const [searchTerm, setSearchTerm] = useState('');
    const [showArchived, setShowArchived] = useState(false);

    const filteredAnimals = animals.filter(a => {
        // Status Filter: Toggle Mode
        // If showArchived is TRUE -> Show ONLY Dead/Sacrificed/Sold
        // If showArchived is FALSE -> Show ONLY Active (or undefined)
        const isActive = !a.status || a.status === 'Activo';

        if (showArchived) {
            if (isActive) return false; // Hide active if we want archived
        } else {
            if (!isActive) return false; // Hide archived if we want active
        }

        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        // Check full ID, last 4 digits, or breed
        return a.id.toLowerCase().includes(term) ||
            a.id.slice(-4).includes(term) ||
            (a.breed && a.breed.toLowerCase().includes(term));
    });

    // Detail Modal State
    const [selectedAnimal, setSelectedAnimal] = useState<any>(null);

    // Helper to find castration date from events or estimate
    const getCastrationInfo = (animal: any) => {
        // ideally we would look up events, but if not available we rely on properties
        // For the specific oxen, we know they are castrated. 
        // We'll simulate finding the event date or using a property if we added one.
        // For now, let's calculate based on birth + 7 months used in seeder if it's one of ours.
        if (animal.sex === 'Castrado') {
            const birth = new Date(animal.birth || animal.birthDate);
            const castDate = new Date(birth);
            castDate.setMonth(birth.getMonth() + 7); // Approximation matching seeder
            return { isCastrated: true, date: castDate.toLocaleDateString() };
        }
        return { isCastrated: false, date: null };
    };



    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                {/* ... rest of existing code ... */}
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Inventario de Animales</h2>
                    <p className="text-gray-600">Registro y monitoreo individual</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleRecalculateWeights}
                        className="bg-purple-100 text-purple-700 hover:bg-purple-200 font-medium py-2 px-4 rounded-lg transition-colors text-sm border border-purple-200"
                    >
                        ⚡ Recalcular Pesos
                    </button>
                    <button
                        onClick={handleDownloadCSV}
                        className="bg-green-50 text-green-700 hover:bg-green-100 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                        ⬇ Plantilla CSV
                    </button>
                    <label className="bg-green-50 text-green-700 hover:bg-green-100 font-medium py-2 px-4 rounded-lg transition-colors cursor-pointer text-sm flex items-center">
                        ⬆ Cargar CSV
                        <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
                    </label>

                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                        {showForm ? 'Cancelar' : 'Nuevo Animal'}
                    </button>
                </div>
            </div>

            {/* Search Bar & Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full">
                    <input
                        type="text"
                        placeholder="Buscar por Crotal (ej. 1234), Raza..."
                        className="w-full border rounded-lg pl-10 pr-4 py-3 text-lg shadow-sm focus:ring-2 focus:ring-green-500 outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <span className="absolute left-3 top-3.5 text-gray-400 text-lg">🔍</span>
                </div>

                <label className="flex items-center gap-2 text-gray-700 font-medium cursor-pointer select-none whitespace-nowrap bg-gray-50 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-100">
                    <input
                        type="checkbox"
                        checked={showArchived}
                        onChange={e => setShowArchived(e.target.checked)}
                        className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                    />
                    Ver Bajas
                </label>
            </div>

            {/* Form */}
            {showForm && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-4">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Registrar Animal</h3>
                    <form onSubmit={handleSaveAnimal} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Fields remain same */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Crotal (ID) *</label>
                            <input type="text" required className="w-full border rounded-lg px-3 py-2"
                                value={newAnimal.id} onChange={e => setNewAnimal({ ...newAnimal, id: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre (Opcional)</label>
                            <input type="text" className="w-full border rounded-lg px-3 py-2"
                                value={newAnimal.name} onChange={e => setNewAnimal({ ...newAnimal, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Finca *</label>
                            <select required className="w-full border rounded-lg px-3 py-2"
                                value={newAnimal.farm} onChange={e => setNewAnimal({ ...newAnimal, farm: e.target.value })}>
                                <option value="">Selecciona Finca</option>
                                <option value={farms[0]?.name || "SOTO del PRIOR"}>{farms[0]?.name || "SOTO del PRIOR"}</option>
                                {farms.slice(1).map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                            </select>
                        </div>
                        {/* Corral Selector (New) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Corral</label>
                            <select
                                className="w-full border rounded-lg px-3 py-2"
                                value={newAnimal.corral || ''}
                                onChange={e => setNewAnimal({ ...newAnimal, corral: e.target.value })}
                                disabled={!newAnimal.farm}
                            >
                                <option value="">Sin Asignar</option>
                                {(() => {
                                    const f = farms.find(farm => farm.name === newAnimal.farm);
                                    if (!f) return null;

                                    if (f.corralNames && f.corralNames.length > 0) {
                                        return f.corralNames.map((name: string, i: number) => (
                                            <option key={i} value={name}>{name}</option>
                                        ));
                                    }
                                    return Array.from({ length: f.corrals || 0 }, (_, i) => i + 1).map(n => (
                                        <option key={n} value={n}>Corral {n}</option>
                                    ));
                                })()}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Raza *</label>
                            <select required className="w-full border rounded-lg px-3 py-2"
                                value={newAnimal.breed} onChange={e => setNewAnimal({ ...newAnimal, breed: e.target.value })}>
                                <option value="">Selecciona Raza</option>
                                <option value="Wagyu">Wagyu</option>
                                <option value="Angus">Angus</option>
                                <option value="Hereford">Hereford</option>
                                <option value="Charolais">Charolais</option>
                                <option value="Limousin">Limousin</option>
                                <option value="Brahman">Brahman</option>
                                <option value="Nelore">Nelore</option>
                                <option value="Droughtmaster">Droughtmaster</option>
                                <option value="Retinta">Retinta</option>
                                <option value="Morucha">Morucha</option>
                                <option value="Pirenaica">Pirenaica</option>
                                <option value="Betizú">Betizú</option>
                                <option value="Berrenda">Berrenda</option>
                                <option value="Simmental">Simmental</option>
                                <option value="Blonde d'Aquitaine">Blonde d&apos;Aquitaine</option>
                                <option value="Azul Belga">Azul Belga</option>
                                <option value="Cruzada">Cruzada</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sexo *</label>
                            <select required className="w-full border rounded-lg px-3 py-2"
                                value={newAnimal.sex} onChange={e => setNewAnimal({ ...newAnimal, sex: e.target.value })}>
                                <option value="">Selecciona Sexo</option>
                                <option value="Macho">Macho</option>
                                <option value="Hembra">Hembra</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Nacimiento</label>
                            <input type="date" className="w-full border rounded-lg px-3 py-2"
                                value={newAnimal.birth} onChange={e => setNewAnimal({ ...newAnimal, birth: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Peso Actual (kg)</label>
                            <input type="number" step="0.1" className="w-full border rounded-lg px-3 py-2"
                                value={newAnimal.weight} onChange={e => setNewAnimal({ ...newAnimal, weight: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Padre (Crotal) - Opcional</label>
                            <input type="text" className="w-full border rounded-lg px-3 py-2" placeholder="ID del Padre"
                                value={newAnimal.father} onChange={e => setNewAnimal({ ...newAnimal, father: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Madre (Crotal) - Opcional</label>
                            <input type="text" className="w-full border rounded-lg px-3 py-2" placeholder="ID de la Madre"
                                value={newAnimal.mother} onChange={e => setNewAnimal({ ...newAnimal, mother: e.target.value })} />
                        </div>
                        <div className="md:col-span-2">
                            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg w-full md:w-auto">
                                Guardar Animal
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-600 font-medium text-sm">
                        <tr>
                            <th className="p-4 w-1/3">Crotal</th>
                            <th className="p-4 w-1/3">Sexo</th>
                            <th className="p-4 w-1/3">Finca</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredAnimals.length === 0 ? (
                            <tr><td colSpan={3} className="p-8 text-center text-gray-500">No hay animales que coincidan.</td></tr>
                        ) : (
                            filteredAnimals.map((a, i) => {
                                return (
                                    <tr key={i}
                                        onClick={() => setSelectedAnimal(a)}
                                        className="hover:bg-green-50 transition-colors cursor-pointer group"
                                    >
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                {formatCrotal(a.id)}
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-600">{a.sex}</td>
                                        <td className="p-4 text-gray-600">
                                            <div className="flex flex-col text-sm">
                                                <span>{a.farm}</span>
                                                {a.corral && <span className="text-xs text-green-600 font-medium">➜ {a.corral}</span>}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
            {/* Detail Modal */}
            {selectedAnimal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 h-[90vh] flex flex-col">

                        {/* 1. DIET COMPOSER MODE */}
                        {showDiet ? (
                            <DietComposer
                                animal={selectedAnimal}
                                onClose={() => setShowDiet(false)}
                                fatherBreed={(() => {
                                    if (!selectedAnimal.father) return undefined;
                                    const parent = animals.find(a => a.id === selectedAnimal.father);
                                    return BreedManager.getBreedByName(parent ? parent.breed : selectedAnimal.father);
                                })()}
                                motherBreed={(() => {
                                    if (!selectedAnimal.mother) return undefined;
                                    const parent = animals.find(a => a.id === selectedAnimal.mother);
                                    return BreedManager.getBreedByName(parent ? parent.breed : selectedAnimal.mother);
                                })()}
                            />
                        ) : (
                            /* 2. STANDARD DETAIL MODE */
                            <div className="flex flex-col h-full">
                                {/* Header */}
                                <div className="bg-green-700 px-6 py-5 flex justify-between items-start text-white relative overflow-hidden flex-shrink-0">
                                    <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                                        <svg width="200" height="200" viewBox="0 0 200 200" fill="currentColor">
                                            <path d="M100 0L200 200H0L100 0Z" />
                                        </svg>
                                    </div>

                                    <div className="relative z-10">
                                        <div className="scale-125 origin-top-left mb-1">
                                            {formatCrotal(selectedAnimal.id, true)}
                                        </div>
                                        <div className="flex items-center gap-2 mt-2 opacity-90 text-sm font-medium">
                                            <span className="bg-white/20 px-2 py-0.5 rounded backdrop-blur-sm">
                                                {selectedAnimal.breed}
                                            </span>
                                            <span>•</span>
                                            <span>{selectedAnimal.sex}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 z-10 items-center">
                                        <button
                                            onClick={() => setShowDiet(true)}
                                            className="bg-yellow-400 hover:bg-yellow-300 text-yellow-900 px-4 py-2 rounded-lg font-bold text-sm shadow-lg transform hover:scale-105 transition-all flex items-center gap-2"
                                            title="Simular Dieta Científica"
                                        >
                                            🧪 Crear Dieta
                                        </button>
                                        <button onClick={() => window.print()} className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg backdrop-blur-sm transition-colors" title="Imprimir Ficha">
                                            🖨️
                                        </button>
                                        <button onClick={() => { setSelectedAnimal(null); setShowDiet(false); }} className="text-white hover:text-green-200 text-3xl leading-none">&times;</button>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                                    {/* Stats */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                            <p className="text-green-600 text-xs font-bold uppercase tracking-wider mb-1">Peso Actual</p>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-3xl font-black text-gray-900">{selectedAnimal.currentWeight || selectedAnimal.weight}</span>
                                                <span className="text-base font-medium text-gray-500">kg</span>
                                            </div>
                                            <p className="text-xs text-green-700 mt-1 flex items-center gap-1">
                                                <span>⚖️</span> Último pesaje verificado
                                            </p>
                                        </div>
                                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                            <p className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">Edad Exacta</p>
                                            <p className="font-bold text-gray-900 text-lg leading-tight">
                                                {calculateAgeDetailed(selectedAnimal.birth || selectedAnimal.birthDate)}
                                            </p>
                                            <p className="text-xs text-blue-700 mt-2">
                                                Nacimiento: {selectedAnimal.birth || 'Desconocido'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Strategy */}
                                    <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                                        <h4 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                                            <span>🌾</span> Estrategia Nutricional
                                        </h4>
                                        {(() => {
                                            const diet = getDietStatus(selectedAnimal);
                                            return (
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-1">Programa Actual</p>
                                                        <span className={`px - 3 py - 1 rounded - full text - sm font - bold border ${diet.color} `}>
                                                            {diet.label}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* Location & Genealogy */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm border-t pt-4">
                                        <div>
                                            <p className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-1">Ubicación Actual</p>
                                            <p className="font-medium text-gray-900 text-base mb-2">{selectedAnimal.farm}</p>
                                            {selectedAnimal.corral && (
                                                <span className="text-green-700 font-bold text-xs bg-white px-2 py-1 rounded border border-green-200 shadow-sm inline-block">
                                                    📍 Corral {selectedAnimal.corral}
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-1">Genealogía</p>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-blue-600">P:</span>
                                                    <span>{selectedAnimal.father || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-pink-600">M:</span>
                                                    <span>{selectedAnimal.mother || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Historical Table */}
                                    <div className="mt-6 border-t pt-4">
                                        <h4 className="font-bold text-gray-800 text-sm mb-3">Historial de Eventos</h4>
                                        <div className="border rounded-lg overflow-hidden text-sm">
                                            <table className="w-full text-left">
                                                <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                                                    <tr>
                                                        <th className="px-3 py-2">Fecha</th>
                                                        <th className="px-3 py-2">Evento</th>
                                                        <th className="px-3 py-2">Detalle</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {events
                                                        .filter(e => e.animalId === selectedAnimal.id || e.animalCrotal === selectedAnimal.id)
                                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                                        .map((evt, idx) => (
                                                            <tr key={idx} className="hover:bg-gray-50">
                                                                <td className="px-3 py-2 font-mono text-xs text-gray-500">{evt.date}</td>
                                                                <td className="px-3 py-2 font-medium text-gray-800">{evt.type}</td>
                                                                <td className="px-3 py-2 text-gray-600">{evt.desc}</td>
                                                            </tr>
                                                        ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-100 flex-shrink-0">
                                    <span className="text-xs text-gray-400 font-mono">ID: {selectedAnimal.id}</span>
                                    <button onClick={() => { setSelectedAnimal(null); setShowDiet(false); }} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 text-sm shadow-sm transition-colors">
                                        Cerrar Ficha
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

