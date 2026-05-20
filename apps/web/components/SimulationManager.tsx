'use client';

import { useEffect, useState, useTransition } from 'react';
import {
    BarChart3,
    Coins,
    Loader2,
    Play,
    RotateCcw,
    Save,
    TrendingDown,
    TrendingUp,
    Trash2,
} from 'lucide-react';
import { getFarms } from '@/app/lib/farm-actions';
import {
    runScenarioForFarm,
    saveSimulation,
    listSimulations,
    deleteSimulation,
    type ScenarioRun,
} from '@/app/lib/simulation-actions';
import { simulateCowProductivity } from '@/app/lib/productivity-actions';
import type { ScenarioDeltas } from '@/services/simulationEngine';
import type { FarmLike } from '@/types/livestock';

const LEVERS: Array<{
    key: keyof ScenarioDeltas;
    label: string;
    hint: string;
}> = [
    { key: 'priceSeurop', label: 'Precio SEUROP', hint: '€/kg canal' },
    { key: 'gmd', label: 'GMD', hint: 'kg/día' },
    { key: 'iepDias', label: 'IEP', hint: 'días entre partos' },
    { key: 'mortalidadPct', label: 'Mortalidad', hint: '%' },
    { key: 'costeAlim', label: 'Coste alimentación', hint: '€/año' },
    { key: 'costeSanidad', label: 'Coste sanidad', hint: '€/año' },
    { key: 'costeManoObra', label: 'Coste mano de obra', hint: '€/año' },
];

const EMPTY_DELTAS: ScenarioDeltas = {};

