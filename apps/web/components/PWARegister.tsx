'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Registra el service worker en cliente y muestra un badge "Sin conexión"
 * cuando el navegador detecta que perdimos red. Esto es la pieza visible
 * de la PWA — el resto (cache shell, fallback HTML) vive en `/public/sw.js`.
 *
 * Diseño:
 *   - Solo se registra en producción para no interferir con HMR de Next
 *     en desarrollo. Si quieres probarlo en local, pon NEXT_PUBLIC_PWA=1.
 *   - El badge offline no bloquea la UI; el usuario sigue trabajando con
 *     lo cacheado.
 */
export function PWARegister() {
    const [online, setOnline] = useState<boolean>(
        typeof navigator !== 'undefined' ? navigator.onLine : true,
    );

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const enabled =
            process.env.NODE_ENV === 'production' ||
            process.env.NEXT_PUBLIC_PWA === '1';

        if (enabled && 'serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js', { scope: '/' })
                .catch(() => {
                    /* swallow — el SW no es crítico */
                });
        }

        const handleOnline = () => setOnline(true);
        const handleOffline = () => setOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (online) return null;
    return (
        <div
            role="status"
            className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium px-3 py-1.5 rounded-full shadow-sm inline-flex items-center gap-2"
        >
            <WifiOff className="w-3.5 h-3.5" />
            Sin conexión — trabajando con datos en caché
        </div>
    );
}
