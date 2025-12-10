// Animal Calculator Module
const AnimalCalculator = {
    init() {
        console.log('AnimalCalculator: Initializing...');
        this.cacheDOM();
        this.bindEvents();
        this.initSelectors();

        // Expose for debugging
        window.AnimalCalculator = this;
    },

    cacheDOM() {
        this.dom = {
            input: document.getElementById('calcAnimalInput'),
            suggestions: document.getElementById('calcAnimalSuggestions'),

            // Inputs (Read-only)
            breed: document.getElementById('calcBreed'),
            sex: document.getElementById('calcSex'),
            ageDays: document.getElementById('calcAgeDays'),
            ageMonths: document.getElementById('calcAgeMonths'),
            weight: document.getElementById('calcWeight'),
            system: document.getElementById('calcSystem'),

            // Outputs
            targetWeight: document.getElementById('calcTargetWeight'),
            date: document.getElementById('calcDate'),
            daysRemaining: document.getElementById('calcDaysRemaining'),
            adg: document.getElementById('calcADG'),
            carcass: document.getElementById('calcCarcass'),
            yield: document.getElementById('calcYield'),

            // Diet
            dietPhase: document.getElementById('dietPhase'),
            dietTableBody: document.getElementById('dietTableBody'),
            dietNotes: document.getElementById('dietNotes'),
            dietAlerts: document.getElementById('dietAlerts')
        };
    },

    bindEvents() {
        if (!this.dom.input) return;

        // Search Input Logic
        this.dom.input.addEventListener('input', () => this.handleSearch());
        this.dom.input.addEventListener('focus', () => this.handleSearch());

        // Hide suggestions on click outside
        document.addEventListener('click', (e) => {
            if (this.dom.suggestions && !this.dom.input.contains(e.target) && !this.dom.suggestions.contains(e.target)) {
                this.dom.suggestions.classList.add('hidden');
            }
        });

        // System Change
        if (this.dom.system) {
            this.dom.system.addEventListener('change', () => {
                if (this.currentAnimalId) {
                    this.calculate(this.currentAnimalId, true);
                }
            });
        }

        // Save Diet Plan
        const saveBtn = document.getElementById('saveDietPlan');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                if (this.currentAnimalId) {
                    this.saveDietProtocol();
                } else {
                    alert('Selecciona un animal primero');
                }
            });
        }
    },

    initSelectors(retries = 5) {
        const feedSource = window.FEED_DATA || FEED_DATA || {};
        const allFeeds = Object.values(feedSource);

        if (allFeeds.length === 0) {
            if (retries > 0) {
                console.log(`[AnimalCalculator] Feeds not loaded yet. Retrying... (${retries})`);
                setTimeout(() => this.initSelectors(retries - 1), 500);
            } else {
                console.warn('[AnimalCalculator] Failed to load feeds after multiple retries.');
            }
            return;
        }

        [1, 3, 4, 5].forEach(slot => {
            const select = document.getElementById(`dietSlot${slot}`);
            if (!select) return;

            if (select.options.length > 1) {
                while (select.options.length > 1) select.remove(1);
            }

            let filterType = [];
            if (slot === 1) filterType = ['Forraje', 'Pasto', 'Ensilado', 'Paja'];
            else if (slot === 3) filterType = ['Concentrado', 'Energía', 'Grano'];
            else if (slot === 4) filterType = ['Proteico', 'Concentrado'];
            else if (slot === 5) filterType = ['Suplemento', 'Mineral', 'Vitamina', 'Aditivo'];

            const eligibleFeeds = allFeeds.filter(f => filterType.includes(f.type) || filterType.includes(f.Type));

            eligibleFeeds.forEach(feed => {
                const opt = document.createElement('option');
                opt.value = feed.ID || feed.id;
                opt.textContent = feed.name;
                select.appendChild(opt);
            });

            if (select.value === "") {
                if (slot === 1) {
                    const def = eligibleFeeds.find(f => f.name.includes('Pasto') || f.name.includes('Alfalfa'));
                    if (def) select.value = def.ID || def.id;
                }
                if (slot === 3) {
                    const def = eligibleFeeds.find(f => f.name.includes('Maíz') || f.name.includes('Cebada'));
                    if (def) select.value = def.ID || def.id;
                }
                if (slot === 4) {
                    const def = eligibleFeeds.find(f => f.name.includes('Soja') || f.name.includes('Girasol'));
                    if (def) select.value = def.ID || def.id;
                }
                if (slot === 5) {
                    const def = eligibleFeeds.find(f => f.name.includes('Corrector') || f.name.includes('Mineral'));
                    if (def) select.value = def.ID || def.id;
                }
            }

            select.addEventListener('change', () => {
                this.updateDietCalculationsFromDOM();
            });
        });
    },

    getFeedCost(feed) {
        if (!feed) return 0;
        const val = feed.cost_eur_kg || feed.Coste_Eur_kg || feed.coste_eur_kg || feed.cost || feed.Cost || 0;
        return parseFloat(val) || 0;
    },

    getTargetPercentages(ageMonths, breedName, system) {
        let pct = { 1: 60, 3: 25, 4: 12, 5: 3 };

        if (ageMonths < 6) {
            pct = { 1: 40, 3: 35, 4: 22, 5: 3 };
        } else if (ageMonths < 12) {
            pct = { 1: 55, 3: 30, 4: 13, 5: 2 };
        } else {
            pct = { 1: 25, 3: 60, 4: 12, 5: 3 };
        }

        if (system && (system.includes('Pastoreo') || system.includes('Extensivo'))) {
            pct = { 1: 85, 3: 10, 4: 3, 5: 2 };
        }

        if (breedName && breedName.toLowerCase().includes('indicus')) {
            if (pct[1] < 40) pct[1] = 40;
            pct[3] = 100 - pct[1] - pct[4] - pct[5];
        }

        return pct;
    },

    updateDietCalculationsFromDOM() {
        const ageMonths = parseFloat(this.dom.ageMonths.value) || 12;
        const currentWeight = parseFloat(this.dom.weight.value) || 400;
        const system = this.dom.system.value;
        const breedName = this.dom.breed.value || '';

        this.recommendDiet(ageMonths, { name: breedName }, currentWeight, system);
    },

    saveDietProtocol() {
        if (!this.currentAnimalId) return;

        // 1. Get Session
        let userRaw = localStorage.getItem('sessionUser');
        let user = 'default';
        if (userRaw) try { user = JSON.parse(userRaw); } catch (e) { user = userRaw; }

        const animals = JSON.parse(localStorage.getItem(`animals_${user}`) || '[]');
        const animal = animals.find(a => a.id === this.currentAnimalId);
        if (!animal) return;

        // 2. Gather Data
        const phase = this.dom.dietPhase ? this.dom.dietPhase.textContent.replace('Fase: ', '') : 'General';
        const dateStr = new Date().toLocaleDateString();

        // 3. Create Immediate Record (Note)
        const noteEvent = {
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString(),
            type: 'Nota',
            animalId: animal.id, // Support ID-based linkage
            animalCrotal: animal.crotal, // Support legacy Crotal linkage
            desc: `Plan Nutrición (${phase}): Iniciado. Ver Calculadora.`
        };

        // 4. Create Future Review Event (Weighing + 30 days)
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);

        const reviewEvent = {
            id: (Date.now() + 1).toString(),
            date: futureDate.toISOString().split('T')[0],
            time: '09:00:00',
            type: 'Pesaje', // Linked to Weighing as requested
            animalId: animal.id,
            animalCrotal: animal.crotal,
            desc: `REVISIÓN PLAN NUTRICIÓN: ${phase}. Ajustar dieta según GMD real.`
        };

        // 5. Save
        const events = JSON.parse(localStorage.getItem('events') || '[]');
        events.push(noteEvent, reviewEvent);
        localStorage.setItem('events', JSON.stringify(events));

        // 6. UI Feedback
        alert(`Plan guardado correctamente.\n\nSe ha creado:\n1. Registro del plan actual.\n2. Aviso de PESAJE para el ${futureDate.toLocaleDateString()} (en 30 días).`);
    },

    handleSearch() {
        const term = this.dom.input.value.trim().toLowerCase();
        const list = this.dom.suggestions;
        if (!list) return;

        if (!term) {
            list.classList.add('hidden');
            this.clearResults();
            return;
        }

        // Logic to get user - match app.js behavior
        let userRaw = localStorage.getItem('sessionUser');
        let user = 'default';
        if (userRaw) {
            try {
                user = JSON.parse(userRaw);
            } catch (e) {
                console.warn('Error parsing sessionUser', e);
                user = userRaw;
            }
        }

        console.log(`[Calculator] Searching for term "${term}" for user "${user}"`);

        const animals = JSON.parse(localStorage.getItem(`animals_${user}`) || '[]');
        console.log(`[Calculator] Found ${animals.length} animals in storage.`);

        // Filter Logic: Includes (Exact copy of app.js logic)
        const matches = animals.filter(a => {
            const crotal = (a.crotal || '').toLowerCase();
            return crotal.includes(term);
        });

        // Clear & Rebuild
        list.innerHTML = '';
        if (matches.length === 0) {
            list.classList.add('hidden');
            return;
        }

        matches.slice(0, 10).forEach(a => {
            const li = document.createElement('li');
            li.style.padding = '8px 12px';
            li.style.cursor = 'pointer';
            li.style.borderBottom = '1px solid #f3f4f6';
            li.onmouseover = () => li.style.background = '#f9fafb';
            li.onmouseout = () => li.style.background = 'white';
            // Exact copy of format from app.js: `${a.crotal} ${nameStr} [${a.breed}]`
            const nameStr = a.name ? `(${a.name})` : '';
            li.textContent = `${a.crotal} ${nameStr} [${a.breed}]`;

            li.onclick = () => {
                this.dom.input.value = a.crotal; // Set visible value
                this.calculate(a.id); // Run calc with ID
                list.classList.add('hidden');
            };
            list.appendChild(li);
        });

        list.classList.remove('hidden');
    },

    // Old method removed: populateAnimals() 

    // Old method removed: populateAnimals() 

    async calculate(animalId, preserveSystem = false) {
        this.currentAnimalId = animalId;

        // 1. Get Data
        let userRaw = localStorage.getItem('sessionUser');
        let user = 'default';
        if (userRaw) {
            try {
                user = JSON.parse(userRaw);
            } catch (e) {
                user = userRaw;
            }
        }

        // Helper
        const normalize = (str) => str ? str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

        const animals = JSON.parse(localStorage.getItem(`animals_${user}`) || '[]');
        const animal = animals.find(a => a.id === animalId);

        if (!animal) {
            console.error('[Calculator] Animal not found with ID:', animalId);
            return;
        }

        // Breed Data
        let breedData = null;
        if (typeof BreedDataManager !== 'undefined') {
            if (BreedDataManager._breeds.size === 0) {
                await BreedDataManager.load(); // Ensure loaded
            }
            const breeds = BreedDataManager.getAllBreeds();

            // Robust Lookup: Case-insensitive & Accent-insensitive
            const normalize = (str) => str ? str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
            const target = normalize(animal.breed);

            breedData = Object.values(breeds).find(b => b.name === animal.breed) ||
                Object.values(breeds).find(b => normalize(b.name) === target) ||
                Object.values(breeds).find(b => b.code == animal.breed);

            if (!breedData) {
                console.warn(`[Calculator] Breed not found for "${animal.breed}" (Norm: "${target}"). Reloading data...`);
                // Force reload once if not found, might be stale cache
                await BreedDataManager.reload();
                const freshBreeds = BreedDataManager.getAllBreeds();
                breedData = Object.values(freshBreeds).find(b => normalize(b.name) === target);
            }
        }

        // 2. Display Basic Data
        this.updateField('breed', animal.breed || '-');
        this.updateField('sex', animal.sex || '-');

        // Age Calc
        const birthDate = new Date(animal.birthDate);
        const today = new Date();
        const ageTime = today - birthDate;
        const ageDays = Math.floor(ageTime / (1000 * 60 * 60 * 24));
        const ageMonths = (ageDays / 30.44).toFixed(1);

        this.updateField('ageDays', ageDays);
        this.updateField('ageMonths', ageMonths);

        // Weight Logic: Check currentWeight prop -> events -> birthWeight -> 0
        let currentWeight = parseFloat(animal.currentWeight || 0);

        // Fallback: Check events if currentWeight is 0 or missing
        if (!currentWeight || currentWeight === 0) {
            console.log('[Calculator] currentWeight missing, checking events...');
            const events = JSON.parse(localStorage.getItem('events') || '[]');
            // Filter for this animal and type 'Pesaje' or 'Parto' (birth weight)
            const weightEvents = events.filter(e =>
                (e.animalId === animal.id || e.animalCrotal === animal.crotal) &&
                (e.type === 'Pesaje' || e.type === 'Parto') &&
                e.desc.includes('Peso') || e.desc.includes('Parto') // Basic sanity check
            );

            // Sort by date desc
            weightEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

            if (weightEvents.length > 0) {
                // Parse weight from description if needed, or if event has a weight prop (app.js writes 'Peso: Xkg' in desc)
                // App.js logic L2434: desc: `Pesaje: ${weight}kg...`
                // Regex to extract
                const latest = weightEvents[0];
                const match = latest.desc.match(/Peso.*?(\d+(\.\d+)?)/) || latest.desc.match(/(\d+(\.\d+)?)\s*kg/i);
                if (match) {
                    currentWeight = parseFloat(match[1]);
                    console.log(`[Calculator] Found weight from event ${latest.date}: ${currentWeight}kg`);
                }
            }
        }

        // Final fallback to birthWeight if still 0
        if (!currentWeight && animal.birthWeight) {
            currentWeight = parseFloat(animal.birthWeight);
        }

        this.updateField('weight', currentWeight);

        // Determine System
        let system = 'Intensivo (Feedlot)';

        if (preserveSystem) {
            system = this.dom.system.value; // Keep user choice
        } else {
            // Default logic (reset to Intensivo or calculate based on farm/notes if we had that logic)
            system = 'Intensivo (Feedlot)';
            this.updateField('system', system); // Reset dropdown
        }

        // 3. Logic: ADG & Target

        // ADG Base
        // ADG Base
        let adg = 1.2; // fallback
        if (breedData) {
            const adgFeedlot = parseFloat(breedData.adg_feedlot || 1.3);
            const adgGrazing = parseFloat(breedData.adg_grazing || 0.7);

            if (system.includes('Pastoreo') || system.includes('Extensivo')) {
                adg = adgGrazing;
            } else if (system.includes('Mixto')) {
                adg = (adgFeedlot + adgGrazing) / 2;
            } else {
                adg = adgFeedlot; // Default Intensivo
            }
            console.log(`[Calculator] System: ${system}, Breed: ${breedData.name} -> ADG: ${adg.toFixed(2)} (F:${adgFeedlot}, P:${adgGrazing})`);
        } else {
            console.warn('[Calculator] No Breed Data for ADG calc');
        }

        // Adjustments (Heat/Marbling - Placeholder logic as requested)
        // If heat tolerance low and month is summer... (skip for now as optional)

        this.updateField('adg', adg.toFixed(2));

        // Target Weight
        // Adult Ref
        let adultRef = 600; // fallback
        if (breedData) {
            adultRef = animal.sex === 'Macho' ? (breedData.weight_male_adult || 900) : (breedData.weight_female_adult || 550);
        }

        let targetWeight = adultRef * 0.60;

        // Age adjustment
        const slaughterAge = breedData ? parseFloat(breedData.slaughter_age_months || 18) : 18;
        if (parseFloat(ageMonths) > slaughterAge + 4) {
            targetWeight = adultRef * 0.70; // Late slaughter, heavier
        }

        // Prevent Target < Current
        if (targetWeight < currentWeight) targetWeight = currentWeight;

        this.updateField('targetWeight', targetWeight.toFixed(0));

        // 4. Time Projections
        let daysToTarget = 0;
        if (targetWeight > currentWeight && adg > 0) {
            daysToTarget = (targetWeight - currentWeight) / adg;
        }

        console.log(`[Calculator] Target: ${targetWeight}kg, Current: ${currentWeight}kg, ADG: ${adg}, Days: ${daysToTarget}`);

        const estDate = new Date();
        estDate.setDate(estDate.getDate() + Math.ceil(daysToTarget));

        console.log(`[Calculator] Est Date: ${estDate.toLocaleDateString()}`);

        this.updateField('date', estDate.toLocaleDateString());
        if (this.dom.daysRemaining) this.dom.daysRemaining.textContent = `${Math.ceil(daysToTarget)} días`;

        // Carcass (Standard 60% yield or typical for breed)
        let yieldPct = 58; // Default

        if (breedData) {
            // Heuristic based on breed characteristics if not in CSV
            const name = normalize(breedData.name);
            const sub = normalize(breedData.subspecies || '');

            if (name.includes('limousin') || name.includes('chalorais') || name.includes('azul') || name.includes('blonda')) {
                yieldPct = 63; // Ultra High yield European
            } else if (name.includes('pirenaica') || name.includes('aubrac') || name.includes('blonde')) {
                yieldPct = 61; // Very High yield
            } else if (name.includes('angus') || name.includes('hereford') || name.includes('retinta') || name.includes('avile')) {
                yieldPct = 60; // Standard High Quality / Good Indigenous
            } else if (name.includes('betizu') || name.includes('morucha') || name.includes('serrana')) {
                yieldPct = 54; // Rustic/Native
            } else if (sub.includes('indicus')) {
                yieldPct = 56; // Indicus typically lower dress out
            } else if (sub.includes('dairy') || name.includes('frison') || name.includes('holstein')) {
                yieldPct = 52; // Dairy
            }

            // System Bonus: Feedlot cattle typically yield higher than pasture
            if (system && system.includes('Intensivo')) {
                yieldPct += 1;
            } else if (system && system.includes('Extensivo')) {
                yieldPct -= 1;
            }
        }

        const carcass = targetWeight * (yieldPct / 100);
        this.updateField('carcass', carcass.toFixed(0));
        if (this.dom.yield) this.dom.yield.textContent = yieldPct.toFixed(1);

        // 5. Diet Plan
        this.recommendDiet(parseFloat(ageMonths), breedData, currentWeight, system);
    },

    recommendDiet(ageMonths, breedData, currentWeight, system) {
        const feedSource = window.FEED_DATA || FEED_DATA || {};

        // 1. Determine Target Percentages
        const breedName = breedData ? (breedData.name || '') : '';
        const targetPcts = this.getTargetPercentages(ageMonths, breedName, system);

        // 2. Determine DMI (kg Dry Matter)
        let dmiFactor = 0.025; // 2.5% default
        if (system) {
            if (system.includes('Intensivo')) dmiFactor = 0.028;
            else if (system.includes('Pastoreo')) dmiFactor = 0.022;
        }
        // Adjustment for weight (heavier animals eat less % BW)
        if (currentWeight > 500) dmiFactor *= 0.95;

        const dmi = currentWeight * dmiFactor;

        // 3. Update DOM Slots
        let totalKg = 0;
        let totalCost = 0;

        [1, 3, 4, 5].forEach(slot => {
            const select = document.getElementById(`dietSlot${slot}`);
            const pctEl = document.getElementById(`dietSlot${slot}Pct`);
            const kgEl = document.getElementById(`dietSlot${slot}Kg`);
            const costEl = document.getElementById(`dietSlot${slot}Cost`);

            // Update Target % Display
            const targetPct = targetPcts[slot] || 0;
            if (pctEl) pctEl.textContent = `${targetPct}%`;

            // Get Selected Feed
            const feedId = select ? select.value : '';
            const feed = feedSource[feedId] || Object.values(feedSource).find(f => f.ID == feedId || f.id == feedId);

            let asFedKg = 0;
            let dailyCost = 0;

            if (feed) {
                // Calculate kg As Fed based on DM requirement for this slot
                // Slot DM target = Total DMI * (Slot%/100)
                const slotDM = dmi * (targetPct / 100);

                // Content DM % (default 90% if missing)
                const feedDM = (feed.Porcentaje_MS || feed.dm_percent || 90);

                // As Fed = DM / (DM%/100)
                asFedKg = slotDM / (feedDM / 100);

                // Cost
                const costPerKg = this.getFeedCost(feed);
                dailyCost = asFedKg * costPerKg;
            }

            // Update UI
            if (kgEl) kgEl.textContent = asFedKg > 0 ? `${asFedKg.toFixed(2)} kg` : '-';
            if (costEl) costEl.textContent = dailyCost > 0 ? `${dailyCost.toFixed(2)} €` : '-';

            // Accumulate
            totalKg += asFedKg;
            totalCost += dailyCost;
        });

        // 4. Update Totals
        const totalKgEl = document.getElementById('dietTotalKg');
        const totalCostEl = document.getElementById('dietTotalCost');

        if (totalKgEl) totalKgEl.textContent = `${totalKg.toFixed(2)} kg`;
        if (totalCostEl) totalCostEl.textContent = `${totalCost.toFixed(2)} €`;

        // 5. Update Phase/Notes
        let phase = 'Mantenimiento';
        if (ageMonths < 12) phase = 'Crecimiento';
        else if (ageMonths > 12 && system.includes('Intensivo')) phase = 'Terminado';

        if (this.dom.dietPhase) this.dom.dietPhase.textContent = `Fase: ${phase}`;

        if (this.dom.dietNotes) {
            this.dom.dietNotes.innerHTML = `
                <strong>Meta de Ingesta (MS):</strong> ${dmi.toFixed(2)} kg/día (${(dmiFactor * 100).toFixed(1)}% PV).<br>
                <strong>Estrategia:</strong> ${phase} - ${system || 'Estándar'}.
            `;
        }

        // 6. Alerts (Indicus, etc)
        let alertsHtml = '';
        if (breedName.toLowerCase().includes('indicus') && targetPcts[3] > 40) {
            alertsHtml += `<div class="alert warn" style="color:#d97706; background:#fffbeb; padding:5px; border-radius:4px; font-size:0.9em; margin-bottom:5px;">⚠️ Raza Índica: Precaución con exceso de concentrados.</div>`;
        }
        if (this.dom.dietAlerts) this.dom.dietAlerts.innerHTML = alertsHtml;
    },

    updateField(key, value) {
        if (this.dom[key]) {
            if (this.dom[key].tagName === 'INPUT' || this.dom[key].tagName === 'SELECT') {
                this.dom[key].value = value;
            } else {
                this.dom[key].textContent = value;
            }
        }
    },

    clearResults() {
        ['breed', 'sex', 'system', 'ageDays', 'ageMonths', 'weight', 'targetWeight', 'date', 'adg', 'carcass'].forEach(k => this.updateField(k, ''));
        if (this.dom.daysRemaining) this.dom.daysRemaining.textContent = '0 días';

        // Reset diet table numbers
        [1, 3, 4, 5].forEach(i => {
            const k = document.getElementById(`dietSlot${i}Kg`);
            const c = document.getElementById(`dietSlot${i}Cost`);
            if (k) k.textContent = '-';
            if (c) c.textContent = '-';
        });
        const tk = document.getElementById('dietTotalKg');
        const tc = document.getElementById('dietTotalCost');
        if (tk) tk.textContent = '-';
        if (tc) tc.textContent = '-';
    }
};

// Auto-init on load
document.addEventListener('DOMContentLoaded', () => {
    AnimalCalculator.init();
});
