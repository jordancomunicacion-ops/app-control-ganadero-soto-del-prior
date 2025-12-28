
export interface WeatherData {
    temperature: number;
    humidity: number;
    wind_speed: number;
    precipitation_sum?: number;
    weather_code: number;
    weather_desc: string;
}

export const WeatherService = {
    getWeatherDescription(code: number): string {
        switch (code) {
            case 0: return 'Despejado';
            case 1:
            case 2:
            case 3: return 'Nublado';
            case 45:
            case 48: return 'Niebla';
            case 51: case 53: case 55: return 'Llovizna';
            case 61: case 63: case 65: return 'Lluvia';
            case 71: case 73: case 75: return 'Nueve';
            case 95: case 96: case 99: return 'Tormenta';
            default: return 'Desconocido';
        }
    },

    async getCurrentWeather(lat: number, lon: number): Promise<WeatherData | null> {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Weather API Error');
            const data = await res.json();

            const curr = data.current;
            return {
                temperature: curr.temperature_2m,
                humidity: curr.relative_humidity_2m,
                wind_speed: curr.wind_speed_10m,
                weather_code: curr.weather_code,
                weather_desc: this.getWeatherDescription(curr.weather_code)
            };
        } catch (e) {
            console.error(e);
            return null;
        }
    },

    /**
     * Get historical precipitation for grazing growth analysis
     */
    async getWeeklyPrecipitation(lat: number, lon: number): Promise<number> {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum&past_days=7`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.daily && data.daily.precipitation_sum) {
                return data.daily.precipitation_sum.reduce((a: number, b: number) => a + b, 0);
            }
            return 0;
        } catch (e) {
            return 0;
        }
    },

    async getForecast(lat: number, lon: number): Promise<any[]> {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=4`;
            const res = await fetch(url);
            const data = await res.json();

            if (!data.daily) return [];

            const daily = data.daily;
            const forecast = [];

            // Skip today (index 0) usually, start from tomorrow? Or show next 3 days including today? 
            // User asked for "pronóstico de los 3 siguientes días". Let's show indices 0, 1, 2 (Today, +1, +2) or 1, 2, 3.
            // Let's show Today + Next 2 days, or Next 3 days. Usually Forecast implies future.
            // Let's take indices 0, 1, 2 for now as strictly "next 3 days" to fill the UI slots.
            for (let i = 0; i < 3; i++) {
                forecast.push({
                    date: daily.time[i],
                    icon: this.getWeatherIcon(daily.weather_code[i]), // Need helper
                    max: daily.temperature_2m_max[i],
                    min: daily.temperature_2m_min[i],
                    precip: daily.precipitation_sum[i],
                    code: daily.weather_code[i]
                });
            }
            return forecast;
        } catch (e) {
            console.error("Forecast Error", e);
            return [];
        }
    },

    getWeatherIcon(code: number): string {
        if (code === 0) return '☀️';
        if (code < 3) return '⛅';
        if (code < 48) return '☁️';
        if (code < 60) return '🌧️';
        if (code < 80) return '⛈️';
        return '🌨️';
    },

    async analyzeClimate(lat: number, lon: number): Promise<{ avgTemp: number; classification: string; annualPrecip: number } | null> {
        try {
            const current = await this.getCurrentWeather(lat, lon);
            const precip = await this.getWeeklyPrecipitation(lat, lon);

            const isSouth = lat < 40;
            const classification = isSouth ? 'Mediterráneo Seco' : 'Continental Templado';

            const estAnnualPrecip = precip * 40 + (isSouth ? 300 : 600);

            return {
                avgTemp: current ? current.temperature : 15,
                classification,
                annualPrecip: Math.round(estAnnualPrecip)
            };
        } catch (e) {
            console.error("Climate Analysis Error", e);
            return { avgTemp: 15, classification: 'Desconocido', annualPrecip: 500 };
        }
    }
};
