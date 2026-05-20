/* Service Worker — SOTO del PRIOR
 *
 * Estrategia mínima de PWA sin dependencias:
 *
 *   1) Precache del shell (HTML offline + logo) en `install`.
 *   2) Limpieza de caches viejas en `activate`.
 *   3) Fetch:
 *      - Navegación HTML → network-first; fallback al shell cacheado.
 *      - Assets estáticos (/_next/static/, fonts, imágenes) → stale-while-revalidate.
 *      - POST / API → siempre red; si falla mientras estás offline, el
 *        cliente decide cómo manejarlo (cola offline en `offlineQueue.ts`).
 *
 * Versionar `CACHE_VERSION` cuando cambien rutas críticas para forzar
 * invalidación al desplegar.
 */

const CACHE_VERSION = 'soto-v1';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const SHELL_ASSETS = [
    '/',
    '/dashboard',
    '/offline.html',
    '/logo-icon.png',
    '/logo-text.png',
    '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(SHELL_CACHE)
            .then((cache) =>
                cache.addAll(
                    SHELL_ASSETS.map(
                        (asset) => new Request(asset, { cache: 'reload' }),
                    ),
                ),
            )
            .catch(() => undefined),
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((names) =>
                Promise.all(
                    names
                        .filter((n) => !n.startsWith(CACHE_VERSION))
                        .map((n) => caches.delete(n)),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    // Navegaciones HTML → network first, fallback al shell cacheado.
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    const copy = res.clone();
                    caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
                    return res;
                })
                .catch(() =>
                    caches.match(req).then(
                        (cached) =>
                            cached ||
                            caches.match('/offline.html') ||
                            caches.match('/dashboard'),
                    ),
                ),
        );
        return;
    }

    // Assets estáticos y fuentes → stale-while-revalidate.
    if (
        url.pathname.startsWith('/_next/static/') ||
        url.pathname.startsWith('/uploads/') ||
        /\.(png|jpg|jpeg|webp|svg|woff2?|ttf|otf|css|js)$/.test(url.pathname)
    ) {
        event.respondWith(
            caches.open(RUNTIME_CACHE).then(async (cache) => {
                const cached = await cache.match(req);
                const network = fetch(req)
                    .then((res) => {
                        if (res && res.ok) cache.put(req, res.clone());
                        return res;
                    })
                    .catch(() => cached);
                return cached || network;
            }),
        );
    }
});
