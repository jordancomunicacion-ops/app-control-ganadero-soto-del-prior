'use server';

import { signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';
import { CreateUserSchema, UserFormState } from './definitions';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { redirect } from 'next/navigation';

const prisma = new PrismaClient();

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        await signIn('credentials', formData);
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Credenciales inválidas.';
                default:
                    return 'Algo salió mal.';
            }
        }
        throw error;
    }
}

export async function signOutAction() {
    await signOut();
}

export async function registerUser(prevState: UserFormState | undefined, formData: FormData): Promise<UserFormState> {
    const validatedFields = CreateUserSchema.safeParse({
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        role: 'USER', // Default role
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Faltan campos obligatorios.',
        };
    }

    const { name, email, password, role } = validatedFields.data;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role as 'USER' | 'ADMIN',
            },
        });
    } catch (error) {
        // @ts-ignore
        if (error.code === 'P2002') {
            return {
                message: 'El email ya está en uso.',
            };
        }
        return {
            message: 'Error de base de datos.',
        };
    }

    redirect('/login');
}
