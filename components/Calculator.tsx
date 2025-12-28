'use client';

import React, { useState, useEffect } from 'react';
import { useStorage } from '@/context/StorageContext';
import { useAnimalCalculator } from '@/hooks/useAnimalCalculator';

import { FEED_DATABASE, FeedItem } from '../services/feedDatabase';
import { NutritionEngine } from '../services/nutritionEngine';
import { LifecycleEngine, ReproductiveState } from '../services/lifecycleEngine';

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

    // KPI Targets
    const [targets, setTargets] = useState<any>(null);

    // Update Targets when parameters change
    useEffect(() => {
        if (selectedAnimal) {
            const t = NutritionEngine.calculateKPITargets(
                {
                    breed: selectedAnimal.breed || 'Unknown',
                    sex: selectedAnimal.sex || 'Macho',
                    weight: parseFloat(selectedAnimal.weight) || 400,
                    ageMonths: calculateAgeInMonths(selectedAnimal.birth || selectedAnimal.birthDate)
                },
                objective,
                system
            );
            setTargets(t);
        }
    }, [selectedAnimal, objective, system]);

    // Helper: Generate Recommended Diet using Engine
    const applySmartDiet = () => {
        if (!selectedAnimal || !targets) return;

        const smartDietRaw = NutritionEngine.generateSmartDiet(
            targets,
            { weight: parseFloat(selectedAnimal.weight) || 400 },
            system,
            availableFeeds
        );

        // Map back to FeedItems
        const mappedDiet = smartDietRaw.map(raw => {
            // Prioritize ID match, fallback to Name
            const feed = availableFeeds.find(f => f.id === raw.feed_id || f.name === raw.feed_name);

            if (!feed) {
                console.warn(`Feed not found: ${raw.feed_id} (${raw.feed_name})`);
                return null;
            }

            // Convert DM to As Fed
            // As Fed = DM_kg / (dm_percent / 100)
            const asFed = raw.dm_kg / (feed.dm_percent / 100);
            return { item: feed, amount: parseFloat(asFed.toFixed(1)) };
        }).filter(d => d !== null) as { item: FeedItem; amount: number }[];

        setDiet(mappedDiet);
    };

    // Auto-calculate effect (Kept for reactivity but removed auto-diet-fill to allow user control)
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

    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    // Filtered Animals for Search
    const filteredAnimals = animals.filter(a => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return a.id.toLowerCase().includes(term) ||
            a.id.slice(-4).includes(term) || // Last 4 digits
            (a.breed && a.breed.toLowerCase().includes(term));
    });

    const handleAnimalSelect = (animal: any) => {
        setSelectedAnimal(animal);
        setSelectedAnimalId(animal.id);
        setSearchTerm(animal.id);
        setShowDropdown(false);
    };

    const handleCalculate = () => {
        if (!selectedAnimal) return;
        calculate({
            animal: selectedAnimal,
            objective,
            system,
            feeds: diet.map(d => ({
                ...d.item,
                amount: d.amount
            }))
        });
    };

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

    // Helper for Crotal Formatting
    const formatCrotal = (crotal: string) => {
        if (!crotal) return '';
        const len = crotal.length;
        if (len < 4) return <span className="font-medium">{crotal}</span>;
        return (
            <span>
                <span className="text-gray-500 font-normal">{crotal.substring(0, len - 4)}</span>
                <span className="font-bold">{crotal.substring(len - 4)}</span>
            </span>
        );
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Calculadora de Rendimiento (Avanzada)</h2>
                <p className="text-gray-600">Simulación dietética, Genética y Protocolos de Calidad</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Input Panel */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Parámetros</h3>

                        <div className="space-y-4">
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Animal (Crotal/Raza)</label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg px-3 py-2 text-lg font-mono focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="ej. 5678"
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                                    onFocus={() => setShowDropdown(true)}
                                />
                                {showDropdown && searchTerm && (
                                    <div className="absolute z-10 w-full bg-white mt-1 border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                        {filteredAnimals.length === 0 ? (
                                            <div className="p-3 text-gray-500 text-sm">No se encontraron animales.</div>
                                        ) : (
                                            filteredAnimals.map(a => (
                                                <div
                                                    key={a.id}
                                                    onClick={() => handleAnimalSelect(a)}
                                                    className="p-3 hover:bg-green-50 cursor-pointer border-b border-gray-50 last:border-0"
                                                >
                                                    <div className="font-bold text-gray-800">{formatCrotal(a.id)}</div>
                                                    <div className="text-xs text-gray-500">{a.breed} • {a.sex}</div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>

                            {selectedAnimal && (
                                <div className="bg-green-50 p-4 rounded-lg text-sm space-y-2 border border-green-100">
                                    <div className="flex justify-between border-b border-green-200 pb-2">
                                        <span className="text-green-800">Raza:</span>
                                        <span className="font-bold text-green-900">{selectedAnimal.breed}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-green-800">Peso Actual:</span>
                                        <span className="font-bold text-green-900">{selectedAnimal.weight} kg</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-green-800">Edad:</span>
                                        <span className="font-bold text-green-900">{calculateAgeDetailed(selectedAnimal.birth || selectedAnimal.birthDate)}</span>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Objetivo Productivo</label>
                                <select
                                    className="w-full border rounded-lg px-3 py-2"
                                    value={objective}
                                    onChange={(e) => setObjective(e.target.value)}
                                >
                                    <option value="Mantenimiento">Mantenimiento</option>
                                    <option value="Crecimiento Moderado">Crecimiento Moderado</option>
                                    <option value="Máximo Crecimiento">Máximo Crecimiento</option>
                                    <option value="Engorde">Engorde (Acabado)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sistema de Manejo</label>
                                <select
                                    className="w-full border rounded-lg px-3 py-2"
                                    value={system}
                                    onChange={(e) => setSystem(e.target.value)}
                                >
                                    <option value="Extensivo (Pastoreo)">Extensivo (Pastoreo)</option>
                                    <option value="Semi-Intensivo">Semi-Intensivo</option>
                                    <option value="Intensivo (Feedlot)">Intensivo (Feedlot)</option>
                                    <option value="Montanera (Bellota)">Montanera (Bellota)</option>
                                    <option value="Ecológico">Ecológico (Certificado)</option>
                                </select>
                            </div>



                            <div className="pt-4 border-t border-gray-100">
                                <h4 className="text-sm font-bold text-gray-700 mb-2">🤖 Asistente Nutricional</h4>
                                <button
                                    onClick={() => {
                                        if (!selectedAnimal) return;
                                        applySmartDiet();
                                    }}
                                    disabled={!selectedAnimalId}
                                    className="w-full bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold py-2 px-4 rounded-lg shadow-sm transition-colors text-sm flex items-center justify-center gap-2"
                                >
                                    <span>🧠 Generar Dieta Recomendada</span>
                                </button>
                                <p className="text-xs text-gray-400 mt-2 text-center">
                                    Genera una dieta base optimizada para {objective} en sistema {system}.
                                </p>
                            </div>
                        </div>
                    </div>


                    {results && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                📋 Protocolos y Recomendaciones
                            </h3>

                            <div className="space-y-3">
                                {/* Bellota Status */}
                                <div className={`flex items-start gap-3 p-3 rounded-lg border ${system === 'Montanera (Bellota)' ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                                    <span className="text-2xl">🌰</span>
                                    <div>
                                        <p className={`font-bold text-sm ${system === 'Montanera (Bellota)' ? 'text-amber-900' : 'text-gray-700'}`}>Protocolo Bellota</p>
                                        <p className="text-xs text-gray-600 mt-1">
                                            {new Date().getMonth() >= 9 || new Date().getMonth() === 0
                                                ? "✅ En temporada (Oct-Ene)."
                                                : "❌ Fuera de temporada."}
                                        </p>
                                    </div>
                                </div>

                                {/* Eco Status */}
                                <div className={`flex items-start gap-3 p-3 rounded-lg border ${system === 'Ecológico' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                                    <span className="text-2xl">🌱</span>
                                    <div>
                                        <p className={`font-bold text-sm ${system === 'Ecológico' ? 'text-green-900' : 'text-gray-700'}`}>
                                            Manejo Ecológico
                                        </p>
                                        <p className="text-xs text-gray-600 mt-1">
                                            {system === 'Ecológico' ? "Certificado." : "Convencional."}
                                        </p>
                                    </div>
                                </div>

                                {results.imbalances && results.imbalances.length > 0 && (
                                    <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
                                        <strong className="block mb-1 text-xs text-red-800 uppercase">Alertas Activas:</strong>
                                        <ul className="list-disc pl-4 space-y-1 text-xs text-red-700">
                                            {results.imbalances.map((w: string, i: number) => <li key={i}>{w}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Results Panel */}
                <div className="lg:col-span-2 space-y-6">
                    {results ? (
                        <>
                            {/* Key Performance Indicators */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-1 bg-gray-50 rounded-bl text-[10px] text-gray-400 font-mono">
                                        Meta: {targets?.adg}
                                    </div>
                                    <p className="text-gray-500 text-xs uppercase font-bold">GMD Estimada</p>
                                    <p className={`text-3xl font-bold ${results.projectedGain >= (targets?.adg || 0) ? 'text-green-600' : 'text-blue-600'} mt-1`}>
                                        {(results.projectedGain || 0).toFixed(2)} <span className="text-sm text-gray-400">kg/d</span>
                                    </p>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                    <p className="text-gray-500 text-xs uppercase font-bold">Ingesta (MS)</p>
                                    <p className="text-3xl font-bold text-blue-600 mt-1">{(results.dmiTarget || 0).toFixed(1)} <span className="text-sm text-gray-400">kg</span></p>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative">
                                    <div className="absolute top-0 right-0 p-1 bg-gray-50 rounded-bl text-[10px] text-gray-400 font-mono">
                                        Meta: {targets?.fcr}
                                    </div>
                                    <p className="text-gray-500 text-xs uppercase font-bold">Eficiencia (FCR)</p>
                                    <p className={`text-3xl font-bold ${Number(results.fcr) <= (targets?.fcr || 10) ? 'text-green-600' : 'text-orange-600'} mt-1`}>
                                        {Number(results.fcr || 0).toFixed(2)}
                                    </p>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                    <p className="text-gray-500 text-xs uppercase font-bold">Coste Diario</p>
                                    <p className="text-3xl font-bold text-amber-600 mt-1">{Number(results.totalCost || 0).toFixed(2)} <span className="text-sm text-gray-400">€</span></p>
                                </div>
                            </div>

                            {/* Interactive Diet Builder (Moved Up) */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-gray-800">🏗️ Constructor de Dieta</h3>
                                    <div className="flex gap-2">
                                        <select
                                            className="border rounded-lg px-2 py-1 text-sm max-w-xs"
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    addToDiet(e.target.value);
                                                    e.target.value = ''; // Reset
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
                                                <tr><td colSpan={5} className="p-4 text-center text-gray-400 italic">No hay ingredientes. Añade uno para empezar.</td></tr>
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
                                                        <td className="p-3 text-right font-medium text-gray-600">
                                                            {(item.amount * item.item.cost_per_kg).toFixed(2)} €
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <button
                                                                onClick={() => removeFromDiet(item.item.id)}
                                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                                            >
                                                                ✕
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                        <tfoot className="border-t font-bold bg-green-50">
                                            <tr>
                                                <td className="p-3 text-green-800">TOTAL DIARIO</td>
                                                <td className="p-3 text-green-800">{(results.totalKg || 0).toFixed(2)} kg</td>
                                                <td className="p-3 text-green-800">{(results.dmiActual || 0).toFixed(2)} kg</td>
                                                <td className="p-3 text-right text-green-800">{(results.totalCost || 0).toFixed(2)} €</td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {/* Deep Analysis Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Nutritional Balance */}
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-0">
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        🧬 Balance Nutricional
                                    </h3>
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
                                            <p className="text-red-600 font-bold">
                                                {results.carcass?.limitingFactor || 'Energía'}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                El crecimiento está restringido por este factor.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Financial & Quality ROI (Moved Here) */}
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
                                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                        💰 Finanzas y Calidad
                                    </h3>

                                    {/* Carcass Quality */}
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        <div className="flex justify-between items-end mb-1">
                                            <div>
                                                <p className="text-gray-500 text-[10px] font-bold uppercase">Clasificación</p>
                                                <span className="text-2xl font-extrabold text-gray-900">{results.carcass?.conformation_est || 'R'}</span>
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

                                    {/* Profitability */}
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
                            <p className="text-center text-sm max-w-xs mt-2">
                                Selecciona un animal para ver su potencial.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
