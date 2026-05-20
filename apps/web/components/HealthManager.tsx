'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
    AlertTriangle,
    Calendar,
    CheckCircle2,
    Download,
    Loader2,
    Plus,
    Stethoscope,
    Syringe,
    Trash2,
    Warehouse,
} from 'lucide-react';
import { getFarms } from '@/app/lib/farm-actions';
import { getAnimals } from '@/app/lib/animal-actions';
import {
    listVetProducts,
    listHealthRecords,
    createHealthRecord,
    deleteHealthRecord,
    listCampaigns,
    createCampaign,
    completeCampaign,
    getCampaignDossier,
    listStockMovements,
    createStockMovement,
    vetStockSnapshot,
} from '@/app/lib/health-actions';
import type { FarmLike, AnimalLike } from '@/types/livestock';

type Tab = 'eventos' | 'stock' | 'saneamientos';

const HEALTH_TYPE_LABELS: Record<string, string> = {
    treatment: 'Tratamiento',
    vaccine: 'Vacuna',
    sanitation: 'Saneamiento',
    diagnosis: 'Diagnóstico',
    deworming: 'Desparasitación',
    other: 'Otro',
};

const CAMPAIGN_KIND_LABELS: Record<string, string> = {
    tuberculosis: 'Tuberculosis',
    brucelosis: 'Brucelosis',
    lengua_azul: 'Lengua azul',
    ibr: 'IBR',
    otro: 'Otro',
};

export function HealthManager({ userId }: { userId?: string }) {
    const [farms, setFarms] = useState<FarmLike[]>([]);
    const [farmId, setFarmId] = useState<string | null>(null);
    const [tab, setTab] = useState<Tab>('eventos');

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
                <Stethoscope className="w-7 h-7 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                    Crea una finca para registrar eventos sanitarios.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Sanidad</h2>
                    <p className="text-sm text-gray-600">
                        Tratamientos, vacunaciones, kardex y saneamientos
                        oficiales con tiempo de retiro automático.
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
                    ['eventos', 'Eventos sanitarios', Syringe],
                    ['stock', 'Kardex / Stock', Warehouse],
                    ['saneamientos', 'Saneamientos', Calendar],
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

            {farmId && tab === 'eventos' && (
                <EventsTab farmId={farmId} userId={userId} />
            )}
            {farmId && tab === 'stock' && <StockTab farmId={farmId} />}
            {farmId && tab === 'saneamientos' && (
                <CampaignsTab farmId={farmId} userId={userId} />
            )}
        </div>
    );
}

// ─── EVENTOS SANITARIOS ────────────────────────────────────────────────────────

