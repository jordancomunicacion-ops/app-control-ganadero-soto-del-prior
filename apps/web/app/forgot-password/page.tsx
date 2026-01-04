'use client';

import Link from 'next/link';
import { Tractor } from 'lucide-react';

export default function Page() {
    return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
                <div className="flex justify-center mb-6">
                    <img src="/logo-icon.png" alt="SOTO DEL PRIOR" className="h-24" />
                </div>
                <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">
                    Recuperar Contraseña
                </h1>
                <p className="mb-6 text-center text-gray-600">
                    Introduce tu email y te enviaremos instrucciones.
                </p>
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert('Si el email existe, se han enviado las instrucciones (Simulación).'); }}>
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

                    <button
                        className="flex w-full justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    >
                        Enviar instrucciones
                    </button>

                    <div className="text-center text-sm">
                        <Link href="/login" className="font-medium text-green-600 hover:text-green-500">
                            Volver al inicio de sesión
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
