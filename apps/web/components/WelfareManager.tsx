'use client';

import { useEffect, useState, useTransition } from 'react';
import {
    Award,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Download,
    Loader2,
    Plus,
    Sparkles,
    Trash2,
    AlertTriangle,
    Ban,
    MinusCircle,
} from 'lucide-react';
import { getFarms } from '@/app/lib/farm-actions';
import {
    createAssessment,
    listAssessments,
    deleteAssessment,
    getAssessmentDetail,
    updateIndicator,
    precomputeAssessment,
    getWelfareDossier,
    updateAssessmentMeta,
    type AssessmentDetail,
} from '@/app/lib/welfare-actions';
import type { FarmLike } from '@/types/livestock';

type Protocol = 'welfair' | 'paws';

const STATUS_TONE: Record<string, { box: string; pill: string; Icon: typeof CheckCircle2; label: string }> = {
    excelente: {
        box: 'border-emerald-200 bg-emerald-50',
        pill: 'bg-emerald-100 text-emerald-700',
        Icon: CheckCircle2,
        label: 'Excelente',
    },
    aceptable: {
        box: 'border-sky-200 bg-sky-50',
        pill: 'bg-sky-100 text-sky-700',
        Icon: CheckCircle2,
        label: 'Aceptable',
    },
    mejorable: {
        box: 'border-amber-200 bg-amber-50',
        pill: 'bg-amber-100 text-amber-700',
        Icon: AlertTriangle,
        label: 'Mejorable',
    },
    alarmante: {
        box: 'border-red-200 bg-red-50',
        pill: 'bg-red-100 text-red-700',
        Icon: Ban,
        label: 'Alarmante',
    },
    sin_dato: {
        box: 'border-gray-200 bg-gray-50',
        pill: 'bg-gray-100 text-gray-500',
        Icon: MinusCircle,
        label: 'Sin datos',
    },
};

