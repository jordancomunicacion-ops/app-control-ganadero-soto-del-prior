/**
 * offlineQueue — cola de mutaciones offline persistida en IndexedDB.
 *
 * Cómo usarla:
 *   1) Cuando una mutación de campo (peso, evento sanitario, parto,
 *      grazing) ocurre y la app está offline, llamar a `enqueue()` con
 *      un payload serializable y la dirección del action que la ejecuta.
 *   2) Al recuperar conexión, `flushQueue()` reintenta cada entrada.
 *   3) Política por defecto: **last-write-wins** (no se versiona el doc
 *      destino). Los servidores aceptan el último envío sin diff.
 *
 * Este módulo es deliberadamente independiente del resto: no asume Next,
 * no asume Prisma. Solo IndexedDB + fetch. La integración real con server
 * actions concretos se hará entrada a entrada cuando sea necesario.
 *
 * IMPORTANTE: este fichero todavía no se cablea automáticamente a
 * mutaciones. Es la base mínima para que el Sprint 2.1 quede entregable
 * y el resto de sprints (2.4 sanidad de campo, 4 pastoreo) puedan
 * adoptarlo sin reescribirse.
 */

const DB_NAME = 'soto-offline';
const STORE = 'queue';
const VERSION = 1;

export interface QueuedMutation {
    /** ID único de la entrada (uuid). */
    id: string;
    /** Endpoint del server action o API que replay-ará la mutación. */
    endpoint: string;
    /** Payload JSON serializable. */
    payload: unknown;
    /** Cabeceras opcionales (Content-Type por defecto). */
    headers?: Record<string, string>;
    /** Fecha de creación local. */
    createdAt: number;
    /** Nº de reintentos hechos. */
    attempts: number;
    /** Etiqueta amistosa para mostrar al usuario en la UI. */
    label?: string;
}

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB no disponible en este entorno'));
            return;
        }
        const req = indexedDB.open(DB_NAME, VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, { keyPath: 'id' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function uuid(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Encola una mutación para reenvío posterior. Llamar SOLO cuando la red
 * está caída o la respuesta del servidor falla por timeout.
 */
export async function enqueue(
    entry: Omit<QueuedMutation, 'id' | 'createdAt' | 'attempts'>,
): Promise<QueuedMutation> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const record: QueuedMutation = {
            ...entry,
            id: uuid(),
            createdAt: Date.now(),
            attempts: 0,
        };
        const req = store.add(record);
        req.onsuccess = () => resolve(record);
        req.onerror = () => reject(req.error);
    });
}

export async function listQueue(): Promise<QueuedMutation[]> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const store = tx.objectStore(STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result || []) as QueuedMutation[]);
        req.onerror = () => reject(req.error);
    });
}

async function removeEntry(id: string): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function updateEntry(record: QueuedMutation): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/**
 * Reintentar todas las mutaciones encoladas. Devuelve un resumen.
 *
 * - 2xx → se borra la entrada.
 * - 4xx → se borra (permanente; el cliente quizá deba notificar al user).
 * - 5xx / red caída → se incrementa `attempts` y se mantiene en la cola.
 *
 * Llamar desde el listener `online` del navegador o desde un botón
 * "Sincronizar ahora" en la UI.
 */
export async function flushQueue(): Promise<{
    sent: number;
    failed: number;
    pending: number;
}> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        const pending = (await listQueue()).length;
        return { sent: 0, failed: 0, pending };
    }
    const entries = await listQueue();
    let sent = 0;
    let failed = 0;
    for (const entry of entries) {
        try {
            const res = await fetch(entry.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(entry.headers ?? {}),
                },
                body: JSON.stringify(entry.payload),
            });
            if (res.ok) {
                await removeEntry(entry.id);
                sent++;
            } else if (res.status >= 400 && res.status < 500) {
                // Permanente — el payload no es válido, no insistir.
                await removeEntry(entry.id);
                failed++;
            } else {
                await updateEntry({ ...entry, attempts: entry.attempts + 1 });
                failed++;
            }
        } catch {
            await updateEntry({ ...entry, attempts: entry.attempts + 1 });
            failed++;
        }
    }
    const pending = (await listQueue()).length;
    return { sent, failed, pending };
}

/**
 * Helper de alto nivel: ejecuta una mutación contra red. Si falla por
 * estar offline, la encola con la etiqueta indicada. Devuelve `{ queued }`
 * si la operación se encoló, o relanza el error si la respuesta fue mala
 * por motivo distinto a red.
 */
export async function trySendOrEnqueue<T>(
    endpoint: string,
    payload: T,
    label?: string,
): Promise<{ queued: boolean; response?: Response }> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        await enqueue({ endpoint, payload, label });
        return { queued: true };
    }
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!res.ok && res.status >= 500) {
            await enqueue({ endpoint, payload, label });
            return { queued: true, response: res };
        }
        return { queued: false, response: res };
    } catch {
        // Red caída en mitad — encolar.
        await enqueue({ endpoint, payload, label });
        return { queued: true };
    }
}
