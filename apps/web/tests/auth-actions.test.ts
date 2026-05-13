import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma y bcrypt antes de importar el módulo bajo test
vi.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
    },
}));

vi.mock('bcryptjs', () => ({
    default: {
        hash: vi.fn().mockResolvedValue('hashed-password'),
    },
}));

vi.mock('./email', () => ({
    sendEmail: vi.fn().mockResolvedValue(undefined),
}));

// next/navigation redirect lanza un error especial que hay que interceptar
vi.mock('next/navigation', () => ({
    redirect: vi.fn(() => { throw new Error('NEXT_REDIRECT'); }),
}));

import { prisma } from '@/lib/prisma';
import { resetPassword } from '@/app/lib/auth-actions';

const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockUpdate = vi.mocked(prisma.user.update);

function buildFormData(fields: Record<string, string>) {
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
    return fd;
}

describe('resetPassword', () => {
    beforeEach(() => {
        mockFindUnique.mockReset();
        mockUpdate.mockReset();
    });

    it('devuelve error si las contraseñas no coinciden', async () => {
        const fd = buildFormData({
            token: 'tok',
            password: 'nueva123',
            confirmPassword: 'distinta',
        });
        const result = await resetPassword(null, fd);
        expect(result).toMatchObject({ message: 'Error en los campos.' });
    });

    it('devuelve error si la contraseña tiene menos de 6 caracteres', async () => {
        const fd = buildFormData({
            token: 'tok',
            password: 'abc',
            confirmPassword: 'abc',
        });
        const result = await resetPassword(null, fd);
        expect(result).toMatchObject({ message: 'Error en los campos.' });
    });

    it('devuelve error si el token no existe en DB', async () => {
        mockFindUnique.mockResolvedValue(null);
        const fd = buildFormData({
            token: 'invalid-token',
            password: 'nueva123',
            confirmPassword: 'nueva123',
        });
        const result = await resetPassword(null, fd);
        expect(result).toMatchObject({ message: 'El enlace es inválido o ha expirado.' });
    });

    it('devuelve error si el token ha expirado', async () => {
        mockFindUnique.mockResolvedValue({
            id: 'user-1',
            resetToken: 'expired-token',
            resetTokenExpiry: new Date(Date.now() - 1000), // pasado
        } as any);
        const fd = buildFormData({
            token: 'expired-token',
            password: 'nueva123',
            confirmPassword: 'nueva123',
        });
        const result = await resetPassword(null, fd);
        expect(result).toMatchObject({ message: 'El enlace es inválido o ha expirado.' });
    });

    it('actualiza la contraseña y limpia el token con datos válidos', async () => {
        mockFindUnique.mockResolvedValue({
            id: 'user-1',
            resetToken: 'valid-token',
            resetTokenExpiry: new Date(Date.now() + 3600000), // 1h desde ahora
        } as any);
        mockUpdate.mockResolvedValue({} as any);

        const fd = buildFormData({
            token: 'valid-token',
            password: 'nueva123',
            confirmPassword: 'nueva123',
        });

        // redirect() lanza internamente NEXT_REDIRECT tras éxito
        await expect(resetPassword(null, fd)).rejects.toThrow('NEXT_REDIRECT');

        expect(mockUpdate).toHaveBeenCalledWith({
            where: { id: 'user-1' },
            data: {
                password: 'hashed-password',
                resetToken: null,
                resetTokenExpiry: null,
            },
        });
    });

    it('devuelve error genérico si Prisma falla', async () => {
        mockFindUnique.mockRejectedValue(new Error('DB connection lost'));
        const fd = buildFormData({
            token: 'any-token',
            password: 'nueva123',
            confirmPassword: 'nueva123',
        });
        const result = await resetPassword(null, fd);
        expect(result).toMatchObject({ message: 'Error al restablecer la contraseña.' });
    });
});
