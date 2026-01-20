'use client';

import { useActionState, Suspense } from 'react';
import { resetPassword } from '@/app/lib/auth-actions';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [state, formAction, isPending] = useActionState(resetPassword, undefined);

    if (!token) {
        return (
            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md text-center">
                <p className="text-red-600">Token inválido o faltante.</p>
                <Link href="/login" className="mt-4 block text-sm font-medium text-green-600 hover:text-green-500">
                    Volver al inicio
                </Link>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
            <div className="flex justify-center mb-6">
                <img src="/logo-icon.png" alt="SOTO DEL PRIOR" className="h-24" />
            </div>

            <h2 className="mb-6 text-2xl font-bold text-gray-900 text-center">Restablecer contraseña</h2>

            <form action={formAction} className="space-y-6">
                <input type="hidden" name="token" value={token} />

                <div>
                    <label
                        className="mb-2 block text-sm font-medium text-gray-700"
                        htmlFor="password"
                    >
                        Nueva Contraseña
                    </label>
                    <input
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
                        id="password"
                        type="password"
                        name="password"
                        required
                        minLength={6}
                    />
                    {state?.errors?.password && (
                        <p className="mt-2 text-sm text-red-600">{state.errors.password[0]}</p>
                    )}
                </div>

                <div>
                    <label
                        className="mb-2 block text-sm font-medium text-gray-700"
                        htmlFor="confirmPassword"
                    >
                        Confirmar Contraseña
                    </label>
                    <input
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
                        id="confirmPassword"
                        type="password"
                        name="confirmPassword"
                        required
                        minLength={6}
                    />
                    {state?.errors?.confirmPassword && (
                        <p className="mt-2 text-sm text-red-600">{state.errors.confirmPassword[0]}</p>
                    )}
                </div>

                {state?.message && (
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
                    {isPending ? 'Restableciendo...' : 'Restablecer contraseña'}
                </button>
            </form>
        </div>
    );
}

function LoadingFallback() {
    return (
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md text-center">
            <p className="text-gray-500">Cargando...</p>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <Suspense fallback={<LoadingFallback />}>
                <ResetPasswordForm />
            </Suspense>
        </div>
    );
}
