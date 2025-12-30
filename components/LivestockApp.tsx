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
        }
    }, [sessionUser, isLoaded, write]);

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

    return (
        <AppShell activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout}>
            <DataSeeder />
            {activeTab === 'home' && <Dashboard onNavigate={setActiveTab} />}
            {activeTab === 'farms' && <FarmsManager />}
            {activeTab === 'animals' && <AnimalInventory />}
            {activeTab === 'events' && <EventsList />}
            {activeTab === 'calculator' && <Calculator />}
            {activeTab === 'reports' && <ReportsManager />}
            {activeTab === 'users' && <UsersManager />}
            {activeTab === 'profile' && <UserProfile />}
            {activeTab === 'data' && <DataManager />}
        </AppShell>
    );
}
