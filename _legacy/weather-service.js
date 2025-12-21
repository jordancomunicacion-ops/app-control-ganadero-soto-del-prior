// ========================================
// WEATHER SERVICE MODULE
// Uses Open-Meteo API (Free, No Key)
// ========================================

const WeatherService = (function () {

    const API_URL = "https://api.open-meteo.com/v1/forecast";

    // WMO Weather interpretation codes (WW)
    const weatherCodes = {
        0: { label: 'Despejado', icon: '☀️' },
        1: { label: 'Mayormente despejado', icon: '🌤️' },
        2: { label: 'Parcialmente interesante', icon: '⛅' },
        3: { label: 'Nublado', icon: '☁️' },
        45: { label: 'Niebla', icon: '🌫️' },
        48: { label: 'Niebla con escarcha', icon: '🌫️' },
        51: { label: 'Llovizna ligera', icon: '🌦️' },
        53: { label: 'Llovizna moderada', icon: '🌦️' },
        55: { label: 'Llovizna densa', icon: '🌧️' },
        61: { label: 'Lluvia ligera', icon: '🌦️' },
        63: { label: 'Lluvia moderada', icon: '🌧️' },
        65: { label: 'Lluvia intensa', icon: '🌧️' },
        71: { label: 'Nieve ligera', icon: '🌨️' },
        73: { label: 'Nieve moderada', icon: '🌨️' },
        75: { label: 'Nieve intensa', icon: '🌨️' },
        95: { label: 'Tormenta', icon: '⚡' },
        96: { label: 'Tormenta con granizo', icon: '⛈️' },
        99: { label: 'Tormenta fuerte', icon: '⛈️' }
    };

    async function getWeather(lat, lon) {
        if (!lat || !lon) return null;

        try {
            const url = `${API_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;
            const response = await fetch(url);

            if (!response.ok) throw new Error('Weather API Error');

            const data = await response.json();
            const current = data.current;

            const code = current.weather_code;
            const condition = weatherCodes[code] || { label: 'Desconocido', icon: '❓' };

            return {
                temp: current.temperature_2m,
                humidity: current.relative_humidity_2m,
                wind: current.wind_speed_10m,
                condition: condition.label,
                icon: condition.icon,
                isPrivate: false
            };

        } catch (error) {
            console.error('Weather fetch error:', error);
            return null;
        }
    }

    async function getHistoricalWeather(lat, lon, startDate, endDate) {
        if (!lat || !lon || !startDate || !endDate) return null;

        try {
            const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_mean,precipitation_sum,wind_speed_10m_max&timezone=auto`;
            const response = await fetch(url);

            if (!response.ok) throw new Error('Weather Archive API Error');

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Weather history fetch error:', error);
            return null;
        }
    }

    return {
        getWeather,
        getHistoricalWeather
    };

})();

// Expose globally
window.WeatherService = WeatherService;
