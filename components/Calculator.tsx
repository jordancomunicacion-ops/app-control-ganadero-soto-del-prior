'use client';

import React, { useState, useEffect } from 'react';
import { useStorage } from '@/context/StorageContext';
import { useAnimalCalculator } from '@/hooks/useAnimalCalculator';

export function Calculator() {
    const { read } = useStorage();
    const { calculate, results, loading, error } = useAnimalCalculator();

    const [animals, setAnimals] = useState<any[]>([]);
    const [selectedAnimalId, setSelectedAnimalId] = useState('');
    const [selectedAnimal, setSelectedAnimal] = useState<any>(null);
    const [objective, setObjective] = useState('Mantenimiento');
    const [system, setSystem] = useState('Extensivo (Pastoreo)');

    useEffect(() => {
        const user = read<string>('sessionUser', '');
        if (user) {
            setAnimals(read<any[]>(`animals_${user}`, []));
        }
    }, [read]);

    const handleAnimalSelect = (id: string) => {
        setSelectedAnimalId(id);
        const animal = animals.find(a => a.id === id);
        setSelectedAnimal(animal);
    };

    const handleCalculate = () => {
        if (!selectedAnimal) return;
        calculate({
            animal: selectedAnimal,
            objective,
            system,
            feeds: [] // Optional: if we want to customize specific feeds
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Calculadora de Rendimiento</h2>
                <p className="text-gray-600">Optimización de dietas y predicción de crecimiento</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Input Panel */}
                <div className="md:col-span-1 space-y-4">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Parámetros</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Animal</label>
                                <select
                                    className="w-full border rounded-lg px-3 py-2"
                                    value={selectedAnimalId}
                                    onChange={(e) => handleAnimalSelect(e.target.value)}
                                >
                                    <option value="">-- Buscar por ID --</option>
                                    {animals.map(a => (
                                        <option key={a.id} value={a.id}>{a.id} - {a.breed} ({a.sex})</option>
                                    ))}
                                </select>
                            </div>

                            {selectedAnimal && (
                                <div className="bg-blue-50 p-3 rounded-lg text-sm space-y-1">
                                    <p><strong>Raza:</strong> {selectedAnimal.breed}</p>
                                    <p><strong>Sexo:</strong> {selectedAnimal.sex}</p>
                                    <p><strong>Peso:</strong> {selectedAnimal.weight} kg</p>
                                    <p><strong>Edad:</strong> {selectedAnimal.birth ? new Date().getFullYear() - new Date(selectedAnimal.birth).getFullYear() + ' años' : 'Desconocida'}</p>
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
                                </select>
                            </div>

                            <button
                                onClick={handleCalculate}
                                disabled={!selectedAnimalId || loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-colors"
                            >
                                {loading ? 'Calculando...' : 'Calcula Dieta Óptima'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results Panel */}
                <div className="md:col-span-2 space-y-6">
                    {results ? (
                        <>
                            {/* Summary Metrics */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                                    <p className="text-gray-500 text-sm">GMD Estimada</p>
                                    <p className="text-2xl font-bold text-green-600">{(results.projectedGain || 0).toFixed(2)} kg/d</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                                    <p className="text-gray-500 text-sm">Ingesta (MS)</p>
                                    <p className="text-2xl font-bold text-blue-600">{(results.dmiTarget || 0).toFixed(2)} kg</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                                    <p className="text-gray-500 text-sm">Costo Diario</p>
                                    <p className="text-2xl font-bold text-amber-600">{(results.totalCost || 0).toFixed(2)} €</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                                    <p className="text-gray-500 text-sm">Eficiencia (FCR)</p>
                                    <p className="text-2xl font-bold text-purple-600">{(results.fcr || 0).toFixed(2)}</p>
                                </div>
                            </div>

                            {/* Diet Table */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="text-lg font-bold text-gray-800 mb-4">Composición de la Dieta</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 text-gray-600">
                                            <tr>
                                                <th className="p-3">Ingrediente</th>
                                                <th className="p-3">Kg (Fresco)</th>
                                                <th className="p-3">Kg (MS)</th>
                                                <th className="p-3 text-right">Costo (€)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {results.diet && results.diet.map((item: any, idx: number) => (
                                                <tr key={idx}>
                                                    <td className="p-3 font-medium">{item.name}</td>
                                                    <td className="p-3 text-gray-600">{item.amount.toFixed(2)}</td>
                                                    <td className="p-3 text-gray-600">{(item.amount * (item.dm_percent / 100)).toFixed(2)}</td>
                                                    <td className="p-3 text-right text-gray-600">{item.cost.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="border-t font-bold bg-gray-50">
                                            <tr>
                                                <td className="p-3">TOTAL</td>
                                                <td className="p-3">{(results.totalKg || 0).toFixed(2)}</td>
                                                <td className="p-3">{(results.dmiTarget || 0).toFixed(2)}</td>
                                                <td className="p-3 text-right">{(results.totalCost || 0).toFixed(2)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {/* Analysis / Warnings */}
                            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                                <h4 className="font-bold text-yellow-800 mb-2">Análisis Nutricional</h4>
                                <p className="text-sm text-yellow-700">
                                    Energía Neta: {(results.energyTarget || 0).toFixed(2)} Mcal/d |
                                    Proteína Bruta: {(results.proteinPercent || 0).toFixed(1)}%
                                </p>
                                {results.imbalances && results.imbalances.length > 0 && (
                                    <ul className="list-disc pl-5 mt-2 text-sm text-red-600">
                                        {results.imbalances.map((warning: string, i: number) => (
                                            <li key={i}>{warning}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-100 text-gray-400">
                            <span className="text-4xl mb-2">📊</span>
                            <p>Selecciona un animal y haz clic en calcular</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
