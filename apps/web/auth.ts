import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';

function logDebug(msg: string) {
    console.log(`[AUTH DEBUG] ${msg}`);
}

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "file:./dev.db"
        }
    }
});

async function getUser(email: string) {
    const cleanEmail = email.trim().toLowerCase();
    try {
        const user = await prisma.user.findUnique({
            where: { email: cleanEmail },
        });
        return user;
    } catch (error) {
        logDebug(`ERROR in getUser: ${error}`);
        throw new Error('Failed to fetch user.');
    }
}

export const { auth, signIn, signOut, handlers } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;
                    const user = await getUser(email);
                    if (!user) return null;

                    const passwordsMatch = await bcrypt.compare(password, user.passwordHash);
                    if (passwordsMatch) return user;
                }
                return null;
            },
        }),
    ],
});
