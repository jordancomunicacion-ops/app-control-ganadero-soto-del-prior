import { CarcassQualityEngine } from './carcassQualityEngine';
import { BreedManager } from './breedManager';
import { WeightEngine } from './weightEngine';
import { NutritionEngine } from './nutritionEngine';
import type { AnimalLike, FarmLike, LivestockEvent } from '@/types/livestock';

export interface EventData {
    type: string;
    date: string;
    [key: string]: unknown;
}

export interface EventContext {
    animals: AnimalLike[];
    events: LivestockEvent[];
    currentUser: string;
    storage: {
        read: <T>(key: string, fallback: T) => T;
        write: <T>(key: string, value: T) => void;
    };
    getFincas?: () => FarmLike[];
}

export const EventManager = {
    generateUUID() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            try { return crypto.randomUUID(); } catch { /* fall through to manual UUID */ }
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    async handleSaneamiento(data: { result: string; infectedCrotalsText?: string; date: string; farmId: string }, context: EventContext) {
        const { result, infectedCrotalsText, date, farmId } = data;
        const { animals, events, currentUser, storage, getFincas } = context;

        const fincas = getFincas ? getFincas() : [];
        const farm = fincas.find((f) => f.id === farmId);
        const farmName = farm ? farm.name : 'Finca Desconocida';

        const herdAnimals = animals.filter((a) =>
            (a.farmId === farmId || a.farm === farmName) &&
            a.status !== 'Muerto' && a.status !== 'Vendido' && a.status !== 'Sacrificado'
        );

        if (herdAnimals.length === 0) throw new Error('No hay animales activos en esta finca.');

        let desc = '';
        let infectedCount = 0;

        if (result === 'Negativo') {
            herdAnimals.forEach((a) => {
                a.healthStatus = 'Sano';
                if (!a.status) a.status = 'Activo';
            });
            desc = 'Saneamiento NEGATIVO. Todo el rebaño declarado SANO.';
        } else if (result === 'Positivo') {
            const infectedCrotals = (infectedCrotalsText || '').split(',').map((s: string) => s.trim().toUpperCase()).filter((s: string) => s);
            if (infectedCrotals.length === 0) throw new Error('Has indicado POSITIVO. Introduce los crotales infectados.');

            herdAnimals.forEach((a) => {
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

    async handleInsemination(data: { animal: AnimalLike; date: string; bullBreed?: string; desc?: string }, context: EventContext) {
        const { animal, date, bullBreed, desc } = data;
        const { events, storage } = context;

        const breedInfo = bullBreed ? ` Toro: ${bullBreed}.` : '';

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

    async handleWeighing(data: { animal: AnimalLike; weight: number; date: string; notes?: string }, context: EventContext) {
        const { animal, weight, date, notes } = data;
        const { events, animals, currentUser, storage } = context;

        const prevWeight = animal.currentWeight || 0;
        animal.currentWeight = weight;

        // Calculate Estimates
        const animalEvents = events.filter((e) => e.animalId === animal.id && e.type === 'Pesaje');
        animalEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const lastEvent = animalEvents[0];

        const lastDate = lastEvent ? new Date(lastEvent.date) : new Date(animal.birthDate ?? Date.now());
        let lastW = lastEvent ? (lastEvent.weight || prevWeight) : (animal.birthWeight || 0);

        if (!lastEvent && prevWeight > 0) lastW = prevWeight;

        const curDate = new Date(date);
        const daysDiff = (curDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);

        let adgObs = 1.0;
        if (daysDiff > 0 && weight > lastW) {
            adgObs = (weight - lastW) / daysDiff;
        }

        // Recuperar Raza y Sistema Real
        const weatherTemp = 20;
        const thi = CarcassQualityEngine.calculateTHI(weatherTemp, 50);
        const breed = BreedManager.getBreedByName(animal.breed ?? '');
        const system = WeightEngine.inferSystem(animal);

        // Calcular parámetros nutricionales reales (Targets)
        const ageInMonthsForTargets = (curDate.getTime() - new Date(animal.birthDate ?? Date.now()).getTime()) / (1000 * 60 * 60 * 24 * 30.44);

        const bioTypeMap: Record<string, string> = {
            'British': 'infiltracion',
            'Continental': 'crecimiento_magro',
            'Rustic_European': 'rustica_adaptada',
            'Dairy': 'aptitud_lechera',
            'Indicus': 'rustica_adaptada',
            'Composite': 'composito'
        };
        const fType = (breed && bioTypeMap[breed.biological_type]) || 'rustica_adaptada';

        const kpiTargets = NutritionEngine.calculateKPITargets({
            breed: animal.breed ?? '',
            sex: animal.sex ?? '',
            weight: weight,
            ageMonths: ageInMonthsForTargets,
            functionalType: fType
        }, 'Engorde', system);

        const dietE = kpiTargets.energyDensity;

        // Opciones de Calidad (Bellota, etc)
        const monthOfYear = curDate.getMonth();
        const isBellotaSeason = [9, 10, 11, 0, 1].includes(monthOfYear);
        const isMontanera = system.includes('Montanera');

        const qualityOptions = {
            isBellota: isMontanera && isBellotaSeason,
            highOleic: isMontanera && isBellotaSeason && (animal.farm || '').includes('SOTO'),
            hasLecithin: isMontanera // Asumimos protocolo Montanera (Bellota + Soja)
        };

        const ageMonths = ageInMonthsForTargets;

        // Estimaciones
        const carcass = CarcassQualityEngine.estimateCarcassResult({ ageMonths /*, system */ }, weight, adgObs, dietE, thi, breed || {});
        const quality = CarcassQualityEngine.calculateQualityIndex(
            { ageMonths, currentWeight: weight, sex: animal.sex, rc_percent: carcass.rc_percent },
            breed || {},
            dietE,
            adgObs,
            thi,
            150, // Días en cebo estandar (estimado)
            0,
            1,
            qualityOptions
        );

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

        // LIMIT HISTORY SIZE: Keep last 12 months only to prevent Storage Quota Errors
        if (animal.monthlyRecords.length > 12) {
            animal.monthlyRecords = animal.monthlyRecords.slice(-12);
        }

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

    async handleStandardEvent(data: { type: string; animal: AnimalLike; date: string; desc?: string; cost?: number; nextDate?: string; typeData?: Record<string, unknown> }, context: EventContext) {
        const { type, animal, date, desc, cost, nextDate, typeData } = data;
        const { events, animals, storage, currentUser } = context;

        const td = (typeData || {}) as Record<string, string | number | undefined>;

        if (['Sacrificio', 'Venta', 'Muerte/Sacrificio', 'Salida'].includes(type) || type.startsWith('Sacrificio')) {
            const { category, carcassWeight, price, conf, fat, pricePerKg, liveWeight, seuropConf, fatCover } = td;
            const yieldVal = td.yield;

            if (type.includes('Sacrificio')) animal.status = 'Sacrificado';
            else if (type === 'Venta') animal.status = 'Vendido';
            else if (type === 'Muerte') animal.status = 'Muerto';
            else animal.status = 'Baja';

            animal.exitDate = date;

            if (category) animal.actualCategory = String(category);

            if (carcassWeight) animal.actualCarcassWeight = parseFloat(String(carcassWeight));
            if (liveWeight) animal.actualLiveWeight = parseFloat(String(liveWeight));
            if (yieldVal) animal.actualYield = parseFloat(String(yieldVal));

            if (price) animal.actualPrice = parseFloat(String(price));
            if (pricePerKg) animal.actualPricePerKg = parseFloat(String(pricePerKg));
            else if (price && carcassWeight) animal.actualPricePerKg = parseFloat((parseFloat(String(price)) / parseFloat(String(carcassWeight))).toFixed(2));

            if (conf || seuropConf) animal.actualSeuropConf = String(conf || seuropConf);
            if (fat || fatCover) animal.actualSeuropFat = String(fat || fatCover);

            storage.write(`animals_${currentUser}`, animals);
        }
        else if (type === 'Cambio de corral') {
            const { newCorralId } = td;
            animal.corral = parseInt(String(newCorralId));
            storage.write(`animals_${currentUser}`, animals);
        }
        else if (type === 'Decisión Macho') {
            const { decision } = td;
            if (decision === 'Castrado') {
                animal.sex = 'Castrado';

                const birth = new Date(animal.birth || (animal.birthDate as string | Date) || Date.now());
                const eventDate = new Date(date);
                const ageMonths = (eventDate.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

                if (ageMonths >= 6 && ageMonths <= 9) {
                    animal.category = 'Buey';
                } else if (ageMonths > 9) {
                    animal.category = 'Toro'; // Late castration -> Toro
                } else {
                    animal.category = 'Ternero Castrado'; // Early castration
                }

                // Store castration date reference if possible, or just rely on event history
                animal.castrationDate = date;

            } else if (decision === 'Semental') {
                animal.sex = 'Macho';
                animal.category = 'Semental';
                animal.isBreeder = true;
            }
            storage.write(`animals_${currentUser}`, animals);
        }
        else if (type === 'Parto') {
            const { calfCrotal, calfSex, fatherCrotal, birthWeight } = td;
            const bw = birthWeight !== undefined ? Number(birthWeight) : undefined;
            const newCalf: AnimalLike = {
                id: this.generateUUID(),
                crotal: calfCrotal ? String(calfCrotal) : undefined,
                farmId: animal.farmId,
                farm: animal.farm,
                breed: animal.breed || 'Desconocida',
                sex: calfSex ? String(calfSex) : undefined,
                father: fatherCrotal ? String(fatherCrotal) : undefined,
                mother: animal.crotal,
                birthDate: date.split('T')[0],
                birthWeight: bw,
                currentWeight: bw,
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

    getUpcomingEvents(events: LivestockEvent[], days: number = 30) {
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
