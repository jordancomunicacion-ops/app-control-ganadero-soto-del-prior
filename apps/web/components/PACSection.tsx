'use client';

import React, { useEffect, useState } from 'react';
import { getPACDeclarations, upsertPACDeclaration, estimatePACPayment, getFarmAggregatesForPAC } from '@/app/lib/pac-actions';
import { Wand2 } from 'lucide-react';
import { Save } from 'lucide-react';
import { TechValue } from './InfoTip';
import { useUi } from './Toast';

type PAC = Awaited<ReturnType<typeof getPACDeclarations>>[number];

const ECO_REGIMES: Array<{ code: string; label: string; explain: string }> = [
    { code: 'P1', label: 'P1 · Pastoreo extensivo', explain: 'Vacuno/ovino sobre pastos con carga reducida — ideal dehesa.' },
    { code: 'P2', label: 'P2 · Siega sostenible', explain: 'Praderas segadas con fecha respetando flora y fauna.' },
    { code: 'P3', label: 'P3 · Pastos húmedos', explain: 'Aprovechamiento extensivo de pastos en zonas encharcables.' },
    { code: 'P4', label: 'P4 · Rotación mejorantes', explain: 'Rotación con leguminosas o cultivos fijadores de N.' },
    { code: 'P5', label: 'P5 · Siembra directa', explain: 'No laboreo del suelo — conservación + carbono.' },
    { code: 'P6', label: 'P6 · Biodiversidad cultivo', explain: 'Bandas / islas de biodiversidad dentro del cultivo.' },
    { code: 'P7', label: 'P7 · Paisaje', explain: 'Mantenimiento de elementos del paisaje (setos, muros).' },
    { code: 'P8', label: 'P8 · Cubiertas en leñoso', explain: 'Cubierta vegetal viva en olivar / viñedo / frutal.' },
    { code: 'P9', label: 'P9 · Cubiertas inertes', explain: 'Cubierta inerte (paja, restos) en cultivo leñoso.' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

export function PACSection({ farmId }: { farmId: string }) {
    const ui = useUi();
    const [declarations, setDeclarations] = useState<PAC[]>([]);
    const [activeYear, setActiveYear] = useState(CURRENT_YEAR);
    const [draft, setDraft] = useState<Partial<PAC> | null>(null);
    const [estimate, setEstimate] = useState<Awaited<ReturnType<typeof estimatePACPayment>> | null>(null);
    const [numCows, setNumCows] = useState<number | ''>('');
    const [numCalves, setNumCalves] = useState<number | ''>('');

    useEffect(() => {
        let cancelled = false;
        getPACDeclarations(farmId).then((rows) => {
            if (cancelled) return;
            setDeclarations(rows);
        }).catch(() => { /* noop */ });
        return () => { cancelled = true; };
    }, [farmId]);

    // Sincroniza el borrador con la declaración existente del año activo —
    // patrón "comparar contra previo durante render" recomendado por React 19
    // para evitar setState en useEffect cuando solo se deriva estado.
    const [draftYear, setDraftYear] = useState<number | null>(null);
    if (draftYear !== activeYear) {
        const existing = declarations.find((d) => d.campaignYear === activeYear);
        if (existing) {
            setDraft({ ...existing });
        } else {
            setDraft({
                farmId, campaignYear: activeYear, status: 'borrador',
                ecoSchemes: [], basePayment: false, redistributive: false,
                youngFarmer: false, organicScheme: false, coupledLivestock: false,
            } as Partial<PAC>);
        }
        setDraftYear(activeYear);
    }

    const toggleEco = (code: string) => {
        const current = draft?.ecoSchemes ?? [];
        const next = current.includes(code) ? current.filter((c) => c !== code) : [...current, code];
        setDraft({ ...(draft ?? {}), ecoSchemes: next });
    };

    const handleAutofill = async () => {
        try {
            const agg = await getFarmAggregatesForPAC(farmId);
            setDraft({
                ...(draft ?? {}),
                totalEligibleHa: agg.totalEligibleHa,
                totalLU: agg.totalLU,
            });
            setNumCows(agg.numNurseCows);
            setNumCalves(agg.numFatteningCalves);
        } catch (e) {
            ui.error('No se pudo precargar: ' + (e instanceof Error ? e.message : String(e)));
        }
    };

    const handleEstimate = async () => {
        if (!draft) return;
        try {
            const result = await estimatePACPayment({
                eligibleHa: draft.totalEligibleHa ?? 0,
                basePayment: draft.basePayment ?? false,
                redistributive: draft.redistributive ?? false,
                youngFarmer: draft.youngFarmer ?? false,
                organicScheme: draft.organicScheme ?? false,
                coupledLivestock: draft.coupledLivestock ?? false,
                ecoSchemes: draft.ecoSchemes ?? [],
                numNurseCows: typeof numCows === 'number' ? numCows : 0,
                numFatteningCalves: typeof numCalves === 'number' ? numCalves : 0,
            });
            setEstimate(result);
            setDraft({ ...draft, estimatedPayment: result.total });
        } catch (e) {
            ui.error('Error estimando ayudas: ' + (e instanceof Error ? e.message : String(e)));
        }
    };

    const handleSave = async () => {
        if (!draft) return;
        try {
            const saved = await upsertPACDeclaration({ ...draft, farmId, campaignYear: activeYear });
            setDeclarations([...declarations.filter((d) => d.campaignYear !== activeYear), saved]);
            ui.success('Declaración PAC guardada');
        } catch (e) {
            ui.error('Error guardando: ' + (e instanceof Error ? e.message : String(e)));
        }
    };

    if (!draft) return null;

    return (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h4 className="font-bold text-gray-800">Declaración PAC</h4>
                    <p className="text-xs italic text-gray-400 max-w-md">
                        Registra las líneas de ayuda que solicitas cada campaña y obtén un estimado orientativo. <strong>No sustituye al SIGA/SGA oficial</strong>.
                    </p>
                </div>
                <select
                    value={activeYear}
                    onChange={(e) => setActiveYear(parseInt(e.target.value))}
                    className="text-sm border rounded-lg px-2 py-1.5 bg-white"
                >
                    {YEAR_OPTIONS.map((y) => <option key={y} value={y}>Campaña {y}</option>)}
                </select>
            </div>

            <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2">
                        <input type="checkbox" checked={!!draft.basePayment} onChange={(e) => setDraft({ ...draft, basePayment: e.target.checked })} />
                        <span>Pago Básico Renta <span className="text-xs italic text-gray-400">(~50 €/ha)</span></span>
                    </label>
                    <label className="flex items-center gap-2">
                        <input type="checkbox" checked={!!draft.redistributive} onChange={(e) => setDraft({ ...draft, redistributive: e.target.checked })} />
                        <span>Redistributivo <span className="text-xs italic text-gray-400">(primeras 30 ha)</span></span>
                    </label>
                    <label className="flex items-center gap-2">
                        <input type="checkbox" checked={!!draft.youngFarmer} onChange={(e) => setDraft({ ...draft, youngFarmer: e.target.checked })} />
                        <span>Joven Agricultor <span className="text-xs italic text-gray-400">(5 primeros años)</span></span>
                    </label>
                    <label className="flex items-center gap-2">
                        <input type="checkbox" checked={!!draft.organicScheme} onChange={(e) => setDraft({ ...draft, organicScheme: e.target.checked })} />
                        <span>Producción Ecológica</span>
                    </label>
                    <label className="flex items-center gap-2 col-span-2">
                        <input type="checkbox" checked={!!draft.coupledLivestock} onChange={(e) => setDraft({ ...draft, coupledLivestock: e.target.checked })} />
                        <span>Ayuda asociada vacuno (cría/cebo)</span>
                    </label>
                </div>

                <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs font-bold uppercase text-gray-600 tracking-wide mb-2">Ecorregímenes</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {ECO_REGIMES.map((e) => (
                            <label key={e.code} className="flex items-start gap-2 text-xs border border-gray-100 rounded p-2">
                                <input
                                    type="checkbox"
                                    checked={(draft.ecoSchemes ?? []).includes(e.code)}
                                    onChange={() => toggleEco(e.code)}
                                />
                                <span>
                                    <span className="font-bold block">{e.label}</span>
                                    <span className="italic text-gray-400">{e.explain}</span>
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-3 flex justify-between items-end gap-3 flex-wrap">
                    <p className="text-[11px] italic text-gray-500 max-w-md">
                        Si ya tienes parcelas y animales declarados en la finca, puedes precargar los totales automáticamente.
                    </p>
                    <button
                        onClick={handleAutofill}
                        className="text-xs bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
                    >
                        <Wand2 className="w-3 h-3" /> Precargar desde finca
                    </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                        <label className="text-xs font-bold text-gray-600">Ha admisibles</label>
                        <input
                            type="number" step="0.1" min="0"
                            value={draft.totalEligibleHa ?? ''}
                            onChange={(e) => setDraft({ ...draft, totalEligibleHa: parseFloat(e.target.value) || 0 })}
                            className="w-full text-sm border rounded-lg px-2 py-1"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-600">Total LU</label>
                        <input
                            type="number" step="0.1" min="0"
                            value={draft.totalLU ?? ''}
                            onChange={(e) => setDraft({ ...draft, totalLU: parseFloat(e.target.value) || 0 })}
                            className="w-full text-sm border rounded-lg px-2 py-1"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-600">Vacas nodriza</label>
                        <input
                            type="number" min="0"
                            value={numCows}
                            onChange={(e) => setNumCows(e.target.value === '' ? '' : parseInt(e.target.value))}
                            className="w-full text-sm border rounded-lg px-2 py-1"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-600">Cabezas cebo</label>
                        <input
                            type="number" min="0"
                            value={numCalves}
                            onChange={(e) => setNumCalves(e.target.value === '' ? '' : parseInt(e.target.value))}
                            className="w-full text-sm border rounded-lg px-2 py-1"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <button
                        onClick={handleEstimate}
                        className="text-xs bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 font-bold px-3 py-1.5 rounded-lg"
                    >
                        Estimar ayuda
                    </button>
                    <button
                        onClick={handleSave}
                        className="text-xs bg-green-600 hover:bg-green-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
                    >
                        <Save className="w-3 h-3" /> Guardar declaración
                    </button>
                </div>

                {estimate && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mt-2">
                        <p className="font-bold text-blue-800 text-sm mb-2">Estimación campaña {activeYear}</p>
                        <ul className="space-y-1 text-xs">
                            {estimate.items.map((i, idx) => (
                                <li key={idx} className="flex justify-between border-b border-blue-100 pb-1">
                                    <span className="text-blue-800">
                                        <span className="font-bold">{i.line}</span>
                                        <span className="italic text-blue-500 ml-2">{i.note}</span>
                                    </span>
                                    <span className="font-bold text-blue-900">{i.amount.toLocaleString('es-ES')} €</span>
                                </li>
                            ))}
                        </ul>
                        <TechValue
                            label="Total estimado"
                            value={`${estimate.total.toLocaleString('es-ES')} €`}
                            explain="Suma orientativa basada en tarifas FEGA típicas 2024-2027. Los importes reales pueden variar según coeficientes regionales y disponibilidad presupuestaria."
                            highlight
                            className="mt-2"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