export function WelfareManager({ userId }: { userId?: string }) {
    const [farms, setFarms] = useState<FarmLike[]>([]);
    const [farmId, setFarmId] = useState<string | null>(null);
    const [assessments, setAssessments] = useState<Awaited<ReturnType<typeof listAssessments>> | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [protocol, setProtocol] = useState<Protocol>('welfair');
    const [creating, startCreating] = useTransition();

    useEffect(() => {
        if (!userId) return;
        getFarms(userId).then(({ data }) => {
            const list = (data as FarmLike[]) || [];
            setFarms(list);
            if (list[0]?.id) setFarmId(list[0].id);
        });
    }, [userId]);

    const reloadList = () => {
        if (farmId) listAssessments(farmId).then(setAssessments);
    };

    useEffect(() => {
        reloadList();
        setActiveId(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [farmId]);

    const handleCreate = () => {
        if (!farmId) return;
        startCreating(async () => {
            const a = await createAssessment({ farmId, protocol });
            setActiveId(a.id);
            reloadList();
        });
    };

    if (farms.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
                <Award className="w-7 h-7 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                    Crea una finca para preparar una auditoría de bienestar animal.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Bienestar animal</h2>
                    <p className="text-sm text-gray-600">
                        Prepara la auditoría Welfair® / B+ PAWS de PROVACUNO. Pre-rellenamos
                        lo que ya sabemos de tu rebaño y tú completas el resto.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 items-end">
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
                    <select
                        value={protocol}
                        onChange={(e) => setProtocol(e.target.value as Protocol)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                    >
                        <option value="welfair">Welfair® (IRTA/NEIKER)</option>
                        <option value="paws">B+ PAWS (PROVACUNO)</option>
                    </select>
                    <button
                        onClick={handleCreate}
                        disabled={creating || !farmId}
                        className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-medium px-3 py-2 rounded-lg"
                    >
                        {creating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Plus className="w-4 h-4" />
                        )}
                        Nueva evaluación
                    </button>
                </div>
            </div>

            {/* Lista de evaluaciones */}
            {assessments && assessments.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <h3 className="text-sm font-bold text-gray-900 mb-2">
                        Evaluaciones ({assessments.length})
                    </h3>
                    <ul className="divide-y divide-gray-100">
                        {assessments.map((a) => (
                            <li
                                key={a.id}
                                className="py-2 flex flex-wrap items-center gap-2"
                            >
                                <button
                                    onClick={() => setActiveId(a.id)}
                                    className={`text-left flex-1 min-w-0 ${
                                        activeId === a.id ? 'text-green-700 font-bold' : 'text-gray-700'
                                    }`}
                                >
                                    <p className="text-sm">
                                        {a.protocol === 'paws' ? 'B+ PAWS' : 'Welfair'} · {new Date(a.date).toLocaleDateString('es-ES')}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Estado: {a.status} ·{' '}
                                        {a.overallScore != null
                                            ? `Score ${a.overallScore.toFixed(0)}/100`
                                            : 'sin calcular'}
                                    </p>
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!confirm('¿Eliminar evaluación?')) return;
                                        await deleteAssessment(a.id);
                                        if (activeId === a.id) setActiveId(null);
                                        reloadList();
                                    }}
                                    className="text-red-600 hover:text-red-800"
                                    title="Eliminar"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Detalle */}
            {activeId && <AssessmentDetailView assessmentId={activeId} onReload={reloadList} />}
        </div>
    );
}

// ─── DETALLE ───────────────────────────────────────────────────────────────────

function AssessmentDetailView({
    assessmentId,
    onReload,
}: {
    assessmentId: string;
    onReload: () => void;
}) {
    const [detail, setDetail] = useState<AssessmentDetail | null>(null);
    const [precomputing, startPrecompute] = useTransition();
    const [expanded, setExpanded] = useState<Record<number, boolean>>({
        1: true,
        2: true,
        3: true,
        4: true,
    });

    const reload = () => {
        getAssessmentDetail(assessmentId).then(setDetail);
    };

    useEffect(reload, [assessmentId]);

    const downloadDossier = async () => {
        const dossier = await getWelfareDossier(assessmentId);
        const blob = new Blob([JSON.stringify(dossier, null, 2)], {
            type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `welfare-${dossier.meta.protocol}-${assessmentId}-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!detail) {
        return (
            <div className="text-sm text-gray-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando evaluación…
            </div>
        );
    }

    const { score } = detail;

    return (
        <div className="space-y-5">
            {/* Cabecera con score */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-wrap items-start gap-5">
                <div className="flex-1 min-w-[180px]">
                    <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">
                        Score global
                    </p>
                    <p className="text-4xl font-black text-gray-900 mt-1">
                        {score.overall.toFixed(0)}
                        <span className="text-lg text-gray-400">/100</span>
                    </p>
                    <p
                        className={`text-xs font-bold mt-1 inline-flex items-center gap-1 ${
                            score.auditReady ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                    >
                        {score.auditReady ? (
                            <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Lista para auditar
                            </>
                        ) : (
                            <>
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Pendiente — completa indicadores y resuelve alarmas
                            </>
                        )}
                    </p>
                </div>
                <div className="flex-[2] grid grid-cols-2 md:grid-cols-4 gap-2 min-w-[280px]">
                    {([1, 2, 3, 4] as const).map((p) => (
                        <div key={p} className="border border-gray-100 rounded-lg p-2">
                            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
                                P{p} {detail.principles[p]}
                            </p>
                            <p className="text-xl font-bold text-gray-900">
                                {score.byPrinciple[p].toFixed(0)}
                            </p>
                            <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                <div
                                    className="h-full bg-green-500"
                                    style={{ width: `${score.byPrinciple[p]}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
                <div className="shrink-0 flex flex-col gap-2">
                    <button
                        onClick={() => {
                            startPrecompute(async () => {
                                await precomputeAssessment(assessmentId);
                                reload();
                                onReload();
                            });
                        }}
                        disabled={precomputing}
                        className="inline-flex items-center gap-1 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg disabled:bg-gray-300"
                    >
                        {precomputing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Sparkles className="w-4 h-4" />
                        )}
                        Pre-rellenar desde datos
                    </button>
                    <button
                        onClick={downloadDossier}
                        className="inline-flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-3 py-1.5 rounded-lg"
                    >
                        <Download className="w-4 h-4" />
                        Dossier auditoría
                    </button>
                </div>
            </div>

            {/* Readiness */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-baseline justify-between mb-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Cumplimentación
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                        {score.readinessPct.toFixed(0)} %
                    </p>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${score.readinessPct}%` }}
                    />
                </div>
                {score.redFlags.length > 0 && (
                    <p className="text-xs text-red-700 mt-2 flex items-center gap-1">
                        <Ban className="w-3 h-3" />
                        {score.redFlags.length} indicador{score.redFlags.length === 1 ? '' : 'es'} en estado
                        alarmante — bloquea la auditoría hasta corregirlos.
                    </p>
                )}
            </div>

            {/* Indicadores por principio */}
            {([1, 2, 3, 4] as const).map((p) => (
                <div key={p} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <button
                        onClick={() => setExpanded((prev) => ({ ...prev, [p]: !prev[p] }))}
                        className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50"
                    >
                        <div className="flex items-center gap-2 text-left">
                            {expanded[p] ? (
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                            ) : (
                                <ChevronRight className="w-4 h-4 text-gray-500" />
                            )}
                            <span className="font-bold text-gray-900">
                                Principio {p} — {detail.principles[p]}
                            </span>
                        </div>
                        <span className="text-sm font-bold text-gray-700">
                            {score.byPrinciple[p].toFixed(0)} / 100
                        </span>
                    </button>
                    {expanded[p] && (
                        <div className="border-t border-gray-100 p-4 space-y-3">
                            {detail.catalog
                                .filter((c) => c.principle === p)
                                .map((c) => (
                                    <CriterionBlock
                                        key={c.code}
                                        criterion={c}
                                        indicators={detail.indicators.filter(
                                            (i) => i.criterion === c.code,
                                        )}
                                        scoresByCode={Object.fromEntries(
                                            score.indicators.map((i) => [i.code, i]),
                                        )}
                                        onChanged={reload}
                                    />
                                ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

function CriterionBlock({
    criterion,
    indicators,
    scoresByCode,
    onChanged,
}: {
    criterion: AssessmentDetail['catalog'][number];
    indicators: AssessmentDetail['indicators'];
    scoresByCode: Record<string, AssessmentDetail['score']['indicators'][number]>;
    onChanged: () => void;
}) {
    return (
        <div className="border border-gray-100 rounded-lg p-3">
            <p className="text-sm font-bold text-gray-900">
                {criterion.code}. {criterion.label}
            </p>
            <div className="mt-2 space-y-2">
                {indicators.map((ind) => (
                    <IndicatorRow
                        key={ind.id}
                        indicator={ind}
                        scoreInfo={scoresByCode[ind.indicatorCode]}
                        onChanged={onChanged}
                    />
                ))}
            </div>
        </div>
    );
}

function IndicatorRow({
    indicator,
    scoreInfo,
    onChanged,
}: {
    indicator: AssessmentDetail['indicators'][number];
    scoreInfo?: AssessmentDetail['score']['indicators'][number];
    onChanged: () => void;
}) {
    const [saving, startSaving] = useTransition();
    const [value, setValue] = useState<string>(
        indicator.valueNumeric != null
            ? String(indicator.valueNumeric)
            : indicator.valueText ?? '',
    );
    const [boolValue, setBoolValue] = useState<boolean | null>(indicator.valueBool);
    const [notes, setNotes] = useState(indicator.notes ?? '');

    const tone = scoreInfo?.status ?? 'sin_dato';
    const toneStyles = STATUS_TONE[tone];
    const ToneIcon = toneStyles.Icon;

    const save = () => {
        startSaving(async () => {
            try {
                let valueNumeric: number | null = null;
                let valueText: string | null = null;
                let valueBool: boolean | null = null;
                if (indicator.valueKind === 'bool') {
                    valueBool = boolValue;
                } else if (indicator.valueKind === 'text') {
                    valueText = value || null;
                } else {
                    valueNumeric = value === '' ? null : Number(value);
                    if (valueNumeric != null && !Number.isFinite(valueNumeric)) {
                        alert('Valor numérico no válido');
                        return;
                    }
                }
                await updateIndicator({
                    indicatorId: indicator.id,
                    valueNumeric,
                    valueText,
                    valueBool,
                    notes: notes || null,
                });
                onChanged();
            } catch (e) {
                alert((e as Error).message);
            }
        });
    };

    return (
        <div className={`border rounded-lg p-3 ${toneStyles.box}`}>
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-900">{indicator.label}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{indicator.help}</p>
                </div>
                <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${toneStyles.pill} shrink-0`}
                    title={toneStyles.label}
                >
                    <ToneIcon className="w-3 h-3" />
                    {toneStyles.label}
                </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-2 items-end">
                {indicator.valueKind === 'bool' ? (
                    <div className="flex gap-1">
                        {([
                            [true, 'Sí'],
                            [false, 'No'],
                            [null, '—'],
                        ] as const).map(([v, label]) => (
                            <button
                                key={String(v)}
                                onClick={() => setBoolValue(v)}
                                className={`text-xs px-2 py-1 rounded border ${
                                    boolValue === v
                                        ? 'bg-green-600 text-white border-green-600'
                                        : 'bg-white text-gray-700 border-gray-200'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                ) : (
                    <input
                        type={indicator.valueKind === 'text' ? 'text' : 'number'}
                        step="any"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="flex-1 min-w-[100px] border border-gray-200 rounded px-2 py-1 text-sm bg-white"
                        placeholder={indicator.unit ?? 'Valor'}
                    />
                )}
                {indicator.unit && indicator.valueKind !== 'bool' && (
                    <span className="text-xs text-gray-500">{indicator.unit}</span>
                )}
                <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notas"
                    className="flex-[2] min-w-[140px] border border-gray-200 rounded px-2 py-1 text-sm bg-white"
                />
                <button
                    onClick={save}
                    disabled={saving}
                    className="inline-flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium px-2 py-1 rounded"
                >
                    {saving ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                        'Guardar'
                    )}
                </button>
            </div>

            {indicator.source === 'auto' && (
                <p className="text-[10px] italic text-gray-400 mt-1">
                    Pre-rellenado automáticamente
                </p>
            )}
        </div>
    );
}
