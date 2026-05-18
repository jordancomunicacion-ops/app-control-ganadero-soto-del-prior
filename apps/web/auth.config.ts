import type { NextAuthConfig } from 'next-auth';

const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
if (!authSecret) {
    throw new Error('AUTH_SECRET (or NEXTAUTH_SECRET) is not configured. Refusing to start with an insecure default.');
}

const isProduction = process.env.NODE_ENV === 'production';

export const authConfig = {
    secret: authSecret,
    trustHost: true,
    cookies: {
        sessionToken: {
            name: isProduction ? '__Secure-ganaderia_token' : 'ganaderia_token',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: isProduction,
            },
        },
    },
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;

            const isPublic =
                nextUrl.pathname === '/login' ||
                nextUrl.pathname === '/register' ||
                nextUrl.pathname === '/forgot-password' ||
                nextUrl.pathname === '/reset-password' ||
                nextUrl.pathname.startsWith('/_next') ||
                nextUrl.pathname.startsWith('/api/auth') ||
                nextUrl.pathname.includes('favicon.ico');

            if (isPublic) {
                if (isLoggedIn && (nextUrl.pathname === '/login' || nextUrl.pathname === '/register')) {
                    return Response.redirect(new URL('/dashboard', nextUrl));
                }
                return true;
            }

            if (!isLoggedIn) {
                return false;
            }

            return true;
        },
    },
    providers: [],
} satisfies NextAuthConfig;
