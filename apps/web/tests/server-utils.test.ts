import { describe, it, expect, vi, beforeEach } from 'vitest';

// Avoid pulling in next-auth (and therefore next/server) from server-utils.
vi.mock('@/auth', () => ({ auth: vi.fn() }));

// Mock Prisma singleton
vi.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
        },
    },
}));

import { safeJsonParse, getEffectiveUserId } from '@/lib/server-utils';
import { prisma } from '@/lib/prisma';

// ─── safeJsonParse ────────────────────────────────────────────────────────────

describe('safeJsonParse', () => {
    it('parsea JSON válido', () => {
        expect(safeJsonParse('{"a":1}', {})).toEqual({ a: 1 });
    });

    it('devuelve fallback con JSON inválido', () => {
        expect(safeJsonParse('no-json{{', [])).toEqual([]);
    });

    it('devuelve fallback con null', () => {
        expect(safeJsonParse(null, 'default')).toBe('default');
    });

    it('devuelve fallback con undefined', () => {
        expect(safeJsonParse(undefined, 42)).toBe(42);
    });

    it('devuelve fallback con cadena vacía', () => {
        expect(safeJsonParse('', [])).toEqual([]);
    });

    it('parsea arrays correctamente', () => {
        expect(safeJsonParse('[1,2,3]', [])).toEqual([1, 2, 3]);
    });
});

// ─── getEffectiveUserId ───────────────────────────────────────────────────────

describe('getEffectiveUserId', () => {
    const mockFindUnique = vi.mocked(prisma.user.findUnique);

    beforeEach(() => {
        mockFindUnique.mockReset();
    });

    it('devuelve el mismo userId si el rol no es WORKER', async () => {
        mockFindUnique.mockResolvedValue({ role: 'USER', managedById: 'manager-123' } as any);
        const result = await getEffectiveUserId('user-abc');
        expect(result).toBe('user-abc');
    });

    it('devuelve managedById si el rol es WORKER y tiene manager', async () => {
        mockFindUnique.mockResolvedValue({ role: 'WORKER', managedById: 'manager-123' } as any);
        const result = await getEffectiveUserId('worker-xyz');
        expect(result).toBe('manager-123');
    });

    it('devuelve el userId original si es WORKER pero no tiene managedById', async () => {
        mockFindUnique.mockResolvedValue({ role: 'WORKER', managedById: null } as any);
        const result = await getEffectiveUserId('worker-xyz');
        expect(result).toBe('worker-xyz');
    });

    it('devuelve el userId original si el usuario no existe en DB', async () => {
        mockFindUnique.mockResolvedValue(null);
        const result = await getEffectiveUserId('ghost-user');
        expect(result).toBe('ghost-user');
    });

    it('compara el rol en mayúsculas (worker vs WORKER)', async () => {
        mockFindUnique.mockResolvedValue({ role: 'worker', managedById: 'manager-999' } as any);
        const result = await getEffectiveUserId('worker-lower');
        expect(result).toBe('manager-999');
    });

    it('devuelve el userId para rol ADMIN', async () => {
        mockFindUnique.mockResolvedValue({ role: 'ADMIN', managedById: null } as any);
        const result = await getEffectiveUserId('admin-001');
        expect(result).toBe('admin-001');
    });
});
