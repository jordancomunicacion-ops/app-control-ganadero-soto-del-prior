import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
    const { nextUrl } = req;
    const isLoggedIn = !!req.auth;

    const isPublic =
        nextUrl.pathname === '/login' ||
        nextUrl.pathname === '/register' ||
        nextUrl.pathname.startsWith('/_next') ||
        nextUrl.pathname.startsWith('/api/auth') ||
        nextUrl.pathname.startsWith('/.well-known/') ||
        nextUrl.pathname.includes('favicon.ico');

    if (isPublic) {
        if (isLoggedIn && (nextUrl.pathname === '/login' || nextUrl.pathname === '/register')) {
            return Response.redirect(new URL('/dashboard', nextUrl));
        }
        return;
    }

    if (!isLoggedIn) {
        if (nextUrl.pathname.startsWith('/api/')) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        return Response.redirect(new URL('/login', nextUrl));
    }
});

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
