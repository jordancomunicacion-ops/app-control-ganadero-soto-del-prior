'use client';

import React, { useEffect, useState } from 'react';
import { useStorage } from '@/context/StorageContext';
import { WeatherService, type DailyForecast } from '@/services/weatherService';
import { EventManager } from '@/services/eventManager';
import { SoilEngine, estimateCarryingCapacity } from '@/services/soilEngine';
import { InfoTip } from '@/components/InfoTip';
import { KPIScoreboard } from '@/components/KPIScoreboard';
import { getFarms } from '@/app/lib/farm-actions';
import { getAnimals } from '@/app/lib/animal-actions';
import { getCorralStocking, type CorralStockingRow } from '@/app/lib/corral-actions';
import type { AnimalLike, FarmLike, LivestockEvent } from '@/types/livestock';
import { Droplet, Wind, CloudRain, Radar, CheckCircle2, AlertTriangle, Ban, MinusCircle, MapPin, Beef, Calendar, Bell, PlusCircle, ClipboardList, BarChart3, ArrowRight } from 'lucide-react';

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

    const excludedStatuses = ['sacrificado', 'muerto', 'vendido', 'baja', 'inactivo', 'retirado'];
    animals.forEach((a) => {
        // Count every animal whose status is not in the exclusion list. A null /
        // undefined status counts as "active" — older records lack the field.
        if (a.status && excludedStatuses.includes(a.status.toLowerCase())) return;

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
    const [stocking, setStocking] = useState<Array<{
        farmId: string;
        name: string;
        soilName: string;
        haUtil: number;
        currentLU: number;
        supportableLU: number;
        ratio: number;
        status: 'ok' | 'warning' | 'critical';
    }>>([]);
    const [expandedFarmId, setExpandedFarmId] = useState<string | null>(null);
    const [corralBreakdown, setCorralBreakdown] = useState<Record<string, CorralStockingRow[]>>({});

    const handleToggleFarm = async (farmId: string) => {
        if (expandedFarmId === farmId) {
            setExpandedFarmId(null);
            return;
        }
        setExpandedFarmId(farmId);
        if (!corralBreakdown[farmId]) {
            try {
                const rows = await getCorralStocking(farmId);
                setCorralBreakdown((prev) => ({ ...prev, [farmId]: rows }));
            } catch {
                /* noop */
            }
        }
    };

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
                const animals = animalsData as unknown as AnimalLike[];
                setAnimalStats(calculateAnimalStats(animals));
                // Compute stocking-rate analysis per farm. Uses Pulido 2014
                // baseline carrying capacity from SoilEngine + the farm's
                // climate study to estimate the supportable LU/ha for each
                // farm and compares it with active head count.
                getFarms(userId).then(({ data: farmsRaw }) => {
                    if (cancelled) return;
                    type FarmRow = FarmLike & {
                        id?: string;
                        soilId?: string;
                        superficie?: number;
                        climateStudy?: { annualPrecip?: number };
                    };
                    const farms = farmsRaw as unknown as FarmRow[];
                    const excludedStatuses = new Set(['sacrificado', 'muerto', 'vendido', 'baja', 'inactivo', 'retirado']);
                    const byFarm = new Map<string, number>();
                    for (const a of animals) {
                        if (a.status && excludedStatuses.has(String(a.status).toLowerCase())) continue;
                        const fid = (a as unknown as { farmId?: string }).farmId;
                        if (!fid) continue;
                        byFarm.set(fid, (byFarm.get(fid) ?? 0) + 1);
                    }
                    const rows = farms.map((f) => {
                        const farmId = f.id ?? '';
                        const haUtil = f.superficie ? f.superficie / 10000 : 0; // m² → ha
                        const annualPrecip = f.climateStudy?.annualPrecip ?? 500;
                        const cap = f.soilId
                            ? estimateCarryingCapacity(f.soilId, annualPrecip, 30).lu_per_ha
                            : 0.4;
                        const supportableLU = parseFloat((cap * haUtil).toFixed(1));
                        const currentLU = byFarm.get(farmId) ?? 0; // 1 cow ≈ 1 LU (NDSU)
                        const ratio = supportableLU > 0 ? currentLU / supportableLU : 0;
                        const status: 'ok' | 'warning' | 'critical' =
                            ratio <= 1.0 ? 'ok' : ratio <= 1.2 ? 'warning' : 'critical';
                        const soil = f.soilId ? SoilEngine.getSoilById(f.soilId) : undefined;
                        return {
                            farmId,
                            name: f.name ?? 'Finca',
                            soilName: soil?.wrb_group
                                ? `${soil.wrb_group}${soil.wrb_qualifier ? ` ${soil.wrb_qualifier}` : ''}`
                                : (soil?.name ?? '—'),
                            haUtil: parseFloat(haUtil.toFixed(1)),
                            currentLU,
                            supportableLU,
                            ratio: parseFloat(ratio.toFixed(2)),
                            status,
                        };
                    }).filter((r) => r.haUtil > 0);
                    setStocking(rows);
                }).catch(() => { /* noop */ });
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

    const sessionUser = read<string>('appSession', '') as string;
    const greetingHour = new Date().getHours();
    const greeting = greetingHour < 12 ? 'Buenos días' : greetingHour < 20 ? 'Buenas tardes' : 'Buenas noches';
    const firstName = sessionUser?.split(/[@\s]/)[0] || '';
    const displayName = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : '';

    const totalActiveAnimals =
        Object.values(animalStats.males).reduce((a, b) => a + b, 0) +
        Object.values(animalStats.females).reduce((a, b) => a + b, 0);

    const isEmpty = farmsList.length === 0 && totalActiveAnimals === 0;

    return (
        <div className="space-y-6">
            {/* Header con saludo personalizado */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        {displayName ? `${greeting}, ${displayName}` : greeting}
                    </h2>
                    <p className="text-gray-600 text-sm">Resumen de tu operación ganadera</p>
                </div>
            </div>

            {/* Empty state — sin fincas ni animales */}
            {isEmpty && (
                <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-8 text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-50 text-green-600 mb-3">
                        <MapPin className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Aún no tienes datos</h3>
                    <p className="text-sm text-gray-600 max-w-md mx-auto mb-4">
                        Empieza creando tu primera finca. Después podrás registrar animales, eventos y obtener análisis automáticos.
                    </p>
                    <button
                        onClick={() => onNavigate?.('farms')}
                        className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-5 rounded-lg shadow-sm transition-colors"
                    >
                        <PlusCircle className="w-4 h-4" /> Crear primera finca
                    </button>
                </div>
            )}

            {/* Cuadro de mando ejecutivo con semáforo (rojo/ámbar/verde).
                Sustituye al strip de 4 cards básicas anterior — éste ya
                cubre cabezas, alertas activas y muchos más KPIs con
                drill-down y umbrales operativos. */}
            {!isEmpty && <KPIScoreboard onDrilldown={onNavigate} />}

            {/* 1. CARGA GANADERA + alertas — prioridad operativa */}
            {stocking.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                    {/* Alertas arriba, antes de la tabla */}
                    {stocking.some((r) => r.status === 'critical') && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700 flex items-start gap-2">
                            <Ban className="w-5 h-5 shrink-0 mt-0.5" />
                            <div>
                                <strong>Sobrecarga crítica</strong> en una o más fincas (&gt;20 % por encima de la capacidad sostenible).
                                <p className="mt-1 text-xs">
                                    <strong>Qué hacer:</strong> reduce cabezas, amplía superficie útil, o suplementa con forraje comprado mientras se recupera el pasto natural.
                                </p>
                            </div>
                        </div>
                    )}
                    {stocking.every((r) => r.status !== 'critical') && stocking.some((r) => r.status === 'warning') && (
                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm text-amber-700 flex items-start gap-2">
                            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                            <div>
                                <strong>Carga ajustada.</strong>
                                <p className="mt-1 text-xs">
                                    Estás cerca del tope. Vigila que el pasto recupere bien después del pastoreo — si ves clareos persistentes, baja cabezas.
                                </p>
                            </div>
                        </div>
                    )}

                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Carga ganadera vs capacidad sostenible</h3>
                        <p className="text-sm text-gray-600">
                            ¿Cuánto ganado puede mantener tu finca sin que el pasto se degrade?
                        </p>
                        <p className="text-xs italic text-gray-400 mt-1 leading-snug">
                            Combinamos el tipo de suelo, la lluvia anual y el % de arbolado para estimar cuántas vacas adultas equivalentes (LU) puede soportar cada hectárea. Modelo Pulido et al. 2014 (dehesa Extremadura).
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                                    <th className="pb-2 pr-4">Finca</th>
                                    <th className="pb-2 pr-4">Suelo</th>
                                    <th className="pb-2 pr-4 text-right">ha</th>
                                    <th className="pb-2 pr-4 text-right">
                                        <span className="inline-flex items-center gap-1">
                                            LU actual <InfoTip termKey="stocking_rate" />
                                        </span>
                                    </th>
                                    <th className="pb-2 pr-4 text-right">
                                        <span className="inline-flex items-center gap-1">
                                            Soportable <InfoTip termKey="supportable_lu" />
                                        </span>
                                    </th>
                                    <th className="pb-2 text-right">Carga</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stocking.map((r) => {
                                    const isExpanded = expandedFarmId === r.farmId;
                                    const corrals = corralBreakdown[r.farmId];
                                    return (
                                        <React.Fragment key={r.farmId}>
                                            <tr
                                                className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                                                onClick={() => handleToggleFarm(r.farmId)}
                                            >
                                                <td className="py-2 pr-4 font-medium text-gray-800 flex items-center gap-1">
                                                    <span className="text-gray-400 text-xs">{isExpanded ? '▾' : '▸'}</span>
                                                    {r.name}
                                                </td>
                                                <td className="py-2 pr-4 text-xs text-gray-500">{r.soilName}</td>
                                                <td className="py-2 pr-4 text-right text-gray-700">{r.haUtil}</td>
                                                <td className="py-2 pr-4 text-right text-gray-700">{r.currentLU}</td>
                                                <td className="py-2 pr-4 text-right text-gray-700">{r.supportableLU}</td>
                                                <td className="py-2 text-right">
                                                    <span
                                                        title={r.status === 'ok' ? 'Carga dentro del óptimo' : r.status === 'warning' ? 'Cerca del tope, vigila el pasto' : 'Por encima del tope sostenible'}
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold cursor-help ${
                                                            r.status === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                            : r.status === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                                            : 'bg-red-50 text-red-700 border border-red-100'
                                                        }`}
                                                    >
                                                        {r.status === 'ok' ? <CheckCircle2 className="w-3.5 h-3.5" /> : r.status === 'warning' ? <AlertTriangle className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                                                        {(r.ratio * 100).toFixed(0)}%
                                                    </span>
                                                </td>
                                            </tr>
                                            {isExpanded && corrals && (
                                                <tr key={`${r.farmId}-corrals`} className="bg-gray-50/40">
                                                    <td colSpan={6} className="px-4 py-3">
                                                        {corrals.length === 0 ? (
                                                            <p className="text-xs italic text-gray-500">No hay corrales declarados en esta finca. Edita la finca para añadirlos.</p>
                                                        ) : (
                                                            <div>
                                                                <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wide mb-2">Desglose por corral · LU actual vs capacidad declarada</p>
                                                                <div className="space-y-1">
                                                                    {corrals.map((c) => (
                                                                        <div key={c.corralId} className="flex items-center justify-between bg-white border border-gray-100 rounded px-3 py-1.5 text-xs">
                                                                            <div className="flex-1 min-w-0">
                                                                                <span className="font-bold text-gray-800">{c.name}</span>
                                                                                <span className="text-gray-400 ml-2">· {c.kind}</span>
                                                                                {c.surfaceM2 ? <span className="text-gray-400 ml-2">· {c.surfaceM2.toLocaleString()} m²</span> : null}
                                                                            </div>
                                                                            <div className="text-right">
                                                                                <span className="text-gray-700">
                                                                                    {c.currentLU} {c.capacityLU ? `/ ${c.capacityLU}` : ''} LU
                                                                                </span>
                                                                                <span className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                                    c.status === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                                                    : c.status === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                                                                    : c.status === 'critical' ? 'bg-red-50 text-red-700 border border-red-100'
                                                                                    : 'bg-gray-50 text-gray-500 border border-gray-100'
                                                                                }`}>
                                                                                    {c.status === 'ok' ? <CheckCircle2 className="w-3 h-3" /> : c.status === 'warning' ? <AlertTriangle className="w-3 h-3" /> : c.status === 'critical' ? <Ban className="w-3 h-3" /> : <MinusCircle className="w-3 h-3" />}
                                                                                    {c.capacityLU ? `${(c.ratio * 100).toFixed(0)}%` : 'sin capacidad'}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <p className="text-[11px] italic text-gray-400 mt-2">
                                                                    LU actual = animales con ese corral asignado, ajustados por edad. «Sin capacidad» = el corral no tiene capacityLU declarada; edita la finca para añadirla.
                                                                </p>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-[11px] italic text-gray-400 leading-snug">
                        1 LU = 1 vaca adulta de unos 600 kg. Verde &lt;100 % = todo en orden. Ámbar 100-120 % = vigila. Rojo &gt;120 % = sobrecarga: reduce cabezas o suplementa pasto.
                    </p>
                </div>
            )}

            {/* 2. Acciones rápidas + próximos eventos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Acciones rápidas</h3>
                    <div className="space-y-2">
                        <QuickAction Icon={Beef} label="Registrar nuevo animal" onClick={() => onNavigate?.('animals')} />
                        <QuickAction Icon={ClipboardList} label="Registrar evento sanitario" onClick={() => onNavigate?.('events')} />
                        <QuickAction Icon={BarChart3} label="Ver informes" onClick={() => onNavigate?.('reports')} />
                    </div>
                </div>

                {/* Events */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-baseline justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Próximos eventos</h3>
                        {upcomingEvents.length > 0 && (
                            <button onClick={() => onNavigate?.('events')} className="text-xs font-medium text-green-700 hover:text-green-800 inline-flex items-center gap-1">
                                Ver todos <ArrowRight className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                    <div className="space-y-2">
                        {upcomingEvents.length === 0 ? (
                            <p className="text-gray-500 italic text-sm">No hay eventos próximos.</p>
                        ) : (
                            upcomingEvents.slice(0, 5).map((evt, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                    <div className="w-2 h-2 mt-2 rounded-full bg-green-500 shrink-0"></div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-gray-900 text-sm truncate">{evt.type}</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(evt.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                            {evt.animalId ? ` · ${evt.animalId}` : ''}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* 3. Distribución de animales */}
            {!isEmpty && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-baseline justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Distribución de animales</h3>
                        <button onClick={() => onNavigate?.('animals')} className="text-xs font-medium text-green-700 hover:text-green-800 inline-flex items-center gap-1">
                            Inventario <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h4 className="text-sky-700 font-semibold mb-3 border-b border-sky-100 pb-2 text-sm uppercase tracking-wide">Machos</h4>
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
                            <h4 className="text-rose-600 font-semibold mb-3 border-b border-rose-100 pb-2 text-sm uppercase tracking-wide">Hembras</h4>
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
            )}

            {/* 4. Clima y pronóstico — informativo, al final */}
            {(weather || loadingWeather) && farmsList.length > 0 && (
                <div>
                    {/* Tabs for Farms */}
                    <div className="flex space-x-1 overflow-x-auto pb-1">
                        {farmsList.map((farm, idx) => (
                            <button
                                key={farm.id || idx}
                                onClick={() => {
                                    setSelectedTabIndex(idx);
                                    setLoadingWeather(true);
                                }}
                                className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors border-t border-l border-r ${selectedTabIndex === idx
                                    ? 'bg-white text-green-700 border-gray-200 border-b-white z-10 -mb-px shadow-[0_-2px_5px_rgba(0,0,0,0.02)]'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-50 border-transparent hover:text-gray-700'
                                    }`}
                            >
                                {farm.name}
                            </button>
                        ))}
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-6">
                        {/* Top Row: Current Weather */}
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-1">Clima en {weather?.location || '...'}</p>
                                {loadingWeather ? (
                                    <p className="text-sm animate-pulse text-gray-400">Cargando...</p>
                                ) : weather ? (
                                    <div className="flex items-center gap-4">
                                        <span className="text-4xl">{weather.icon}</span>
                                        <div>
                                            <span className="text-4xl font-extrabold block text-gray-900">{weather.temp}°C</span>
                                            <span className="text-sm text-gray-500 capitalize font-medium">{weather.condition}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400">No disponible</p>
                                )}
                            </div>
                            {weather && (
                                <div className="text-right text-xs text-gray-500 font-medium space-y-1 bg-gray-50 px-3 py-2 rounded-lg">
                                    <p className="flex items-center justify-end gap-1.5"><Droplet className="w-3.5 h-3.5 text-sky-500" /> {weather.humidity}% humedad</p>
                                    <p className="flex items-center justify-end gap-1.5"><Wind className="w-3.5 h-3.5 text-gray-400" /> {weather.wind} km/h viento</p>
                                </div>
                            )}
                        </div>

                        {/* Bottom Row: Map + Forecast */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                            {!loadingWeather && weather?.mapUrl && (
                                <div className="h-48 rounded-lg overflow-hidden border border-gray-200 shadow-sm relative group">
                                    <div className="absolute top-2 left-2 z-10 bg-white/80 text-gray-700 text-[10px] px-2 py-1 rounded backdrop-blur-md font-bold shadow-sm inline-flex items-center gap-1">
                                        <Radar className="w-3 h-3" /> Viento vivo
                                    </div>
                                    <iframe src={weather.mapUrl} className="w-full h-full border-none" title="Windy Weather Map" />
                                </div>
                            )}

                            {!loadingWeather && weather?.forecast && (
                                <div className="flex flex-col h-48">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Pronóstico 3 días</p>
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
                                                            <CloudRain className="w-3 h-3 text-sky-600" /> {d.precip}mm
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
                </div>
            )}
        </div>
    );
}

// Helpers locales — KPI card y acción rápida
function KpiCard({ label, value, Icon, accent, onClick }: {
    label: string;
    value: number;
    Icon: React.ComponentType<{ className?: string }>;
    accent: string;
    onClick?: () => void;
}) {
    const Wrapper: React.ElementType = onClick ? 'button' : 'div';
    return (
        <Wrapper
            onClick={onClick}
            className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 ${onClick ? 'hover:border-green-200 hover:shadow-md transition-all text-left w-full' : ''}`}
        >
            <span className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${accent}`}>
                <Icon className="w-5 h-5" />
            </span>
            <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">{label}</p>
                <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
            </div>
        </Wrapper>
    );
}

function QuickAction({ Icon, label, onClick }: {
    Icon: React.ComponentType<{ className?: string }>;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="w-full bg-green-50 text-green-700 font-medium py-2.5 px-4 rounded-lg hover:bg-green-100 transition-colors text-left flex items-center gap-3 group"
        >
            <Icon className="w-4 h-4" />
            <span className="flex-1">{label}</span>
            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
        </button>
    );
}
