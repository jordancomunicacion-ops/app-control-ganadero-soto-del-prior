'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

export type User = {
    id: string;
    name: string;
    email: string;
    role: string;
    approved: boolean;
    createdAt: Date;
};

export async function getUsers() {
    const session = await auth();
    // @ts-ignore
    if (session?.user?.role !== 'ADMIN') {
        throw new Error('Unauthorized');
    }

    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                approved: true,
                createdAt: true,
            },
        });
        return { success: true, data: users };
    } catch (error) {
        console.error('Failed to fetch users:', error);
        return { success: false, message: 'Error al obtener usuarios.' };
    }
}

export async function toggleUserStatus(userId: string, approved: boolean) {
    const session = await auth();
    // @ts-ignore
    if (session?.user?.role !== 'ADMIN') {
        throw new Error('Unauthorized');
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { approved },
        });
        revalidatePath('/admin/users');
        return { success: true, message: approved ? 'Usuario aprobado.' : 'Usuario inhabilitado.' };
    } catch (error) {
        console.error('Failed to update user status:', error);
        return { success: false, message: 'Error al actualizar estado.' };
    }
}
