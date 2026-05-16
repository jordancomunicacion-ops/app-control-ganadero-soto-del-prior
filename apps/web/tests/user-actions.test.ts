import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
            findFirst: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            create: vi.fn(),
        },
    },
}));

vi.mock('@/auth', () => ({
    auth: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
    default: {
        hash: vi.fn().mockResolvedValue('hashed-password'),
    },
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import {
    getUsers,
    updateUserProfile,
    updateUserStatus,
    deleteUser,
    createUser,
} from '@/app/lib/user-actions';

// `auth` is polymorphic (callable as both session getter and middleware wrapper),
// so we cast the mock to a simple promise-returning fn for test ergonomics.
const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockFindFirst = vi.mocked(prisma.user.findFirst);
const mockFindMany = vi.mocked(prisma.user.findMany);
const mockUpdate = vi.mocked(prisma.user.update);
const mockDelete = vi.mocked(prisma.user.delete);
const mockCreate = vi.mocked(prisma.user.create);

function asAuth(user: { id: string; role: string } | null) {
    return user ? { user } : null;
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('user-actions: autorización', () => {
    describe('requireSession', () => {
        it('rechaza llamadas sin sesión', async () => {
            mockAuth.mockResolvedValue(asAuth(null));
            await expect(getUsers()).rejects.toThrow('Unauthorized');
        });

        it('rechaza si el usuario de la sesión no existe en DB', async () => {
            mockAuth.mockResolvedValue(asAuth({ id: 'ghost', role: 'ADMIN' }));
            mockFindUnique.mockResolvedValue(null);
            await expect(getUsers()).rejects.toThrow('Unauthorized');
        });
    });

    describe('getUsers', () => {
        it('ADMIN ve a todos los usuarios', async () => {
            mockAuth.mockResolvedValue(asAuth({ id: 'admin-1', role: 'ADMIN' }));
            mockFindUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' } as never);
            mockFindMany.mockResolvedValue([
                { id: 'u1', createdAt: new Date(), permissions: [] } as never,
            ] as never);

            await getUsers();

            expect(mockFindMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'desc' } });
        });

        it('USER solo ve a sus managed', async () => {
            mockAuth.mockResolvedValue(asAuth({ id: 'mgr-1', role: 'USER' }));
            mockFindUnique.mockResolvedValue({ id: 'mgr-1', role: 'USER' } as never);
            mockFindMany.mockResolvedValue([] as never);

            await getUsers();

            expect(mockFindMany).toHaveBeenCalledWith({
                where: { managedById: 'mgr-1' },
                orderBy: { createdAt: 'desc' },
            });
        });

        it('WORKER no puede listar usuarios', async () => {
            mockAuth.mockResolvedValue(asAuth({ id: 'w-1', role: 'WORKER' }));
            mockFindUnique.mockResolvedValue({ id: 'w-1', role: 'WORKER' } as never);

            await expect(getUsers()).rejects.toThrow('Unauthorized');
            expect(mockFindMany).not.toHaveBeenCalled();
        });
    });

    describe('updateUserProfile', () => {
        it('WORKER no puede cambiar su propio role', async () => {
            mockAuth.mockResolvedValue(asAuth({ id: 'w-1', role: 'WORKER' }));
            mockFindUnique.mockResolvedValue({ id: 'w-1', role: 'WORKER' } as never);

            await expect(
                updateUserProfile('w-1', { role: 'ADMIN' })
            ).rejects.toThrow(/only ADMIN can change roles/);

            expect(mockUpdate).not.toHaveBeenCalled();
        });

        it('WORKER puede actualizar su propio teléfono (campo no-rol)', async () => {
            mockAuth.mockResolvedValue(asAuth({ id: 'w-1', role: 'WORKER' }));
            mockFindUnique.mockResolvedValue({ id: 'w-1', role: 'WORKER' } as never);
            mockUpdate.mockResolvedValue({} as never);

            await updateUserProfile('w-1', { phone: '+34600111222' });

            expect(mockUpdate).toHaveBeenCalledOnce();
            const updateArg = mockUpdate.mock.calls[0][0];
            expect(updateArg.where).toEqual({ id: 'w-1' });
            expect(updateArg.data.phone).toBe('+34600111222');
            expect(updateArg.data.role).toBeUndefined();
        });

        it('USER no puede actualizar a alguien que no maneja', async () => {
            mockAuth.mockResolvedValue(asAuth({ id: 'mgr-1', role: 'USER' }));
            mockFindUnique.mockResolvedValue({ id: 'mgr-1', role: 'USER' } as never);
            mockFindFirst.mockResolvedValue(null); // target no es subordinado

            await expect(
                updateUserProfile('victim', { phone: '1' })
            ).rejects.toThrow(/not under your management/);

            expect(mockUpdate).not.toHaveBeenCalled();
        });

        it('ADMIN puede cambiar role de cualquier usuario', async () => {
            mockAuth.mockResolvedValue(asAuth({ id: 'admin-1', role: 'ADMIN' }));
            mockFindUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' } as never);
            mockUpdate.mockResolvedValue({} as never);

            await updateUserProfile('other', { role: 'VET' });

            expect(mockUpdate).toHaveBeenCalledOnce();
            expect(mockUpdate.mock.calls[0][0].data.role).toBe('VET');
        });

        it('valida los datos con Zod (rechaza role inválido)', async () => {
            mockAuth.mockResolvedValue(asAuth({ id: 'admin-1', role: 'ADMIN' }));
            mockFindUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' } as never);

            await expect(
                updateUserProfile('other', { role: 'SUPERHACKER' })
            ).rejects.toThrow(/Datos inválidos/);
        });
    });

    describe('updateUserStatus', () => {
        it('ADMIN puede aprobar a cualquiera', async () => {
            mockAuth.mockResolvedValue(asAuth({ id: 'admin-1', role: 'ADMIN' }));
            mockFindUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' } as never);
            mockUpdate.mockResolvedValue({} as never);

            await updateUserStatus('other', true);

            expect(mockUpdate).toHaveBeenCalledWith({
                where: { id: 'other' },
                data: { approved: true },
            });
        });

        it('WORKER no puede cambiar estado de nadie', async () => {
            mockAuth.mockResolvedValue(asAuth({ id: 'w-1', role: 'WORKER' }));
            mockFindUnique.mockResolvedValue({ id: 'w-1', role: 'WORKER' } as never);

            await expect(updateUserStatus('other', true)).rejects.toThrow('Unauthorized');
            expect(mockUpdate).not.toHaveBeenCalled();
        });
    });

    describe('deleteUser', () => {
        it('rechaza el auto-borrado', async () => {
            mockAuth.mockResolvedValue(asAuth({ id: 'self', role: 'ADMIN' }));
            mockFindUnique.mockResolvedValue({ id: 'self', role: 'ADMIN' } as never);

            await expect(deleteUser('self')).rejects.toThrow(/Cannot delete your own account/);
            expect(mockDelete).not.toHaveBeenCalled();
        });

        it('USER no puede borrar a alguien fuera de su equipo', async () => {
            mockAuth.mockResolvedValue(asAuth({ id: 'mgr-1', role: 'USER' }));
            mockFindUnique.mockResolvedValue({ id: 'mgr-1', role: 'USER' } as never);
            mockFindFirst.mockResolvedValue(null);

            await expect(deleteUser('other')).rejects.toThrow(/not under your management/);
            expect(mockDelete).not.toHaveBeenCalled();
        });

        it('ADMIN puede borrar a otro usuario', async () => {
            mockAuth.mockResolvedValue(asAuth({ id: 'admin-1', role: 'ADMIN' }));
            mockFindUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' } as never);
            mockDelete.mockResolvedValue({} as never);

            await deleteUser('victim');

            expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'victim' } });
        });
    });

    describe('createUser', () => {
        it('WORKER no puede crear usuarios', async () => {
            mockAuth.mockResolvedValue(asAuth({ id: 'w-1', role: 'WORKER' }));
            mockFindUnique.mockResolvedValue({ id: 'w-1', role: 'WORKER' } as never);

            await expect(
                createUser({ name: 'x', email: 'x@x.com', password: '123456' })
            ).rejects.toThrow(/Unauthorized to create users/);

            expect(mockCreate).not.toHaveBeenCalled();
        });

        it('USER no puede crear ADMIN', async () => {
            mockAuth.mockResolvedValue(asAuth({ id: 'mgr-1', role: 'USER' }));
            mockFindUnique.mockResolvedValue({ id: 'mgr-1', role: 'USER' } as never);

            await expect(
                createUser({
                    name: 'evil',
                    email: 'evil@x.com',
                    password: '123456',
                    role: 'ADMIN',
                })
            ).rejects.toThrow(/Unauthorized to create ADMIN/);

            expect(mockCreate).not.toHaveBeenCalled();
        });

        it('USER puede crear WORKER y queda atado a managedById = caller', async () => {
            mockAuth.mockResolvedValue(asAuth({ id: 'mgr-1', role: 'USER' }));
            mockFindUnique.mockResolvedValue({ id: 'mgr-1', role: 'USER' } as never);
            mockCreate.mockResolvedValue({ id: 'new-1' } as never);

            await createUser({
                name: 'peon',
                email: 'peon@x.com',
                password: '123456',
                role: 'WORKER',
            });

            const callData = mockCreate.mock.calls[0][0].data;
            expect(callData.managedById).toBe('mgr-1');
            expect(callData.role).toBe('WORKER');
            expect(callData.password).toBe('hashed-password');
            expect(callData.approved).toBe(true);
        });

        it('rechaza datos inválidos (email malformado)', async () => {
            mockAuth.mockResolvedValue(asAuth({ id: 'admin-1', role: 'ADMIN' }));
            mockFindUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' } as never);

            await expect(
                createUser({ name: 'x', email: 'not-an-email', password: '123456' })
            ).rejects.toThrow(/Datos inválidos/);
        });

        it('rechaza password corto', async () => {
            mockAuth.mockResolvedValue(asAuth({ id: 'admin-1', role: 'ADMIN' }));
            mockFindUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' } as never);

            await expect(
                createUser({ name: 'x', email: 'x@x.com', password: '123' })
            ).rejects.toThrow(/Datos inválidos/);
        });
    });
});
