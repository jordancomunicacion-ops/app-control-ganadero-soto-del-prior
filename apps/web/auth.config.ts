import type { NextAuthConfig } from 'next-auth';

// Validamos el secret de forma diferida (lazy): si lanzásemos a module-load
// `next build` también explotaría porque al recolectar page-data importa
// este módulo sin tener acceso al `.env` del runtime. Lo evaluamos cuando
// Auth.js pide el secret en cada request — momento en el que las env vars
// del contenedor ya están cargadas. Si no hay secret en producción rompemos
// fuerte; en build/tipos devolvemos un placeholder reconocible.
function resolveAuthSecret(): string {
    const s = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (s) return s;
    // Durante `next build` (NEXT_PHASE=phase-production-build) o tests permitimos
    // un placeholder; jamás se usará para firmar tokens reales.
    const phase = process.env.NEXT_PHASE;
    if (phase === 'phase-production-build' || process.env.NODE_ENV === 'test') {
        return 'build-time-placeholder-not-used-at-runtime';
    }
    throw new Error('AUTH_SECRET (or NEXTAUTH_SECRET) is not configured. Refusing to start with an insecure default.');
}

const isProduction = process.env.NODE_ENV === 'production';

export const authConfig = {
    // Auth.js evalúa esta función en cada request, así que el secret real
    // de runtime se resuelve cuando el contenedor ya tiene las env vars.
    secret: resolveAuthSecret(),
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
