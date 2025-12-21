'use client';

import React, { useState, useEffect } from 'react';
import { useStorage } from '@/context/StorageContext';

export function AnimalInventory() {
    const { read, write } = useStorage();
    const [animals, setAnimals] = useState<any[]>([]);
    const [farms, setFarms] = useState<any[]>([]);
    const [sessionUser, setSessionUser] = useState('');
    const [showForm, setShowForm] = useState(false);

    // New Animal Form State
    const [newAnimal, setNewAnimal] = useState({
        id: '',
        name: '',
        farm: '',
        breed: '',
        sex: '',
        birth: '',
        weight: '',
        notes: ''
    });

    useEffect(() => {
        const user = read<string>('sessionUser', '');
        setSessionUser(user);
        if (user) {
            setAnimals(read<any[]>(`animals_${user}`, []));
            setFarms(read<any[]>(`fincas_${user}`, []));
        }
    }, [read]);

    const handleSaveAnimal = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAnimal.id || !newAnimal.farm || !newAnimal.sex || !newAnimal.breed) {
            alert("Por favor completa los campos obligatorios");
            return;
        }

        // Check duplicate ID
        if (animals.find(a => a.id === newAnimal.id)) {
            alert("Ya existe un animal con ese Crotal");
            return;
        }

        const animalEntry = {
            ...newAnimal,
            weight: parseFloat(newAnimal.weight) || 0,
            category: 'Sin Clasificar', // Logic for category calculation could be added here
            joined: new Date().toISOString()
        };

        const updated = [...animals, animalEntry];
        setAnimals(updated);
        write(`animals_${sessionUser}`, updated);

        setShowForm(false);
        setNewAnimal({
            id: '', name: '', farm: '', breed: '', sex: '', birth: '', weight: '', notes: ''
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Inventario de Animales</h2>
                    <p className="text-gray-600">Registro y monitoreo individual</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                    {showForm ? 'Cancelar' : 'Nuevo Animal'}
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-4">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Registrar Animal</h3>
                    <form onSubmit={handleSaveAnimal} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Crotal (ID) *</label>
                            <input type="text" required className="w-full border rounded-lg px-3 py-2"
                                value={newAnimal.id} onChange={e => setNewAnimal({ ...newAnimal, id: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre (Opcional)</label>
                            <input type="text" className="w-full border rounded-lg px-3 py-2"
                                value={newAnimal.name} onChange={e => setNewAnimal({ ...newAnimal, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Finca *</label>
                            <select required className="w-full border rounded-lg px-3 py-2"
                                value={newAnimal.farm} onChange={e => setNewAnimal({ ...newAnimal, farm: e.target.value })}>
                                <option value="">Selecciona Finca</option>
                                {farms.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Raza *</label>
                            <select required className="w-full border rounded-lg px-3 py-2"
                                value={newAnimal.breed} onChange={e => setNewAnimal({ ...newAnimal, breed: e.target.value })}>
                                <option value="">Selecciona Raza</option>
                                <option value="Avileña-Negra Ibérica">Avileña-Negra Ibérica</option>
                                <option value="Retinta">Retinta</option>
                                <option value="Limousin">Limousin</option>
                                <option value="Charolais">Charolais</option>
                                <option value="Cruzada">Cruzada</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sexo *</label>
                            <select required className="w-full border rounded-lg px-3 py-2"
                                value={newAnimal.sex} onChange={e => setNewAnimal({ ...newAnimal, sex: e.target.value })}>
                                <option value="">Selecciona Sexo</option>
                                <option value="Macho">Macho</option>
                                <option value="Hembra">Hembra</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Nacimiento</label>
                            <input type="date" className="w-full border rounded-lg px-3 py-2"
                                value={newAnimal.birth} onChange={e => setNewAnimal({ ...newAnimal, birth: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Peso Actual (kg)</label>
                            <input type="number" step="0.1" className="w-full border rounded-lg px-3 py-2"
                                value={newAnimal.weight} onChange={e => setNewAnimal({ ...newAnimal, weight: e.target.value })} />
                        </div>
                        <div className="md:col-span-2">
                            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg w-full md:w-auto">
                                Guardar Animal
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-600 font-medium text-sm">
                        <tr>
                            <th className="p-4">ID / Nombre</th>
                            <th className="p-4">Raza</th>
                            <th className="p-4">Sexo</th>
                            <th className="p-4">Peso</th>
                            <th className="p-4">Finca</th>
                            <th className="p-4">Edad</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {animals.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-500">No hay animales registrados.</td></tr>
                        ) : (
                            animals.map((a, i) => (
                                <tr key={i} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 font-medium text-gray-900">
                                        {a.id}
                                        {a.name && <span className="block text-xs text-gray-500">{a.name}</span>}
                                    </td>
                                    <td className="p-4 text-gray-600">{a.breed}</td>
                                    <td className="p-4 text-gray-600">{a.sex}</td>
                                    <td className="p-4 text-gray-600">{a.weight} kg</td>
                                    <td className="p-4 text-gray-600">{a.farm}</td>
                                    <td className="p-4 text-gray-600">{a.birth || '-'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
