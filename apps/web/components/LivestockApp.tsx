'use client';

import React, { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import type { Session } from 'next-auth';
import { useStorage } from '@/context/StorageContext';
import { AppShell } from '@/components/AppShell';

import { Dashboard } from '@/components/Dashboard';
import { FarmsManager } from '@/components/FarmsManager';
import { AnimalInventory } from '@/components/AnimalInventory';
import { Calculator } from '@/components/Calculator';
import { EventsList } from '@/components/EventsList';
import { ReportsManager } from '@/components/ReportsManager';
import { UsersManager } from '@/components/UsersManager';
import { UserProfile } from '@/components/UserProfile';
import { DataSeeder } from '@/components/DataSeeder';
import { DataManager } from '@/components/DataManager';

type StoredUser = {
    name?: string;
    email?: string;
    role?: string;
    permissions?: string[];
    [key: string]: unknown;
};


export function LivestockApp({ session }: { session: Session | null }) {
    const { write, isLoaded } = useStorage();
    const [activeTab, setActiveTab] = useState('home');

    // Sync session name for the app components that expect a local user
    const sessionUser = session?.user?.name || session?.user?.email || null;

    useEffect(() => {
        if (sessionUser && isLoaded && session?.user) {
            write('appSession', sessionUser);
            write('sessionUser', sessionUser); // Sync for legacy components

            const serverRole = (session.user.role || 'WORKER').toUpperCase();
            const permissions = session.user.permissions || [];
            const userEmail = session.user.email || '';

            const currentUsers: StoredUser[] = JSON.parse(localStorage.getItem('users') || '[]');

            // Find and update, or add if missing
            const existingIndex = currentUsers.findIndex((u) => u.email === userEmail || u.name === sessionUser);

            const updatedUser = {
                // Keep existing props if any
                ...(existingIndex >= 0 ? currentUsers[existingIndex] : {}),
                // Force update vital props
                name: sessionUser,
                email: userEmail,
                role: serverRole,
                permissions: permissions
            };

            if (existingIndex >= 0) {
                currentUsers[existingIndex] = updatedUser;
            } else {
                currentUsers.push(updatedUser);
            }

            write('users', currentUsers);
        }
    }, [sessionUser, isLoaded, write, session]);


    const handleLogout = async () => {
        write('appSession', null);
        await signOut({ callbackUrl: '/login' });
    };

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        );
    }

    const serverRole = session?.user?.role?.toUpperCase();

    return (
        <AppShell activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} userRole={serverRole}>
            <DataSeeder />
            {activeTab === 'home' && <Dashboard onNavigate={setActiveTab} userId={session?.user?.id} />}
            {activeTab === 'farms' && <FarmsManager userId={session?.user?.id} />}
            {activeTab === 'animals' && <AnimalInventory userId={session?.user?.id} />}
            {activeTab === 'events' && <EventsList userId={session?.user?.id} />}
            {activeTab === 'users' && <UsersManager userId={session?.user?.id} currentUserRole={serverRole} />}
            {activeTab === 'calculator' && <Calculator userId={session?.user?.id} />}
            {activeTab === 'reports' && <ReportsManager userId={session?.user?.id} />}
            {activeTab === 'profile' && <UserProfile />}
            {activeTab === 'data' && <DataManager />}
        </AppShell>
    );
}
