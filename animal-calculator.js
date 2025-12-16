// Animal Calculator Module
const AnimalCalculator = {
    init() {
        console.log('AnimalCalculator: Initializing...');
        this.cacheDOM();
        this.bindEvents();
        setTimeout(() => this.initSelectors(), 500);

        window.AnimalCalculator = this;
    },

    cacheDOM() {
        this.dom = {
            container: document.getElementById('calculator'),
            input: document.getElementById('calcAnimalInput'),
            suggestions: document.getElementById('calcAnimalSuggestions'),

            breed: document.getElementById('calcBreed'),
            sex: document.getElementById('calcSex'),
            ageMonths: document.getElementById('calcAgeMonths'),
            stage: document.getElementById('calcStage'),
            weight: document.getElementById('calcWeight'),
            system: document.getElementById('calcSystem'),

            targetWeight: document.getElementById('calcTargetWeight'),
            date: document.getElementById('calcDate'),
            daysRemaining: document.getElementById('calcDaysRemaining'),
            adg: document.getElementById('calcADG'),
            carcass: document.getElementById('calcCarcass'),
            yield: document.getElementById('calcYield'),
            objective: document.getElementById('calcObjective'),

            reqDisplay: document.getElementById('nutritionRequirements'),
            dietPhase: document.getElementById('dietPhase'),
            dietTableBody: document.getElementById('dietTableBody'),
            dietNotes: document.getElementById('dietNotes'),
            dietAlerts: document.getElementById('dietAlerts'),

            // Nutrient Balance UI
            npIngestN: document.getElementById('npIngestN'),
            npExcretN: document.getElementById('npExcretN'),
            npRetentN: document.getElementById('npRetentN'),
            npEffN: document.getElementById('npEffN'),

            npIngestP: document.getElementById('npIngestP'),
            npExcretP: document.getElementById('npExcretP'),
            npRetentP: document.getElementById('npRetentP'),
            npEffP: document.getElementById('npEffP')
        };
    },

    bindEvents() {
        if (!this.dom.input) return;

        this.dom.input.addEventListener('input', () => this.handleSearch());
        this.dom.input.addEventListener('focus', () => this.handleSearch());

        document.addEventListener('click', (e) => {
            if (this.dom.suggestions && !this.dom.input.contains(e.target) && !this.dom.suggestions.contains(e.target)) {
                this.dom.suggestions.classList.add('hidden');
            }
        });

        if (this.dom.system) this.dom.system.addEventListener('change', () => this.handleRecalculation());
        if (this.dom.objective) this.dom.objective.addEventListener('change', () => this.handleRecalculation());

        const saveBtn = document.getElementById('saveDietPlan');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                if (this.currentAnimalId) this.saveDietProtocol();
                else alert('Selecciona un animal primero');
            });
        }
    },

    initSelectors(retries = 5, recommendedType = null, objective = 'Mantenimiento') {
        const feedSource = window.FEED_DATA || FEED_DATA || {};
        const allFeeds = Object.values(feedSource);

        if (allFeeds.length === 0) {
            if (retries > 0) setTimeout(() => this.initSelectors(retries - 1, recommendedType, objective), 500);
            return;
        }

        [1, 3, 4, 5].forEach(slot => {
            const select = document.getElementById(`dietSlot${slot}`);
            if (!select) return;

            const currentVal = select.value;

            if (select.options.length > 1) {
                while (select.options.length > 1) select.remove(1);
            }

            let filterType = [];
            if (slot === 1) filterType = ['Forraje', 'Pasto', 'Ensilado', 'Paja', 'Heno'];
            else if (slot === 3) filterType = ['Energía', 'Grano', 'Concentrado'];
            else if (slot === 4) filterType = ['Proteico', 'Concentrado', 'Leguminosa'];
            else if (slot === 5) filterType = ['Suplemento', 'Mineral', 'Vitamina', 'Aditivo', 'Corrector'];

            let eligibleFeeds = allFeeds.filter(f => {
                return filterType.some(t => (f.Type || f.type || '').includes(t));
            });

            // 1. Scoring Logic based on Objective
            // Map Objective to Strategy
            const isMaxGrowth = objective.includes('Máximo') || objective.includes('Cebo');
            const isEconomic = objective.includes('Mantenimiento') || objective.includes('Económico');

            eligibleFeeds.forEach(feed => {
                feed._score = 0;
                feed._isRecommended = false;

                const pb = parseFloat(feed.cp_percent || feed.Porcentaje_PB || 0);
                const en = parseFloat(feed.energia_neta_Mcal_kg || feed.Energia_Neta_Mcal_kg || 1.0);
                const cost = this.getFeedCost(feed);

                // Base Score: Avoid Missing Data
                if (en > 0) feed._score += 1;

                // Strategy Scoring
                if (isMaxGrowth) {
                    // Prioritize Energy & Digestibility
                    feed._score += en * 10; // High Energy
                    if (cost < 0.30) feed._score += 2; // Reasonable cost bonus
                } else if (isEconomic) {
                    // Prioritize Low Cost
                    if (cost > 0) feed._score += (1 / cost); // Inverse cost
                    // But ensure minimum quality?
                } else {
                    // Balanced / Crecimiento
                    feed._score += en * 5 + (cost > 0 ? (0.5 / cost) : 0);
                }

                // Stage Recommendation Match (Keywords)
                if (recommendedType) {
                    const recList = Array.isArray(recommendedType) ? recommendedType : [recommendedType];
                    const slotRec = recList.find(r => r.slot === slot);
                    if (slotRec) {
                        const nameLower = feed.name.toLowerCase();
                        if (slotRec.keywords && slotRec.keywords.some(k => nameLower.includes(k.toLowerCase()))) {
                            feed._score += 20; // Huge bonus for Nutritional Fit
                            feed._isRecommended = true;
                        }
                    }
                }
            });

            // Sort by Score DESC
            eligibleFeeds.sort((a, b) => b._score - a._score);

            eligibleFeeds.forEach(feed => {
                const opt = document.createElement('option');
                opt.value = feed.ID || feed.id;

                opt.textContent = feed.name;

                if (feed._isRecommended) {
                    opt.style.fontWeight = 'bold';
                    opt.style.color = '#16a34a'; // Greenish
                }
                select.appendChild(opt);
            });

            if (currentVal && Array.from(select.options).some(o => o.value == currentVal)) {
                select.value = currentVal;
            } else if (select.options.length > 1) {
                select.selectedIndex = 1;
            }

            if (!select.hasAttribute('data-bound')) {
                select.addEventListener('change', () => this.handleDietChange(slot));
                select.setAttribute('data-bound', 'true');
            }
        });


        // FIX: Force initial calculation after population so ADG doesn't show 0.00 (Delayed)
        setTimeout(() => {
            console.log('[Calculator] Triggering initial calculation...');
            this.updateDietCalculationsFromDOM(false);
        }, 500);
    },

    handleRecalculation() {
        if (this.currentAnimalId) this.calculate(this.currentAnimalId, true);
    },

    handleDietChange(changedSlot) {
        this.updateDietCalculationsFromDOM(false);
    },

    getFeedCost(feed) {
        if (!feed) return 0;
        const val = feed.cost_eur_kg || feed.Coste_Eur_kg || feed.coste_eur_kg || feed.cost || feed.Cost || 0;
        return parseFloat(val) || 0;
    },

    // REFINED PERCENTAGE LOGIC
    getTargetPercentages(ageMonths, breedName, system) {
        // Default (Start with Feedlot assumptions but modify based on Stage)
        let pct = { 1: 60, 3: 25, 4: 12, 5: 3 };

        const stageId = this.currentStageObj ? this.currentStageObj.id : '';

        // Prioritize System
        if (system && (system.includes('Pastoreo') || system.includes('Extensivo'))) {
            // Grazing: Mostly Forage
            pct = { 1: 85, 3: 10, 4: 3, 5: 2 };
        } else {
            // Intensivo / Feedlot Logic
            if (ageMonths < 6) {
                // Creep Feeding / Starter
                pct = { 1: 40, 3: 35, 4: 22, 5: 3 };
            } else if (ageMonths < 12) {
                // Backgrounding
                pct = { 1: 55, 3: 30, 4: 13, 5: 2 };
            } else {
                // Finishing or Adult?
                if (stageId === 'reposicion' || stageId === 'gestacion' || stageId === 'lactancia_adulta' || stageId === 'gestacion_confirmada') {
                    // MAINTENANCE / COWS -> High Forage
                    pct = { 1: 80, 3: 15, 4: 3, 5: 2 };
                } else if (stageId === 'cebo' || stageId === 'engorde') {
                    // FINISHING (Engorde) -> High Energy
                    pct = { 1: 25, 3: 60, 4: 12, 5: 3 };
                } else {
                    // Default Adult / Toro / Other
                    pct = { 1: 70, 3: 20, 4: 8, 5: 2 };
                }
            }
        }

        // Special Breed Adjustments
        if (breedName && breedName.toLowerCase().includes('indicus')) {
            // Indicus needs more fiber to prevent acidosis
            if (pct[1] < 40) pct[1] = 40;
            pct[3] = 100 - pct[1] - pct[4] - pct[5];
        }

        return pct;
    },

    // Check if Montanera Protocol is Active
    isMontaneraActive() {
        const chk = document.getElementById('toggleMontanera');
        return chk && chk.checked;
    },

    updateDietCalculationsFromDOM(updateSelectors = true) {
        const ageMonths = parseFloat(this.dom.ageMonths.value) || 12;
        const currentWeight = parseFloat(this.dom.weight.value) || 400;
        const system = this.dom.system ? this.dom.system.value : 'Intensivo';
        const breedName = this.dom.breed.value || '';

        const adg = parseFloat(this.dom.adg.textContent) || 1.2;
        this.recommendDiet(ageMonths, { name: breedName }, currentWeight, system, this.manualTargetWeight, adg, updateSelectors);
    },

    saveDietProtocol() {
        if (!this.currentAnimalId) return;

        let userRaw = localStorage.getItem('sessionUser');
        let user = 'default';
        if (userRaw) try { user = JSON.parse(userRaw); } catch (e) { user = userRaw; }

        const animals = JSON.parse(localStorage.getItem(`animals_${user}`) || '[]');
        const animal = animals.find(a => a.id === this.currentAnimalId);
        if (!animal) return;

        // Calculate Total Cost for Saving
        let currentCost = 0;
        [1, 3, 4, 5].forEach(slot => {
            const costEl = document.getElementById(`dietSlot${slot}Cost`);
            if (costEl && costEl.textContent) {
                const val = parseFloat(costEl.textContent.replace('€', '').trim());
                if (!isNaN(val)) currentCost += val;
            }
        });

        const phase = this.dom.dietPhase ? this.dom.dietPhase.textContent.replace('Fase: ', '') : 'General';
        const targetW = this.manualTargetWeight ? `(Meta: ${this.manualTargetWeight}kg)` : '';

        const noteEvent = {
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString(),
            type: 'Plan Nutrición',  // Explicit Type used for filtering
            animalId: animal.id,
            animalCrotal: animal.crotal,
            desc: `DIETA ASIGNADA (${phase}): Coste: ${currentCost.toFixed(2)}€/día. ${targetW} Ver Calculadora.`
        };

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        const reviewEvent = {
            id: (Date.now() + 1).toString(),
            date: futureDate.toISOString().split('T')[0],
            time: '09:00:00',
            type: 'Pesaje',
            animalId: animal.id,
            animalCrotal: animal.crotal,
            desc: `REVISIÓN PLAN NUTRICIÓN: ${phase}. Ajustar dieta según GMD real.`
        };

        const events = JSON.parse(localStorage.getItem('events') || '[]');
        events.push(noteEvent, reviewEvent);
        localStorage.setItem('events', JSON.stringify(events));

        alert(`Plan guardado.`);
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

        let userRaw = localStorage.getItem('sessionUser');
        let user = 'default';
        if (userRaw) try { user = JSON.parse(userRaw); } catch (e) { user = userRaw; }
        const animals = JSON.parse(localStorage.getItem(`animals_${user}`) || '[]');
        const matches = animals.filter(a => (a.crotal || '').toLowerCase().includes(term));

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
            const nameStr = a.name ? `(${a.name})` : '';
            li.textContent = `${a.crotal} ${nameStr} [${a.breed}]`;
            li.onclick = () => {
                this.dom.input.value = a.crotal;
                this.calculate(a.id);
                list.classList.add('hidden');
            };
            list.appendChild(li);
        });
        list.classList.remove('hidden');
    },

    async calculate(animalId, preserveSystem = false) {
        this.currentAnimalId = animalId;
        let userRaw = localStorage.getItem('sessionUser');
        let user = 'default';
        if (userRaw) try { user = JSON.parse(userRaw); } catch (e) { user = userRaw; }

        const normalize = (str) => str ? str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
        const animals = JSON.parse(localStorage.getItem(`animals_${user}`) || '[]');
        const animal = animals.find(a => a.id === animalId);
        if (!animal) return;

        // Load Breed
        let breedData = null;
        if (typeof BreedDataManager !== 'undefined') {
            if (BreedDataManager._breeds.size === 0) await BreedDataManager.load();
            breedData = BreedDataManager.getBreedSmart(animal.breed) ||
                BreedDataManager.getBreedSmart(normalize(animal.breed));
        }

        this.updateField('breed', animal.breed || '-');
        this.updateField('sex', animal.sex || '-');

        const birthDate = new Date(animal.birthDate);
        const ageDays = Math.floor((new Date() - birthDate) / (1000 * 60 * 60 * 24));
        const ageMonths = (ageDays / 30.44).toFixed(1);
        this.updateField('ageMonths', ageMonths);

        // Stage
        let stage = '-';
        let stageObj = null;
        const m = parseFloat(ageMonths);
        if (typeof NutritionEngine !== 'undefined') {
            // --- ENHANCED REPRODUCTIVE METRICS ---
            const allEvents = JSON.parse(localStorage.getItem('events') || '[]');
            const animalEvents = allEvents.filter(e => e.animalId === animal.id || (animal.crotal && e.animalCrotal === animal.crotal));

            // 1. Pregnancy Status \u0026 Duration
            let isPregnant = false;
            let monthsPregnant = 0;

            // Check via Utility or Event History
            if (typeof getReproductiveStatus === 'function') {
                const statusObj = getReproductiveStatus(animal, allEvents);
                // "Cubierta" implies inseminated/covered but not confirmed. 
                // For nutrition safety (especially high demand early lactation+gestation), we treat as Pregnant.
                isPregnant = (statusObj.status === 'Gestante' || statusObj.status === 'Preñada' || statusObj.status === 'Cubierta');
            }

            if (isPregnant) {
                // Calculate Months Pregnant
                // Fallback: Look for last Insemination
                const insems = animalEvents.filter(e => e.type === 'Inseminación' || e.type === 'Monta');
                insems.sort((a, b) => new Date(b.date) - new Date(a.date));
                if (insems.length > 0) {
                    const conceptionDate = new Date(insems[0].date);
                    const diffDays = (new Date() - conceptionDate) / (1000 * 60 * 60 * 24);
                    monthsPregnant = diffDays / 30.44;
                }
            }

            // 2. Lactation Status \u0026 Days Post Partum
            let daysPostPartum = 999;
            const partos = animalEvents.filter(e => e.type === 'Parto');
            partos.sort((a, b) => new Date(b.date) - new Date(a.date));

            if (partos.length > 0) {
                const lastParto = new Date(partos[0].date);
                const diffDays = (new Date() - lastParto) / (1000 * 60 * 60 * 24);
                daysPostPartum = diffDays;
            }

            // 3. BCS (Body Condition Score) - Optional, default 3.0
            // Could fetch from last 'Pesaje' desc if formatted like "Peso 500kg BCS 3.5"
            let bcs = 3.0;

            console.log(`[Calculator] Stage Calc: Pregnant=${isPregnant} (${monthsPregnant.toFixed(1)}m), DaysPostPartum=${daysPostPartum.toFixed(0)}`);

            stageObj = NutritionEngine.determineStage(m, animal.sex, isPregnant, monthsPregnant, daysPostPartum, bcs);
            if (stageObj) {
                stage = stageObj.name;
                this.currentStageObj = stageObj;
            }
        }
        this.updateField('stage', stage);
        if (this.dom.dietPhase) this.dom.dietPhase.textContent = `Fase: ${stage}`;

        // --- WEIGHT FALLBACK LOGIC ---
        let currentWeight = parseFloat(animal.currentWeight || 0);
        if (!currentWeight || currentWeight === 0) {
            // Try to find from events
            const events = JSON.parse(localStorage.getItem('events') || '[]');
            const weightEvents = events.filter(e =>
                (e.animalId === animal.id || e.animalCrotal === animal.crotal) &&
                (e.desc.includes('Peso') || e.desc.includes('Parto'))
            );
            weightEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
            if (weightEvents.length > 0) {
                const match = weightEvents[0].desc.match(/(\d+(\.\d+)?)\s*kg/i);
                if (match) currentWeight = parseFloat(match[1]);
            }
        }

        // Critical Fallback if still 0
        if (!currentWeight || currentWeight === 0) {
            const birthW = parseFloat(animal.birthWeight) || 35;
            // Estimate: Birth + (AgeDays * 0.8 kg/day)
            currentWeight = birthW + (ageDays * 0.8);
            console.warn(`[Calculator] No weight found. Estimated: ${currentWeight.toFixed(1)}kg`);

            // Mark as estimated in UI
            this.dom.weight.style.color = 'orange';
            this.dom.weight.title = 'Peso estimado (no hay pesajes recientes)';
        } else {
            this.dom.weight.style.color = '';
        }
        this.updateField('weight', currentWeight.toFixed(0));

        let system = 'Intensivo (Feedlot)';
        if (preserveSystem) system = this.dom.system.value;
        else this.updateField('system', system);

        let adg = 1.2;
        if (breedData) {
            const adgFeedlot = parseFloat(breedData.adg_feedlot || 1.3);
            const adgGrazing = parseFloat(breedData.adg_grazing || 0.7);
            if (system.includes('Pastoreo') || system.includes('Extensivo')) adg = adgGrazing;
            else if (system.includes('Mixto')) adg = (adgFeedlot + adgGrazing) / 2;
            else adg = adgFeedlot;
        }

        // Objective & Heterosis (Simplified for brevity as they are working)
        const objective = this.dom.objective ? this.dom.objective.value : 'Mantenimiento';
        if (objective.includes('Máximo')) adg *= 1.15;
        else if (objective.includes('Mantenimiento')) adg *= 0.6;

        const breedLower = animal.breed.toLowerCase();
        if (!breedLower.includes('mestizo') && (breedLower.includes('cross') || breedLower.includes('cruce'))) adg *= 1.05;

        this.updateField('adg', adg.toFixed(2));

        // Targets
        let adultRef = 600; // Default
        if (breedData) {
            const sex = (this.dom.sex.value || '').toLowerCase();
            if (sex === 'hembra') {
                adultRef = parseFloat(breedData.weight_female_adult || 550);
            } else {
                adultRef = parseFloat(breedData.weight_male_adult || 900);
            }
        }

        let recommendedWeight = adultRef * 0.65; // Base 65%

        // Adjust based on Objective
        if (objective.includes('Máximo') || objective.includes('Cebo')) {
            // Ensure at least 15% growth projection for fattening
            recommendedWeight = Math.max(recommendedWeight, currentWeight * 1.15);
        } else if (objective.includes('Crecimiento')) {
            recommendedWeight = Math.max(recommendedWeight, currentWeight * 1.05);
        }

        // If explicitly Maintenance, effectively no date unless manual override.
        if (recommendedWeight < currentWeight && !this.manualTargetWeight) recommendedWeight = currentWeight;

        // Manual Target Weight Logic
        let targetWeight = recommendedWeight;
        if (this.manualTargetWeight) {
            targetWeight = this.manualTargetWeight;
        }

        // Render Target Weight Input
        if (this.dom.targetWeight) {
            // Check if we already injected the input
            const container = this.dom.targetWeight.parentElement; // Assume it's inside a wrapper or we replace content
            // Assuming this.dom.targetWeight is the element to hold the value. 
            // We'll replace its content with our interactive UI.

            this.dom.targetWeight.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:start;">
                    <div style="display:flex; align-items:center; gap:5px;">
                        <input type="number" id="manualTargetInput" value="${targetWeight.toFixed(0)}" 
                            style="width:70px; padding:2px; text-align:right; border:1px solid #ddd; border-radius:4px;">
                        <span style="font-size:0.8em; color:gray;">kg</span>
                    </div>
                    <div style="font-size:0.7em; color:#6b7280;">(Rec: ${recommendedWeight.toFixed(0)} kg)</div>
                </div>
            `;

            // Bind Event
            setTimeout(() => {
                const input = document.getElementById('manualTargetInput');
                if (input) {
                    input.onchange = (e) => {
                        const val = parseFloat(e.target.value);
                        if (val && val > 0) {
                            this.manualTargetWeight = val;
                            // Trigger full recalculation to update diet/projections based on new target
                            this.calculate(animalId, true);
                        }
                    };
                }
            }, 0);
        }

        // Logic to determine Yield dynamically
        let yieldPct = 58; // Default

        // (Redundant Yield/Quality logic removed. Handled in recommendDiet)

        this.recommendDiet(parseFloat(ageMonths), breedData, currentWeight, system, targetWeight, adg);

        // Calculate Accumulated Cost (New Feature)
        this.calculateAccumulatedCost(animalId);
    },

    // NEW: Centralized Yield & Quality Logic
    _updateYieldAndQuality(ageMonths, breedData, currentWeight, system, targetWeight, adg, dietEnergyMcal) {
        if (typeof CarcassAndQualityEngine === 'undefined' || typeof AppConfig === 'undefined') return;

        try {
            // THI
            let thi = 72; // Default Comfort
            const tempEl = document.getElementById('weather-temp');
            if (tempEl) {
                const weatherTemp = parseFloat(tempEl.textContent) || 20;
                thi = CarcassAndQualityEngine.calculateTHI(weatherTemp, 50);
            }

            // Calculate days to reach target
            let projectedDays = 0;

            // --- Smart ADG (History + Current) ---
            let smartADG = adg;
            let historyADG = 0;
            try {
                const allEvents = JSON.parse(localStorage.getItem('events') || '[]');
                const weights = allEvents.filter(e =>
                    (e.animalId === this.currentAnimalId || (breedData && e.animalCrotal && e.animalCrotal === breedData.crotal)) &&
                    e.type === 'Pesaje' && e.weight
                ).sort((a, b) => new Date(a.date) - new Date(b.date));

                if (weights.length >= 2) {
                    const first = weights[0];
                    const last = weights[weights.length - 1];
                    const daysDiff = (new Date(last.date) - new Date(first.date)) / (1000 * 60 * 60 * 24);
                    if (daysDiff > 30) {
                        historyADG = (last.weight - first.weight) / daysDiff;
                        if (historyADG > 0) {
                            // Weight: 60% History (Reality), 40% Diet (Potential)
                            smartADG = (historyADG * 0.6) + (adg * 0.4);
                            console.log(`[Calculator] Smart ADG: ${smartADG.toFixed(2)} (History: ${historyADG.toFixed(2)})`);
                        }
                    }
                }
            } catch (err) { console.warn('Error history ADG', err); }

            const activeADG = smartADG > 0 ? smartADG : adg;

            if (targetWeight > currentWeight && activeADG > 0) {
                projectedDays = (targetWeight - currentWeight) / activeADG;
            }
            const projectedAgeMonths = parseFloat(ageMonths) + (projectedDays / 30.4);

            const carcassResult = CarcassAndQualityEngine.estimateCarcassResult(
                { ageMonths: projectedAgeMonths, system },
                targetWeight,
                activeADG,
                dietEnergyMcal,
                thi,
                breedData || {}
            );

            // Calculate Quality
            const isFinishing = CarcassAndQualityEngine.isFinishingDiet(dietEnergyMcal, 0.5);
            const daysFinish = isFinishing ? (projectedDays > 60 ? projectedDays : 60) : 0;

            const qualityResult = CarcassAndQualityEngine.calculateQualityIndex(
                { ageMonths: parseFloat(ageMonths), rc_percent: carcassResult.rc_percent },
                breedData || {},
                dietEnergyMcal,
                activeADG,
                thi,
                daysFinish,
                0, // dietStability
                0  // healthStatus
            );

            // Update UI
            const yieldPct = carcassResult.rc_percent;
            console.log('[Calculator] Reactive Yield:', yieldPct, '% (Diet Energy:', dietEnergyMcal.toFixed(2), ')');
            this.updateField('carcass', (targetWeight * (yieldPct / 100)).toFixed(0));
            // Compatibility Mapping for UI & Price Logic
            qualityResult.conformation = qualityResult.conformation_est || 'R';
            // Use Marbling (1-5) as a proxy for Fat Class (1-5) if not explicitly calculated
            qualityResult.fat = Math.round(qualityResult.marbling_est || 3);
            qualityResult.classification = `${qualityResult.conformation}${qualityResult.fat}`;

            this.updateField('yield', yieldPct);
            this.renderQualityUI(qualityResult, carcassResult);

            return { yieldPct, qualityResult };

        } catch (err) {
            console.error('Error in _updateYieldAndQuality:', err);
        }
    },

    calculateAccumulatedCost(animalId) {
        // Fetch events
        let userRaw = localStorage.getItem('sessionUser');
        let user = 'default';
        if (userRaw) try { user = JSON.parse(userRaw); } catch (e) { user = userRaw; }
        const events = JSON.parse(localStorage.getItem('events') || '[]');

        // Filter for this animal and Diet Plans
        // Assuming diet plans are saved as notes or specific types or have costs in desc
        // Look for events that have "Coste:" in description or type 'Plan Nutrición' (if standard)
        // Adjust filter based on real data found. 
        // Using "Plan Nutrición" or "DIETA" in desc + Coste extraction

        const dietEvents = events.filter(e =>
            (e.animalId === animalId || e.animalCrotal === (this.dom.input.value || '')) &&
            (e.desc && (e.desc.includes('DIETA') || e.desc.includes('Plan') || e.desc.includes('Coste')))
        );

        dietEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

        let accumulated = 0;
        let lastDate = null;
        let lastDailyCost = 0;

        dietEvents.forEach(e => {
            const currentDate = new Date(e.date);

            // Extract Cost from Description: "Coste: 1.25€/día"
            let cost = 0;
            const match = e.desc.match(/Coste:\s*([\d\.]+)/i);
            if (match) cost = parseFloat(match[1]);

            if (lastDate && lastDailyCost > 0) {
                const days = (currentDate - lastDate) / (1000 * 60 * 60 * 24);
                if (days > 0) accumulated += days * lastDailyCost;
            }

            lastDate = currentDate;
            lastDailyCost = cost;
        });

        // Add from last event to today
        if (lastDate && lastDailyCost > 0) {
            const today = new Date();
            const days = (today - lastDate) / (1000 * 60 * 60 * 24);
            if (days > 0) accumulated += days * lastDailyCost;
        }

        // Inject into UI (e.g., near Projections)
        if (accumulated > 0) {
            const dateEl = this.dom.daysRemaining;
            if (dateEl && dateEl.parentElement) {
                const kpiCard = dateEl.parentElement;
                let costDiv = kpiCard.querySelector('.accumulated-cost');
                if (!costDiv) {
                    costDiv = document.createElement('div');
                    costDiv.className = 'accumulated-cost';
                    costDiv.style.marginTop = '4px';
                    costDiv.style.fontSize = '0.75em';
                    costDiv.style.color = '#7c2d12'; // darker orange/brown
                    costDiv.style.borderTop = '1px dashed #fdba74';
                    costDiv.style.paddingTop = '4px';
                    kpiCard.appendChild(costDiv);
                }
                costDiv.innerHTML = `<strong>Coste Acumulado:</strong> <b>${accumulated.toFixed(0)} €</b>`;
            }
        }
    },

    recommendDiet(ageMonths, breedData, currentWeight, system, targetWeightOptional, adgOptional, updateSelectors = true) {
        let dmi = 0;

        if (typeof NutritionEngine !== 'undefined' && this.currentStageObj) {
            const targetADG = parseFloat(this.dom.adg.textContent) || 1.2;

            // Correct format: calculateDiet(breed, weight, age)
            const dietCalc = NutritionEngine.calculateDiet(breedData, currentWeight, ageMonths);

            // Handle null return if breedData is missing or something fails
            if (dietCalc) {
                // Use dmiKg from engine, or fallback to internal prop if changed
                dmi = dietCalc.dmiKg || dietCalc.dmi_target || (currentWeight * 0.025);
            } else {
                dmi = currentWeight * 0.025;
            }

            this.displayNutritionalRequirements(this.currentStageObj, dmi);
        } else {
            dmi = currentWeight * 0.025;
        }

        const objective = this.dom.objective ? this.dom.objective.value : 'Mantenimiento';

        // Recommendations Logic (Multi-slot)
        let recommendations = [];

        // FIX: Ensure breedName is defined for validation and safer DOM access
        let breedName = 'Unknown';
        if (breedData && breedData.name) {
            breedName = breedData.name;
        } else if (this.dom.breed && this.dom.breed.selectedIndex >= 0 && this.dom.breed.options) {
            breedName = this.dom.breed.options[this.dom.breed.selectedIndex].text;
        }

        if (this.currentStageObj && this.currentStageObj.req) {
            const r = this.currentStageObj.req;
            const reqPb = parseFloat(r.pb) || 14;
            const reqEn = parseFloat(r.en) || 1.5;
            const reqFdn = parseFloat(r.fdn ? r.fdn.replace(/[<>%]/g, '') : 0);

            // Slot 1: Forage (Base)
            if (reqFdn > 35) {
                // High Fiber (Cows, Rearing) -> Dry Fodder
                recommendations.push({ slot: 1, keywords: ['Heno', 'Paja', 'Pasto'] });
            } else {
                // High Energy (Fattening) -> Silage/Fresh
                recommendations.push({ slot: 1, keywords: ['Silaje', 'Maíz', 'Ensilado'] });
            }

            // Slot 3: Energy (Grains)
            recommendations.push({ slot: 3, keywords: ['Maíz', 'Cebada', 'Trigo'] });

            // Slot 4: Protein
            if (reqPb > 15) {
                recommendations.push({ slot: 4, keywords: ['Soja', '44', 'High'] }); // Soja 44, etc.
            } else {
                recommendations.push({ slot: 4, keywords: ['Colza', 'Girasol', 'Soja'] });
            }

            // Slot 5: Correctors (Only if high production or intensive)
            // Checks: Cebo, Lactancia, or Intensive System
            const isIntensive = (system && system.includes('Intensivo')) || (this.currentStageObj.id === 'cebo') || (this.currentStageObj.id === 'lactancia');
            if (isIntensive) {
                recommendations.push({ slot: 5, keywords: ['Corrector', 'Mineral', 'Vitamínico'] });
            }

            if (updateSelectors) {
                this.initSelectors(0, recommendations, objective);
            }

            // --- INJECT MONTANERA TOGGLE (Dynamic) ---
            const objContainer = this.dom.objective ? this.dom.objective.parentNode : null;
            if (objContainer && !document.getElementById('montanera-toggle-container')) {
                const div = document.createElement('div');
                div.id = 'montanera-toggle-container';
                div.style.marginTop = '8px';
                div.style.padding = '8px';
                div.style.background = '#fef3c7'; // Amber-50
                div.style.border = '1px solid #fcd34d';
                div.style.borderRadius = '6px';
                div.style.display = 'flex';
                div.style.alignItems = 'center';
                div.style.justifyContent = 'space-between';

                div.innerHTML = `
                    <div style="display:flex; align-items:center;">
                        <input type="checkbox" id="toggleMontanera" style="margin-right:8px; width:16px; height:16px;">
                        <div>
                            <label for="toggleMontanera" style="font-weight:bold; color:#92400e; font-size:0.9em; cursor:pointer;">Protocolo Montanera (Bellota)</label>
                            <div style="font-size:0.75em; color:#b45309;" id="montanera-season-msg">Verificando temporada...</div>
                        </div>
                    </div>
                    <span id="bellota-status-icon" style="font-size:1.2em;">🌰</span>
                `;

                objContainer.appendChild(div);

                // Bind Event
                const chk = div.querySelector('#toggleMontanera');
                chk.addEventListener('change', () => {
                    this.updateDietCalculationsFromDOM(true);
                });
            }

            // Update Season Message
            const seasonMsg = document.getElementById('montanera-season-msg');
            const chk = document.getElementById('toggleMontanera');
            if (seasonMsg && NutritionEngine.BELLOTA_PROTOCOL) {
                const isSeason = NutritionEngine.BELLOTA_PROTOCOL.isBellotaSeason();
                const startDate = NutritionEngine.BELLOTA_PROTOCOL.SEASON_START;
                // Simple textual representation
                if (isSeason) {
                    seasonMsg.textContent = 'Temporada Activa (Oct-Ene). Bellota disponible.';
                    seasonMsg.style.color = '#15803d'; // Green
                    if (chk) chk.disabled = false;
                } else {
                    seasonMsg.textContent = 'Fuera de Temporada. Se usará sustituto Alto-Oleico.';
                    seasonMsg.style.color = '#b91c1c'; // Red
                    // We allow checking it to Simulate High Oleic substitution
                }
            }

        }

        // Calc Table
        const feedSource = window.FEED_DATA || FEED_DATA || {};
        let targetPcts = this.getTargetPercentages(ageMonths, (breedData ? breedData.name : ''), system);

        // --- BELLOTA PROTOCOL LOGIC ---
        const isBellotaMode = this.isMontaneraActive();
        if (isBellotaMode) {
            const isSeason = NutritionEngine.BELLOTA_PROTOCOL.isBellotaSeason();

            // Override Percentages for Montanera
            // User Req: Bellota 10-35% (Slot 3), Pasto 40-70% (Slot 1), Forraje 10-20% (Slot 1 split?)
            // Simplified: Slot 1 (Pasto+Forraje) = 65%, Slot 3 (Bellota) = 30%, Slot 4/5 = 5%
            targetPcts = { 1: 65, 3: 30, 4: 3, 5: 2 };

            if (!isSeason) {
                // Substitution Mode (High Oleic)
                // Keep same percentages but swap feed item below
            }
        }

        let totalCost = 0;
        let totalDM = 0;
        let totalAsFed = 0;
        let totalProtein = 0;
        let totalEnergy = 0;
        let totalPhosphorus = 0; // NEW: Track P

        [1, 3, 4, 5].forEach(slot => {
            const select = document.getElementById(`dietSlot${slot}`);
            const pctEl = document.getElementById(`dietSlot${slot}Pct`);
            const kgEl = document.getElementById(`dietSlot${slot}Kg`);
            const costEl = document.getElementById(`dietSlot${slot}Cost`);

            // --- BELLOTA AUTO-SELECTION ---
            if (isBellotaMode && select) {
                const isSeason = NutritionEngine.BELLOTA_PROTOCOL.isBellotaSeason();
                // Slot 3: Force Bellota or Subst
                if (slot === 3) {
                    // Try to find specific Bellota de Encina or Alto Oleico
                    let targetTerm = isSeason ? 'Bellota' : 'Alto Oleico';
                    // Specific matching for "Bellota de encina"
                    let match = Array.from(select.options).find(o => o.text.toLowerCase().includes(targetTerm.toLowerCase()));
                    if (!match && !isSeason) {
                        // Fallback matching
                        match = Array.from(select.options).find(o => o.text.includes('Lecitina') || o.text.includes('Grasa'));
                    }
                    if (match) select.value = match.value;

                }
                // Slot 1: Force Pasto Dehesa
                if (slot === 1) {
                    let match = Array.from(select.options).find(o => o.text.includes('Dehesa') || o.text.includes('Pasto'));
                    if (match) select.value = match.value;
                }
            }

            if (!select) return;
            if (!select.value && select.options.length > 1) select.selectedIndex = 1;

            const feedId = select.value;
            const feed = feedSource[feedId] || Object.values(feedSource).find(f => f.ID == feedId || f.id == feedId);

            let asFedKg = 0;
            let dailyCost = 0;
            let currentPct = targetPcts[slot] || 0;

            if (feed) {
                const dmVal = feed.dm_percent || feed.Porcentaje_MS || feed.porcentaje_ms || 88;
                const dmContent = parseFloat(dmVal) / 100;

                const kgDM = dmi * (currentPct / 100);
                asFedKg = kgDM / (dmContent || 1); // Avoid div by zero

                const cost = this.getFeedCost(feed);
                dailyCost = asFedKg * cost;

                totalCost += dailyCost;
                totalDM += kgDM;
                totalAsFed += asFedKg;

                const pbVal = feed.cp_percent || feed.Porcentaje_PB || feed.porcentaje_pb || 0;
                totalProtein += (parseFloat(pbVal) / 100) * kgDM;

                // Phosphorus check
                const pVal = feed.p_percent || feed.phosphorus || feed.Fosforo || 0.3; // Default 0.3% if missing
                totalPhosphorus += (parseFloat(pVal) / 100) * kgDM;

                const enVal = feed.energia_neta_Mcal_kg || feed.Energia_Neta_Mcal_kg || 1.5;
                totalEnergy += parseFloat(enVal) * kgDM;
            }

            if (pctEl) pctEl.textContent = `${currentPct}%`;

            if (kgEl) kgEl.textContent = feed && !isNaN(asFedKg) ? `${asFedKg.toFixed(1)} kg` : '-';
            if (costEl) costEl.textContent = feed && !isNaN(dailyCost) ? `${dailyCost.toFixed(2)} €` : '-';
        });

        // UPDATE TOTALS IN DOM
        const dietTotalKgEl = document.getElementById('dietTotalKg');
        const dietTotalCostEl = document.getElementById('dietTotalCost');

        if (dietTotalKgEl) dietTotalKgEl.textContent = totalAsFed > 0 ? `${totalAsFed.toFixed(1)} kg` : '-';
        if (dietTotalCostEl) dietTotalCostEl.textContent = totalCost > 0 ? `${totalCost.toFixed(2)} €` : '-';

        // --- REACTIVE YIELD UPDATE ---
        const avgEn = totalDM > 0 ? (totalEnergy / totalDM) : 2.0;
        const reactiveStats = this._updateYieldAndQuality(ageMonths, breedData, currentWeight, system, targetWeightOptional, adgOptional, avgEn);

        // --- REACTIVE PERFORMANCE CALCULATION ---
        let computedADG = parseFloat(adgOptional || 1.0);
        let limitingFactor = 'Desconocido';

        if (NutritionEngine && NutritionEngine.calculatePerformance) {
            const dietStats = {
                totalEnergyMcal: totalEnergy,
                totalProteinG: totalProtein * 1000, // already in grams? Wait, check loop.
                // Loop says: totalProtein += (parseFloat(pbVal) / 100) * kgDM; -> This is kg Protein.
                // Need to multiply by 1000 to get grams if calculatePerformance expects grams. 
                // Let's check calculatePerformance: "totalProteinG" in dietStats.
                // The loop accumulated KG of protein (kgDM * percentage). So yes, * 1000.
                dmiKg: totalDM
            };
            // Wait, previous code: totalProtein += (parseFloat(pbVal) / 100) * kgDM; -> This is Kg of Protein.
            // My previous thought "totalProteinG" suggests Grams. 
            // Let's correct the loop variable name mentally: totalProteinKg.

            const statsForEngine = {
                totalEnergyMcal: totalEnergy,
                totalProteinG: totalProtein * 1000,
                dmiKg: totalDM
            };

            const perf = NutritionEngine.calculatePerformance(breedData, statsForEngine, currentWeight);
            computedADG = perf.predictedADG;
            limitingFactor = perf.limitingFactor;

            // Update ADG UI
            // Update ADG UI
            if (this.dom.adg) {
                const safeADG = !isNaN(computedADG) ? computedADG : 0;
                this.dom.adg.textContent = `${safeADG.toFixed(2)} kg/día`;
                this.dom.adg.title = `Limitado por: ${perf.limitingFactor}`;

                // Visual Feedback
                if (limitingFactor === 'Genetics') this.dom.adg.style.color = '#10b981'; // Green
                else if (limitingFactor.includes('Deficit')) this.dom.adg.style.color = '#991b1b'; // Dark Red
                else if (limitingFactor === 'BellotaProtocol') this.dom.adg.style.color = '#d97706'; // Amber for Protocol Limit
                else this.dom.adg.style.color = '#374151'; // Default Gray/Red? Let's use neutral or dark text if standard.
                // Original was Red for Diet Limited. 
                if (!limitingFactor.includes('Genetics') && !limitingFactor.includes('Bellota')) this.dom.adg.style.color = '#ea580c'; // Orange-Red for diet limits
            }
        }

        // --- UPDATE PROJECTIONS (Reactive) ---
        const targetW = targetWeightOptional || (currentWeight * 1.5);
        this.updateField('targetWeight', targetW.toFixed(0));

        if (computedADG > 0.05) {
            const gainNeeded = Math.max(0, targetW - currentWeight);
            const days = Math.ceil(gainNeeded / computedADG);
            const today = new Date();
            const finishDate = new Date();
            finishDate.setDate(today.getDate() + days); // Add days

            this.updateField('date', finishDate.toLocaleDateString());
            this.updateField('daysRemaining', `${days} días`);

            // Projected Cost
            const kpiCard = this.dom.daysRemaining?.parentElement;
            if (kpiCard) {
                let pCost = kpiCard.querySelector('.proj-cost');
                if (!pCost) {
                    pCost = document.createElement('div');
                    pCost.className = 'proj-cost';
                    pCost.style.fontSize = '0.75em';
                    pCost.style.color = '#6b7280';
                    pCost.style.marginTop = '4px';
                    kpiCard.appendChild(pCost);
                }
                const totalProj = totalCost * days;
                pCost.innerHTML = `Coste Proy.: <b>${totalProj.toFixed(0)}€</b>`;
            }
        } else {
            this.updateField('date', 'Estancado');
            this.updateField('daysRemaining', '---');
        }


        // --- CALCULATE NUTRIENT BALANCE ---
        if (NutritionEngine && NutritionEngine.NutrientBalance) {
            // Use COMPUTED ADG here
            const adgCalc = computedADG;

            // Reconstruct aggregate stats for the module
            const dietStats = {
                dmiKg: totalDM,
                proteinPercent: (totalDM > 0) ? (totalProtein / totalDM) * 100 : 0,
                phosphorusPercent: (totalDM > 0) ? (totalPhosphorus / totalDM) * 100 : 0
            };

            const animalStats = {
                weightGainKg: adgCalc,
                isPregnant: (this.currentStageObj && (this.currentStageObj.id === 'gestacion' || this.currentStageObj.id === 'gestacion_confirmada')),
                monthsPregnant: 7 // Assumption if unknown, or link to real event data later
            };

            const productionStats = {
                milkYieldKg: (this.currentStageObj && (this.currentStageObj.id.includes('lactancia'))) ? 10 : 0, // Default 10L/d if lactating but unknown
                milkProteinPercent: 3.2
            };

            const balance = NutritionEngine.NutrientBalance.calculate(animalStats, dietStats, productionStats);
            this.renderNutrientBalance(balance, computedADG);
        }


        // Alerts
        // Alerts & Validation (Delegated to Engine)
        const feedItems = [];
        [1, 3, 4, 5].forEach(slot => {
            const select = document.getElementById(`dietSlot${slot}`);
            const currentPct = targetPcts[slot] || 0;
            const linkFeed = feedSource[select?.value]; // quick lookup
            // re-calculate rough DM kg for validation
            const kgDM = dmi * (currentPct / 100);

            if (select && select.value) {
                const feed = feedSource[select.value] || Object.values(feedSource).find(f => f.ID == select.value || f.id == select.value);
                if (feed) {
                    feedItems.push({ feed: feed, kg: kgDM });
                }
            }
        });

        const dietValidation = NutritionEngine.validateDiet({ name: breedName || 'Unknown' }, feedItems);
        let alerts = dietValidation.alerts.map(a => a.message);

        // --- Annual vs Cycle Projection ---
        const dailyCostCalc = totalCost; // Renamed to avoid confusion
        let limitCost = 654;
        let limitFeed = 366;

        let projectedCost = 0;
        let projectedFeed = 0;
        let projectionLabel = 'Anual';

        // Calculate Concentrates Total
        const concentrateKgDay = feedItems.filter(i => (i.feed.type || '').match(/concentrado|pienso|grano/i)).reduce((a, b) => a + b.kg, 0);

        // --- UNIVERSAL PROJECTION LOGIC ---
        limitCost = 1200; // Annual Ref
        limitFeed = 1645; // Annual Ref

        const curW = parseFloat(this.dom.weight.value) || 0;
        // FIX: Use manual property or passed arg, fallback to 0. 
        // Do NOT parse textContent because it contains HTML now.
        let tarW = targetWeightOptional || this.manualTargetWeight;

        // Option B: Retrieve the value from the input we injected if it exists
        const manInput = document.getElementById('manualTargetInput');
        if (!tarW && manInput) tarW = parseFloat(manInput.value);

        // Final fallback: Calculate default again if needed, or 0
        if (!tarW) tarW = curW * 1.5; // dummy fallback to ensure we have something if logic fails

        const adgVal = adgOptional || parseFloat(this.dom.adg.textContent) || 1.2;

        console.log(`[Calculator] Date Calc Debug: TarW: ${tarW}, CurW: ${curW}, ADG: ${adgVal}`);

        // Initialize Projection vars
        if (typeof this.manualYield === 'undefined') this.manualYield = null;

        let daysLeft = 365; // Default annual
        if (tarW > curW && adgVal > 0) {
            daysLeft = (tarW - curW) / adgVal;
            projectionLabel = `Ciclo (~${daysLeft.toFixed(0)} días)`;
            projectedCost = dailyCostCalc * daysLeft;
            projectedFeed = concentrateKgDay * daysLeft;

            // Updated Date Projection
            const today = new Date();
            today.setDate(today.getDate() + daysLeft);
            if (this.dom.date) this.dom.date.textContent = today.toLocaleDateString();
            if (this.dom.daysRemaining) this.dom.daysRemaining.textContent = `${daysLeft.toFixed(0)} días`;

        } else {
            console.log('[Calculator] Maintenance/Static Mode (Target <= Current or ADG<=0). Showing Annualized.');
            // Breeding/Maintenance -> Annual
            projectionLabel = 'Anual';
            projectedCost = dailyCostCalc * 365;
            projectedFeed = concentrateKgDay * 365;
            limitCost = 654; // Ref for cows
            limitFeed = 366; // Ref for cows

            if (this.dom.date) this.dom.date.textContent = '-';
            if (this.dom.daysRemaining) this.dom.daysRemaining.textContent = 'Mantenimiento';
        }

        // Restore Alert only if significantly over benchmark (Annualized for comparison)
        const annualizedFeed = concentrateKgDay * 365;
        if (annualizedFeed > limitFeed * 1.2) {
            const dailyConc = concentrateKgDay.toFixed(1);
            alerts.push(`ℹ️ Mantenimiento: La dieta actual incluye ${dailyConc} kg/día de pienso. Proyectado a un año (${annualizedFeed.toFixed(0)} kg) supera la meta de eficiencia (${limitFeed} kg).`);
        }

        // --- DYNAMIC REAL ANNUAL TARGET COST ---
        // Base logic: 
        // Maintenance/Cow: ~1.7€/day (low input) * 365 = ~620€
        // Growth/Rearing: ~2.2€/day * 365 = ~800€
        // Fattening: ~3.5€/day * duration (But here we project annualized)

        // Climate Factor (Simple heuristic linked to weather widget if available)
        let climateFactor = 1.0;
        const tempEl = document.getElementById('weather-temp');
        if (tempEl) {
            const temp = parseFloat(tempEl.textContent);
            if (!isNaN(temp) && temp < 5) climateFactor = 1.15; // Cold stress
            if (!isNaN(temp) && temp > 30) climateFactor = 1.05; // Heat stress (inefficiency)
        }

        let baseDailyCost = 1.70;
        const stageName = (this.currentStageObj ? this.currentStageObj.id : '').toLowerCase();

        if (stageName.includes('cebo') || stageName.includes('engorde')) baseDailyCost = 3.50;
        else if (stageName.includes('crecimiento') || stageName.includes('pastero')) baseDailyCost = 2.40;
        else if (stageName.includes('lactancia')) baseDailyCost = 2.00;

        // Adjust for Breed Size (Large breeds eat more)
        const isLarge = breedData && (breedData.weight_female_adult > 650);
        if (isLarge) baseDailyCost *= 1.1;

        const realAnnualTarget = baseDailyCost * 365 * climateFactor;

        // Update Ref for Display
        if (projectionLabel.includes('Anual')) {
            limitCost = Math.round(realAnnualTarget);
        }

        // Color Coding Logic (Green < Target < Red)
        // Margin 3% = 0.97 to 1.03 is Yellow (Equal)
        const ratio = projectedCost / (projectionLabel.includes('Anual') ? limitCost : (limitCost * (daysLeft / 365)));
        // Note: For 'Ciclo', we should probably compare against (baseDailyCost * daysLeft) instead of annual limit.

        let targetComp = limitCost;
        if (!projectionLabel.includes('Anual')) {
            targetComp = baseDailyCost * daysLeft * climateFactor;
        }

        const variance = (projectedCost / targetComp);
        let colorCode = '#eab308'; // Yellow (Default/Equal)
        let colorText = 'orange';

        if (variance < 0.97) {
            colorCode = '#16a34a'; // Green (Good)
            colorText = 'green';
        } else if (variance > 1.03) {
            colorCode = '#dc2626'; // Red (Bad)
            colorText = 'red';
        }

        // (Removed partial injection to consolidate with Economic Analysis block below)

        // -----------------------------------------------------
        // ECONOMIC & QUALITY ANALYSIS (The User Request)
        // -----------------------------------------------------

        try {
            // Safety Check: Ensure Modules are Loaded
            if (typeof NutritionEngine === 'undefined' || typeof MarketDataManager === 'undefined') {
                console.warn('[Calculator] Skipping Economic analysis: Modules not ready.');
                return;
            }

            // --- RE-INIT VARIABLES (Scope Fix) ---
            const daysDuration = (typeof daysLeft !== 'undefined') ? daysLeft : 365;

            // Climate Factor
            let climateFactor = 1.0;
            const tempEl = document.getElementById('weather-temp');
            if (tempEl) {
                const temp = parseFloat(tempEl.textContent);
                if (!isNaN(temp) && temp < 5) climateFactor = 1.15;
                if (!isNaN(temp) && temp > 30) climateFactor = 1.05;
            }

            // Base Daily Cost
            let baseDailyCost = 1.70;
            const stageName = (this.currentStageObj ? this.currentStageObj.id : '').toLowerCase();
            if (stageName.includes('cebo') || stageName.includes('engorde')) baseDailyCost = 3.50;
            else if (stageName.includes('crecimiento') || stageName.includes('pastero')) baseDailyCost = 2.40;
            else if (stageName.includes('lactancia')) baseDailyCost = 2.00;
            // Adjust for Breed Size
            const isLarge = breedData && (breedData.weight_female_adult > 650);
            if (isLarge) baseDailyCost *= 1.1;



            // --- 0. PREPARE COST DATA (Consolidated) ---
            // Fetch accumulated cost from DOM if possible (calculated previously)
            let accCost = 0;
            const kpiCard = this.dom.daysRemaining ? this.dom.daysRemaining.parentElement : null;
            if (kpiCard) {
                const accEl = kpiCard.querySelector('.accumulated-cost b');
                if (accEl) accEl.textContent.replace('€', '').trim();
                accCost = accEl ? parseFloat(accEl.textContent) : 0;
            }
            const projectedFeedCost = projectedCost; // Rename for clarity in this block

            // Color Coding & Targets (From previous logic)
            // Color Coding & Targets (From previous logic)
            const targetComp = !projectionLabel.includes('Anual') ? (baseDailyCost * daysDuration * climateFactor) : limitCost;
            const variance = (projectedCost / targetComp);
            let colorCode = '#eab308';
            let colorText = 'orange';
            let varianceText = '≈ En objetivo';
            let reasoning = '';

            if (variance < 0.97) {
                colorCode = '#16a34a';
                colorText = 'green';
                varianceText = '▼ Ahorro proyectado';
            } else if (variance > 1.03) {
                colorCode = '#dc2626';
                colorText = 'red';
                varianceText = '▲ Coste elevado';

                // Add reasoning for "Coste Elevado"
                if (projectionLabel === 'Anual') {
                    reasoning = `(Dieta actual ${dailyCostCalc.toFixed(2)}€/día vs Meta ${(targetComp / 365).toFixed(2)}€/día)`;
                }
            }


            // --- 1. Quality / SEUROP Prediction ---
            let qualityInfo = { classification: 'R3', conformation: 'R', fat: 3 };
            const totalKgForCalc = totalDM || 1;
            let concRatio = 0, pastRatio = 0, silageRatio = 0, hasFlax = false;

            if (feedItems && feedItems.length > 0) {
                feedItems.forEach(i => {
                    const name = (i.feed.name || '').toLowerCase();
                    const type = (i.feed.type || '').toLowerCase();
                    if (type.includes('concentrado') || type.includes('grano') || type.includes('pienso')) concRatio += i.kg;
                    if (type.includes('pasto') || type.includes('forraje verde')) pastRatio += i.kg;
                    if (name.includes('ensilado de maíz') || name.includes('maiz silo')) silageRatio += i.kg;
                    if (name.includes('lino') || name.includes('linaza')) hasFlax = true;
                });
                concRatio /= totalKgForCalc; pastRatio /= totalKgForCalc; silageRatio /= totalKgForCalc;
            }

            if (reactiveStats && reactiveStats.qualityResult) {
                // Use the Centralized Result
                qualityInfo = reactiveStats.qualityResult;
            } else if (NutritionEngine.Quality && NutritionEngine.Quality.predictSeurop) {
                // Fallback (Legacy)
                qualityInfo = NutritionEngine.Quality.predictSeurop(breedData || {}, tarW, ageMonths + (daysDuration / 30), {
                    concentrate: concRatio, pasture: pastRatio, silage_maize: silageRatio, hasFlax: hasFlax
                });
            }

            // --- 2. Market Price ---
            // Round Fat Score: < 2.5 -> 2, >= 2.5 -> 3
            if (qualityInfo && qualityInfo.marbling_est) {
                qualityInfo.fat = (qualityInfo.marbling_est < 2.5) ? 2 : Math.round(qualityInfo.marbling_est);
            } else {
                qualityInfo.fat = 3; // Default
            }

            const ageAtSlaughter = ageMonths + (daysDuration / 30);
            const sex = (this.dom.sex.value || '').toLowerCase();
            const reproductiveStatus = (this.dom.reproductiveStatus ? this.dom.reproductiveStatus.value : '');

            // Construct Animal Data for Strict Lookup
            const animalDataForPrice = {
                ageMonths: ageAtSlaughter, // Projected Age
                sex: sex,
                isCastrated: (sex === 'macho' && reproductiveStatus.includes('castrado')),
                isParida: (sex === 'hembra' && reproductiveStatus.match(/parida|lactancia/i))
            };

            // DYNAMIC Category Determination
            // Visual Label matching MAPA (A, B, C, D, E, V, Z)
            let category = 'Vaca';
            let categoryLetter = 'D';

            if (ageAtSlaughter < 8) { category = 'Ternera'; categoryLetter = 'V'; }
            else if (ageAtSlaughter < 12) { category = 'Ternera'; categoryLetter = 'Z'; }
            else if (sex === 'hembra') {
                if (animalDataForPrice.isParida || ageAtSlaughter > 48) { category = 'Vaca'; categoryLetter = 'D'; }
                else { category = 'Novilla'; categoryLetter = 'E'; }
            }
            else if (sex === 'macho') {
                if (animalDataForPrice.isCastrated) { category = 'Buey'; categoryLetter = 'C'; }
                else if (ageAtSlaughter < 24) { category = 'Añojo'; categoryLetter = 'A'; }
                else { category = 'Toro'; categoryLetter = 'B'; }
            }

            let priceData = { price: 450, exact: false }; // Base fallback
            if (MarketDataManager.getBeefPrice) {
                // Pass full object 
                priceData = MarketDataManager.getBeefPrice(category, qualityInfo.conformation, qualityInfo.fat, animalDataForPrice);
            }

            let finalPricePerKg = priceData.price;
            // MAPA Convention: > 100 usually means Price/100kg.
            if (finalPricePerKg > 30) finalPricePerKg = finalPricePerKg / 100;
            if (!finalPricePerKg) finalPricePerKg = 4.50;

            // --- 3. Financials ---
            let estimatedYield = 0.58; // Default 58%
            if (this.dom.yield) {
                // Parse TEXT content cleanly (remove symbols)
                const txt = this.dom.yield.textContent.replace('%', '').trim();
                const val = parseFloat(txt);
                if (!isNaN(val)) estimatedYield = val / 100;
            }

            // Fix NaN: Valid Target Weight
            const safeTarW = (tarW && !isNaN(tarW)) ? tarW : (curW * 1.5);
            const carcassWeight = safeTarW * estimatedYield;
            const revenue = carcassWeight * finalPricePerKg;

            const totalExpenses = accCost + projectedFeedCost;
            const profit = revenue - totalExpenses;
            const roi = totalExpenses > 0 ? ((profit / totalExpenses) * 100) : 0;

            // --- 4. Render UI Boxes ---
            const gradeColor = ['S', 'E', 'U'].includes(qualityInfo.conformation) ? '#16a34a' : (['R'].includes(qualityInfo.conformation) ? '#2563eb' : '#d97706');
            const refLabel = `Meta Real: ${Math.round(targetComp)}€`;

            // A. FECHA SACRIFICIO => PROYECCIÓN
            const dateCard = this.dom.date ? this.dom.date.parentElement : null;
            if (dateCard) {
                const oldDiv = dateCard.querySelector('.projection-box');
                if (oldDiv) oldDiv.remove();

                const projDiv = document.createElement('div');
                projDiv.className = 'projection-box';
                projDiv.style.marginTop = '8px';
                projDiv.style.fontSize = '0.75em';
                projDiv.style.color = '#4b5563';
                projDiv.style.borderTop = '1px dashed #e5e7eb';
                projDiv.style.paddingTop = '4px';

                projDiv.innerHTML = `
                    <div style="background:#f9fafb; padding:4px; border-radius:4px; margin-bottom:4px;">
                        <strong>Proyección (${projectionLabel}):</strong><br>
                        Coste: <b style="color:${colorText}; font-size:1.1em;">${projectedCost.toFixed(0)} €</b> 
                        <span style="font-size:0.9em; color:#6b7280;">(${refLabel})</span>
                        <div style="font-size: 0.9em; margin-bottom: 5px; color: ${colorText}; font-weight: bold;">
                    ${varianceText} <span style="font-size:0.8em; font-weight:normal; color:#6b7280;">${reasoning}</span>
                </div>
        <div style="font-size:0.85em;">Pienso: ${projectedFeed.toFixed(0)} kg (Est.)</div>
                    </div>
                `;
                dateCard.appendChild(projDiv);
            }

            // B. ECONOMIC & QUALITY CARD
            const qualityContainer = document.getElementById('quality-card-container');
            const targetCard = qualityContainer || (this.dom.yield ? this.dom.yield.parentElement.parentElement : null);

            // Update Carcass Weight Display (Fix NaN UI)
            if (this.dom.carcass) {
                this.dom.carcass.textContent = !isNaN(carcassWeight) ? carcassWeight.toFixed(0) : '-';
            }

            if (targetCard) {
                const oldDiv = targetCard.querySelector('.economic-box');
                if (oldDiv) oldDiv.remove();

                const ecoDiv = document.createElement('div');
                ecoDiv.className = 'economic-box';
                ecoDiv.style.marginTop = '12px'; // Improved margin
                ecoDiv.style.fontSize = '0.85em';
                ecoDiv.style.borderTop = '1px solid #e5e7eb';
                ecoDiv.style.paddingTop = '10px';

                ecoDiv.innerHTML = `
                    <div style="margin-bottom:10px; padding-bottom:10px; border-bottom:1px dashed #e5e7eb;">
                        <strong style="display:block; margin-bottom:4px;">Precio & Categoría:</strong> 
                            <span style="color:${gradeColor}; font-weight:bold; border:1px solid ${gradeColor}; padding:2px 6px; border-radius:4px; background:#f0fdf4;">
                                ${category} (${priceData.letter || categoryLetter}) ${qualityInfo.classification}
                            </span>
                            <span style="font-size:0.9em; color:#64748b;">(Conf: ${qualityInfo.conformation}${qualityInfo.fat}) [Ref: ${priceData.code || '?'} <i style="font-size:0.8em">(${priceData.type || 'N/A'})</i>]</span>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:10px;">
                        <div>
                            <span style="color:#64748b; font-size:0.9em;">Ingresos:</span><br>
                            <b style="color:#059669; font-size:1.2em;">${!isNaN(revenue) ? revenue.toFixed(0) : 0} €</b>
                            <div style="font-size:0.8em; color:#9ca3af;">${finalPricePerKg.toFixed(2)} €/kg</div>
                        </div>
                        <div>
                            <span style="color:#64748b; font-size:0.9em;">Gastos Tot:</span><br>
                            <b style="color:#dc2626; font-size:1.2em;">${totalExpenses.toFixed(0)} €</b>
                            <div style="font-size:0.8em; color:#9ca3af;">(Acum: ${accCost.toFixed(0)}€)</div>
                        </div>
                    </div>

                    <div style="margin-top:5px; font-weight:bold; color:${profit > 0 ? '#15803d' : '#b91c1c'}; text-align:center; background:${profit > 0 ? '#dcfce7' : '#fee2e2'}; padding:8px; border-radius:6px;">
                        ROI: ${roi.toFixed(0)}% (Ben: ${!isNaN(profit) ? profit.toFixed(0) : 0} €)
                    </div>
                 `;

                targetCard.appendChild(ecoDiv);
            }
        } catch (err) {
            console.error('[Calculator] Error in Economic Logic:', err);
        }

        const alertDiv = this.dom.dietAlerts;
        if (alertDiv) {
            // Append Impact Analysis
            const impactHtml = this.analyzeDietImpact(objective, feedItems, dietValidation.isValid);

            const alertHtml = alerts.map(a => `<div style="color:${a.includes('Riesgo') ? 'red' : 'orange'}; margin-bottom:4px;">${a}</div>`).join('');

            let html = impactHtml;
            html += (alertHtml || '<div style="color:green; font-weight:bold;">✅ Dieta Balanceada (Sin Riesgos)</div>');

            alertDiv.innerHTML = html;
        }
    },

    analyzeDietImpact(objective, feedItems, isValid) {
        if (!feedItems || feedItems.length === 0) return '';

        let msg = '<div style="margin-top:5px; font-size:0.9em; padding:8px; background:#f8fafc; border-radius:4px;">';
        const isMaxGrowth = objective.includes('Máximo') || objective.includes('Cebo');
        const isEconomic = objective.includes('Mantenimiento') || objective.includes('Económico') || objective.includes('Resultados');

        // Calculate characteristics
        let totalCost = 0;
        let totalEn = 0;
        let totalKg = 0;
        let count = 0;

        feedItems.forEach(i => {
            const cost = this.getFeedCost(i.feed);
            const en = parseFloat(i.feed.energia_neta_Mcal_kg || 1.0);
            totalCost += cost * i.kg;
            totalEn += en * i.kg;
            totalKg += i.kg;
            count++;
        });

        if (totalKg === 0) return '';

        const avgEn = totalEn / totalKg;
        const costPerKg = totalCost / totalKg;
        const costPerMcal = totalEn > 0 ? totalCost / totalEn : 0;

        msg += `<div style="margin-bottom:4px;"><b>Análisis de Dieta:</b></div>`;

        // 1. Density Check
        if (isMaxGrowth) {
            if (avgEn > 1.8) {
                msg += `<span style="color:#16a34a; font-weight:500;">✅ Alta Energía (${avgEn.toFixed(2)} Mcal/kg). Alineado para Cebo.</span>`;
            } else {
                msg += `<span style="color:#d97706; font-weight:500;">⚠️ Energía Baja. Limitará la ganancia de peso (ADG).</span>`;
            }
            if (costPerKg > 0.35) msg += `<br><span style="color:#4b5563; font-size:0.85em;">ℹ️ Coste elevado, vigila el Margen.</span>`;

        } else if (isEconomic) {
            // ECONOMIC LOGIC: Cost per Mcal (Efficiency) is better than Cost per Kg
            if (costPerMcal < 0.15) {
                msg += `<span style="color:#16a34a; font-weight:500;">✅ Alta Eficiencia: Energía barata (${costPerMcal.toFixed(2)} €/Mcal).</span>`;
            } else if (costPerMcal > 0.22) {
                msg += `<span style="color:#dc2626; font-weight:500;">⚠️ Ineficiente: Estás pagando mucho por la energía (${costPerMcal.toFixed(2)} €/Mcal). Busca granos más baratos.</span>`;
            } else {
                msg += `<span style="color:#d97706; font-weight:500;">ℹ️ Eficiencia Media (${costPerMcal.toFixed(2)} €/Mcal).</span>`;
            }

        } else {
            // General
            if (avgEn > 1.6 && costPerMcal < 0.18) msg += `<span style="color:#16a34a; font-weight:500;">✅ Buen balance Energía/Coste.</span>`;
            else if (avgEn < 1.4) msg += `<span style="color:#d97706; font-weight:500;">ℹ️ Dieta voluminosa.</span>`;
        }

        msg += `</div>`;
        return msg;
    },

    renderNutrientBalance(balance, weightGain = 0) {
        if (!balance) return;

        // Helper
        const show = (el, val, unit = '') => {
            if (el) el.textContent = `${val.toFixed(1)}${unit}`;
        };

        // Nitrogen
        show(this.dom.npIngestN, balance.nitrogen.intake);
        show(this.dom.npExcretN, balance.nitrogen.excretion);
        show(this.dom.npRetentN, balance.nitrogen.retention, ' g/d');
        show(this.dom.npEffN, balance.nitrogen.efficiency, '%');

        // Color coding efficiency
        if (this.dom.npEffN) {
            this.dom.npEffN.style.color = balance.nitrogen.efficiency < 15 ? '#b91c1c' : '#059669'; // Red if very low
        }

        // Phosphorus
        show(this.dom.npIngestP, balance.phosphorus.intake);
        show(this.dom.npExcretP, balance.phosphorus.excretion);
        show(this.dom.npRetentP, balance.phosphorus.retention, ' g/d');
        show(this.dom.npEffP, balance.phosphorus.efficiency, '%');

        // --- NEW: ENVIRONMENTAL IMPACT CARD & ALERTS ---
        if (NutritionEngine.NutrientBalance.checkEfficiency) {
            const alerts = NutritionEngine.NutrientBalance.checkEfficiency(balance);

            // Where to show alerts? Let's use dietAlerts if available or append to N/P section
            // For now, let's inject a specialized "Eco-Card" below the N/P table if container exists
            // Assuming this.dom.npEffP parent is the container
            const tableContainer = this.dom.npEffP ? this.dom.npEffP.closest('.card') : null;

            if (tableContainer) {
                // Cleanup old
                const oldEco = tableContainer.querySelector('.eco-impact-box');
                if (oldEco) oldEco.remove();

                const impact = NutritionEngine.NutrientBalance.getEnvironmentalImpact(balance, weightGain);

                const ecoDiv = document.createElement('div');
                ecoDiv.className = 'eco-impact-box';
                ecoDiv.style.marginTop = '12px';
                ecoDiv.style.padding = '10px';
                ecoDiv.style.background = '#f0fdf4';
                ecoDiv.style.border = '1px solid #bbf7d0';
                ecoDiv.style.borderRadius = '6px';

                let alertHtml = alerts.map(a => `<div style="font-size:0.85em; margin-bottom:2px; color:${a.type === 'danger' ? '#dc2626' : '#d97706'}">${a.msg}</div>`).join('');

                ecoDiv.innerHTML = `
                    <div style="font-weight:bold; color:#15803d; margin-bottom:5px; font-size:0.9em;">🌱 Impacto Ambiental</div>
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:5px;">
                        <span style="font-size:0.85em; color:#374151;">Excreción N / Ganancia:</span>
                        <span style="font-weight:bold; color:${impact.color};">${impact.val} ${impact.unit}</span>
                    </div>
                    <div style="font-size:0.75em; text-align:right; color:${impact.color}; margin-bottom:8px;">(${impact.status})</div>
                    ${alertHtml}
                 `;

                tableContainer.appendChild(ecoDiv);
            }
        }
    },

    displayNutritionalRequirements(stageObj, targetDmi) {
        if (!this.dom.reqDisplay || !stageObj) return;
        const reqs = stageObj.req || {};
        this.dom.reqDisplay.innerHTML = `
            <div style="background: #eff6ff; padding: 10px; border-radius: 6px; font-size: 0.9em; margin-bottom: 10px; border: 1px solid #dbeafe;">
                <div style="font-weight:bold; color:#1e40af; margin-bottom:4px;">🎯 Meta Nutricional (${stageObj.name})</div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px;">
                    <div>Consumo: <b>${targetDmi.toFixed(1)} kg MS</b></div>
                    <div>Proteína: <b>${reqs.pb || '-'}</b></div>
                    <div>Energía: <b>${reqs.en || '-'} Mcal</b></div>
                    <div>Fibra: <b>> ${reqs.fdn || '-'}</b></div>
                </div>
            </div>
        `;
    },

    // --- NEW HELPERS FOR CARCASS & QUALITY ---
    getCurrentDietEnergy() {
        const items = [];
        const selects = this.dom.container.querySelectorAll('.diet-select');
        selects.forEach(sel => {
            const feedId = sel.value;
            const row = sel.closest('tr');
            if (feedId && row) {
                const kgInput = row.querySelector('.diet-kg');
                const kg = parseFloat(kgInput?.value || row.querySelector('td:nth-child(3)')?.textContent) || 0;

                let feed = null;
                if (window.FeedDataManager) {
                    feed = window.FeedDataManager.getFeedById(feedId);
                } else if (window.FEED_DATA) {
                    feed = window.FEED_DATA[feedId];
                }

                if (feed && kg > 0) {
                    items.push({
                        kg_as_fed: kg,
                        ms_percent: feed.ms_percent || feed.ms || feed.Porcentaje_MS || 88,
                        en_mcal: feed.en_mcal || feed.enem || feed.Energia_Neta_Mcal_kg || 0
                    });
                }
            }
        });

        if (items.length === 0) return 2.0;
        return CarcassAndQualityEngine.calculateDietEnergy(items);
    },

    renderQualityUI(qualityParams, carcassParams) {
        if (!qualityParams) return;

        let container = document.getElementById('quality-card-container');
        if (!container) {
            const board = document.getElementById('projectionsBoard');
            if (board) {
                container = document.createElement('div');
                container.id = 'quality-card-container';
                container.className = 'card';
                // No margin top needed if gap is handling spacing
                // container.style.marginTop = '16px'; 
                board.appendChild(container); // Append to bottom of right column
            } else {
                // Fallback (shouldn't happen with new layout)
                const projCard = document.querySelector('#calculator .card:nth-child(2)');
                if (projCard && projCard.parentNode) {
                    container = document.createElement('div');
                    container.id = 'quality-card-container';
                    container.className = 'card';
                    container.style.marginTop = '16px';
                    projCard.parentNode.insertBefore(container, projCard.nextSibling);
                } else {
                    return;
                }
            }
        }

        const iqColor = qualityParams.iq_score >= 80 ? '#16a34a' : (qualityParams.iq_score >= 60 ? '#ca8a04' : '#dc2626');

        container.innerHTML = `
            <div style="display:flex; align-items:center; margin-bottom: 8px;">
                <h3 style="margin:0;">Estimación de Calidad</h3>
            </div>
            <div class="kpi-row" style="grid-template-columns: repeat(3, 1fr); gap:8px;">
                <div class="kpi card-soft" style="border-left: 3px solid ${iqColor}; background:#fff; padding: 6px;">
                    <p class="kpi-label" style="font-size:0.75rem;">Índice Calidad</p>
                    <p class="kpi-value" style="color:${iqColor}; font-size:1.4rem;">${qualityParams.iq_score}</p>
                    <p class="kpi-foot" style="font-size:0.7rem;">Pts (0-100)</p>
                </div>
                <div class="kpi card-soft" style="background:#fff; padding: 6px;">
                    <p class="kpi-label" style="font-size:0.75rem;">Marmoleo</p>
                    <p class="kpi-value" style="font-size:1.4rem;">${qualityParams.marbling_est}</p>
                    <p class="kpi-foot" style="font-size:0.7rem;">Escala 1-5</p>
                </div>
                <div class="kpi card-soft" style="background:#fff; padding: 6px;">
                    <p class="kpi-label" style="font-size:0.75rem;">Conformación</p>
                    <p class="kpi-value" style="font-size:1.4rem;">${qualityParams.conformation_est || '-'}</p>
                    <p class="kpi-foot" style="font-size:0.7rem;">Clase (SEUROP)</p>
                </div>
            </div>
            
            ${qualityParams.notes && qualityParams.notes.length > 0 ? `
            <div style="margin-top:6px; background:#f0fdf4; border:1px solid #bbf7d0; padding:4px; border-radius:4px; font-size:0.75em; color:#166534;">
               ${qualityParams.notes}
            </div>` : ''}
            
            <div style="margin-top:8px; font-size:0.75em; color:#6b7280; border-top:1px dashed #eee; padding-top:4px;">
                <i>Factores: Genética (${qualityParams.components?.g?.toFixed(2) || '-'}), Energía (${qualityParams.components?.e?.toFixed(2) || '-'}), Tiempos y Estrés.</i>
            </div>
        `;
    },

    updateField(key, value) {
        if (this.dom[key]) {
            if (this.dom[key].tagName === 'INPUT' || this.dom[key].tagName === 'SELECT') this.dom[key].value = value;
            else this.dom[key].textContent = value;
        }
    },

    clearResults() {
        ['breed', 'sex', 'system', 'ageMonths', 'stage', 'weight', 'targetWeight', 'date', 'adg', 'carcass'].forEach(k => this.updateField(k, ''));
        if (this.dom.daysRemaining) this.dom.daysRemaining.textContent = '0 días';
        if (this.dom.reqDisplay) this.dom.reqDisplay.innerHTML = '';
        if (this.dom.dietTableBody) {
            [1, 3, 4, 5].forEach(slot => {
                const select = document.getElementById(`dietSlot${slot}`);
                [1, 2, 3].forEach(elId => {
                    const el = document.getElementById(`dietSlot${slot}${elId === 1 ? 'Pct' : elId === 2 ? 'Kg' : 'Cost'}`);
                    if (el) el.textContent = '-';
                });
                if (select) select.selectedIndex = 0;
            });
        }
        if (this.dom.dietAlerts) this.dom.dietAlerts.innerHTML = '';
    }
};

if (typeof window !== 'undefined') {
    window.AnimalCalculator = AnimalCalculator;
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof AnimalCalculator !== 'undefined' && AnimalCalculator.init) {
        AnimalCalculator.init();
    }
});
