'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import {
    ArrowLeft,
    Camera,
    Coins,
    FileText,
    Image as ImageIcon,
    Loader2,
    NotebookPen,
    Plus,
    Scale,
    Stethoscope,
    Syringe,
    Trash2,
    Upload,
    AlertTriangle,
} from 'lucide-react';
import {
    getAnimalDetail,
    uploadAnimalAttachment,
    addAnimalNote,
    deleteAnimalAttachment,
} from '@/app/lib/animal-detail-actions';
import { getCowProductivity } from '@/app/lib/productivity-actions';

interface AnimalDetailProps {
    animalId: string;
    onBack?: () => void;
}

type Detail = Awaited<ReturnType<typeof getAnimalDetail>>;

type TimelineEntry = {
    date: Date;
    kind: 'weight' | 'event' | 'health' | 'attachment';
    title: string;
    subtitle?: string;
    severity?: 'info' | 'warning' | 'critical';
    icon: typeof Scale;
};

const TYPE_LABEL: Record<string, string> = {
    photo: 'Foto',
    ultrasound: 'Ecografía',
    document: 'Documento',
    note: 'Nota',
};

export function AnimalDetail({ animalId, onBack }: AnimalDetailProps) {
    const [detail, setDetail] = useState<Detail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'resumen' | 'timeline' | 'fotos' | 'notas'>('resumen');

    const reload = () => {
        setError(null);
        getAnimalDetail(animalId)
            .then(setDetail)
            .catch((e) => setError(e instanceof Error ? e.message : 'Error'));
    };

    useEffect(() => {
        setDetail(null);
        reload();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [animalId]);

    if (error) {
        return (
            <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-sm text-red-700">
                No se puede cargar la ficha: {error}
            </div>
        );
    }
    if (!detail) {
        return (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando ficha…
            </div>
        );
    }

    const { animal, weights, events, healthRecords, attachments, alerts, activeWithdrawal } = detail;

    const ageMonths = monthsBetween(animal.birthDate, new Date());
    const lastWeight = weights[0];
    const photos = attachments.filter((a) => a.type === 'photo' || a.type === 'ultrasound');
    const docs = attachments.filter((a) => a.type === 'document');
    const notes = attachments.filter((a) => a.type === 'note');

    return (
        <div className="space-y-5">
            {/* Cabecera */}
            <div className="flex items-start gap-4">
                {onBack && (
                    <button
                        onClick={onBack}
                        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mt-1"
                    >
                        <ArrowLeft className="w-4 h-4" /> Volver
                    </button>
                )}
                <div className="flex-1 flex items-start gap-4 bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <AnimalAvatar
                        photoUrl={animal.photoUrl}
                        animalId={animal.id}
                        onUploaded={reload}
                    />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h2 className="text-xl font-bold text-gray-900">{animal.id}</h2>
                            {animal.dibCode && animal.dibCode !== animal.id && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                    DIB {animal.dibCode}
                                </span>
                            )}
                            {animal.status && animal.status !== 'activo' && (
                                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded capitalize">
                                    {animal.status}
                                </span>
                            )}
                            {activeWithdrawal && (
                                <span
                                    title={`No apto para sacrificio hasta ${activeWithdrawal.until.toLocaleDateString('es-ES')}`}
                                    className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded"
                                >
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    Retiro hasta {activeWithdrawal.until.toLocaleDateString('es-ES')}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                            {animal.sex === 'M' ? 'Macho' : animal.sex === 'H' ? 'Hembra' : animal.sex}
                            {animal.category ? ` · ${animal.category}` : ''}
                            {' · '}
                            {ageMonths} meses
                            {animal.breedName ? ` · ${animal.breedName}` : animal.genotype?.label ? ` · ${animal.genotype.label}` : ''}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Finca: <span className="font-medium">{animal.farm.name}</span> · Nacido el{' '}
                            {new Date(animal.birthDate).toLocaleDateString('es-ES')}
                            {animal.motherId ? ` · Madre ${animal.motherId}` : ''}
                            {animal.fatherId ? ` · Padre ${animal.fatherId}` : ''}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-200">
                {(['resumen', 'timeline', 'fotos', 'notas'] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => setActiveTab(t)}
                        className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
                            activeTab === t
                                ? 'border-green-600 text-green-700'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        {t === 'timeline' ? 'Línea de vida' : t === 'fotos' ? 'Fotos y docs' : t}
                    </button>
                ))}
            </div>

            {activeTab === 'resumen' && (
                <>
                    <ResumenTab
                        lastWeight={lastWeight}
                        weightsCount={weights.length}
                        eventsCount={events.length}
                        healthCount={healthRecords.length}
                        photosCount={photos.length}
                        alertsCount={alerts.length}
                        activeWithdrawal={activeWithdrawal}
                    />
                    {/* Productividad económica — solo aplica a hembras adultas (≥ 18 m).
                        Calcula €/vaca/año a partir del historial real de partos y
                        del peso al destete de su descendencia. */}
                    {animal.sex === 'H' && ageMonths >= 18 && (
                        <CowProductivityCard animalId={animal.id} />
                    )}
                </>
            )}

            {activeTab === 'timeline' && (
                <TimelineTab
                    weights={weights}
                    events={events}
                    healthRecords={healthRecords}
                    attachments={attachments}
                />
            )}

            {activeTab === 'fotos' && (
                <FotosTab
                    photos={photos}
                    docs={docs}
                    animalId={animalId}
                    onChange={reload}
                />
            )}

            {activeTab === 'notas' && (
                <NotasTab notes={notes} animalId={animalId} onChange={reload} />
            )}
        </div>
    );
}

