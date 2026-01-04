'use client';

import React from 'react';
import { Sidebar } from './Sidebar';

interface AppShellProps {
    children: React.ReactNode;
    activeTab: string;
    onTabChange: (tab: string) => void;
    onLogout: () => void;
}

export function AppShell({ children, activeTab, onTabChange, onLogout }: AppShellProps) {
    return (
        <div className="min-h-screen bg-gray-50 flex">
            <Sidebar activeTab={activeTab} onTabChange={onTabChange} onLogout={onLogout} />
            <main className="flex-1 ml-64 p-8">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
