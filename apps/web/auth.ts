import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';

function logDebug(msg: string) {
    console.log(`[AUTH DEBUG] ${msg}`);
}

const prisma = new PrismaClient();

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
                console.log("[AUTH] Authorizing request...");
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;
                    console.log(`[AUTH] Checking user: ${email}`);
                    const user = await getUser(email);
                    if (!user) {
                        console.log("[AUTH] User not found in DB.");
                        return null;
                    }

                    console.log("[AUTH] User found. Verifying password...");
                    const passwordsMatch = await bcrypt.compare(password, user.password);
                    if (passwordsMatch) {
                        console.log("[AUTH] Password match! Login successful.");
                        return user;
                    } else {
                        console.log("[AUTH] Password mismatch.");
                    }
                } else {
                    console.log("[AUTH] Invalid credentials format.");
                }
                return null;
            },
        }),
    ],
});
