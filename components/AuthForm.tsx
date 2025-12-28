'use client';

import React, { useState, useEffect } from 'react';
import { useStorage } from '@/context/StorageContext';

interface AuthFormProps {
    onLogin: (username: string) => void;
}

export function AuthForm({ onLogin }: AuthFormProps) {
    const { read, write } = useStorage();
    const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
    const [error, setError] = useState('');

    // Login State
    const [loginUser, setLoginUser] = useState('');
    const [loginPass, setLoginPass] = useState('');
    const [remember, setRemember] = useState(false);

    // Register State
    const [regUser, setRegUser] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPass, setRegPass] = useState('');

    useEffect(() => {
        // Check remembered creds
        const remembered = read<any>('rememberedCreds', null);
        if (remembered) {
            setLoginUser(remembered.user);
            setLoginPass(remembered.pass);
            setRemember(true);
        }
    }, [read]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const users = read<any[]>('users', []);
        const user = users.find((u: any) => u.name === loginUser && u.pass === loginPass);

        if (user) {
            // Hotfix: Ensure 'gerencia' is always admin
            if ((user.email === 'gerencia@sotodelprior.com' || user.name === 'gerencia@sotodelprior.com') && user.role !== 'admin') {
                user.role = 'admin';
                const otherUsers = users.filter((u: any) => u.name !== user.name);
                write('users', [...otherUsers, user]);
            }

            if (remember) {
                write('rememberedCreds', { user: loginUser, pass: loginPass });
            } else {
                localStorage.removeItem('rememberedCreds');
            }
            write('sessionUser', user.name);
            onLogin(user.name);
        } else {
            setError('Estas credenciales no coinciden con nuestros registros.');
        }
    };

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!regUser || !regPass || !regEmail) {
            setError('Por favor, completa todos los campos.');
            return;
        }

        const users = read<any[]>('users', []);
        if (users.find((u: any) => u.name === regUser)) {
            setError('El usuario ya existe.');
            return;
        }

        const newUser = {
            name: regUser,
            email: regEmail,
            pass: regPass,
            joined: new Date().toISOString(),
            role: users.length === 0 ? 'admin' : 'worker' // First user is admin, others worker by default
        };

        const updatedUsers = [...users, newUser];
        write('users', updatedUsers);

        // Auto login
        write('sessionUser', newUser.name);
        onLogin(newUser.name);
    };

    return (
        <section className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
                <div className="flex flex-col items-center mb-6">
                    <img src="/logo-full.png" alt="SOTO DEL PRIOR" className="h-28 mb-4" />
                </div>

                <div className="flex border-b border-gray-200 mb-6">
                    <button
                        className={`flex-1 py-2 text-center font-medium transition-colors ${activeTab === 'login' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('login')}
                    >
                        Iniciar sesión
                    </button>
                    <button
                        className={`flex-1 py-2 text-center font-medium transition-colors ${activeTab === 'register' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('register')}
                    >
                        Crear cuenta
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                        {error}
                    </div>
                )}

                {activeTab === 'login' ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label htmlFor="login-username" className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                            <input
                                id="login-username"
                                name="username"
                                type="text"
                                value={loginUser}
                                onChange={(e) => setLoginUser(e.target.value)}
                                placeholder="usuario"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                                required
                                autoComplete="username"
                            />
                        </div>
                        <div>
                            <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                            <input
                                id="login-password"
                                name="password"
                                type="password"
                                value={loginPass}
                                onChange={(e) => setLoginPass(e.target.value)}
                                placeholder="******"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                                required
                                autoComplete="current-password"
                            />
                        </div>

                        <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-md hover:shadow-lg">
                            Acceder
                        </button>

                        <div className="flex items-center justify-between mt-4">
                            <label htmlFor="login-remember" className="flex items-center text-sm text-gray-600 cursor-pointer">
                                <input
                                    id="login-remember"
                                    name="remember"
                                    type="checkbox"
                                    checked={remember}
                                    onChange={(e) => setRemember(e.target.checked)}
                                    className="mr-2 rounded text-green-600 focus:ring-green-500"
                                />
                                Recordarme
                            </label>
                            <a href="#" onClick={(e) => e.preventDefault()} className="text-sm text-green-600 hover:underline">¿Olvidaste la contraseña?</a>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div>
                            <label htmlFor="reg-username" className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                            <input
                                id="reg-username"
                                name="username"
                                type="text"
                                value={regUser}
                                onChange={(e) => setRegUser(e.target.value)}
                                placeholder="nuevo usuario"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                                required
                                autoComplete="username"
                            />
                        </div>
                        <div>
                            <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
                            <input
                                id="reg-email"
                                name="email"
                                type="email"
                                value={regEmail}
                                onChange={(e) => setRegEmail(e.target.value)}
                                placeholder="tu@correo.com"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                                required
                                autoComplete="email"
                            />
                        </div>
                        <div>
                            <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                            <input
                                id="reg-password"
                                name="password"
                                type="password"
                                value={regPass}
                                onChange={(e) => setRegPass(e.target.value)}
                                placeholder="crea una clave"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                                required
                                autoComplete="new-password"
                            />
                        </div>

                        <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-md hover:shadow-lg">
                            Registrarse
                        </button>
                    </form>
                )}

                <div className="mt-6 text-center text-xs text-gray-400">
                    Datos guardados localmente en este navegador
                </div>
            </div>
        </section>
    );
}
