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

const Sections = {
    Home: Dashboard,
    Farms: FarmsManager,
    Animals: AnimalInventory,
    Events: EventsList,
    Calculator: Calculator,
    Reports: ReportsManager,
    Data: () => <div className="p-4 bg-white rounded shadow">Data Import/Export (Coming Soon)</div>,
};

export function LivestockApp({ session }: { session: any }) {
    const { write, isLoaded } = useStorage();
    const [activeTab, setActiveTab] = useState('home');

    // Sync session name for the app components that expect a local user
    const sessionUser = session?.user?.name || session?.user?.email || null;

    useEffect(() => {
        if (sessionUser && isLoaded) {
            write('appSession', sessionUser);
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
            {activeTab === 'home' && <Dashboard />}
            {activeTab === 'farms' && <Sections.Farms />}
            {activeTab === 'animals' && <Sections.Animals />}
            {activeTab === 'events' && <Sections.Events />}
            {activeTab === 'calculator' && <Sections.Calculator />}
            {activeTab === 'reports' && <Sections.Reports />}
            {activeTab === 'data' && <Sections.Data />}
        </AppShell>
    );
}
