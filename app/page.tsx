'use client';

import React, { useState, useEffect } from 'react';
import { useStorage } from '@/context/StorageContext';
import { AuthForm } from '@/components/AuthForm';
import { AppShell } from '@/components/AppShell';

import { Dashboard } from '@/components/Dashboard';
import { FarmsManager } from '@/components/FarmsManager';
import { AnimalInventory } from '@/components/AnimalInventory';
import { Calculator } from '@/components/Calculator';
import { EventsList } from '@/components/EventsList';
import { ReportsManager } from '@/components/ReportsManager';

// Placeholder components for sections - will be implemented one by one
const Sections = {
  Home: Dashboard,
  Farms: FarmsManager,
  Animals: AnimalInventory,
  Events: EventsList,
  Calculator: Calculator,
  Reports: ReportsManager,
  Data: () => <div className="p-4 bg-white rounded shadow">Data Import/Export (Coming Soon)</div>,
};

export default function Home() {
  const { read, write, isLoaded } = useStorage();
  const [sessionUser, setSessionUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    if (isLoaded) {
      const storedUser = read<string>('sessionUser', '');
      if (storedUser) {
        setSessionUser(storedUser);
      }
    }
  }, [isLoaded, read]);

  const handleLogin = (user: string) => {
    setSessionUser(user);
    // write is handled inside AuthForm currently, can refactor to be here if needed
  };

  const handleLogout = () => {
    localStorage.removeItem('sessionUser'); // Direct removal or use write
    setSessionUser(null);
    setActiveTab('home');
  };

  if (!isLoaded) {
    return <div className="flex items-center justify-center min-h-screen text-gray-500">Cargando...</div>;
  }

  if (!sessionUser) {
    return <AuthForm onLogin={handleLogin} />;
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
