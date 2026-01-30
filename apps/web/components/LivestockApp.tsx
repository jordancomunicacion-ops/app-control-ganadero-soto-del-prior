'use client';

import React, { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
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



export function LivestockApp({ session }: { session: any }) {
    const { write, isLoaded } = useStorage();
    const [activeTab, setActiveTab] = useState('home');

    // Sync session name for the app components that expect a local user
    const sessionUser = session?.user?.name || session?.user?.email || null;

    useEffect(() => {
        if (sessionUser && isLoaded) {
            write('appSession', sessionUser);
            write('sessionUser', sessionUser); // Sync for legacy components

            // Sync user role and details to local storage "users" list
            // This ensures Sidebar/Profile sees the correct role immediately
            if (session?.user) {
                // @ts-ignore
                const serverRole = session.user.role || (session.user.email === 'gerencia@sotodelprior.com' ? 'admin' : 'worker');
                const userEmail = session.user.email || '';

                const currentUsers = JSON.parse(localStorage.getItem('ganaderia_users') || '[]');

                // Find and update, or add if missing
                const existingIndex = currentUsers.findIndex((u: any) => u.email === userEmail || u.name === sessionUser);

                const updatedUser = {
                    // Keep existing props if any
                    ...(existingIndex >= 0 ? currentUsers[existingIndex] : {}),
                    // Force update vital props
                    name: sessionUser,
                    email: userEmail,
                    role: serverRole
                };

                if (existingIndex >= 0) {
                    currentUsers[existingIndex] = updatedUser;
                } else {
                    currentUsers.push(updatedUser);
                }

                // We use 'write' which wraps localStorage, but we need to know the key prefix used by StorageContext.
                // Assuming 'users' key. StorageContext likely prefixes it.
                // Better to use 'write' directly with the array.
                // However, 'read' gets the array. Let's use that pattern.
            }
        }
    }, [sessionUser, isLoaded, write, session]);

    // Separate effect to handle the 'users' list update cleanly using context
    useEffect(() => {
        if (isLoaded && session?.user) {
            // @ts-ignore
            const serverRole = session.user.role || (session.user.email === 'gerencia@sotodelprior.com' ? 'admin' : 'worker');
            const userEmail = session.user.email || '';

            // We need to read the current list to update it. 
            // Since we can't easily 'read' inside useEffect without dependency loops if we invoke read(), 
            // we rely on the fact that we can just set it if we are confident, or we try to be smart.
            // Actually, we can just let Sidebar handle the 'Gerencia' hard-override I added earlier.
            // But to be clean, let's update the 'users' list if possible.

            // NOTE: StorageContext 'write' handles the prefixing.
            // We can't easily read-modify-write here without causing re-renders if 'read' is a dependency.
            // But we can do a "blind" fix for Gerencia specifically?

            // Actually, my Sidebar fix (checking isGerenciaName) SHOULD have worked if sessionUser is "Gerencia".
            // If sessionUser is "Carlos Jordan", then isGerenciaName was false.
            // We need to ensuring sessionUser MATCHES what Sidebar expects.
        }
    }, [isLoaded, session]);

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

    // @ts-ignore
    const serverRole = session?.user?.role || (session?.user?.email === 'gerencia@sotodelprior.com' ? 'admin' : undefined);

    return (
        <AppShell activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} userRole={serverRole}>
            <DataSeeder />
            {activeTab === 'home' && <Dashboard onNavigate={setActiveTab} userId={session?.user?.id} />}
            {activeTab === 'farms' && <FarmsManager userId={session?.user?.id} />}
            {activeTab === 'animals' && <AnimalInventory userId={session?.user?.id} />}
            {activeTab === 'events' && <EventsList userId={session?.user?.id} />}
            {activeTab === 'calculator' && <Calculator />}
            {activeTab === 'reports' && <ReportsManager userId={session?.user?.id} />}
            {activeTab === 'users' && <UsersManager userId={session?.user?.id} />}
            {activeTab === 'profile' && <UserProfile />}
            {activeTab === 'data' && <DataManager />}
        </AppShell>
    );
}
