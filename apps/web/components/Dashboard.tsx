'use client';

import React, { useEffect, useState } from 'react';
import { useStorage } from '@/context/StorageContext';
import { WeatherService, type DailyForecast } from '@/services/weatherService';
import { EventManager } from '@/services/eventManager';
import { getFarms } from '@/app/lib/farm-actions';
import { getAnimals } from '@/app/lib/animal-actions';
import type { AnimalLike, FarmLike, LivestockEvent } from '@/types/livestock';

interface WeatherWidget {
    temp: number;
    condition: string;
    location: string;
    mapUrl: string;
    icon: string;
    humidity: number;
    wind: number;
    forecast: DailyForecast[];
}

interface AnimalStats {
    males: Record<string, number>;
    females: Record<string, number>;
}

function calculateAnimalStats(animals: AnimalLike[]): AnimalStats {
    const maleCounts: Record<string, number> = {
        'Bueyes': 0, 'Toros': 0, 'Utreros': 0, 'Novillos': 0, 'Añojos': 0, 'Terneros': 0, 'Becerros': 0
    };
    const femaleCounts: Record<string, number> = {
        'Nodrizas': 0, 'Vacas': 0, 'Novillas': 0, 'Añojas': 0, 'Terneras': 0, 'Becerras': 0
    };

    animals.forEach((a) => {
        const excludedStatuses = ['Sacrificado', 'Muerto', 'Vendido', 'Baja', 'Inactivo', 'Retirado'];
        if (a.status && excludedStatuses.includes(a.status)) return;
        if (a.status && a.status !== 'Activo') return;

        let cat = a.category;

        if (!cat || cat === 'Sin Clasificar') {
            const birth = new Date((a.birth ?? a.birthDate) as string | Date | number);
            const now = new Date();
            const ageMonths = (now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

            if (a.sex === 'Macho') {
                if (ageMonths < 6) cat = 'Becerros';
                else if (ageMonths < 12) cat = 'Terneros';
                else if (ageMonths < 24) cat = 'Añojos';
                else if (ageMonths < 36) cat = 'Novillos';
                else if (ageMonths < 48) cat = 'Utreros';
                else cat = 'Toros';
            } else {
                if (ageMonths < 6) cat = 'Becerras';
                else if (ageMonths < 12) cat = 'Terneras';
                else if (ageMonths < 24) cat = 'Añojas';
                else if (ageMonths < 36) cat = 'Novillas';
                else cat = 'Vacas';
            }
        }

        // Display castrated males as oxen.
        if (a.sex === 'Castrado') cat = 'Buey';

        if (a.sex === 'Macho' || a.sex === 'Castrado') {
            if (maleCounts[cat] !== undefined) maleCounts[cat]++;
            else if (cat === 'Buey') maleCounts['Bueyes']++;
            else if (maleCounts[cat + 's'] !== undefined) maleCounts[cat + 's']++;
        } else {
            if (femaleCounts[cat] !== undefined) femaleCounts[cat]++;
            else if (femaleCounts[cat + 's'] !== undefined) femaleCounts[cat + 's']++;
        }
    });
    return { males: maleCounts, females: femaleCounts };
}

export function Dashboard({ onNavigate, userId }: { onNavigate?: (tab: string) => void, userId?: string }) {


    const { read } = useStorage();
    const [weather, setWeather] = useState<WeatherWidget | null>(null);
    const [loadingWeather, setLoadingWeather] = useState(true);
    const [animalStats, setAnimalStats] = useState<AnimalStats>({ males: {}, females: {} });
    const [upcomingEvents, setUpcomingEvents] = useState<LivestockEvent[]>([]);
    const [selectedTabIndex, setSelectedTabIndex] = useState(0);
    const [farmsList, setFarmsList] = useState<FarmLike[]>([]);

    const loadWeatherForFarm = (currentFarm: FarmLike | undefined) => {
        if (!currentFarm) return;

        // Default coordinates (Madrid - Center of Spain) if farm has no coords
        let lat = 40.4168;
        let lon = -3.7038;
        const farmName = currentFarm.name || 'General';

        // Retrieve coordinates from the selected farm
        if (currentFarm.coords && currentFarm.coords.lat && (currentFarm.coords.lng || currentFarm.coords.lon)) {
            lat = currentFarm.coords.lat;
            lon = (currentFarm.coords.lng ?? currentFarm.coords.lon ?? lon);
        }

        WeatherService.getCurrentWeather(lat, lon).then(async data => {
            // Fetch Forecast
            const forecast = await WeatherService.getForecast(lat, lon);

            const windyUrl = `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&width=650&height=450&zoom=8&level=surface&overlay=wind&product=ecmwf&menu=&message=&marker=true&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`;

            if (data) {
                setWeather({
                    temp: data.temperature,
                    condition: data.weather_desc,
                    location: farmName,
                    mapUrl: windyUrl,
                    icon: WeatherService.getWeatherIcon ? WeatherService.getWeatherIcon(data.weather_code) : '⛅',
                    humidity: data.humidity,
                    wind: data.wind_speed,
                    forecast: forecast
                });
            } else {
                setWeather(null);
            }
            setLoadingWeather(false);
        }).catch(err => {
            console.error("Weather load error:", err);
            setWeather(null);
            setLoadingWeather(false);
        });
    };

    // Initial dashboard fetch on mount / userId change. setState inside an effect
    // is the standard React pattern for data-fetching when not using a
    // framework-specific hook like SWR or TanStack Query.
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        let cancelled = false;
        const sessionUser = read('appSession', '');

        if (userId) {
            getFarms(userId).then(({ data: farms }) => {
                if (cancelled) return;
                const farmArray = farms as FarmLike[];
                setFarmsList(farmArray);
                if (!farmArray || farmArray.length === 0) {
                    setLoadingWeather(false);
                    setWeather(null);
                } else {
                    loadWeatherForFarm(farmArray[selectedTabIndex] || farmArray[0]);
                }
            }).catch(() => {
                if (!cancelled) setLoadingWeather(false);
            });
        } else {
            const farms = read<FarmLike[]>(`fincas_${sessionUser}`, []);
            setFarmsList(farms);
            if (!farms || farms.length === 0) {
                setLoadingWeather(false);
                setWeather(null);
            } else {
                loadWeatherForFarm(farms[selectedTabIndex] || farms[0]);
            }
        }

        if (userId) {
            getAnimals(userId).then(({ data: animalsData }) => {
                if (cancelled) return;
                setAnimalStats(calculateAnimalStats(animalsData as unknown as AnimalLike[]));
            }).catch(() => { /* noop */ });
        } else {
            const animals = read<AnimalLike[]>(`animals_${sessionUser}`, []);
            setAnimalStats(calculateAnimalStats(animals));
        }

        const events = read<LivestockEvent[]>('events', []);
        setUpcomingEvents(EventManager.getUpcomingEvents(events, 30));

        return () => { cancelled = true; };
    }, [read, selectedTabIndex, userId]);
    /* eslint-enable react-hooks/set-state-in-effect */

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Resumen General</h2>
                <p className="text-gray-600">Vista general de tu operación ganadera</p>
            </div>

            {/* Dashboard Main Grid: Weather (Left) & Animals (Right) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                {/* Weather Card Column */}
                <div className="flex flex-col h-full space-y-2">
                    {/* Tabs for Farms */}
                    {farmsList.length > 0 && (
                        <div className="flex space-x-1 overflow-x-auto pb-1">
                            {farmsList.map((farm, idx) => (
                                <button
                                    key={farm.id || idx}
                                    onClick={() => {
                                        setSelectedTabIndex(idx);
                                        setLoadingWeather(true); // Trigger loading state
                                    }}
                                    className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors border-t border-l border-r ${selectedTabIndex === idx
                                        ? 'bg-white text-green-700 border-gray-200 border-b-white z-10 -mb-px shadow-[0_-2px_5px_rgba(0,0,0,0.02)]'
                                        : 'bg-gray-100 text-gray-500 hover:bg-gray_50 border-transparent hover:text-gray-700'
                                        }`}
                                >
                                    {farm.name}
                                </button>
                            ))}
                        </div>
                    )}

                    {(weather || loadingWeather) && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full flex flex-col justify-between">
                            {/* Top Row: Current Weather */}
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <p className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-1">Clima en: {weather?.location || '...'}</p>
                                    {loadingWeather ? (
                                        <p className="text-sm animate-pulse text-gray-400">Cargando...</p>
                                    ) : weather ? (
                                        <div className="flex items-center gap-4">
                                            <span className="text-4xl">{weather.icon}</span>
                                            <div>
                                                <span className="text-4xl font-extrabold block text-gray-800">{weather.temp}°C</span>
                                                <span className="text-sm text-gray-500 capitalize font-medium">{weather.condition}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-400">No disponible</p>
                                    )}
                                </div>
                                {weather && (
                                    <div className="text-right text-xs text-gray-400 font-medium space-y-1 bg-gray-50 px-3 py-2 rounded-lg">
                                        <p>💧 {weather.humidity}% Humedad</p>
                                        <p>💨 {weather.wind} km/h Viento</p>
                                    </div>
                                )}
                            </div>

                            {/* Bottom Row: Split View */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 border-t border-gray-100 pt-4 flex-1">

                                {/* Left: Windy Map */}
                                {!loadingWeather && weather?.mapUrl && (
                                    <div className="h-48 rounded-lg overflow-hidden border border-gray-200 shadow-sm relative group">
                                        <div className="absolute top-2 left-2 z-10 bg-white/80 text-gray-700 text-[10px] px-2 py-1 rounded backdrop-blur-md font-bold shadow-sm">
                                            🌪️ Viento vivo
                                        </div>
                                        <iframe
                                            src={weather.mapUrl}
                                            className="w-full h-full border-none"
                                            title="Windy Weather Map"
                                        />
                                    </div>
                                )}

                                {/* Right: Forecast */}
                                {!loadingWeather && weather?.forecast && (
                                    <div className="flex flex-col justify-between h-48">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Pronóstico 3 Días</p>
                                        <div className="flex-1 flex flex-col gap-2">
                                            {weather.forecast.map((d, i: number) => (
                                                <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-100 hover:border-gray-300 transition-colors flex-1">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xl">{d.icon}</span>
                                                        <span className="text-sm font-bold text-gray-700 capitalize">
                                                            {new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' })}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        {d.precip > 0 && (
                                                            <span className="text-[10px] font-bold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                                                ☔ {d.precip}mm
                                                            </span>
                                                        )}
                                                        <div className="text-sm font-bold text-gray-800">
                                                            <span className="text-gray-900">{Math.round(d.max)}°</span>
                                                            <span className="mx-1 text-gray-300">/</span>
                                                            <span className="text-gray-500">{Math.round(d.min)}°</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Animals Card Column */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Distribución de Animales</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
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
            </div>

            {/* Grid: Actions & Alerts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Acciones Rápidas</h3>
                    <div className="space-y-3">
                        <button
                            onClick={() => onNavigate?.('animals')}
                            className="w-full bg-green-50 text-green-700 font-medium py-2 px-4 rounded-lg hover:bg-green-100 transition-colors text-left flex items-center gap-2"
                        >
                            Registrar nuevo animal
                        </button>
                        <button
                            onClick={() => onNavigate?.('events')}
                            className="w-full bg-green-50 text-green-700 font-medium py-2 px-4 rounded-lg hover:bg-green-100 transition-colors text-left flex items-center gap-2"
                        >
                            Registrar evento sanitario
                        </button>
                        <button
                            onClick={() => onNavigate?.('reports')}
                            className="w-full bg-green-50 text-green-700 font-medium py-2 px-4 rounded-lg hover:bg-green-100 transition-colors text-left flex items-center gap-2"
                        >
                            Generar reporte mensual
                        </button>
                    </div>
                </div>

                {/* Events */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Próximos Eventos</h3>
                    <div className="space-y-3">
                        {upcomingEvents.length === 0 ? (
                            <p className="text-gray-500 italic text-sm">No hay eventos próximos.</p>
                        ) : (
                            upcomingEvents.map((evt, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                    <div className="w-2 h-2 mt-2 rounded-full bg-green-500 shrink-0"></div>
                                    <div>
                                        <p className="font-medium text-gray-800 text-sm">{evt.type}</p>
                                        <p className="text-xs text-gray-500">{new Date(evt.date).toLocaleDateString()} - {evt.animalId || 'General'}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
