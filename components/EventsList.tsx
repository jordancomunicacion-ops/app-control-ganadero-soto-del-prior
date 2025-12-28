'use client';

import React, { useState, useEffect } from 'react';
import { useStorage } from '@/context/StorageContext';
import { EventManager } from '@/services/eventManager';
import { LifecycleEngine } from '@/services/lifecycleEngine';

const EVENT_TYPES = {
    'Sanitario': ['Saneamiento', 'Tratamiento', 'Vacunación', 'Desparasitación', 'Consulta Vet'],
    'Reproductivo': ['Celo', 'Inseminación', 'Diagnóstico Gestación', 'Parto', 'Aborto', 'Secado'],
    'Productivo': ['Pesaje', 'Condición Corporal', 'Ordeño (Pendiente)'],
    'Movimientos': ['Cambio de Corral', 'Entrada', 'Salida', 'Venta', 'Muerte/Sacrificio']
};

export function EventsList() {
    const { read, write } = useStorage();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [newEvent, setNewEvent] = useState({
        category: 'Sanitario',
        type: 'Saneamiento',
        date: new Date().toISOString().split('T')[0],
        formattedDate: new Date().toISOString().split('T')[0], // For input
        notes: '',
        cost: '',
        relatedType: 'none', // none, farm, animal
        relatedId: '',
        corral: '',
        // Commercial Data
        price: '',
        weightLive: '',
        weightCarcass: '',
        yield: '',
        seuropConf: '',
        fatCover: ''
    });

    // Data for selectors
    const [farms, setFarms] = useState<any[]>([]);
    const [animals, setAnimals] = useState<any[]>([]);
    const [sessionUser, setSessionUser] = useState('');

    const [alerts, setAlerts] = useState<any[]>([]);

    useEffect(() => {
        const user = read<string>('sessionUser', '');
        setSessionUser(user);
        if (user) {
            const allEvents = read<any[]>('events', []);
            const allFarms = read<any[]>(`fincas_${user}`, []);
            const allAnimals = read<any[]>(`animals_${user}`, []);

            setFarms(allFarms);
            setAnimals(allAnimals);

            // Generate Lifecycle Alerts
            const newAlerts: any[] = [];
            allAnimals.forEach(animal => {
                const animalAlerts = LifecycleEngine.getLifecycleAlerts({
                    ...animal,
                    birthDate: animal.birth // Ensure property mapping
                } as any);
                if (animalAlerts.length > 0) {
                    newAlerts.push(...animalAlerts.map(a => ({ ...a, crotal: animal.crotal, farm: animal.farm })));
                }
            });
            setAlerts(newAlerts);

            // Sort by date desc
            const sorted = [...allEvents].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setEvents(sorted);
            setLoading(false);
        }
    }, [read]);

    const handleCreateEvent = async () => {
        if (!newEvent.notes && !newEvent.type) {
            alert("Añade al menos una nota o tipo");
            return;
        }

        const context = {
            animals: read<any[]>(`animals_${sessionUser}`, []),
            events: read<any[]>('events', []),
            currentUser: sessionUser,
            storage: { read, write }
        };

        const finalType = newEvent.type || EVENT_TYPES[newEvent.category as keyof typeof EVENT_TYPES][0];

        const eventData = {
            type: finalType,
            date: newEvent.formattedDate,
            desc: (newEvent.corral ? `[Corral ${newEvent.corral}] ` : '') + newEvent.notes,
            cost: Number(newEvent.cost),
            animal: newEvent.relatedType === 'animal'
                ? context.animals.find(a => a.id === newEvent.relatedId)
                : { id: newEvent.relatedType === 'farm' ? newEvent.relatedId : 'GENERAL', crotal: newEvent.relatedType === 'farm' ? 'FINCA' : 'GENERAL' },
            typeData: {
                price: newEvent.price,
                liveWeight: newEvent.weightLive,
                carcassWeight: newEvent.weightCarcass,
                yield: newEvent.yield,
                seuropConf: newEvent.seuropConf,
                fatCover: newEvent.fatCover
            }
        };

        // Adaptation for EventManager which expects an 'animal' object usually
        // If it's a farm event, we might need to adjust logic or just pass a dummy animal object with farmId
        if (newEvent.relatedType === 'farm') {
            // For generic/farm events, we can use handleStandardEvent but need to ensure it doesn't break
            // if animal is not a real animal. EventManager.handleStandardEvent uses animal.id/crotal.
            const farmName = farms.find(f => f.id === newEvent.relatedId)?.name || 'Finca';
            eventData.animal = { id: newEvent.relatedId, crotal: farmName, farmId: newEvent.relatedId };
        }

        await EventManager.handleStandardEvent(eventData, context);

        // Refresh locally
        const updatedEvents = read<any[]>('events', []);
        const sorted = [...updatedEvents].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setEvents(sorted);
        setShowModal(false);

        // Reset form
        setNewEvent({
            category: 'Sanitario',
            type: 'Saneamiento',
            date: new Date().toISOString().split('T')[0],
            formattedDate: new Date().toISOString().split('T')[0],
            notes: '',
            cost: '',
            relatedType: 'none',
            relatedId: '',
            corral: '',
            price: '',
            weightLive: '',
            weightCarcass: '',
            yield: '',
            seuropConf: '',
            fatCover: ''
        });
    };

    return (
        <div className="space-y-6">
            {alerts.length > 0 && (
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 animate-in slide-in-from-top-2">
                    <h3 className="text-orange-800 font-bold flex items-center gap-2 text-sm mb-3">
                        <span className="text-xl">🔔</span> Alertas del Ciclo de Vida
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {alerts.map((alert, i) => (
                            <div key={i} className="bg-white p-3 rounded-lg border border-orange-100 shadow-sm flex justify-between items-center text-sm">
                                <div>
                                    <span className="font-bold text-gray-800">{alert.desc}</span>
                                    <p className="text-xs text-gray-500">Animal: {alert.crotal} ({alert.farm})</p>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${alert.isDue ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {alert.date}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center">

                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Eventos</h2>
                    <p className="text-gray-600">Registro histórico de acciones y sucesos</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                >
                    <span>+</span> Nuevo Evento
                </button>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-green-50 px-6 py-4 border-b border-green-100 flex justify-between items-center">
                            <h3 className="font-bold text-green-900">Registrar Evento</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha</label>
                                    <input
                                        type="date"
                                        value={newEvent.formattedDate}
                                        onChange={e => setNewEvent({ ...newEvent, formattedDate: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoría</label>
                                    <select
                                        value={newEvent.category}
                                        onChange={e => {
                                            const cat = e.target.value as keyof typeof EVENT_TYPES;
                                            setNewEvent({ ...newEvent, category: cat, type: EVENT_TYPES[cat][0] });
                                        }}
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none font-bold text-gray-700"
                                    >
                                        {Object.keys(EVENT_TYPES).map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Evento Específico</label>
                                <select
                                    value={newEvent.type}
                                    onChange={e => setNewEvent({ ...newEvent, type: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none bg-gray-50"
                                >
                                    {EVENT_TYPES[newEvent.category as keyof typeof EVENT_TYPES].map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vinculación (Opcional)</label>
                                <div className="flex gap-2 mb-2">
                                    <button
                                        onClick={() => setNewEvent({ ...newEvent, relatedType: 'none', relatedId: '', corral: '' })}
                                        className={`flex-1 py-1 text-xs rounded border ${newEvent.relatedType === 'none' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'}`}
                                    >General</button>
                                    <button
                                        onClick={() => setNewEvent({ ...newEvent, relatedType: 'farm', relatedId: '', corral: '' })}
                                        className={`flex-1 py-1 text-xs rounded border ${newEvent.relatedType === 'farm' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'}`}
                                    >Finca</button>
                                    <button
                                        onClick={() => setNewEvent({ ...newEvent, relatedType: 'animal', relatedId: '', corral: '' })}
                                        className={`flex-1 py-1 text-xs rounded border ${newEvent.relatedType === 'animal' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200'}`}
                                    >Animal</button>
                                </div>

                                {newEvent.relatedType === 'farm' && (
                                    <div className="flex gap-2">
                                        <select
                                            value={newEvent.relatedId}
                                            onChange={e => setNewEvent({ ...newEvent, relatedId: e.target.value, corral: '' })}
                                            className="w-full border rounded-lg px-3 py-2 text-sm flex-1"
                                        >
                                            <option value="">Selecciona Finca...</option>
                                            {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                        </select>
                                        {newEvent.relatedId && (
                                            <select
                                                value={newEvent.corral}
                                                onChange={e => setNewEvent({ ...newEvent, corral: e.target.value })}
                                                className="w-32 border rounded-lg px-3 py-2 text-sm"
                                            >
                                                <option value="">Corral...</option>
                                                {Array.from({ length: farms.find(f => f.id === newEvent.relatedId)?.corrals || 0 }, (_, i) => i + 1).map(n => (
                                                    <option key={n} value={n}>Corral {n}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                )}

                                {newEvent.relatedType === 'animal' && (
                                    <select
                                        value={newEvent.relatedId}
                                        onChange={e => setNewEvent({ ...newEvent, relatedId: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2 text-sm"
                                    >
                                        <option value="">Selecciona Animal...</option>
                                        {animals.map(a => <option key={a.id} value={a.id}>{a.crotal} ({a.breed || '?'})</option>)}
                                    </select>
                                )}
                            </div>

                            {/* Commercial / Slaughter Data Fields */}
                            {['Venta', 'Salida', 'Muerte/Sacrificio'].includes(newEvent.type) && (
                                <div className="bg-red-50 border border-red-100 rounded-lg p-3 space-y-3">
                                    <h4 className="font-bold text-red-800 text-xs uppercase flex items-center gap-2">
                                        🥩 Datos Comerciales / Canal
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Importe Venta (€)</label>
                                            <input type="number" step="0.01" className="w-full border rounded px-2 py-1 text-sm field-focus"
                                                value={newEvent.price} onChange={e => setNewEvent({ ...newEvent, price: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Peso Vivo (kg)</label>
                                            <input type="number" step="0.1" className="w-full border rounded px-2 py-1 text-sm field-focus"
                                                value={newEvent.weightLive} onChange={e => setNewEvent({ ...newEvent, weightLive: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Peso Canal (kg)</label>
                                            <input type="number" step="0.1" className="w-full border rounded px-2 py-1 text-sm field-focus"
                                                value={newEvent.weightCarcass} onChange={e => {
                                                    const wc = Number(e.target.value);
                                                    const wl = Number(newEvent.weightLive);
                                                    const y = wl > 0 ? ((wc / wl) * 100).toFixed(1) : '';
                                                    setNewEvent({ ...newEvent, weightCarcass: e.target.value, yield: y });
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rendimiento (%)</label>
                                            <input type="number" step="0.1" className="w-full border rounded px-2 py-1 text-sm field-focus bg-gray-100"
                                                value={newEvent.yield} readOnly
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Conf. (SEUROP)</label>
                                            <select className="w-full border rounded px-2 py-1 text-sm field-focus"
                                                value={newEvent.seuropConf} onChange={e => setNewEvent({ ...newEvent, seuropConf: e.target.value })}
                                            >
                                                <option value="">-</option>
                                                {['S', 'E', 'U', 'R', 'O', 'P'].map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Grasa (1-5)</label>
                                            <select className="w-full border rounded px-2 py-1 text-sm field-focus"
                                                value={newEvent.fatCover} onChange={e => setNewEvent({ ...newEvent, fatCover: e.target.value })}
                                            >
                                                <option value="">-</option>
                                                {['1', '2', '3', '4', '5'].map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descripción / Notas</label>
                                <textarea
                                    value={newEvent.notes}
                                    onChange={e => setNewEvent({ ...newEvent, notes: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2 text-sm h-24 resize-none focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="Detalles del evento..."
                                ></textarea>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Coste (€) - Opcional</label>
                                <input
                                    type="number"
                                    value={newEvent.cost}
                                    onChange={e => setNewEvent({ ...newEvent, cost: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2 text-sm"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
                            <button onClick={() => setShowModal(false)} className="text-gray-600 font-medium text-sm hover:text-gray-800">Cancelar</button>
                            <button onClick={handleCreateEvent} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg text-sm shadow-sm transition-transform active:scale-95">
                                Crear Evento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-600 font-medium text-sm">
                        <tr>
                            <th className="p-4">Fecha</th>
                            <th className="p-4">Tipo</th>
                            <th className="p-4">Animal / Finca</th>
                            <th className="p-4">Notas</th>
                            <th className="p-4 text-right">Costo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500">Cargando eventos...</td></tr>
                        ) : events.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500">No hay eventos recientes.</td></tr>
                        ) : (
                            events.map((e, i) => (
                                <tr key={i} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 text-gray-900 font-medium">{new Date(e.date).toLocaleDateString()}</td>
                                    <td className="p-4 text-gray-600">
                                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold
                                            ${e.type === 'Sanitario' ? 'bg-red-50 text-red-700' :
                                                e.type === 'Alimentación' ? 'bg-yellow-50 text-yellow-700' :
                                                    e.type === 'Mantenimiento' ? 'bg-blue-50 text-blue-700' :
                                                        'bg-green-50 text-green-700'}`}>
                                            {e.type}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-600 text-sm">
                                        {e.animalCrotal ? (
                                            <span className="font-mono bg-gray-100 px-1 rounded">{e.animalCrotal}</span>
                                        ) : '-'}
                                    </td>
                                    <td className="p-4 text-gray-600 text-sm max-w-xs truncate">{e.desc || e.notes || '-'}</td>
                                    <td className="p-4 text-gray-600 text-right font-medium">
                                        {e.cost > 0 ? Number(e.cost).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '-'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
