'use client';

import React, { useState, useEffect } from 'react';
import { useStorage } from '@/context/StorageContext';
import { useAnimalCalculator } from '@/hooks/useAnimalCalculator';

import { FEED_DATABASE, FeedItem } from '../services/feedDatabase';
import { NutritionEngine } from '../services/nutritionEngine';
import { LifecycleEngine, ReproductiveState } from '../services/lifecycleEngine';
import { BreedManager, Breed } from '../services/breedManager';

export function Calculator() {
    const { read } = useStorage();
    const { calculate, results, loading, error } = useAnimalCalculator();

    const [animals, setAnimals] = useState<any[]>([]);
    const [selectedAnimalId, setSelectedAnimalId] = useState('');
    const [selectedAnimal, setSelectedAnimal] = useState<any>(null);
    const [objective, setObjective] = useState('Mantenimiento');
    const [system, setSystem] = useState('Extensivo (Pastoreo)');

    // Interactive Diet State
    const [diet, setDiet] = useState<{ item: FeedItem; amount: number }[]>([]);
    const [availableFeeds] = useState(FEED_DATABASE);

    useEffect(() => {
        const user = read<string>('sessionUser', '');
        if (user) {
            setAnimals(read<any[]>(`animals_${user}`, []));
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
            system,
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
                system,
                feeds: diet.map(d => ({
                    ...d.item,
                    amount: d.amount
                }))
            });
        }
    }, [diet, selectedAnimal, objective, system]);

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
        let breed = BreedManager.getBreedById(animal.breed);
        if (!breed) breed = BreedManager.getBreedByName(animal.breed);

        // Manual Overrides Check
        const rawBreed = animal.breed || '';
        const normalizedBreed = rawBreed.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (!breed && normalizedBreed) {
            if (normalizedBreed.includes('betizu')) return { biological_type: 'Rustic_European' };
            if (normalizedBreed.includes('limousin') || normalizedBreed.includes('limusin')) return { biological_type: 'Continental' };
            if (normalizedBreed.includes('charol')) return { biological_type: 'Continental' };
            if (normalizedBreed.includes('avile')) return { biological_type: 'Rustic_European' };
            if (normalizedBreed.includes('retinta')) return { biological_type: 'Rustic_European' }; // Etc
        }
        return breed;
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
                    weight: parseFloat(selectedAnimal.weight) || 400,
                    ageMonths: calculateAgeInMonths(selectedAnimal.birth || selectedAnimal.birthDate),
                    biological_type: effectiveBreed?.biological_type // Pass Bio Type!
                },
                objective,
                system
            );
            setTargets(t);
        }
    }, [selectedAnimal, objective, system]);

    return (
        <div className="h-full bg-gray-50 p-6 overflow-y-auto">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Control Panel */}
                <div className="space-y-6">
                    {/* Animal Selection */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            🐮 Animal
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Seleccionar Animal</label>
                                <select
                                    className="w-full border rounded-lg px-3 py-2"
                                    value={selectedAnimalId}
                                    onChange={(e) => {
                                        const id = e.target.value;
                                        setSelectedAnimalId(id);
                                        setSelectedAnimal(animals.find(a => a.id === id) || null);
                                    }}
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {animals.map(a => (
                                        <option key={a.id} value={a.id}>{a.name} ({a.breed})</option>
                                    ))}
                                </select>
                            </div>
                            {selectedAnimal && (
                                <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-3 rounded-lg">
                                    <div><p className="text-gray-500">Raza</p><p className="font-bold">{selectedAnimal.breed}</p></div>
                                    <div><p className="text-gray-500">Peso</p><p className="font-bold">{selectedAnimal.weight} kg</p></div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Configuration */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            🎯 Objetivos
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
                                    <option value="Crecimiento Moderado">Crecimiento Moderado</option>
                                    <option value="Máximo Crecimiento">Máximo Crecimiento</option>
                                    <option value="Engorde">Engorde (Acabado)</option>
                                    <option value="Eficiencia Económica">Eficiencia Económica (Min Coste)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sistema</label>
                                <select
                                    className="w-full border rounded-lg px-3 py-2"
                                    value={system}
                                    onChange={(e) => setSystem(e.target.value)}
                                >
                                    <option value="Extensivo (Pastoreo)">Extensivo (Pastoreo)</option>
                                    <option value="Semi-Intensivo">Semi-Intensivo</option>
                                    <option value="Cebo (Feedlot)">Cebo (Feedlot)</option>
                                    <option value="Montanera (Bellota)">Montanera (Bellota)</option>
                                    <option value="Ecológico">Ecológico</option>
                                </select>
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
                                    <p className={`text-3xl font-bold ${results.projectedGain >= (targets?.adg || 0) ? 'text-green-700' : 'text-blue-600'} mt-1`}>
                                        {(results.projectedGain || 0).toFixed(2)} <span className="text-sm text-gray-400">kg/d</span>
                                    </p>
                                    <div className="mt-2 text-xs font-medium">
                                        <span className="text-gray-500">Meta: {targets?.adg}</span>
                                        <span className={`block mt-1 ${results.projectedGain >= (targets?.adg || 0) ? 'text-green-600' : 'text-orange-500'}`}>
                                            {results.projectedGain >= (targets?.adg || 0) ? 'Objetivo Cumplido' : 'Bajo Rendimiento'}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                    <p className="text-gray-500 text-xs uppercase font-bold">Ingesta (MS)</p>
                                    <p className="text-3xl font-bold text-blue-600 mt-1">{(results.dmiTarget || 0).toFixed(1)} <span className="text-sm text-gray-400">kg</span></p>
                                    <p className="text-xs text-gray-400 mt-2">Capacidad Máx. (Est.)</p>
                                </div>
                                <div className={`p-4 rounded-xl shadow-sm border ${Number(results.fcr) <= (targets?.fcr || 10) ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'}`}>
                                    <p className="text-gray-500 text-xs uppercase font-bold">Eficiencia (FCR)</p>
                                    <p className={`text-3xl font-bold ${Number(results.fcr) <= (targets?.fcr || 10) ? 'text-green-700' : 'text-orange-600'} mt-1`}>
                                        {Number(results.fcr || 0).toFixed(2)}
                                    </p>
                                    <div className="mt-2 text-xs font-medium">
                                        <span className="text-gray-500">Meta: &lt;{targets?.fcr}</span>
                                        <span className={`block mt-1 ${Number(results.fcr) <= (targets?.fcr || 10) ? 'text-green-600' : 'text-orange-500'}`}>
                                            {Number(results.fcr) <= (targets?.fcr || 10) ? 'Excelente Conversión' : 'Mejorable'}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                    <p className="text-gray-500 text-xs uppercase font-bold">Coste Diario</p>
                                    <p className="text-3xl font-bold text-amber-600 mt-1">{Number(results.totalCost || 0).toFixed(2)} <span className="text-sm text-gray-400">€</span></p>
                                </div>
                            </div>

                            {/* Diet Builder */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-bold text-gray-800">🏗️ Constructor de Dieta</h3>
                                        <button
                                            onClick={handleSmartDiet}
                                            className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-200 hover:bg-blue-100 transition-colors font-bold flex items-center gap-1"
                                        >
                                            ⚡ Generar Dieta
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

                            {/* Analysis & Financials */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Nutritional Balance */}
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">🧬 Balance Nutricional</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-600">Energía (Mcal)</span>
                                                <span className="font-bold">{(results.energyTarget || 0).toFixed(1)} / Requerido</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div className="bg-yellow-400 h-2 rounded-full" style={{ width: '85%' }}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-600">Proteína (%)</span>
                                                <span className="font-bold">{(results.proteinPercent || 0).toFixed(1)}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(results.proteinPercent * 5, 100)}%` }}></div>
                                            </div>
                                        </div>
                                        <div className="mt-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Factor Limitante</p>
                                            <p className="text-red-600 font-bold">{results.carcass?.limitingFactor || 'Energía'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Financial & Quality */}
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
                                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">💰 Finanzas y Calidad</h3>

                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        <div className="flex justify-between items-end mb-1">
                                            <div>
                                                <p className="text-gray-500 text-[10px] font-bold uppercase">Clasificación</p>
                                                <span className="text-2xl font-extrabold text-gray-900">{results.carcass?.conformation_est || 'R'}</span>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-gray-500 text-[10px] font-bold uppercase">Rendimiento</p>
                                                <span className="text-xl font-bold text-gray-800">{results.carcass?.rc_percent || 0}%</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-gray-500 text-[10px] font-bold uppercase">Marmoleado</p>
                                                <span className="text-xl font-bold text-gray-800">{results.carcass?.marbling_est || 0}</span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2">
                                            <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: '60%' }}></div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex-1">
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="text-gray-500 text-[10px] font-bold uppercase">ROI 90 Días</p>
                                            {results.carcass?.is_premium && (
                                                <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold border border-amber-200">PREMIUM</span>
                                            )}
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Coste Total</span>
                                                <span className="font-bold text-red-600">- {((results.totalCost || 0) * 90).toFixed(0)} €</span>
                                            </div>
                                            <div className="flex justify-between border-t border-gray-200 pt-1">
                                                <span className="font-bold text-gray-700">MARGEN</span>
                                                <span className={`text-xl font-extrabold ${((results.projectedGain * 90 * 3.5) - (results.totalCost * 90)) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {(((results.projectedGain || 0) * 90 * 3.5) - ((results.totalCost || 0) * 90)).toFixed(0)} €
                                                </span>
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
