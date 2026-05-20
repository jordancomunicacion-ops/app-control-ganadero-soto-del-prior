'use client';

import { useEffect, useState } from 'react';
import {
    AlertTriangle,
    CalendarDays,
    CheckCircle2,
    Loader2,
    MinusCircle,
    Sparkles,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import {
    getForageDashboard,
    listFarmsForForage,
    type ForageDashboard,
} from '@/app/lib/forage-actions';

const FAMILY_COLOR: Record<string, string> = {
    'Cereal Invierno': '#a16207', // ámbar
    'Cereal Verano': '#ca8a04',
    'Leguminosa': '#15803d',
    'Pradera': '#16a34a',
    'Barbecho': '#9ca3af',
    'Forraje': '#0ea5e9',
    default: '#6366f1',
};

const MONTH_LABELS = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

const STATUS_COLOR: Record<string, string> = {
    excedente: '#0ea5e9',
    verde: '#16a34a',
    ambar: '#f59e0b',
    rojo: '#dc2626',
    sin_dato: '#d1d5db',
};

export function ForageCalendarManager({ userId: _userId }: { userId?: string }) {
    const [farms, setFarms] = useState<Awaited<ReturnType<typeof listFarmsForForage>>>([]);
    const [farmId, setFarmId] = useState<string | null>(null);
    const [dashboard, setDashboard] = useState<ForageDashboard | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        listFarmsForForage().then((list) => {
            setFarms(list);
            if (list[0]?.id) setFarmId(list[0].id);
        });
    }, []);

    useEffect(() => {
        if (!farmId) return;
        setLoading(true);
        getForageDashboard(farmId)
            .then(setDashboard)
            .finally(() => setLoading(false));
    }, [farmId]);

    if (farms.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
                <CalendarDays className="w-7 h-7 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                    Crea una finca principal con parcelas para usar el
                    calendario forrajero.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Calendario forrajero</h2>
                    <p className="text-sm text-gray-600">
                        Cruza la producción esperada de tus parcelas con la
                        demanda mensual del rebaño. Detecta meses con déficit
                        y te dice cuántas hectáreas o kg necesitarías comprar.
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

            {loading || !dashboard ? (
                <div className="text-sm text-gray-500 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Calculando balance…
                </div>
            ) : (
                <ForageBody dashboard={dashboard} />
            )}
        </div>
    );
}

