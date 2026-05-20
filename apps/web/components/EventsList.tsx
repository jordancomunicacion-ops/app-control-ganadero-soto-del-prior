'use client';

import React, { useState, useEffect } from 'react';
import { useStorage } from '@/context/StorageContext';
import { createEvent, getEvents } from '@/app/lib/event-actions';
import { getFarms } from '@/app/lib/farm-actions';
import { getAnimals } from '@/app/lib/animal-actions';
import { glossary } from '@/lib/glossary';
import type { AnimalLike, FarmLike, LivestockEvent } from '@/types/livestock';
import { useUi } from '@/components/Toast';
import { Plus, Calendar, PlusCircle } from 'lucide-react';

// Mapeo de tipo de evento (visible en el dropdown) → clave del glosario.
const EVENT_TYPE_GLOSSARY: Record<string, string> = {
    'Saneamiento': 'event_saneamiento',
    'Pesaje': 'event_pesaje',
    'Inseminación': 'event_inseminacion',
    'Parto': 'event_parto',
    'Diagnóstico Gestación': 'event_diagnostico',
};

// Eventos creables desde EventsList. Los tipos REPRODUCTIVOS y SANITARIOS
// se gestionan exclusivamente desde sus módulos dedicados (Reproducción y
// Sanidad) para evitar duplicidad de datos y para activar la lógica
// específica de cada uno (programación en cascada, retirada automática,
// kardex…). EventsList queda como timeline histórico + altas para los
// movimientos genéricos y la productividad básica.
const EVENT_TYPES = {
    'Productivo': ['Pesaje', 'Condición Corporal'],
    'Movimientos': ['Cambio de Corral', 'Entrada', 'Salida', 'Venta', 'Muerte/Sacrificio'],
    'Otros': ['Observación', 'Manejo'],
};

