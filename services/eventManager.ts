import { CarcassQualityEngine } from './carcassQualityEngine';

export interface EventData {
    type: string;
    date: string;
    [key: string]: any;
}

export interface EventContext {
    animals: any[];
    events: any[];
    currentUser: string;
    storage: {
        read: <T>(key: string, fallback: T) => T;
        write: <T>(key: string, value: T) => void;
    };
    getFincas?: () => any[];
}

export const EventManager = {
    generateUUID() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            try { return crypto.randomUUID(); } catch (e) { }
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    async handleSaneamiento(data: any, context: EventContext) {
        const { result, infectedCrotalsText, date, farmId } = data;
        const { animals, events, currentUser, storage, getFincas } = context;

        const fincas = getFincas ? getFincas() : [];
        const farm = fincas.find((f: any) => f.id === farmId);
        const farmName = farm ? farm.name : 'Finca Desconocida';

        // Filter herd
        const herdAnimals = animals.filter((a: any) =>
            (a.farmId === farmId || a.farm === farmName) &&
            a.status !== 'Muerto' && a.status !== 'Vendido' && a.status !== 'Sacrificado'
        );

        if (herdAnimals.length === 0) throw new Error('No hay animales activos en esta finca.');

        let desc = '';
        let infectedCount = 0;

        if (result === 'Negativo') {
            herdAnimals.forEach((a: any) => {
                a.healthStatus = 'Sano';
                if (!a.status) a.status = 'Activo';
            });
            desc = 'Saneamiento NEGATIVO. Todo el rebaño declarado SANO.';
        } else if (result === 'Positivo') {
            const infectedCrotals = (infectedCrotalsText || '').split(',').map((s: string) => s.trim().toUpperCase()).filter((s: string) => s);
            if (infectedCrotals.length === 0) throw new Error('Has indicado POSITIVO. Introduce los crotales infectados.');

            herdAnimals.forEach((a: any) => {
                const isPositive = infectedCrotals.some((ic: string) => (a.crotal || '').toUpperCase().endsWith(ic));

                if (isPositive) {
                    a.healthStatus = 'Tuberculosis+';
                    a.status = 'Sacrificado';
                    a.exitDate = date;
                    a.actualPrice = 0;
                    a.actualCarcassWeight = 0;
                    a.deathReason = 'Saneamiento Positivo';
                    infectedCount++;

                    events.push({
                        id: this.generateUUID(),
                        type: 'Sacrificio',
                        date: date,
                        animalId: a.id,
                        animalCrotal: a.crotal,
                        desc: 'Sacrificio Obligatorio (Saneamiento+)',
                        cost: 0,
                        createdAt: new Date().toISOString()
                    });

                } else {
                    a.healthStatus = 'Cuarentena';
                }
            });

            desc = `Saneamiento POSITIVO en ${farmName}. ${infectedCount} sacrificados. Resto (${herdAnimals.length - infectedCount}) en CUARENTENA.`;

            const checkDate = new Date(date);
            checkDate.setDate(checkDate.getDate() + 15);

            events.push({
                id: this.generateUUID(),
                type: 'Revisión Cuarentena',
                date: checkDate.toISOString().split('T')[0],
                animalId: herdAnimals[0].id,
                animalCrotal: `${farmName} (REBAÑO)`,
                desc: `⚠️ Revisión Cuarentena: ${farmName} (15 días post-positivo)`,
                actionRequired: 'Saneamiento',
                status: 'scheduled',
                createdAt: new Date().toISOString()
            });
        }

        events.push({
            id: this.generateUUID(),
            type: 'Saneamiento',
            date: date,
            animalId: herdAnimals[0] ? herdAnimals[0].id : 'FARM_EVENT',
            animalCrotal: `${farmName} (General)`,
            desc: desc,
            completed: true,
            status: 'completed',
            createdAt: new Date().toISOString()
        });

        storage.write(`animals_${currentUser}`, animals);
        storage.write('events', events);
        return { message: 'Saneamiento procesado correctamente.', events, animals };
    },

    async handleInsemination(data: any, context: EventContext) {
        const { animal, date, bullBreed, desc } = data;
        const { events, storage } = context;

        let breedInfo = bullBreed ? ` Toro: ${bullBreed}.` : '';

        const mainId = this.generateUUID();
        const mainEvent = {
            id: mainId,
            type: 'Inseminación',
            animalId: animal.id,
            animalCrotal: animal.crotal,
            date: date,
            desc: `Inicio Protocolo IA (Día 0): Evaluación + GnRH 1.${breedInfo} ${desc || ''}`,
            cost: 0,
            status: 'completed',
            createdAt: new Date().toISOString()
        };
        events.push(mainEvent);

        const protocolSteps = [
            { day: 7, type: 'Tratamiento', desc: 'Protocolo IA (Día 7): Prostaglandina (PGF2a)' },
            { day: 9, type: 'Tratamiento', desc: 'Protocolo IA (Día 9): GnRH 2ª dosis' },
            { day: 10, type: 'Inseminación', desc: `Protocolo IA (Día 10): IA a Tiempo Fijo (16-20h tras GnRH).${breedInfo}` },
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

    async handleWeighing(data: any, context: EventContext) {
        const { animal, weight, date, notes } = data;
        const { events, animals, currentUser, storage } = context;

        const prevWeight = animal.currentWeight || 0;
        animal.currentWeight = weight;

        // Calculate Estimates
        const animalEvents = events.filter((e: any) => e.animalId === animal.id && e.type === 'Pesaje');
        animalEvents.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const lastEvent = animalEvents[0];

        let lastDate = lastEvent ? new Date(lastEvent.date) : new Date(animal.birthDate);
        let lastW = lastEvent ? (lastEvent.weight || prevWeight) : (animal.birthWeight || 0);

        if (!lastEvent && prevWeight > 0) lastW = prevWeight;

        const curDate = new Date(date);
        const daysDiff = (curDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);

        let adgObs = 1.0;
        if (daysDiff > 0 && weight > lastW) {
            adgObs = (weight - lastW) / daysDiff;
        }

        // Mock data for Carcass Engine
        const weatherTemp = 20;
        const thi = CarcassQualityEngine.calculateTHI(weatherTemp, 50);
        const dietE = 2.0;
        let breedData = {};
        // User should ensure breeds are loaded or pass them. 
        // For now we assume no breed data or empty object if not passed.

        const ageMonths = (curDate.getTime() - new Date(animal.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44);

        const carcass = CarcassQualityEngine.estimateCarcassResult({ ageMonths }, weight, adgObs, dietE, thi, breedData);
        const quality = CarcassQualityEngine.calculateQualityIndex({ ageMonths, currentWeight: weight }, breedData, dietE, adgObs, thi, 10, 0, 0);

        if (!animal.monthlyRecords) animal.monthlyRecords = [];
        animal.monthlyRecords.push({
            date: date,
            weightKg: weight,
            adg: adgObs,
            rc_est: carcass.rc_percent,
            carcass_weight_est: carcass.carcass_weight,
            meat_quality_index: quality.iq_score,
            marbling_est: quality.marbling_est,
            diet_energy: dietE,
            thi: thi
        });

        // Schedule Next
        const nextWeighDate = new Date(date);
        nextWeighDate.setDate(nextWeighDate.getDate() + 30);

        events.push({
            id: this.generateUUID(),
            type: 'Pesaje',
            animalId: animal.id,
            animalCrotal: animal.crotal,
            date: nextWeighDate.toISOString().split('T')[0],
            desc: 'CONTROL MENSUAL AUTOMÁTICO',
            cost: 0,
            status: 'pending',
            createdAt: new Date().toISOString()
        });

        // Main Event
        events.push({
            id: this.generateUUID(),
            type: 'Pesaje',
            animalId: animal.id,
            animalCrotal: animal.crotal,
            date: date,
            desc: `Pesaje: ${weight.toFixed(2)}kg. ${notes || ''}`,
            weight: weight, // Important to store weight in event
            cost: 0,
            status: 'completed',
            createdAt: new Date().toISOString()
        });

        storage.write(`animals_${currentUser}`, animals);
        storage.write('events', events);
        return { message: 'Pesaje registrado y próxima revisión programada.', events, animals };
    },

    async handleStandardEvent(data: any, context: EventContext) {
        const { type, animal, date, desc, cost, nextDate, typeData } = data;
        const { events, animals, storage, currentUser } = context;

        if (type === 'Sacrificio') {
            const { category, carcassWeight, price, conf, fat } = typeData || {};
            animal.status = 'Sacrificado';
            animal.exitDate = date;
            animal.actualCategory = category;
            if (carcassWeight) animal.actualCarcassWeight = carcassWeight;
            if (price) animal.actualPrice = price;
            if (conf) animal.actualSeuropConf = conf;
            if (fat) animal.actualSeuropFat = fat;
            storage.write(`animals_${currentUser}`, animals);
        }
        else if (type === 'Cambio de corral') {
            const { newCorralId } = typeData || {};
            animal.corral = parseInt(newCorralId);
            storage.write(`animals_${currentUser}`, animals);
        }
        else if (type === 'Decisión Macho') {
            const { decision } = typeData || {};
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
            const { calfCrotal, calfSex, fatherCrotal, birthWeight } = typeData || {};
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

        events.push({
            id: this.generateUUID(),
            type,
            animalId: animal.id,
            animalCrotal: animal.crotal,
            date,
            desc,
            cost,
            nextDate,
            completed: type !== 'Parto' && type !== 'Pesaje',
            status: 'completed',
            createdAt: new Date().toISOString()
        });

        storage.write('events', events);
        return { message: 'Evento registrado correctamente.', events, animals };
    },

    getUpcomingEvents(events: any[], days: number = 30) {
        if (!events || !Array.isArray(events)) return [];

        const now = new Date();
        const future = new Date();
        future.setDate(future.getDate() + days);

        return events.filter(e => {
            if (e.status === 'completed' || e.completed) return false;
            const d = new Date(e.date);
            return d >= now && d <= future;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
};
