'use client';

import { useActionState, useEffect, useState } from 'react';
import { authenticate } from '@/app/lib/actions';
import Link from 'next/link';
import Image from 'next/image';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function Page() {
    const [state, formAction, isPending] = useActionState(
        authenticate,
        undefined,
    );
    const [showPassword, setShowPassword] = useState(false);

    // Client-side redirect on success
    useEffect(() => {
        if (state && typeof state === 'object' && 'success' in state && state.success) {
            window.location.href = '/dashboard';
        }
    }, [state]);

    const errorMessage = typeof state === 'string' ? state : null;

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-md border border-gray-100">
                <div className="flex justify-center mb-6">
                    <Image src="/logo-icon.png" alt="SOTO DEL PRIOR" width={96} height={96} priority className="h-24 w-auto" />
                </div>

                <form action={formAction} className="space-y-4">
                    <div>
                        <label
                            className="mb-2 block text-sm font-medium text-gray-700"
                            htmlFor="email"
                        >
                            Email
                        </label>
                        <input
                            className="block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:text-sm"
                            id="email"
                            type="email"
                            name="email"
                            placeholder="usuario@sotodelprior.com"
                            required
                            autoComplete="email"
                        />
                    </div>
                    <div>
                        <label
                            className="mb-2 block text-sm font-medium text-gray-700"
                            htmlFor="password"
                        >
                            Contraseña
                        </label>
                        <div className="relative">
                            <input
                                className="block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 placeholder-gray-400 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:text-sm"
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                placeholder="********"
                                required
                                minLength={6}
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-700"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {errorMessage && (
                        <div
                            role="alert"
                            aria-live="polite"
                            className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                        >
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    <button
                        className="flex w-full justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                        aria-disabled={isPending}
                        disabled={isPending}
                    >
                        {isPending ? 'Entrando…' : 'Iniciar sesión'}
                    </button>

                    <div className="text-center text-sm mt-4 space-y-2">
                        <div>
                            <span className="text-gray-500">¿No tienes cuenta? </span>
                            <Link href="/register" className="font-medium text-green-600 hover:text-green-500">
                                Regístrate
                            </Link>
                        </div>
                        <div>
                            <Link href="/forgot-password" className="text-gray-500 hover:text-gray-900">
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