export function EventsList({ userId }: { userId?: string }) {
    const { read, write } = useStorage();
    const ui = useUi();
    const [events, setEvents] = useState<LivestockEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalEvents, setTotalEvents] = useState(0);
    const PAGE_SIZE = 100;

    const [showModal, setShowModal] = useState(false);
    const [newEvent, setNewEvent] = useState({
        category: 'Productivo',
        type: 'Pesaje',
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
    const [farms, setFarms] = useState<FarmLike[]>([]);
    const [animals, setAnimals] = useState<AnimalLike[]>([]);
    const [sessionUser, setSessionUser] = useState('');


    // Initial fetch on mount / page change. setState inside an effect is the
    // standard React pattern for data-fetching when not using SWR / TanStack Query.
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        let cancelled = false;
        const user = read<string>('sessionUser', '');
        setSessionUser(user);
        if (user) {
            getEvents(user, { page, pageSize: PAGE_SIZE }).then(({ data: dbEvents, total }) => {
                if (cancelled) return;
                setEvents(dbEvents as unknown as LivestockEvent[]);
                setTotalEvents(total);
                setLoading(false);
            }).catch(() => { if (!cancelled) setLoading(false); });

            getFarms(user).then(({ data: dbFarms }) => {
                if (!cancelled) setFarms(dbFarms as unknown as FarmLike[]);
            }).catch(() => { /* noop */ });

            getAnimals(user).then(({ data: dbAnimals }) => {
                if (cancelled) return;
                const animalsAsLike = dbAnimals as unknown as AnimalLike[];
                setAnimals(animalsAsLike);
                // Las alertas de ciclo de vida (destete, castración) viven
                // ahora en la pestaña Alertas — AlertEngine las evalúa con
                // reglas configurables (`destete_proximo`, `castracion_decision`).
            }).catch(() => { /* noop */ });
        }

        return () => { cancelled = true; };
    }, [read, userId, page]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const handleCreateEvent = async () => {
        if (!newEvent.notes && !newEvent.type) {
            ui.warning("Añade al menos una nota o tipo");
            return;
        }

        const context = {
            animals: read<AnimalLike[]>(`animals_${sessionUser}`, []),
            events: read<LivestockEvent[]>('events', []),
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
            const farmName = farms.find(f => f.id === newEvent.relatedId)?.name || 'Finca';
            eventData.animal = { id: newEvent.relatedId, crotal: farmName, farmId: newEvent.relatedId };
        }

        // --- HYBRID INTERCEPTION ---
        // Instead of calling EventManager.handleStandardEvent directly (which writes to LocalStorage),
        // we will manually construct the DB payload and call Server Action.
        // NOTE: EventManager logic for specific business rules (like updating Animal status) is SKIPPED here for simplicity in this migration step,
        // unless we refactor EventManager to return the changes instead of writing them.
        // For now, we assume simple event logging.
        // TODO: Move Business Logic (Status updates, etc) to Server Actions or refactor EventManager.

        const payload = {
            type: finalType,
            date: newEvent.formattedDate,
            desc: (newEvent.corral ? `[Corral ${newEvent.corral}] ` : '') + newEvent.notes,
            cost: newEvent.cost,
            status: 'completed',
            typeData: {
                price: newEvent.price,
                liveWeight: newEvent.weightLive,
                carcassWeight: newEvent.weightCarcass,
                yield: newEvent.yield,
                seuropConf: newEvent.seuropConf,
                fatCover: newEvent.fatCover
            },
            // Relations
            farmId: newEvent.relatedType === 'farm' ? newEvent.relatedId :
                newEvent.relatedType === 'animal' ? animals.find(a => a.id === newEvent.relatedId)?.farmId :
                    farms[0]?.id, // Default to first farm if general? Or error.
            animalId: newEvent.relatedType === 'animal' ? newEvent.relatedId : undefined
        };

        if (!payload.farmId) {
            ui.error("No se pudo determinar la finca para este evento.");
            return;
        }

        try {
            const created = await createEvent(payload);
            setEvents([created as unknown as LivestockEvent, ...events]);
            setShowModal(false);
            ui.success("Evento registrado");

            // Reset form
            setNewEvent({
                category: 'Productivo',
                type: 'Pesaje',
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
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            ui.error("Error guardando evento: " + msg);
        }
    };

    return (
        <div className="space-y-6">
            {/* El panel de "Alertas del ciclo de vida" se ha unificado con
                el motor general de alertas (pestaña Alertas). Las reglas
                `destete_proximo` y `castracion_decision` cubren los avisos
                de edad que antes estaban duplicados aquí. */}

            <div className="flex justify-between items-center">

                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Eventos</h2>
                    <p className="text-gray-600">Registro histórico de acciones y sucesos</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Nuevo evento
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
                            <div className="bg-sky-50 border border-sky-100 rounded-lg p-3 text-xs text-sky-800">
                                <p className="font-bold mb-1">¿Es un evento reproductivo o sanitario?</p>
                                <p>
                                    Las <strong>inseminaciones, partos, diagnósticos y abortos</strong> se registran
                                    desde la pestaña <strong>Reproducción</strong> — al crearlos allí, los hitos
                                    futuros (diagnóstico a +45 días, parto previsto a +283, destete a +210) se
                                    programan en cascada automáticamente.
                                </p>
                                <p className="mt-1">
                                    Los <strong>tratamientos, vacunas y saneamientos</strong> se registran desde
                                    la pestaña <strong>Sanidad</strong> — así se calcula la retirada de carne
                                    automáticamente y alimenta el kardex y el libro de costes.
                                </p>
                            </div>
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
                                {EVENT_TYPE_GLOSSARY[newEvent.type] && (
                                    <p className="text-[11px] italic text-gray-400 mt-1 leading-snug">
                                        {glossary(EVENT_TYPE_GLOSSARY[newEvent.type])?.plain}
                                    </p>
                                )}
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
                                                {Array.from({ length: Number(farms.find(f => f.id === newEvent.relatedId)?.corrals ?? 0) }, (_, i) => i + 1).map(n => (
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

            {/* Empty state */}
            {!loading && events.length === 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-10 text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-50 text-green-600 mb-3">
                        <Calendar className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Aún no hay eventos registrados</h3>
                    <p className="text-sm text-gray-600 max-w-md mx-auto mb-5">
                        Registra saneamientos, pesajes, partos, inseminaciones y movimientos para construir el historial sanitario y reproductivo.
                    </p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-5 rounded-lg shadow-sm transition-colors"
                    >
                        <PlusCircle className="w-4 h-4" /> Registrar primer evento
                    </button>
                </div>
            )}

            {!(!loading && events.length === 0) && (
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
                                        {(e.cost ?? 0) > 0 ? Number(e.cost).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '-'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            )}

            {/* Pagination */}
            {totalEvents > PAGE_SIZE && (
                <div className="flex items-center justify-between px-2">
                    <p className="text-sm text-gray-500">
                        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalEvents)} de {totalEvents} eventos
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1.5 text-sm font-medium border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                        >
                            ← Anterior
                        </button>
                        <span className="text-sm text-gray-600 font-medium">
                            Pág. {page} / {Math.ceil(totalEvents / PAGE_SIZE)}
                        </span>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={page * PAGE_SIZE >= totalEvents}
                            className="px-3 py-1.5 text-sm font-medium border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                        >
                            Siguiente →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