function EventsTab({ farmId, userId }: { farmId: string; userId?: string }) {
    const [records, setRecords] = useState<Awaited<ReturnType<typeof listHealthRecords>> | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [filterType, setFilterType] = useState<string>('');

    const reload = () => {
        listHealthRecords({ farmId, type: filterType || undefined }).then(setRecords);
    };

    useEffect(reload, [farmId, filterType]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                >
                    <option value="">Todos los tipos</option>
                    {Object.entries(HEALTH_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                            {v}
                        </option>
                    ))}
                </select>
                <button
                    onClick={() => setShowForm((s) => !s)}
                    className="ml-auto inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-3 py-2 rounded-lg"
                >
                    <Plus className="w-4 h-4" /> {showForm ? 'Cancelar' : 'Nuevo registro'}
                </button>
            </div>

            {showForm && (
                <HealthRecordForm
                    farmId={farmId}
                    userId={userId}
                    onSaved={() => {
                        setShowForm(false);
                        reload();
                    }}
                />
            )}

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {records === null ? (
                    <div className="p-4 text-sm text-gray-500 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Cargando…
                    </div>
                ) : records.length === 0 ? (
                    <p className="p-4 text-sm text-gray-500 italic">
                        Sin registros con los filtros actuales.
                    </p>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                            <tr>
                                <th className="px-3 py-2">Fecha</th>
                                <th className="px-3 py-2">Animal</th>
                                <th className="px-3 py-2">Tipo</th>
                                <th className="px-3 py-2">Producto</th>
                                <th className="px-3 py-2">Retiro carne</th>
                                <th className="px-3 py-2 text-right">€</th>
                                <th className="px-3 py-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((r) => {
                                const retiroActivo =
                                    r.withdrawalMeatUntil && r.withdrawalMeatUntil > new Date();
                                return (
                                    <tr key={r.id} className="border-t border-gray-50">
                                        <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                                            {new Date(r.appliedAt).toLocaleDateString('es-ES')}
                                        </td>
                                        <td className="px-3 py-2 font-medium text-gray-900">
                                            {r.animal?.id ?? '—'}
                                        </td>
                                        <td className="px-3 py-2 text-gray-700">
                                            {HEALTH_TYPE_LABELS[r.type] ?? r.type}
                                        </td>
                                        <td className="px-3 py-2 text-gray-700">
                                            {r.product?.name ?? r.diagnosis ?? '—'}
                                        </td>
                                        <td className="px-3 py-2">
                                            {r.withdrawalMeatUntil ? (
                                                <span
                                                    className={`text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                                                        retiroActivo
                                                            ? 'bg-red-50 text-red-700 border-red-100'
                                                            : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                    }`}
                                                >
                                                    {retiroActivo ? (
                                                        <AlertTriangle className="w-3 h-3" />
                                                    ) : (
                                                        <CheckCircle2 className="w-3 h-3" />
                                                    )}
                                                    {new Date(r.withdrawalMeatUntil).toLocaleDateString('es-ES')}
                                                </span>
                                            ) : (
                                                <span className="text-gray-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-right text-gray-700 tabular-nums">
                                            {r.cost?.toFixed(2) ?? '—'}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <button
                                                onClick={async () => {
                                                    if (!confirm('¿Eliminar registro?')) return;
                                                    await deleteHealthRecord(r.id);
                                                    reload();
                                                }}
                                                className="text-red-600 hover:text-red-800"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

function HealthRecordForm({
    farmId,
    userId,
    onSaved,
    forcedCampaignId,
}: {
    farmId: string;
    userId?: string;
    onSaved: () => void;
    forcedCampaignId?: string;
}) {
    const [animals, setAnimals] = useState<AnimalLike[]>([]);
    const [products, setProducts] = useState<Awaited<ReturnType<typeof listVetProducts>>>([]);
    const [saving, startSaving] = useTransition();

    const [animalId, setAnimalId] = useState('');
    const [type, setType] = useState<'treatment' | 'vaccine' | 'sanitation' | 'diagnosis' | 'deworming' | 'other'>('treatment');
    const [productId, setProductId] = useState('');
    const [diagnosis, setDiagnosis] = useState('');
    const [dose, setDose] = useState('');
    const [doseUnit, setDoseUnit] = useState('ml');
    const [route, setRoute] = useState('IM');
    const [vetName, setVetName] = useState('');
    const [prescriptionRef, setPrescriptionRef] = useState('');
    const [appliedAt, setAppliedAt] = useState(new Date().toISOString().slice(0, 10));
    const [cost, setCost] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (userId) {
            getAnimals(userId).then(({ data }) => {
                const list = ((data as unknown) as AnimalLike[]) || [];
                setAnimals(list.filter((a) => (a as unknown as { farmId?: string }).farmId === farmId));
            });
        }
        listVetProducts().then(setProducts);
    }, [farmId, userId]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!animalId) {
            alert('Selecciona un animal');
            return;
        }
        startSaving(async () => {
            try {
                await createHealthRecord({
                    animalId,
                    type,
                    productId: productId || undefined,
                    diagnosis: diagnosis || undefined,
                    dose: dose ? Number(dose) : undefined,
                    doseUnit: doseUnit || undefined,
                    route: route || undefined,
                    vetName: vetName || undefined,
                    prescriptionRef: prescriptionRef || undefined,
                    campaignId: forcedCampaignId,
                    appliedAt,
                    cost: cost ? Number(cost) : undefined,
                    notes: notes || undefined,
                });
                onSaved();
            } catch (err) {
                alert((err as Error).message);
            }
        });
    };

    const selectedProduct = products.find((p) => p.id === productId);

    return (
        <form
            onSubmit={submit}
            className="bg-white rounded-xl border border-gray-100 p-4 grid grid-cols-1 md:grid-cols-2 gap-3"
        >
            <label className="text-xs text-gray-600">
                Animal *
                <select
                    required
                    value={animalId}
                    onChange={(e) => setAnimalId(e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm bg-white mt-0.5"
                >
                    <option value="">Selecciona crotal</option>
                    {animals.map((a) => (
                        <option key={(a as any).id} value={(a as any).id}>
                            {(a as any).id} {(a as any).breed ? `· ${(a as any).breed}` : ''}
                        </option>
                    ))}
                </select>
            </label>

            <label className="text-xs text-gray-600">
                Tipo *
                <select
                    required
                    value={type}
                    onChange={(e) => setType(e.target.value as typeof type)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm bg-white mt-0.5"
                >
                    {Object.entries(HEALTH_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                            {v}
                        </option>
                    ))}
                </select>
            </label>

            <label className="text-xs text-gray-600 md:col-span-2">
                Producto del vademécum
                <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm bg-white mt-0.5"
                >
                    <option value="">— ninguno (libre)</option>
                    {products.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name} {p.activeIngredient ? `· ${p.activeIngredient}` : ''}
                        </option>
                    ))}
                </select>
                {selectedProduct && (
                    <p className="text-[11px] text-gray-500 mt-1">
                        Retiro carne {selectedProduct.withdrawalMeatDays}d · leche{' '}
                        {selectedProduct.withdrawalMilkDays}d · {selectedProduct.unit}
                    </p>
                )}
            </label>

            {type === 'diagnosis' && (
                <label className="text-xs text-gray-600 md:col-span-2">
                    Diagnóstico
                    <input
                        value={diagnosis}
                        onChange={(e) => setDiagnosis(e.target.value)}
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm mt-0.5"
                        placeholder="Ej: mastitis clínica grado 2"
                    />
                </label>
            )}

            <label className="text-xs text-gray-600">
                Dosis
                <div className="flex gap-1 mt-0.5">
                    <input
                        type="number"
                        step="any"
                        value={dose}
                        onChange={(e) => setDose(e.target.value)}
                        className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-sm"
                    />
                    <select
                        value={doseUnit}
                        onChange={(e) => setDoseUnit(e.target.value)}
                        className="border border-gray-200 rounded px-2 py-1.5 text-sm bg-white"
                    >
                        <option>ml</option>
                        <option>mg</option>
                        <option>dosis</option>
                        <option>g</option>
                    </select>
                </div>
            </label>

            <label className="text-xs text-gray-600">
                Vía
                <select
                    value={route}
                    onChange={(e) => setRoute(e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm bg-white mt-0.5"
                >
                    <option>IM</option>
                    <option>SC</option>
                    <option>IV</option>
                    <option>oral</option>
                    <option>pour-on</option>
                    <option>intramamaria</option>
                    <option>intranasal</option>
                </select>
            </label>

            <label className="text-xs text-gray-600">
                Veterinario
                <input
                    value={vetName}
                    onChange={(e) => setVetName(e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm mt-0.5"
                />
            </label>

            <label className="text-xs text-gray-600">
                Nº receta electrónica
                <input
                    value={prescriptionRef}
                    onChange={(e) => setPrescriptionRef(e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm mt-0.5"
                />
            </label>

            <label className="text-xs text-gray-600">
                Fecha aplicación *
                <input
                    required
                    type="date"
                    value={appliedAt}
                    onChange={(e) => setAppliedAt(e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm mt-0.5"
                />
            </label>

            <label className="text-xs text-gray-600">
                Coste (€)
                <input
                    type="number"
                    step="0.01"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm mt-0.5"
                />
            </label>

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
                    Guardar registro
                </button>
            </div>
        </form>
    );
}

// ─── STOCK ─────────────────────────────────────────────────────────────────────

function StockTab({ farmId }: { farmId: string }) {
    const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof vetStockSnapshot>> | null>(null);
    const [movements, setMovements] = useState<Awaited<ReturnType<typeof listStockMovements>> | null>(null);
    const [products, setProducts] = useState<Awaited<ReturnType<typeof listVetProducts>>>([]);
    const [showForm, setShowForm] = useState(false);

    const reload = () => {
        Promise.all([vetStockSnapshot(farmId), listStockMovements(farmId), listVetProducts()])
            .then(([s, m, p]) => {
                setSnapshot(s);
                setMovements(m);
                setProducts(p);
            });
    };

    useEffect(reload, [farmId]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">
                    Stock actual ({snapshot?.length ?? 0} productos con movimientos)
                </h3>
                <button
                    onClick={() => setShowForm((s) => !s)}
                    className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-3 py-2 rounded-lg"
                >
                    <Plus className="w-4 h-4" /> {showForm ? 'Cancelar' : 'Movimiento'}
                </button>
            </div>

            {showForm && (
                <StockMovementForm
                    farmId={farmId}
                    products={products}
                    onSaved={() => {
                        setShowForm(false);
                        reload();
                    }}
                />
            )}

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {snapshot === null ? (
                    <div className="p-4 text-sm text-gray-500 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Cargando…
                    </div>
                ) : snapshot.length === 0 ? (
                    <p className="p-4 text-sm text-gray-500 italic">
                        Sin movimientos de stock registrados.
                    </p>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                            <tr>
                                <th className="px-3 py-2">Producto</th>
                                <th className="px-3 py-2">Categoría</th>
                                <th className="px-3 py-2 text-right">Stock</th>
                            </tr>
                        </thead>
                        <tbody>
                            {snapshot.map((s) => (
                                <tr key={s.productId} className="border-t border-gray-50">
                                    <td className="px-3 py-2 font-medium text-gray-900">{s.name}</td>
                                    <td className="px-3 py-2 text-gray-600 capitalize">{s.category}</td>
                                    <td
                                        className={`px-3 py-2 text-right tabular-nums font-medium ${
                                            s.balance < 0
                                                ? 'text-red-600'
                                                : s.balance <= 5
                                                  ? 'text-amber-600'
                                                  : 'text-emerald-700'
                                        }`}
                                    >
                                        {s.balance.toFixed(2)} {s.unit}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">Últimos movimientos</h3>
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    {movements === null ? (
                        <p className="p-4 text-sm text-gray-500">Cargando…</p>
                    ) : movements.length === 0 ? (
                        <p className="p-4 text-sm text-gray-500 italic">Ninguno aún.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                                <tr>
                                    <th className="px-3 py-2">Fecha</th>
                                    <th className="px-3 py-2">Producto</th>
                                    <th className="px-3 py-2">Tipo</th>
                                    <th className="px-3 py-2 text-right">Cantidad</th>
                                    <th className="px-3 py-2 text-right">€</th>
                                </tr>
                            </thead>
                            <tbody>
                                {movements.slice(0, 30).map((m) => (
                                    <tr key={m.id} className="border-t border-gray-50">
                                        <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                                            {new Date(m.occurredAt).toLocaleDateString('es-ES')}
                                        </td>
                                        <td className="px-3 py-2 text-gray-900">{m.product.name}</td>
                                        <td className="px-3 py-2 text-gray-700 capitalize">{m.kind}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">
                                            {m.kind === 'salida' ? '−' : '+'}
                                            {m.quantity} {m.unit}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                                            {m.totalCost?.toFixed(2) ?? '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

function StockMovementForm({
    farmId,
    products,
    onSaved,
}: {
    farmId: string;
    products: Awaited<ReturnType<typeof listVetProducts>>;
    onSaved: () => void;
}) {
    const [productId, setProductId] = useState('');
    const [kind, setKind] = useState<'entrada' | 'salida' | 'ajuste'>('entrada');
    const [quantity, setQuantity] = useState('');
    const [unitCost, setUnitCost] = useState('');
    const [reference, setReference] = useState('');
    const [saving, startSaving] = useTransition();

    const selected = products.find((p) => p.id === productId);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        startSaving(async () => {
            try {
                await createStockMovement({
                    farmId,
                    productId,
                    kind,
                    quantity: Number(quantity),
                    unit: selected?.unit ?? 'ml',
                    unitCost: unitCost ? Number(unitCost) : undefined,
                    reference: reference || undefined,
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
                Producto *
                <select
                    required
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm bg-white mt-0.5"
                >
                    <option value="">Selecciona producto</option>
                    {products.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                </select>
            </label>
            <label className="text-xs text-gray-600">
                Tipo *
                <select
                    required
                    value={kind}
                    onChange={(e) => setKind(e.target.value as typeof kind)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm bg-white mt-0.5"
                >
                    <option value="entrada">Entrada (compra)</option>
                    <option value="salida">Salida (uso)</option>
                    <option value="ajuste">Ajuste inventario</option>
                </select>
            </label>
            <label className="text-xs text-gray-600">
                Cantidad *
                <input
                    required
                    type="number"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm mt-0.5"
                />
            </label>
            <label className="text-xs text-gray-600">
                Coste unitario (€) — solo entradas
                <input
                    type="number"
                    step="0.01"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm mt-0.5"
                />
            </label>
            <label className="text-xs text-gray-600">
                Referencia (albarán, motivo)
                <input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
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
                    Guardar movimiento
                </button>
            </div>
        </form>
    );
}

// ─── SANEAMIENTOS ──────────────────────────────────────────────────────────────

function CampaignsTab({ farmId, userId: _userId }: { farmId: string; userId?: string }) {
    const [campaigns, setCampaigns] = useState<Awaited<ReturnType<typeof listCampaigns>> | null>(null);
    const [showForm, setShowForm] = useState(false);

    const reload = () => {
        listCampaigns(farmId).then(setCampaigns);
    };
    useEffect(reload, [farmId]);

    const handleComplete = async (id: string) => {
        const result = prompt('Resultado (favorable / sospechoso / positivo):', 'favorable');
        if (!result) return;
        if (!['favorable', 'sospechoso', 'positivo'].includes(result)) {
            alert('Resultado inválido');
            return;
        }
        await completeCampaign({
            campaignId: id,
            result: result as 'favorable' | 'sospechoso' | 'positivo',
        });
        reload();
    };

    const exportDossier = async (id: string) => {
        const dossier = await getCampaignDossier(id);
        const blob = new Blob([JSON.stringify(dossier, null, 2)], {
            type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dossier-saneamiento-${id}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                    Programa los saneamientos oficiales obligatorios (TB,
                    brucelosis, lengua azul…) y exporta el dossier para PRESVET.
                </p>
                <button
                    onClick={() => setShowForm((s) => !s)}
                    className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-3 py-2 rounded-lg"
                >
                    <Plus className="w-4 h-4" /> {showForm ? 'Cancelar' : 'Programar'}
                </button>
            </div>

            {showForm && (
                <CampaignForm
                    farmId={farmId}
                    onSaved={() => {
                        setShowForm(false);
                        reload();
                    }}
                />
            )}

            <div className="space-y-2">
                {campaigns === null ? (
                    <p className="text-sm text-gray-500">Cargando…</p>
                ) : campaigns.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                        Sin campañas programadas.
                    </p>
                ) : (
                    campaigns.map((c) => (
                        <div
                            key={c.id}
                            className={`bg-white rounded-xl border p-4 flex flex-wrap items-center justify-between gap-3 ${
                                c.completedAt ? 'border-gray-100' : 'border-amber-200'
                            }`}
                        >
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900">
                                    {CAMPAIGN_KIND_LABELS[c.kind] ?? c.kind}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Programado para{' '}
                                    {new Date(c.scheduledFor).toLocaleDateString('es-ES')}
                                    {c.vetName ? ` · ${c.vetName}` : ''}
                                    {' · '}
                                    {c._count.records} animales registrados
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                {c.completedAt ? (
                                    <span
                                        className={`text-xs px-2 py-1 rounded-full border ${
                                            c.result === 'favorable'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                : c.result === 'sospechoso'
                                                  ? 'bg-amber-50 text-amber-700 border-amber-100'
                                                  : 'bg-red-50 text-red-700 border-red-100'
                                        }`}
                                    >
                                        {c.result ?? 'cerrada'}
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => handleComplete(c.id)}
                                        className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium px-2 py-1 rounded"
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Cerrar campaña
                                    </button>
                                )}
                                <button
                                    onClick={() => exportDossier(c.id)}
                                    className="inline-flex items-center gap-1 text-xs text-green-700 hover:text-green-900 font-medium"
                                >
                                    <Download className="w-3.5 h-3.5" /> Dossier
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function CampaignForm({ farmId, onSaved }: { farmId: string; onSaved: () => void }) {
    const [kind, setKind] = useState<'tuberculosis' | 'brucelosis' | 'lengua_azul' | 'ibr' | 'otro'>('tuberculosis');
    const [scheduledFor, setScheduledFor] = useState(
        new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10),
    );
    const [vetName, setVetName] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, startSaving] = useTransition();

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        startSaving(async () => {
            try {
                await createCampaign({ farmId, kind, scheduledFor, vetName, notes });
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
            <label className="text-xs text-gray-600">
                Tipo *
                <select
                    required
                    value={kind}
                    onChange={(e) => setKind(e.target.value as typeof kind)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm bg-white mt-0.5"
                >
                    {Object.entries(CAMPAIGN_KIND_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                            {v}
                        </option>
                    ))}
                </select>
            </label>
            <label className="text-xs text-gray-600">
                Fecha programada *
                <input
                    required
                    type="date"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm mt-0.5"
                />
            </label>
            <label className="text-xs text-gray-600">
                Veterinario
                <input
                    value={vetName}
                    onChange={(e) => setVetName(e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm mt-0.5"
                />
            </label>
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
                    Programar saneamiento
                </button>
            </div>
        </form>
    );
}
