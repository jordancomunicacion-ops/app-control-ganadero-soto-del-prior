
export interface MarketPrice {
    category: string;
    class_seurop: string;
    price_eur_kg_canal: number;
    trend: 'stable' | 'up' | 'down';
    last_updated: string;
}

// Defaults based on Lonja de Salamanca / Ternera Charra (Dec 2025)
export const DEFAULT_PRICES: MarketPrice[] = [
    { category: 'Añojo', class_seurop: 'E', price_eur_kg_canal: 7.94, trend: 'up', last_updated: '2025-12-30' },
    { category: 'Añojo', class_seurop: 'U', price_eur_kg_canal: 7.79, trend: 'up', last_updated: '2025-12-30' },
    { category: 'Añojo', class_seurop: 'R', price_eur_kg_canal: 7.58, trend: 'stable', last_updated: '2025-12-30' },
    { category: 'Añojo', class_seurop: 'O', price_eur_kg_canal: 7.45, trend: 'down', last_updated: '2025-12-30' },

    { category: 'Ternera', class_seurop: 'E', price_eur_kg_canal: 8.03, trend: 'up', last_updated: '2025-12-30' },
    { category: 'Ternera', class_seurop: 'U', price_eur_kg_canal: 7.91, trend: 'up', last_updated: '2025-12-30' },
    { category: 'Ternera', class_seurop: 'R', price_eur_kg_canal: 7.79, trend: 'stable', last_updated: '2025-12-30' },
    { category: 'Ternera', class_seurop: 'O', price_eur_kg_canal: 7.63, trend: 'down', last_updated: '2025-12-30' },

    { category: 'Vaca', class_seurop: 'R', price_eur_kg_canal: 7.60, trend: 'stable', last_updated: '2025-12-30' },
    { category: 'Vaca', class_seurop: 'O', price_eur_kg_canal: 7.20, trend: 'down', last_updated: '2025-12-30' },
    { category: 'Vaca', class_seurop: 'P', price_eur_kg_canal: 6.40, trend: 'down', last_updated: '2025-12-30' }
];

export const MarketData = {
    getPrices(): MarketPrice[] {
        return DEFAULT_PRICES;
    },

    getPrice(category: string, seurop: string): number {
        // Normalize
        const cat = category.includes('Añojo') ? 'Añojo' : (category.includes('Vaca') ? 'Vaca' : 'Ternera');
        const cls = seurop.charAt(0).toUpperCase(); // Take first letter (E, U, R...)

        const match = DEFAULT_PRICES.find(p => p.category === cat && p.class_seurop === cls);
        return match ? match.price_eur_kg_canal : 4.50; // Fallback average
    },

    calculateValue(weightCanal: number, category: string, seurop: string): number {
        const price = this.getPrice(category, seurop);
        return weightCanal * price;
    }
};
