'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
    computeSalesPriceServer,
    getLatestPriceMap,
    invalidatePriceCache,
    isoWeekKey,
    parsePriceFeed,
} from '@/lib/price-service';

/**
 * Fetch the configured weekly price feed and upsert one row per code for
 * the current ISO week.
 *
 * The feed URL is configured via `PRICES_FEED_URL` (CSV or JSON). The
 * expected schema is documented in `parsePriceFeed`. Suitable feeds:
 *   - Lonja de Salamanca / Ternera Charra (martes)
 *   - MAPA "Cotizaciones representativas medias semanales"
 *   - EU Beef Market Observatory CSV export
 *   - Internal Google Sheet exported as CSV
 *
 * This action runs unauthenticated when called from the cron endpoint
 * (which has its own bearer-token check). When called from the UI it
 * requires an ADMIN session.
 */
export async function refreshPricesFromFeed(
    options: { skipAuth?: boolean } = {},
): Promise<{ updated: number; week: string; error?: string }> {
    if (!options.skipAuth) {
        const session = await auth();
        if (!session?.user?.id || session.user.role?.toUpperCase() !== 'ADMIN') {
            throw new Error('Unauthorized');
        }
    }

    const url = process.env.PRICES_FEED_URL;
    if (!url) {
        return { updated: 0, week: isoWeekKey(), error: 'PRICES_FEED_URL not configured' };
    }

    let raw: string;
    try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) {
            return { updated: 0, week: isoWeekKey(), error: `Feed responded ${res.status}` };
        }
        raw = await res.text();
    } catch (e) {
        console.error('refreshPricesFromFeed fetch error:', e);
        return { updated: 0, week: isoWeekKey(), error: 'Feed unreachable' };
    }

    const rows = parsePriceFeed(raw);
    if (rows.length === 0) {
        return { updated: 0, week: isoWeekKey(), error: 'Feed empty or malformed' };
    }

    const week = isoWeekKey();
    let updated = 0;
    // Loop instead of $transaction so a single bad row doesn't roll back the
    // whole batch — feeds are often noisy. Errors are logged per row.
    for (const row of rows) {
        try {
            await prisma.price.upsert({
                where: { code_week: { code: row.code, week } },
                update: { pricePer100Kg: row.pricePer100Kg, source: row.source ?? 'custom' },
                create: {
                    code: row.code,
                    pricePer100Kg: row.pricePer100Kg,
                    week,
                    source: row.source ?? 'custom',
                },
            });
            updated++;
        } catch (e) {
            console.error('refreshPricesFromFeed upsert error', row, e);
        }
    }

    invalidatePriceCache();
    return { updated, week };
}

export async function listLatestPrices() {
    // Public read: any logged-in user can see the price grid currently used.
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    const map = await getLatestPriceMap();
    return Object.entries(map)
        .map(([code, pricePer100Kg]) => ({ code, pricePer100Kg }))
        .sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Server-side projection used by the UI to obtain a DB-fresh projected
 * sales price for an animal. Mirrors `PriceEngine.calculateSalesPrice` but
 * with database overrides.
 */
export async function computeSalesPrice(input: {
    ageMonths: number;
    sex: string;
    isCastrated?: boolean;
    isParida?: boolean;
    carcassWeightKg: number;
    conformation: string;
    fat: number;
}) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    const { carcassWeightKg, conformation, fat, ...animal } = input;
    return computeSalesPriceServer(animal, carcassWeightKg, conformation, fat);
}
