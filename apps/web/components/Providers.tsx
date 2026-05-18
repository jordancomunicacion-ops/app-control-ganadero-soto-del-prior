'use client';

import { SessionProvider } from 'next-auth/react';
import { StorageProvider } from '@/context/StorageContext';
import { UiProvider } from '@/components/Toast';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <StorageProvider>
                <UiProvider>
                    {children}
                </UiProvider>
            </StorageProvider>
        </SessionProvider>
    );
}
