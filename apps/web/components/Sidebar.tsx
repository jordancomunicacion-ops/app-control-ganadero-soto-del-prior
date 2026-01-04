'use client';

import React from 'react';
import { useStorage } from '@/context/StorageContext';
import {
    Home,
    MapPin,
    Beef,
    Calendar,
    TrendingUp,
    BarChart3,
    Database,
    User,
    Users,
    LogOut
} from 'lucide-react';

interface SidebarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    onLogout: () => void;
}

export function Sidebar({ activeTab, onTabChange, onLogout }: SidebarProps) {
    const { read, write } = useStorage();
    const sessionUser = read('appSession', 'Usuario') as string;
    const userAvatar = read('userAvatar', null);

    // Auto-promote Gerencia if stuck as worker
    React.useEffect(() => {
        const users = read<any[]>('users', []);
        // Check for Gerencia account existence and permissions
        const gerenciaUser = users.find((u: any) => u.name.toLowerCase().includes('gerencia') || u.email === 'gerencia@sotodelprior.com');

        if (!gerenciaUser) {
            // Create Gerencia if missing
            const newGerencia = {
                name: 'Gerencia',
                email: 'gerencia@sotodelprior.com',
                pass: 'admin123',
                role: 'admin',
                joined: new Date().toISOString(),
                jobTitle: 'Dirección General',
                firstName: 'Gerencia',
                lastName: 'Soto del Prior'
            };
            write('users', [...users, newGerencia]);
            console.log('Auto-created Gerencia account');
        } else if (gerenciaUser.role !== 'admin') {
            // Promote to admin
            const updatedUser = { ...gerenciaUser, role: 'admin' };
            const otherUsers = users.filter((u: any) => u.name !== gerenciaUser.name);
            write('users', [...otherUsers, updatedUser]);
            // Force page reload to reflect changes
            window.location.reload();
        }
    }, [sessionUser, read, write]);

    const users = read<any[]>('users', []);
    const currentUser = users.find((u: any) => u.name === sessionUser);
    const role = currentUser?.role || 'worker';

    // Hard override for Gerencia to ensure access even if DB is out of sync
    const isGerencia = sessionUser?.toLowerCase().includes('gerencia') || sessionUser === 'gerencia@sotodelprior.com';
    const isAdmin = role === 'admin' || isGerencia;

    const navItems = [
        { id: 'home', label: 'Inicio', icon: Home },
        { id: 'farms', label: 'Fincas', icon: MapPin },
        { id: 'animals', label: 'Animales', icon: Beef },
        { id: 'events', label: 'Eventos', icon: Calendar },
        { id: 'calculator', label: 'Rendimiento', icon: TrendingUp },
        { id: 'reports', label: 'Reportes', icon: BarChart3 },
        { id: 'users', label: 'Equipo', icon: Users },
        { id: 'data', label: 'Datos', icon: Database }
    ].filter(item => {
        if (item.id === 'calculator' || item.id === 'reports' || item.id === 'data' || item.id === 'users') {
            return isAdmin; // Only Admins see Financials/Data/Users
        }
        return true;
    });

    const displayUser = sessionUser || 'Usuario';

    return (
        <aside className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col fixed left-0 top-0 z-30 shadow-sm">
            <div className="p-4 flex justify-center border-b border-gray-100">
                <img src="/logo-text.png" alt="SOTO DEL PRIOR" className="h-12" />
            </div>
            <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                {userAvatar ? (
                    <img
                        src={userAvatar}
                        alt="Profile"
                        className="w-10 h-10 rounded-full object-cover"
                    />
                ) : (
                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {displayUser.charAt(0).toUpperCase()}
                    </div>
                )}
                <div>
                    <p className="font-bold text-gray-800 text-sm truncate w-32">{displayUser}</p>
                    <p className="text-xs text-gray-500 capitalize">{isAdmin ? 'Administrador' : role}</p>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onTabChange(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id
                            ? 'bg-green-50 text-green-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                    >
                        <item.icon className="w-5 h-5" />
                        {item.label}
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-gray-100 space-y-2">
                <button
                    onClick={() => onTabChange('profile')}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'profile'
                        ? 'bg-green-50 text-green-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                >
                    <User className="w-5 h-5" />
                    <span>Mi Perfil</span>
                </button>

                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50"
                >
                    <LogOut className="w-5 h-5" />
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        </aside>
    );
}
