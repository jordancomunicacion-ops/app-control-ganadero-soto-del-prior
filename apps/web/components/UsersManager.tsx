'use client';

import React, { useState } from 'react';
import { useStorage } from '@/context/StorageContext';
import { User, Shield, Briefcase, Phone, CreditCard, Calendar, Trash2, Edit2, Search, Plus, Save, X } from 'lucide-react';
import { getUsers, createUser, updateUserStatus, updateUserProfile, deleteUser } from '@/app/lib/user-actions';

interface FullUser {
    id: string; // Real ID
    name: string;
    email: string;
    // ...
    approved: boolean;
    // ...
    role: 'ADMIN' | 'VET' | 'WORKER' | 'USER'; // Standardized to uppercase
    joined: string;
    firstName?: string;
    lastName?: string;
    dni?: string;
    phone?: string;
    dob?: string;
    jobTitle?: string;
    pass?: string; // Optional for list
    permissions?: string[];
    managedById?: string;
}

export function UsersManager({ userId }: { userId?: string }) {
    const { read } = useStorage();
    const [users, setUsers] = useState<FullUser[]>([]);
    const [loading, setLoading] = useState(true);

    // Load from DB
    React.useEffect(() => {
        if (userId) {
            getUsers(userId).then(dbUsers => {
                setUsers(dbUsers as any[]);
                setLoading(false);
            }).catch(err => {
                console.error(err);
                setLoading(false);
            });
        }
    }, [userId]);

    const sessionUser = read('sessionUser', '');

    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState<FullUser | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<FullUser>>({
        role: 'WORKER',
        jobTitle: 'Peón Ganadero',
        permissions: ['farms', 'animals', 'events', 'calculator'] // Default permissions
    });

    const handleSave = async () => {
        if (!formData.name || !formData.email) return alert("Usuario y Email son obligatorios");

        try {
            if (isCreating) {
                const created = await createUser({
                    ...formData,
                    password: formData.pass || '123456',
                    managedById: userId // Associate with current admin
                });
                setUsers([created as any, ...users]);
            } else if (editingUser) {
                await updateUserProfile(editingUser.id, formData);
                // Update local state optimistic
                setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...formData } as FullUser : u));
            }
            setEditingUser(null);
            setIsCreating(false);
            setFormData({ role: 'WORKER', jobTitle: 'Peón Ganadero', permissions: ['farms', 'animals', 'events', 'calculator'] });
        } catch (e: any) {
            alert("Error: " + e.message);
        }
    };

    const handleToggleApproval = async (id: string, currentStatus: boolean) => {
        try {
            await updateUserStatus(id, !currentStatus);
            setUsers(users.map(u => u.id === id ? { ...u, approved: !currentStatus } : u));
        } catch (e: any) {
            alert("Error al actualizar estado: " + e.message);
        }
    };

    const startEdit = (user: FullUser) => {
        setEditingUser(user);
        setIsCreating(false);
        setFormData({ ...user, permissions: user.permissions || [] }); // Load permissions
    };

    const startCreate = () => {
        setEditingUser(null);
        setIsCreating(true);
        setFormData({ role: 'WORKER', jobTitle: 'Peón Ganadero', pass: '123456', permissions: ['farms', 'animals', 'events', 'calculator'] });
    };

    const handleDelete = async (user: FullUser) => {
        if (user.name === sessionUser) return alert("No puedes eliminar tu propio usuario");
        if (confirm(`¿Eliminar usuario ${user.name}?`)) {
            try {
                await deleteUser(user.id);
                setUsers(users.filter(u => u.id !== user.id));
            } catch (e: any) {
                alert("Error eliminando: " + e.message);
            }
        }
    };

    const [activeTab, setActiveTab] = useState<'team' | 'requests'>('team');

    // Filter Logic
    // Requests: Only those with role 'USER' (clients) OR any user not approved yet who IS NOT an employee type
    const requestUsers = users.filter(u => u.role === 'USER' || (!u.approved && !['ADMIN', 'VET', 'WORKER'].includes(u.role?.toUpperCase())));

    // Team: Users with role 'ADMIN', 'VET', 'WORKER' - they stay here regardless of approval status as per user request
    const teamUsers = users.filter(u => ['ADMIN', 'VET', 'WORKER'].includes(u.role?.toUpperCase()));

    const displayedUsers = activeTab === 'team' ? teamUsers : requestUsers;

    const filteredUsers = displayedUsers.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const pendingCount = requestUsers.filter(u => !u.approved).length;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Shield className="w-8 h-8 text-green-600" />
                        Gestión de Usuarios
                    </h2>
                    <p className="text-gray-500">Administra el acceso y los permisos de la plataforma</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-gray-100 p-1 rounded-lg flex text-sm font-medium">
                        <button
                            onClick={() => setActiveTab('team')}
                            className={`px-4 py-2 rounded-md transition-colors ${activeTab === 'team'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            Equipo ({teamUsers.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('requests')}
                            className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${activeTab === 'requests'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            Solicitudes / Clientes
                            {pendingCount > 0 && (
                                <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                    </div>
                    {activeTab === 'team' && (
                        <button
                            onClick={startCreate}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all hover:shadow-md"
                        >
                            <Plus className="w-4 h-4" />
                            Nuevo Empleado
                        </button>
                    )}
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder={activeTab === 'team' ? "Buscar empleado..." : "Buscar solicitud..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 outline-none text-gray-700 placeholder-gray-400"
                />
            </div>

            {/* Editor Modal/Panel */}
            {(isCreating || editingUser) && (
                <div className="bg-white rounded-xl shadow-lg border border-green-100 overflow-hidden">
                    <div className="bg-green-50 px-6 py-4 border-b border-green-100 flex justify-between items-center">
                        <h3 className="font-bold text-green-800 flex items-center gap-2">
                            {isCreating ? <Plus className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                            {isCreating ? 'Alta de Empleado' : `Editando: ${editingUser?.name}`}
                        </h3>
                        <button onClick={() => { setIsCreating(false); setEditingUser(null); }} className="text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Account Info */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b pb-1">Cuenta</h4>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario (Login)</label>
                                <input
                                    disabled={!isCreating}
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none disabled:bg-gray-100"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={formData.email || ''}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña (Dejar vacío si no cambia)</label>
                                <input
                                    type="password"
                                    placeholder={!isCreating ? '******' : ''}
                                    value={formData.pass || ''}
                                    onChange={e => setFormData({ ...formData, pass: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rol de Acceso</label>
                                <select
                                    value={formData.role || 'WORKER'}
                                    onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none bg-white"
                                >
                                    <option value="WORKER">Trabajador (Básico)</option>
                                    <option value="VET">Veterinario (Sanitario)</option>
                                    <option value="ADMIN">Administrador (Total)</option>
                                </select>
                            </div>
                        </div>

                        {/* Personal Info */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b pb-1">Datos Personales</h4>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                                    <input
                                        value={formData.firstName || ''}
                                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
                                    <input
                                        value={formData.lastName || ''}
                                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">DNI / NIE</label>
                                    <input
                                        value={formData.dni || ''}
                                        onChange={e => setFormData({ ...formData, dni: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">F. Nacimiento</label>
                                    <input
                                        type="date"
                                        value={formData.dob || ''}
                                        onChange={e => setFormData({ ...formData, dob: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Job Info */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b pb-1">Fitcha Técnica</h4>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Puesto / Cargo</label>
                                <input
                                    value={formData.jobTitle || ''}
                                    onChange={e => setFormData({ ...formData, jobTitle: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="Ej: Tractorista, Veterinario Jefe..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono Contacto</label>
                                <input
                                    value={formData.phone || ''}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Permissions Info */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b pb-1">Permisos de Acceso</h4>
                            <div className="space-y-2">
                                <p className="text-xs text-gray-500 mb-2">Marcar las secciones que este usuario puede ver.</p>
                                {[
                                    { id: 'farms', label: 'Fincas' },
                                    { id: 'animals', label: 'Animales' },
                                    { id: 'events', label: 'Eventos' },
                                    { id: 'calculator', label: 'Rendimiento' },
                                    { id: 'reports', label: 'Reportes' },
                                    { id: 'data', label: 'Datos Básicos' }
                                ].map(section => (
                                    <label key={section.id} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.permissions?.includes(section.id) || false}
                                            disabled={formData.role?.toUpperCase() === 'ADMIN'} // Admins have strict access to everything usually, or at least Users
                                            onChange={(e) => {
                                                const current = formData.permissions || [];
                                                if (e.target.checked) {
                                                    setFormData({ ...formData, permissions: [...current, section.id] });
                                                } else {
                                                    setFormData({ ...formData, permissions: current.filter(p => p !== section.id) });
                                                }
                                            }}
                                            className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                        />
                                        <span className={`text-sm ${formData.role?.toUpperCase() === 'ADMIN' ? 'text-gray-400' : 'text-gray-700'}`}>
                                            {section.label} {formData.role?.toUpperCase() === 'ADMIN' && '(Admin ve todo)'}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
                        <button
                            onClick={() => { setIsCreating(false); setEditingUser(null); }}
                            className="px-4 py-2 text-gray-600 font-medium hover:text-gray-800"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"
                        >
                            <Save className="w-4 h-4" />
                            Guardar Ficha
                        </button>
                    </div>
                </div>
            )}

            {/* Users List (Table for Team, Cards for Clients) */}
            {activeTab === 'team' ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Empleado</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Rol</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Puesto</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredUsers.map((user, i) => (
                                    <tr key={user.id || i} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0
                                                    ${user.role?.toUpperCase() === 'ADMIN' ? 'bg-purple-600' : (user.role?.toUpperCase() === 'VET' ? 'bg-blue-500' : (user.role?.toUpperCase() === 'WORKER' ? 'bg-green-600' : 'bg-orange-500'))}
                                                `}>
                                                    {user.firstName ? user.firstName.charAt(0) : user.name.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-gray-900 truncate">{user.firstName} {user.lastName}</h3>
                                                    <p className="text-xs text-gray-500 truncate">@{user.name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border
                                                ${user.role?.toUpperCase() === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                    (user.role?.toUpperCase() === 'VET' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                        (user.role?.toUpperCase() === 'WORKER' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'))}
                                            `}>
                                                {user.role?.toUpperCase() === 'ADMIN' ? 'ADMIN' : (user.role?.toUpperCase() === 'VET' ? 'VETERINARIO' : (user.role?.toUpperCase() === 'WORKER' ? 'TRABAJADOR' : 'CLIENTE'))}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {user.approved ? (
                                                <span className="inline-flex items-center gap-1 text-green-700 font-semibold text-xs bg-green-50 px-2 py-1 rounded-md border border-green-100">
                                                    ✅ Autorizado
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-orange-600 font-semibold text-xs bg-orange-50 px-2 py-1 rounded-md border border-orange-100">
                                                    🚫 Bloqueado
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Briefcase className="w-4 h-4 text-gray-400" />
                                                <span>{user.jobTitle || 'Sin puesto'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex justify-end items-center gap-2 transition-opacity">
                                                <button
                                                    onClick={() => startEdit(user)}
                                                    className="flex items-center gap-2 px-3 py-1.5 text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-all text-xs font-bold"
                                                    title="Editar perfil"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                    <span>Editar</span>
                                                </button>

                                                {user.name !== sessionUser && (
                                                    <button
                                                        onClick={() => handleToggleApproval(user.id, user.approved)}
                                                        className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg transition-all text-xs font-bold ${user.approved
                                                            ? 'text-orange-700 bg-orange-50 hover:bg-orange-100 border-orange-200'
                                                            : 'text-green-700 bg-green-50 hover:bg-green-100 border-green-200'
                                                            }`}
                                                        title={user.approved ? 'Bloquear acceso' : 'Autorizar acceso'}
                                                    >
                                                        <Shield className="w-3.5 h-3.5" />
                                                        <span>{user.approved ? 'Bloquear' : 'Autorizar'}</span>
                                                    </button>
                                                )}

                                                {user.name !== sessionUser && (
                                                    <button
                                                        onClick={() => handleDelete(user)}
                                                        className="flex items-center gap-2 px-3 py-1.5 text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all text-xs font-bold"
                                                        title="Eliminar usuario"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        <span>Eliminar</span>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredUsers.length === 0 && (
                        <div className="py-12 text-center text-gray-400 bg-gray-50">
                            <p>No se encontraron empleados en esta sección.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredUsers.map((user, i) => (
                        <div key={user.id || i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all group relative overflow-hidden">
                            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-5 
                                ${user.approved ? 'bg-green-600' : 'bg-orange-600'}`}
                            />

                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-inner
                                        ${user.approved ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-orange-400 to-orange-500'}
                                    `}>
                                        {user.firstName ? user.firstName.charAt(0) : user.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">{user.firstName} {user.lastName}</h3>
                                        <p className="text-sm text-gray-500">@{user.name}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                                    ${user.approved ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-orange-50 text-orange-700 border border-orange-100'}
                                `}>
                                    {user.approved ? 'Autorizado' : 'Pendiente'}
                                </span>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                                        <User className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <span className="truncate">{user.email}</span>
                                </div>
                                {user.phone && (
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                                            <Phone className="w-4 h-4 text-gray-400" />
                                        </div>
                                        <span>{user.phone}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <span>Registrado: {new Date(user.joined).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-50">
                                <button
                                    onClick={() => handleToggleApproval(user.id, user.approved)}
                                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all text-sm font-bold border ${user.approved
                                        ? 'text-orange-700 bg-orange-50 hover:bg-orange-100 border-orange-100'
                                        : 'text-green-700 bg-green-50 hover:bg-green-100 border-green-100'
                                        }`}
                                >
                                    <Shield className="w-4 h-4" />
                                    <span>{user.approved ? 'Bloquear' : 'Autorizar'}</span>
                                </button>
                                <button
                                    onClick={() => handleDelete(user)}
                                    className="flex items-center justify-center gap-2 py-2.5 text-red-700 bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl transition-all text-sm font-bold"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    <span>Eliminar</span>
                                </button>
                            </div>
                        </div>
                    ))}
                    {filteredUsers.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                            <User className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                            <p className="text-gray-400 font-medium">No hay solicitudes o clientes registrados</p>
                        </div>
                    )}
                </div>
            )}


        </div>
    );
}
