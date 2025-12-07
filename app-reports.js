
// ==========================================
// REPORT & EXPORT SYSTEM
// ==========================================

const reportStatus = qs('#reportStatus');

document.addEventListener('click', async (e) => {
    if (e.target.matches('[data-report]')) {
        const reportType = e.target.dataset.report;
        await handleReportGeneration(reportType);
    }
});

async function handleReportGeneration(type) {
    if (reportStatus) reportStatus.textContent = `Generando reporte: ${type}...`;

    try {
        let data = [];
        let filename = `reporte_${type}_${new Date().toISOString().split('T')[0]}.csv`;

        const animals = storage.read(`animals_${currentUser}`, []);
        const events = storage.read('events', []);

        switch (type) {
            case 'weights':
                filename = `historial_pesos_${new Date().toISOString().split('T')[0]}.csv`;
                // Filter only 'Pesaje' events
                const weightEvents = events.filter(ev => ev.type === 'Pesaje');

                // Map to CSV structure
                data = weightEvents.map(ev => ({
                    Fecha: ev.date,
                    Crotal: ev.animalCrotal || 'Desconocido',
                    'Peso (kg)': (ev.desc.match(/Pesaje: (\d+(\.\d+)?)kg/)?.[1] || '0'),
                    Notas: ev.desc
                }));

                // Sort by Date Desc
                data.sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha));
                break;

            case 'inventory':
                filename = `inventario_animales_${new Date().toISOString().split('T')[0]}.csv`;
                data = animals.map(a => ({
                    Crotal: a.crotal,
                    Nombre: a.name,
                    Raza: a.breed,
                    Sexo: a.sex,
                    Nacimiento: a.birthDate,
                    'Peso Actual': a.currentWeight,
                    'Finca ID': a.farmId
                }));
                break;

            case 'events':
                filename = `historial_eventos_${new Date().toISOString().split('T')[0]}.csv`;
                data = events.map(ev => ({
                    Fecha: ev.date,
                    Tipo: ev.type,
                    Crotal: ev.animalCrotal,
                    Descripcion: ev.desc,
                    Costo: ev.cost
                }));
                break;

            case 'fcr':
                alert('Reporte FCR aún no disponible en CSV. Use la calculadora.');
                return;

            case 'weather_history':
                const startDate = qs('#reportStartDate').value;
                const endDate = qs('#reportEndDate').value;

                if (!startDate || !endDate) {
                    alert('Por favor selecciona "Desde" y "Hasta" para el reporte climático.');
                    if (reportStatus) reportStatus.textContent = 'Fechas requeridas.';
                    return;
                }

                // Find Farm Location (Prefer 'Soto del Prior', else first available)
                const fincas = getFincas(); // Assuming global or imported
                let targetFarm = fincas.find(f => f.name.includes('Soto del Prior')) || fincas[0];

                if (!targetFarm || !targetFarm.lat || !targetFarm.lon) {
                    alert('No se puede generar el reporte: No hay finca con coordenadas (Lat/Lon).');
                    return;
                }

                if (reportStatus) reportStatus.textContent = `Consultando clima para ${targetFarm.name}...`;

                const weatherData = await window.WeatherService.getHistoricalWeather(targetFarm.lat, targetFarm.lon, startDate, endDate);

                if (!weatherData || !weatherData.daily) {
                    throw new Error('No se pudieron obtener datos del servicio meteorológico.');
                }

                filename = `clima_${targetFarm.name.replace(/\s+/g, '_')}_${startDate}_${endDate}.csv`;

                // Map Archive Data to CSV Rows
                const dates = weatherData.daily.time;
                const temps = weatherData.daily.temperature_2m_mean;
                const rain = weatherData.daily.precipitation_sum;
                const wind = weatherData.daily.wind_speed_10m_max;

                data = dates.map((date, index) => ({
                    Fecha: date,
                    'Temp Media (C)': temps[index],
                    'Lluvia (mm)': rain[index],
                    'Viento Max (km/h)': wind[index]
                }));
                break;

            default:
                alert('Tipo de reporte no implementado: ' + type);
                return;
        }

        if (data.length === 0) {
            alert('No hay datos para generar este reporte.');
            if (reportStatus) reportStatus.textContent = 'Sin datos.';
            return;
        }

        downloadCSV(data, filename);
        if (reportStatus) reportStatus.textContent = `Reporte descargado: ${filename}`;

    } catch (err) {
        console.error(err);
        alert('Error generando reporte: ' + err.message);
    }
}

function downloadCSV(data, filename) {
    if (!data || !data.length) return;

    // Get headers
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(fieldName => {
            let val = row[fieldName] ? String(row[fieldName]) : '';
            // Escape quotes
            val = val.replace(/"/g, '""');
            // Wrap in quotes if contains comma
            if (val.includes(',') || val.includes('"')) val = `"${val}"`;
            return val;
        }).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
