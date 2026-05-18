'use client';

import React, { useState, useEffect } from 'react';
import {
    getCropPlots, createCropPlot, updateCropPlot, deleteCropPlot,
    createRotation, deleteRotation,
} from '@/app/lib/crop-actions';
import { Trash2, Plus, Save } from 'lucide-react';
import { CROP_CATALOG, calendarForMonth, MONTH_NAMES_ES } from '@/services/cropCalendar';
import { suggestNextCrop } from '@/services/rotationEngine';
import { SoilEngine } from '@/services/soilEngine';
import { searchParcel } from '@/app/lib/sigpac-actions';
import { useUi } from '@/components/Toast';

// =============================================================================
// CROP PLOT EDITOR
// =============================================================================
//
// Lista parcelas de cultivo + permite añadir/editar/borrar.
// Para cada parcela muestra:
//   - Datos básicos (nombre, ha, suelo, riego, SIGPAC, PAC use code)
//   - Historial de rotaciones
//   - Sugerencia de siguiente cultivo (rotationEngine)
//   - Calendario del mes actual para esa parcela

type Plot = Awaited<ReturnType<typeof getCropPlots>>[number];

function emptyPlot(farmId: string): Partial<Plot> & { farmId: string } {
    return { farmId, name: '', surfaceHa: 0, irrigated: false, pacRegime: 'secano' };
}

const PAC_USE_OPTIONS = [
    { value: 'TA', label: 'TA · Tierras arables' },
    { value: 'PR', label: 'PR · Pasto arbolado (dehesa)' },
    { value: 'PA', label: 'PA · Pasto arbustivo' },
    { value: 'PS', label: 'PS · Pradera permanente' },
    { value: 'FO', label: 'FO · Forestal' },
    { value: 'VI', label: 'VI · Viñedo' },
    { value: 'OV', label: 'OV · Olivar' },
    { value: 'FY', label: 'FY · Frutos secos' },
    { value: 'OF', label: 'OF · Otras' },
];