export function SimulationManager({ userId }: { userId?: string }) {
    const [farms, setFarms] = useState<FarmLike[]>([]);
    const [farmId, setFarmId] = useState<string | null>(null);
    const [deltas, setDeltas] = useState<ScenarioDeltas>(EMPTY_DELTAS);
    const [run, setRun] = useState<ScenarioRun | null>(null);
    const [saved, setSaved] = useState<Awaited<ReturnType<typeof listSimulations>> | null>(null);
    const [running, startRun] = useTransition();
    const [saving, startSave] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [name, setName] = useState('');

    useEffect(() => {
        if (!userId) return;
        getFarms(userId).then(({ data }) => {
            const list = (data as FarmLike[]) || [];
            setFarms(list);
            if (list[0]?.id) setFarmId(list[0].id);
        });
    }, [userId]);

    const reloadSaved = () => {
        if (farmId) listSimulations(farmId).then(setSaved);
    };

    useEffect(() => {
        reloadSaved();
        setRun(null);
        setDeltas(EMPTY_DELTAS);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [farmId]);

    const doRun = () => {
        if (!farmId) return;
        setError(null);
        startRun(async () => {
            try {
                const r = await runScenarioForFarm(farmId, deltas);
                setRun(r);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Error');
            }
        });
    };

    const doSave = () => {
        if (!run || !farmId) return;
        const label =
            name.trim() ||
            `Escenario ${new Date().toLocaleString('es-ES')}`;
        startSave(async () => {
            await saveSimulation({
                farmId,
                name: label,
                baseline: run.baseline,
                scenario: run.scenario,
                result: run.scenarioResult,
            });
            setName('');
            reloadSaved();
        });
    };

    if (farms.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
                <BarChart3 className="w-7 h-7 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                    Crea una finca para correr simulaciones económicas.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">¿Qué pasaría si…?</h2>
                    <p className="text-sm text-gray-600">
                        Mueve las palancas y descubre el impacto sobre el
                        margen anual. Modelo simplificado: precio, producción
                        y costes interactúan de forma multiplicativa.
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

            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                    {LEVERS.map((lever) => (
                        <Slider
                            key={lever.key}
                            label={lever.label}
                            hint={lever.hint}
                            value={deltas[lever.key] ?? 0}
                            onChange={(v) =>
                                setDeltas((p) => ({ ...p, [lever.key]: v }))
                            }
                        />
                    ))}
                </div>
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button
                        onClick={doRun}
                        disabled={running || !farmId}
                        className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-medium px-4 py-2 rounded-lg"
                    >
                        {running ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Play className="w-4 h-4" />
                        )}
                        Calcular
                    </button>
                    <button
                        onClick={() => {
                            setDeltas(EMPTY_DELTAS);
                            setRun(null);
                        }}
                        className="inline-flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg"
                    >
                        <RotateCcw className="w-4 h-4" /> Reset
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {run && (
                <>
                    <Results run={run} />
                    <Tornado run={run} />
                    <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap items-center gap-2">
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nombre del escenario (opcional)"
                            className="flex-1 min-w-[200px] border border-gray-200 rounded px-2 py-1.5 text-sm"
                        />
                        <button
                            onClick={doSave}
                            disabled={saving}
                            className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-medium px-3 py-1.5 rounded-lg"
                        >
                            {saving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            Guardar escenario
                        </button>
                    </div>
                </>
            )}

            {saved && saved.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <h3 className="text-sm font-bold text-gray-900 mb-2">
                        Escenarios guardados
                    </h3>
                    <ul className="divide-y divide-gray-100">
                        {saved.map((s) => (
                            <li
                                key={s.id}
                                className="py-2 flex items-start justify-between gap-2"
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900">{s.name}</p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(s.createdAt).toLocaleString('es-ES')}
                                    </p>
                                </div>
                                <button
                                    onClick={async () => {
                                        if (!confirm('¿Eliminar escenario?')) return;
                                        await deleteSimulation(s.id);
                                        reloadSaved();
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

            {/* Simulador específico de productividad por vaca nodriza */}
            <CowSimulator />
        </div>
    );
}

// ─── SIMULADOR DE PRODUCTIVIDAD POR VACA NODRIZA ───────────────────────────────

function CowSimulator() {
    const [iep, setIep] = useState(390);
    const [weaningRate, setWeaningRate] = useState(0.85);
    const [weaningWeightKg, setWeaningWeightKg] = useState(220);
    const [weaningPrice, setWeaningPrice] = useState(4.2);
    const [result, setResult] = useState<Awaited<ReturnType<typeof simulateCowProductivity>> | null>(null);
    const [running, startRun] = useTransition();

    const doRun = () => {
        startRun(async () => {
            const r = await simulateCowProductivity({
                iepDays: iep,
                weaningRate,
                weaningWeightKg,
                weaningPricePerKg: weaningPrice,
            });
            setResult(r);
        });
    };

    return (
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
            <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-500" />
                    Productividad por vaca nodriza
                </h3>
                <p className="text-sm text-gray-600 mt-0.5">
                    Mueve las palancas reproductivas y de mercado para ver cuánto
                    produce una vaca al año en cada escenario (venta al destete vs cebo).
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                <NumSlider
                    label="Intervalo entre partos (IEP)"
                    suffix="días"
                    min={365}
                    max={500}
                    step={5}
                    value={iep}
                    onChange={setIep}
                    hint="365 = óptimo · >420 = malo"
                />
                <NumSlider
                    label="Tasa de destete"
                    suffix="%"
                    min={60}
                    max={100}
                    step={1}
                    value={Math.round(weaningRate * 100)}
                    onChange={(v) => setWeaningRate(v / 100)}
                    hint="terneros destetados / partos"
                />
                <NumSlider
                    label="Peso al destete"
                    suffix="kg"
                    min={150}
                    max={300}
                    step={5}
                    value={weaningWeightKg}
                    onChange={setWeaningWeightKg}
                    hint="depende raza + manejo"
                />
                <NumSlider
                    label="Precio destete"
                    suffix="€/kg vivo"
                    min={3}
                    max={6}
                    step={0.1}
                    value={weaningPrice}
                    onChange={setWeaningPrice}
                    hint="ternero pasto, lonja"
                />
            </div>

            <button
                onClick={doRun}
                disabled={running}
                className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white text-sm font-medium px-4 py-2 rounded-lg"
            >
                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Calcular productividad
            </button>

            {result && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
                    <StatBox
                        label="Kg/vaca/año"
                        value={`${result.biological.kgWeanedPerYear.toFixed(0)} kg`}
                        sub={`${result.biological.weanedPerYear.toFixed(2)} terneros/año`}
                    />
                    <StatBox
                        label="Venta destete"
                        value={`${result.atWeaning.grossRevenueEur.toFixed(0)} €`}
                        sub={result.netAtWeaningEur != null
                            ? `${result.netAtWeaningEur.toFixed(0)} € neto`
                            : 'bruto'}
                        tone={result.netAtWeaningEur && result.netAtWeaningEur > 250 ? 'ok' : result.netAtWeaningEur && result.netAtWeaningEur > 100 ? 'warn' : 'danger'}
                    />
                    <StatBox
                        label="Cebo SEUROP"
                        value={`${result.atSlaughter.netRevenueEur.toFixed(0)} €`}
                        sub={result.netAtSlaughterEur != null
                            ? `${result.netAtSlaughterEur.toFixed(0)} € neto`
                            : 'tras cebo'}
                        tone={result.netAtSlaughterEur && result.netAtSlaughterEur > 250 ? 'ok' : result.netAtSlaughterEur && result.netAtSlaughterEur > 100 ? 'warn' : 'danger'}
                    />
                </div>
            )}
        </div>
    );
}

function NumSlider({
    label,
    suffix,
    min,
    max,
    step,
    value,
    onChange,
    hint,
}: {
    label: string;
    suffix: string;
    min: number;
    max: number;
    step: number;
    value: number;
    onChange: (v: number) => void;
    hint?: string;
}) {
    return (
        <label className="block">
            <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <span className="text-xs font-bold tabular-nums text-amber-700">
                    {value} {suffix}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full accent-amber-500"
            />
            {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
        </label>
    );
}

function StatBox({
    label,
    value,
    sub,
    tone,
}: {
    label: string;
    value: string;
    sub?: string;
    tone?: 'ok' | 'warn' | 'danger';
}) {
    const ring =
        tone === 'ok'
            ? 'bg-emerald-50 border-emerald-100'
            : tone === 'warn'
              ? 'bg-amber-50 border-amber-100'
              : tone === 'danger'
                ? 'bg-red-50 border-red-100'
                : 'bg-white border-gray-100';
    return (
        <div className={`rounded-lg border p-3 ${ring}`}>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
                {label}
            </p>
            <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
            {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        </div>
    );
}

function Slider({
    label,
    hint,
    value,
    onChange,
}: {
    label: string;
    hint: string;
    value: number;
    onChange: (v: number) => void;
}) {
    const pct = Math.round(value * 100);
    return (
        <label className="block">
            <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <span
                    className={`text-xs font-bold tabular-nums ${
                        pct > 0
                            ? 'text-emerald-600'
                            : pct < 0
                              ? 'text-red-600'
                              : 'text-gray-400'
                    }`}
                >
                    {pct > 0 ? '+' : ''}
                    {pct} %
                </span>
            </div>
            <input
                type="range"
                min={-20}
                max={20}
                step={1}
                value={pct}
                onChange={(e) => onChange(Number(e.target.value) / 100)}
                className="w-full accent-green-600"
            />
            <p className="text-[11px] text-gray-400">{hint}</p>
        </label>
    );
}

function Results({ run }: { run: ScenarioRun }) {
    const diff = (key: 'margenTotal' | 'ingresos' | 'costeTotal' | 'carcassKg') =>
        run.scenarioResult[key] - run.baselineResult[key];

    const cards = [
        { label: 'Margen anual', baseline: run.baselineResult.margenTotal, value: run.scenarioResult.margenTotal, unit: '€', better: 'higher' as const },
        { label: 'Ingresos', baseline: run.baselineResult.ingresos, value: run.scenarioResult.ingresos, unit: '€', better: 'higher' as const },
        { label: 'Coste total', baseline: run.baselineResult.costeTotal, value: run.scenarioResult.costeTotal, unit: '€', better: 'lower' as const },
        { label: 'Producción canal', baseline: run.baselineResult.carcassKg, value: run.scenarioResult.carcassKg, unit: 'kg', better: 'higher' as const },
        { label: 'Margen €/kg canal', baseline: run.baselineResult.margenPorKgCanal, value: run.scenarioResult.margenPorKgCanal, unit: '€/kg', better: 'higher' as const },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {cards.map((c) => {
                const d = c.value - c.baseline;
                const positive =
                    c.better === 'higher' ? d > 0 : d < 0;
                const negative =
                    c.better === 'higher' ? d < 0 : d > 0;
                return (
                    <div
                        key={c.label}
                        className="bg-white rounded-xl border border-gray-100 p-4"
                    >
                        <p className="text-[11px] uppercase tracking-wider font-medium text-gray-500">
                            {c.label}
                        </p>
                        <p className="text-xl font-bold text-gray-900 mt-1 tabular-nums">
                            {fmtNumber(c.value, c.unit)}
                        </p>
                        <p
                            className={`text-xs mt-1 inline-flex items-center gap-1 ${
                                positive
                                    ? 'text-emerald-600'
                                    : negative
                                      ? 'text-red-600'
                                      : 'text-gray-400'
                            }`}
                        >
                            {positive && <TrendingUp className="w-3 h-3" />}
                            {negative && <TrendingDown className="w-3 h-3" />}
                            {d > 0 ? '+' : ''}
                            {fmtNumber(d, c.unit)}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}

function Tornado({ run }: { run: ScenarioRun }) {
    const rows = run.tornado;
    const max = Math.max(
        ...rows.map((r) => Math.max(Math.abs(r.bestCase), Math.abs(r.worstCase))),
    );
    if (max === 0) return null;
    return (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-1">
                Sensibilidad ±10 %
            </h3>
            <p className="text-xs text-gray-500 mb-3">
                Cuánto cambia el margen anual si cada palanca varía un 10 %.
                Las palancas están ordenadas por impacto económico.
            </p>
            <div className="space-y-2">
                {rows.map((r) => {
                    const leftPct = (Math.abs(r.worstCase) / max) * 50;
                    const rightPct = (Math.abs(r.bestCase) / max) * 50;
                    return (
                        <div key={r.lever} className="flex items-center gap-2 text-xs">
                            <div className="w-32 shrink-0 text-gray-700 font-medium truncate">
                                {r.label}
                            </div>
                            <div className="flex-1 relative h-5">
                                <div className="absolute inset-y-0 left-1/2 w-px bg-gray-300" />
                                <div
                                    className="absolute bg-red-200/80 border border-red-300 right-1/2 top-0 bottom-0 rounded-l-sm"
                                    style={{ width: `${leftPct}%` }}
                                    title={`Peor caso: ${fmtNumber(r.worstCase, '€')}`}
                                />
                                <div
                                    className="absolute bg-emerald-200/80 border border-emerald-300 left-1/2 top-0 bottom-0 rounded-r-sm"
                                    style={{ width: `${rightPct}%` }}
                                    title={`Mejor caso: ${fmtNumber(r.bestCase, '€')}`}
                                />
                            </div>
                            <div className="w-28 shrink-0 text-right tabular-nums text-gray-500">
                                ±{fmtNumber(r.rangeAbs / 2, '€', 0)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function fmtNumber(n: number, unit: string, digits = 0): string {
    if (!Number.isFinite(n)) return '—';
    const abs = Math.abs(n);
    if (unit === '€' || unit === 'kg') {
        if (abs >= 1000) {
            return `${(n / 1000).toFixed(1)}k ${unit}`;
        }
        return `${n.toFixed(digits)} ${unit}`;
    }
    return `${n.toFixed(2)} ${unit}`;
}
