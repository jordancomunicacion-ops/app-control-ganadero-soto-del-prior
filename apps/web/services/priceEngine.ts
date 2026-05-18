/**
 * PriceEngine handles SEUROP carcass classification and pricing logic.
 *
 * MAPA categories (EU regulation 1308/2013 Annex IV.A):
 *   V — under 8 months
 *   Z — 8 to <12 months
 *   A — uncastrated males 12–<24 months ("añojo")
 *   B — uncastrated males 24+ months ("toro")
 *   C — castrated males 12+ months ("buey", "cebón")
 *   D — females that have calved ("vaca")
 *   E — other females 12+ months ("novilla")
 *
 * Lookup key format: `${category}${conformation}${fatCover}` (e.g. AR3, CU3).
 * Default prices are in €/100kg canal. Source: Lonja de Salamanca / Ternera
 * Charra reference, Dec 2025.
 */
export const PriceEngine = {
    defaultPrices: {
        // ─── A — Añojos (machos 12-24m) ────────────────────────────────────
        AE2: 794.0, AE3: 794.0, AE4: 770.0,
        AU2: 779.0, AU3: 779.0, AU4: 755.0,
        AR2: 760.0, AR3: 758.0, AR4: 735.0,
        AO2: 745.0, AO3: 745.0, AO4: 720.0,
        AP3: 690.0,
        // ─── B — Toros (machos 24m+) ───────────────────────────────────────
        BU3: 700.0, BR3: 680.0, BO3: 660.0, BP3: 620.0,
        // ─── C — Bueyes / cebones (castrados 12m+) ─────────────────────────
        CE3: 920.0, CU2: 880.0, CU3: 880.0, CR2: 855.0, CR3: 850.0, CO3: 820.0,
        // ─── D — Vacas (hembras paridas) ───────────────────────────────────
        DU4: 800.0, DR3: 760.0, DR4: 760.0, DO3: 720.0, DP2: 640.0, DP3: 640.0,
        // ─── E — Novillas (12-48m, no paridas) ─────────────────────────────
        EE2: 803.0, EE3: 803.0, EU2: 791.0, EU3: 791.0, ER2: 779.0, ER3: 779.0,
        EO3: 763.0,
        // ─── Z — Terneros (8-12m) ──────────────────────────────────────────
        ZU3: 795.0, ZR3: 780.0, ZO3: 760.0,
        // ─── V — Ternera blanca (<8m) ──────────────────────────────────────
        VU3: 815.0, VR3: 800.0, VO3: 770.0,
        // Generic letter fallbacks (€/100kg) — used only if no class/exact match
        A: 750.0, B: 650.0, C: 800.0, D: 680.0, E: 770.0, Z: 780.0, V: 800.0,
    } as Record<string, number>,

    /**
     * Determine MAPA Official Category Code per EU rules.
     *
     * D ("vaca") requires `isParida === true`. The previous heuristic of
     * collapsing any female over 48 months to D produced wrong prices for
     * old nulliparous heifers — those stay E ("novilla").
     */
    determineMAPACode(animalData: { ageMonths: number; sex: string; isCastrated?: boolean; isParida?: boolean }): string {
        const { ageMonths, sex, isCastrated, isParida } = animalData;
        const s = (sex || '').toLowerCase();

        // 1. V: < 8 months (regardless of sex / castration)
        if (ageMonths < 8) return 'V';

        // 2. Z: 8 - 12 months (regardless of sex / castration)
        if (ageMonths < 12) return 'Z';

        // 3. Males
        if (s === 'macho' || s === 'castrado') {
            if (isCastrated || s === 'castrado') return 'C'; // Buey / Cebón
            if (ageMonths < 24) return 'A'; // Añojo
            return 'B'; // Toro
        }

        // 4. Females
        if (s === 'hembra') {
            if (isParida) return 'D';   // Vaca (regla EU: ha parido)
            return 'E';                  // Novilla
        }

        return 'A'; // Default safety net
    },

    /**
     * Calculate projected sales price for an animal.
     *
     * @param fat — SEUROP subcutaneous fat cover (1–5). Distinct from
     *              intramuscular marbling. Values outside 1–5 are clamped.
     */
    calculateSalesPrice(
        animal: { ageMonths: number; sex: string; isCastrated?: boolean; isParida?: boolean },
        carcassWeightKg: number,
        conformation: string,
        fat: number,
    ) {
        return this.calculateSalesPriceWithLookup(
            animal,
            carcassWeightKg,
            conformation,
            fat,
            (code) => this.defaultPrices[code],
        );
    },

    /**
     * Same as `calculateSalesPrice`, but with a pluggable lookup. Server
     * callers inject a DB-aware lookup so live SEUROP prices are used in
     * `actualPrice` / projections; client callers use the static defaults.
     */
    calculateSalesPriceWithLookup(
        animal: { ageMonths: number; sex: string; isCastrated?: boolean; isParida?: boolean },
        carcassWeightKg: number,
        conformation: string,
        fat: number,
        lookup: (code: string) => number | undefined,
    ): {
        totalValue: number;
        pricePerKg: number;
        categoryCode: string;
        baseCategory: string;
        priceSource: 'exact' | 'class' | 'letter' | 'fallback';
    } {
        const letter = this.determineMAPACode(animal);
        const conf = (conformation || 'R').toUpperCase();
        const fatNum = Number.isFinite(fat) ? Math.round(fat) : 3;
        const fatClamped = Math.max(1, Math.min(5, fatNum || 3));
        const ft = fatClamped.toString();

        const exactCode = `${letter}${conf}${ft}`;
        const classCode = `${letter}${conf}`;

        let priceSource: 'exact' | 'class' | 'letter' | 'fallback';
        let pricePer100Kg: number;

        const exact = lookup(exactCode);
        const klass = lookup(classCode);
        const letterPrice = lookup(letter);

        if (exact !== undefined) {
            pricePer100Kg = exact;
            priceSource = 'exact';
        } else if (klass !== undefined) {
            pricePer100Kg = klass;
            priceSource = 'class';
        } else if (letterPrice !== undefined) {
            pricePer100Kg = letterPrice;
            priceSource = 'letter';
        } else {
            pricePer100Kg = 500;
            priceSource = 'fallback';
        }

        const totalValue = (carcassWeightKg / 100) * pricePer100Kg;

        return {
            totalValue: parseFloat(totalValue.toFixed(2)),
            pricePerKg: parseFloat((pricePer100Kg / 100).toFixed(2)),
            // Reflect what the price was actually indexed by, not what we
            // asked for. Avoids showing "AE3" when the price came from "A".
            categoryCode:
                priceSource === 'exact'
                    ? exactCode
                    : priceSource === 'class'
                      ? classCode
                      : letter,
            baseCategory: letter,
            priceSource,
        };
    },

    /**
     * Update prices from CSV text (in-memory only — kept for tests; the UI
     * exposing this has been disabled until prices live in the database).
     */
    importPricesFromCSV(csvText: string) {
        const lines = csvText.split('\n');
        const updates: Record<string, number> = {};

        lines.forEach((line) => {
            const parts = line.split(/,|;/);
            if (parts.length >= 2) {
                const code = parts[0].trim().toUpperCase();
                const price = parseFloat(parts[1].trim());
                if (!isNaN(price)) {
                    updates[code] = price;
                }
            }
        });

        Object.assign(this.defaultPrices, updates);
        return Object.keys(updates).length;
    },
};
