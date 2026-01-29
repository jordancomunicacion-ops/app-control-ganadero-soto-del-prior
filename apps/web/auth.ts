import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';

function logDebug(msg: string) {
    console.log(`[AUTH DEBUG] ${msg}`);
}

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

                    // Strict Approval Check
                    // Exception: gerencia email serves as master admin, capable of bootstrapping
                    const isMasterAdmin = user.email === 'gerencia@sotodelprior.com';
                    // @ts-ignore
                    if (!user.approved && !isMasterAdmin) {
                        console.log(`[AUTH] User ${user.email} is NOT approved.`);
                        // Return null to deny login. 
                        // ideally we'd return an error, but next-auth creds provider is limited. 
                        // Users will see "CredentialsSignin" error.
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
    callbacks: {
        ...authConfig.callbacks,
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                // @ts-ignore
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                // @ts-ignore
                session.user.role = token.role as string;
            }
            return session;
        },
    },
});
