'use client';

import Image from 'next/image';
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
    LogOut,
    X,
} from 'lucide-react';

interface SidebarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    onLogout: () => void;
    userRole?: string;
    /** Estado del drawer en móvil (controlado por AppShell). */
    mobileOpen?: boolean;
    onCloseMobile?: () => void;
}

type StoredUser = {
    name: string;
    role?: string;
    permissions?: string[];
};

export function Sidebar({ activeTab, onTabChange, onLogout, userRole, mobileOpen = false, onCloseMobile }: SidebarProps) {
    const { read } = useStorage();
    const sessionUser = read('appSession', 'Usuario') as string;
    const userAvatar = read('userAvatar', null);

    const users = read<StoredUser[]>('users', []);
    const currentUser = users.find((u) => u.name === sessionUser);

    // Heuristic fallback so the legacy "Gerencia" admin still gets full access
    // even if the local user store has not been hydrated yet.
    const isGerenciaName = sessionUser?.toLowerCase().includes('gerencia');
    const role = (userRole || currentUser?.role || (isGerenciaName ? 'ADMIN' : 'WORKER'))?.toUpperCase();
    const isAdmin = role === 'ADMIN' || isGerenciaName;

    const navItems = [
        { id: 'home', label: 'Inicio', icon: Home },
        { id: 'farms', label: 'Fincas', icon: MapPin },
        { id: 'animals', label: 'Animales', icon: Beef },
        { id: 'events', label: 'Eventos', icon: Calendar },
        { id: 'calculator', label: 'Rendimiento', icon: TrendingUp },
        { id: 'reports', label: 'Reportes', icon: BarChart3 },
        { id: 'data', label: 'Datos', icon: Database },
        { id: 'users', label: 'Gestión Usuarios', icon: Users }
    ].filter(item => {
        // 1. Admin / Gerencia always sees everything
        if (isAdmin) return true;

        // 2. Strict check for Users tab: Admin or Manager (USER)
        if (item.id === 'users' && role !== 'ADMIN' && role !== 'USER') return false;

        // 3. For other roles (worker, vet, etc.), check permissions list
        // If no permissions defined (legacy), defaulting to allowing basic tabs or blocking? 
        // Let's default to allowing basic tabs if empty, or strict mode?
        // User requested "authorize what sections they see". So strict mode is better.
        // But we need to handle legacy/null permissions.
        const permissions = currentUser?.permissions || [];

        // If permissions exist, strict check
        if (permissions.length > 0) {
            return permissions.includes(item.id) || item.id === 'home'; // Always allow Home
        }

        // Fallback for users without permissions set yet (allow basics)
        return ['home', 'farms', 'animals', 'events', 'calculator'].includes(item.id);
    });

    const displayUser = sessionUser || 'Usuario';

    return (
        <>
            {/* Backdrop solo en móvil cuando el drawer está abierto */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/40 z-30"
                    onClick={onCloseMobile}
                    aria-hidden="true"
                />
            )}
            <aside
                className={`w-64 bg-white border-r border-gray-200 h-screen flex flex-col fixed left-0 top-0 z-40 shadow-sm transition-transform duration-200 ease-out ${
                    mobileOpen ? 'translate-x-0' : '-translate-x-full'
                } lg:translate-x-0`}
                aria-label="Navegación principal"
            >
            <div className="p-4 flex justify-between items-center border-b border-gray-100">
                <Image src="/logo-text.png" alt="SOTO DEL PRIOR" width={180} height={48} priority className="h-12 w-auto" />
                {/* Botón cerrar solo en móvil */}
                <button
                    type="button"
                    onClick={onCloseMobile}
                    aria-label="Cerrar menú"
                    className="lg:hidden p-1 text-gray-500 hover:text-gray-900"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
            <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                {userAvatar ? (
                    // Avatar persisted in localStorage as a data URL, sized client-side
                    // eslint-disable-next-line @next/next/no-img-element
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
        </>
    );
}
