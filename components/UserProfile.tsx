'use client';

import React from 'react';
import { useStorage } from '@/context/StorageContext';

export function UserProfile() {
    const { read, write } = useStorage();
    const sessionUser = read<string>('sessionUser', 'Usuario');
    const [avatar, setAvatar] = React.useState<string | null>(null);

    React.useEffect(() => {
        const storedAvatar = read('userAvatar', null);
        if (storedAvatar) setAvatar(storedAvatar);
    }, [read]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setAvatar(base64String);
                write('userAvatar', base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    const users = read<any[]>('users', []);
    const currentUser = users.find((u: any) => u.name === sessionUser);

    // God Mode Logic for Gerencia
    const isGerencia = sessionUser?.toLowerCase().includes('gerencia') || sessionUser === 'gerencia@sotodelprior.com';
    const isAdmin = currentUser?.role === 'admin' || isGerencia;
    const displayRole = isAdmin ? 'admin' : (currentUser?.role || 'worker');

    // Team Management State
    const [newUserUser, setNewUserUser] = React.useState('');
    const [newUserPass, setNewUserPass] = React.useState('');
    const [newUserRole, setNewUserRole] = React.useState('worker');
    const [showTeamForm, setShowTeamForm] = React.useState(false);

    const handleCreateUser = () => {
        if (!newUserUser || !newUserPass) return alert("Completa usuario y contraseña");
        if (users.find(u => u.name === newUserUser)) return alert("El usuario ya existe");

        const newUser = {
            name: newUserUser,
            email: `${newUserUser.toLowerCase()}@soto.com`, // Mock email
            pass: newUserPass,
            role: newUserRole,
            joined: new Date().toISOString()
        };

        write('users', [...users, newUser]);
        setNewUserUser('');
        setNewUserPass('');
        setShowTeamForm(false);
        alert(`Usuario ${newUserUser} creado correctamente con rol ${newUserRole}`);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Mi Perfil</h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="relative group cursor-pointer">
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id="avatar-upload"
                            onChange={handleImageUpload}
                        />
                        <label htmlFor="avatar-upload" className="cursor-pointer block">
                            {avatar ? (
                                <img
                                    src={avatar}
                                    alt="Profile"
                                    className="w-24 h-24 rounded-full object-cover shadow-md group-hover:opacity-75 transition-opacity"
                                />
                            ) : (
                                <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-4xl shadow-md group-hover:bg-green-700 transition-colors">
                                    {sessionUser.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded-full text-white text-xs font-bold pointer-events-none">
                                CAMBIAR
                            </div>
                        </label>
                    </div>

                    <div className="text-center md:text-left space-y-2">
                        <h2 className="text-xl font-bold text-gray-900">{sessionUser}</h2>
                        <span className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                            {displayRole === 'admin' ? 'Administrador' : (displayRole === 'vet' ? 'Veterinario' : 'Trabajador')}
                        </span>
                        <p className="text-sm text-gray-500 max-w-md">
                            {isAdmin
                                ? "Cuenta administrativa con acceso completo a la gestión de fincas, inventario animal, finanzas y equipo."
                                : "Cuenta de usuario con permisos limitados según su rol asignado."}
                        </p>
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-6">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email / Usuario</label>
                        <p className="text-gray-900 font-medium">{sessionUser}</p>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Rol</label>
                        <p className="text-gray-900 font-medium capitalize">
                            {displayRole === 'admin' ? 'Administrador' : (displayRole === 'vet' ? 'Veterinario' : 'Trabajador')}
                        </p>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Empresa</label>
                        <p className="text-gray-900 font-medium">SOTO DEL PRIOR</p>
                    </div>
                </div>
            </div>



            {/* Team Management now moved to dedicated module 'Equipo' */}

        </div>
    );
}
