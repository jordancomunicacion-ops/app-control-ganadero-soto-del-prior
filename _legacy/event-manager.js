// event-manager.js
// Handles complex event logic to declutter app.js

const EventManager = {
    // --- UTILS ---
    generateUUID() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            try { return crypto.randomUUID(); } catch (e) { }
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    // --- MAIN HANDLERS ---

    // 1. SANEAMIENTO
    async handleSaneamiento(data, context) {
        const { result, infectedCrotalsText, date, farmId } = data;
        const { animals, events, currentUser, storage } = context;

        // 1. Get Farm Herd
        const herdAnimals = animals.filter(a => a.farmId === farmId && a.status !== 'Muerto' && a.status !== 'Vendido' && a.status !== 'Sacrificado');
        const fincas = context.getFincas();
        const farm = fincas.find(f => f.id === farmId);
        const farmName = farm ? farm.name : 'Finca Desconocida';

        if (herdAnimals.length === 0) throw new Error('No hay animales activos en esta finca.');

        let desc = '';
        let infectedCount = 0;

        if (result === 'Negativo') {
            // ALL NEGATIVE
            herdAnimals.forEach(a => {
                a.healthStatus = 'Sano';
                if (!a.status) a.status = 'Activo';
            });
            desc = 'Saneamiento NEGATIVO. Todo el rebaño declarado SANO.';
        } else if (result === 'Positivo') {
            // POSITIVE DETECTED
            const infectedCrotals = infectedCrotalsText.split(',').map(s => s.trim().toUpperCase()).filter(s => s);
            if (infectedCrotals.length === 0) throw new Error('Has indicado POSITIVO. Introduce los crotales infectados.');

            herdAnimals.forEach(a => {
                const isPositive = infectedCrotals.some(ic => a.crotal.toUpperCase().endsWith(ic));

                if (isPositive) {
                    // INFECTED
                    a.healthStatus = 'Tuberculosis+';
                    a.status = 'Sacrificado';
                    a.exitDate = date;
                    a.actualPrice = 0;
                    a.actualCarcassWeight = 0;
                    a.deathReason = 'Saneamiento Positivo';
                    infectedCount++;

                    // Push discrete event for infected animal
                    events.push({
                        id: this.generateUUID(),
                        type: 'Sacrificio',
                        date: date,
                        animalId: a.id,
                        animalCrotal: a.crotal,
                        desc: 'Sacrificio Obligatorio (Saneamiento+)',
                        cost: 0
                    });

                } else {
                    // REST -> QUARANTINE
                    a.healthStatus = 'Cuarentena';
                }
            });

            desc = `Saneamiento POSITIVO en ${farmName}. ${infectedCount} sacrificados. Resto (${herdAnimals.length - infectedCount}) en CUARENTENA.`;

            // SCHEDULE CHECK +15 Days
            const checkDate = new Date(date);
            checkDate.setDate(checkDate.getDate() + 15);

            events.push({
                id: this.generateUUID(),
                type: 'Revisión Cuarentena',
                date: checkDate.toISOString().split('T')[0],
                animalId: herdAnimals[0].id, // Anchor
                animalCrotal: `${farmName} (REBAÑO)`,
                desc: `⚠️ Revisión Cuarentena: ${farmName} (15 días post-positivo)`,
                actionRequired: 'Saneamiento',
                status: 'scheduled'
            });
        }

        // Main Event
        events.push({
            id: this.generateUUID(),
            type: 'Saneamiento',
            date: date,
            animalId: herdAnimals[0] ? herdAnimals[0].id : 'FARM_EVENT',
            animalCrotal: `${farmName} (General)`,
            desc: desc,
            completed: true,
            status: 'completed'
        });

        // Save
        storage.write(`animals_${currentUser}`, animals);
        storage.write('events', events);
        return { message: 'Saneamiento procesado correctamente.', events, animals };
    },

    // 2. INSEMINACIÓN (Protocol Generation)
    async handleInsemination(data, context) {
        const { animal, date, bullBreed, desc } = data;
        const { events, storage } = context;

        let breedInfo = bullBreed ? ` Toro: ${bullBreed}.` : '';

        // 1. Create MAIN event (Start)
        const mainId = this.generateUUID();
        const mainEvent = {
            id: mainId,
            type: 'Inseminación',
            animalId: animal.id,
            animalCrotal: animal.crotal,
            date: date,
            desc: `Inicio Protocolo IA (Día 0): Evaluación + GnRH 1.${breedInfo} ${desc}`,
            cost: 0,
            status: 'completed',
            createdAt: new Date().toISOString()
        };
        events.push(mainEvent);

        // 2. Generate Future Events (Ovsynch + IATF)
        const protocolSteps = [
            { day: 7, type: 'Tratamiento', desc: 'Protocolo IA (Día 7): Prostaglandina (PGF2a)' },
            { day: 9, type: 'Tratamiento', desc: 'Protocolo IA (Día 9): GnRH 2ª dosis' },
            { day: 10, type: 'Inseminación', desc: `Protocolo IA (Día 10): IA a Tiempo Fijo (16-20h tras GnRH).${breedInfo}` }, // The actual IA
            { day: 35, type: 'Revisión', desc: 'Protocolo IA (Día 35): Ecografía (Diagnóstico Gestación)' },
            { day: 60, type: 'Revisión', desc: 'Protocolo IA (Día 60): Confirmación Viabilidad' }
        ];

        protocolSteps.forEach(step => {
            const stepDate = new Date(date);
            stepDate.setDate(stepDate.getDate() + step.day);

            events.push({
                id: this.generateUUID(),
                type: step.type,
                animalId: animal.id,
                animalCrotal: animal.crotal,
                date: stepDate.toISOString().split('T')[0],
                desc: step.desc,
                cost: 0,
                status: 'scheduled',
                createdAt: new Date().toISOString()
            });
        });

        storage.write('events', events);
        return { message: 'Protocolo de Inseminación iniciado (5 eventos programados).', events };
    },

    // 3. PESAJE
    async handleWeighing(data, context) {
        const { animal, weight, date, notes } = data;
        const { events, animals, currentUser, storage } = context;

        const prevWeight = animal.currentWeight || 0;
        animal.currentWeight = weight;

        // --- Calculate Estimates & History (Delegate to CarcassEngine if present) ---
        if (typeof CarcassAndQualityEngine !== 'undefined') {
            const animalEvents = events.filter(e => e.animalId === animal.id && e.type === 'Pesaje');
            animalEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
            const lastEvent = animalEvents[0];

            let lastDate = lastEvent ? new Date(lastEvent.date) : new Date(animal.birthDate);
            let lastW = lastEvent ? (lastEvent.weight || prevWeight) : (animal.birthWeight || 0);

            if (!lastEvent && prevWeight > 0) lastW = prevWeight;

            const curDate = new Date(date);
            const daysDiff = (curDate - lastDate) / (1000 * 60 * 60 * 24);

            let adgObs = 1.0;
            if (daysDiff > 0 && weight > lastW) {
                adgObs = (weight - lastW) / daysDiff;
            }

            // Mock env data/breed lookup or get from context if passed
            const weatherTemp = 20; // Default or pass from UI
            const thi = CarcassAndQualityEngine.calculateTHI(weatherTemp, 50);
            const dietE = 2.0;

            let breedData = {};
            if (window.BREED_DATA && window.BREED_DATA[animal.breed]) {
                // simplified lookup
                const breeds = Object.values(window.BREED_DATA);
                breedData = breeds.find(b => b.name === animal.breed) || {};
            }

            const ageMonths = (curDate - new Date(animal.birthDate)) / (1000 * 60 * 60 * 24 * 30.44);

            const carcass = CarcassAndQualityEngine.estimateCarcassResult({ ageMonths }, weight, adgObs, dietE, thi, breedData);
            const quality = CarcassAndQualityEngine.calculateQualityIndex({ ageMonths }, breedData, dietE, adgObs, thi, 10);

            if (!animal.monthlyRecords) animal.monthlyRecords = [];
            animal.monthlyRecords.push({
                date: date,
                weightKg: weight,
                adg: adgObs,
                rc_est: carcass.rc_percent,
                carcass_weight_est: carcass.carcass_weight,
                meat_quality_index: quality.iq_score,
                marbling_est: quality.marbling_est,
                tenderness_risk: quality.tenderness_risk,
                diet_energy: dietE,
                thi: thi
            });
        }

        // AUTO-SCHEDULE NEXT
        const nextWeighDate = new Date(date);
        nextWeighDate.setDate(nextWeighDate.getDate() + 30);

        const autoEvent = {
            id: this.generateUUID(),
            type: 'Pesaje',
            animalId: animal.id,
            animalCrotal: animal.crotal,
            date: nextWeighDate.toISOString().split('T')[0],
            desc: 'CONTROL MENSUAL AUTOMÁTICO',
            cost: 0,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        events.push(autoEvent);

        // Main Event
        events.push({
            id: this.generateUUID(),
            type: 'Pesaje',
            animalId: animal.id,
            animalCrotal: animal.crotal,
            date: date,
            desc: `Pesaje: ${weight.toFixed(2)}kg. ${notes || ''}`,
            cost: 0,
            status: 'completed',
            createdAt: new Date().toISOString() // Fixed syntax
        });

        // Save
        storage.write(`animals_${currentUser}`, animals);
        storage.write('events', events);
        return { message: 'Pesaje registrado y próxima revisión programada.', events, animals };
    },

    // 4. GENERAL / SACRIFICE / MOVEMENT
    async handleStandardEvent(data, context) {
        const { type, animal, date, desc, cost, nextDate, typeData } = data;
        const { events, animals, storage, currentUser, getFincas } = context;

        // Custom Logic based on type
        if (type === 'Sacrificio') {
            const { category, carcassWeight, price, conf, fat } = typeData;
            animal.status = 'Sacrificado';
            animal.exitDate = date;
            animal.actualCategory = category;
            animal.actualCarcassWeight = carcassWeight;
            animal.actualPrice = price;
            if (conf) animal.actualSeuropConf = conf;
            if (fat) animal.actualSeuropFat = fat;

            // Log update
            storage.write(`animals_${currentUser}`, animals);
        }
        else if (type === 'Cambio de corral') {
            const { newCorralId, originTxt, destTxt } = typeData;
            animal.corral = parseInt(newCorralId);
            storage.write(`animals_${currentUser}`, animals);
        }
        else if (type === 'Decisión Macho') {
            const { decision } = typeData;
            if (decision === 'Castrado') {
                animal.sex = 'Castrado';
                animal.category = 'Buey';
            } else if (decision === 'Semental') {
                animal.sex = 'Macho';
                animal.category = 'Semental';
                animal.isBreeder = true;
            }
            storage.write(`animals_${currentUser}`, animals);
        }
        else if (type === 'Parto') {
            const { calfCrotal, calfSex, fatherCrotal, birthWeight } = typeData;
            // Create Calf
            const newCalf = {
                id: this.generateUUID(),
                crotal: calfCrotal,
                farmId: animal.farmId,
                farm: animal.farm,
                breed: animal.breed || 'Desconocida',
                sex: calfSex,
                father: fatherCrotal,
                mother: animal.crotal,
                birthDate: date.split('T')[0],
                birthWeight: birthWeight,
                currentWeight: birthWeight,
                notes: `Nacido de ${animal.crotal}`,
                createdAt: new Date().toISOString()
            };
            animals.push(newCalf);
            storage.write(`animals_${currentUser}`, animals);

            // Schedule 1st Weighing
            const weighDate = new Date();
            weighDate.setDate(weighDate.getDate() + 30);
            events.push({
                id: this.generateUUID(),
                type: 'Pesaje',
                animalId: newCalf.id,
                animalCrotal: newCalf.crotal,
                date: weighDate.toISOString().split('T')[0],
                desc: 'CONTROL MENSUAL (1er Mes)',
                cost: 0,
                status: 'pending',
                createdAt: new Date().toISOString()
            });
        }

        // Push Main Event
        events.push({
            id: this.generateUUID(),
            type,
            animalId: animal.id,
            animalCrotal: animal.crotal,
            date,
            desc,
            cost,
            nextDate,
            completed: type !== 'Parto' && type !== 'Pesaje', // Assume completed unless specific flow
            status: 'completed',
            createdAt: new Date().toISOString()
        });

        storage.write('events', events);
        return { message: 'Evento registrado correctamente.', events, animals };
    }
};

window.EventManager = EventManager;
