'use client';

import React, { useState, useEffect } from 'react';
import { NutritionEngine, DietAlert, SynergyResult } from '@/services/nutritionEngine';
import { CarcassEngine } from '@/services/carcassEngine';
import { FEED_DATABASE, FeedItem } from '@/services/feedDatabase';
import { BreedManager } from '@/services/breedManager';
import type { AnimalLike } from '@/types/livestock';

import { Breed } from '@/services/breedManager';
import { useUi } from '@/components/Toast';
import { Save, Trash2, Dna, Globe, AlertTriangle, Ban, CheckCircle2, FlaskConical } from 'lucide-react';

interface DietComposerProps {
    animal: AnimalLike;
    onClose: () => void;
    fatherBreed?: Breed;
    motherBreed?: Breed;
}

interface IngredientForEngine {
    feed_name: string;
    type: string;
    percent_dm: number;
    dm_kg: number;
}

// ... imports ...

interface RationItem {
    id: string;
    feed: FeedItem;
    kg_as_fed: number;
}

export function DietComposer({ animal, onClose, fatherBreed, motherBreed }: DietComposerProps) {
    const ui = useUi();
    // --- State ---
    const [ration, setRation] = useState<RationItem[]>([]);
    const [availableFeeds, _setAvailableFeeds] = useState<FeedItem[]>(FEED_DATABASE);
    const [selectedFeedId, setSelectedFeedId] = useState('');

    // NEW: Bellota Type State
    const [bellotaType, setBellotaType] = useState<'ENCINA' | 'ROBLE'>('ENCINA');

    type DietStats = {
        dmi: number;
        mcal: number;
        cp: number;
        fdn: number;
        cost: number;
        env: ReturnType<typeof NutritionEngine.calculateNitrogenBalance>;
        hasBellota: boolean;
    };

    // Results State
    const [stats, setStats] = useState<DietStats | null>(null);
    const [alerts, setAlerts] = useState<DietAlert[]>([]);
    const [synergies, setSynergies] = useState<SynergyResult[]>([]);
    const [carcass, setCarcass] = useState<ReturnType<typeof CarcassEngine.calculateCarcass> | null>(null);
    const [adg, setAdg] = useState(0);

    // --- Format Helpers ---
    const formatNum = (n: number | undefined, d = 2) => n ? n.toFixed(d) : '0';

    const calculateAgeMonths = (birthStr: string) => {
        if (!birthStr) return 12;
        const b = new Date(birthStr);
        const n = new Date();
        return (n.getTime() - b.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    };

    const calculateDiet = () => {
        // 1. Aggregates
        let totalDM = 0;
        let totalMcal = 0;
        let totalProteinG = 0;
        let totalFDN_kg = 0;

        const ingredientsForEngine: IngredientForEngine[] = [];
        let hasBellota = false;

        ration.forEach(item => {
            const kg = item.kg_as_fed;
            const dm = item.feed.dm_percent / 100;
            const kgDM = kg * dm;

            totalDM += kgDM;
            totalMcal += (item.feed.energy_mcal * kgDM);
            totalProteinG += (item.feed.protein_percent / 100 * kgDM * 1000);
            totalFDN_kg += (item.feed.fiber_percent / 100 * kgDM);

            if (item.feed.name.toLowerCase().includes('bellota')) {
                hasBellota = true;
            }

            ingredientsForEngine.push({
                feed_name: item.feed.name,
                type: item.feed.category,
                percent_dm: 0, // calc later
                dm_kg: kgDM
            });
        });

        // Calc Percentages
        ingredientsForEngine.forEach(i => {
            i.percent_dm = totalDM > 0 ? (i.dm_kg / totalDM) * 100 : 0;
        });

        // 2. Nutrition Engine Calls
        const dietCP = totalDM > 0 ? (totalProteinG / 1000 / totalDM) * 100 : 0;
        const dietMcal = totalDM > 0 ? totalMcal / totalDM : 0;
        const dietFDN = totalDM > 0 ? (totalFDN_kg / totalDM) * 100 : 0;
        // const bellotaPct = totalDM > 0 ? (bellotaKg / totalDM) * 100 : 0; // Calculated but unused directly in new signature

        // --- NEW: Calculate Requirements for Validation ---
        const age = calculateAgeMonths((animal.birth ?? (typeof animal.birthDate === 'string' ? animal.birthDate : animal.birthDate?.toISOString())) ?? '');
        const breed = BreedManager.getBreedByName(animal.breed ?? '') || BreedManager.getAllBreeds()[0];
        const adgTarget = breed.adg_feedlot || 1.2;

        const weight = Number(animal.weight ?? animal.currentWeight ?? 400);
        const sex: 'Macho' | 'Hembra' | 'Castrado' = (animal.sex === 'Hembra' || animal.sex === 'Castrado') ? animal.sex : 'Macho';
        const reqs = NutritionEngine.calculateRequirements(
            weight,
            adgTarget,
            age,
            'Cebo',
            sex,
        );

        // Validation
        const activeFeeds = ration.map(r => ({ item: r.feed, amount: r.kg_as_fed }));
        const metrics = {
            totalDMI: totalDM,
            totalFDN: totalFDN_kg, // kg
            totalProteinVal: totalProteinG, // grams
            totalEnergy: totalMcal, // Total Mcal
            reqs: reqs
        };

        const system = hasBellota ? 'Montanera' : 'Intensivo'; // Simple inference

        const newAlerts = NutritionEngine.validateDiet(
            activeFeeds,
            metrics,
            system
        );
        setAlerts(newAlerts);

        // Synergies
        const currentMonth = new Date().getMonth(); // 0-11

        const activeSynergies = NutritionEngine.calculateSynergies(
            ingredientsForEngine,
            { sex, ageMonths: age },
            { bellotaType }
        );
        setSynergies(activeSynergies);

        // ADG Prediction
        // Map active synergies to the format expected by predictPerformance if needed
        // Or simply pass the codes
        const activeCodes = activeSynergies.filter(s => s.active).map(s => s.name);

        // Pass "active" boolean to the specific legacy synergy object if needed, or use the new array
        // We updated predictPerformance to accept activeSynergies: string[]
        const predictedADG = NutritionEngine.predictPerformance(
            breed,
            dietMcal,
            totalDM,
            weight,
            { currentMonth, activeSynergies: activeCodes }
        );
        setAdg(predictedADG);

        // Carcass Prediction
        const synergyBonusObj = { marbling: 0, yield_percent: 0 };
        activeSynergies.forEach(s => {
            if (s.active) {
                synergyBonusObj.marbling += s.bonus_marbling;
                synergyBonusObj.yield_percent += s.bonus_yield;
            }
        });

        const carcassPred = CarcassEngine.calculateCarcass(
            weight,
            age,
            breed,
            dietMcal,
            predictedADG,
            {
                sex,
                synergyBonuses: synergyBonusObj,
                currentMonth,
                fatherBreed: fatherBreed || (animal.father ? BreedManager.getBreedByName(animal.father) : undefined),
                motherBreed: motherBreed || (animal.mother ? BreedManager.getBreedByName(animal.mother) : undefined)
            }
        );
        setCarcass(carcassPred);

        // Env Impact
        const env = NutritionEngine.calculateNitrogenBalance(
            weight,
            predictedADG,
            dietCP,
            totalDM
        );

        setStats({
            dmi: totalDM,
            mcal: dietMcal,
            cp: dietCP,
            fdn: dietFDN,
            cost: ration.reduce((sum, i) => sum + (i.kg_as_fed * i.feed.cost_per_kg), 0),
            env,
            hasBellota // Store for UI
        });
    };

    useEffect(() => {
        calculateDiet();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ration, animal, bellotaType]);

    const addFeed = () => {
        if (!selectedFeedId) return;
        const feed = availableFeeds.find(f => f.id === selectedFeedId);
        if (feed) {
            setRation([...ration, { id: Date.now().toString(), feed, kg_as_fed: 1.0 }]);
        }
    };

    const updateKg = (id: string, kg: number) => {
        setRation(ration.map(r => r.id === id ? { ...r, kg_as_fed: kg } : r));
    };

    const removeFeed = (id: string) => {
        setRation(ration.filter(r => r.id !== id));
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <FlaskConical className="w-5 h-5" /> Compositor de dieta científica
                        {synergies.length > 0 && <span className="bg-amber-400 text-amber-950 text-xs px-2 py-0.5 rounded font-black animate-pulse">SINERGIA ACTIVA</span>}
                    </h3>
                    <p className="text-gray-400 text-xs">{animal.breed} • {animal.weight}kg • {animal.sex}</p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Left: Ingredients */}
                <div className="w-full md:w-1/2 p-4 flex flex-col gap-4 border-r border-gray-200 overflow-y-auto">
                    {/* Selector */}
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Añadir Ingrediente</label>
                        <div className="flex gap-2">
                            <select
                                className="flex-1 border rounded px-3 py-2 text-sm"
                                value={selectedFeedId}
                                onChange={e => setSelectedFeedId(e.target.value)}
                            >
                                <option value="">Seleccionar...</option>
                                <optgroup label="Forrajes">
                                    {availableFeeds.filter(f => f.category === 'Forraje').map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </optgroup>
                                <optgroup label="Concentrados">
                                    {availableFeeds.filter(f => f.category === 'Concentrado').map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </optgroup>
                                <optgroup label="Suplementos">
                                    {availableFeeds.filter(f => f.category === 'Suplemento').map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </optgroup>
                            </select>
                            <button
                                onClick={addFeed}
                                className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 font-bold"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* NEW: Bellota Type Selector */}
                    {stats?.hasBellota && (
                        <div className="bg-green-50 border border-green-200 p-4 rounded-lg shadow-sm animate-in fade-in slide-in-from-top-2">
                            <h4 className="flex items-center gap-2 text-sm font-bold text-green-900 mb-3">
                                🌲 Origen de Montanera (Bellota)
                            </h4>
                            <div className="flex gap-4">
                                <label className={`flex-1 cursor-pointer border rounded-lg p-3 transition-all ${bellotaType === 'ENCINA' ? 'bg-white border-green-500 ring-2 ring-green-100 shadow' : 'bg-transparent border-green-200 hover:bg-white'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <input
                                            type="radio"
                                            name="bellotaType"
                                            value="ENCINA"
                                            checked={bellotaType === 'ENCINA'}
                                            onChange={() => setBellotaType('ENCINA')}
                                            className="text-green-600 focus:ring-green-500"
                                        />
                                        <span className="font-bold text-gray-800 text-sm">Bellota Encina</span>
                                    </div>
                                    <div className="text-xs text-green-700 font-medium pl-6">Perfil: Alto Oleico</div>
                                </label>

                                <label className={`flex-1 cursor-pointer border rounded-lg p-3 transition-all ${bellotaType === 'ROBLE' ? 'bg-white border-green-500 ring-2 ring-green-100 shadow' : 'bg-transparent border-green-200 hover:bg-white'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <input
                                            type="radio"
                                            name="bellotaType"
                                            value="ROBLE"
                                            checked={bellotaType === 'ROBLE'}
                                            onChange={() => setBellotaType('ROBLE')}
                                            className="text-green-600 focus:ring-green-500"
                                        />
                                        <span className="font-bold text-gray-800 text-sm">Bellota Roble</span>
                                    </div>
                                    <div className="text-xs text-green-700 font-medium pl-6">Perfil: Taninos</div>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* List */}
                    <div className="space-y-2">
                        {ration.map((item) => (
                            <div key={item.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between group">
                                <div className="flex-1">
                                    <div className="font-bold text-gray-800">{item.feed.name}</div>
                                    <div className="text-xs text-gray-400">
                                        {item.feed.category} • {(item.feed.dm_percent)}% MS
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col items-end">
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            className="w-16 text-right border rounded px-1 py-1 font-mono text-sm font-bold text-gray-900 focus:ring-2 focus:ring-green-500 outline-none"
                                            value={item.kg_as_fed}
                                            onChange={e => updateKg(item.id, parseFloat(e.target.value) || 0)}
                                        />
                                        <span className="text-[10px] text-gray-400">kg fresco</span>
                                    </div>
                                    <button
                                        onClick={() => removeFeed(item.id)}
                                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        aria-label="Eliminar ingrediente"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {ration.length === 0 && (
                            <div className="text-center py-10 text-gray-400 italic text-sm">
                                No hay ingredientes en la ración.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Dashboard */}
                <div className="w-full md:w-1/2 bg-gray-50 flex flex-col overflow-y-auto">

                    {/* 1. Alerts Section */}
                    <div className="p-4 space-y-2">
                        {alerts.map((alert, i) => (
                            <div key={i} className={`p-3 rounded-lg border text-sm flex items-start gap-3 ${alert.level === 'critical' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800'
                                }`}>
                                {alert.level === 'critical'
                                    ? <Ban className="w-5 h-5 shrink-0 mt-0.5" />
                                    : <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />}
                                <div>
                                    <div className="font-bold">{alert.message}</div>
                                    {alert.action && <div className="text-xs mt-1 opacity-80 font-medium">Recomendación: {alert.action}</div>}
                                </div>
                            </div>
                        ))}
                        {synergies.map((syn, i) => (
                            <div key={`syn-${i}`} className={`p-3 rounded-lg text-sm flex items-start gap-3 ${
                                syn.confidence === 'high' ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                                : syn.confidence === 'moderate' ? 'bg-indigo-50 border border-indigo-200 text-indigo-900'
                                : 'bg-amber-50 border border-amber-200 text-amber-900'
                            }`}>
                                <Dna className="w-5 h-5 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold flex items-center gap-2">
                                        {syn.name.replace(/_/g, ' ')}
                                        {syn.confidence && (
                                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-white/60 inline-flex items-center gap-1">
                                                {syn.confidence === 'high'
                                                    ? <><CheckCircle2 className="w-3 h-3" /> probado</>
                                                    : syn.confidence === 'moderate' ? 'moderado'
                                                    : 'no validado'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs mt-1">{syn.description}</div>
                                    <p className="text-[11px] italic opacity-80 mt-1 leading-snug">
                                        Cuando hay bellota (o concentrado alto-oleico) más lecitina de soja protegida en la ración, mejora la infiltración de grasa intramuscular. Probado en bueyes Morucha ≥36 m y terneras F1×Angus (Viera et al. 2024, ITACyL).
                                    </p>
                                    {syn.active && (
                                        <div className="text-xs mt-2 font-mono bg-white/60 px-1.5 py-0.5 rounded inline-block">
                                            +{(syn.bonus_marbling || 0).toFixed(1)} pts infiltración
                                            {syn.bonus_yield ? ` · +${syn.bonus_yield.toFixed(1)}% rendimiento` : ''}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 2. KPIs Grid */}
                    <div className="grid grid-cols-2 gap-px bg-gray-200 border-t border-b border-gray-200">
                        <div className="bg-white p-4 flex flex-col items-center justify-center">
                            <span className="text-xs text-gray-500 uppercase tracking-wider">ADG Predicha</span>
                            <span className={`text-2xl font-black ${adg < 0 ? 'text-red-600' : (adg > 1.2 ? 'text-green-600' : 'text-gray-700')}`}>
                                {formatNum(adg)} <span className="text-sm font-normal text-gray-400">kg/día</span>
                            </span>
                        </div>
                        <div className="bg-white p-4 flex flex-col items-center justify-center">
                            <span className="text-xs text-gray-500 uppercase tracking-wider">Coste Día</span>
                            <span className="text-2xl font-black text-gray-700">
                                {formatNum(stats ? stats.cost : 0)} <span className="text-sm font-normal text-gray-400">€</span>
                            </span>
                        </div>
                        <div className="bg-white p-4 flex flex-col items-center justify-center">
                            <span className="text-xs text-gray-500 uppercase tracking-wider">Marmoleo (BMS)</span>
                            <span className="text-2xl font-black text-purple-700">
                                {carcass ? carcass.bms : '?'} <span className="text-sm font-normal text-purple-300">/ 12</span>
                            </span>
                            <span className="text-[10px] text-gray-400">Score: {carcass ? carcass.marbling_score : 0}</span>
                        </div>
                        <div className="bg-white p-4 flex flex-col items-center justify-center">
                            <span className="text-xs text-gray-500 uppercase tracking-wider">Clasificación</span>
                            <span className="text-2xl font-black text-gray-800">
                                {carcass ? carcass.conformation : '?'}
                            </span>
                            <span className="text-[10px] text-gray-400">Rend: {carcass ? carcass.rc_percent : 0}%</span>
                        </div>
                    </div>

                    {/* 3. Nutrient Breakdown (Mini) */}
                    <div className="p-4 bg-white">
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Balance Nutricional</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Energía Dieta</span>
                                <span className="font-mono font-bold">{formatNum(stats?.mcal)} Mcal/kg</span>
                            </div>
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-blue-500 h-full" style={{ width: `${Math.min(100, (stats?.mcal || 0) / 3 * 100)}%` }}></div>
                            </div>

                            <div className="flex justify-between pt-2">
                                <span className="text-gray-600">Proteína Bruta</span>
                                <span className="font-mono font-bold">{formatNum(stats?.cp)} %</span>
                            </div>
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-green-500 h-full" style={{ width: `${Math.min(100, (stats?.cp || 0) / 20 * 100)}%` }}></div>
                            </div>

                            <div className="flex justify-between pt-2">
                                <span className="text-gray-600">Fibra (FDN)</span>
                                <span className={`font-mono font-bold ${(stats?.fdn ?? 0) < 28 ? 'text-red-500' : 'text-gray-900'}`}>{formatNum(stats?.fdn)} %</span>
                            </div>
                        </div>
                    </div>

                    {/* 4. Eco Impact */}
                    {stats?.env && (
                        <div className={`p-4 border-t ${stats.env.is_critical ? 'bg-red-50' : 'bg-green-50'}`}>
                            <h4 className="text-xs font-bold uppercase mb-2 flex items-center gap-2">
                                <Globe className="w-4 h-4 text-emerald-700" /> Impacto ambiental
                            </h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <div className="text-gray-500">Eficiencia N</div>
                                    <div className="font-bold text-lg">{stats.env.efficiency_pct}%</div>
                                </div>
                                <div>
                                    <div className="text-gray-500">Excreción/kg Ganancia</div>
                                    <div className={`font-bold text-lg ${stats.env.is_critical ? 'text-red-600' : 'text-green-700'}`}>
                                        {stats.env.excretion_per_gain} g N
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
            {/* Footer Actions */}
            <div className="p-4 bg-white border-t border-gray-200 flex justify-end gap-2">
                <button
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium"
                    onClick={onClose}
                >
                    Cancelar
                </button>
                <button
                    className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-black transition-colors shadow-lg flex items-center gap-2"
                    onClick={() => ui.info("Guardado en historial (simulado)")}
                >
                    <Save className="w-4 h-4" /> Guardar dieta
                </button>
            </div>
        </div>
    );
}

// Helper mock if needed for calculateAge but I added it inside.
