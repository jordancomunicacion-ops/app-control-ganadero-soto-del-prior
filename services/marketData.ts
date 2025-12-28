
export interface MarketPrice {
    category: string;
    class_seurop: string;
    price_eur_kg_canal: number;
    trend: 'stable' | 'up' | 'down';
    last_updated: string;
}

// Defaults based on MAPA 2024 (approx)
export const DEFAULT_PRICES: MarketPrice[] = [
    { category: 'Añojo', class_seurop: 'E', price_eur_kg_canal: 5.60, trend: 'up', last_updated: '2024-12-01' },
    { category: 'Añojo', class_seurop: 'U', price_eur_kg_canal: 5.45, trend: 'up', last_updated: '2024-12-01' },
    { category: 'Añojo', class_seurop: 'R', price_eur_kg_canal: 5.30, trend: 'stable', last_updated: '2024-12-01' },
    { category: 'Añojo', class_seurop: 'O', price_eur_kg_canal: 4.90, trend: 'down', last_updated: '2024-12-01' },

    { category: 'Ternera', class_seurop: 'E', price_eur_kg_canal: 5.80, trend: 'up', last_updated: '2024-12-01' },
    { category: 'Ternera', class_seurop: 'U', price_eur_kg_canal: 5.65, trend: 'up', last_updated: '2024-12-01' },
    { category: 'Ternera', class_seurop: 'R', price_eur_kg_canal: 5.45, trend: 'stable', last_updated: '2024-12-01' },

    { category: 'Vaca', class_seurop: 'R', price_eur_kg_canal: 4.20, trend: 'stable', last_updated: '2024-12-01' },
    { category: 'Vaca', class_seurop: 'O', price_eur_kg_canal: 3.50, trend: 'down', last_updated: '2024-12-01' },
    { category: 'Vaca', class_seurop: 'P', price_eur_kg_canal: 2.80, trend: 'down', last_updated: '2024-12-01' }
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
