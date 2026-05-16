'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { sendEmail } from './email';
import { redirect } from 'next/navigation';

const ForgotPasswordSchema = z.object({
    email: z.string().email('Email inválido'),
});

const ResetPasswordSchema = z.object({
    token: z.string(),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
});

export type PasswordResetState = {
    errors?: { email?: string[]; token?: string[]; password?: string[]; confirmPassword?: string[] };
    message?: string;
    success?: boolean;
};

export async function sendPasswordResetEmail(_prevState: PasswordResetState | null | undefined, formData: FormData): Promise<PasswordResetState> {
    const validatedFields = ForgotPasswordSchema.safeParse({
        email: formData.get('email'),
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Error en los campos.',
        };
    }

    const { email } = validatedFields.data;

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return { message: 'Si el correo existe, recibirás instrucciones.' };
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 3600000); // 1 hora

        await prisma.user.update({
            where: { email },
            data: { resetToken: token, resetTokenExpiry: expiry },
        });

        const resetLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/reset-password?token=${token}`;

        await sendEmail(
            email,
            'Restablecer Contraseña - Soto del Prior',
            `<p>Has solicitado restablecer tu contraseña.</p>
             <p>Haz clic en el siguiente enlace para continuar:</p>
             <a href="${resetLink}">${resetLink}</a>
             <p>Este enlace expira en 1 hora.</p>`
        );

        return { message: 'Si el correo existe, recibirás instrucciones.', success: true };

    } catch (error) {
        console.error('Error in sendPasswordResetEmail:', error);
        return { message: 'Algo salió mal. Inténtalo de nuevo.' };
    }
}

export async function resetPassword(_prevState: PasswordResetState | null | undefined, formData: FormData): Promise<PasswordResetState> {
    const validatedFields = ResetPasswordSchema.safeParse({
        token: formData.get('token'),
        password: formData.get('password'),
        confirmPassword: formData.get('confirmPassword'),
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Error en los campos.',
        };
    }

    const { token, password } = validatedFields.data;

    try {
        const user = await prisma.user.findUnique({ where: { resetToken: token } });

        if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
            return { message: 'El enlace es inválido o ha expirado.' };
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null,
            },
        });

    } catch (error) {
        console.error('Reset password error:', error);
        return { message: 'Error al restablecer la contraseña.' };
    }

    redirect('/login?reset=success');
}
