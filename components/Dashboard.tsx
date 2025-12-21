'use client';

import React, { useEffect, useState } from 'react';
import { useStorage } from '@/context/StorageContext';
import { WeatherService } from '@/services/weatherService';
import { EventManager } from '@/services/eventManager';

export function Dashboard() {
    const { read } = useStorage();
    const [weather, setWeather] = useState<any>(null);
    const [loadingWeather, setLoadingWeather] = useState(true);
    const [animalStats, setAnimalStats] = useState<any>({ males: {}, females: {} });
    const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);

    useEffect(() => {
        // 1. Load Weather
        const users = read('users', []);
        const sessionUser = read('sessionUser', '');
        const farms = read(`fincas_${sessionUser}`, []);

        let lat = 40.45;
        let lon = -3.75;

        if (farms.length > 0) {
            // Logic to extract coords if available would go here
        }

        WeatherService.getWeather(lat, lon).then(data => {
            setWeather(data);
            setLoadingWeather(false);
        }).catch(err => {
            console.error("Weather load failed", err);
            setLoadingWeather(false);
        });

        // 2. Load Animal Stats
        const animals = read(`animals_${sessionUser}`, []);
        const stats = calculateAnimalStats(animals);
        setAnimalStats(stats);

        // 3. Load Events
        const events = read('events', []);
        const upcoming = EventManager.getUpcomingEvents(events, 30);
        setUpcomingEvents(upcoming);

    }, [read]);

    const calculateAnimalStats = (animals: any[]) => {
        const maleCounts: Record<string, number> = {
            'Bueyes': 0, 'Toros': 0, 'Utreros': 0, 'Novillos': 0, 'Añojos': 0, 'Terneros': 0, 'Becerros': 0
        };
        const femaleCounts: Record<string, number> = {
            'Nodrizas': 0, 'Vacas': 0, 'Novillas': 0, 'Añojas': 0, 'Terneras': 0, 'Becerras': 0
        };

        animals.forEach((a: any) => {
            const cat = a.category || 'Sin Clasificar';
            if (a.sex === 'Macho') {
                if (maleCounts[cat] !== undefined) {
                    maleCounts[cat]++;
                }
            } else {
                if (femaleCounts[cat] !== undefined) {
                    femaleCounts[cat]++;
                }
            }
        });
        return { males: maleCounts, females: femaleCounts };
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Resumen General</h2>
                <p className="text-gray-600">Vista general de tu operación ganadera</p>
            </div>

            {/* Weather Card */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="opacity-90 font-medium mb-1">Clima en Finca</p>
                        {loadingWeather ? (
                            <p>Cargando clima...</p>
                        ) : weather ? (
                            <>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-4xl font-bold">{weather.current?.temperature_2m ?? '--'}°C</span>
                                </div>
                                <div className="flex gap-4 text-sm opacity-90">
                                    <span>💧 {weather.current?.relative_humidity_2m ?? '--'}%</span>
                                    <span>wind {weather.current?.wind_speed_10m ?? '--'} km/h</span>
                                </div>
                            </>
                        ) : (
                            <p>No disponible</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Animal Distribution */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Distribución de Animales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h4 className="text-blue-600 font-semibold mb-3 border-b border-blue-100 pb-2">Machos</h4>
                        <div className="space-y-2 text-sm">
                            {Object.entries(animalStats.males).map(([cat, count]) => (
                                <div key={cat} className="flex justify-between">
                                    <span className="text-gray-600">{cat}</span>
                                    <span className="font-bold text-gray-900">{String(count)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-pink-600 font-semibold mb-3 border-b border-pink-100 pb-2">Hembras</h4>
                        <div className="space-y-2 text-sm">
                            {Object.entries(animalStats.females).map(([cat, count]) => (
                                <div key={cat} className="flex justify-between">
                                    <span className="text-gray-600">{cat}</span>
                                    <span className="font-bold text-gray-900">{String(count)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid: Alerts & Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Events */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Próximos Eventos</h3>
                    <div className="space-y-3">
                        {upcomingEvents.length === 0 ? (
                            <p className="text-gray-500 italic text-sm">No hay eventos próximos.</p>
                        ) : (
                            upcomingEvents.map((evt, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                    <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 shrink-0"></div>
                                    <div>
                                        <p className="font-medium text-gray-800 text-sm">{evt.type}</p>
                                        <p className="text-xs text-gray-500">{new Date(evt.date).toLocaleDateString()} - {evt.animalId || 'General'}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Acciones Rápidas</h3>
                    <div className="space-y-3">
                        <button className="w-full bg-blue-50 text-blue-700 font-medium py-2 px-4 rounded-lg hover:bg-blue-100 transition-colors text-left flex items-center gap-2">
                            <span>➕</span> Registrar nuevo animal
                        </button>
                        <button className="w-full bg-emerald-50 text-emerald-700 font-medium py-2 px-4 rounded-lg hover:bg-emerald-100 transition-colors text-left flex items-center gap-2">
                            <span>💉</span> Registrar evento sanitario
                        </button>
                        <button className="w-full bg-purple-50 text-purple-700 font-medium py-2 px-4 rounded-lg hover:bg-purple-100 transition-colors text-left flex items-center gap-2">
                            <span>📄</span> Generar reporte mensual
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
