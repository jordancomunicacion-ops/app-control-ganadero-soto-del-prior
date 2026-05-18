'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
    id: number;
    kind: ToastKind;
    message: string;
}

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: 'default' | 'danger';
}

interface UiContextValue {
    toast: (kind: ToastKind, message: string) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
    info: (message: string) => void;
    confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const UiContext = createContext<UiContextValue | null>(null);

export function useUi(): UiContextValue {
    const ctx = useContext(UiContext);
    if (!ctx) throw new Error('useUi must be used inside <UiProvider>');
    return ctx;
}

const ICONS: Record<ToastKind, React.ComponentType<{ className?: string }>> = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
};

const STYLES: Record<ToastKind, { bg: string; text: string; icon: string }> = {
    success: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', icon: 'text-emerald-600' },
    error:   { bg: 'bg-red-50 border-red-200',         text: 'text-red-800',     icon: 'text-red-600' },
    warning: { bg: 'bg-amber-50 border-amber-200',     text: 'text-amber-800',   icon: 'text-amber-600' },
    info:    { bg: 'bg-sky-50 border-sky-200',         text: 'text-sky-800',     icon: 'text-sky-600' },
};

export function UiProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
    const idRef = useRef(0);

    const remove = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const toast = useCallback((kind: ToastKind, message: string) => {
        const id = ++idRef.current;
        setToasts((prev) => [...prev, { id, kind, message }]);
        // Auto-dismiss después de 4.5s
        window.setTimeout(() => remove(id), 4500);
    }, [remove]);

    const confirm = useCallback((opts: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => setConfirmState({ ...opts, resolve }));
    }, []);

    const value = useMemo<UiContextValue>(() => ({
        toast,
        success: (m) => toast('success', m),
        error:   (m) => toast('error', m),
        warning: (m) => toast('warning', m),
        info:    (m) => toast('info', m),
        confirm,
    }), [toast, confirm]);

    return (
        <UiContext.Provider value={value}>
            {children}

            {/* Toast container */}
            <div
                className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] pointer-events-none"
                aria-live="polite"
                aria-atomic="true"
            >
                {toasts.map((t) => {
                    const Icon = ICONS[t.kind];
                    const s = STYLES[t.kind];
                    return (
                        <div
                            key={t.id}
                            role="status"
                            className={`pointer-events-auto flex items-start gap-3 ${s.bg} ${s.text} border rounded-lg shadow-sm px-4 py-3 animate-in fade-in slide-in-from-top-2`}
                        >
                            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${s.icon}`} />
                            <p className="flex-1 text-sm font-medium leading-snug">{t.message}</p>
                            <button
                                type="button"
                                onClick={() => remove(t.id)}
                                aria-label="Cerrar notificación"
                                className={`shrink-0 -m-1 p-1 rounded hover:bg-black/5 ${s.icon}`}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Confirm dialog */}
            {confirmState && (
                <ConfirmDialog
                    state={confirmState}
                    onClose={(result) => {
                        confirmState.resolve(result);
                        setConfirmState(null);
                    }}
                />
            )}
        </UiContext.Provider>
    );
}

function ConfirmDialog({
    state,
    onClose,
}: {
    state: ConfirmOptions & { resolve: (v: boolean) => void };
    onClose: (result: boolean) => void;
}) {
    const isDanger = state.tone === 'danger';
    const confirmBtnRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        confirmBtnRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40">
            <div role="dialog" aria-modal="true" className="bg-white rounded-xl shadow-lg border border-gray-100 w-full max-w-md p-6 animate-in fade-in zoom-in-95">
                <div className="flex items-start gap-3">
                    {isDanger ? (
                        <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                    ) : (
                        <Info className="w-6 h-6 text-sky-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                        {state.title && <h3 className="font-bold text-gray-900 text-base mb-1">{state.title}</h3>}
                        <p className="text-sm text-gray-600 leading-relaxed">{state.message}</p>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => onClose(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        {state.cancelLabel ?? 'Cancelar'}
                    </button>
                    <button
                        ref={confirmBtnRef}
                        type="button"
                        onClick={() => onClose(true)}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-colors ${
                            isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                        }`}
                    >
                        {state.confirmLabel ?? 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
