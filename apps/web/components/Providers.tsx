'use client';

import { SessionProvider } from 'next-auth/react';
import { StorageProvider } from '@/context/StorageContext';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <StorageProvider>
                {children}
            </StorageProvider>
        </SessionProvider>
    );
}
