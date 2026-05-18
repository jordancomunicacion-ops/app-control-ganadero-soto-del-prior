'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';

interface AppShellProps {
    children: React.ReactNode;
    activeTab: string;
    onTabChange: (tab: string) => void;
    onLogout: () => void;
    userRole?: string;
}

export function AppShell({ children, activeTab, onTabChange, onLogout, userRole }: AppShellProps) {
    // Sidebar off-canvas en pantallas < lg. En desktop está siempre visible.
    const [mobileOpen, setMobileOpen] = useState(false);

    // Bloquear scroll del body cuando el drawer está abierto.
    useEffect(() => {
        if (!mobileOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [mobileOpen]);

    // Cerrar el drawer al elegir pestaña. Lo hacemos aquí (en el handler) en
    // lugar de un effect sobre `activeTab` para evitar el cascading render
    // que dispararía react-hooks/set-state-in-effect.
    const handleTabChange = (tab: string) => {
        setMobileOpen(false);
        onTabChange(tab);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Sidebar
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onLogout={onLogout}
                userRole={userRole}
                mobileOpen={mobileOpen}
                onCloseMobile={() => setMobileOpen(false)}
            />

            {/* Barra superior móvil con botón menú + logo. Solo < lg. */}
            <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-100 flex items-center gap-3 px-4 h-14 shadow-sm">
                <button
                    type="button"
                    onClick={() => setMobileOpen(true)}
                    aria-label="Abrir menú"
                    className="p-2 -m-2 rounded text-gray-600 hover:bg-gray-100"
                >
                    <Menu className="w-6 h-6" />
                </button>
                <Image src="/logo-text.png" alt="SOTO DEL PRIOR" width={140} height={36} priority className="h-8 w-auto" />
            </header>

            <main className="lg:ml-64 p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
