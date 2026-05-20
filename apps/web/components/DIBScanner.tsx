'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Loader2, Search, X } from 'lucide-react';

/**
 * DIBScanner — Lectura del Documento de Identificación Bovina (España).
 *
 * El crotal oficial español tiene formato `ES` + 12 dígitos. En el DIB
 * impreso este código aparece como código de barras (Code-128) y/o
 * código QR. Este componente intenta leer cualquiera de los dos por
 * cámara y, si falla o el dispositivo no soporta `BarcodeDetector`,
 * permite teclear el código a mano.
 *
 * Diseño:
 *   - Sin dependencias externas (no añade peso al bundle).
 *   - Usa la API `BarcodeDetector` (Chrome/Edge/Samsung Internet). Otros
 *     navegadores caen al input manual con la misma UX.
 *   - El parser tolera espacios y separa el crotal del DIB completo:
 *     "ES 01 01 22345678" → "ES010122345678".
 *
 * Eventos:
 *   - `onResult(code)` se dispara cuando se detecta un código válido.
 *   - `onClose()` se dispara cuando el usuario cierra el scanner.
 *
 * Las dos formas devuelven el código en formato canónico `ES` + 12 dígitos.
 */

const ES_CROTAL_RE = /\bES\s*(\d[\s\d]{11,})\b/i;

/** Normaliza un string detectado a `ES` + 12 dígitos o devuelve null. */
export function parseSpanishCrotal(input: string): string | null {
    if (!input) return null;
    const m = input.match(ES_CROTAL_RE);
    if (!m) return null;
    const digits = m[1].replace(/\s+/g, '');
    if (digits.length < 12) return null;
    return `ES${digits.slice(0, 12)}`;
}

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => {
    detect: (
        source: ImageBitmapSource,
    ) => Promise<Array<{ rawValue: string }>>;
};

interface DIBScannerProps {
    onResult: (code: string) => void;
    onClose: () => void;
    /** Si está disponible y se aporta, busca en el servidor inmediatamente
     *  tras detectar el código y reporta si existe el animal. */
    onLookup?: (code: string) => Promise<{ exists: boolean; animalId?: string }>;
}

