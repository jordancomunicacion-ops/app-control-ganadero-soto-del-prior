'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

export async function getUsers(currentUserId: string) {
    // Only fetch if admin?
    // We can check role if we trust the caller ID, OR we check DB role of caller.
    // Ideally verifying session again, but for now strict check:
    const currentUser = await prisma.user.findUnique({ where: { id: currentUserId } });
    if (!currentUser || currentUser.role !== 'admin') {
        throw new Error('Unauthorized');
    }

    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' }
    });

    return users.map(u => ({
        ...u,
        pass: '*****', // Hide
        joined: u.createdAt.toISOString(),
        permissions: u.permissions || [] // Ensure array
    }));
}

export async function updateUserStatus(userId: string, approved: boolean) {
    await prisma.user.update({
        where: { id: userId },
        data: { approved } as any
    });
    revalidatePath('/dashboard');
}

export async function updateUserProfile(userId: string, data: any) {
    const { role, firstName, lastName, dni, phone, jobTitle, dob, password, permissions } = data;

    const updateData: any = {
        role, firstName, lastName, dni, phone, jobTitle,
        dob: dob ? new Date(dob) : null,
        permissions: permissions // Update permissions if provided
    };

    if (password && password !== '*****' && password.length >= 6) {
        updateData.password = await bcrypt.hash(password, 10);
    }

    await prisma.user.update({
        where: { id: userId },
        data: updateData
    });
    revalidatePath('/dashboard');
}

export async function deleteUser(userId: string) {
    await prisma.user.delete({ where: { id: userId } });
    revalidatePath('/dashboard');
}

export async function createUser(data: any) {
    const { name, email, password, role, firstName, lastName, jobTitle } = data;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            role,
            firstName,
            lastName,
            jobTitle,
            approved: true // Created by admin = auto approved
        } as any
    });
    return user;
}