export function CropPlotEditor({
    farmId, farmSoilId, farmProvinciaCode, farmMunicipioCode,
}: {
    farmId: string;
    farmSoilId?: string;
    farmProvinciaCode?: string;
    farmMunicipioCode?: string;
}) {
    const ui = useUi();
    const [loadingSigpac, setLoadingSigpac] = useState(false);
    const [plots, setPlots] = useState<Plot[]>([]);
    const [draftPlot, setDraftPlot] = useState<Partial<Plot> | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [showRotationFor, setShowRotationFor] = useState<string | null>(null);
    const [draftRotation, setDraftRotation] = useState<{ cropName: string; cropFamily?: string; sowDate: string; expectedYieldT?: number; destinationFor?: string } | null>(null);

    useEffect(() => {
        let cancelled = false;
        getCropPlots(farmId).then((rows) => {
            if (cancelled) return;
            setPlots(rows);
            setLoading(false);
        }).catch(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [farmId]);

    const currentMonth = new Date().getMonth();
    const monthName = MONTH_NAMES_ES[currentMonth];

    const handleSigpacLookup = async () => {
        if (!draftPlot?.sigpacPoligono || !draftPlot?.sigpacParcela) {
            ui.warning('Indica polígono y parcela SIGPAC');
            return;
        }
        if (!farmProvinciaCode || !farmMunicipioCode) {
            ui.warning('La finca aún no tiene provincia/municipio definidos. Guarda la finca primero.');
            return;
        }
        setLoadingSigpac(true);
        try {
            const result = await searchParcel(
                parseInt(farmProvinciaCode),
                parseInt(farmMunicipioCode),
                parseInt(draftPlot.sigpacPoligono),
                parseInt(draftPlot.sigpacParcela),
            );
            if (result.success && result.data) {
                setDraftPlot({
                    ...draftPlot,
                    surfaceHa: parseFloat(result.data.area_ha.toFixed(2)),
                    pacUseCode: result.data.use,
                });
                ui.success(`Parcela localizada: ${result.data.area_ha.toFixed(2)} ha`);
            } else {
                ui.error(result.error ?? 'Parcela no encontrada en SIGPAC');
            }
        } catch (e) {
            ui.error('Error consultando SIGPAC: ' + (e instanceof Error ? e.message : String(e)));
        } finally {
            setLoadingSigpac(false);
        }
    };

    const handleSavePlot = async () => {
        if (!draftPlot?.name) {
            ui.warning('La parcela necesita un nombre');
            return;
        }
        try {
            if (editingId) {
                const updated = await updateCropPlot(editingId, draftPlot);
                setPlots(plots.map((p) => p.id === editingId ? { ...p, ...updated, rotations: p.rotations ?? [] } : p));
            } else {
                const created = await createCropPlot({ ...draftPlot, farmId, soilId: draftPlot.soilId ?? farmSoilId });
                setPlots([...plots, { ...created, rotations: [] } as Plot]);
            }
            setDraftPlot(null);
            setEditingId(null);
            ui.success('Parcela guardada');
        } catch (e) {
            ui.error('Error guardando parcela: ' + (e instanceof Error ? e.message : String(e)));
        }
    };

    const handleDeletePlot = async (id: string) => {
        const ok = await ui.confirm({
            title: 'Eliminar parcela',
            message: '¿Eliminar esta parcela y todo su historial de cultivos? Esta acción no se puede deshacer.',
            tone: 'danger',
            confirmLabel: 'Eliminar',
        });
        if (!ok) return;
        try {
            await deleteCropPlot(id);
            setPlots(plots.filter((p) => p.id !== id));
            ui.success('Parcela eliminada');
        } catch (e) {
            ui.error('Error eliminando: ' + (e instanceof Error ? e.message : String(e)));
        }
    };

    const handleSaveRotation = async (plotId: string) => {
        if (!draftRotation?.cropName || !draftRotation.sowDate) {
            ui.warning('Indica el cultivo y la fecha de siembra');
            return;
        }
        try {
            const created = await createRotation({
                plotId,
                cropName: draftRotation.cropName,
                cropFamily: draftRotation.cropFamily,
                sowDate: draftRotation.sowDate,
                expectedYieldT: draftRotation.expectedYieldT,
                destinationFor: draftRotation.destinationFor ?? 'pastoreo_directo',
            });
            setPlots(plots.map((p) => p.id === plotId
                ? { ...p, rotations: [created, ...(p.rotations ?? [])] }
                : p,
            ));
            setDraftRotation(null);
            ui.success('Cultivo añadido al historial');
        } catch (e) {
            ui.error('Error guardando cultivo: ' + (e instanceof Error ? e.message : String(e)));
        }
    };

    const handleDeleteRotation = async (rotationId: string, plotId: string) => {
        const ok = await ui.confirm({
            title: 'Eliminar cultivo',
            message: '¿Eliminar este cultivo del historial?',
            tone: 'danger',
            confirmLabel: 'Eliminar',
        });
        if (!ok) return;
        try {
            await deleteRotation(rotationId);
            setPlots(plots.map((p) => p.id === plotId
                ? { ...p, rotations: (p.rotations ?? []).filter((r) => r.id !== rotationId) }
                : p,
            ));
        } catch (e) {
            ui.error('Error eliminando: ' + (e instanceof Error ? e.message : String(e)));
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h4 className="font-bold text-gray-800">Parcelas de cultivo</h4>
                    <p className="text-xs italic text-gray-400 max-w-md">
                        Donde <strong>crece la comida</strong> (a diferencia de los corrales, que es donde está el ganado).
                        Define cada parcela con su uso PAC, su rotación y el destino productivo de cada siembra (pastoreo directo, henificación, ensilado, grano, venta o mejora del suelo).
                    </p>
                </div>
                <button
                    onClick={() => { setDraftPlot(emptyPlot(farmId)); setEditingId(null); }}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
                >
                    <Plus className="w-3 h-3" /> Añadir parcela
                </button>
            </div>

            {loading && <p className="text-xs text-gray-500">Cargando…</p>}

            {plots.length === 0 && !loading && !draftPlot && (
                <p className="text-xs italic text-gray-400 py-2">Aún no hay parcelas declaradas.</p>
            )}

            <div className="space-y-4">
                {plots.map((p) => {
                    const lastRotation = (p.rotations ?? [])[0];
                    const lastCropDef = lastRotation
                        ? CROP_CATALOG.find((c) => c.name === lastRotation.cropName)
                        : undefined;
                    const suggestions = lastCropDef
                        ? suggestNextCrop(lastCropDef.id, {
                            soilPh: p.soilId ? SoilEngine.getSoilById(p.soilId)?.ph_typical : undefined,
                        })
                        : [];
                    const monthRecs = calendarForMonth(currentMonth, {
                        soilPh: p.soilId ? SoilEngine.getSoilById(p.soilId)?.ph_typical : undefined,
                    });
                    return (
                        <div key={p.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50/40">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="font-bold text-gray-900">{p.name} <span className="text-xs text-gray-500 font-normal">· {p.surfaceHa} ha</span></p>
                                    <p className="text-[11px] text-gray-500">
                                        {p.pacUseCode ? `PAC: ${p.pacUseCode}` : ''}
                                        {p.pacRegime ? ` · ${p.pacRegime}` : ''}
                                        {p.irrigated ? ` · regadío ${p.irrigationType ?? ''}` : ''}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setDraftPlot({ ...p }); setEditingId(p.id); }} className="text-xs text-green-700 underline">Editar</button>
                                    <button onClick={() => handleDeletePlot(p.id)} className="text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>

                            {/* Historial rotación */}
                            <div className="mt-2 border-t border-gray-100 pt-2">
                                <div className="flex justify-between items-center">
                                    <p className="text-[11px] font-bold uppercase text-gray-500 tracking-wide">Rotación</p>
                                    <button
                                        onClick={() => { setShowRotationFor(p.id); setDraftRotation({ cropName: '', sowDate: new Date().toISOString().split('T')[0] }); }}
                                        className="text-xs text-green-700 hover:text-green-900"
                                    >+ Cultivo</button>
                                </div>
                                {(p.rotations ?? []).length === 0 ? (
                                    <p className="text-[11px] italic text-gray-400 mt-1">Sin historial.</p>
                                ) : (
                                    <ul className="text-xs space-y-1 mt-1">
                                        {(p.rotations ?? []).slice(0, 4).map((r) => (
                                            <li key={r.id} className="flex justify-between items-center bg-white border border-gray-100 rounded px-2 py-1">
                                                <span>
                                                    <span className="font-bold">{r.cropName}</span>
                                                    {r.cropFamily ? <span className="text-gray-400"> · {r.cropFamily}</span> : null}
                                                    <span className="text-gray-500"> · {new Date(r.sowDate).getFullYear()}</span>
                                                </span>
                                                <button onClick={() => handleDeleteRotation(r.id, p.id)} className="text-red-500"><Trash2 className="w-3 h-3" /></button>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {/* Formulario añadir rotación */}
                                {showRotationFor === p.id && draftRotation && (
                                    <div className="mt-2 bg-green-50 border border-green-200 rounded p-2 space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <select
                                                value={draftRotation.cropName}
                                                onChange={(e) => {
                                                    const c = CROP_CATALOG.find((cr) => cr.name === e.target.value);
                                                    setDraftRotation({ ...draftRotation, cropName: e.target.value, cropFamily: c?.family });
                                                }}
                                                className="text-xs border rounded px-2 py-1 bg-white"
                                            >
                                                <option value="">Selecciona cultivo</option>
                                                {CROP_CATALOG.map((c) => (
                                                    <option key={c.id} value={c.name}>{c.name} ({c.family})</option>
                                                ))}
                                            </select>
                                            <input
                                                type="date"
                                                value={draftRotation.sowDate}
                                                onChange={(e) => setDraftRotation({ ...draftRotation, sowDate: e.target.value })}
                                                className="text-xs border rounded px-2 py-1"
                                            />
                                            <input
                                                type="number" step="0.1" min="0"
                                                placeholder="Cosecha prevista (t)"
                                                value={draftRotation.expectedYieldT ?? ''}
                                                onChange={(e) => setDraftRotation({ ...draftRotation, expectedYieldT: parseFloat(e.target.value) || undefined })}
                                                className="text-xs border rounded px-2 py-1"
                                            />
                                            <select
                                                value={draftRotation.destinationFor ?? 'pastoreo_directo'}
                                                onChange={(e) => setDraftRotation({ ...draftRotation, destinationFor: e.target.value })}
                                                className="text-xs border rounded px-2 py-1 bg-white"
                                            >
                                                <option value="pastoreo_directo">Pastoreo directo (el ganado come en la parcela)</option>
                                                <option value="henificacion">Henificación (siega y empacado)</option>
                                                <option value="ensilado">🪣 Ensilado (silo húmedo)</option>
                                                <option value="grano">🌽 Grano (cosecha y almacén)</option>
                                                <option value="venta">💶 Venta externa</option>
                                                <option value="mejora_suelo">Mejora del suelo (abono verde, sin cosechar)</option>
                                            </select>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => { setShowRotationFor(null); setDraftRotation(null); }} className="text-xs text-gray-500">Cancelar</button>
                                            <button onClick={() => handleSaveRotation(p.id)} className="text-xs bg-green-600 text-white font-bold px-2 py-1 rounded">Guardar</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Sugerencia siguiente cultivo */}
                            {suggestions.length > 0 && (
                                <div className="mt-2 bg-blue-50 border border-blue-100 rounded p-2 text-xs">
                                    <p className="font-bold text-blue-800 text-[11px] uppercase tracking-wide">Siguiente rotación recomendada</p>
                                    <ul className="list-disc list-inside text-blue-700 mt-1">
                                        {suggestions.slice(0, 2).map((s) => (
                                            <li key={s.cropId}>
                                                <span className="font-bold">{s.cropName}</span>
                                                <span className="italic text-blue-600"> — {s.rationale}</span>
                                                {s.pacComplianceP4 ? <span className="ml-1 text-[10px] bg-green-100 text-green-700 px-1 rounded">P4 PAC</span> : null}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Calendario mes actual */}
                            {monthRecs.length > 0 && (
                                <div className="mt-2 bg-amber-50 border border-amber-100 rounded p-2 text-xs">
                                    <p className="font-bold text-amber-800 text-[11px] uppercase tracking-wide">{monthName}: actividad recomendada</p>
                                    <ul className="text-amber-700 mt-1 space-y-0.5">
                                        {monthRecs.slice(0, 3).map((r) => (
                                            <li key={r.crop.id}>
                                                <span className="font-bold">{r.crop.name}</span>
                                                <span className="italic"> · {r.activity}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Formulario nuevo / editar parcela */}
            {draftPlot && (
                <div className="border border-green-200 bg-green-50/50 rounded-lg p-3 space-y-2 mt-3">
                    <p className="font-bold text-xs text-green-700">{editingId ? 'Editar parcela' : 'Nueva parcela de cultivo'}</p>
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="text" placeholder="Nombre"
                            value={draftPlot.name ?? ''}
                            onChange={(e) => setDraftPlot({ ...draftPlot, name: e.target.value })}
                            className="text-sm border rounded-lg px-2 py-1.5"
                        />
                        <input
                            type="number" step="0.1" min="0" placeholder="Hectáreas"
                            value={draftPlot.surfaceHa ?? ''}
                            onChange={(e) => setDraftPlot({ ...draftPlot, surfaceHa: parseFloat(e.target.value) || 0 })}
                            className="text-sm border rounded-lg px-2 py-1.5"
                        />
                        <select
                            value={draftPlot.pacUseCode ?? ''}
                            onChange={(e) => setDraftPlot({ ...draftPlot, pacUseCode: e.target.value || undefined })}
                            className="text-sm border rounded-lg px-2 py-1.5 bg-white"
                        >
                            <option value="">Uso PAC SIGPAC…</option>
                            {PAC_USE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <select
                            value={draftPlot.pacRegime ?? 'secano'}
                            onChange={(e) => setDraftPlot({ ...draftPlot, pacRegime: e.target.value as 'secano' | 'regadio' })}
                            className="text-sm border rounded-lg px-2 py-1.5 bg-white"
                        >
                            <option value="secano">Secano</option>
                            <option value="regadio">Regadío</option>
                        </select>
                        <input
                            type="text" placeholder="Polígono SIGPAC"
                            value={draftPlot.sigpacPoligono ?? ''}
                            onChange={(e) => setDraftPlot({ ...draftPlot, sigpacPoligono: e.target.value })}
                            className="text-sm border rounded-lg px-2 py-1.5"
                        />
                        <input
                            type="text" placeholder="Parcela SIGPAC"
                            value={draftPlot.sigpacParcela ?? ''}
                            onChange={(e) => setDraftPlot({ ...draftPlot, sigpacParcela: e.target.value })}
                            className="text-sm border rounded-lg px-2 py-1.5"
                        />
                    </div>
                    {(draftPlot.sigpacPoligono || draftPlot.sigpacParcela) && (
                        <button
                            onClick={handleSigpacLookup}
                            disabled={loadingSigpac}
                            className="text-xs bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-50 font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1"
                        >
                            {loadingSigpac ? '⏳ Consultando…' : '🛰 Consultar SIGPAC (rellena ha + uso)'}
                        </button>
                    )}
                    <label className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={!!draftPlot.irrigated} onChange={(e) => setDraftPlot({ ...draftPlot, irrigated: e.target.checked })} />
                        Parcela con riego
                    </label>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => { setDraftPlot(null); setEditingId(null); }} className="text-xs text-gray-500">Cancelar</button>
                        <button onClick={handleSavePlot} className="text-xs bg-green-600 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
                            <Save className="w-3 h-3" /> Guardar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
