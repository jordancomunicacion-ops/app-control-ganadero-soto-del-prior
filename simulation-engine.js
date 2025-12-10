// ==========================================
// SIMULATION ENGINE
// Generates historical weight data based on weather and breed
// ==========================================

const SimulationEngine = {

    /**
     * Main Entry Point
     */
    async run(currentUser) {
        if (!currentUser) {
            alert("Usuario no identificado.");
            return;
        }

        const animals = storage.read(`animals_${currentUser}`, []);
        if (animals.length === 0) {
            alert("No hay animales para simular.");
            return;
        }

        // 1. Determine Date Range
        let minDate = new Date();
        animals.forEach(a => {
            const birth = new Date(a.birthDate);
            if (birth < minDate) minDate = birth;
        });

        minDate.setMonth(minDate.getMonth() - 1);
        const startDate = minDate.toISOString().split('T')[0];
        const endDate = new Date().toISOString().split('T')[0];

        // 2. Fetch Weather History
        const fincas = getFincas();
        const mainFarm = fincas.find(f => f.lat && f.lon) || fincas[0];

        if (!mainFarm || !mainFarm.lat) {
            alert("Se requiere al menos una finca con coordenadas para obtener el clima histórico.");
            return;
        }

        const msgEl = qs('#simulationStatus') || { textContent: '' };
        if (qs('#simulationStatus')) qs('#simulationStatus').classList.remove('hidden');
        msgEl.textContent = `⏳ Descargando clima histórico (${startDate} - ${endDate})... esto puede tardar.`;

        let weatherHistory = null;
        try {
            weatherHistory = await window.WeatherService.getHistoricalWeather(mainFarm.lat, mainFarm.lon, startDate, endDate);
        } catch (e) {
            console.error(e);
            alert("Error conectando con servicio de clima.");
            return;
        }

        if (!weatherHistory || !weatherHistory.daily) {
            alert("No se pudieron obtener datos climáticos.");
            return;
        }

        msgEl.textContent = "⚙️ Procesando crecimiento de animales...";

        // 3. Process Each Animal
        let events = storage.read('events', []);

        // Helper: Robust Breed Lookup
        const findBreed = (name) => {
            if (!name) return null;
            if (BREED_DATA[name]) return BREED_DATA[name];

            const norm = str => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const target = norm(name);

            // Search values
            return Object.values(BREED_DATA).find(b => b.name && norm(b.name) === target);
        };

        const getClimateFactor = (dateStr) => {
            const idx = weatherHistory.daily.time.indexOf(dateStr);
            if (idx === -1) return 1.0;

            let tempSum = 0;
            let rainSum = 0;
            let count = 0;

            for (let i = Math.max(0, idx - 15); i < Math.min(weatherHistory.daily.time.length, idx + 15); i++) {
                tempSum += weatherHistory.daily.temperature_2m_mean[i];
                rainSum += weatherHistory.daily.precipitation_sum[i];
                count++;
            }

            const avgTemp = count ? tempSum / count : 20;
            const avgRain = count ? rainSum / count : 0;

            let factor = 1.0;
            if (avgTemp > 30) factor -= 0.15;
            else if (avgTemp > 25) factor -= 0.05;
            if (avgTemp < 5) factor -= 0.05;
            if (avgRain > 10) factor -= 0.10;

            return Math.max(0.5, factor);
        };

        let generatedEventsCount = 0;

        animals.forEach(animal => {
            // Find Breed Data
            let breed = findBreed(animal.breed);

            // If still not found, check for "mestiza" logic or default
            if (!breed) {
                // Determine sensible defaults if breed unknown
                breed = {
                    name: 'Desconocida',
                    adg_grazing: 0.8,
                    weight_male_adult: 900,
                    weight_female_adult: 600
                };
            }

            // Determine Target & ADG
            let baseADG = breed.adg_grazing || 0.8;
            let adultWeightTarget = 900;

            if (animal.sex === 'Macho') {
                adultWeightTarget = breed.weight_male_adult || 950;
            } else {
                adultWeightTarget = breed.weight_female_adult || (breed.weight_male_adult ? breed.weight_male_adult * 0.85 : 650);
                baseADG *= 0.85;
            }

            // Ensure Targets are valid numbers
            adultWeightTarget = parseFloat(adultWeightTarget) || 900;
            baseADG = parseFloat(baseADG) || 0.8;


            // Start from Birth
            const birthDate = new Date(animal.birthDate);
            let currentWeight = animal.birthWeight || (animal.sex === 'Macho' ? 40 : 35);
            animal.birthWeight = currentWeight;

            // Iterator
            let iterDate = new Date(birthDate);
            iterDate.setDate(iterDate.getDate() + 30);

            const today = new Date();

            while (iterDate <= today) {
                const dateStr = iterDate.toISOString().split('T')[0];

                // Growth Calculation
                const climateFactor = getClimateFactor(dateStr);

                // Logistic Curve: 1 - (current / target)
                let maturityFactor = 1.0;
                if (currentWeight < adultWeightTarget * 1.05) { // allow slightly over
                    const ratio = currentWeight / adultWeightTarget;
                    maturityFactor = 1 - ratio;
                } else {
                    maturityFactor = 0;
                }

                maturityFactor = Math.max(0, maturityFactor);

                const strictPeriodGain = baseADG * 30 * climateFactor * maturityFactor;

                currentWeight += strictPeriodGain;

                // Create Event
                const exists = events.some(e => {
                    if ((e.animalId !== animal.id && e.animalCrotal !== animal.crotal) || e.type !== 'Pesaje') return false;
                    const eDate = new Date(e.date);
                    const diffTime = Math.abs(eDate - iterDate);
                    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) < 10;
                });

                if (!exists) {
                    const nextDate = new Date(iterDate);
                    nextDate.setDate(nextDate.getDate() + 30);

                    const evt = {
                        id: generateUUID(),
                        type: 'Pesaje',
                        animalId: animal.id,
                        animalCrotal: animal.crotal,
                        date: dateStr,
                        desc: `Pesaje Simulado. Clima: ${(climateFactor * 100).toFixed(0)}%. Madurez: ${(maturityFactor * 100).toFixed(0)}%. Peso: ${currentWeight.toFixed(2)}kg`,
                        cost: 0,
                        nextDate: nextDate.toISOString().split('T')[0],
                        createdAt: new Date().toISOString()
                    };
                    events.push(evt);
                    generatedEventsCount++;
                }

                iterDate.setDate(iterDate.getDate() + 30);
            }

            animal.currentWeight = parseFloat(currentWeight.toFixed(2));
        });

        storage.write(`animals_${currentUser}`, animals);
        storage.write('events', events);

        msgEl.textContent = "✅ Simulación completada.";
        setTimeout(() => { if (qs('#simulationStatus')) qs('#simulationStatus').classList.add('hidden'); }, 3000);

        alert(`Simulación Finalizada.\n\n- Animales: ${animals.length}\n- Eventos: ${generatedEventsCount}`);

        if (typeof renderAnimals === 'function') renderAnimals();
        if (typeof renderEvents === 'function') renderEvents();
        if (typeof updateStats === 'function') updateStats(getFincas());

    }
};

console.log('Simulation Engine Script Loaded');
window.SimulationEngine = SimulationEngine;
