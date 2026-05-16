import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';

async function getUser(email: string) {
    const cleanEmail = email.trim().toLowerCase();
    try {
        return await prisma.user.findUnique({ where: { email: cleanEmail } });
    } catch {
        throw new Error('Failed to fetch user.');
    }
}

export const { auth, signIn, signOut, handlers } = NextAuth({
    ...authConfig,
    trustHost: true,
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (!parsedCredentials.success) return null;

                const { email, password } = parsedCredentials.data;
                const user = await getUser(email);
                if (!user) return null;

                const masterAdminEmail = process.env.MASTER_ADMIN_EMAIL?.toLowerCase();
                const isMasterAdmin = !!masterAdminEmail && user.email.toLowerCase() === masterAdminEmail;
                if (!user.approved && !isMasterAdmin) {
                    throw new Error('AccessDenied');
                }

                if (!user.password) return null;

                const passwordsMatch = await bcrypt.compare(password, user.password);
                if (!passwordsMatch) return null;

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    permissions: user.permissions,
                };
            },
        }),
    ],
    callbacks: {
        ...authConfig.callbacks,
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id as string;
                token.role = user.role;
                token.permissions = user.permissions;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id;
                session.user.role = token.role;
                session.user.permissions = token.permissions;
            }
            return session;
        },
    },
});
