'use server';

import { signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';
import { CreateUserSchema, UserFormState } from './definitions';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export async function authenticate(
    prevState: any,
    formData: FormData,
) {
    const email = formData.get('email');
    const password = formData.get('password');
    console.log(`[AUTH ACTION] Attempting sign in for: ${email}`);
    try {
        // Use redirect: false to prevent server-side redirect exceptions
        const result = await signIn('credentials', {
            redirect: false,
            email,
            password,
        });
        console.log('[AUTH ACTION] Sign in result:', result);

        console.log('[AUTH ACTION] Sign in successful (no redirect)');
        return { success: true, message: 'Login exitoso' };

    } catch (error) {
        console.error('[AUTH ACTION] Caught error:', error);

        if (error instanceof AuthError) {
            console.log('[AUTH ACTION] Error is AuthError type:', error.type);
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Credenciales inválidas.';
                case 'AccessDenied':
                    return 'Cuenta pendiente de aprobación por el administrador.';
                case 'CallbackRouteError':
                    // Often wraps the original error
                    if (error.cause?.err?.message === 'AccessDenied') {
                        return 'Cuenta pendiente de aprobación.';
                    }
                    return 'Error de autenticación.';
                default:
                    return 'Algo salió mal.';
            }
        }

        // Handle standard Error thrown from authorize
        if (error instanceof Error && error.message === 'AccessDenied') {
            return 'Tu cuenta está pendiente de aprobación.';
        }

        // This catch block might not be reached if signIn with redirect:false doesn't throw
        // But if it does happen to throw a redirect error, re-throw it?
        // Actually, with redirect:false, it shouldn't throw NEXT_REDIRECT.

        console.error('[AUTH ACTION] Unknown error thrown:', error);
        return 'Error del servidor.';
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

    const { name, email: rawEmail, password, role } = validatedFields.data;
    const email = rawEmail.toLowerCase().trim();
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
        console.error('Registration Error:', error);
        if ((error as any).code === 'P2002') {
            return {
                message: 'El email ya está en uso.',
            };
        }
        return {
            message: 'Error de base de datos: ' + ((error as Error).message || JSON.stringify(error)),
        };
    }

    redirect('/login');
}
