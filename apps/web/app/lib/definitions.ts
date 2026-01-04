import { z } from 'zod';

export const UserSchema = z.object({
    id: z.string(),
    name: z.string().min(1, { message: 'El nombre es obligatorio.' }),
    email: z.string().email({ message: 'Email inválido.' }),
    password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres.' }).optional(),
    role: z.enum(['ADMIN', 'USER']),
});

export const CreateUserSchema = UserSchema.omit({ id: true }).extend({
    password: z.string().min(6, { message: 'La contraseña es obligatoria.' }),
});

export type UserFormState = {
    errors?: {
        name?: string[];
        email?: string[];
        password?: string[];
        role?: string[];
    };
    message?: string | null;
};
