'use client';

import { useActionState } from 'react';
import { sendPasswordResetEmail } from '@/app/lib/auth-actions';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const [state, formAction, isPending] = useActionState(sendPasswordResetEmail, undefined);

    return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
                <div className="flex justify-center mb-6">
                    <img src="/logo-icon.png" alt="SOTO DEL PRIOR" className="h-24" />
                </div>

                <h2 className="mb-6 text-2xl font-bold text-gray-900 text-center">Recuperar contraseña</h2>
                <p className="mb-6 text-sm text-gray-600 text-center">
                    Ingresa tu email y te enviaremos las instrucciones.
                </p>

                {state?.success ? (
                    <div className="rounded-md bg-green-50 p-4 mb-6">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-green-800">
                                    {state.message}
                                </p>
                            </div>
                        </div>
                        <div className="mt-4 text-center">
                            <Link href="/login" className="text-sm font-medium text-green-600 hover:text-green-500">
                                Volver al inicio de sesión
                            </Link>
                        </div>
                    </div>
                ) : (
                    <form action={formAction} className="space-y-6">
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
                            />
                            {state?.errors?.email && (
                                <p className="mt-2 text-sm text-red-600">{state.errors.email[0]}</p>
                            )}
                        </div>

                        {state?.message && !state?.success && (
                            <div className="rounded-md bg-red-50 p-4">
                                <div className="flex">
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-red-800">{state.message}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isPending}
                            className="flex w-full justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                        >
                            {isPending ? 'Enviando...' : 'Enviar instrucciones'}
                        </button>

                        <div className="text-center text-sm">
                            <Link href="/login" className="font-medium text-green-600 hover:text-green-500">
                                Volver al inicio de sesión
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
