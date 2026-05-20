'use client';

import { useEffect, useState, useTransition } from 'react';
import {
    Bell,
    CheckCircle2,
    AlertTriangle,
    Info,
    Loader2,
    Play,
    Save,
} from 'lucide-react';
import { getFarms } from '@/app/lib/farm-actions';
import {
    listAlertRules,
    upsertAlertRule,
    evaluateAlertRules,
    listActiveAlerts,
    resolveAlert,
} from '@/app/lib/alert-actions';
import type { AlertKind } from '@/services/alertEngine';
import type { FarmLike } from '@/types/livestock';

interface RuleRow {
    id: string;
    kind: string;
    enabled: boolean;
    paramsJson: string;
    severity: string;
    lastEvalAt: Date | null;
}

interface AlertRow {
    id: string;
    type: string;
    severity: string;
    message: string;
    date: Date;
    animal: { id: string; sex: string; category: string | null };
}

const KIND_DESCRIPTIONS: Record<AlertKind, { label: string; help: string; paramFields: Array<{ key: string; label: string; min: number; max: number; suffix: string }> }> = {
    hembras_a_parir: {
        label: 'Hembras a parir',
        help: 'Avisa cuando una hembra tiene parto previsto.',
        paramFields: [
            { key: 'daysAhead', label: 'Días de antelación', min: 1, max: 30, suffix: 'días' },
        ],
    },
    sin_pesar: {
        label: 'Sin pesar',
        help: 'Animales sin peso registrado durante demasiado tiempo.',
        paramFields: [
            { key: 'daysSince', label: 'Sin pesar desde', min: 15, max: 365, suffix: 'días' },
        ],
    },
    perdiendo_peso: {
        label: 'Perdiendo peso',
        help: 'Animales que han perdido peso entre dos pesajes consecutivos.',
        paramFields: [
            { key: 'weeksOfLoss', label: 'Mínimo de semanas', min: 1, max: 12, suffix: 'sem' },
            { key: 'thresholdPct', label: 'Umbral pérdida', min: 1, max: 30, suffix: '%' },
        ],
    },
    retiro_vencido: {
        label: 'Retiro próximo',
        help: 'Tiempo de retiro de medicamento a punto de terminar.',
        paramFields: [
            { key: 'warnDaysBefore', label: 'Aviso antelación', min: 1, max: 14, suffix: 'días' },
        ],
    },
    saneamiento_proximo: {
        label: 'Saneamiento próximo',
        help: 'Campaña oficial TB / brucelosis / lengua azul próxima.',
        paramFields: [
            { key: 'daysAhead', label: 'Días antelación', min: 1, max: 60, suffix: 'días' },
        ],
    },
    carga_excedida: {
        label: 'Carga ganadera excedida',
        help: 'La finca supera la carga sostenible (LU/ha).',
        paramFields: [
            { key: 'tolerancePct', label: 'Tolerancia sobre 100 %', min: 0, max: 50, suffix: '%' },
        ],
    },
    forage_deficit: {
        label: 'Déficit forrajero',
        help: 'Meses con cobertura forrajera por debajo del umbral (producción de parcelas vs demanda del rebaño).',
        paramFields: [
            { key: 'minCoveragePct', label: 'Cobertura mínima', min: 50, max: 100, suffix: '%' },
        ],
    },
    destete_proximo: {
        label: 'Destete próximo',
        help: 'Animales en la ventana de edad típica de destete (default 7 m ±1.5).',
        paramFields: [
            { key: 'targetAgeMonths', label: 'Edad objetivo', min: 4, max: 12, suffix: 'm' },
            { key: 'windowMonths', label: 'Ventana', min: 0.5, max: 4, suffix: 'm' },
        ],
    },
    castracion_decision: {
        label: 'Decisión castración/semental',
        help: 'Machos en la ventana de edad para decidir destino (semental, cebo o castración).',
        paramFields: [
            { key: 'targetAgeMonths', label: 'Edad objetivo', min: 4, max: 12, suffix: 'm' },
            { key: 'windowMonths', label: 'Ventana', min: 0.5, max: 4, suffix: 'm' },
        ],
    },
};

