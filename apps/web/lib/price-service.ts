import { prisma } from './prisma';
import { PriceEngine } from '@/services/priceEngine';

/**
 * Server-side price service.
 *
 * Reads the most recent price for each SEUROP code from the database, then
 * falls back to the hardcoded defaults in PriceEngine. This is the source of
 * truth for any pricing decision the server takes (e.g. `actualPrice` in
 * Sacrificio/Venta events). The client-side hook still uses the synchronous
 * PriceEngine.defaultPrices for live projections.
 */

const PRICE_CACHE_TTL_MS = 60_000;

let cache: { at: number; map: Record<string, number> } | null = null;

/**
 * Returns the latest known price (€/100 kg canal) for each code present in
 * the database, ignoring older weeks. Cached for 1 minute to absorb bursts.
 */
export async function getLatestPriceMap(): Promise<Record<string, number>> {
    if (cache && Date.now() - cache.at < PRICE_CACHE_TTL_MS) return cache.map;

    const rows = await prisma.price.findMany({
        orderBy: { week: 'desc' },
        select: { code: true, pricePer100Kg: true, week: true },
    });

    const map: Record<string, number> = {};
    for (const row of rows) {
        if (!(row.code in map)) map[row.code] = row.pricePer100Kg;
    }
    cache = { at: Date.now(), map };
    return map;
}

export function invalidatePriceCache() {
    cache = null;
}

/**
 * Compute the projected sales price for an animal using DB-fresh prices
 * when available, falling back to the static reference table.
 */
export async function computeSalesPriceServer(
    animal: { ageMonths: number; sex: string; isCastrated?: boolean; isParida?: boolean },
    carcassWeightKg: number,
    conformation: string,
    fat: number,
) {
    const dbPrices = await getLatestPriceMap();
    const lookup = (code: string): number | undefined =>
        dbPrices[code] ?? PriceEngine.defaultPrices[code];
    return PriceEngine.calculateSalesPriceWithLookup(animal, carcassWeightKg, conformation, fat, lookup);
}

/**
 * ISO week key compatible with PostgreSQL ordering ("2026-W08", "2026-W31").
 */
export function isoWeekKey(d: Date = new Date()): string {
    // Copy date so we don't mutate the caller's instance.
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    // Thursday in current week decides the year (ISO-8601).
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export type ParsedPriceRow = { code: string; pricePer100Kg: number; source?: string };

/**
 * Parse the price feed. Format auto-detected:
 *   - JSON: an array of `{ code, pricePer100Kg, source? }`
 *   - CSV/TSV: `code;price[;source]` rows, semicolons or commas, header optional
 *
 * Lines starting with `#` are treated as comments.
 */
export function parsePriceFeed(raw: string): ParsedPriceRow[] {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
            const parsed = JSON.parse(trimmed);
            const arr = Array.isArray(parsed) ? parsed : parsed.rows ?? [];
            return arr
                .map((r: unknown) => {
                    const row = r as { code?: unknown; pricePer100Kg?: unknown; price?: unknown; source?: unknown };
                    const code = typeof row.code === 'string' ? row.code.trim().toUpperCase() : '';
                    const price = Number(row.pricePer100Kg ?? row.price);
                    const source = typeof row.source === 'string' ? row.source : undefined;
                    return code && Number.isFinite(price) ? { code, pricePer100Kg: price, source } : null;
                })
                .filter((r: ParsedPriceRow | null): r is ParsedPriceRow => r !== null);
        } catch {
            return [];
        }
    }

    const out: ParsedPriceRow[] = [];
    for (const line of trimmed.split(/\r?\n/)) {
        const clean = line.trim();
        if (!clean || clean.startsWith('#')) continue;
        const parts = clean.split(/[,;\t]/).map((p) => p.trim());
        if (parts.length < 2) continue;
        const code = parts[0].toUpperCase();
        // Skip header lines like "code;price"
        if (!/^[A-Z]{1,3}\d?$/.test(code)) continue;
        const price = parseFloat(parts[1].replace(',', '.'));
        if (!Number.isFinite(price)) continue;
        const source = parts[2] || undefined;
        out.push({ code, pricePer100Kg: price, source });
    }
    return out;
}
