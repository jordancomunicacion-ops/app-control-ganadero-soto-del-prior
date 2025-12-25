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
        nextUrl.pathname.startsWith('/api') ||
        nextUrl.pathname.includes('favicon.ico');

    // Logs for the server terminal
    console.log(`[MIDDLEWARE] Path: ${nextUrl.pathname} | LoggedIn: ${isLoggedIn} | isPublic: ${isPublic}`);

    if (isPublic) {
        if (isLoggedIn && (nextUrl.pathname === '/login' || nextUrl.pathname === '/register')) {
            return Response.redirect(new URL('/dashboard', nextUrl));
        }
        return; // Allow public routes
    }

    if (!isLoggedIn) {
        return Response.redirect(new URL('/login', nextUrl));
    }
});

export const config = {
    // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