const SEVERITY_BADGE: Record<string, { class: string; icon: ReactIcon }> = {
    info: { class: 'bg-sky-50 text-sky-700 border-sky-100', icon: Info },
    warning: { class: 'bg-amber-50 text-amber-700 border-amber-100', icon: AlertTriangle },
    critical: { class: 'bg-red-50 text-red-700 border-red-100', icon: Bell },
};

type ReactIcon = typeof Bell;

export function AlertRulesManager({ userId }: { userId?: string }) {
    const [farms, setFarms] = useState<FarmLike[]>([]);
    const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
    const [rules, setRules] = useState<RuleRow[]>([]);
    const [alerts, setAlerts] = useState<AlertRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [evaluating, startEvaluation] = useTransition();
    const [evalReport, setEvalReport] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) return;
        getFarms(userId).then(({ data }) => {
            const list = (data as FarmLike[]) || [];
            setFarms(list);
            if (list[0]?.id) setSelectedFarmId(list[0].id);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [userId]);

    useEffect(() => {
        if (!selectedFarmId) return;
        Promise.all([
            listAlertRules(selectedFarmId),
            listActiveAlerts(selectedFarmId),
        ])
            .then(([r, a]) => {
                setRules(r as RuleRow[]);
                setAlerts(a as AlertRow[]);
            })
            .catch(() => { /* noop */ });
    }, [selectedFarmId]);

    const handleEvaluate = () => {
        if (!selectedFarmId) return;
        startEvaluation(async () => {
            try {
                const res = await evaluateAlertRules(selectedFarmId);
                setEvalReport(`${res.inserted} alertas nuevas (de ${res.candidates} candidatas).`);
                const a = await listActiveAlerts(selectedFarmId);
                setAlerts(a as AlertRow[]);
            } catch (e) {
                setEvalReport(`Error: ${(e as Error).message}`);
            }
        });
    };

    const handleResolve = async (alertId: string) => {
        if (!selectedFarmId) return;
        await resolveAlert(alertId);
        const a = await listActiveAlerts(selectedFarmId);
        setAlerts(a as AlertRow[]);
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando…
            </div>
        );
    }

    if (farms.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
                <Bell className="w-7 h-7 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                    Crea una finca para configurar reglas de alerta.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Alertas</h2>
                    <p className="text-sm text-gray-600">
                        Reglas configurables que el motor evalúa diariamente y
                        genera avisos en el rebaño.
                    </p>
                </div>
                <div className="flex gap-2 items-end">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                            Finca
                        </label>
                        <select
                            value={selectedFarmId ?? ''}
                            onChange={(e) => setSelectedFarmId(e.target.value)}
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                        >
                            {farms.map((f) => (
                                <option key={f.id} value={f.id}>
                                    {f.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={handleEvaluate}
                        disabled={evaluating || !selectedFarmId}
                        className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-medium px-3 py-2 rounded-lg"
                    >
                        {evaluating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Play className="w-4 h-4" />
                        )}
                        Evaluar ahora
                    </button>
                </div>
            </div>

            {evalReport && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-sm text-emerald-700">
                    {evalReport}
                </div>
            )}

            {/* Reglas */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
                <h3 className="text-lg font-bold text-gray-900">Reglas activas</h3>
                <div className="space-y-3">
                    {rules.map((rule) => (
                        <RuleEditor
                            key={rule.id}
                            rule={rule}
                            farmId={selectedFarmId!}
                            onSaved={(updated) =>
                                setRules((prev) =>
                                    prev.map((r) => (r.id === updated.id ? updated : r)),
                                )
                            }
                        />
                    ))}
                </div>
            </div>

            {/* Alertas activas */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
                <div className="flex items-baseline justify-between">
                    <h3 className="text-lg font-bold text-gray-900">
                        Alertas activas ({alerts.length})
                    </h3>
                </div>
                {alerts.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                        No hay alertas activas. Pulsa “Evaluar ahora” para
                        forzar una revisión inmediata.
                    </p>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {alerts.map((a) => {
                            const badge =
                                SEVERITY_BADGE[a.severity] ?? SEVERITY_BADGE.info;
                            const Icon = badge.icon;
                            return (
                                <li
                                    key={a.id}
                                    className="py-3 flex items-start justify-between gap-3"
                                >
                                    <div className="flex items-start gap-3 min-w-0">
                                        <span
                                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full border ${badge.class} shrink-0`}
                                        >
                                            <Icon className="w-3.5 h-3.5" />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900">
                                                {a.message}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {a.animal?.id ?? '—'} ·{' '}
                                                {new Date(a.date).toLocaleDateString('es-ES', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                })}{' '}
                                                · {a.type.replace(/_/g, ' ')}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleResolve(a.id)}
                                        className="text-xs font-medium text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 shrink-0"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Resolver
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}

function RuleEditor({
    rule,
    farmId,
    onSaved,
}: {
    rule: RuleRow;
    farmId: string;
    onSaved: (r: RuleRow) => void;
}) {
    const meta = KIND_DESCRIPTIONS[rule.kind as AlertKind];
    const initialParams = safeJSONParse<Record<string, number>>(rule.paramsJson) ?? {};
    const [enabled, setEnabled] = useState(rule.enabled);
    const [severity, setSeverity] = useState(rule.severity);
    const [params, setParams] = useState<Record<string, number>>(initialParams);
    const [saving, startSaving] = useTransition();

    if (!meta) {
        return (
            <p className="text-xs italic text-gray-500">
                Regla desconocida: {rule.kind}
            </p>
        );
    }

    const save = () => {
        startSaving(async () => {
            const updated = await upsertAlertRule({
                farmId,
                kind: rule.kind as AlertKind,
                enabled,
                paramsJson: JSON.stringify(params),
                severity: severity as 'info' | 'warning' | 'critical',
            });
            onSaved(updated as RuleRow);
        });
    };

    return (
        <div className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => setEnabled(e.target.checked)}
                            className="w-4 h-4 accent-green-600"
                        />
                        <span className="text-sm font-bold text-gray-900">
                            {meta.label}
                        </span>
                        <select
                            value={severity}
                            onChange={(e) => setSeverity(e.target.value)}
                            className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-0.5"
                        >
                            <option value="info">info</option>
                            <option value="warning">aviso</option>
                            <option value="critical">crítico</option>
                        </select>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{meta.help}</p>
                </div>
                <button
                    onClick={save}
                    disabled={saving}
                    className="inline-flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded font-medium shrink-0"
                >
                    {saving ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                        <Save className="w-3 h-3" />
                    )}
                    Guardar
                </button>
            </div>

            {meta.paramFields.length > 0 && (
                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                    {meta.paramFields.map((field) => (
                        <label key={field.key} className="text-xs text-gray-600">
                            {field.label}
                            <div className="flex items-center gap-1 mt-0.5">
                                <input
                                    type="number"
                                    min={field.min}
                                    max={field.max}
                                    value={params[field.key] ?? ''}
                                    onChange={(e) =>
                                        setParams((p) => ({
                                            ...p,
                                            [field.key]: Number(e.target.value),
                                        }))
                                    }
                                    className="border border-gray-200 rounded px-2 py-1 text-sm w-24 bg-white"
                                />
                                <span className="text-gray-400 text-xs">
                                    {field.suffix}
                                </span>
                            </div>
                        </label>
                    ))}
                </div>
            )}

            {rule.lastEvalAt && (
                <p className="text-[10px] text-gray-400 mt-2">
                    Última evaluación:{' '}
                    {new Date(rule.lastEvalAt).toLocaleString('es-ES')}
                </p>
            )}
        </div>
    );
}

function safeJSONParse<T>(raw: string): T | null {
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}