// ─── SUBCOMPONENTES ────────────────────────────────────────────────────────────

function AnimalAvatar({
    photoUrl,
    animalId,
    onUploaded,
}: {
    photoUrl: string | null;
    animalId: string;
    onUploaded: () => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, startUploading] = useTransition();

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        startUploading(async () => {
            const fd = new FormData();
            fd.set('animalId', animalId);
            fd.set('type', 'photo');
            fd.set('setAsPrimary', 'true');
            fd.set('file', f);
            try {
                await uploadAnimalAttachment(fd);
                onUploaded();
            } catch (err) {
                alert((err as Error).message);
            }
        });
    };

    return (
        <div className="relative">
            {photoUrl ? (
                // Foto del animal subida localmente. Es content del propio
                // tenant — usar <img> regular evita ir por el optimizer de
                // Next con dominios externos.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={photoUrl}
                    alt={animalId}
                    className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                />
            ) : (
                <div className="w-20 h-20 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400">
                    <Camera className="w-7 h-7" />
                </div>
            )}
            <button
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center shadow-md disabled:bg-gray-400"
                title="Cambiar foto principal"
            >
                {uploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                    <Camera className="w-3.5 h-3.5" />
                )}
            </button>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleFile}
            />
        </div>
    );
}

function ResumenTab({
    lastWeight,
    weightsCount,
    eventsCount,
    healthCount,
    photosCount,
    alertsCount,
    activeWithdrawal,
}: {
    lastWeight: { date: Date; weightKg: number; method: string } | undefined;
    weightsCount: number;
    eventsCount: number;
    healthCount: number;
    photosCount: number;
    alertsCount: number;
    activeWithdrawal: { productName: string; until: Date } | null;
}) {
    const cards: Array<{ label: string; value: string; hint?: string }> = [
        {
            label: 'Último peso',
            value: lastWeight
                ? `${lastWeight.weightKg} kg`
                : 'Sin pesos',
            hint: lastWeight
                ? `${new Date(lastWeight.date).toLocaleDateString('es-ES')} · ${lastWeight.method}`
                : 'Registra el primer peso',
        },
        {
            label: 'Pesos registrados',
            value: String(weightsCount),
        },
        {
            label: 'Eventos de manejo',
            value: String(eventsCount),
        },
        {
            label: 'Sanidad',
            value: String(healthCount),
        },
        {
            label: 'Fotos y eco',
            value: String(photosCount),
        },
        {
            label: 'Alertas activas',
            value: String(alertsCount),
        },
    ];

    return (
        <div className="space-y-4">
            {activeWithdrawal && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                        <strong>No apto para sacrificio</strong> hasta{' '}
                        {activeWithdrawal.until.toLocaleDateString('es-ES')}.
                        <p className="text-xs text-red-600/80 mt-1">
                            Tratamiento activo: {activeWithdrawal.productName}.
                        </p>
                    </div>
                </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {cards.map((c) => (
                    <div
                        key={c.label}
                        className="bg-white rounded-lg border border-gray-100 p-3"
                    >
                        <p className="text-[11px] uppercase tracking-wider font-medium text-gray-500">
                            {c.label}
                        </p>
                        <p className="text-xl font-bold text-gray-900 mt-1">
                            {c.value}
                        </p>
                        {c.hint && (
                            <p className="text-xs text-gray-500 mt-0.5">{c.hint}</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function TimelineTab({
    weights,
    events,
    healthRecords,
    attachments,
}: {
    weights: { date: Date; weightKg: number; method: string }[];
    events: { date: Date; type: string; details: string | null; notes: string | null }[];
    healthRecords: Array<{
        appliedAt: Date;
        type: string;
        diagnosis: string | null;
        notes: string | null;
        product: { name: string } | null;
        withdrawalMeatUntil: Date | null;
    }>;
    attachments: Array<{
        takenAt: Date;
        type: string;
        caption: string | null;
        url: string | null;
    }>;
}) {
    const items: TimelineEntry[] = [
        ...weights.map<TimelineEntry>((w) => ({
            date: w.date,
            kind: 'weight',
            title: `${w.weightKg} kg`,
            subtitle: `Pesaje (${w.method})`,
            icon: Scale,
        })),
        ...events.map<TimelineEntry>((e) => ({
            date: e.date,
            kind: 'event',
            title: e.type.charAt(0).toUpperCase() + e.type.slice(1).replace(/_/g, ' '),
            subtitle: e.details ?? e.notes ?? undefined,
            icon: NotebookPen,
        })),
        ...healthRecords.map<TimelineEntry>((h) => ({
            date: h.appliedAt,
            kind: 'health',
            title: h.product
                ? `${h.type === 'vaccine' ? 'Vacuna' : h.type === 'treatment' ? 'Tratamiento' : 'Sanidad'}: ${h.product.name}`
                : `Sanidad: ${h.type}`,
            subtitle:
                h.diagnosis ??
                (h.withdrawalMeatUntil
                    ? `Retiro carne hasta ${new Date(h.withdrawalMeatUntil).toLocaleDateString('es-ES')}`
                    : h.notes ?? undefined),
            severity: h.withdrawalMeatUntil && h.withdrawalMeatUntil > new Date()
                ? 'warning'
                : 'info',
            icon: Stethoscope,
        })),
        ...attachments
            .filter((a) => a.type !== 'note')
            .map<TimelineEntry>((a) => ({
                date: a.takenAt,
                kind: 'attachment',
                title: TYPE_LABEL[a.type] ?? a.type,
                subtitle: a.caption ?? undefined,
                icon: ImageIcon,
            })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    if (items.length === 0) {
        return (
            <p className="text-sm text-gray-500 italic">
                Aún no hay eventos en la línea de vida.
            </p>
        );
    }

    return (
        <ul className="space-y-2">
            {items.map((it, i) => {
                const Icon = it.icon;
                return (
                    <li
                        key={i}
                        className={`bg-white border rounded-lg p-3 flex items-start gap-3 ${
                            it.severity === 'warning'
                                ? 'border-amber-200'
                                : 'border-gray-100'
                        }`}
                    >
                        <span
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${
                                it.kind === 'weight'
                                    ? 'bg-sky-50 text-sky-600'
                                    : it.kind === 'event'
                                      ? 'bg-violet-50 text-violet-600'
                                      : it.kind === 'health'
                                        ? 'bg-emerald-50 text-emerald-600'
                                        : 'bg-gray-100 text-gray-500'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900">{it.title}</p>
                            {it.subtitle && (
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                    {it.subtitle}
                                </p>
                            )}
                        </div>
                        <span className="text-[11px] text-gray-400 shrink-0">
                            {new Date(it.date).toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                            })}
                        </span>
                    </li>
                );
            })}
        </ul>
    );
}

function FotosTab({
    photos,
    docs,
    animalId,
    onChange,
}: {
    photos: Array<{ id: string; url: string | null; caption: string | null; type: string; takenAt: Date }>;
    docs: Array<{ id: string; url: string | null; caption: string | null; takenAt: Date }>;
    animalId: string;
    onChange: () => void;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);
    const [uploadType, setUploadType] = useState<'photo' | 'ultrasound' | 'document'>('photo');
    const [uploading, startUploading] = useTransition();

    const upload = (type: 'photo' | 'ultrasound' | 'document', file: File) => {
        startUploading(async () => {
            const fd = new FormData();
            fd.set('animalId', animalId);
            fd.set('type', type);
            fd.set('file', file);
            try {
                await uploadAnimalAttachment(fd);
                onChange();
            } catch (err) {
                alert((err as Error).message);
            }
        });
    };

    const remove = async (id: string) => {
        if (!confirm('¿Eliminar este adjunto?')) return;
        try {
            await deleteAnimalAttachment(id);
            onChange();
        } catch (err) {
            alert((err as Error).message);
        }
    };

    return (
        <div className="space-y-5">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    <h3 className="text-sm font-bold text-gray-900 flex-1">
                        Subir nuevo
                    </h3>
                    <select
                        value={uploadType}
                        onChange={(e) =>
                            setUploadType(
                                e.target.value as 'photo' | 'ultrasound' | 'document',
                            )
                        }
                        className="text-sm border border-gray-200 rounded px-2 py-1"
                    >
                        <option value="photo">Foto</option>
                        <option value="ultrasound">Ecografía</option>
                        <option value="document">Documento PDF</option>
                    </select>
                    <button
                        onClick={() => {
                            if (uploadType === 'document') docInputRef.current?.click();
                            else fileInputRef.current?.click();
                        }}
                        disabled={uploading}
                        className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-medium px-3 py-1.5 rounded-lg"
                    >
                        {uploading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Upload className="w-4 h-4" />
                        )}
                        Subir
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) upload(uploadType === 'document' ? 'photo' : uploadType, f);
                            e.target.value = '';
                        }}
                    />
                    <input
                        ref={docInputRef}
                        type="file"
                        accept="application/pdf"
                        hidden
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) upload('document', f);
                            e.target.value = '';
                        }}
                    />
                </div>
                <p className="text-xs text-gray-500">
                    Máx. 10 MB por archivo. Las fotos también pueden hacerse la
                    principal del animal desde la cabecera.
                </p>
            </div>

            <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">
                    Fotos y ecografías ({photos.length})
                </h3>
                {photos.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">Sin fotos aún.</p>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {photos.map((p) => (
                            <div
                                key={p.id}
                                className="relative group rounded-lg overflow-hidden border border-gray-100 bg-white"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={p.url ?? ''}
                                    alt={p.caption ?? 'Foto'}
                                    className="w-full h-32 object-cover"
                                />
                                <button
                                    onClick={() => remove(p.id)}
                                    className="absolute top-1 right-1 w-7 h-7 bg-red-600/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                    title="Borrar"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 text-[10px] text-white">
                                    {p.type === 'ultrasound' && (
                                        <span className="inline-block bg-indigo-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider mr-1 text-[9px]">
                                            Eco
                                        </span>
                                    )}
                                    {new Date(p.takenAt).toLocaleDateString('es-ES')}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">
                    Documentos ({docs.length})
                </h3>
                {docs.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">Sin documentos.</p>
                ) : (
                    <ul className="space-y-1">
                        {docs.map((d) => (
                            <li
                                key={d.id}
                                className="bg-white border border-gray-100 rounded-lg p-3 flex items-center gap-3 text-sm"
                            >
                                <FileText className="w-4 h-4 text-gray-500 shrink-0" />
                                <a
                                    href={d.url ?? '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-green-700 hover:underline flex-1 min-w-0 truncate"
                                >
                                    {d.caption || (d.url ?? '').split('/').pop()}
                                </a>
                                <span className="text-xs text-gray-400 shrink-0">
                                    {new Date(d.takenAt).toLocaleDateString('es-ES')}
                                </span>
                                <button
                                    onClick={() => remove(d.id)}
                                    className="text-red-600 hover:text-red-800"
                                    title="Borrar"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

function NotasTab({
    notes,
    animalId,
    onChange,
}: {
    notes: Array<{ id: string; caption: string | null; takenAt: Date }>;
    animalId: string;
    onChange: () => void;
}) {
    const [text, setText] = useState('');
    const [saving, startSaving] = useTransition();

    const submit = () => {
        if (!text.trim()) return;
        startSaving(async () => {
            try {
                await addAnimalNote(animalId, text);
                setText('');
                onChange();
            } catch (e) {
                alert((e as Error).message);
            }
        });
    };

    const remove = async (id: string) => {
        if (!confirm('¿Eliminar la nota?')) return;
        try {
            await deleteAnimalAttachment(id);
            onChange();
        } catch (err) {
            alert((err as Error).message);
        }
    };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={3}
                    placeholder="Observación, anotación o recordatorio…"
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:border-green-500 focus:outline-none"
                />
                <div className="flex justify-end mt-2">
                    <button
                        onClick={submit}
                        disabled={saving || !text.trim()}
                        className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-medium px-3 py-1.5 rounded-lg"
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Plus className="w-4 h-4" />
                        )}
                        Añadir nota
                    </button>
                </div>
            </div>

            {notes.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Sin notas aún.</p>
            ) : (
                <ul className="space-y-2">
                    {notes.map((n) => (
                        <li
                            key={n.id}
                            className="bg-white border border-gray-100 rounded-lg p-3 text-sm"
                        >
                            <div className="flex justify-between items-start gap-2">
                                <p className="text-gray-800 whitespace-pre-wrap flex-1 min-w-0">
                                    {n.caption}
                                </p>
                                <button
                                    onClick={() => remove(n.id)}
                                    className="text-red-600 hover:text-red-800 shrink-0"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-1">
                                {new Date(n.takenAt).toLocaleString('es-ES')}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// ─── PRODUCTIVIDAD ECONÓMICA (VACAS NODRIZAS) ──────────────────────────────────

type Productivity = Awaited<ReturnType<typeof getCowProductivity>>;

function CowProductivityCard({ animalId }: { animalId: string }) {
    const [data, setData] = useState<Productivity | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        getCowProductivity(animalId)
            .then((r) => {
                if (!cancelled) setData(r);
            })
            .catch(() => { /* noop */ })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [animalId]);

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-sm text-gray-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Calculando productividad económica…
            </div>
        );
    }

    if (!data || 'error' in data) return null;

    const usedRealIep = data.actualIepDays != null;
    const usedRealWeight = data.averageWeaningWeightKg != null;
    const fmtEur = (v: number) =>
        v.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

    return (
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Coins className="w-5 h-5 text-amber-500" />
                        Productividad económica
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Cuánto produce esta vaca al año vía su descendencia.
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
                        Partos registrados
                    </p>
                    <p className="text-xl font-bold text-gray-900">{data.partosCount}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat
                    label="IEP"
                    value={
                        usedRealIep
                            ? `${data.actualIepDays!.toFixed(0)} d`
                            : 'sectorial 390 d'
                    }
                    hint={usedRealIep ? 'medido' : 'sin datos'}
                />
                <Stat
                    label="Peso destete medio"
                    value={
                        usedRealWeight
                            ? `${data.averageWeaningWeightKg!.toFixed(0)} kg`
                            : 'sectorial 220 kg'
                    }
                    hint={usedRealWeight ? 'medido' : 'sin datos'}
                />
                <Stat
                    label="Terneros/año"
                    value={data.biological.weanedPerYear.toFixed(2)}
                />
                <Stat
                    label="Kg/año"
                    value={`${data.biological.kgWeanedPerYear.toFixed(0)} kg`}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-700">
                        Escenario A · Venta al destete
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                        {fmtEur(data.atWeaning.grossRevenueEur)}
                    </p>
                    <p className="text-xs text-gray-600">
                        bruto · {data.atWeaning.pricePerKg.toFixed(2)} €/kg vivo
                    </p>
                    {data.netAtWeaningEur != null && (
                        <p className={`text-xs mt-1 font-bold ${data.netAtWeaningEur > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            {fmtEur(data.netAtWeaningEur)} neto tras costes
                        </p>
                    )}
                </div>
                <div className="bg-sky-50 border border-sky-100 rounded-lg p-3">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-sky-700">
                        Escenario B · Cebo y SEUROP
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                        {fmtEur(data.atSlaughter.netRevenueEur)}
                    </p>
                    <p className="text-xs text-gray-600">
                        tras cebo · cat. MAPA {data.atSlaughter.mapaCategory} · {data.atSlaughter.pricePerKgCarcass.toFixed(2)} €/kg canal
                    </p>
                    {data.netAtSlaughterEur != null && (
                        <p className={`text-xs mt-1 font-bold ${data.netAtSlaughterEur > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            {fmtEur(data.netAtSlaughterEur)} neto tras costes anuales
                        </p>
                    )}
                </div>
            </div>

            <details className="text-xs text-gray-500">
                <summary className="cursor-pointer hover:text-gray-700">
                    Cómo se calcula
                </summary>
                <p className="mt-1 leading-relaxed">{data.explanation}</p>
                <p className="mt-1 italic">
                    Costes anuales por vaca asumidos (sectorial): alimentación 280 €,
                    sanidad 40 €, amortización vientre 75 €, mano de obra 90 €,
                    otros 25 € · total 510 €.
                </p>
            </details>
        </div>
    );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return (
        <div className="bg-white border border-gray-100 rounded-lg p-2">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
                {label}
            </p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">{value}</p>
            {hint && <p className="text-[10px] text-gray-400">{hint}</p>}
        </div>
    );
}

// ─── HELPERS ────────────────────────────────────────────────────────────────────

function monthsBetween(a: Date, b: Date): number {
    const ms = b.getTime() - a.getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24 * 30.4375));
}
