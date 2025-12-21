'use client';

import React from 'react';
import { useStorage } from '@/context/StorageContext';

interface SidebarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    onLogout: () => void;
}

export function Sidebar({ activeTab, onTabChange, onLogout }: SidebarProps) {
    const { read } = useStorage();
    const sessionUser = read('sessionUser', 'Usuario');

    const navItems = [
        { id: 'home', label: 'Inicio', icon: '🏠' },
        { id: 'farms', label: 'Fincas', icon: '📍' },
        { id: 'animals', label: 'Animales', icon: '🐮' },
        { id: 'events', label: 'Eventos', icon: '📅' },
        { id: 'calculator', label: 'Rendimiento', icon: '📈' },
        { id: 'reports', label: 'Reportes', icon: '📊' },
        { id: 'data', label: 'Datos', icon: '💾' }
    ];

    return (
        <aside className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col fixed left-0 top-0 z-30 shadow-sm">
            <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {sessionUser.charAt(0).toUpperCase()}
                </div>
                <div>
                    <p className="font-bold text-gray-800 text-sm truncate w-32">{sessionUser}</p>
                    <p className="text-xs text-gray-500">Gestor</p>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onTabChange(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                    >
                        <span>{item.icon}</span>
                        {item.label}
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-gray-100 space-y-2">
                <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50">
                    <span>👤</span> Mi Perfil
                </button>
                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50"
                >
                    <span>🚪</span> Cerrar Sesión
                </button>
            </div>
        </aside>
    );
}
