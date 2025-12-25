'use client';

import { useActionState } from 'react';
import { registerUser } from '@/app/lib/actions';
import Link from 'next/link';
import { Tractor } from 'lucide-react';

export default function Page() {
    const [state, formAction, isPending] = useActionState(registerUser, undefined);

    return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
                <div className="flex justify-center mb-6">
                    <img src="/logo-icon.png" alt="SOTO DEL PRIOR" className="h-24" />
                </div>
                <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">
                    Crear Cuenta - App Ganadera
                </h1>
                <form action={formAction} className="space-y-4">
                    <div>
                        <label
                            className="mb-2 block text-sm font-medium text-gray-700"
                            htmlFor="name"
                        >
                            Nombre
                        </label>
                        <input
                            className="block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
                            id="name"
                            type="text"
                            name="name"
                            placeholder="Tu nombre"
                            required
                            autoComplete="name"
                        />
                        {state?.errors?.name && (
                            <p className="mt-2 text-sm text-red-500">{state.errors.name}</p>
                        )}
                    </div>
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
                        {state?.errors?.email && (
                            <p className="mt-2 text-sm text-red-500">{state.errors.email}</p>
                        )}
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
                            autoComplete="new-password"
                        />
                        {state?.errors?.password && (
                            <p className="mt-2 text-sm text-red-500">{state.errors.password}</p>
                        )}
                    </div>

                    <div aria-live="polite" aria-atomic="true">
                        {state?.message && (
                            <p className="text-sm text-red-500">{state.message}</p>
                        )}
                    </div>

                    <button
                        className="flex w-full justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                        aria-disabled={isPending}
                        disabled={isPending}
                    >
                        {isPending ? 'Creando cuenta...' : 'Registrarse'}
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
