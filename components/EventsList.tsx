'use client';

import React, { useState, useEffect } from 'react';
import { useStorage } from '@/context/StorageContext';
import { EventManager } from '@/services/eventManager';

export function EventsList() {
    const { read, write } = useStorage();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = read<string>('sessionUser', '');
        if (user) {
            const all = read<any[]>('events', []);
            // Sort by date desc
            const sorted = [...all].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setEvents(sorted);
            setLoading(false);
        }
    }, [read]);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Eventos</h2>
                <p className="text-gray-600">Registro histórico de acciones y sucesos</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-600 font-medium text-sm">
                        <tr>
                            <th className="p-4">Fecha</th>
                            <th className="p-4">Tipo</th>
                            <th className="p-4">Animal / Finca</th>
                            <th className="p-4">Notas</th>
                            <th className="p-4">Costo</th>
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
                                        <span className="inline-block px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-bold">
                                            {e.type}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-600">{e.animalId || e.farmId || '-'}</td>
                                    <td className="p-4 text-gray-600 text-sm max-w-xs truncate">{e.notes || '-'}</td>
                                    <td className="p-4 text-gray-600 text-right">{e.cost ? e.cost + ' €' : '-'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
