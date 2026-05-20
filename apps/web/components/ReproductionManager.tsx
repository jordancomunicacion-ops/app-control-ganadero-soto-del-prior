'use client';

import { useEffect, useState, useTransition } from 'react';
import {
    AlertTriangle,
    Baby,
    Heart,
    Loader2,
    Plus,
    Search,
} from 'lucide-react';
import { getFarms } from '@/app/lib/farm-actions';
import { getAnimals } from '@/app/lib/animal-actions';
import {
    getReproductionDashboard,
    recordReproductiveEvent,
    type ReproductionDashboard,
} from '@/app/lib/reproduction-actions';
import type { RepEventType } from '@/services/reproductionEngine';
import type { FarmLike, AnimalLike } from '@/types/livestock';

const EVENT_LABELS: Record<RepEventType, string> = {
    celo: 'Celo detectado',
    inseminacion: 'IA / IATF',
    cubricion: 'Cubrición (monta)',
    diagnostico_gestacion: 'Diagnóstico gestación',
    aborto: 'Aborto',
    parto: 'Parto',
    examen_andrologico: 'Examen andrológico',
};

export function ReproductionManager({ userId }: { userId?: string }) {
    const [farms, setFarms] = useState<FarmLike[]>([]);
    const [farmId, setFarmId] = useState<string | null>(null);
    const [dashboard, setDashboard] = useState<ReproductionDashboard | null>(null);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        if (!userId) return;
        getFarms(userId).then(({ data }) => {
            const list = (data as FarmLike[]) || [];
            setFarms(list);
            if (list[0]?.id) setFarmId(list[0].id);
        });
    }, [userId]);

    const reload = () => {
        if (farmId) getReproductionDashboard(farmId).then(setDashboard);
    };

    useEffect(reload, [farmId]);

    if (farms.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
                <Heart className="w-7 h-7 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                    Crea una finca para gestionar reproducción.
                </p>
            </div>
        );
    }

    if (!dashboard || !farmId) {
        return (
            <div className="text-sm text-gray-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Calculando…
            </div>
        );
    }

    const { metrics, radar, sireStats, activePregnancies, overdueChecks } = dashboard;

    return (
        <div className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Reproducción</h2>
                    <p className="text-sm text-gray-600">
                        Celo, IA/IATF, cubrición, diagnósticos, partos. Métricas
                        y radar de fertilidad del rebaño.
                    </p>
                </div>
                <div className="flex gap-2 items-end">
                    <select
                        value={farmId}
                        onChange={(e) => setFarmId(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                    >
                        {farms.map((f) => (
                            <option key={f.id} value={f.id}>
                                {f.name}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={() => setShowForm((s) => !s)}
                        className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-3 py-2 rounded-lg"
                    >
                        <Plus className="w-4 h-4" /> {showForm ? 'Cancelar' : 'Nuevo evento'}
                    </button>
                </div>
            </div>

            {showForm && (
                <RepEventForm
                    farmId={farmId}
                    userId={userId}
                    onSaved={() => {
                        setShowForm(false);
                        reload();
                    }}
                />
            )}

            {/* Métricas + radar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-1 bg-white rounded-xl border border-gray-100 p-5">
                    <h3 className="text-sm font-bold text-gray-900 mb-3">Radar reproductivo</h3>
                    <RadarChart radar={radar} />
                </div>
                <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                    <StatCard label="Hembras reproductoras" value={metrics.breedingFemales} />
                    <StatCard label="Gestantes" value={metrics.pregnant} tone="ok" />
                    <StatCard label="Vacías" value={metrics.empty} tone="info" />
                    <StatCard label="Novillas" value={metrics.heifers} />
                    <StatCard
                        label="Tasa preñez"
                        value={`${metrics.pregnancyRatePct.toFixed(0)} %`}
                        tone={
                            metrics.pregnancyRatePct >= 80
                                ? 'ok'
                                : metrics.pregnancyRatePct >= 60
                                  ? 'warn'
                                  : 'danger'
                        }
                    />
                    <StatCard
                        label="Días abiertos"
                        value={metrics.averageDaysOpen?.toFixed(0) ?? '—'}
                    />
                    <StatCard
                        label="IEP medio"
                        value={metrics.iepDias ? `${Math.round(metrics.iepDias)} d` : '—'}
                    />
                    <StatCard
                        label="Edad 1.er parto"
                        value={
                            metrics.edadPrimerPartoMeses
                                ? `${metrics.edadPrimerPartoMeses.toFixed(1)} m`
                                : '—'
                        }
                    />
                    <StatCard
                        label="Tasa reemplazo"
                        value={`${metrics.replacementRatePct.toFixed(0)} %`}
                    />
                </div>
            </div>

            {/* Gestaciones activas */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Baby className="w-4 h-4 text-emerald-600" />
                    Gestaciones activas ({activePregnancies.length})
                </h3>
                {activePregnancies.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">Ninguna confirmada aún.</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="text-left text-xs uppercase tracking-wider text-gray-500">
                            <tr>
                                <th className="py-2">Hembra</th>
                                <th className="py-2">Toro / IA</th>
                                <th className="py-2">Servicio</th>
                                <th className="py-2">Diagnóstico</th>
                                <th className="py-2">Parto previsto</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activePregnancies
                                .sort(
                                    (a, b) =>
                                        (a.estimatedCalvingDate?.getTime() ?? Infinity) -
                                        (b.estimatedCalvingDate?.getTime() ?? Infinity),
                                )
                                .map((p) => (
                                    <tr key={p.animalId} className="border-t border-gray-50">
                                        <td className="py-2 font-medium">{p.animalId}</td>
                                        <td className="py-2 text-gray-700">{p.sireId ?? '—'}</td>
                                        <td className="py-2 text-gray-600">
                                            {new Date(p.servicioDate).toLocaleDateString('es-ES')}
                                        </td>
                                        <td className="py-2 text-gray-600">
                                            {new Date(p.confirmedDate).toLocaleDateString('es-ES')}
                                        </td>
                                        <td className="py-2 font-medium text-emerald-700">
                                            {p.estimatedCalvingDate
                                                ? new Date(p.estimatedCalvingDate).toLocaleDateString('es-ES')
                                                : '—'}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Diagnósticos atrasados */}
            {overdueChecks.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
                    <h3 className="text-sm font-bold text-amber-700 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Diagnósticos atrasados ({overdueChecks.length})
                    </h3>
                    <p className="text-xs text-amber-700/80 mb-3">
                        Hembras con servicio hace más de 45 días sin diagnóstico de gestación.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {overdueChecks.map((o) => (
                            <span
                                key={o.animalId}
                                className="bg-white border border-amber-200 text-amber-700 text-xs px-2 py-1 rounded"
                                title={`Servicio: ${new Date(o.servicioDate).toLocaleDateString('es-ES')}`}
                            >
                                {o.animalId} · {Math.round(o.daysSinceService)} d
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Fertilidad por toro */}
            {sireStats.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <h3 className="text-sm font-bold text-gray-900 mb-3">
                        Fertilidad por toro / servicio
                    </h3>
                    <table className="w-full text-sm">
                        <thead className="text-left text-xs uppercase tracking-wider text-gray-500">
                            <tr>
                                <th className="py-2">Toro / Sire</th>
                                <th className="py-2 text-right">Servicios</th>
                                <th className="py-2 text-right">Confirmadas</th>
                                <th className="py-2 text-right">Tasa</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sireStats.map((s) => (
                                <tr key={s.sireId} className="border-t border-gray-50">
                                    <td className="py-2 font-medium">{s.sireId}</td>
                                    <td className="py-2 text-right tabular-nums">{s.services}</td>
                                    <td className="py-2 text-right tabular-nums">
                                        {s.confirmedPregnancies}
                                    </td>
                                    <td
                                        className={`py-2 text-right tabular-nums font-bold ${
                                            s.pregnancyRatePct >= 70
                                                ? 'text-emerald-700'
                                                : s.pregnancyRatePct >= 50
                                                  ? 'text-amber-700'
                                                  : 'text-red-700'
                                        }`}
                                    >
                                        {s.pregnancyRatePct.toFixed(0)} %
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── COMPONENTES ───────────────────────────────────────────────────────────────

function RadarChart({ radar }: { radar: ReproductionDashboard['radar'] }) {
    const size = 240;
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 30;
    const angleStep = (Math.PI * 2) / radar.length;

    const points = radar.map((p, i) => {
        const angle = -Math.PI / 2 + i * angleStep;
        const dist = r * Math.max(0, Math.min(1, p.score));
        return {
            x: cx + dist * Math.cos(angle),
            y: cy + dist * Math.sin(angle),
            labelX: cx + (r + 18) * Math.cos(angle),
            labelY: cy + (r + 18) * Math.sin(angle),
            axis: p.axis,
            value: p.valueText,
            score: p.score,
        };
    });

    const polygon = points.map((p) => `${p.x},${p.y}`).join(' ');
    // Anillos guía a 25/50/75/100% del radio
    const rings = [0.25, 0.5, 0.75, 1];

    return (
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto">
            {rings.map((g) => (
                <circle
                    key={g}
                    cx={cx}
                    cy={cy}
                    r={r * g}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="1"
                />
            ))}
            {/* Ejes radiales */}
            {radar.map((_, i) => {
                const angle = -Math.PI / 2 + i * angleStep;
                return (
                    <line
                        key={i}
                        x1={cx}
                        y1={cy}
                        x2={cx + r * Math.cos(angle)}
                        y2={cy + r * Math.sin(angle)}
                        stroke="#e5e7eb"
                        strokeWidth="1"
                    />
                );
            })}
            {/* Polígono */}
            <polygon
                points={polygon}
                fill="rgba(16, 185, 129, 0.25)"
                stroke="#10b981"
                strokeWidth="2"
            />
            {points.map((p, i) => (
                <g key={i}>
                    <circle cx={p.x} cy={p.y} r="3" fill="#059669" />
                    <text
                        x={p.labelX}
                        y={p.labelY}
                        textAnchor={
                            Math.abs(p.labelX - cx) < 10
                                ? 'middle'
                                : p.labelX > cx
                                  ? 'start'
                                  : 'end'
                        }
                        fontSize="9"
                        fontWeight="600"
                        fill="#374151"
                    >
                        {p.axis}
                    </text>
                    <text
                        x={p.labelX}
                        y={p.labelY + 11}
                        textAnchor={
                            Math.abs(p.labelX - cx) < 10
                                ? 'middle'
                                : p.labelX > cx
                                  ? 'start'
                                  : 'end'
                        }
                        fontSize="9"
                        fill="#6b7280"
                    >
                        {p.value}
                    </text>
                </g>
            ))}
        </svg>
    );
}

function StatCard({
    label,
    value,
    tone,
}: {
    label: string;
    value: string | number;
    tone?: 'ok' | 'warn' | 'danger' | 'info';
}) {
    const ring =
        tone === 'ok'
            ? 'bg-emerald-50 border-emerald-100'
            : tone === 'warn'
              ? 'bg-amber-50 border-amber-100'
              : tone === 'danger'
                ? 'bg-red-50 border-red-100'
                : tone === 'info'
                  ? 'bg-sky-50 border-sky-100'
                  : 'bg-white border-gray-100';
    return (
        <div className={`rounded-lg border p-3 ${ring}`}>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
                {label}
            </p>
            <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
    );
}

function RepEventForm({
    farmId,
    userId,
    onSaved,
}: {
    farmId: string;
    userId?: string;
    onSaved: () => void;
}) {
    const [animals, setAnimals] = useState<AnimalLike[]>([]);
    const [animalId, setAnimalId] = useState('');
    const [type, setType] = useState<RepEventType>('celo');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [sireId, setSireId] = useState('');
    const [method, setMethod] = useState<'IA' | 'IATF' | 'TE'>('IA');
    const [result, setResult] = useState<'positivo' | 'negativo'>('positivo');
    const [score, setScore] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, startSaving] = useTransition();
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (!userId) return;
        getAnimals(userId).then(({ data }) => {
            const list = ((data as unknown) as AnimalLike[]) ?? [];
            setAnimals(
                list.filter((a) => (a as unknown as { farmId?: string }).farmId === farmId),
            );
        });
    }, [farmId, userId]);

    const filtered = search
        ? animals.filter((a) => {
              const id = (a as unknown as { id: string }).id;
              return id.toLowerCase().includes(search.toLowerCase());
          })
        : animals;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!animalId) {
            alert('Selecciona un animal');
            return;
        }
        const data: Record<string, unknown> = {};
        if (type === 'inseminacion') {
            data.method = method;
            if (sireId) data.sireId = sireId;
        }
        if (type === 'cubricion' && sireId) {
            data.sireId = sireId;
        }
        if (type === 'diagnostico_gestacion') {
            data.result = result;
        }
        if (type === 'examen_andrologico' && score) {
            data.score = Number(score);
        }
        startSaving(async () => {
            try {
                await recordReproductiveEvent({
                    farmId,
                    animalId,
                    type,
                    date,
                    data: Object.keys(data).length > 0 ? data : undefined,
                    notes: notes || undefined,
                });
                onSaved();
            } catch (err) {
                alert((err as Error).message);
            }
        });
    };

    return (
        <form
            onSubmit={submit}
            className="bg-white rounded-xl border border-gray-100 p-4 grid grid-cols-1 md:grid-cols-2 gap-3"
        >
            <label className="text-xs text-gray-600 md:col-span-2">
                Animal *
                <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por crotal"
                        className="w-full border border-gray-200 rounded pl-8 pr-2 py-1.5 text-sm mt-0.5"
                    />
                </div>
                <select
                    required
                    value={animalId}
                    onChange={(e) => setAnimalId(e.target.value)}
                    size={4}
                    className="w-full border border-gray-200 rounded px-2 py-1 text-sm bg-white mt-1"
                >
                    {filtered.map((a) => {
                        const id = (a as unknown as { id: string }).id;
                        const sex = (a as unknown as { sex?: string }).sex;
                        return (
                            <option key={id} value={id}>
                                {id} {sex ? `· ${sex}` : ''}
                            </option>
                        );
                    })}
                </select>
            </label>

            <label className="text-xs text-gray-600">
                Tipo *
                <select
                    required
                    value={type}
                    onChange={(e) => setType(e.target.value as RepEventType)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm bg-white mt-0.5"
                >
                    {Object.entries(EVENT_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                            {v}
                        </option>
                    ))}
                </select>
            </label>

            <label className="text-xs text-gray-600">
                Fecha *
                <input
                    required
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm mt-0.5"
                />
            </label>

            {type === 'inseminacion' && (
                <label className="text-xs text-gray-600">
                    Método
                    <select
                        value={method}
                        onChange={(e) => setMethod(e.target.value as 'IA' | 'IATF' | 'TE')}
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm bg-white mt-0.5"
                    >
                        <option value="IA">IA convencional</option>
                        <option value="IATF">IATF (tiempo fijo)</option>
                        <option value="TE">Transferencia embriones</option>
                    </select>
                </label>
            )}

            {(type === 'inseminacion' || type === 'cubricion') && (
                <label className="text-xs text-gray-600">
                    Toro / sire ID
                    <input
                        value={sireId}
                        onChange={(e) => setSireId(e.target.value)}
                        placeholder="Identificador del toro o dosis"
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm mt-0.5"
                    />
                </label>
            )}

            {type === 'diagnostico_gestacion' && (
                <label className="text-xs text-gray-600">
                    Resultado *
                    <select
                        value={result}
                        onChange={(e) => setResult(e.target.value as 'positivo' | 'negativo')}
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm bg-white mt-0.5"
                    >
                        <option value="positivo">Positivo</option>
                        <option value="negativo">Negativo</option>
                    </select>
                </label>
            )}

            {type === 'examen_andrologico' && (
                <label className="text-xs text-gray-600">
                    Puntuación (0-100)
                    <input
                        type="number"
                        min={0}
                        max={100}
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm mt-0.5"
                    />
                </label>
            )}

            <label className="text-xs text-gray-600 md:col-span-2">
                Notas
                <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm mt-0.5"
                />
            </label>

            <div className="md:col-span-2 flex justify-end">
                <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:bg-gray-300"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Guardar evento
                </button>
            </div>
        </form>
    );
}
