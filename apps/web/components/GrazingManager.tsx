'use client';

import { useEffect, useState, useTransition } from 'react';
import {
    AlertTriangle,
    ArrowRight,
    Ban,
    CheckCircle2,
    Download,
    Loader2,
    MapPin,
    MinusCircle,
    Move,
    Sprout,
} from 'lucide-react';
import { getFarms } from '@/app/lib/farm-actions';
import { getCorrals } from '@/app/lib/corral-actions';
import { getCropPlots } from '@/app/lib/crop-actions';
import { getAnimals } from '@/app/lib/animal-actions';
import {
    currentGrazingStatus,
    farmGrazingSummary,
    recordGrazing,
    endGrazing,
    getGrazingTraceability,
    type CurrentGrazingItem,
    type FarmGrazingSummary,
    type TraceabilityDossier,
} from '@/app/lib/grazing-actions';
import type { FarmLike, AnimalLike } from '@/types/livestock';

type Tab = 'estado' | 'mover' | 'historico';

const STATUS_BADGE: Record<
    CurrentGrazingItem['status'],
    { container: string; text: string; Icon: typeof CheckCircle2 }
> = {
    verde: {
        container: 'bg-emerald-50 border-emerald-100',
        text: 'text-emerald-700',
        Icon: CheckCircle2,
    },
    ambar: {
        container: 'bg-amber-50 border-amber-100',
        text: 'text-amber-700',
        Icon: AlertTriangle,
    },
    rojo: {
        container: 'bg-red-50 border-red-100',
        text: 'text-red-700',
        Icon: Ban,
    },
    sin_dato: {
        container: 'bg-gray-50 border-gray-200',
        text: 'text-gray-500',
        Icon: MinusCircle,
    },
};

