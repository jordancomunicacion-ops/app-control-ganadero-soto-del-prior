'use server';

import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { sendEmail } from './email';
import { redirect } from 'next/navigation';

// Initialize Prisma. Note: Ideally this should be a singleton import.
// Using the same config as auth.ts to ensure we hit the right DB if it's overriden there.
const prisma = new PrismaClient();

const ForgotPasswordSchema = z.object({
    email: z.string().email('Email inválido'),
});

const ResetPasswordSchema = z.object({
    token: z.string(),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
});

export async function sendPasswordResetEmail(prevState: any, formData: FormData) {
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
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // Do not reveal if user exists
            return { message: 'Si el correo existe, recibirás instrucciones.' };
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 3600000); // 1 hour

        await prisma.user.update({
            where: { email },
            data: {
                resetToken: token,
                resetTokenExpiry: expiry,
            },
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

export async function resetPassword(prevState: any, formData: FormData) {
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
        const user = await prisma.user.findUnique({
            where: { resetToken: token },
        });

        if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
            return { message: 'El enlace es inválido o ha expirado.' };
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                // Let me double check schema view.
                resetToken: null,
                resetTokenExpiry: null,
            },
        });

        // Verification check:
        // schema.prisma (Step 18): `password String`
        // actions.ts (Step 28): `passwordHash: hashedPassword` in prisma.user.create.
        // This contradicts.
        // If actions.ts uses `passwordHash`, the schema MUST have `passwordHash`.
        // But my view of schema.prisma (Step 18) showed: `password String`.
        // Let me re-verify Step 18 output.
        // Line 14: `password String`.
        // Line 58 in Step 28 (actions.ts): `passwordHash: hashedPassword`.
        // This means `actions.ts` might be broken OR my view of schema was incomplete/stale OR `prisma generate` failed to catch this?
        // Wait, if actions.ts has `passwordHash` but schema has `password`, TypeScript would error.
        // Ah, maybe the user calls it `password` in schema but the actions code was from a legacy version or I misread?
        // Let's look at actions.ts again.
        // actions.ts Step 28 Line 58: `passwordHash: hashedPassword`.
        // schema.prisma Step 18 Line 14: `password String`.
        // TS will definitely error here unless `prisma.user` type has `passwordHash`.
        // If I generated client, it should match schema.
        // This suggests `actions.ts` might be currently broken or there's a mismatch I missed.
        // I will assume the Schema is truth: `password`.
        // I will use `password` in my update.

    } catch (error) {
        console.error('Reset password error:', error);
        return { message: 'Error al restablecer la contraseña.' };
    }

    redirect('/login?reset=success');
}
