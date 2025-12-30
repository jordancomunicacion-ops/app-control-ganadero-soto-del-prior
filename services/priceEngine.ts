
import { Breed } from './breedManager';

/**
 * PriceEngine handles SEUROP carcass classification and pricing logic.
 * Default prices are in Euro/100kg Canal.
 */
export const PriceEngine = {
    // Default Dec 2025 Reference Prices (Euro/100kg Canal)
    // Based on Lonja de Salamanca / Ternera Charra
    defaultPrices: {
        // A: Añojos (Machos 12-24m)
        "AR3": 758.0, "AU2": 779.0, "AU3": 779.0, "AO3": 745.0,
        // D: Vacas (Hembras >48m / Paridas)
        "DR3": 760.0, "DO3": 720.0, "DP2": 640.0, "DU4": 800.0, "DR4": 760.0,
        // E: Novillas (Hembras 12-48m no paridas)
        "ER3": 779.0, "EU3": 791.0, "EO3": 763.0,
        // Z: Terneros (8-12m)
        "ZR3": 780.0, "ZU3": 795.0,
        // C: Buey (>24m Castrado)
        "CR3": 850.0, "CU3": 880.0,
        // B: Toro (>24m Macho)
        "BR3": 680.0,
        // V: Ternera Blanca (<8m)
        "VR3": 800.0,
        // Generic Class Fallbacks (Euro / 100kg)
        "A": 750.0, "B": 650.0, "C": 800.0, "D": 680.0, "E": 770.0, "Z": 780.0, "V": 800.0
    } as Record<string, number>,

    /**
     * Determine MAPA Official Category Code
     */
    determineMAPACode(animalData: { ageMonths: number, sex: string, isCastrated?: boolean, isParida?: boolean }): string {
        const { ageMonths, sex, isCastrated, isParida } = animalData;
        const s = (sex || '').toLowerCase();

        // 1. V: < 8 months
        if (ageMonths < 8) return 'V';

        // 2. Z: 8 - 12 months
        if (ageMonths < 12) return 'Z';

        // 3. Machos
        if (s === 'macho' || s === 'castrado') {
            if (isCastrated || s === 'castrado') {
                return 'C'; // Buey / Cebón
            }
            if (ageMonths < 24) return 'A'; // Añojo
            return 'B'; // Toro
        }

        // 4. Hembras
        if (s === 'hembra') {
            if (isParida || ageMonths > 48) return 'D'; // Vaca
            return 'E'; // Novilla
        }

        return 'A'; // Default
    },

    /**
     * Calculate projected sales price for an animal
     * @returns total projected price in Euro and the code used
     */
    calculateSalesPrice(
        animal: { ageMonths: number, sex: string, isCastrated?: boolean, isParida?: boolean },
        carcassWeightKg: number,
        conformation: string, // S, E, U, R, O, P
        fat: number // 1-5
    ) {
        const letter = this.determineMAPACode(animal);
        const conf = (conformation || 'R').toUpperCase();
        const ft = (fat || 3).toString();

        // Try exact match (e.g. AR3)
        const exactCode = `${letter}${conf}${ft}`;
        const classCode = `${letter}${conf}`;

        let pricePer100Kg = this.defaultPrices[exactCode] ||
            this.defaultPrices[classCode] ||
            this.defaultPrices[letter] ||
            500; // Final fallback

        const totalValue = (carcassWeightKg / 100) * pricePer100Kg;

        return {
            totalValue: parseFloat(totalValue.toFixed(2)),
            pricePerKg: parseFloat((pricePer100Kg / 100).toFixed(2)),
            categoryCode: exactCode,
            baseCategory: letter
        };
    },

    /**
     * Update prices from CSV text
     */
    importPricesFromCSV(csvText: string) {
        const lines = csvText.split('\n');
        const updates: Record<string, number> = {};

        lines.forEach(line => {
            const parts = line.split(/,|;/);
            if (parts.length >= 2) {
                const code = parts[0].trim().toUpperCase();
                const price = parseFloat(parts[1].trim());
                if (!isNaN(price)) {
                    updates[code] = price;
                }
            }
        });

        // In a real app we would merge with persistent storage
        Object.assign(this.defaultPrices, updates);
        return Object.keys(updates).length;
    }
};
