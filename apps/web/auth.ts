import NextAuth from 'next-auth';

console.log('[AUTH.TS] File loaded at top level');
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
    trustHost: true,
    providers: [
        Credentials({
            async authorize(credentials) {
                console.log("[AUTH] Authorizing request...");
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;
                    console.log(`[AUTH] Checking user email: "${email}"`);
                    const user = await getUser(email);
                    if (!user) {
                        console.log(`[AUTH] ERROR: User NOT found in DB for email: "${email}" (checked in lowercase/trimmed)`);
                        return null;
                    }

                    console.log(`[AUTH] User found: ID=${user.id}, Email=${user.email}, Approved=${user.approved}, Role=${user.role}`);

                    // Strict Approval Check
                    const isMasterAdmin = user.email === 'gerencia@sotodelprior.com';
                    // @ts-ignore
                    if (!user.approved && !isMasterAdmin) {
                        console.log(`[AUTH] User ${user.email} is NOT approved and NOT master admin.`);
                        throw new Error('AccessDenied');
                    }

                    console.log("[AUTH] Verifying password with bcrypt.compare...");
                    // Safety check: is user.password present?
                    if (!user.password) {
                        console.log("[AUTH] CRITICAL: User has NO password in DB.");
                        return null;
                    }

                    const passwordsMatch = await bcrypt.compare(password, user.password);
                    console.log(`[AUTH] Password comparison result: ${passwordsMatch}`);

                    if (passwordsMatch) {
                        console.log(`[AUTH] SUCCESS: Login granted for user: ${user.email}`);
                        return {
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            role: (user as any).role,
                            permissions: (user as any).permissions
                        };
                    } else {
                        console.log(`[AUTH] ERROR: Password MISMATCH for user: ${user.email}`);
                        console.log(`[AUTH DEBUG] Provided password length: ${password.length}`);
                        console.log(`[AUTH DEBUG] Stored hash prefix: ${user.password.substring(0, 10)}...`);
                    }
                } else {
                    console.log("[AUTH] Invalid credentials format:", parsedCredentials.error.flatten().fieldErrors);
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
                // @ts-ignore
                token.permissions = user.permissions;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                // @ts-ignore
                session.user.role = token.role as string;
                // @ts-ignore
                session.user.permissions = token.permissions as string[];
            }
            return session;
        },
    },
});
