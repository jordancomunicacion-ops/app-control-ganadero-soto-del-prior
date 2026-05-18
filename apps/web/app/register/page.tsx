'use client';

import { useActionState, useState } from 'react';
import { registerUser } from '@/app/lib/actions';
import Link from 'next/link';
import Image from 'next/image';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function Page() {
    const [state, formAction, isPending] = useActionState(registerUser, undefined);
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-md border border-gray-100">
                <div className="flex justify-center mb-6">
                    <Image src="/logo-icon.png" alt="SOTO DEL PRIOR" width={96} height={96} priority className="h-24 w-auto" />
                </div>
                <h1 className="mb-6 text-center text-xl font-bold text-gray-900">
                    Crear cuenta
                </h1>
                <form action={formAction} className="space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="name">
                            Nombre
                        </label>
                        <input
                            className="block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:text-sm"
                            id="name"
                            type="text"
                            name="name"
                            placeholder="Tu nombre"
                            required
                            autoComplete="name"
                        />
                        {state?.errors?.name && (
                            <p className="mt-1.5 text-xs text-red-600">{state.errors.name}</p>
                        )}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="email">
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
                        {state?.errors?.email && (
                            <p className="mt-1.5 text-xs text-red-600">{state.errors.email}</p>
                        )}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="password">
                            Contraseña
                        </label>
                        <div className="relative">
                            <input
                                className="block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 placeholder-gray-400 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:text-sm"
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                placeholder="Mínimo 6 caracteres"
                                required
                                minLength={6}
                                autoComplete="new-password"
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
                        {state?.errors?.password && (
                            <p className="mt-1.5 text-xs text-red-600">{state.errors.password}</p>
                        )}
                    </div>

                    {state?.message && (
                        <div
                            role="alert"
                            aria-live="polite"
                            className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                        >
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{state.message}</span>
                        </div>
                    )}

                    <button
                        className="flex w-full justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                        aria-disabled={isPending}
                        disabled={isPending}
                    >
                        {isPending ? 'Creando cuenta…' : 'Registrarse'}
                    </button>

                    <div className="text-center text-sm">
                        <span className="text-gray-500">¿Ya tienes cuenta? </span>
                        <Link href="/login" className="font-medium text-green-600 hover:text-green-500">
                            Inicia sesión
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
