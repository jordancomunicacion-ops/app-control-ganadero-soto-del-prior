import React, { useState, useEffect } from 'react';
import { useStorage } from '@/context/StorageContext';
import { SigpacService } from '@/services/sigpacService';
import { WeatherService } from '@/services/weatherService';
import { SPANISH_PROVINCES } from '@/services/locationService';
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
    f1Recommendation?: any[];
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
    const [recommendations, setRecommendations] = useState<any>({ crops: [], breeds: [], f1s: [] });
    const [showAllBreeds, setShowAllBreeds] = useState(false);
    const [showAllF1s, setShowAllF1s] = useState(false);
    const [showAllCrops, setShowAllCrops] = useState(false);

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

    // --- Location Logic ---
    const [allMunicipalities, setAllMunicipalities] = useState<any[]>([]);
    const [isLoadingLoc, setIsLoadingLoc] = useState(false);

    // Initial Load of Full Municipality Database
    useEffect(() => {
        const loadMunis = async () => {
            try {
                const res = await fetch('/data/municipios.json');
                if (res.ok) {
                    const data = await res.json();
                    setAllMunicipalities(data);
                }
            } catch (e) {
                console.error("Error loading municipalities", e);
            }
        };
        loadMunis();
    }, []);

    // Filter Municipalities when Province changes
    useEffect(() => {
        if (provincia && allMunicipalities.length > 0) {
            // Filter by provincia_id. Note: JSON uses "provincia_id" (e.g. "10", "31")
            // Ensure padding if needed, but our select values are already padded "01", "10", etc.
            const filtered = allMunicipalities.filter(m => m.provincia_id === provincia);

            // Map to our component format { codigo, descripcion }
            const mapped = filtered.map(m => ({
                codigo: m.cmun,       // INE code for municipality (e.g. "095")
                descripcion: m.nombre // Name (e.g. "Guadalupe")
            })).sort((a, b) => a.descripcion.localeCompare(b.descripcion));

            setMunicipalities(mapped);
        } else {
            setMunicipalities([]);
        }
    }, [provincia, allMunicipalities]);

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

            const recs = calculateFarmRecommendations(soilId, climateData, currentSlope);
            setRecommendations(recs);
        }
    }, [soilId, climateData]);

    // Helper: Centralized Recommendation Logic (Reusable for Saved Farms)
    const calculateFarmRecommendations = (sId: string, clim: any, slope: number) => {
        // 1. Crops
        const cropRecs = SoilEngine.getRecommendedCrops(sId, clim, slope).map(c => ({
            nombre_alimento: c.crop,
            tipo: c.type,
            reasons: [c.reason]
        }));

        // 2. Breeds & F1
        // Generate popular F1s
        const f1_candidates = [
            BreedManager.calculateHybrid('ANG', 'BRA'),
            BreedManager.calculateHybrid('HER', 'ANG'),
            BreedManager.calculateHybrid('LIM', 'RET'),
            BreedManager.calculateHybrid('LIM', 'MOR'),
            BreedManager.calculateHybrid('CHA', 'RET')
        ].filter(b => b !== null);

        const allPure = BreedManager.getAllBreeds();

        const selectBest = (candidates: any[]) => {
            if (clim && clim.avgTemp > 25) {
                return candidates
                    .filter(b => b.heat_tolerance >= 7)
                    .sort((a, b) => b.heat_tolerance - a.heat_tolerance)
                    .slice(0, 3)
                    .map(b => ({ breed: b.name, reasons: ['Alta tolerancia al calor', 'Adaptación'] }));
            } else {
                return candidates
                    .filter(b => b.adg_feedlot > 1.2)
                    .sort((a, b) => b.adg_feedlot - a.adg_feedlot)
                    .slice(0, 3)
                    .map(b => ({ breed: b.name, reasons: ['Alta productividad', 'Eficiencia'] }));
            }
        };

        const selectedPure = selectBest(allPure);
        const selectedF1 = selectBest(f1_candidates);

        // Defaults
        if (selectedPure.length === 0) {
            selectedPure.push(...allPure.slice(0, 3).map(b => ({ breed: b.name, reasons: ['Estándar'] })));
        }
        if (selectedF1.length === 0 && f1_candidates.length > 0) {
            selectedF1.push(...f1_candidates.slice(0, 3).map(b => ({ breed: b.name, reasons: ['Vigor Híbrido Estándar'] })));
        }

        return { crops: cropRecs, breeds: selectedPure, f1s: selectedF1 };
    };

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
            breedsRecommendation: recommendations.breeds,
            f1Recommendation: recommendations.f1s
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
                    {/* Location Section - Refined Layout */}
                    <div className="space-y-4 mb-6 pt-4 border-t border-gray-100">
                        <h4 className="font-semibold text-gray-800 text-sm">Ubicación (SIGPAC)</h4>

                        {/* Single Row: Province | Municipality | Poligon | Parcela */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
                                <select
                                    value={provincia}
                                    onChange={(e) => {
                                        setProvincia(e.target.value);
                                        setMunicipio('');
                                    }}
                                    className="w-full border rounded-lg px-3 py-2 bg-white focus:border-green-500 focus:outline-none"
                                >
                                    <option value="">Seleccione Provincia</option>
                                    {SPANISH_PROVINCES.map(p => (
                                        <option key={p.code} value={p.code}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Municipio</label>
                                <select
                                    value={municipio}
                                    onChange={e => {
                                        setMunicipio(e.target.value);
                                        const m = municipalities.find(mu => mu.codigo == e.target.value);
                                        if (m) setMunicipioName(m.descripcion);
                                    }}
                                    className="w-full border rounded-lg px-3 py-2 bg-white focus:border-green-500 focus:outline-none"
                                    disabled={!provincia}
                                >
                                    <option value="">Seleccione Municipio</option>
                                    {municipalities.map(m => <option key={m.codigo} value={m.codigo}>{m.descripcion}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Polígono</label>
                                <input type="text" value={poligono} onChange={e => setPoligono(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2 focus:border-green-500 focus:outline-none" placeholder="0" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Parcela</label>
                                <div className="flex gap-2">
                                    <input type="text" value={parcela} onChange={e => setParcela(e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2 focus:border-green-500 focus:outline-none" placeholder="0" />
                                    <button onClick={handleSearchSigpac} disabled={loadingSigpac}
                                        className="bg-green-600 text-white px-4 rounded-lg hover:bg-green-700 font-medium transition-colors border border-green-700 shadow-sm">
                                        {loadingSigpac ? '...' : 'Buscar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Technical Specs */}
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Suelo *</label>
                                <select value={soilId} onChange={e => setSoilId(e.target.value)}
                                    className={`w-full border rounded-lg px-3 py-2 bg-white ${errors.soilId ? 'border-red-500 bg-red-50' : ''}`}>
                                    <option value="">Selecciona Suelo</option>
                                    {soilTypes.map(s => <option key={s.id_suelo} value={s.id_suelo}>{s.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sistema Alimentación *</label>
                                <select value={feedingSystem} onChange={e => setFeedingSystem(e.target.value)}
                                    className={`w-full border rounded-lg px-3 py-2 bg-white ${errors.feedingSystem ? 'border-red-500 bg-red-50' : ''}`}>
                                    <option value="">Selecciona...</option>
                                    <option value="extensivo">Extensivo (Pastoreo)</option>
                                    <option value="intensivo">Intensivo (Cebadero)</option>
                                    <option value="mixto">Mixto (Suplementación)</option>
                                    <option value="ecologico">Ecológico</option>
                                </select>
                            </div>
                            {/* Corrals Section - Number & Names Side-by-Side */}
                            <div className="flex gap-4">
                                <div className="w-1/3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nº Corrales</label>
                                    <input type="number" value={corrals} onChange={e => {
                                        const val = e.target.value;
                                        setCorrals(val);
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
                                </div>
                                <div className="flex-1">
                                    {corralNames.length > 0 && (
                                        <div className="bg-gray-50 rounded border border-gray-100 p-2 max-h-40 overflow-y-auto">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nombres</label>
                                            <div className="space-y-2">
                                                {corralNames.map((name, idx) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-400 w-6">#{idx + 1}</span>
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
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Unified Row: Climate | Pure | F1 | Crops */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 items-start">

                            {/* Col 1: Climate Data (Green) */}
                            <div className="border border-green-200 bg-green-50 p-3 rounded-lg flex flex-col h-full">
                                <div>
                                    <h4 className="font-semibold text-green-900 text-sm mb-3">Datos Climáticos</h4>
                                    <div className="space-y-2 mb-3">
                                        <label className="flex items-center gap-2 text-sm text-green-800 cursor-pointer">
                                            <input type="radio" name="climateSource" defaultChecked className="text-green-600 focus:ring-green-500" />
                                            API Pública
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-green-800/50 cursor-not-allowed">
                                            <input type="radio" name="climateSource" disabled />
                                            Estación Propia
                                        </label>
                                    </div>
                                </div>
                                <div className="text-sm text-green-800 pt-3 border-t border-green-200/50">
                                    {provincia && municipio ? (
                                        <div className="space-y-1">
                                            <p className="flex justify-between"><span>Media:</span> <strong>15.4°C</strong></p>
                                            <p className="flex justify-between"><span>Clima:</span> <strong>Templado Seco</strong></p>
                                            <p className="flex justify-between"><span>Precip:</span> <strong>431mm</strong></p>
                                        </div>
                                    ) : (
                                        <p className="text-green-600 italic">Selecciona ubicación...</p>
                                    )}
                                </div>
                            </div>

                            {/* Col 2: Pure Breeds (Orange) */}
                            <div className="border border-orange-200 bg-orange-50 p-3 rounded-lg flex flex-col h-full">
                                <h4 className="font-semibold text-orange-900 text-sm mb-3">Razas Puras</h4>
                                {recommendations.breeds.length > 0 ? (
                                    <>
                                        <ul className="text-sm space-y-3 flex-1">
                                            {recommendations.breeds.slice(0, showAllBreeds ? undefined : 3).map((r: any, i: number) => (
                                                <li key={i} className="text-orange-900 pb-2 border-b border-orange-200/50 last:border-0 last:pb-0">
                                                    <strong className="text-orange-900 block">{r.breed}</strong>
                                                    <span className="text-[11px] text-orange-700">({r.reasons.join(', ').replace('(GMD)', '')})</span>
                                                </li>
                                            ))}
                                        </ul>
                                        {recommendations.breeds.length > 3 && (
                                            <button
                                                onClick={() => setShowAllBreeds(!showAllBreeds)}
                                                className="text-[11px] text-orange-700 font-medium hover:text-orange-900 mt-2 text-center w-full pt-2 border-t border-orange-200/50"
                                            >
                                                {showAllBreeds ? 'Ver menos' : `Ver ${recommendations.breeds.length - 3} más...`}
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-sm text-orange-400 italic">Completa datos...</p>
                                )}
                            </div>

                            {/* Col 3: F1 Crossbreeds (Amber) */}
                            <div className="border border-amber-200 bg-amber-50 p-3 rounded-lg flex flex-col h-full">
                                <h4 className="font-semibold text-amber-900 text-sm mb-3">Cruces F1</h4>
                                {recommendations.f1s && recommendations.f1s.length > 0 ? (
                                    <>
                                        <ul className="text-sm space-y-3 flex-1">
                                            {recommendations.f1s.slice(0, showAllF1s ? undefined : 3).map((r: any, i: number) => (
                                                <li key={i} className="text-amber-900 pb-2 border-b border-amber-200/50 last:border-0 last:pb-0">
                                                    <strong className="text-amber-900 block" title={r.breed}>{r.breed}</strong>
                                                    <span className="text-[11px] text-amber-700">({r.reasons.join(', ')})</span>
                                                </li>
                                            ))}
                                        </ul>
                                        {recommendations.f1s.length > 3 && (
                                            <button
                                                onClick={() => setShowAllF1s(!showAllF1s)}
                                                className="text-[11px] text-amber-700 font-medium hover:text-amber-900 mt-2 text-center w-full pt-2 border-t border-amber-200/50"
                                            >
                                                {showAllF1s ? 'Ver menos' : `Ver ${recommendations.f1s.length - 3} más...`}
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-sm text-amber-400 italic">Calculando...</p>
                                )}
                            </div>

                            {/* Col 4: Crops (Emerald) */}
                            <div className="border border-emerald-200 bg-emerald-50 p-3 rounded-lg flex flex-col h-full">
                                <h4 className="font-semibold text-emerald-900 text-sm mb-3">Cultivos</h4>
                                {recommendations.crops.length > 0 ? (
                                    <>
                                        <ul className="text-sm space-y-3 flex-1">
                                            {recommendations.crops.slice(0, showAllCrops ? undefined : 3).map((r: any, i: number) => (
                                                <li key={i} className="text-emerald-900 pb-2 border-b border-emerald-200/50 last:border-0 last:pb-0">
                                                    <strong className="text-emerald-900 block">{r.nombre_alimento}</strong>
                                                    <span className="text-[11px] text-emerald-700">({r.tipo})</span>
                                                </li>
                                            ))}
                                        </ul>
                                        {recommendations.crops.length > 3 && (
                                            <button
                                                onClick={() => setShowAllCrops(!showAllCrops)}
                                                className="text-[11px] text-emerald-700 font-medium hover:text-emerald-900 mt-2 text-center w-full pt-2 border-t border-emerald-200/50"
                                            >
                                                {showAllCrops ? 'Ver menos' : `Ver ${recommendations.crops.length - 3} más...`}
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-sm text-emerald-400 italic">Completa datos...</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button onClick={() => setShowForm(false)} className="text-gray-600 hover:text-gray-800 font-medium px-4">
                            Cancelar
                        </button>
                        <button onClick={handleSaveFarm} className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg">
                            Guardar Finca Completa
                        </button>
                    </div>
                </div >
            )
            }

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

                                {/* Technical Specs Display Grid - 4 Cols */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 items-start">

                                    {/* Climate (Green) */}
                                    {selectedFarm.climateStudy && (
                                        <div className="border border-green-200 bg-green-50 p-3 rounded-lg flex flex-col h-full">
                                            <h4 className="font-semibold text-green-900 text-sm mb-3">Datos Climáticos</h4>
                                            <div className="space-y-1 text-sm text-green-800">
                                                <p className="flex justify-between"><span>Clima:</span> <strong>{selectedFarm.climateStudy.classification}</strong></p>
                                                <p className="flex justify-between"><span>Media:</span> <strong>{selectedFarm.climateStudy.avgTemp}°C</strong></p>
                                                <p className="flex justify-between"><span>Precip:</span> <strong>{selectedFarm.climateStudy.annualPrecip}mm</strong></p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Pure Breeds (Orange) */}
                                    {selectedFarm.breedsRecommendation && (
                                        <div className="border border-orange-200 bg-orange-50 p-3 rounded-lg flex flex-col h-full">
                                            <h4 className="font-semibold text-orange-900 text-sm mb-3">Razas Puras</h4>
                                            <ul className="text-sm space-y-2">
                                                {selectedFarm.breedsRecommendation.slice(0, 3).map((r: any, i: number) => (
                                                    <li key={i} className="text-orange-900 pb-1 border-b border-orange-200/50 last:border-0">
                                                        <strong className="text-orange-900 block">{r.breed}</strong>
                                                        <span className="text-[11px] text-orange-700">({r.reasons ? r.reasons[0].replace('(GMD)', '') : ''})</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* F1 Crosses (Amber) */}
                                    <div className="border border-amber-200 bg-amber-50 p-3 rounded-lg flex flex-col h-full">
                                        <h4 className="font-semibold text-amber-900 text-sm mb-3">Cruces F1</h4>
                                        {(() => {
                                            const f1s = (selectedFarm.f1Recommendation && selectedFarm.f1Recommendation.length > 0)
                                                ? selectedFarm.f1Recommendation
                                                : (selectedFarm.climateStudy ? calculateFarmRecommendations(selectedFarm.soilId, selectedFarm.climateStudy, selectedFarm.slope || 0).f1s : []);

                                            return f1s.length > 0 ? (
                                                <ul className="text-sm space-y-2">
                                                    {f1s.slice(0, 3).map((r: any, i: number) => (
                                                        <li key={i} className="text-amber-900 pb-1 border-b border-amber-200/50 last:border-0">
                                                            <strong className="text-amber-900 block">{r.breed}</strong>
                                                            <span className="text-[11px] text-amber-700">({r.reasons ? r.reasons.join(', ') : ''})</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-sm text-amber-600/70 italic">No calculados</p>
                                            );
                                        })()}
                                    </div>

                                    {/* Crops (Emerald) */}
                                    {selectedFarm.cropsRecommendation && (
                                        <div className="border border-emerald-200 bg-emerald-50 p-3 rounded-lg flex flex-col h-full">
                                            <h4 className="font-semibold text-emerald-900 text-sm mb-3">Cultivos</h4>
                                            <ul className="text-sm space-y-2">
                                                {selectedFarm.cropsRecommendation.slice(0, 3).map((r: any, i: number) => (
                                                    <li key={i} className="text-emerald-900 pb-1 border-b border-emerald-200/50 last:border-0">
                                                        <strong className="text-emerald-900 block">{r.nombre_alimento}</strong>
                                                        <span className="text-[11px] text-emerald-700">({r.tipo})</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

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
                                <p>{f.municipio} ({Number(f.superficie / 10000).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ha)</p>
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
