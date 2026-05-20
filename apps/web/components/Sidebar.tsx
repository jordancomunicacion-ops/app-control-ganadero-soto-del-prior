'use client';

import Image from 'next/image';
import { useStorage } from '@/context/StorageContext';
import {
    Home,
    MapPin,
    Beef,
    Calendar,
    CalendarDays,
    Wheat,
    BarChart3,
    Bell,
    Heart,
    Award,
    Stethoscope,
    Sparkles,
    Sprout,
    Upload,
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

    // Grupos lógicos: operativa diaria, gestión, administración.
    // "data" se oculta hasta que el módulo esté implementado (hoy es 100% «Próximamente»).
    const navGroups: Array<{ label: string; items: Array<{ id: string; label: string; icon: typeof Home }> }> = [
        {
            label: 'Operativa',
            items: [
                { id: 'home', label: 'Inicio', icon: Home },
                { id: 'animals', label: 'Animales', icon: Beef },
                { id: 'health', label: 'Sanidad', icon: Stethoscope },
                { id: 'reproduction', label: 'Reproducción', icon: Heart },
                { id: 'grazing', label: 'Pastoreo', icon: Sprout },
                { id: 'events', label: 'Eventos', icon: Calendar },
                { id: 'calculator', label: 'Nutrición', icon: Wheat },
            ],
        },
        {
            label: 'Gestión',
            items: [
                { id: 'farms', label: 'Fincas', icon: MapPin },
                { id: 'reports', label: 'Reportes', icon: BarChart3 },
                { id: 'forage', label: 'Calendario', icon: CalendarDays },
                { id: 'welfare', label: 'Bienestar', icon: Award },
                { id: 'simulate', label: 'Simulación', icon: Sparkles },
                { id: 'import', label: 'Importar', icon: Upload },
            ],
        },
        {
            label: 'Administración',
            items: [
                { id: 'alerts', label: 'Avisos', icon: Bell },
                { id: 'users', label: 'Equipo', icon: Users },
            ],
        },
    ];

    const isItemVisible = (id: string): boolean => {
        // 1. Admin / Gerencia always sees everything
        if (isAdmin) return true;

        // 2. Strict check for Users tab: Admin or Manager (USER)
        if (id === 'users' && role !== 'ADMIN' && role !== 'USER') return false;

        // 3. For other roles (worker, vet, etc.), check permissions list
        const permissions = currentUser?.permissions || [];
        if (permissions.length > 0) {
            return permissions.includes(id) || id === 'home'; // Always allow Home
        }

        // Fallback for users without permissions set yet (allow basics)
        return ['home', 'farms', 'animals', 'events', 'calculator', 'alerts', 'health', 'simulate', 'import', 'grazing', 'reproduction', 'welfare', 'forage'].includes(id);
    };

    const visibleGroups = navGroups
        .map((g) => ({ ...g, items: g.items.filter((i) => isItemVisible(i.id)) }))
        .filter((g) => g.items.length > 0);

    const displayUser = sessionUser || 'Usuario';
    const roleLabel = isAdmin
        ? 'Administrador'
        : role === 'VET' ? 'Veterinario'
        : role === 'WORKER' ? 'Trabajador'
        : role === 'USER' ? 'Cliente'
        : role
            ? role.charAt(0) + role.slice(1).toLowerCase()
            : 'Usuario';

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
                <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">{displayUser}</p>
                    <p className="text-xs text-gray-500">{roleLabel}</p>
                </div>
            </div>

            <nav className="flex-1 px-4 py-3 overflow-y-auto" aria-label="Secciones">
                {visibleGroups.map((group, gi) => (
                    <div key={group.label} className={gi > 0 ? 'mt-5' : ''}>
                        <p className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            {group.label}
                        </p>
                        <div className="space-y-1">
                            {group.items.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => onTabChange(item.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id
                                        ? 'bg-green-50 text-green-700'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    <item.icon className="w-5 h-5" />
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
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
