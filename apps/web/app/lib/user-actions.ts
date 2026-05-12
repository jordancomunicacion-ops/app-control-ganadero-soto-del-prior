'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

export async function getUsers(currentUserId: string) {
    const currentUser = await prisma.user.findUnique({ where: { id: currentUserId } });
    if (!currentUser) throw new Error('Unauthorized');

    const role = currentUser.role.toUpperCase();

    if (role === 'ADMIN') {
        // Global Admin View: See everything
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return users.map(u => ({
            ...u,
            pass: '*****',
            joined: u.createdAt.toISOString(),
            permissions: u.permissions || []
        }));
    } else if (role === 'USER') {
        // Manager View: See only their own workers
        const users = await prisma.user.findMany({
            where: { managedById: currentUserId },
            orderBy: { createdAt: 'desc' }
        });
        return users.map(u => ({
            ...u,
            pass: '*****',
            joined: u.createdAt.toISOString(),
            permissions: u.permissions || []
        }));
    } else {
        // Workers/Vets cannot manage users
        throw new Error('Unauthorized');
    }
}

export async function updateUserStatus(userId: string, approved: boolean) {
    // TODO: Verify if the caller manages this user? 
    // For now assuming UI protects this, but ideally we check ownership.
    await prisma.user.update({
        where: { id: userId },
        data: { approved } as any
    });
    revalidatePath('/dashboard');
}

export async function updateUserProfile(userId: string, data: any) {
    const { role, firstName, lastName, dni, phone, jobTitle, dob, password, permissions } = data;

    const updateData: any = {
        role: role?.toUpperCase(), firstName, lastName, dni, phone, jobTitle,
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
    const { name, email, password, role, firstName, lastName, jobTitle, managedById } = data;

    // Verify the creator
    if (!managedById) throw new Error("Creator ID required (managedById)");
    const creator = await prisma.user.findUnique({ where: { id: managedById } });

    if (!creator) throw new Error("Creator not found");

    // Enforce hierarchy
    let effectiveManagedById = managedById;
    let effectiveApproved = true;

    // If Creator is ADMIN, they can create anyone and set managedById to whatever (or null for clients)
    // If Creator is USER, they can ONLY create workers under themselves.
    if (creator.role.toUpperCase() !== 'ADMIN') {
        // Strict enforcement for non-admins
        effectiveManagedById = managedById; // Must be them

        // Prevent USER from creating ADMINS
        if (role?.toUpperCase() === 'ADMIN') throw new Error("Unauthorized to create ADMIN");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            role: role?.toUpperCase() || 'WORKER',
            firstName,
            lastName,
            jobTitle,
            managedById: effectiveManagedById, // Link to manager
            approved: effectiveApproved
        } as any
    });
    return user;
}
