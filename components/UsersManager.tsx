'use client';

import React, { useState } from 'react';
import { useStorage } from '@/context/StorageContext';
import { User, Shield, Briefcase, Phone, CreditCard, Calendar, Trash2, Edit2, Search, Plus, Save, X } from 'lucide-react';

interface FullUser {
    name: string;
    pass: string;
    role: 'admin' | 'vet' | 'worker';
    joined: string;
    // Extended fields
    firstName?: string;
    lastName?: string;
    dni?: string;
    phone?: string;
    dob?: string;
    jobTitle?: string;
}

export function UsersManager() {
    const { read, write } = useStorage();
    const users = read<FullUser[]>('users', []);
    const sessionUser = read('sessionUser', '');

    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState<FullUser | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<FullUser>>({
        role: 'worker',
        jobTitle: 'Peón Ganadero'
    });

    const handleSave = () => {
        if (!formData.name || !formData.pass) return alert("Usuario y Contraseña son obligatorios");

        let newUsers = [...users];

        if (isCreating) {
            if (users.find(u => u.name === formData.name)) return alert("El usuario ya existe");
            newUsers.push({
                ...formData as FullUser,
                joined: new Date().toISOString()
            });
        } else if (editingUser) {
            newUsers = newUsers.map(u => u.name === editingUser.name ? { ...u, ...formData } : u);
        }

        write('users', newUsers);
        setEditingUser(null);
        setIsCreating(false);
        setFormData({ role: 'worker', jobTitle: 'Peón Ganadero' });
    };

    const startEdit = (user: FullUser) => {
        setEditingUser(user);
        setIsCreating(false);
        setFormData({ ...user });
    };

    const startCreate = () => {
        setEditingUser(null);
        setIsCreating(true);
        setFormData({ role: 'worker', jobTitle: 'Peón Ganadero', pass: '123456' });
    };

    const handleDelete = (name: string) => {
        if (name === sessionUser) return alert("No puedes eliminar tu propio usuario");
        if (confirm(`¿Eliminar usuario ${name}?`)) {
            write('users', users.filter(u => u.name !== name));
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Shield className="w-8 h-8 text-green-600" />
                        Gestión de Equipo
                    </h2>
                    <p className="text-gray-500">Administra los perfiles y permisos del personal</p>
                </div>
                <button
                    onClick={startCreate}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all hover:shadow-md"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Empleado
                </button>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Buscar por nombre, usuario o DNI..."
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                                <input
                                    type="password"
                                    value={formData.pass || ''}
                                    onChange={e => setFormData({ ...formData, pass: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rol de Acceso</label>
                                <select
                                    value={formData.role || 'worker'}
                                    onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none bg-white"
                                >
                                    <option value="worker">Trabajador (Básico)</option>
                                    <option value="vet">Veterinario (Sanitario)</option>
                                    <option value="admin">Administrador (Total)</option>
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

            {/* Users Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredUsers.map((user, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-sm
                                        ${user.role === 'admin' ? 'bg-purple-600' : (user.role === 'vet' ? 'bg-blue-500' : 'bg-green-600')}
                                    `}>
                                        {user.firstName ? user.firstName.charAt(0) : user.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{user.firstName} {user.lastName}</h3>
                                        <p className="text-xs text-gray-500">@{user.name}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border
                                    ${user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                        (user.role === 'vet' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-50 text-gray-600 border-gray-200')}
                                `}>
                                    {user.role === 'admin' ? 'ADMIN' : (user.role === 'vet' ? 'VETERINARIO' : 'TRABAJADOR')}
                                </span>
                            </div>

                            <div className="space-y-2 text-sm text-gray-600 mt-4">
                                <div className="flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-gray-400" />
                                    <span>{user.jobTitle || 'Sin puesto definido'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-gray-400" />
                                    <span>{user.dni || 'Sin DNI'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    <span>{user.phone || 'Sin Teléfono'}</span>
                                </div>
                                {user.dob && (
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        <span>{new Date(user.dob).toLocaleDateString()} ({new Date().getFullYear() - new Date(user.dob).getFullYear()} años)</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => startEdit(user)}
                                className="text-green-600 font-medium text-xs hover:underline flex items-center gap-1"
                            >
                                <Edit2 className="w-3 h-3" /> Editar Ficha
                            </button>
                            {user.name !== sessionUser && (
                                <button
                                    onClick={() => handleDelete(user.name)}
                                    className="text-red-600 font-medium text-xs hover:underline flex items-center gap-1"
                                >
                                    <Trash2 className="w-3 h-3" /> Eliminar
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
