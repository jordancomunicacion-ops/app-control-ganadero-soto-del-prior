/**
 * lipidEngine
 *
 * Centralises the dietary-lipid math that drives the SEUROP fat-cover and
 * marbling models, the bellota-lecithin synergy gate, and the omega-6/omega-3
 * imbalance alerts. All inputs are on a dry-matter basis.
 *
 * Sources for the underlying coefficients are documented in feedDatabase.ts
 * (Khan 2012, INRA-CIRAD-AFZ tables, Rabhi 2017, Viera 2024).
 */

import type { FeedItem } from './feedDatabase';

export interface RationItem {
    item: FeedItem;
    /** As-fed amount in kg per animal per day. */
    amount: number;
}

export interface LipidProfile {
    /** Dry-matter intake aggregated over the ration. */
    totalDmKg: number;
    /** Dietary oleic acid as % of dry matter. */
    oleicPctDm: number;
    /** Whether any acorn (encina/roble) is present. */
    hasBellota: boolean;
    /** Whether a protected soy lecithin source is present (Viera et al. 2024). */
    hasProtectedLecithin: boolean;
    /** Whether an oleic-enriched concentrate is present. */
    hasOleicConcentrate: boolean;
    /** Total fat estimate (ether-extract) — not measured directly here. */
    estTotalFatPctDm: number;
}

/**
 * Aggregate the dietary oleic-acid contribution of a ration. Each ingredient
 * is weighted by its DM share; values without an `oleic_pct_dm` field
 * contribute zero (a conservative assumption — better than guessing).
 */
export function computeDietOleic(ration: RationItem[]): number {
    const totalDm = ration.reduce(
        (sum, r) => sum + r.amount * (r.item.dm_percent / 100),
        0,
    );
    if (totalDm <= 0) return 0;

    const oleicMassKg = ration.reduce((sum, r) => {
        const dmKg = r.amount * (r.item.dm_percent / 100);
        const oleicFrac = (r.item.oleic_pct_dm ?? 0) / 100;
        return sum + dmKg * oleicFrac;
    }, 0);

    return parseFloat(((oleicMassKg / totalDm) * 100).toFixed(2));
}

/**
 * Build a structured lipid profile from a ration. Used by `nutritionEngine`
 * to gate the bellota + lecithin synergy with evidence-based thresholds
 * instead of name-matching strings.
 */
export function buildLipidProfile(ration: RationItem[]): LipidProfile {
    const totalDmKg = ration.reduce(
        (sum, r) => sum + r.amount * (r.item.dm_percent / 100),
        0,
    );

    const hasBellota = ration.some((r) =>
        (r.item.name || '').toLowerCase().includes('bellota'),
    );
    const hasProtectedLecithin = ration.some((r) =>
        (r.item.name || '').toLowerCase().includes('lecitina'),
    );
    const hasOleicConcentrate = ration.some((r) => {
        const n = (r.item.name || '').toLowerCase();
        return n.includes('alto oleico') || n.includes('oleico');
    });

    // Coarse ether-extract estimate from oleic share (oleico ≈ 25–63 % of EE
    // depending on source). Used only to flag very lean rations where
    // lecithin would have no substrate to emulsify.
    const oleicPctDm = computeDietOleic(ration);
    const estTotalFatPctDm = parseFloat((oleicPctDm / 0.4).toFixed(2));

    return {
        totalDmKg: parseFloat(totalDmKg.toFixed(2)),
        oleicPctDm,
        hasBellota,
        hasProtectedLecithin,
        hasOleicConcentrate,
        estTotalFatPctDm,
    };
}

/**
 * Returns true if the ration meets the minimum dietary oleic threshold for
 * the protected-lecithin synergy to be biologically active (Viera et al.
 * 2024 used 1.7–3.12 % oleic MS; we set the floor at 1.5 % to leave a small
 * safety margin).
 */
export function oleicThresholdMet(profile: LipidProfile, minPctDm = 1.5): boolean {
    return profile.oleicPctDm >= minPctDm || profile.hasBellota || profile.hasOleicConcentrate;
}
