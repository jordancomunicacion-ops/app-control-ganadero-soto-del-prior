'use client';

import { useActionState } from 'react';
import { authenticate } from '@/app/lib/actions';
import Link from 'next/link';
import { Tractor } from 'lucide-react';

export default function Page() {
    const [errorMessage, formAction, isPending] = useActionState(
        authenticate,
        undefined,
    );

    return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
                <div className="flex justify-center mb-6">
                    <img src="/logo-icon.png" alt="SOTO DEL PRIOR" className="h-24" />
                </div>
                <h1 className="mb-4 text-center text-2xl font-bold text-gray-900">
                    App Ganadera Login
                </h1>
                <form action={formAction} className="space-y-4">
                    <div>
                        <label
                            className="mb-2 block text-sm font-medium text-gray-700"
                            htmlFor="email"
                        >
                            Email
                        </label>
                        <input
                            className="block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
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
                        <input
                            className="block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
                            id="password"
                            type="password"
                            name="password"
                            placeholder="********"
                            required
                            minLength={6}
                            autoComplete="current-password"
                        />
                    </div>
                    <div
                        className="flex items-end space-x-1"
                        aria-live="polite"
                        aria-atomic="true"
                    >
                        {errorMessage && (
                            <p className="text-sm text-red-500">{errorMessage}</p>
                        )}
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input
                                id="remember-me"
                                name="remember-me"
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                                Recuérdame
                            </label>
                        </div>
                    </div>

                    <button
                        className="flex w-full justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                        aria-disabled={isPending}
                        disabled={isPending}
                    >
                        Iniciar Sesión
                    </button>

                    <div className="text-center text-sm mt-4">
                        <span className="text-gray-500">¿No tienes cuenta? </span>
                        <Link href="/register" className="font-medium text-green-600 hover:text-green-500">
                            Regístrate
                        </Link>
                    </div>
                    <div className="text-center text-xs mt-2">
                        <Link href="/forgot-password" className="font-medium text-gray-500 hover:text-gray-700">
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
