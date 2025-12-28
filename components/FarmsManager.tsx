import React, { useState, useEffect } from 'react';
import { useStorage } from '@/context/StorageContext';
import { SigpacService } from '@/services/sigpacService';
import { WeatherService } from '@/services/weatherService';
import { SoilEngine } from '@/services/soilEngine';
import { BreedManager } from '@/services/breedManager';

interface Farm {
    id: string;
    name: string;
    municipio: string;
    municipioCode?: string;
    provinciaCode?: string;
    poligono: string;
    parcela: string;
    superficie: number;
    recintos: any[];
    coords?: { lat: number; lng: number };
    slope?: number;

    // New Fields
    license: string;
    maxHeads: number;
    soilId: string;
    corrals: number;
    corralNames?: string[];
    feedingSystem?: string;

    // Recommendations & Analysis
    climateStudy?: any;
    cropsRecommendation?: any[];
    breedsRecommendation?: any[];
}

export function FarmsManager() {
    const { read, write } = useStorage();
    const [farms, setFarms] = useState<Farm[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [sessionUser, setSessionUser] = useState('');

    // Form State
    const [newName, setNewName] = useState('');
    const [provincia, setProvincia] = useState('10'); // Caceres default
    const [municipio, setMunicipio] = useState(''); // Code
    const [municipioName, setMunicipioName] = useState('');
    const [poligono, setPoligono] = useState('');
    const [parcela, setParcela] = useState('');

    // New Fields State
    const [license, setLicense] = useState('');
    const [maxHeads, setMaxHeads] = useState('');
    const [soilId, setSoilId] = useState('');
    const [corrals, setCorrals] = useState('');
    const [corralNames, setCorralNames] = useState<string[]>([]);
    const [feedingSystem, setFeedingSystem] = useState('');

    // Analysis State
    const [climateData, setClimateData] = useState<any>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [recommendations, setRecommendations] = useState<any>({ crops: [], breeds: [] });

    // Lists
    // Simplified lists for demo
    const provinces = [{ code: '10', name: 'Cáceres' }, { code: '06', name: 'Badajoz' }];
    const [municipalities, setMunicipalities] = useState<any[]>([]);
    const [soilTypes, setSoilTypes] = useState<any[]>([]);

    const [loadingSigpac, setLoadingSigpac] = useState(false);
    const [searchResult, setSearchResult] = useState<any>(null);

    // Initial Load & Restore Draft
    useEffect(() => {
        // Load Soil Types from new Engine
        setSoilTypes(SoilEngine.getAllSoils().map(s => ({ id_suelo: s.id, nombre: s.name })));

        const user = read<string>('sessionUser', '');
        setSessionUser(user);

        // Load farms
        const loadedFarms = read<Farm[]>(`fincas_${user}`, []);
        setFarms(loadedFarms);

        // Restore Draft
        const draft = localStorage.getItem(`farm_draft_${user}`);
        if (draft) {
            try {
                const d = JSON.parse(draft);
                if (confirm("Hemos encontrado datos de una finca que no se guardó. ¿Quieres recuperarlos?")) {
                    setNewName(d.newName || '');
                    setProvincia(d.provincia || '10');
                    setMunicipio(d.municipio || '');
                    setMunicipioName(d.municipioName || '');
                    setPoligono(d.poligono || '');
                    setParcela(d.parcela || '');
                    setLicense(d.license || '');
                    setMaxHeads(d.maxHeads || '');
                    setSoilId(d.soilId || '');
                    setCorrals(d.corrals || '');
                    setFeedingSystem(d.feedingSystem || '');
                    setShowForm(true);
                } else {
                    localStorage.removeItem(`farm_draft_${user}`);
                }
            } catch (e) {
                console.error("Error restoring draft", e);
            }
        }
    }, [read]);

    // Auto-Save Draft
    useEffect(() => {
        if (!sessionUser || !showForm) return;
        if (newName || license || poligono || parcela) {
            const draft = {
                newName, provincia, municipio, municipioName,
                poligono, parcela, license, maxHeads, soilId, corrals, feedingSystem
            };
            localStorage.setItem(`farm_draft_${sessionUser}`, JSON.stringify(draft));
        }
    }, [newName, provincia, municipio, poligono, parcela, license, maxHeads, soilId, corrals, feedingSystem, showForm, sessionUser]);

    // Mock Municipalities load
    useEffect(() => {
        if (provincia) {
            // Simplified logic: just set some dummy municipalities or keep empty if not implementing full list
            setMunicipalities([
                { codigo: '001', descripcion: 'Municipio A' },
                { codigo: '002', descripcion: 'Municipio B' }
            ]);
        }
    }, [provincia]);

    // Live Recommendation Update
    useEffect(() => {
        if (soilId) {
            // 1. Crop Recommendations from SoilEngine
            // 1. Crop Recommendations from SoilEngine (New Advanced Logic)
            // Slope default to 0 if not available (ideally should come from farm data)
            // Ideally we need to store slope in the farm object or get it from Sigpac search result
            // Since we don't strictly persist slope in 'Farm' interface yet (only slope_avg in local search), 
            // we'll try to use it if we are in 'searchResult', or default to safe 5%

            // NOTE: We need to access the 'slope' data. It is currently in 'searchResult.slope_avg' which might be lost on refresh.
            // For now, let's assume we want to use the climateData if available.
            // We'll update the interface to store slope in next steps if needed, but for now we pass 0 as safe default or parse it if we had it.
            // Let's assume we add a 'slope' field to Farm?
            // User requested explicit usage of "slope from sigpac".
            // We should use `searchResult?.slope_avg` if we are creating, or `farm.slope` if editing.

            const currentSlope = searchResult?.slope_avg || (editingId ? farms.find(f => f.id === editingId)?.slope : 0) || 0;

            const cropRecs = SoilEngine.getRecommendedCrops(soilId, climateData, currentSlope).map(c => ({
                nombre_alimento: c.crop,
                tipo: c.type,
                reasons: [c.reason]
            }));

            // 2. Breed Recommendations (Simplified Logic via BreedManager + Climate)
            const breedRecs: any[] = [];

            // Generate popular F1s for analysis
            const f1_candidates = [
                BreedManager.calculateHybrid('ANG', 'BRA'), // Brangus style
                BreedManager.calculateHybrid('HER', 'ANG'), // Black Baldy
                BreedManager.calculateHybrid('LIM', 'RET'), // Common in Spain
                BreedManager.calculateHybrid('LIM', 'MOR'),
                BreedManager.calculateHybrid('CHA', 'RET')
            ].filter(b => b !== null);

            const allCandidates = [...BreedManager.getAllBreeds(), ...f1_candidates];

            // Example: If hot climate, recommend Heat Tolerant breeds
            if (climateData && climateData.avgTemp > 25) {
                const heatBreeds = allCandidates
                    .filter(b => b.heat_tolerance >= 8)
                    .map(b => ({ breed: b.name, reasons: ['Alta tolerancia al calor'] }));
                breedRecs.push(...heatBreeds);
            } else {
                // Default high productivity
                const prodBreeds = allCandidates
                    .filter(b => b.adg_feedlot > 1.4)
                    .sort((a, b) => b.adg_feedlot - a.adg_feedlot) // Sort by best ADG
                    .slice(0, 4) // Show top 4
                    .map(b => ({ breed: b.name, reasons: ['Alta productividad (GMD)'] }));
                breedRecs.push(...prodBreeds);
            }

            setRecommendations({ crops: cropRecs, breeds: breedRecs });
        }
    }, [soilId, climateData]);

    const handleSearchSigpac = async () => {
        if (!municipio || !poligono || !parcela) {
            alert("Completa los datos de SIGPAC");
            return;
        }
        setLoadingSigpac(true);
        try {
            // New Service Call
            const data = await SigpacService.fetchParcelData(
                Number(provincia),
                Number(municipio),
                Number(poligono),
                Number(parcela)
            );

            if (data) {
                setSearchResult(data);

                // Auto-Fill Logic
                // Assume 100 heads per 100ha ?
                if (!maxHeads) setMaxHeads(Math.floor(data.area_ha * 2).toString()); // 2 cows per ha

                // Guess Soil based on Slope/Use (Heuristic)
                // If steep slope > 20%, probably "Sierra" (not in our basic list, map to closest or leave empty)

                if (data.coordinates) {
                    handleAnalyzeClimate(data.coordinates.lat, data.coordinates.lon);
                } else {
                    // Default center of Spain/Extremadura if no coords
                    handleAnalyzeClimate(39.4, -6.0);
                }

                alert(`✅ Parcela Localizada: ${data.area_ha.toFixed(2)} ha - Uso: ${data.use}`);
            } else {
                alert("No se encontró la parcela en SIGPAC");
            }
        } catch (e) {
            console.error(e);
            alert("Error consultando SIGPAC");
        } finally {
            setLoadingSigpac(false);
        }
    };

    // Climate Source State
    const [climateSource, setClimateSource] = useState<'public' | 'private'>('public');
    const [privateApiUrl, setPrivateApiUrl] = useState('');
    const [privateApiKey, setPrivateApiKey] = useState('');

    const handleAnalyzeClimate = async (lat: number, lon: number) => {
        setAnalyzing(true);
        try {
            if (climateSource === 'private' && privateApiUrl) {
                // Mock Private Station Call
                // In production: await fetch(`${privateApiUrl}?lat=${lat}&lon=${lon}&key=${privateApiKey}`)
                alert(`Conectando a estación privada en: ${privateApiUrl}... (Simulación)`);
                // Simulate data for now
                setClimateData({ avgTemp: 16.5, classification: 'Clima Local (Estación)', annualPrecip: 550 });
            } else {
                // Default Public API (Open-Meteo)
                const analysis = await WeatherService.analyzeClimate(lat, lon);
                if (analysis) {
                    setClimateData(analysis);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setAnalyzing(false);
        }
    };

    const cleanGisData = (data: any) => {
        if (!data || !data.recintos) return [];
        return data.recintos.map((r: any) => ({
            usage: r.uso,
            area: r.superficie * 10000,
            dn_oid: 0
        }));
    };

    const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);

    const handleDeleteFarm = (id: string) => {
        if (confirm("¿Estás seguro de que quieres eliminar esta finca? Esta acción no se puede deshacer.")) {
            const updated = farms.filter(f => f.id !== id);
            setFarms(updated);
            write(`fincas_${sessionUser}`, updated);
            setSelectedFarm(null);
        }
    };

    const handleEditFarm = (farm: Farm) => {
        setEditingId(farm.id);
        setNewName(farm.name);
        setLicense(farm.license || '');
        setProvincia(farm.provinciaCode || '');
        setMunicipio(farm.municipioCode || '');
        setMunicipioName(farm.municipio || '');
        setPoligono(farm.poligono || '');
        setParcela(farm.parcela || '');
        setSoilId(farm.soilId || '');
        setMaxHeads(farm.maxHeads?.toString() || '');
        setCorrals(farm.corrals?.toString() || '');
        setCorralNames(farm.corralNames || Array.from({ length: farm.corrals || 0 }, (_, i) => `Corral ${i + 1}`)); // Load or default
        setFeedingSystem(farm.feedingSystem || ''); // Edit feeding system

        if (farm.climateStudy) setClimateData(farm.climateStudy);
        if (farm.cropsRecommendation) {
            setRecommendations({ crops: farm.cropsRecommendation, breeds: farm.breedsRecommendation || [] });
        }

        setSelectedFarm(null);
        setShowForm(true);
    };

    const [errors, setErrors] = useState<Record<string, boolean>>({});

    const handleSaveFarm = () => {
        const newErrors: Record<string, boolean> = {};
        if (!newName) newErrors.name = true;
        if (!license) newErrors.license = true;
        if (!soilId) newErrors.soilId = true;
        if (!maxHeads) newErrors.maxHeads = true;
        if (!feedingSystem) newErrors.feedingSystem = true; // Validate

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            alert("Por favor, completa todos los campos obligatorios marcados en rojo.");
            return;
        }

        let superficie = 0;
        let recintos: any[] = [];
        let coords;

        if (searchResult) {
            recintos = cleanGisData(searchResult);
            superficie = recintos.reduce((sum: number, r: any) => sum + (r.area || 0), 0);

            if (searchResult.lat && searchResult.lon) {
                coords = { lat: searchResult.lat, lng: searchResult.lon };
            }
        }

        const muniObj = municipalities.find(m => m.codigo == municipio || m.codigo == parseInt(municipio));
        const finalMuniName = muniObj ? muniObj.descripcion : municipioName;

        const id = editingId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `farm-${Date.now()}`);

        const newFarm: Farm = {
            id,
            name: newName,
            municipio: finalMuniName,
            municipioCode: municipio,
            provinciaCode: provincia,
            poligono,
            parcela,
            superficie: superficie || (editingId ? farms.find(f => f.id === editingId)?.superficie || 0 : 0),
            recintos: recintos.length ? recintos : (editingId ? farms.find(f => f.id === editingId)?.recintos || [] : []),
            coords: coords || (editingId ? farms.find(f => f.id === editingId)?.coords : undefined),
            slope: searchResult?.slope_avg || (editingId ? farms.find(f => f.id === editingId)?.slope : 0),

            license,
            maxHeads: Number(maxHeads),
            soilId,
            corrals: Number(corrals),
            corralNames, // Save names
            feedingSystem,
            climateStudy: climateData,
            cropsRecommendation: recommendations.crops,
            breedsRecommendation: recommendations.breeds
        };

        const updated = editingId
            ? farms.map(f => f.id === editingId ? newFarm : f)
            : [...farms, newFarm];

        setFarms(updated);
        write(`fincas_${sessionUser}`, updated);

        // Reset
        setNewName('');
        setLicense('');
        setMaxHeads('');
        setSoilId('');
        setCorrals('');
        setCorralNames([]);
        setFeedingSystem('');
        setClimateData(null);
        setRecommendations({ crops: [], breeds: [] });
        setErrors({}); // Clear errors

        setMunicipio('');
        setMunicipioName('');
        setPoligono('');
        setParcela('');
        setSearchResult(null);
        setShowForm(false);
        setEditingId(null);

        // Clear Draft
        localStorage.removeItem(`farm_draft_${sessionUser}`);

        alert(editingId ? "✅ Finca actualizada correctamente" : "✅ Finca guardada correctamente");
    };

    // Capacity Logic Helper
    const getCapacityStatus = (farm: Farm) => {
        // Need usage from animal list. Assuming passed or loaded. 
        // For now mocking/calculating locally. 
        // In real app, we should pass currentCounts from parent or read from storage.
        const animals = read<any[]>(`animals_${sessionUser}`, []);
        const current = animals.filter(a => a.farm === farm.name && (!a.status || a.status === 'Activo')).length;
        const max = farm.maxHeads || 1;
        const pct = (current / max) * 100;

        let color = 'bg-green-500';
        if (pct >= 100) color = 'bg-red-500';
        else if (pct > 90) color = 'bg-yellow-500';

        return { current, pct, color };
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Mis Fincas</h2>
                    <p className="text-gray-600">Gestión de parcelas y terrenos</p>
                </div>
                <button
                    onClick={() => {
                        setEditingId(null);
                        setNewName('');
                        setLicense('');
                        setMaxHeads('');
                        setSoilId('');
                        setCorrals('');
                        setCorralNames([]);
                        setFeedingSystem(''); // Reset
                        setClimateData(null);
                        setRecommendations({ crops: [], breeds: [] });
                        setShowForm(true);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                    {showForm ? 'Cancelar' : 'Nueva Finca'}
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-4">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Registrar Finca (SIGPAC)</h3>

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Finca *</label>
                            <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                                className={`w-full border rounded-lg px-3 py-2 ${errors.name ? 'border-red-500 bg-red-50' : ''}`} placeholder="Ej: La Dehesa" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nº Licencia REGA *</label>
                            <input type="text" value={license} onChange={e => setLicense(e.target.value)}
                                className={`w-full border rounded-lg px-3 py-2 ${errors.license ? 'border-red-500 bg-red-50' : ''}`} placeholder="ES..." />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cabezas Máximas *</label>
                            <input type="number" value={maxHeads} onChange={e => setMaxHeads(e.target.value)}
                                className={`w-full border rounded-lg px-3 py-2 ${errors.maxHeads ? 'border-red-500 bg-red-50' : ''}`} placeholder="Ej: 150" />
                        </div>
                    </div>

                    {/* Location */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 bg-gray-50 p-4 rounded-lg">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
                            <select value={provincia} onChange={e => setProvincia(e.target.value)}
                                className="w-full border rounded-lg px-3 py-2 bg-white">
                                <option value="">Selecciona Provincia</option>
                                {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Municipio</label>
                            <select value={municipio} onChange={e => {
                                setMunicipio(e.target.value);
                                const m = municipalities.find(mu => mu.codigo == e.target.value);
                                if (m) setMunicipioName(m.descripcion);
                            }}
                                className="w-full border rounded-lg px-3 py-2 bg-white" disabled={!provincia}>
                                <option value="">Selecciona Municipio</option>
                                {municipalities.map(m => <option key={m.codigo} value={m.codigo}>{m.descripcion}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Polígono</label>
                            <input type="text" value={poligono} onChange={e => setPoligono(e.target.value)}
                                className="w-full border rounded-lg px-3 py-2" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Parcela</label>
                            <div className="flex gap-2">
                                <input type="text" value={parcela} onChange={e => setParcela(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2" />
                                <button onClick={handleSearchSigpac} disabled={loadingSigpac}
                                    className="bg-blue-600 text-white px-3 rounded-lg hover:bg-blue-700">
                                    {loadingSigpac ? '...' : 'Buscar'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Technical Specs */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Suelo *</label>
                            <select value={soilId} onChange={e => setSoilId(e.target.value)}
                                className={`w-full border rounded-lg px-3 py-2 ${errors.soilId ? 'border-red-500 bg-red-50' : ''}`}>
                                <option value="">Selecciona Suelo</option>
                                {soilTypes.map(s => <option key={s.id_suelo} value={s.id_suelo}>{s.nombre}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sistema Alimentación *</label>
                            <select value={feedingSystem} onChange={e => setFeedingSystem(e.target.value)}
                                className={`w-full border rounded-lg px-3 py-2 ${errors.feedingSystem ? 'border-red-500 bg-red-50' : ''}`}>
                                <option value="">Selecciona...</option>
                                <option value="extensivo">Extensivo (Pastoreo)</option>
                                <option value="intensivo">Intensivo (Cebadero)</option>
                                <option value="mixto">Mixto (Suplementación)</option>
                                <option value="ecologico">Ecológico</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nº Corrales</label>
                            <input type="number" value={corrals} onChange={e => {
                                const val = e.target.value;
                                setCorrals(val);
                                // Adjust names array
                                const num = parseInt(val) || 0;
                                setCorralNames(prev => {
                                    const newNames = [...prev];
                                    if (num > newNames.length) {
                                        for (let i = newNames.length; i < num; i++) newNames.push(`Corral ${i + 1}`);
                                    } else {
                                        newNames.length = num;
                                    }
                                    return newNames;
                                });
                            }}
                                className="w-full border rounded-lg px-3 py-2" placeholder="0" />

                            {/* Custom Corral Names */}
                            {corralNames.length > 0 && (
                                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto p-2 bg-gray-50 rounded border border-gray-100">
                                    <label className="block text-xs font-bold text-gray-500 uppercase">Nombres de Corrales</label>
                                    {corralNames.map((name, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <span className="text-xs text-gray-400 w-16">#{idx + 1}</span>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={e => {
                                                    const newNames = [...corralNames];
                                                    newNames[idx] = e.target.value;
                                                    setCorralNames(newNames);
                                                }}
                                                className="flex-1 text-xs border rounded px-2 py-1 focus:ring-1 focus:ring-green-500 outline-none"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="border border-green-100 bg-green-50 p-3 rounded-lg">
                            <h4 className="font-semibold text-green-800 text-sm mb-2">Datos Climáticos</h4>

                            <div className="mb-2">
                                <label className="flex items-center gap-2 text-xs text-gray-700">
                                    <input type="radio" value="public" checked={climateSource === 'public'}
                                        onChange={() => setClimateSource('public')} />
                                    API Pública (Open-Meteo)
                                </label>
                                <label className="flex items-center gap-2 text-xs text-gray-700 mt-1">
                                    <input type="radio" value="private" checked={climateSource === 'private'}
                                        onChange={() => setClimateSource('private')} />
                                    Estación Propia (API)
                                </label>
                            </div>

                            {climateSource === 'private' && (
                                <div className="space-y-2 mb-2">
                                    <input type="text" placeholder="Endpoint API" className="w-full text-xs p-1 border rounded"
                                        value={privateApiUrl} onChange={e => setPrivateApiUrl(e.target.value)} />
                                    <input type="password" placeholder="API Key" className="w-full text-xs p-1 border rounded"
                                        value={privateApiKey} onChange={e => setPrivateApiKey(e.target.value)} />
                                </div>
                            )}

                            {analyzing ? <p className="text-xs text-gray-500">Analizando...</p> : climateData ? (
                                <div className="text-xs text-green-900 mt-2 border-t border-green-200 pt-2">
                                    <p>Media: {climateData.avgTemp}°C</p>
                                    <p>Clima: {climateData.classification}</p>
                                    <p>Precip: {climateData.annualPrecip}mm/año</p>
                                </div>
                            ) : <p className="text-xs text-gray-400">Localiza la parcela para ver datos</p>}
                        </div>
                    </div>

                    {/* Recommendations */}
                    {(recommendations.crops.length > 0 || recommendations.breeds.length > 0) && (
                        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                                <h4 className="font-bold text-orange-800 text-sm mb-2">Razas Recomendadas</h4>
                                <ul className="text-sm space-y-1">
                                    {recommendations.breeds.map((r: any, i: number) => (
                                        <li key={i} className="text-orange-900">
                                            <strong>{r.breed}</strong>: {r.reasons.join(', ')}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                                <h4 className="font-bold text-emerald-800 text-sm mb-2">Cultivos Sugeridos</h4>
                                <ul className="text-sm space-y-1">
                                    {recommendations.crops.slice(0, 3).map((r: any, i: number) => (
                                        <li key={i} className="text-emerald-900">
                                            <strong>{r.nombre_alimento}</strong> ({r.tipo})
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button onClick={() => setShowForm(false)} className="text-gray-600 hover:text-gray-800 font-medium px-4">
                            Cancelar
                        </button>
                        <button onClick={handleSaveFarm} className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg">
                            Guardar Finca Completa
                        </button>
                    </div>
                </div>
            )}

            {/* Farm Detail Modal */}
            {
                selectedFarm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">{selectedFarm.name}</h2>
                                        <p className="text-gray-500 text-sm">Licencia: {selectedFarm.license}</p>
                                    </div>
                                    <button onClick={() => setSelectedFarm(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                                    <div className="bg-gray-50 p-3 rounded">
                                        <p className="text-gray-500 text-xs uppercase mb-1">Ubicación</p>
                                        <p className="font-medium">{selectedFarm.municipio}</p>
                                        <p>Polígono {selectedFarm.poligono} / Parcela {selectedFarm.parcela}</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded">
                                        <p className="text-gray-500 text-xs uppercase mb-1">Superficie</p>
                                        <p className="font-medium text-lg">
                                            {Number(selectedFarm.superficie / 10000).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ha
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded">
                                        <p className="text-gray-500 text-xs uppercase mb-1">Capacidad</p>
                                        <p className="font-medium">{getCapacityStatus(selectedFarm).current} / {selectedFarm.maxHeads} cabezas</p>
                                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                            <div className={`${getCapacityStatus(selectedFarm).color} h-1.5 rounded-full`}
                                                style={{ width: `${Math.min(getCapacityStatus(selectedFarm).pct, 100)}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded">
                                        <p className="text-gray-500 text-xs uppercase mb-1">Suelo / Sistema</p>
                                        <p className="text-sm font-medium text-gray-900">{soilTypes.find(s => s.id_suelo === selectedFarm.soilId)?.nombre || 'Desconocido'}</p>
                                        <p className="text-sm font-medium text-gray-900 capitalize">{selectedFarm.feedingSystem || 'No definido'}</p>
                                    </div>
                                </div>

                                {selectedFarm.climateStudy && (
                                    <div className="mb-6 border-t pt-4">
                                        <h4 className="font-bold text-gray-800 mb-2 text-sm">Datos Climáticos</h4>
                                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                            <p>Clima: <span className="font-medium text-gray-900">{selectedFarm.climateStudy.classification}</span></p>
                                            <p>Temp Media: <span className="font-medium text-gray-900">{selectedFarm.climateStudy.avgTemp}°C</span></p>
                                            <p>Precipitación: <span className="font-medium text-gray-900">{selectedFarm.climateStudy.annualPrecip} mm</span></p>
                                        </div>
                                    </div>
                                )}

                                {/* Crops Recommendation in Modal */}
                                {selectedFarm.cropsRecommendation && selectedFarm.cropsRecommendation.length > 0 && (
                                    <div className="mb-6 border-t pt-4">
                                        <h4 className="font-bold text-emerald-800 mb-2 text-sm">Cultivos Recomendados</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {selectedFarm.cropsRecommendation.slice(0, 4).map((c: any, i: number) => (
                                                <div key={i} className="flex items-center gap-2 text-sm text-emerald-900 bg-emerald-50 px-3 py-2 rounded-lg">
                                                    <span className="text-lg"></span>
                                                    <div>
                                                        <p className="font-bold leading-tight">{c.nombre_alimento}</p>
                                                        <p className="text-xs opacity-75">{c.tipo}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedFarm.breedsRecommendation && selectedFarm.breedsRecommendation.length > 0 && (
                                    <div className="mb-6 border-t pt-4">
                                        <h4 className="font-bold text-gray-800 mb-2 text-sm">Razas Ideales</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedFarm.breedsRecommendation.map((r: any, i: number) => (
                                                <span key={i} className="bg-orange-50 text-orange-800 text-xs px-2 py-1 rounded-full font-medium border border-orange-100">
                                                    {r.breed}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
                                    {/* RBAC: Only Admin can delete */}
                                    {read<any[]>('users', []).find((u: any) => u.name === sessionUser)?.role === 'admin' && (
                                        <button
                                            onClick={() => handleDeleteFarm(selectedFarm.id)}
                                            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Eliminar Finca
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleEditFarm(selectedFarm)}
                                        className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
                                    >
                                        Editar Información
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {farms.map(f => {
                    const cap = getCapacityStatus(f);
                    return (
                        <div key={f.id}
                            onClick={() => setSelectedFarm(f)}
                            className="cursor-pointer bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-lg transition-all transform hover:-translate-y-1 group">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-xl font-bold text-gray-800 group-hover:text-green-700 transition-colors">{f.name}</h3>
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{f.license || 'Sin Licencia'}</span>
                            </div>

                            <div className="text-sm text-gray-600 space-y-2 mb-4">
                                <p>📍 {f.municipio} ({Number(f.superficie / 10000).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ha)</p>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span>Capacidad ({cap.current}/{f.maxHeads})</span>
                                        <span className={cap.pct >= 100 ? 'text-red-600 font-bold' : 'text-gray-500'}>
                                            {cap.pct.toFixed(0)}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div className={`${cap.color} h-2 rounded-full`} style={{ width: `${Math.min(cap.pct, 100)}%` }}></div>
                                    </div>
                                    {cap.pct >= 100 && <p className="text-xs text-red-600 font-bold">Exceso de capacidad</p>}
                                </div>
                                <p className="text-xs text-gray-500">
                                    Suelo: {soilTypes.find(s => s.id_suelo === f.soilId)?.nombre || 'Desconocido'}
                                    {f.climateStudy && ` | Clima: ${f.climateStudy.classification}`}
                                </p>
                            </div>
                            <div className="text-center text-xs text-green-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                Ver Ficha Completa →
                            </div>
                        </div>
                    );
                })}
            </div>
        </div >
    );
}
