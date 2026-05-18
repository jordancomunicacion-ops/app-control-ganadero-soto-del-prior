'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';

const RoleSchema = z.enum(['ADMIN', 'USER', 'VET', 'WORKER']);

const CreateUserSchema = z.object({
    name: z.string().min(1, 'El nombre de usuario es obligatorio'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    role: RoleSchema.optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    jobTitle: z.string().optional(),
    permissions: z.array(z.string()).optional(),
});

const UpdateUserSchema = z.object({
    role: RoleSchema.optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    dni: z.string().optional(),
    phone: z.string().optional(),
    jobTitle: z.string().optional(),
    dob: z.string().nullable().optional(),
    password: z.string().min(6).optional().or(z.literal('').optional()),
    permissions: z.array(z.string()).optional(),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

// Fields we are willing to expose to clients. Excludes password, resetToken
// and resetTokenExpiry so the hashed password never leaves the server.
const PUBLIC_USER_SELECT = {
    id: true,
    name: true,
    email: true,
    role: true,
    approved: true,
    permissions: true,
    firstName: true,
    lastName: true,
    dni: true,
    phone: true,
    jobTitle: true,
    dob: true,
    managedById: true,
    createdAt: true,
    updatedAt: true,
} as const;

async function requireSession() {
    const session = await auth();
    const callerId = session?.user?.id;
    if (!session || !callerId) {
        throw new Error('Unauthorized');
    }
    const caller = await prisma.user.findUnique({
        where: { id: callerId },
        select: { id: true, role: true },
    });
    if (!caller) throw new Error('Unauthorized');
    return { callerId: caller.id, callerRole: caller.role.toUpperCase() };
}

async function assertCanManageTarget(
    callerId: string,
    callerRole: string,
    targetUserId: string,
) {
    if (callerRole === 'ADMIN') return;
    if (callerRole === 'USER') {
        const target = await prisma.user.findFirst({
            where: { id: targetUserId, managedById: callerId },
            select: { id: true },
        });
        if (!target) throw new Error('Unauthorized: user not under your management');
        return;
    }
    throw new Error('Unauthorized');
}

export async function getUsers() {
    const { callerId, callerRole } = await requireSession();

    if (callerRole !== 'ADMIN' && callerRole !== 'USER') {
        throw new Error('Unauthorized');
    }

    const users =
        callerRole === 'ADMIN'
            ? await prisma.user.findMany({
                  orderBy: { createdAt: 'desc' },
                  select: PUBLIC_USER_SELECT,
              })
            : await prisma.user.findMany({
                  where: { managedById: callerId },
                  orderBy: { createdAt: 'desc' },
                  select: PUBLIC_USER_SELECT,
              });

    return users.map((u) => ({
        ...u,
        pass: '*****',
        joined: u.createdAt.toISOString(),
        permissions: u.permissions || [],
    }));
}

export async function updateUserStatus(userId: string, approved: boolean) {
    const { callerId, callerRole } = await requireSession();
    await assertCanManageTarget(callerId, callerRole, userId);

    await prisma.user.update({
        where: { id: userId },
        data: { approved },
    });
    revalidatePath('/dashboard');
}

export async function updateUserProfile(userId: string, data: unknown) {
    const { callerId, callerRole } = await requireSession();

    const parsed = UpdateUserSchema.safeParse(data);
    if (!parsed.success) {
        const msg = parsed.error.issues.map((i) => i.message).join('; ');
        throw new Error(`Datos inválidos: ${msg}`);
    }
    const input = parsed.data;

    const isSelf = callerId === userId;
    const isAdmin = callerRole === 'ADMIN';

    if (!isSelf) {
        await assertCanManageTarget(callerId, callerRole, userId);
    }

    if (input.role !== undefined && !isAdmin) {
        throw new Error('Unauthorized: only ADMIN can change roles');
    }
    if (input.permissions !== undefined && !isAdmin && callerRole !== 'USER') {
        throw new Error('Unauthorized: cannot change permissions');
    }

    // Build a partial update: only the keys actually present in the input
    // hit the database. Avoids the previous bug of wiping fields like dob
    // when the caller only intended to update e.g. phone.
    const updateData: Record<string, unknown> = {};
    if (input.firstName !== undefined) updateData.firstName = input.firstName;
    if (input.lastName !== undefined) updateData.lastName = input.lastName;
    if (input.dni !== undefined) updateData.dni = input.dni;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.jobTitle !== undefined) updateData.jobTitle = input.jobTitle;
    if (input.dob !== undefined) {
        updateData.dob = input.dob ? new Date(input.dob) : null;
    }
    if (input.role !== undefined) updateData.role = input.role;
    if (input.permissions !== undefined) updateData.permissions = input.permissions;

    if (input.password && input.password !== '*****' && input.password.length >= 6) {
        updateData.password = await bcrypt.hash(input.password, 10);
    }

    if (Object.keys(updateData).length === 0) return;

    await prisma.user.update({
        where: { id: userId },
        data: updateData,
    });
    revalidatePath('/dashboard');
}

export async function deleteUser(userId: string) {
    const { callerId, callerRole } = await requireSession();

    if (callerId === userId) throw new Error('Cannot delete your own account');
    await assertCanManageTarget(callerId, callerRole, userId);

    await prisma.user.delete({ where: { id: userId } });
    revalidatePath('/dashboard');
}

export async function createUser(data: unknown) {
    const { callerId, callerRole } = await requireSession();

    if (callerRole !== 'ADMIN' && callerRole !== 'USER') {
        throw new Error('Unauthorized to create users');
    }

    const parsed = CreateUserSchema.safeParse(data);
    if (!parsed.success) {
        const msg = parsed.error.issues.map((i) => i.message).join('; ');
        throw new Error(`Datos inválidos: ${msg}`);
    }
    const input = parsed.data;

    const requestedRole = input.role ?? 'WORKER';
    if (requestedRole === 'ADMIN' && callerRole !== 'ADMIN') {
        throw new Error('Unauthorized to create ADMIN');
    }

    const email = input.email.trim().toLowerCase();
    const hashedPassword = await bcrypt.hash(input.password, 10);

    try {
        const created = await prisma.user.create({
            data: {
                name: input.name,
                email,
                password: hashedPassword,
                role: requestedRole,
                firstName: input.firstName,
                lastName: input.lastName,
                jobTitle: input.jobTitle,
                permissions: input.permissions ?? [],
                managedById: callerId,
                approved: true,
            },
            select: PUBLIC_USER_SELECT,
        });
        revalidatePath('/dashboard');
        return created;
    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new Error('El email ya está en uso.');
        }
        console.error('createUser error:', error);
        throw new Error('Error al crear el usuario.');
    }
}
