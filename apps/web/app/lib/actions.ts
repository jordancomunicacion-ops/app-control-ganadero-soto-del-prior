'use server';

import { signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CreateUserSchema, UserFormState } from './definitions';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export type AuthenticateState =
    | { success: true; message: string }
    | string
    | undefined;

export async function authenticate(
    _prevState: AuthenticateState,
    formData: FormData,
): Promise<AuthenticateState> {
    const email = formData.get('email');
    const password = formData.get('password');

    try {
        const result = await signIn('credentials', {
            redirect: false,
            email,
            password,
        });

        // With redirect:false NextAuth may surface failures either by throwing
        // or by returning an object with an `error` field. Handle both shapes.
        if (result && typeof result === 'object' && 'error' in result && result.error) {
            const code = String(result.error);
            if (code === 'CredentialsSignin') return 'Credenciales inválidas.';
            if (code === 'AccessDenied') return 'Cuenta pendiente de aprobación.';
            return 'Error de autenticación.';
        }

        return { success: true, message: 'Login exitoso' };
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Credenciales inválidas.';
                case 'AccessDenied':
                    return 'Cuenta pendiente de aprobación por el administrador.';
                case 'CallbackRouteError': {
                    const cause = error.cause as { err?: { message?: string } } | undefined;
                    if (cause?.err?.message === 'AccessDenied') {
                        return 'Cuenta pendiente de aprobación.';
                    }
                    return 'Error de autenticación.';
                }
                default:
                    return 'Algo salió mal.';
            }
        }

        if (error instanceof Error && error.message === 'AccessDenied') {
            return 'Tu cuenta está pendiente de aprobación.';
        }

        return 'Error del servidor.';
    }
}

export async function signOutAction() {
    await signOut();
}

export async function registerUser(_prevState: UserFormState | undefined, formData: FormData): Promise<UserFormState> {
    const validatedFields = CreateUserSchema.safeParse({
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        role: 'USER',
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Faltan campos obligatorios.',
        };
    }

    const { name, email: rawEmail, password, role } = validatedFields.data;
    const email = rawEmail.toLowerCase().trim();
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
            },
        });
    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
            return { message: 'El email ya está en uso.' };
        }
        console.error('Registration Error:', error);
        return { message: 'Error de base de datos.' };
    }

    redirect('/login');
}
