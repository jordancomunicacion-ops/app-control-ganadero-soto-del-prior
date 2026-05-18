'use client';

import React, { useEffect, useState } from 'react';
import { glossary } from '@/lib/glossary';
import { eur, downloadCSV, rowsToCSV } from '@/lib/csv-export';
import {
    generateEconomicReport,
    generateReproductiveReport,
    generateFCRReport,
    getReportFilterOptions,
    type EconomicReport,
    type ReproductiveReport,
    type FCRReport,
} from '@/app/lib/reports-actions';
import { getFarms } from '@/app/lib/farm-actions';
import { Download, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

type ReportKind = 'economic' | 'reproductive' | 'fcr';
type FarmOption = { id: string; name: string };

// Filtros compartidos por los tres modales. Replican `ReportFilters` del backend.
interface UIFilters {
    farmId: string;
    animalId: string;
    corral: string;
    category: string;
    breedName: string;
    role: '' | 'nodriza' | 'novilla' | 'anoja' | 'ternera' | 'becerra';
    sex: '' | 'Hembra' | 'Macho' | 'Castrado';
}

const EMPTY_FILTERS: UIFilters = {
    farmId: '', animalId: '', corral: '', category: '', breedName: '', role: '', sex: '',
};

function toBackendFilters(f: UIFilters) {
    return {
        farmId: f.farmId || undefined,
        animalId: f.animalId || undefined,
        corral: f.corral || undefined,
        category: f.category || undefined,
        breedName: f.breedName || undefined,
        role: f.role || undefined,
        sex: f.sex || undefined,
    };
}

interface FilterOptions {
    animals: { id: string; label: string; corral: string | null; sex: string | null; breedName: string | null; category: string | null }[];
    corrals: string[];
    categories: string[];
    breeds: string[];
}

export function ReportsManager() {
    const [open, setOpen] = useState<ReportKind | null>(null);
    const [farms, setFarms] = useState<FarmOption[]>([]);

    useEffect(() => {
        let cancelled = false;
        getFarms().then(({ data }) => {
            if (cancelled) return;
            const rows = data as unknown as Array<{ id: string; name: string }>;
            setFarms(rows.map((f) => ({ id: f.id, name: f.name })));
        }).catch(() => { /* noop */ });
        return () => { cancelled = true; };
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Reportes</h2>
                <p className="text-gray-600">Generación de informes y estadísticas</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ReportCard
                    icon="📊"
                    title="Informe Económico"
                    subtitle="Ingresos por ventas y PAC, costes de eventos y mortalidad, valor de inventario."
                    longHelp={glossary('report_economic')?.plain ?? ''}
                    onClick={() => setOpen('economic')}
                />

                <ReportCard
                    icon="📈"
                    title="Informe de Rendimiento (FCR)"
                    subtitle="GMD por animal a partir de pesajes, ingesta objetivo y eficiencia alimentaria."
                    longHelp={glossary('report_fcr')?.plain ?? ''}
                    onClick={() => setOpen('fcr')}
                />

                <ReportCard
                    icon="🧬"
                    title="Informe Reproductivo"
                    subtitle="Tasa de fertilidad, partos, intervalo entre partos y estado sanitario actual."
                    longHelp={glossary('report_reproductive')?.plain ?? ''}
                    onClick={() => setOpen('reproductive')}
                />
            </div>

            {open === 'economic' && (
                <EconomicReportModal farms={farms} onClose={() => setOpen(null)} />
            )}
            {open === 'reproductive' && (
                <ReproductiveReportModal farms={farms} onClose={() => setOpen(null)} />
            )}
            {open === 'fcr' && (
                <FCRReportModal farms={farms} onClose={() => setOpen(null)} />
            )}
        </div>
    );
}

// ───────────────────────────────────────────────────────────────────────
// Card reutilizable
// ───────────────────────────────────────────────────────────────────────

function ReportCard({ icon, title, subtitle, longHelp, onClick }: {
    icon: string; title: string; subtitle: string; longHelp: string; onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="text-left bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-green-300 hover:shadow-md transition-all group"
        >
            <span className="text-3xl mb-4 block group-hover:scale-110 transition-transform">{icon}</span>
            <h3 className="font-bold text-lg text-gray-800 mb-2">{title}</h3>
            <p className="text-gray-600 text-sm mb-2">{subtitle}</p>
            {longHelp && (
                <p className="text-[11px] italic text-gray-400 leading-snug">{longHelp}</p>
            )}
            <p className="text-xs font-bold text-green-700 mt-3 group-hover:translate-x-1 transition-transform">
                Generar informe →
            </p>
        </button>
    );
}

// ───────────────────────────────────────────────────────────────────────
// Layout común del modal
// ───────────────────────────────────────────────────────────────────────

function ReportModal({ title, subtitle, onClose, children }: {
    title: string; subtitle?: string; onClose: () => void; children: React.ReactNode;
}) {
    // Cerrar con Escape para mejorar accesibilidad.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4 md:p-6"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            {/* Tarjeta: altura acotada con dvh (mejor en móvil con barras dinámicas)
                + fallback a vh. flex-col para separar header/body y que solo el body
                tenga scroll — así el botón X queda siempre visible. */}
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col"
                style={{ maxHeight: 'min(95dvh, 95vh)' }}
            >
                {/* Header fijo (no se desplaza con el scroll del body) */}
                <div className="flex justify-between items-start gap-4 px-4 sm:px-6 py-4 border-b border-gray-100 rounded-t-xl shrink-0">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800 truncate">{title}</h2>
                        {subtitle && (
                            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 break-words line-clamp-2">{subtitle}</p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="shrink-0 text-gray-400 hover:text-gray-900 p-1 -m-1 rounded hover:bg-gray-100"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                {/* Body con scroll propio */}
                <div className="overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-6 grow">
                    {children}
                </div>
            </div>
        </div>
    );
}

function FiltersBar({
    year, setYear, filters, setFilters, farms, options, hideYear,
    reportKind,
}: {
    year: number; setYear: (y: number) => void;
    filters: UIFilters; setFilters: (f: UIFilters) => void;
    farms: FarmOption[];
    options: FilterOptions | null;
    hideYear?: boolean;
    reportKind: ReportKind;
}) {
    const currentYear = new Date().getFullYear();
    const yearOptions = [currentYear - 2, currentYear - 1, currentYear];
    const [expanded, setExpanded] = useState(false);

    // Rol solo aplica al reproductivo (limitado a hembras). En económico/FCR
    // se acepta también para acotar inventario.
    const showRole = true;
    const set = (patch: Partial<UIFilters>) => setFilters({ ...filters, ...patch });

    const active = (Object.entries(filters) as [keyof UIFilters, string][])
        .filter(([k, v]) => v && k !== 'farmId').length;

    return (
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-3">
            {/* Fila 1 — Finca + Campaña + toggle filtros avanzados */}
            <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-bold text-gray-600 block mb-1">Finca</label>
                    <select
                        value={filters.farmId} onChange={(e) => set({ farmId: e.target.value, animalId: '', corral: '' })}
                        className="w-full border rounded-lg px-3 py-2 bg-white text-sm"
                    >
                        <option value="">Todas las fincas</option>
                        {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                </div>
                {!hideYear && (
                    <div className="w-40">
                        <label className="text-xs font-bold text-gray-600 block mb-1">Campaña</label>
                        <select
                            value={year} onChange={(e) => setYear(parseInt(e.target.value))}
                            className="w-full border rounded-lg px-3 py-2 bg-white text-sm"
                        >
                            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                )}
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="text-xs font-bold px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-1"
                >
                    {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    Filtros{active > 0 ? ` (${active})` : ''}
                </button>
            </div>

            {/* Fila 2 — filtros finos */}
            {expanded && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-gray-200">
                    <div>
                        <label className="text-xs font-bold text-gray-600 block mb-1">Animal individual</label>
                        <select
                            value={filters.animalId} onChange={(e) => set({ animalId: e.target.value })}
                            className="w-full border rounded-lg px-3 py-2 bg-white text-sm"
                            disabled={!options || options.animals.length === 0}
                        >
                            <option value="">— Todos —</option>
                            {options?.animals.map((a) => (
                                <option key={a.id} value={a.id}>{a.label}</option>
                            ))}
                        </select>
                        {options && options.animals.length === 0 && (
                            <p className="text-[10px] italic text-gray-400 mt-1">No hay animales en esta finca.</p>
                        )}
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-600 block mb-1">Corral</label>
                        <select
                            value={filters.corral} onChange={(e) => set({ corral: e.target.value })}
                            className="w-full border rounded-lg px-3 py-2 bg-white text-sm"
                        >
                            <option value="">— Todos —</option>
                            {options?.corrals.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-600 block mb-1">Categoría</label>
                        <select
                            value={filters.category} onChange={(e) => set({ category: e.target.value })}
                            className="w-full border rounded-lg px-3 py-2 bg-white text-sm"
                        >
                            <option value="">— Todas —</option>
                            {options?.categories.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-600 block mb-1">Raza</label>
                        <select
                            value={filters.breedName} onChange={(e) => set({ breedName: e.target.value })}
                            className="w-full border rounded-lg px-3 py-2 bg-white text-sm"
                        >
                            <option value="">— Todas —</option>
                            {options?.breeds.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-600 block mb-1">Sexo</label>
                        <select
                            value={filters.sex} onChange={(e) => set({ sex: e.target.value as UIFilters['sex'] })}
                            className="w-full border rounded-lg px-3 py-2 bg-white text-sm"
                            disabled={reportKind === 'reproductive'}
                        >
                            <option value="">— Todos —</option>
                            <option value="Hembra">Hembra</option>
                            <option value="Macho">Macho</option>
                            <option value="Castrado">Castrado</option>
                        </select>
                        {reportKind === 'reproductive' && (
                            <p className="text-[10px] italic text-gray-400 mt-1">Reproductivo se acota a hembras.</p>
                        )}
                    </div>
                    {showRole && (
                        <div>
                            <label className="text-xs font-bold text-gray-600 block mb-1">Rol reproductivo</label>
                            <select
                                value={filters.role} onChange={(e) => set({ role: e.target.value as UIFilters['role'] })}
                                className="w-full border rounded-lg px-3 py-2 bg-white text-sm"
                            >
                                <option value="">— Todos —</option>
                                <option value="nodriza">Vaca nodriza (≥1 parto)</option>
                                <option value="novilla">Novilla (sin partos)</option>
                                <option value="anoja">Añoja (12–24 m)</option>
                                <option value="ternera">Ternera (6–12 m)</option>
                                <option value="becerra">Becerra (&lt;6 m)</option>
                            </select>
                        </div>
                    )}
                    <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
                        <button
                            type="button"
                            onClick={() => setFilters({ ...EMPTY_FILTERS, farmId: filters.farmId })}
                            className="text-xs text-gray-500 hover:text-gray-700 underline"
                        >
                            Limpiar filtros
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Hook compartido por los tres modales: gestiona los filtros y carga las
 * opciones (animales/corrales/categorías/razas) cuando cambia la finca.
 */
function useReportControls() {
    const [filters, setFilters] = useState<UIFilters>(EMPTY_FILTERS);
    const [options, setOptions] = useState<FilterOptions | null>(null);

    useEffect(() => {
        let cancelled = false;
        getReportFilterOptions(filters.farmId || undefined)
            .then((opts) => { if (!cancelled) setOptions(opts); })
            .catch(() => { /* noop */ });
        return () => { cancelled = true; };
    }, [filters.farmId]);

    return { filters, setFilters, options };
}

function Kpi({ label, value, sub, color }: { label: string; value: React.ReactNode; sub?: string; color?: 'green' | 'red' | 'amber' | 'gray' }) {
    const colorMap = {
        green: 'bg-green-50 text-green-800 border-green-100',
        red: 'bg-red-50 text-red-800 border-red-100',
        amber: 'bg-amber-50 text-amber-800 border-amber-100',
        gray: 'bg-gray-50 text-gray-800 border-gray-100',
    } as const;
    return (
        <div className={`p-4 rounded-lg border ${colorMap[color ?? 'gray']}`}>
            <p className="text-[10px] uppercase font-bold tracking-wider opacity-70">{label}</p>
            <p className="text-2xl font-black mt-1">{value}</p>
            {sub && <p className="text-[11px] italic opacity-70 mt-1">{sub}</p>}
        </div>
    );
}

// ───────────────────────────────────────────────────────────────────────
// 1. ECONOMIC
// ───────────────────────────────────────────────────────────────────────

function EconomicReportModal({ farms, onClose }: { farms: FarmOption[]; onClose: () => void }) {
    const { filters, setFilters, options } = useReportControls();
    const [year, setYear] = useState(new Date().getFullYear());
    const [data, setData] = useState<(EconomicReport & { subject: string }) | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const run = async () => {
        setLoading(true); setErr(null);
        try {
            const r = await generateEconomicReport({ ...toBackendFilters(filters), year });
            setData(r);
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'Error desconocido');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { run(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, []);

    const exportCsv = () => {
        if (!data) return;
        const lines: string[] = [];
        lines.push(`Informe Económico;${data.farmName};Campaña ${data.year}`);
        lines.push('');
        lines.push('INGRESOS');
        lines.push(`Ventas animales;${data.income.animalSales.count} cabezas;${data.income.animalSales.totalEur}`);
        for (const [cat, b] of Object.entries(data.income.animalSales.byCategory)) {
            lines.push(`  ${cat};${b.count};${b.eur}`);
        }
        lines.push(`Cultivos vendidos;;${data.income.cropSales.totalEur}`);
        for (const it of data.income.cropSales.items) {
            lines.push(`  ${it.crop};${it.yieldT} t;${it.eur}`);
        }
        lines.push(`Ayudas PAC;Campaña ${data.income.pacAids.campaignYear ?? '-'};${data.income.pacAids.totalEur}`);
        lines.push(`TOTAL INGRESOS;;${data.income.total}`);
        lines.push('');
        lines.push('COSTES');
        for (const e of data.costs.events) lines.push(`${e.type};;${e.totalEur}`);
        lines.push(`Mortalidad;${data.costs.mortality.count} cabezas;${data.costs.mortality.estimatedLossEur}`);
        lines.push(`TOTAL COSTES;;${data.costs.total}`);
        lines.push('');
        lines.push(`BALANCE;;${data.balance}`);
        lines.push('');
        lines.push('INVENTARIO ACTUAL');
        for (const r of data.inventory.byCategory) {
            lines.push(`${r.category};${r.count} cabezas;${r.avgWeightKg} kg medio;${r.estValueEur}`);
        }
        lines.push(`TOTAL INVENTARIO;${data.inventory.totalCount} cabezas;;${data.inventory.totalEstValueEur}`);
        downloadCSV(lines.join('\n'), `informe_economico_${data.year}.csv`);
    };

    return (
        <ReportModal
            title="Informe Económico"
            subtitle={data ? `${data.subject} · Campaña ${data.year}` : undefined}
            onClose={onClose}
        >
            <FiltersBar
                year={year} setYear={setYear}
                filters={filters} setFilters={setFilters}
                farms={farms} options={options}
                reportKind="economic"
            />
            <div className="flex gap-2">
                <button onClick={run} disabled={loading} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Regenerar
                </button>
                {data && (
                    <button onClick={exportCsv} className="bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                        <Download className="w-4 h-4" /> Descargar CSV
                    </button>
                )}
            </div>

            {err && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{err}</div>}

            {data && !loading && (
                <>
                    {/* KPIs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Kpi label="Ingresos" value={eur(data.income.total)} color="green" />
                        <Kpi label="Costes" value={eur(data.costs.total)} color="red" />
                        <Kpi label="Balance" value={eur(data.balance)} color={data.balance >= 0 ? 'green' : 'red'} sub={data.balance >= 0 ? 'Saldo positivo' : 'Saldo negativo'} />
                        <Kpi label="Inventario" value={eur(data.inventory.totalEstValueEur)} sub={`${data.inventory.totalCount} cabezas activas`} />
                    </div>

                    {/* Ingresos detalle */}
                    <Section title="Ingresos">
                        <DetailTable rows={[
                            { concepto: 'Ventas de animales', detalle: `${data.income.animalSales.count} cabezas`, importe: data.income.animalSales.totalEur },
                            ...Object.entries(data.income.animalSales.byCategory).map(([cat, b]) => ({
                                concepto: `  ↳ ${cat}`,
                                detalle: `${b.count} cabezas`,
                                importe: b.eur,
                            })),
                            { concepto: 'Cultivos vendidos', detalle: `${data.income.cropSales.items.length} cultivos`, importe: data.income.cropSales.totalEur },
                            ...data.income.cropSales.items.map((it) => ({
                                concepto: `  ↳ ${it.crop}`,
                                detalle: `${it.yieldT.toFixed(2)} t`,
                                importe: it.eur,
                            })),
                            { concepto: 'Ayudas PAC', detalle: data.income.pacAids.campaignYear ? `Campaña ${data.income.pacAids.campaignYear}` : '-', importe: data.income.pacAids.totalEur },
                        ]} totalLabel="Total ingresos" totalEur={data.income.total} />
                    </Section>

                    {/* Costes detalle */}
                    <Section title="Costes">
                        <DetailTable rows={[
                            ...data.costs.events.map((e) => ({ concepto: e.type, detalle: '', importe: e.totalEur })),
                            { concepto: 'Mortalidad', detalle: `${data.costs.mortality.count} cabezas (valor estimado)`, importe: data.costs.mortality.estimatedLossEur },
                        ]} totalLabel="Total costes" totalEur={data.costs.total} />
                    </Section>

                    {/* Inventario */}
                    <Section title="Inventario actual valorado">
                        <table className="w-full text-sm">
                            <thead className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-100">
                                <tr>
                                    <th className="pb-2">Categoría</th>
                                    <th className="pb-2 text-right">Cabezas</th>
                                    <th className="pb-2 text-right">Peso medio</th>
                                    <th className="pb-2 text-right">Valor estimado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.inventory.byCategory.map((r) => (
                                    <tr key={r.category} className="border-b border-gray-50">
                                        <td className="py-2">{r.category}</td>
                                        <td className="py-2 text-right">{r.count}</td>
                                        <td className="py-2 text-right">{r.avgWeightKg} kg</td>
                                        <td className="py-2 text-right font-bold">{eur(r.estValueEur)}</td>
                                    </tr>
                                ))}
                                <tr className="font-bold">
                                    <td className="py-2">Total</td>
                                    <td className="py-2 text-right">{data.inventory.totalCount}</td>
                                    <td></td>
                                    <td className="py-2 text-right">{eur(data.inventory.totalEstValueEur)}</td>
                                </tr>
                            </tbody>
                        </table>
                        <p className="text-[11px] italic text-gray-400 mt-2">
                            Valoración orientativa basada en RC medio 55 % y precio canal 7.5 €/kg. La valoración fina llegará al integrar el módulo de precios SEUROP por categoría.
                        </p>
                    </Section>
                </>
            )}
        </ReportModal>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-600 border-b border-gray-100 pb-2 mb-3">{title}</h3>
            {children}
        </div>
    );
}

function DetailTable({ rows, totalLabel, totalEur }: {
    rows: { concepto: string; detalle: string; importe: number }[];
    totalLabel: string; totalEur: number;
}) {
    if (rows.length === 0) {
        return <p className="text-sm italic text-gray-400 py-2">Sin movimientos registrados.</p>;
    }
    return (
        <table className="w-full text-sm">
            <tbody>
                {rows.map((r, i) => (
                    <tr key={i} className="border-b border-gray-50">
                        <td className="py-2 whitespace-pre-wrap">{r.concepto}</td>
                        <td className="py-2 text-xs text-gray-500">{r.detalle}</td>
                        <td className="py-2 text-right font-medium">{eur(r.importe)}</td>
                    </tr>
                ))}
                <tr className="font-bold">
                    <td className="py-2">{totalLabel}</td>
                    <td></td>
                    <td className="py-2 text-right">{eur(totalEur)}</td>
                </tr>
            </tbody>
        </table>
    );
}

// ───────────────────────────────────────────────────────────────────────
// 2. REPRODUCTIVE
// ───────────────────────────────────────────────────────────────────────

function ReproductiveReportModal({ farms, onClose }: { farms: FarmOption[]; onClose: () => void }) {
    const { filters, setFilters, options } = useReportControls();
    const [year, setYear] = useState(new Date().getFullYear());
    const [data, setData] = useState<(ReproductiveReport & { subject: string }) | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const run = async () => {
        setLoading(true); setErr(null);
        try {
            const r = await generateReproductiveReport({ ...toBackendFilters(filters), year });
            setData(r);
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'Error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { run(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, []);

    const exportCsv = () => {
        if (!data) return;
        const csv = rowsToCSV(data.cows.map((c) => ({
            id: c.id,
            rol: c.isNurseCow ? 'Vaca nodriza' : 'Novilla',
            edad_meses: c.ageMonths,
            partos_totales: c.parityCount,
            ultimo_parto: c.lastBirthDate ?? '',
            dias_desde_ultimo_parto: c.daysSinceLastBirth ?? '',
            intervalo_dias: c.intervalDays ?? '',
            inseminaciones_periodo: c.inseminationsInPeriod,
            partos_periodo: c.births,
            estado: c.currentStatus,
        })));
        downloadCSV(csv, `informe_reproductivo_${data.period.from}_a_${data.period.to}.csv`);
    };

    return (
        <ReportModal
            title="Informe Reproductivo"
            subtitle={data ? `${data.subject} · ${data.period.from} → ${data.period.to}` : undefined}
            onClose={onClose}
        >
            <FiltersBar
                year={year} setYear={setYear}
                filters={filters} setFilters={setFilters}
                farms={farms} options={options}
                reportKind="reproductive"
            />
            <div className="flex gap-2">
                <button onClick={run} disabled={loading} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Regenerar
                </button>
                {data && (
                    <button onClick={exportCsv} className="bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                        <Download className="w-4 h-4" /> Descargar CSV
                    </button>
                )}
            </div>

            {err && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{err}</div>}

            {data && !loading && (
                <>
                    {/* KPIs — primera fila distingue rol */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Kpi
                            label="Vacas nodrizas"
                            value={data.summary.nurseCows}
                            sub="≥1 parto registrado"
                            color="green"
                        />
                        <Kpi
                            label="Novillas (sin partos)"
                            value={data.summary.heifers}
                            sub="≥18 m, aún no han parido"
                            color="amber"
                        />
                        <Kpi label="Partos en el período" value={data.summary.births} color="green" />
                        <Kpi
                            label="Tasa de fertilidad"
                            value={`${data.summary.fertilityRatePct}%`}
                            sub="positivos / inseminaciones"
                            color={data.summary.fertilityRatePct >= 50 ? 'green' : 'amber'}
                        />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Kpi
                            label="Intervalo medio"
                            value={data.summary.avgCalvingIntervalDays ? `${data.summary.avgCalvingIntervalDays} d` : '—'}
                            sub="entre partos"
                            color={data.summary.avgCalvingIntervalDays && data.summary.avgCalvingIntervalDays <= 400 ? 'green' : 'amber'}
                        />
                        <Kpi label="Inseminaciones" value={data.summary.inseminations} />
                        <Kpi label="Diag. positivos" value={data.summary.diagnosesPositive} color="green" />
                        <Kpi label="Abortos" value={data.summary.abortions} color={data.summary.abortions > 0 ? 'red' : 'gray'} />
                    </div>

                    {/* Saneamiento */}
                    <Section title="Estado sanitario">
                        {data.sanitary.lastSaneamiento ? (
                            <div className="bg-gray-50 p-3 rounded-lg text-sm">
                                <p>
                                    Último saneamiento: <strong>{data.sanitary.lastSaneamiento.date}</strong>
                                    <span className="text-gray-500"> · hace {data.sanitary.lastSaneamientoDaysAgo} días</span>
                                </p>
                                <p>Resultado: <strong className={data.sanitary.lastSaneamiento.result.toLowerCase().includes('positiv') ? 'text-red-700' : 'text-green-700'}>{data.sanitary.lastSaneamiento.result}</strong></p>
                                {data.sanitary.lastSaneamientoDaysAgo && data.sanitary.lastSaneamientoDaysAgo > 365 && (
                                    <p className="text-amber-700 text-xs italic mt-1">⚠ Más de un año desde el último saneamiento — campaña pendiente.</p>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm italic text-gray-400">No hay registro de saneamientos.</p>
                        )}
                    </Section>

                    {/* Tabla hembras */}
                    <Section title="Detalle por hembra reproductora">
                        {data.cows.length === 0 ? (
                            <p className="text-sm italic text-gray-400">No hay hembras reproductoras (≥18 meses) en esta finca.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-100">
                                        <tr>
                                            <th className="pb-2">ID</th>
                                            <th className="pb-2">Rol</th>
                                            <th className="pb-2 text-right">Edad</th>
                                            <th className="pb-2 text-right">Partos totales</th>
                                            <th className="pb-2">Último parto</th>
                                            <th className="pb-2 text-right">Días desde último</th>
                                            <th className="pb-2 text-right">Intervalo</th>
                                            <th className="pb-2 text-right">IA periodo</th>
                                            <th className="pb-2">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.cows.map((c) => (
                                            <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                                                <td className="py-2 font-mono text-xs">{c.id.slice(-8)}</td>
                                                <td className="py-2">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.isNurseCow ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                                        {c.isNurseCow ? 'Nodriza' : 'Novilla'}
                                                    </span>
                                                </td>
                                                <td className="py-2 text-right">{c.ageMonths.toFixed(0)} m</td>
                                                <td className="py-2 text-right">{c.parityCount}</td>
                                                <td className="py-2">{c.lastBirthDate ?? '—'}</td>
                                                <td className="py-2 text-right">{c.daysSinceLastBirth ?? '—'}</td>
                                                <td className={`py-2 text-right ${c.intervalDays && c.intervalDays > 450 ? 'text-amber-700' : ''}`}>{c.intervalDays ?? '—'}</td>
                                                <td className="py-2 text-right">{c.inseminationsInPeriod}</td>
                                                <td className="py-2"><StatusBadge status={c.currentStatus} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Section>
                </>
            )}
        </ReportModal>
    );
}

function StatusBadge({ status }: { status: ReproductiveReport['cows'][number]['currentStatus'] }) {
    const map: Record<string, string> = {
        'Gestante': 'bg-green-50 text-green-700 border-green-100',
        'Parida reciente': 'bg-emerald-50 text-emerald-700 border-emerald-100',
        'Postparto': 'bg-blue-50 text-blue-700 border-blue-100',
        'Inseminada': 'bg-indigo-50 text-indigo-700 border-indigo-100',
        'Vacía': 'bg-amber-50 text-amber-700 border-amber-100',
        'Aborto': 'bg-red-50 text-red-700 border-red-100',
    };
    return (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${map[status] ?? 'bg-gray-50 text-gray-700 border-gray-100'}`}>
            {status}
        </span>
    );
}

// ───────────────────────────────────────────────────────────────────────
// 3. FCR
// ───────────────────────────────────────────────────────────────────────

function FCRReportModal({ farms, onClose }: { farms: FarmOption[]; onClose: () => void }) {
    const { filters, setFilters, options } = useReportControls();
    const [year, setYear] = useState(new Date().getFullYear());
    const [data, setData] = useState<(FCRReport & { subject: string }) | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const run = async () => {
        setLoading(true); setErr(null);
        try {
            const r = await generateFCRReport(toBackendFilters(filters));
            setData(r);
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'Error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { run(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, []);

    const exportCsv = () => {
        if (!data) return;
        const csv = rowsToCSV(data.animals.map((a) => ({
            id: a.id,
            raza: a.breed ?? '',
            sexo: a.sex ?? '',
            edad_meses: a.ageMonths,
            peso_kg: a.currentWeightKg ?? '',
            gmd_kg_d: a.gmdKgDay ?? '',
            origen_gmd: a.gmdSource,
            ingesta_objetivo_kg_ms: a.dmiTargetKg ?? '',
            fcr_estimado: a.fcrEstimate ?? '',
        })));
        downloadCSV(csv, `informe_fcr_${new Date().toISOString().slice(0, 10)}.csv`);
    };

    return (
        <ReportModal
            title="Informe de Rendimiento (FCR)"
            subtitle={data ? `${data.subject} · pesajes ${data.period.from} → ${data.period.to}` : undefined}
            onClose={onClose}
        >
            <FiltersBar
                year={year} setYear={setYear}
                filters={filters} setFilters={setFilters}
                farms={farms} options={options}
                reportKind="fcr" hideYear
            />
            <div className="flex gap-2">
                <button onClick={run} disabled={loading} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Regenerar
                </button>
                {data && (
                    <button onClick={exportCsv} className="bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                        <Download className="w-4 h-4" /> Descargar CSV
                    </button>
                )}
            </div>

            {err && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{err}</div>}

            {data && !loading && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Kpi label="Animales activos" value={data.summary.animalsCount} />
                        <Kpi label="Con pesajes" value={data.summary.animalsWithWeightHistory} sub="datos reales" color={data.summary.animalsWithWeightHistory > 0 ? 'green' : 'amber'} />
                        <Kpi label="GMD medio" value={data.summary.avgGMD ? `${data.summary.avgGMD} kg/d` : '—'} color={data.summary.avgGMD && data.summary.avgGMD >= 1.0 ? 'green' : 'amber'} />
                        <Kpi label="FCR medio" value={data.summary.avgFCR ?? '—'} sub="kg MS por kg de ganancia" color={data.summary.avgFCR && data.summary.avgFCR <= 8 ? 'green' : 'amber'} />
                    </div>

                    <p className="text-[11px] italic text-gray-500 leading-snug">
                        El GMD se calcula con los pesajes reales registrados en los últimos 6 meses (precisión <em>pesajes</em>). Si no hay historial, se usa una estimación por edad (<em>estimado_breed</em>) — para mejorar, registra pesajes mensuales en cada animal.
                    </p>

                    <Section title="Detalle por animal">
                        {data.animals.length === 0 ? (
                            <p className="text-sm italic text-gray-400">No hay animales activos.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-100">
                                        <tr>
                                            <th className="pb-2">ID</th>
                                            <th className="pb-2">Raza</th>
                                            <th className="pb-2">Sexo</th>
                                            <th className="pb-2 text-right">Edad</th>
                                            <th className="pb-2 text-right">Peso</th>
                                            <th className="pb-2 text-right">GMD</th>
                                            <th className="pb-2 text-right">DMI</th>
                                            <th className="pb-2 text-right">FCR</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.animals.map((a) => (
                                            <tr key={a.id} className="border-b border-gray-50">
                                                <td className="py-2 font-mono text-xs">{a.id.slice(-8)}</td>
                                                <td className="py-2 text-xs">{a.breed ?? '—'}</td>
                                                <td className="py-2 text-xs">{a.sex ?? '—'}</td>
                                                <td className="py-2 text-right">{a.ageMonths.toFixed(0)} m</td>
                                                <td className="py-2 text-right">{a.currentWeightKg ?? '—'} kg</td>
                                                <td className="py-2 text-right">
                                                    {a.gmdKgDay ?? '—'}
                                                    {a.gmdSource === 'estimado_breed' && <span className="text-[9px] text-amber-600 ml-1">est.</span>}
                                                    {a.gmdSource === 'sin_datos' && <span className="text-[9px] text-gray-400 ml-1">—</span>}
                                                </td>
                                                <td className="py-2 text-right">{a.dmiTargetKg ?? '—'}</td>
                                                <td className={`py-2 text-right font-bold ${a.fcrEstimate && a.fcrEstimate <= 7 ? 'text-green-700' : a.fcrEstimate && a.fcrEstimate <= 10 ? 'text-amber-700' : 'text-gray-500'}`}>
                                                    {a.fcrEstimate ?? '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Section>
                </>
            )}
        </ReportModal>
    );
}
