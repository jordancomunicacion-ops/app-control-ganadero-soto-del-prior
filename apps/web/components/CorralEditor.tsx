'use client';

import React, { useState, useEffect } from 'react';
import { getCorrals, createCorral, updateCorral, deleteCorral } from '@/app/lib/corral-actions';
import { getCropPlots } from '@/app/lib/crop-actions';
import { Trash2, Plus, Save, Wheat, Beef, Droplet, TreePine, Warehouse, Ruler } from 'lucide-react';
import { TechValue } from './InfoTip';
import { useUi } from './Toast';

// =============================================================================
// CORRAL EDITOR
// =============================================================================
//
// CRUD de corrales asociados a una finca. Se muestra solo cuando la finca
// ya tiene ID (modo edición); en modo "creando finca nueva" se ofrece un
// stub local que se persistirá al guardar la finca.

type Corral = Awaited<ReturnType<typeof getCorrals>>[number];
type PlotLite = Awaited<ReturnType<typeof getCropPlots>>[number];

const CORRAL_KIND_OPTIONS: Array<{ value: string; label: string; explain: string }> = [
    { value: 'pasto', label: 'Pasto natural', explain: 'Paddock con pasto natural o sembrado para pastoreo directo.' },
    { value: 'pasto_mejorado', label: 'Pradera mejorada', explain: 'Pradera resembrada (alfalfa, ray-grass, festuca). Mayor producción.' },
    { value: 'cementado_silo', label: 'Cementado con silo', explain: 'Patio cementado con silo y comedero. Típico de cebadero intensivo.' },
    { value: 'cubierto', label: 'Nave cubierta', explain: 'Nave con techo — invernada, parto, terneros lactantes.' },
    { value: 'cebadero', label: 'Cebadero al aire', explain: 'Corral exterior para cebo intensivo, sin techo pero con comedero.' },
    { value: 'paritorio', label: 'Paritorio', explain: 'Corral pequeño separado para vacas a punto de parir.' },
    { value: 'enfermeria', label: 'Enfermería', explain: 'Aislamiento sanitario — vacas enfermas o en cuarentena.' },
    { value: 'manejo', label: 'Manga de manejo', explain: 'Manga estrecha + embarcadero para vacunaciones, pesajes y carga.' },
];

function emptyCorral(farmId: string): Partial<Corral> & { farmId: string } {
    return { farmId, name: '', kind: 'pasto', hasWater: true, hasShade: false, hasFeeder: false, hasSilo: false };
}

