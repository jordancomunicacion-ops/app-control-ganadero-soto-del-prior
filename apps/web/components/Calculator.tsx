'use client';

import React, { useState, useEffect } from 'react';
import { useStorage } from '@/context/StorageContext';
import { useAnimalCalculator } from '@/hooks/useAnimalCalculator';

import { FEED_DATABASE, FeedItem } from '../services/feedDatabase';
import { NutritionEngine } from '../services/nutritionEngine';
import { LifecycleEngine, ReproductiveState } from '../services/lifecycleEngine';
import { BreedManager, Breed } from '../services/breedManager';
import { PriceEngine } from '../services/priceEngine';


export function Calculator() {
    const { read } = useStorage();
    const { calculate, results, loading, error } = useAnimalCalculator();

    const [animals, setAnimals] = useState<any[]>([]);
    const [selectedAnimalId, setSelectedAnimalId] = useState('');
    const [selectedAnimal, setSelectedAnimal] = useState<any>(null);
    const [objective, setObjective] = useState('Mantenimiento');
    const [baseSystem, setBaseSystem] = useState('Extensivo (Pastoreo)');
    const [isMontanera, setIsMontanera] = useState(false);
    const [isEco, setIsEco] = useState(false);
    const [events, setEvents] = useState<any[]>([]);

    // Derived System String for Engine Compatibility
    const effectiveSystem = `${baseSystem}${isMontanera ? ' + Montanera' : ''}${isEco ? ' + Ecológico' : ''}`;
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Helper from AnimalInventory for consistent look
    const formatCrotal = (crotal: string) => {
        if (!crotal) return null;
        const len = crotal.length;
        if (len < 4) return <span className="font-bold text-gray-900">{crotal}</span>;
        const prefix = crotal.substring(0, len - 4);
        const suffix = crotal.substring(len - 4);
        return (
            <span className="font-mono tracking-tight">
                <span className="text-gray-400 font-normal text-xs align-middle mr-0.5">{prefix}</span>
                <span className="font-black text-lg text-gray-900 align-middle">{suffix}</span>
            </span>
        );
    };

    // Interactive Diet State
    const [diet, setDiet] = useState<{ item: FeedItem; amount: number }[]>([]);
    const [availableFeeds] = useState(FEED_DATABASE);

    useEffect(() => {
        const user = read<string>('sessionUser', '');
        if (user) {
            setAnimals(read<any[]>(`animals_${user}`, []));
            setEvents(read<any[]>('events', []));
        }
    }, [read]);

    // Diet Handlers
    const addToDiet = (feedId: string) => {
        const feed = availableFeeds.find(f => f.id === feedId);
        if (feed && !diet.find(d => d.item.id === feedId)) {
            setDiet([...diet, { item: feed, amount: 1 }]); // Default 1kg
        }
    };

    const removeFromDiet = (feedId: string) => {
        setDiet(diet.filter(d => d.item.id !== feedId));
    };

    const updateAmount = (feedId: string, amount: number) => {
        setDiet(diet.map(d => d.item.id === feedId ? { ...d, amount } : d));
    };

    const handleSmartDiet = () => {
        if (!selectedAnimal || !targets) return;
        const weight = parseFloat(selectedAnimal.weight) || 400;

        // Call Engine
        const generated = NutritionEngine.generateSmartDiet(
            targets,
            { weight },
            effectiveSystem,
            availableFeeds
        );

        // Map to UI State (Convert DM to Fresh)
        const uiDiet = generated.map(g => {
            const feed = availableFeeds.find(f => f.id === g.feed_id);
            if (!feed) return null;
            const dmPct = feed.dm_percent || 100;
            const freshAmount = g.dm_kg / (dmPct / 100);
            return { item: feed, amount: parseFloat(freshAmount.toFixed(1)) };
        }).filter(Boolean) as { item: FeedItem; amount: number }[];

        setDiet(uiDiet);
    };

    // Auto-calculate effect
    useEffect(() => {
        if (selectedAnimal) {
            calculate({
                animal: selectedAnimal,
                objective,
                system: effectiveSystem,
                feeds: diet.map(d => ({
                    ...d.item,
                    amount: d.amount
                })),
                events: events.filter(e => e.animalId === selectedAnimal.id || e.animalCrotal === selectedAnimal.id)
            });
        }
    }, [diet, selectedAnimal, objective, effectiveSystem, events]);

    // Helper: Calculate Age in Months
    const calculateAgeInMonths = (birthDateStr: string) => {
        if (!birthDateStr) return 0;
        const birth = new Date(birthDateStr);
        const now = new Date();
        return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    };

    // Helper: Robust Breed Detection (Duplicated from Hook for UI Sync)
    const getEffectiveBreed = (animal: any) => {
        if (!animal) return null;

        // 1. Try direct ID/Code lookup
        let breed = BreedManager.getBreedById(animal.breed);

        // 2. Try parent lookup for F1
        if (!breed) {
            const fatherId = animal.genotype?.fatherBreedId || animal.fatherBreedId;
            const motherId = animal.genotype?.motherBreedId || animal.motherBreedId;
            if (fatherId && motherId) {
                breed = BreedManager.calculateHybrid(fatherId, motherId) || undefined;
            }
        }

        // 3. Robust Name Search
        if (!breed) {
            const rawBreed = animal.breed || '';
            const normalizedBreed = rawBreed.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const all = BreedManager.getAllBreeds();
            breed = all.find(b =>
                normalizedBreed.includes(b.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")) ||
                normalizedBreed.includes(b.code.toLowerCase())
            );
        }

        return breed || undefined;
    };

    const [targets, setTargets] = useState<any>(null);

    // Update Targets when parameters change
    useEffect(() => {
        if (selectedAnimal) {
            const effectiveBreed = getEffectiveBreed(selectedAnimal);

            const t = NutritionEngine.calculateKPITargets(
                {
                    breed: selectedAnimal.breed || 'Unknown',
                    sex: selectedAnimal.sex || 'Macho',
                    weight: parseFloat(selectedAnimal.currentWeight || selectedAnimal.weight || 400),
                    ageMonths: calculateAgeInMonths(selectedAnimal.birth || selectedAnimal.birthDate),
                    biological_type: effectiveBreed?.biological_type // Pass Bio Type!
                },
                objective,
                effectiveSystem
            );
            setTargets(t);
        }
    }, [selectedAnimal, objective, effectiveSystem]);

    const filteredAnimals = Array.from(new Map(animals.filter(a => a.crotal || a.id).map(a => [a.crotal || a.id, a])).values())
        .filter(a => {
            const search = searchTerm.toLowerCase();
            return (a.crotal || '').toLowerCase().includes(search) ||
                (a.id || '').toLowerCase().includes(search);
        })
        .sort((a: any, b: any) => (a.crotal || a.id || '').localeCompare(b.crotal || b.id || ''));

    return (
        <div className="h-full bg-gray-50 p-6 overflow-y-auto">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Control Panel */}
                <div className="space-y-6">
                    {/* Animal Selection */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">
                            Seleccionar Animal
                        </h3>
                        <div className="space-y-4">
                            <div className="relative">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Crotal del Animal</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Buscar Crotal (ej. 8196)"
                                        className="w-full border rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-green-500 outline-none"
                                        value={searchTerm}
                                        onFocus={() => {
                                            setIsDropdownOpen(true);
                                        }}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setIsDropdownOpen(true);
                                        }}
                                        onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                                    />
                                    <div className="absolute right-3 top-2.5 pointer-events-none text-gray-400 text-xs">▼</div>
                                </div>

                                {isDropdownOpen && filteredAnimals.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-xl max-h-64 overflow-y-auto">
                                        {filteredAnimals.map((a) => (
                                            <div
                                                key={a.id}
                                                className="px-4 py-3 hover:bg-green-50 cursor-pointer border-b last:border-0 flex justify-between items-center"
                                                onMouseDown={() => {
                                                    // Weight Sync on Selection
                                                    let syncWeight = parseFloat(a.currentWeight || a.weight || 0);

                                                    // Trace 'Pesaje' events for this specific animal if needed
                                                    const animalEvents = events.filter(e =>
                                                        (e.animalId === a.id || e.animalCrotal === a.crotal) && e.type === 'Pesaje'
                                                    ).sort((e1, e2) => new Date(e2.date).getTime() - new Date(e1.date).getTime());

                                                    if (animalEvents.length > 0) {
                                                        const latestEventWeight = parseFloat(animalEvents[0].weight);
                                                        if (latestEventWeight > 0) {
                                                            syncWeight = latestEventWeight;
                                                        }
                                                    }

                                                    const syncedAnimal = { ...a, currentWeight: syncWeight, weight: syncWeight };
                                                    setSelectedAnimal(syncedAnimal);
                                                    setSearchTerm(a.crotal || a.id);
                                                    setIsDropdownOpen(false);
                                                }}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-800">{a.crotal ? formatCrotal(a.crotal) : a.id}</span>
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase">{a.breed} • {a.sex}</span>
                                                </div>
                                                <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-bold text-gray-500 uppercase">{a.farm}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {selectedAnimal && (
                                <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <div><p className="text-gray-500">Raza</p><p className="font-bold text-gray-800">{selectedAnimal.breed}</p></div>
                                    <div><p className="text-gray-500">Peso</p><p className="font-bold text-gray-800">{selectedAnimal.currentWeight || selectedAnimal.weight} kg</p></div>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Configuration */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">
                            Objetivos
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Objetivo</label>
                                <select
                                    className="w-full border rounded-lg px-3 py-2"
                                    value={objective}
                                    onChange={(e) => setObjective(e.target.value)}
                                >
                                    <option value="Mantenimiento">Mantenimiento</option>
                                    <option value="Recría (Crecimiento Moderado)">Recría (Crecimiento Moderado)</option>
                                    <option value="Cebo (Máximo Crecimiento)">Cebo (Máximo Crecimiento)</option>
                                    <option value="Engorde">Engorde (Acabado)</option>
                                    <option value="Eficiencia Económica">Eficiencia Económica (Min Coste)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sistema Base</label>
                                <select
                                    className="w-full border rounded-lg px-3 py-2 mb-3"
                                    value={baseSystem}
                                    onChange={(e) => setBaseSystem(e.target.value)}
                                >
                                    <option value="Extensivo (Pastoreo)">Extensivo (Pastoreo)</option>
                                    <option value="Semi-Intensivo">Semi-Intensivo</option>
                                    <option value="Cebo (Feedlot)">Cebo (Feedlot)</option>
                                </select>

                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase">Modificadores</label>
                                    <div className="flex flex-col gap-2">
                                        <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={isMontanera}
                                                onChange={(e) => setIsMontanera(e.target.checked)}
                                                className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                            />
                                            <span className="text-sm text-gray-700">Montanera (Bellota)</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={isEco}
                                                onChange={(e) => setIsEco(e.target.checked)}
                                                className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                            />
                                            <span className="text-sm text-gray-700">Ecológico</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Results Panel */}
                <div className="lg:col-span-2 space-y-6">
                    {results ? (
                        <>
                            {/* KPIs */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className={`p-4 rounded-xl shadow-sm border ${results.projectedGain >= (targets?.adg || 0) ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'}`}>
                                    <p className="text-gray-500 text-xs uppercase font-bold">GMD Estimada</p>
                                    <p className={`text-3xl font-bold ${results.projectedGain >= (targets?.adg || 0) ? 'text-green-700' : 'text-gray-900'} mt-1`}>
                                        {(results.projectedGain || 0).toFixed(2)} <span className="text-sm text-gray-400">kg/d</span>
                                    </p>
                                    <div className="mt-2 text-xs font-medium">
                                        <span className="text-gray-500">Meta: {targets?.adg}</span>
                                        <span className={`block mt-1 ${results.projectedGain >= (targets?.adg || 0) ? 'text-green-600' : 'text-gray-900'}`}>
                                            {results.projectedGain >= (targets?.adg || 0) ? 'Objetivo Cumplido' : 'Bajo Rendimiento'}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                    <p className="text-gray-500 text-xs uppercase font-bold">Ingesta (MS)</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">{(results.dmiTarget || 0).toFixed(1)} <span className="text-sm text-gray-400">kg</span></p>
                                    <p className="text-xs text-gray-400 mt-2">Capacidad Máx. (Est.)</p>
                                </div>
                                <div className={`p-4 rounded-xl shadow-sm border ${Number(results.fcr) <= (targets?.fcr || 10) ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'}`}>
                                    <p className="text-gray-500 text-xs uppercase font-bold">Eficiencia (FCR)</p>
                                    <p className={`text-3xl font-bold ${Number(results.fcr) <= (targets?.fcr || 10) ? 'text-green-700' : 'text-gray-900'} mt-1`}>
                                        {Number(results.fcr || 0).toFixed(2)}
                                    </p>
                                    <div className="mt-2 text-xs font-medium">
                                        <span className="text-gray-500">Meta: &lt;{targets?.fcr}</span>
                                        <span className={`block mt-1 ${Number(results.fcr) <= (targets?.fcr || 10) ? 'text-green-600' : 'text-gray-900'}`}>
                                            {Number(results.fcr) <= (targets?.fcr || 10) ? 'Excelente Conversión' : 'Mejorable'}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                    <p className="text-gray-500 text-xs uppercase font-bold">Coste Diario</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">{Number(results.totalCost || 0).toFixed(2)} <span className="text-sm text-gray-400">€</span></p>
                                </div>
                            </div>

                            {/* Diet Builder */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-bold text-gray-800">Constructor de Dieta</h3>
                                        <button
                                            onClick={handleSmartDiet}
                                            className="text-xs bg-green-600 text-white px-3 py-1 rounded-full hover:bg-green-700 shadow-sm transition-colors font-bold flex items-center gap-1"
                                        >
                                            Generar Dieta
                                        </button>
                                    </div>
                                    <div className="flex gap-2">
                                        <select
                                            className="border rounded-lg px-2 py-1 text-sm max-w-xs"
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    addToDiet(e.target.value);
                                                    e.target.value = '';
                                                }
                                            }}
                                        >
                                            <option value="">+ Añadir Alimento</option>
                                            <optgroup label="Forrajes">
                                                {availableFeeds.filter(f => f.category === 'Forraje').map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                            </optgroup>
                                            <optgroup label="Concentrados">
                                                {availableFeeds.filter(f => f.category === 'Concentrado').map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                            </optgroup>
                                            <optgroup label="Suplementos">
                                                {availableFeeds.filter(f => f.category === 'Suplemento').map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                            </optgroup>
                                            <optgroup label="Ecológicos">
                                                {availableFeeds.filter(f => f.category === 'Ecológico').map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                            </optgroup>
                                        </select>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 text-gray-600">
                                            <tr>
                                                <th className="p-3">Ingrediente</th>
                                                <th className="p-3 w-32">Kg (Fresco)</th>
                                                <th className="p-3 w-24">Kg (MS)</th>
                                                <th className="p-3 text-right">Costo</th>
                                                <th className="p-3 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {diet.length === 0 ? (
                                                <tr><td colSpan={5} className="p-4 text-center text-gray-400 italic">No hay ingredientes.</td></tr>
                                            ) : (
                                                diet.map((item, idx) => (
                                                    <tr key={idx} className="group hover:bg-gray-50">
                                                        <td className="p-3 font-medium flex items-center gap-2">
                                                            <span className={`w-2 h-2 rounded-full ${item.item.category === 'Forraje' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                                                            <div>
                                                                <p>{item.item.name}</p>
                                                                <p className="text-xs text-gray-400">{item.item.energy_mcal} Mcal/kg • {item.item.protein_percent}% PB</p>
                                                            </div>
                                                        </td>
                                                        <td className="p-3">
                                                            <input
                                                                type="number"
                                                                min="0" step="0.5"
                                                                className="w-full border rounded px-2 py-1 text-center font-bold focus:ring-1 focus:ring-green-500 outline-none"
                                                                value={item.amount}
                                                                onChange={(e) => updateAmount(item.item.id, parseFloat(e.target.value) || 0)}
                                                            />
                                                        </td>
                                                        <td className="p-3 text-gray-500">{(item.amount * (item.item.dm_percent / 100)).toFixed(2)}</td>
                                                        <td className="p-3 text-right text-gray-600">{(item.amount * item.item.cost_per_kg).toFixed(2)} €</td>
                                                        <td className="p-3 text-right">
                                                            <button onClick={() => removeFromDiet(item.item.id)} className="text-gray-400 hover:text-red-500 transition-colors">✕</button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                        <tfoot className="border-t font-bold bg-green-50">
                                            <tr>
                                                <td className="p-3 text-green-800">TOTAL</td>
                                                <td className="p-3 text-green-800">{(results.totalKg || 0).toFixed(2)} kg</td>
                                                <td className="p-3 text-green-800">{(results.dmiActual || 0).toFixed(2)} kg</td>
                                                <td className="p-3 text-right text-green-800">{(results.totalCost || 0).toFixed(2)} €</td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {/* Analysis & Financials - Stacked vertically */}
                            <div className="flex flex-col gap-6">
                                {/* Nutritional Balance */}
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">Balance Nutricional</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-600">Energía (Mcal)</span>
                                                <span className="font-bold">{(results.energyTarget || 0).toFixed(1)} / Requerido</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div className="bg-green-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-600">Proteína (%)</span>
                                                <span className="font-bold">{(results.proteinPercent || 0).toFixed(1)}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div className="bg-green-600 h-2 rounded-full" style={{ width: `${Math.min(results.proteinPercent * 5, 100)}%` }}></div>
                                            </div>
                                        </div>
                                        <div className="mt-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Factor Limitante</p>
                                            <p className="text-red-600 font-bold">{results.carcass?.limitingFactor || 'Energía'}</p>
                                        </div>

                                        {/* Risk Alerts */}
                                        {results.alerts && results.alerts.length > 0 && (
                                            <div className="space-y-2 mt-4">
                                                {results.alerts.map((alert: any, idx: number) => {
                                                    const translations: Record<string, string> = {
                                                        'ACIDOSIS': 'RIESGO ACIDOSIS',
                                                        'LOW_FIBER': 'FIBRA BAJA',
                                                        'BLOAT': 'METEORISMO',
                                                        'BELLOTA_FIBER': 'FIBRA (MONTANERA)',
                                                        'BELLOTA_PROTEIN': 'PROTEÍNA (MONTANERA)',
                                                        'BELLOTA_TOXICITY': 'TANINOS (BELLOTA)',
                                                        'LOW_N_EFF': 'DÉFICIT PROTEICO',
                                                        'HIGH_POLLUTION': 'EXCESO NITRÓGENO'
                                                    };
                                                    return (
                                                        <div key={idx} className={`p-4 rounded-2xl text-xs transition-all hover:shadow-md ${alert.level === 'critical' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-800'}`}>
                                                            <p className="font-black uppercase mb-1 tracking-widest">{translations[alert.code] || alert.code.replace('_', ' ')}</p>
                                                            <p className="font-medium opacity-90">{alert.message}</p>
                                                            {alert.action && (
                                                                <div className="mt-2 pt-2 border-t border-current border-opacity-10 flex items-start gap-1.5">
                                                                    <span className="text-[10px]">💡</span>
                                                                    <p className="text-[10px] italic font-bold leading-tight">{alert.action}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Financial & Quality */}
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
                                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">Finanzas y Calidad</h3>

                                    <div className="mt-4">
                                        <div className="flex flex-col gap-5">
                                            <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-sm px-4 py-8">
                                                <div className="grid grid-cols-4 gap-0 text-center items-end">
                                                    <div className="border-r border-gray-100 h-10 flex flex-col justify-center px-1">
                                                        <p className="text-gray-400 text-[7px] font-black uppercase tracking-[0.2em] mb-1">Clasificación</p>
                                                        <span className="text-4xl font-black text-gray-900 leading-none tracking-tighter">{results.carcass?.conformation_est || 'R'}</span>
                                                    </div>
                                                    <div className="border-r border-gray-100 h-10 flex flex-col justify-center px-1">
                                                        <p className="text-gray-400 text-[7px] font-black uppercase tracking-[0.2em] mb-1">Infiltración</p>
                                                        <span className="text-4xl font-black text-gray-900 leading-none tracking-tighter">{Math.round(results.carcass?.marbling_est || 1)}</span>
                                                    </div>
                                                    <div className="border-r border-gray-100 h-10 flex flex-col justify-center px-1">
                                                        <p className="text-gray-400 text-[7px] font-black uppercase tracking-[0.2em] mb-1">Kg Canal (Est.)</p>
                                                        <div className="flex items-baseline justify-center gap-0.5">
                                                            <span className="text-3xl font-black text-gray-900 leading-none tracking-tighter">
                                                                {results.carcass?.weight_est?.toFixed(0) || results.carcass?.rc_percent
                                                                    ? ((parseFloat(selectedAnimal.currentWeight || selectedAnimal.weight) + results.projectedGain * 30) * (results.carcass.rc_percent / 100)).toFixed(0)
                                                                    : '0'}
                                                            </span>
                                                            <span className="text-xs font-black text-gray-400 uppercase">kg</span>
                                                        </div>
                                                    </div>
                                                    <div className="h-10 flex flex-col justify-center px-1">
                                                        <p className="text-gray-400 text-[7px] font-black uppercase tracking-[0.2em] mb-1">Rendimiento</p>
                                                        <div className="flex items-baseline justify-center gap-0.5">
                                                            <span className="text-3xl font-black text-gray-900 leading-none tracking-tighter">{results.carcass?.rc_percent || 0}</span>
                                                            <span className="text-xs font-black text-gray-400 uppercase">%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                                    <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest">Previsión ROI 30 Días</p>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center group">
                                                        <span className="text-gray-500 text-xs font-bold transition-colors group-hover:text-gray-900">Venta Estimada ({results.financials?.category})</span>
                                                        <div className="flex flex-col items-end">
                                                            <span className="font-black text-gray-900 text-base">{results.financials?.projectedSales?.toLocaleString()} €</span>
                                                            <span className="text-[9px] text-green-600 font-bold uppercase tracking-tighter">+ Ganancia Bruta</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-between items-center group">
                                                        <span className="text-gray-500 text-xs font-bold transition-colors group-hover:text-gray-900">Costes Acumulados</span>
                                                        <div className="flex flex-col items-end">
                                                            <span className="font-black text-gray-900 text-base">-{results.financials?.totalCost?.toFixed(0)} €</span>
                                                            <span className="text-[9px] text-red-600 font-bold uppercase tracking-tighter">- Gastos Totales</span>
                                                        </div>
                                                    </div>

                                                    <div className="pt-4 border-t border-gray-200">
                                                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                                                            <div>
                                                                <p className="text-gray-400 text-[8px] font-black uppercase tracking-widest leading-none">Margen Neto Proyectado</p>
                                                                <p className="text-[9px] text-gray-400 font-medium mt-1">* Resultados netos a 30 días</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className={`text-3xl font-black tracking-tighter ${results.financials?.margin > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                                    {results.financials?.margin?.toFixed(0)} <span className="text-base font-black ml-px">€</span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full bg-white rounded-xl border-dashed border-2 border-gray-200 p-12 text-gray-400">
                            <span className="text-6xl mb-4">🧬</span>
                            <p className="text-lg font-medium text-gray-500">Simulador de Rendimiento</p>
                            <p className="text-center text-sm max-w-xs mt-2">Selecciona un animal para ver su potencial.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
