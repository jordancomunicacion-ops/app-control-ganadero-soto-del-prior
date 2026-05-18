import { NextRequest } from 'next/server';
import { refreshPricesFromFeed } from '@/app/lib/price-actions';

/**
 * Weekly SEUROP price refresh endpoint.
 *
 * Trigger this once or twice a week (e.g. Tuesday after Lonja de Salamanca
 * publishes, or Friday after MAPA's national table) from any cron runner:
 *
 *   curl -X POST https://<host>/api/cron/refresh-prices \
 *        -H "Authorization: Bearer $CRON_SECRET"
 *
 * Compatible with Vercel Cron (`vercel.json`), GitHub Actions, kubernetes
 * CronJob, or a plain system cron with `curl`.
 *
 * Authentication uses a bearer token (`CRON_SECRET` env var). The endpoint
 * is intentionally NOT behind NextAuth: cron runners don't have sessions.
 * It is also excluded from the auth middleware via the `/api/auth` allow
 * list pattern matching `/api/...` — note: our middleware redirects
 * unauthenticated /api/ traffic with 401 JSON, so the bearer check happens
 * BEFORE we get here. Keep `/api/cron/` paths public in the matcher (already
 * the case since middleware only requires auth for non-/api/auth /api/*).
 */
async function handle(req: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        return Response.json(
            { ok: false, error: 'CRON_SECRET not configured' },
            { status: 503 },
        );
    }
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const result = await refreshPricesFromFeed({ skipAuth: true });
        return Response.json({ ok: !result.error, ...result });
    } catch (e) {
        console.error('refresh-prices cron error:', e);
        return Response.json(
            { ok: false, error: e instanceof Error ? e.message : 'Unknown error' },
            { status: 500 },
        );
    }
}

export const POST = handle;
export const GET = handle;