function ForageBody({ dashboard }: { dashboard: ForageDashboard }) {
    const { balance } = dashboard;
    const annualCoverage = balance.annualCoverage;

    return (
        <div className="space-y-5">
            {/* Resumen anual */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard
                    label="Cobertura anual"
                    value={`${(annualCoverage * 100).toFixed(0)} %`}
                    Icon={
                        annualCoverage >= 1.0
                            ? CheckCircle2
                            : annualCoverage >= 0.7
                              ? AlertTriangle
                              : TrendingDown
                    }
                    tone={
                        annualCoverage >= 1.0
                            ? 'ok'
                            : annualCoverage >= 0.7
                              ? 'warn'
                              : 'danger'
                    }
                />
                <SummaryCard
                    label="Meses en rojo"
                    value={balance.months.filter((m) => m.status === 'rojo').length}
                    Icon={TrendingDown}
                    tone="danger"
                />
                <SummaryCard
                    label="Meses con excedente"
                    value={balance.excessMonths}
                    Icon={TrendingUp}
                    tone="ok"
                />
                <SummaryCard
                    label="Parcelas activas"
                    value={`${dashboard.parcelasInternas + dashboard.parcelasAsociadas}`}
                    Icon={Sparkles}
                />
            </div>

            {/* Resumen contextual */}
            <p className="text-xs text-gray-500">
                Demanda anual: <strong>{kgToHuman(balance.annualDemandKgDM)}</strong> MS ·
                Producción esperada: <strong>{kgToHuman(balance.annualProductionKgDM)}</strong> MS ·{' '}
                {dashboard.parcelasInternas} parcelas en {dashboard.farmName} ·{' '}
                {dashboard.parcelasAsociadas} parcelas en fincas asociadas ·{' '}
                {dashboard.headcount} cabezas activas
            </p>

            {/* Timeline mensual */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3">
                    Balance mensual ({balance.months.length} meses)
                </h3>
                <MonthlyTimeline months={balance.months} />
            </div>

            {/* Cultivos por parcela */}
            <RotationsTimeline months={balance.months} />

            {/* Recomendaciones */}
            {balance.recommendations.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
                    <h3 className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Recomendaciones ({balance.recommendations.length} meses con déficit)
                    </h3>
                    <ul className="space-y-2">
                        {balance.recommendations.map((r) => (
                            <li
                                key={r.yearMonth}
                                className="bg-white border border-amber-100 rounded-lg p-3 text-sm flex flex-wrap items-baseline gap-2"
                            >
                                <span className="font-bold text-gray-900">
                                    {formatMonth(r.yearMonth)}
                                </span>
                                <span className="text-amber-700">
                                    Déficit {kgToHuman(r.deficitKgDM)} MS
                                </span>
                                <span className="text-gray-300">·</span>
                                {r.suggestedHaExtra != null && r.suggestedCrop && (
                                    <>
                                        <span className="text-gray-700">
                                            Sembrar <strong>{r.suggestedHaExtra.toFixed(1)} ha</strong>{' '}
                                            extra de {r.suggestedCrop}
                                        </span>
                                        <span className="text-gray-300">o</span>
                                    </>
                                )}
                                <span className="text-gray-700">
                                    comprar <strong>{kgToHuman(r.suggestedPurchaseKgDM)}</strong> MS externo
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

// ─── BARRA MENSUAL ─────────────────────────────────────────────────────────────

function MonthlyTimeline({ months }: { months: ForageDashboard['balance']['months'] }) {
    const maxKg = Math.max(
        ...months.map((m) => Math.max(m.productionKgDM, m.demandKgDM)),
        1,
    );

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-12 gap-1 items-end h-32">
                {months.map((m) => {
                    const prodH = (m.productionKgDM / maxKg) * 100;
                    const demH = (m.demandKgDM / maxKg) * 100;
                    return (
                        <div
                            key={m.yearMonth}
                            className="flex items-end justify-center gap-0.5 h-full relative group"
                            title={`${formatMonth(m.yearMonth)} · Producción ${kgToHuman(m.productionKgDM)} / Demanda ${kgToHuman(m.demandKgDM)}`}
                        >
                            <div
                                className="w-1/2 bg-emerald-400 rounded-t"
                                style={{ height: `${prodH}%` }}
                            />
                            <div
                                className="w-1/2 bg-gray-300 rounded-t"
                                style={{ height: `${demH}%` }}
                            />
                            <div className="absolute -bottom-5 left-0 right-0 text-center text-[10px] text-gray-500">
                                {monthShort(m.yearMonth)}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-7 h-3 grid grid-cols-12 gap-1">
                {months.map((m) => (
                    <div
                        key={m.yearMonth}
                        className="rounded"
                        title={`${formatMonth(m.yearMonth)}: cobertura ${(m.coverageRatio * 100).toFixed(0)} %`}
                        style={{ backgroundColor: STATUS_COLOR[m.status] }}
                    />
                ))}
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-gray-500">
                <Legend color="#10b981" label="Producción" />
                <Legend color="#9ca3af" label="Demanda" />
                <Legend color="#16a34a" label="Cobertura OK" />
                <Legend color="#f59e0b" label="Cobertura ámbar" />
                <Legend color="#dc2626" label="Déficit" />
                <Legend color="#0ea5e9" label="Excedente" />
            </div>
        </div>
    );
}

// ─── ROTACIONES POR PARCELA ────────────────────────────────────────────────────

function RotationsTimeline({
    months,
}: {
    months: ForageDashboard['balance']['months'];
}) {
    // Recolecta todas las parcelas y los meses en que aportan, con su contributedKgDM.
    const byPlot = new Map<
        string,
        {
            plotId: string;
            cropName: string;
            family?: string;
            monthly: Record<string, number>;
        }
    >();

    for (const m of months) {
        for (const r of m.activeRotations) {
            const prev = byPlot.get(r.plotId);
            if (prev) {
                prev.monthly[m.yearMonth] = (prev.monthly[m.yearMonth] ?? 0) + r.contributedKgDM;
            } else {
                byPlot.set(r.plotId, {
                    plotId: r.plotId,
                    cropName: r.cropName,
                    monthly: { [m.yearMonth]: r.contributedKgDM },
                });
            }
        }
    }

    if (byPlot.size === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
                <p className="text-sm text-gray-500 italic">
                    No hay rotaciones activas en el horizonte. Añade siembras
                    desde el editor de parcelas de cultivo en cada finca.
                </p>
            </div>
        );
    }

    const rows = Array.from(byPlot.values());

    return (
        <div className="bg-white rounded-xl border border-gray-100 p-5 overflow-x-auto">
            <h3 className="text-sm font-bold text-gray-900 mb-3">
                Cultivos por parcela
            </h3>
            <table className="w-full text-xs min-w-[600px]">
                <thead>
                    <tr className="text-gray-500">
                        <th className="px-2 py-1 text-left">Parcela</th>
                        <th className="px-2 py-1 text-left">Cultivo</th>
                        {months.map((m) => (
                            <th key={m.yearMonth} className="px-1 py-1 text-center">
                                {monthShort(m.yearMonth)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => {
                        const maxKg = Math.max(
                            ...Object.values(row.monthly),
                            1,
                        );
                        const color =
                            FAMILY_COLOR[row.family ?? 'default'] ?? FAMILY_COLOR.default;
                        return (
                            <tr key={row.plotId} className="border-t border-gray-50">
                                <td className="px-2 py-1 text-gray-700 truncate max-w-[120px]">
                                    {row.plotId.slice(-6)}
                                </td>
                                <td className="px-2 py-1 font-medium text-gray-900">
                                    {row.cropName}
                                </td>
                                {months.map((m) => {
                                    const kg = row.monthly[m.yearMonth] ?? 0;
                                    const intensity = kg / maxKg;
                                    return (
                                        <td
                                            key={m.yearMonth}
                                            className="p-0.5"
                                            title={
                                                kg > 0
                                                    ? `${formatMonth(m.yearMonth)} — ${kgToHuman(kg)} MS aportados`
                                                    : `${formatMonth(m.yearMonth)} — sin aporte`
                                            }
                                        >
                                            <div
                                                className="h-4 rounded"
                                                style={{
                                                    backgroundColor: color,
                                                    opacity: 0.15 + intensity * 0.85,
                                                }}
                                            />
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ─── HELPERS UI ────────────────────────────────────────────────────────────────

function SummaryCard({
    label,
    value,
    Icon,
    tone,
}: {
    label: string;
    value: string | number;
    Icon: typeof CheckCircle2;
    tone?: 'ok' | 'warn' | 'danger';
}) {
    const ring =
        tone === 'ok'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : tone === 'warn'
              ? 'border-amber-200 bg-amber-50 text-amber-700'
              : tone === 'danger'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-gray-100 bg-white text-gray-700';
    return (
        <div className={`rounded-xl border p-3 ${ring}`}>
            <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] uppercase tracking-wider font-medium">
                    {label}
                </p>
                <Icon className="w-4 h-4 shrink-0" />
            </div>
            <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
    );
}

function Legend({ color, label }: { color: string; label: string }) {
    return (
        <span className="inline-flex items-center gap-1">
            <span
                className="inline-block w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: color }}
            />
            {label}
        </span>
    );
}

function kgToHuman(kg: number): string {
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)} t`;
    return `${kg.toFixed(0)} kg`;
}

function monthShort(yearMonth: string): string {
    const [, m] = yearMonth.split('-');
    return MONTH_LABELS[Number(m) - 1] ?? m;
}

function formatMonth(yearMonth: string): string {
    const [y, m] = yearMonth.split('-');
    return `${MONTH_LABELS[Number(m) - 1]} ${y}`;
}

void MinusCircle; // placeholder import to keep tree-shake happy in some setups
