'use client';

import React, { useState, useEffect } from 'react';
import { useStorage } from '@/context/StorageContext';
import { SigpacService } from '@/services/sigpacService';

interface Farm {
    id: string;
    name: string;
    municipio: string;
    poligono: string;
    parcela: string;
    superficie: number;
    recintos: any[];
    coords?: { lat: number; lng: number };
}

export function FarmsManager() {
    const { read, write } = useStorage();
    const [farms, setFarms] = useState<Farm[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [sessionUser, setSessionUser] = useState('');

    // Form State
    const [newName, setNewName] = useState('');
    const [provincia, setProvincia] = useState('10'); // Caceres default as per legacy
    const [municipio, setMunicipio] = useState('');
    const [poligono, setPoligono] = useState('');
    const [parcela, setParcela] = useState('');
    const [loadingSigpac, setLoadingSigpac] = useState(false);
    const [searchResult, setSearchResult] = useState<any>(null);

    useEffect(() => {
        const user = read<string>('sessionUser', '');
        setSessionUser(user);
        if (user) {
            const loadedFarms = read<Farm[]>(`fincas_${user}`, []);
            setFarms(loadedFarms);
        }
    }, [read]);

    const handleSearchSigpac = async () => {
        if (!municipio || !poligono || !parcela) {
            alert("Completa los datos de SIGPAC");
            return;
        }
        setLoadingSigpac(true);
        try {
            const data = await SigpacService.fetchParcelData(provincia, municipio, poligono, parcela);
            if (data) {
                setSearchResult(data);
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

    const cleanGisData = (geoJson: any) => {
        // Simplify logic for storing only essential data
        if (!geoJson || !geoJson.features) return [];
        return geoJson.features.map((f: any) => ({
            usage: f.properties.uso_sigpac,
            area: f.properties.superficie,
            dn_oid: f.properties.dn_oid
        }));
    };

    const handleSaveFarm = () => {
        if (!newName) {
            alert("Nombre de finca requerido");
            return;
        }

        let superficie = 0;
        let recintos: any[] = [];
        let coords;

        if (searchResult) {
            // Calculate total area
            recintos = cleanGisData(searchResult);
            superficie = recintos.reduce((sum: number, r: any) => sum + (r.area || 0), 0);

            // Try to get center
            if (searchResult.bbox) {
                const [minX, minY, maxX, maxY] = searchResult.bbox;
                const lat = (minY + maxY) / 2;
                const lng = (minX + maxX) / 2;
                coords = { lat, lng };
            }
        }

        const newFarm: Farm = {
            id: crypto.randomUUID(),
            name: newName,
            municipio,
            poligono,
            parcela,
            superficie: Number(superficie.toFixed(4)),
            recintos,
            coords
        };

        const updated = [...farms, newFarm];
        setFarms(updated);
        write(`fincas_${sessionUser}`, updated);

        // Reset form
        setNewName('');
        setMunicipio('');
        setPoligono('');
        setParcela('');
        setSearchResult(null);
        setShowForm(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Mis Fincas</h2>
                    <p className="text-gray-600">Gestión de parcelas y terrenos</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                    {showForm ? 'Cancelar' : 'Nueva Finca'}
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-4">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Registrar Finca (SIGPAC)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Finca</label>
                            <input
                                type="text"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                className="w-full border rounded-lg px-3 py-2"
                                placeholder="Ej: La Dehesa"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Provincia Code</label>
                            <input
                                type="text"
                                value={provincia}
                                onChange={e => setProvincia(e.target.value)}
                                className="w-full border rounded-lg px-3 py-2"
                                placeholder="10 (Cáceres)"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Municipio Code</label>
                            <input
                                type="text"
                                value={municipio}
                                onChange={e => setMunicipio(e.target.value)}
                                className="w-full border rounded-lg px-3 py-2"
                                placeholder="Ej: 007"
                            />
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Polígono</label>
                                <input
                                    type="text"
                                    value={poligono}
                                    onChange={e => setPoligono(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Parcela</label>
                                <input
                                    type="text"
                                    value={parcela}
                                    onChange={e => setParcela(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={handleSearchSigpac}
                            disabled={loadingSigpac}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg"
                        >
                            {loadingSigpac ? 'Buscando...' : '🔍 Buscar en SIGPAC'}
                        </button>
                        {searchResult && (
                            <button
                                onClick={handleSaveFarm}
                                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg"
                            >
                                Guardar Finca
                            </button>
                        )}
                    </div>

                    {searchResult && (
                        <div className="mt-4 p-4 bg-green-50 text-green-800 rounded-lg text-sm">
                            Parcela localizada. Superficie calculada:
                            <strong> {(cleanGisData(searchResult).reduce((sum: number, r: any) => sum + r.area, 0) / 10000).toFixed(2)} ha</strong>
                        </div>
                    )}
                </div>
            )}

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {farms.length === 0 ? (
                    <p className="text-gray-500 col-span-full text-center py-10">No hay fincas registradas.</p>
                ) : (
                    farms.map(f => (
                        <div key={f.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">{f.name}</h3>
                            <div className="text-sm text-gray-600 space-y-1">
                                <p>📍 {f.municipio}/{f.poligono}/{f.parcela}</p>
                                <p>📐 {(f.superficie / 10000).toFixed(2)} ha</p>
                                <p>🪵 {f.recintos.length} Recintos</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