export function GrazingManager({ userId }: { userId?: string }) {
    const [farms, setFarms] = useState<FarmLike[]>([]);
    const [farmId, setFarmId] = useState<string | null>(null);
    const [tab, setTab] = useState<Tab>('estado');

    useEffect(() => {
        if (!userId) return;
        getFarms(userId).then(({ data }) => {
            const list = (data as FarmLike[]) || [];
            setFarms(list);
            if (list[0]?.id) setFarmId(list[0].id);
        });
    }, [userId]);

    if (farms.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
                <Sprout className="w-7 h-7 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                    Crea una finca para registrar pastoreo.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Pastoreo</h2>
                    <p className="text-sm text-gray-600">
                        Trazabilidad fina: qué animales han pastado en qué
                        parcelas. Une SIGPAC, capacidad sostenible del suelo y
                        rotación Voisin.
                    </p>
                </div>
                <select
                    value={farmId ?? ''}
                    onChange={(e) => setFarmId(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                >
                    {farms.map((f) => (
                        <option key={f.id} value={f.id}>
                            {f.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex gap-1 border-b border-gray-200">
                {([
                    ['estado', 'Estado actual', MapPin],
                    ['mover', 'Mover lote', Move],
                    ['historico', 'Histórico', Sprout],
                ] as const).map(([key, label, Icon]) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors inline-flex items-center gap-2 ${
                            tab === key
                                ? 'border-green-600 text-green-700'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
            </div>

            {farmId && tab === 'estado' && <EstadoTab farmId={farmId} />}
            {farmId && tab === 'mover' && (
                <MoverTab farmId={farmId} userId={userId} onMoved={() => setTab('estado')} />
            )}
            {farmId && tab === 'historico' && <HistoricoTab farmId={farmId} />}
        </div>
    );
}

// ─── ESTADO ACTUAL ─────────────────────────────────────────────────────────────

function EstadoTab({ farmId }: { farmId: string }) {
    const [items, setItems] = useState<CurrentGrazingItem[] | null>(null);

    const reload = () => {
        currentGrazingStatus(farmId).then(setItems);
    };
    useEffect(reload, [farmId]);

    if (items === null) {
        return (
            <div className="text-sm text-gray-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Calculando…
            </div>
        );
    }
    if (items.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
                <p className="text-sm text-gray-600">
                    No hay animales pastando registrados. Usa <strong>Mover lote</strong>{' '}
                    para empezar la trazabilidad.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((it) => {
                const styles = STATUS_BADGE[it.status];
                return (
                    <div
                        key={it.parcelKey}
                        className={`border rounded-xl p-4 ${styles.container}`}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="text-xs uppercase tracking-wider font-medium text-gray-500">
                                    {it.kind === 'cropPlot'
                                        ? 'Parcela cultivo'
                                        : it.kind === 'corral'
                                          ? 'Corral'
                                          : 'SIGPAC'}
                                </p>
                                <p className="font-bold text-gray-900 truncate">
                                    {it.parcelLabel}
                                </p>
                            </div>
                            <span className={`inline-flex items-center gap-1 text-xs ${styles.text} font-bold`}>
                                <styles.Icon className="w-3.5 h-3.5" />
                                {it.luPerHa != null
                                    ? `${it.luPerHa.toFixed(2)} LU/ha`
                                    : '—'}
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                            <Field label="Cabezas" value={it.activeAnimals} />
                            <Field label="ha" value={it.areaHa.toFixed(1)} />
                            <Field label="Días aquí" value={it.daysSinceStart} />
                        </div>
                        {it.sustainableLUperHa && (
                            <p className="text-[11px] text-gray-500 mt-2">
                                Capacidad sostenible: {it.sustainableLUperHa.toFixed(2)} LU/ha
                                {it.luPerHa &&
                                    ` · ${((it.luPerHa / it.sustainableLUperHa) * 100).toFixed(0)} %`}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── MOVER LOTE ────────────────────────────────────────────────────────────────

function MoverTab({
    farmId,
    userId,
    onMoved,
}: {
    farmId: string;
    userId?: string;
    onMoved: () => void;
}) {
    const [animals, setAnimals] = useState<AnimalLike[]>([]);
    const [corrals, setCorrals] = useState<Awaited<ReturnType<typeof getCorrals>>>([]);
    const [plots, setPlots] = useState<Awaited<ReturnType<typeof getCropPlots>>>([]);
    const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
    const [destKind, setDestKind] = useState<'corral' | 'cropPlot' | 'sigpac'>('cropPlot');
    const [destId, setDestId] = useState('');
    const [sigpacRef, setSigpacRef] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, startSaving] = useTransition();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) return;
        Promise.all([
            getAnimals(userId).then(({ data }) => (data as unknown) as AnimalLike[]),
            getCorrals(farmId),
            getCropPlots(farmId),
        ]).then(([a, c, p]) => {
            setAnimals(
                (a ?? []).filter(
                    (x) => (x as unknown as { farmId?: string }).farmId === farmId,
                ),
            );
            setCorrals(c);
            setPlots(p);
        });
    }, [farmId, userId]);

    const toggleAnimal = (id: string) => {
        setSelectedAnimals((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    };

    const submit = () => {
        setError(null);
        startSaving(async () => {
            try {
                await recordGrazing({
                    farmId,
                    animalIds: selectedAnimals,
                    corralId: destKind === 'corral' ? destId : undefined,
                    cropPlotId: destKind === 'cropPlot' ? destId : undefined,
                    sigpacRef: destKind === 'sigpac' ? sigpacRef : undefined,
                    notes,
                });
                setSelectedAnimals([]);
                setNotes('');
                onMoved();
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Error');
            }
        });
    };

    const canSubmit =
        selectedAnimals.length > 0 &&
        ((destKind === 'corral' && destId) ||
            (destKind === 'cropPlot' && destId) ||
            (destKind === 'sigpac' && sigpacRef));

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
                <p className="text-sm font-bold text-gray-900">
                    1. Selecciona los animales a mover ({selectedAnimals.length})
                </p>
                <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-lg">
                    {animals.length === 0 ? (
                        <p className="p-3 text-sm text-gray-500 italic">
                            No hay animales en esta finca.
                        </p>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {animals.map((a) => {
                                const id = (a as unknown as { id: string }).id;
                                const sex = (a as unknown as { sex?: string }).sex;
                                const breed = (a as unknown as { breed?: string }).breed;
                                const checked = selectedAnimals.includes(id);
                                return (
                                    <li key={id}>
                                        <label className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggleAnimal(id)}
                                                className="w-4 h-4 accent-green-600"
                                            />
                                            <span className="font-medium">{id}</span>
                                            <span className="text-xs text-gray-500">{sex}</span>
                                            {breed && (
                                                <span className="text-xs text-gray-400">{breed}</span>
                                            )}
                                        </label>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
                <p className="text-sm font-bold text-gray-900">2. Destino</p>
                <div className="flex flex-wrap gap-2">
                    {([
                        ['cropPlot', 'Parcela de cultivo'],
                        ['corral', 'Corral'],
                        ['sigpac', 'SIGPAC (libre)'],
                    ] as const).map(([k, l]) => (
                        <button
                            key={k}
                            onClick={() => {
                                setDestKind(k);
                                setDestId('');
                            }}
                            className={`text-xs font-medium px-3 py-1.5 rounded-lg border ${
                                destKind === k
                                    ? 'bg-green-600 text-white border-green-600'
                                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                            }`}
                        >
                            {l}
                        </button>
                    ))}
                </div>

                {destKind === 'cropPlot' && (
                    <select
                        value={destId}
                        onChange={(e) => setDestId(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                    >
                        <option value="">Selecciona parcela</option>
                        {plots.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name} ({p.surfaceHa.toFixed(1)} ha)
                            </option>
                        ))}
                    </select>
                )}
                {destKind === 'corral' && (
                    <select
                        value={destId}
                        onChange={(e) => setDestId(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                    >
                        <option value="">Selecciona corral</option>
                        {corrals.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name} ({c.kind})
                            </option>
                        ))}
                    </select>
                )}
                {destKind === 'sigpac' && (
                    <input
                        value={sigpacRef}
                        onChange={(e) => setSigpacRef(e.target.value)}
                        placeholder="prov/muni/poligono/parcela/recinto (ej. 31/099/5/142/3)"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    />
                )}

                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Notas (opcional)"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
            </div>

            {error && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="flex justify-end">
                <button
                    onClick={submit}
                    disabled={saving || !canSubmit}
                    className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-medium px-4 py-2 rounded-lg"
                >
                    {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <ArrowRight className="w-4 h-4" />
                    )}
                    Mover ahora ({selectedAnimals.length})
                </button>
            </div>
        </div>
    );
}

// ─── HISTÓRICO ─────────────────────────────────────────────────────────────────

function HistoricoTab({ farmId }: { farmId: string }) {
    const [summary, setSummary] = useState<FarmGrazingSummary | null>(null);
    const [dossier, setDossier] = useState<TraceabilityDossier | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        farmGrazingSummary(farmId).then(setSummary);
        getGrazingTraceability({ farmId }).then(setDossier);
    }, [farmId]);

    const downloadDossier = async () => {
        setBusy(true);
        try {
            const d = dossier ?? (await getGrazingTraceability({ farmId }));
            const blob = new Blob([JSON.stringify(d, null, 2)], {
                type: 'application/json',
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `trazabilidad-pastoreo-${farmId}-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } finally {
            setBusy(false);
        }
    };

    if (!summary) {
        return (
            <div className="text-sm text-gray-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando histórico…
            </div>
        );
    }

    if (summary.parcels.length === 0) {
        return (
            <p className="text-sm text-gray-500 italic">
                Sin pastoreo registrado en los últimos 12 meses.
            </p>
        );
    }

    return (
        <div className="space-y-5">
            {dossier && <ComplianceBanner dossier={dossier} />}

            <div className="flex justify-end">
                <button
                    onClick={downloadDossier}
                    disabled={busy}
                    className="inline-flex items-center gap-1 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg disabled:bg-gray-300"
                >
                    {busy ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Download className="w-4 h-4" />
                    )}
                    Descargar dossier trazabilidad
                </button>
            </div>

            {summary.parcels.map((p) => (
                <div
                    key={p.parcelKey}
                    className="bg-white rounded-xl border border-gray-100 p-4 space-y-2"
                >
                    <div className="flex items-baseline justify-between gap-2">
                        <p className="font-bold text-gray-900">{p.label}</p>
                        <p className="text-xs text-gray-500 capitalize">
                            {p.kind === 'cropPlot' ? 'cultivo' : p.kind}
                        </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                        <Field label="Días pastoreado" value={Math.round(p.daysGrazed)} />
                        <Field label="Días descanso" value={Math.round(p.daysRested)} />
                        <Field
                            label="Presión"
                            value={`${(p.pressureRatio * 100).toFixed(0)} %`}
                        />
                        <Field label="LU·día" value={Math.round(p.luDays)} />
                        <Field
                            label="LU/ha medio"
                            value={p.averageLUperHa?.toFixed(2) ?? '—'}
                        />
                    </div>
                    {p.restPeriods.length > 0 && (
                        <div className="mt-2 text-xs text-gray-600">
                            <p className="font-medium mb-1">
                                Periodos de descanso ({p.restPeriods.length})
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {p.restPeriods.slice(0, 6).map((r, i) => (
                                    <span
                                        key={i}
                                        className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                            r.days >= 30
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                : r.days >= 15
                                                  ? 'bg-amber-50 text-amber-700 border-amber-100'
                                                  : 'bg-red-50 text-red-700 border-red-100'
                                        }`}
                                        title={`${new Date(r.fromDate).toLocaleDateString('es-ES')} → ${new Date(r.toDate).toLocaleDateString('es-ES')}`}
                                    >
                                        {r.days} d
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

function ComplianceBanner({ dossier }: { dossier: TraceabilityDossier }) {
    const cards = [
        {
            key: 'P1',
            title: 'Ecorregimen P1 — pastoreo extensivo',
            ok: dossier.compliance.ecoregimen_P1.ok,
            pct: dossier.compliance.ecoregimen_P1.pctPasto,
            umbral: dossier.compliance.ecoregimen_P1.umbral,
            hint: '% del tiempo del rebaño en parcelas de pasto vs estabulado.',
        },
        {
            key: 'IGP',
            title: 'Carne de pasto (IGP / Welfair)',
            ok: dossier.compliance.carne_de_pasto.ok,
            pct: dossier.compliance.carne_de_pasto.pctPasto,
            umbral: dossier.compliance.carne_de_pasto.umbral,
            hint: 'Mínimo días vivos en pasto natural / pradera permanente.',
        },
    ];
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cards.map((c) => (
                <div
                    key={c.key}
                    className={`rounded-xl border p-4 ${
                        c.ok
                            ? 'bg-emerald-50 border-emerald-100'
                            : 'bg-amber-50 border-amber-100'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-xs uppercase tracking-wider font-medium text-gray-500">
                            {c.title}
                        </p>
                        <span
                            className={`text-xs font-bold inline-flex items-center gap-1 ${
                                c.ok ? 'text-emerald-700' : 'text-amber-700'
                            }`}
                        >
                            {c.ok ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                                <AlertTriangle className="w-3.5 h-3.5" />
                            )}
                            {c.ok ? 'Cumple' : 'Atención'}
                        </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                        {c.pct.toFixed(0)} %
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                        Umbral: ≥ {c.umbral} % · {c.hint}
                    </p>
                </div>
            ))}
        </div>
    );
}

function Field({ label, value }: { label: string; value: string | number }) {
    return (
        <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">
                {label}
            </p>
            <p className="font-bold text-gray-900 text-sm">{value}</p>
        </div>
    );
}

export { endGrazing };