export function CorralEditor({ farmId }: { farmId: string }) {
    const ui = useUi();
    const [corrals, setCorrals] = useState<Corral[]>([]);
    const [plots, setPlots] = useState<PlotLite[]>([]);
    const [draft, setDraft] = useState<Partial<Corral> | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        Promise.all([getCorrals(farmId), getCropPlots(farmId)])
            .then(([rows, plotRows]) => {
                if (cancelled) return;
                setCorrals(rows);
                setPlots(plotRows);
                setLoading(false);
            })
            .catch(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [farmId]);

    const handleSave = async () => {
        if (!draft?.name || !draft.kind) {
            ui.warning('El corral necesita al menos un nombre y un tipo');
            return;
        }
        try {
            if (editingId) {
                const updated = await updateCorral(editingId, draft);
                setCorrals(corrals.map((c) => c.id === editingId ? updated : c));
            } else {
                const created = await createCorral({ ...draft, farmId });
                setCorrals([...corrals, created]);
            }
            setDraft(null);
            setEditingId(null);
            ui.success('Corral guardado');
        } catch (e) {
            ui.error('Error guardando corral: ' + (e instanceof Error ? e.message : String(e)));
        }
    };

    const handleDelete = async (id: string) => {
        const ok = await ui.confirm({
            title: 'Eliminar corral',
            message: '¿Eliminar este corral?',
            tone: 'danger',
            confirmLabel: 'Eliminar',
        });
        if (!ok) return;
        try {
            await deleteCorral(id);
            setCorrals(corrals.filter((c) => c.id !== id));
            ui.success('Corral eliminado');
        } catch (e) {
            ui.error('Error eliminando: ' + (e instanceof Error ? e.message : String(e)));
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h4 className="font-bold text-gray-800">Corrales y recintos</h4>
                    <p className="text-xs italic text-gray-400 max-w-md">
                        Donde <strong>está el ganado</strong> físicamente — cercados de pastoreo, cebaderos, naves, paritorios, mangas. Si un cercado tiene una pradera sembrada, vincúlalo a la parcela de cultivo que la describe.
                    </p>
                </div>
                <button
                    onClick={() => { setDraft(emptyCorral(farmId)); setEditingId(null); }}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
                >
                    <Plus className="w-3 h-3" /> Añadir
                </button>
            </div>

            {loading && <p className="text-xs text-gray-500">Cargando…</p>}

            {corrals.length === 0 && !loading && !draft && (
                <p className="text-xs italic text-gray-400 py-2">Aún no hay corrales registrados.</p>
            )}

            {corrals.length > 0 && (
                <div className="space-y-2 mb-3">
                    {corrals.map((c) => {
                        const kindMeta = CORRAL_KIND_OPTIONS.find((o) => o.value === c.kind);
                        return (
                            <div key={c.id} className="bg-gray-50 border border-gray-100 rounded-lg p-3 flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-gray-900">{c.name}</p>
                                    <p className="text-xs text-gray-600">{kindMeta?.label || c.kind}</p>
                                    <p className="text-[11px] italic text-gray-400 mt-0.5">{kindMeta?.explain}</p>
                                    {c.linkedPlot && (
                                        <p className="text-[11px] text-green-700 mt-1 inline-flex items-center gap-1">
                                            <Wheat className="w-3 h-3" /> Pradera vinculada: <strong>{c.linkedPlot.name}</strong> ({c.linkedPlot.surfaceHa} ha)
                                        </p>
                                    )}
                                    <div className="flex flex-wrap gap-2 mt-1 text-[10px] text-gray-500">
                                        {c.surfaceM2 ? <span className="inline-flex items-center gap-1"><Ruler className="w-3 h-3" /> {c.surfaceM2.toLocaleString()} m²</span> : null}
                                        {c.capacityLU ? <span className="inline-flex items-center gap-1"><Beef className="w-3 h-3" /> {c.capacityLU} LU</span> : null}
                                        {c.hasWater ? <span title="Agua"><Droplet className="w-3 h-3 text-sky-500" /></span> : null}
                                        {c.hasShade ? <span title="Sombra"><TreePine className="w-3 h-3 text-emerald-600" /></span> : null}
                                        {c.hasFeeder ? <span title="Comedero"><Wheat className="w-3 h-3 text-amber-600" /></span> : null}
                                        {c.hasSilo ? <span className="inline-flex items-center gap-1"><Warehouse className="w-3 h-3" /> silo</span> : null}
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => { setDraft({ ...c }); setEditingId(c.id); }}
                                        className="text-xs text-green-700 hover:text-green-900 underline"
                                    >
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => handleDelete(c.id)}
                                        className="text-red-600 hover:text-red-800"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {draft && (
                <div className="border border-green-200 bg-green-50/50 rounded-lg p-3 space-y-2">
                    <p className="font-bold text-xs text-green-700">{editingId ? 'Editar corral' : 'Nuevo corral'}</p>
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="text"
                            placeholder="Nombre (ej. Corral Norte)"
                            value={draft.name ?? ''}
                            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                            className="text-sm border rounded-lg px-2 py-1.5"
                        />
                        <select
                            value={draft.kind ?? 'pasto'}
                            onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
                            className="text-sm border rounded-lg px-2 py-1.5 bg-white"
                        >
                            {CORRAL_KIND_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                        <input
                            type="number" min="0" step="100"
                            placeholder="Superficie m²"
                            value={draft.surfaceM2 ?? ''}
                            onChange={(e) => setDraft({ ...draft, surfaceM2: parseFloat(e.target.value) || undefined })}
                            className="text-sm border rounded-lg px-2 py-1.5"
                        />
                        <input
                            type="number" min="0" step="1"
                            placeholder="Capacidad LU"
                            value={draft.capacityLU ?? ''}
                            onChange={(e) => setDraft({ ...draft, capacityLU: parseFloat(e.target.value) || undefined })}
                            className="text-sm border rounded-lg px-2 py-1.5"
                        />
                    </div>
                    {draft.kind === 'pasto_mejorado' && (
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold uppercase text-gray-500 tracking-wide">
                                Pradera vinculada (parcela de cultivo)
                            </label>
                            {plots.length === 0 ? (
                                <p className="text-[11px] italic text-gray-400 bg-gray-50 border border-gray-100 rounded px-2 py-1.5">
                                    Aún no hay parcelas de cultivo. Crea primero la pradera en «Parcelas de cultivo» y vuelve aquí para vincularla.
                                </p>
                            ) : (
                                <select
                                    value={draft.linkedPlotId ?? ''}
                                    onChange={(e) => setDraft({ ...draft, linkedPlotId: e.target.value || null })}
                                    className="text-sm border rounded-lg px-2 py-1.5 w-full bg-white"
                                >
                                    <option value="">Sin vincular (todavía)</option>
                                    {plots.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} · {p.surfaceHa} ha
                                            {p.rotations?.[0]?.cropName ? ` · ${p.rotations[0].cropName}` : ''}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <p className="text-[11px] italic text-gray-400 leading-snug">
                                El corral es donde pace el ganado; la parcela define qué se ha sembrado (alfalfa, ryegrass…) y su rotación. Vincúlalos para que coincidan.
                            </p>
                        </div>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs">
                        <label className="flex items-center gap-1.5">
                            <input type="checkbox" checked={!!draft.hasWater} onChange={(e) => setDraft({ ...draft, hasWater: e.target.checked })} />
                            <Droplet className="w-3.5 h-3.5 text-sky-500" /> Agua
                        </label>
                        <label className="flex items-center gap-1.5">
                            <input type="checkbox" checked={!!draft.hasShade} onChange={(e) => setDraft({ ...draft, hasShade: e.target.checked })} />
                            <TreePine className="w-3.5 h-3.5 text-emerald-600" /> Sombra
                        </label>
                        <label className="flex items-center gap-1.5">
                            <input type="checkbox" checked={!!draft.hasFeeder} onChange={(e) => setDraft({ ...draft, hasFeeder: e.target.checked })} />
                            <Wheat className="w-3.5 h-3.5 text-amber-600" /> Comedero
                        </label>
                        <label className="flex items-center gap-1.5">
                            <input type="checkbox" checked={!!draft.hasSilo} onChange={(e) => setDraft({ ...draft, hasSilo: e.target.checked })} />
                            <Warehouse className="w-3.5 h-3.5 text-gray-600" /> Silo
                        </label>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            onClick={() => { setDraft(null); setEditingId(null); }}
                            className="text-xs text-gray-500 hover:text-gray-800"
                        >Cancelar</button>
                        <button
                            onClick={handleSave}
                            className="text-xs bg-green-600 hover:bg-green-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
                        >
                            <Save className="w-3 h-3" /> Guardar
                        </button>
                    </div>
                </div>
            )}

            {corrals.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                    <TechValue
                        label="Capacidad total"
                        value={`${corrals.reduce((s, c) => s + (c.capacityLU ?? 0), 0)} LU`}
                        explain="Suma de las capacidades declaradas en todos los corrales. Compárala con tu inventario actual."
                    />
                </div>
            )}
        </div>
    );
}
