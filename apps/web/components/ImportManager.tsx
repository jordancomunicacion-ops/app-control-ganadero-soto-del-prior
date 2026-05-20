'use client';

import { useEffect, useState, useTransition } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    FileText,
    Loader2,
    Upload,
} from 'lucide-react';
import { getFarms } from '@/app/lib/farm-actions';
import {
    previewImport,
    applyImport,
    type ImportPreview,
    type ImportApplyResult,
} from '@/app/lib/import-actions';
import type { FarmLike } from '@/types/livestock';

export function ImportManager({ userId }: { userId?: string }) {
    const [farms, setFarms] = useState<FarmLike[]>([]);
    const [farmId, setFarmId] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<ImportPreview | null>(null);
    const [applied, setApplied] = useState<ImportApplyResult | null>(null);
    const [working, startWorking] = useTransition();
    const [error, setError] = useState<string | null>(null);
    // Cuando llegue importación de animales / sanidad, este selector
    // permitirá elegir. Por ahora fijado a "weights".
    const domain: 'weights' = 'weights';

    useEffect(() => {
        if (!userId) return;
        getFarms(userId).then(({ data }) => {
            const list = (data as FarmLike[]) || [];
            setFarms(list);
            if (list[0]?.id) setFarmId(list[0].id);
        });
    }, [userId]);

    const doPreview = () => {
        if (!file || !farmId) return;
        setError(null);
        setPreview(null);
        setApplied(null);
        const fd = new FormData();
        fd.set('domain', domain);
        fd.set('farmId', farmId);
        fd.set('file', file);
        startWorking(async () => {
            try {
                const r = await previewImport(fd);
                setPreview(r);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Error');
            }
        });
    };

    const doApply = () => {
        if (!file || !farmId) return;
        if (!confirm(`Se aplicarán ${preview?.validRows ?? 0} filas. ¿Confirmar?`)) return;
        setError(null);
        const fd = new FormData();
        fd.set('domain', domain);
        fd.set('farmId', farmId);
        fd.set('file', file);
        startWorking(async () => {
            try {
                const r = await applyImport(fd);
                setApplied(r);
                setPreview(null);
                setFile(null);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Error');
            }
        });
    };

    if (farms.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
                <FileText className="w-7 h-7 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                    Crea una finca para importar datos.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Importar CSV</h2>
                    <p className="text-sm text-gray-600">
                        Carga pesos desde báscula (Tru-Test, Excel exportable…) y
                        previsualiza el resultado antes de aplicarlo.
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

            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
                <p className="text-sm font-bold text-gray-900">
                    Pesos (báscula electrónica)
                </p>
                <p className="text-xs text-gray-500">
                    Columnas reconocidas: <code>Crotal</code> / <code>Animal ID</code> /
                    <code> EID</code>; <code>Peso</code> / <code>Peso (kg)</code> /
                    <code> Weight</code>; <code>Fecha</code> en formato dd/mm/yyyy o
                    yyyy-mm-dd. Tolera punto y coma como separador.
                </p>

                <label className="block border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                        type="file"
                        accept=".csv,text/csv"
                        hidden
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                                setFile(f);
                                setPreview(null);
                                setApplied(null);
                                setError(null);
                            }
                        }}
                    />
                    <Upload className="w-6 h-6 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-600 mt-2">
                        {file ? (
                            <>
                                <strong>{file.name}</strong> · {(file.size / 1024).toFixed(1)} KB
                            </>
                        ) : (
                            'Arrastra un CSV aquí o haz clic para elegir'
                        )}
                    </p>
                </label>

                <div className="flex justify-end gap-2">
                    <button
                        onClick={doPreview}
                        disabled={working || !file}
                        className="inline-flex items-center gap-1 bg-sky-600 hover:bg-sky-700 disabled:bg-gray-300 text-white text-sm font-medium px-3 py-2 rounded-lg"
                    >
                        {working ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <FileText className="w-4 h-4" />
                        )}
                        Previsualizar
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {preview && (
                <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
                    <h3 className="text-sm font-bold text-gray-900">
                        Previsualización
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <Stat label="Filas totales" value={preview.totalRows} />
                        <Stat label="A crear" value={preview.toCreate} tone="ok" />
                        <Stat label="A actualizar" value={preview.toUpdate} tone="info" />
                        <Stat label="Con error" value={preview.errorRows} tone="warn" />
                    </div>

                    {preview.sample.length > 0 && (
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                Muestra (primeras {preview.sample.length})
                            </p>
                            <table className="w-full text-xs">
                                <thead className="text-left text-gray-500">
                                    <tr>
                                        <th className="px-2 py-1">Fila</th>
                                        <th className="px-2 py-1">Acción</th>
                                        <th className="px-2 py-1">Animal</th>
                                        <th className="px-2 py-1 text-right">Peso</th>
                                        <th className="px-2 py-1">Fecha</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.sample.map((s, i) => (
                                        <tr key={i} className="border-t border-gray-50">
                                            <td className="px-2 py-1 text-gray-500">{s.row}</td>
                                            <td className="px-2 py-1">
                                                <span
                                                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                                        s.action === 'create'
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                            : 'bg-sky-50 text-sky-700 border border-sky-100'
                                                    }`}
                                                >
                                                    {s.action}
                                                </span>
                                            </td>
                                            <td className="px-2 py-1 font-medium">{String(s.data.animalId)}</td>
                                            <td className="px-2 py-1 text-right tabular-nums">
                                                {String(s.data.weightKg)} kg
                                            </td>
                                            <td className="px-2 py-1 text-gray-600">
                                                {new Date(s.data.date as Date | string).toLocaleDateString('es-ES')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {preview.errors.length > 0 && (
                        <div>
                            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> Errores ({preview.errors.length})
                            </p>
                            <ul className="text-xs space-y-1 max-h-40 overflow-y-auto">
                                {preview.errors.map((e, i) => (
                                    <li
                                        key={i}
                                        className="bg-amber-50 border border-amber-100 rounded px-2 py-1 text-amber-700"
                                    >
                                        Fila {e.row}: {e.reason}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {preview.validRows > 0 && (
                        <div className="flex justify-end">
                            <button
                                onClick={doApply}
                                disabled={working}
                                className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-medium px-3 py-2 rounded-lg"
                            >
                                {working ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="w-4 h-4" />
                                )}
                                Aplicar {preview.validRows} cambios
                            </button>
                        </div>
                    )}
                </div>
            )}

            {applied && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 text-sm text-emerald-700">
                    <strong>Importación completada.</strong>{' '}
                    {applied.inserted} creados · {applied.updated} actualizados ·{' '}
                    {applied.skipped} omitidos.
                </div>
            )}
        </div>
    );
}

function Stat({
    label,
    value,
    tone,
}: {
    label: string;
    value: number;
    tone?: 'ok' | 'warn' | 'info';
}) {
    const ring =
        tone === 'ok'
            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
            : tone === 'info'
              ? 'bg-sky-50 border-sky-100 text-sky-700'
              : tone === 'warn'
                ? 'bg-amber-50 border-amber-100 text-amber-700'
                : 'bg-gray-50 border-gray-100 text-gray-700';
    return (
        <div className={`rounded-lg border p-2 ${ring}`}>
            <p className="text-[10px] uppercase tracking-wider font-medium">{label}</p>
            <p className="text-xl font-bold mt-0.5">{value}</p>
        </div>
    );
}