export function DIBScanner({ onResult, onClose, onLookup }: DIBScannerProps) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const detectorRef = useRef<InstanceType<BarcodeDetectorCtor> | null>(null);
    const rafRef = useRef<number | null>(null);
    const lastDetectedRef = useRef<string | null>(null);

    const [supportsBarcodeDetector, setSupportsBarcodeDetector] = useState<boolean | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [scanning, setScanning] = useState(false);
    const [manualCode, setManualCode] = useState('');
    const [lookupBusy, setLookupBusy] = useState(false);
    const [lookupResult, setLookupResult] = useState<
        | { exists: true; animalId: string; code: string }
        | { exists: false; code: string }
        | null
    >(null);

    // ── Detección de soporte ────────────────────────────────────────────────
    useEffect(() => {
        const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
        if (Ctor) {
            try {
                detectorRef.current = new Ctor({
                    formats: ['code_128', 'qr_code', 'ean_13', 'code_39'],
                });
                setSupportsBarcodeDetector(true);
            } catch {
                setSupportsBarcodeDetector(false);
            }
        } else {
            setSupportsBarcodeDetector(false);
        }
    }, []);

    // ── Cámara ──────────────────────────────────────────────────────────────
    useEffect(() => {
        let active = true;
        if (!supportsBarcodeDetector) return;

        navigator.mediaDevices
            ?.getUserMedia({
                video: { facingMode: { ideal: 'environment' } },
                audio: false,
            })
            .then((stream) => {
                if (!active) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(() => { /* iOS race */ });
                    setScanning(true);
                    loop();
                }
            })
            .catch((err) => {
                setCameraError(err instanceof Error ? err.message : 'Sin permiso de cámara');
            });

        return () => {
            active = false;
            stopCamera();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [supportsBarcodeDetector]);

    const stopCamera = () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setScanning(false);
    };

    const loop = async () => {
        if (!videoRef.current || !detectorRef.current) return;
        try {
            const detections = await detectorRef.current.detect(videoRef.current);
            for (const d of detections) {
                const code = parseSpanishCrotal(d.rawValue);
                if (code && code !== lastDetectedRef.current) {
                    lastDetectedRef.current = code;
                    await handleCode(code);
                    return; // detener loop tras éxito
                }
            }
        } catch {
            // Algunos navegadores tiran si el frame no está listo. Reintenta.
        }
        rafRef.current = requestAnimationFrame(loop);
    };

    const handleCode = async (code: string) => {
        if (onLookup) {
            setLookupBusy(true);
            try {
                const r = await onLookup(code);
                if (r.exists && r.animalId) {
                    setLookupResult({ exists: true, animalId: r.animalId, code });
                } else {
                    setLookupResult({ exists: false, code });
                }
            } catch {
                setLookupResult({ exists: false, code });
            }
            setLookupBusy(false);
        } else {
            onResult(code);
            stopCamera();
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const normalized = parseSpanishCrotal(manualCode) ?? manualCode.trim();
        if (!normalized || normalized.length < 5) {
            alert('Código inválido. Debe ser ES + 12 dígitos.');
            return;
        }
        handleCode(normalized);
    };

    const confirmAndUse = () => {
        if (!lookupResult) return;
        onResult(lookupResult.code);
        stopCamera();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-5 py-3 flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2">
                        <Camera className="w-4 h-4" />
                        Leer crotal / DIB
                    </h3>
                    <button
                        onClick={() => {
                            stopCamera();
                            onClose();
                        }}
                        className="text-white/80 hover:text-white"
                        aria-label="Cerrar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Video / Camera */}
                    {supportsBarcodeDetector ? (
                        cameraError ? (
                            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm text-amber-700 flex items-start gap-2">
                                <CameraOff className="w-4 h-4 mt-0.5" />
                                <div>
                                    <strong>Sin acceso a cámara.</strong>
                                    <p className="text-xs mt-1">
                                        Comprueba los permisos del navegador. Puedes
                                        introducir el código a mano abajo.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3]">
                                <video
                                    ref={videoRef}
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 border-2 border-green-400 rounded-lg pointer-events-none h-16" />
                                <div className="absolute bottom-2 left-2 text-white text-[10px] bg-black/50 px-2 py-0.5 rounded">
                                    Apunta al código de barras o QR del crotal/DIB
                                </div>
                                {scanning && (
                                    <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                        Escaneando
                                    </div>
                                )}
                            </div>
                        )
                    ) : supportsBarcodeDetector === false ? (
                        <div className="bg-sky-50 border border-sky-100 rounded-lg p-3 text-xs text-sky-700">
                            Tu navegador no soporta lectura automática de códigos. Teclea el código a mano abajo.
                        </div>
                    ) : null}

                    {/* Manual */}
                    <form onSubmit={handleManualSubmit} className="space-y-2">
                        <label className="text-xs font-medium text-gray-700">
                            O introdúcelo a mano:
                        </label>
                        <div className="flex gap-2">
                            <input
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value)}
                                placeholder="ES + 12 dígitos"
                                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                                autoFocus={supportsBarcodeDetector === false}
                            />
                            <button
                                type="submit"
                                disabled={lookupBusy}
                                className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-medium px-3 py-2 rounded-lg"
                            >
                                {lookupBusy ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Search className="w-4 h-4" />
                                )}
                                Buscar
                            </button>
                        </div>
                    </form>

                    {/* Resultado */}
                    {lookupResult && (
                        <div
                            className={`border rounded-lg p-3 text-sm ${
                                lookupResult.exists
                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                    : 'bg-amber-50 border-amber-100 text-amber-700'
                            }`}
                        >
                            <p className="font-bold">{lookupResult.code}</p>
                            <p className="text-xs mt-1">
                                {lookupResult.exists
                                    ? `Animal encontrado en el inventario.`
                                    : 'Este crotal no está aún en el inventario. Se usará para dar de alta.'}
                            </p>
                            <button
                                onClick={confirmAndUse}
                                className="mt-2 inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-1.5 rounded"
                            >
                                {lookupResult.exists ? 'Abrir ficha' : 'Dar de alta'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
