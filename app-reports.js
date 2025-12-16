
// ==========================================
// REPORT & EXPORT SYSTEM
// ==========================================

const reportStatus = qs('#reportStatus');
let selectedReportType = null;

// 1. Report Selection Logic
document.addEventListener('click', (e) => {
    if (e.target.matches('[data-report]')) {
        // Clear previous active
        document.querySelectorAll('[data-report]').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        selectedReportType = e.target.dataset.report;
        if (reportStatus) reportStatus.textContent = `Reporte seleccionado: ${e.target.textContent}. Elija formato de descarga.`;
    }
});

// 2. Export Triggers
const exportCSVBtn = qs('#exportCSV');
const exportPDFBtn = qs('#exportPDF');

if (exportCSVBtn) {
    exportCSVBtn.addEventListener('click', () => {
        if (!selectedReportType) { alert('Seleccione un tipo de reporte primero.'); return; }
        handleReportGeneration(selectedReportType, 'csv');
    });
}

if (exportPDFBtn) {
    exportPDFBtn.addEventListener('click', () => {
        if (!selectedReportType) { alert('Seleccione un tipo de reporte primero.'); return; }
        handleReportGeneration(selectedReportType, 'pdf');
    });
}

const { jsPDF } = window.jspdf;

async function handleReportGeneration(type, format = 'csv') {
    if (reportStatus) reportStatus.textContent = `Generando ${type} (${format.toUpperCase()})...`;

    try {
        const doc = new jsPDF();
        let data = [];
        let body = [];
        let headers = [];
        let title = type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
        let chartImage = null;
        let filename = `${type}_${format}_${new Date().toISOString().split('T')[0]}.${format}`;

        // Farm Info for PDF Header
        const fincas = getFincas(); // existing helper
        // Try to get farm name via filter or default
        const filterFarm = document.getElementById('reportFarm') ? document.getElementById('reportFarm').value : '';
        let farmObj = fincas.find(f => f.id === filterFarm);
        // Fallback to first farm if only one exists or default config
        if (!farmObj && fincas.length > 0) farmObj = fincas[0];

        const farmName = farmObj ? farmObj.name : 'Ganadería General';
        const farmLocation = farmObj ? (farmObj.location || 'Ubicación no definid') : '-';

        const animals = storage.read(`animals_${currentUser}`, []);
        const events = storage.read('events', []);

        switch (type) {
            case 'weights': {
                title = 'Historial de Pesos';
                headers = [['Fecha', 'Crotal', 'Peso (kg)', 'Notas']];

                // Get Filters (Safe Access)
                const filterFarm = document.getElementById('reportFarm') ? document.getElementById('reportFarm').value : '';
                const filterCorral = document.getElementById('reportCorral') ? document.getElementById('reportCorral').value : '';
                const filterAnimal = document.getElementById('reportAnimal') ? document.getElementById('reportAnimal').value.trim() : '';
                const startDate = document.getElementById('reportStartDate') ? document.getElementById('reportStartDate').value : '';
                const endDate = document.getElementById('reportEndDate') ? document.getElementById('reportEndDate').value : '';

                // Start with all Pesaje events
                let weightEvents = events.filter(ev => ev.type === 'Pesaje');

                // Filter by Animal
                if (filterAnimal) {
                    weightEvents = weightEvents.filter(ev =>
                        (ev.animalCrotal && ev.animalCrotal.toUpperCase().includes(filterAnimal.toUpperCase()))
                    );
                }

                // Filter by Date
                if (startDate) { weightEvents = weightEvents.filter(ev => new Date(ev.date) >= new Date(startDate)); }
                if (endDate) {
                    const dEnd = new Date(endDate); dEnd.setHours(23, 59, 59);
                    weightEvents = weightEvents.filter(ev => new Date(ev.date) <= dEnd);
                }

                // Filter by Farm/Corral
                if (filterFarm || filterCorral) {
                    const animalMap = new Map(animals.map(a => [a.id, a]));
                    const animalShortMap = new Map(animals.map(a => [a.crotal, a]));

                    weightEvents = weightEvents.filter(ev => {
                        const animal = animalMap.get(ev.animalId) || animalShortMap.get(ev.animalCrotal);
                        if (!animal) return false;
                        if (filterFarm && animal.farmId !== filterFarm) return false;
                        if (filterCorral && String(animal.corral) !== String(filterCorral)) return false;
                        return true;
                    });
                }

                // Sort
                weightEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

                if (format === 'csv') {
                    data = weightEvents.map(ev => ({
                        Fecha: ev.date,
                        Crotal: ev.animalCrotal || 'Desconocido',
                        'Peso (kg)': (ev.desc.match(/Pesaje: (\d+(\.\d+)?)kg/)?.[1] || '0'),
                        Notas: ev.desc
                    }));
                } else {
                    body = weightEvents.map(ev => [
                        new Date(ev.date).toLocaleDateString(),
                        ev.animalCrotal || '-',
                        (ev.desc.match(/Pesaje: (\d+(\.\d+)?)kg/)?.[1] || '0'),
                        ev.desc || ''
                    ]);
                }
                break;
            }

            case 'inventory': {
                title = 'Inventario Animal';
                headers = [['Crotal', 'Nombre', 'Raza', 'Sexo', 'Nacimiento', 'Peso', 'Finca']];

                // Get Filters
                const filterFarm = document.getElementById('reportFarm') ? document.getElementById('reportFarm').value : '';
                const filterCorral = document.getElementById('reportCorral') ? document.getElementById('reportCorral').value : '';
                const filterAnimal = document.getElementById('reportAnimal') ? document.getElementById('reportAnimal').value.trim() : '';

                let filteredAnimals = [...animals];
                if (filterFarm) filteredAnimals = filteredAnimals.filter(a => a.farmId === filterFarm);
                if (filterCorral) filteredAnimals = filteredAnimals.filter(a => String(a.corral) === String(filterCorral));
                if (filterAnimal) filteredAnimals = filteredAnimals.filter(a => a.crotal.toUpperCase().includes(filterAnimal.toUpperCase()) || (a.name && a.name.toUpperCase().includes(filterAnimal.toUpperCase())));

                if (format === 'csv') {
                    data = filteredAnimals.map(a => ({
                        Crotal: a.crotal,
                        Nombre: a.name || '',
                        Raza: a.breed || '',
                        Sexo: a.sex || '',
                        Nacimiento: a.birthDate || '',
                        'Peso Actual': a.currentWeight || 0,
                        'Finca ID': a.farmId || ''
                    }));
                } else {
                    const fincas = getFincas();
                    body = filteredAnimals.map(a => {
                        const farmName = fincas.find(f => f.id === a.farmId)?.name || a.farmId;
                        return [
                            a.crotal,
                            a.name || '-',
                            a.breed || '-',
                            a.sex || '-',
                            new Date(a.birthDate).toLocaleDateString(),
                            a.currentWeight + ' kg',
                            farmName
                        ];
                    });
                }
                break;
            }

            case 'events': {
                title = 'Historial de Eventos';
                headers = [['Fecha', 'Tipo', 'Crotal', 'Descripción', 'Costo (€)']];

                // Filters
                const filterFarm = document.getElementById('reportFarm') ? document.getElementById('reportFarm').value : '';
                const filterCorral = document.getElementById('reportCorral') ? document.getElementById('reportCorral').value : '';
                const filterAnimal = document.getElementById('reportAnimal') ? document.getElementById('reportAnimal').value.trim() : '';
                const startDate = document.getElementById('reportStartDate') ? document.getElementById('reportStartDate').value : '';
                const endDate = document.getElementById('reportEndDate') ? document.getElementById('reportEndDate').value : '';

                let filteredEvents = [...events];

                if (startDate) filteredEvents = filteredEvents.filter(ev => new Date(ev.date) >= new Date(startDate));
                if (endDate) { const dEnd = new Date(endDate); dEnd.setHours(23, 59, 59); filteredEvents = filteredEvents.filter(ev => new Date(ev.date) <= dEnd); }

                if (filterAnimal) {
                    filteredEvents = filteredEvents.filter(ev => ev.animalCrotal && ev.animalCrotal.toUpperCase().includes(filterAnimal.toUpperCase()));
                }

                if (filterFarm || filterCorral) {
                    const animalMap = new Map(animals.map(a => [a.id, a]));
                    const animalShortMap = new Map(animals.map(a => [a.crotal, a]));
                    filteredEvents = filteredEvents.filter(ev => {
                        const animal = animalMap.get(ev.animalId) || animalShortMap.get(ev.animalCrotal);
                        if (!animal) return false;
                        if (filterFarm && animal.farmId !== filterFarm) return false;
                        if (filterCorral && String(animal.corral) !== String(filterCorral)) return false;
                        return true;
                    });
                }

                filteredEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

                if (format === 'csv') {
                    data = filteredEvents.map(ev => ({
                        Fecha: ev.date ? new Date(ev.date).toLocaleDateString('es-ES') : '',
                        Tipo: ev.type || '',
                        Crotal: ev.animalCrotal || '',
                        Descripcion: ev.desc || '',
                        Costo: (parseFloat(ev.cost) || 0).toFixed(2)
                    }));
                } else {
                    body = filteredEvents.map(ev => [
                        ev.date ? new Date(ev.date).toLocaleDateString('es-ES') : '-',
                        ev.type || '-',
                        ev.animalCrotal || '-',
                        ev.desc || '-',
                        (parseFloat(ev.cost) || 0).toFixed(2) + ' €'
                    ]);
                }
                break;
            }

            case 'farms': {
                title = 'Resumen de Fincas';
                headers = [['Nombre', 'Ubicación', 'Has', 'Animales', 'Licencia', 'Manejo']];

                const filterFarm = document.getElementById('reportFarm') ? document.getElementById('reportFarm').value : '';
                let fincas = getFincas();
                if (filterFarm) fincas = fincas.filter(f => f.id === filterFarm);

                if (format === 'csv') {
                    data = fincas.map(f => ({
                        Nombre: f.name,
                        Ubicacion: f.location,
                        Hectareas: f.size,
                        Animales: f.animals,
                        Licencia: f.license,
                        Manejo: f.management
                    }));
                } else {
                    body = fincas.map(f => [
                        f.name,
                        f.location,
                        f.size,
                        f.animals,
                        f.license,
                        f.management
                    ]);
                }
                break;
            }

            case 'economics': {
                title = 'Balance Económico';
                headers = [['Crotal', 'Raza', 'Coste', 'Valor Est.', 'Margen']];

                const filterFarm = document.getElementById('reportFarm') ? document.getElementById('reportFarm').value : '';
                const filterCorral = document.getElementById('reportCorral') ? document.getElementById('reportCorral').value : '';
                const filterAnimal = document.getElementById('reportAnimal') ? document.getElementById('reportAnimal').value.trim() : '';

                let animalsList = storage.read(`animals_${currentUser}`, []);
                if (filterFarm) animalsList = animalsList.filter(a => a.farmId === filterFarm);
                if (filterCorral) animalsList = animalsList.filter(a => String(a.corral) === String(filterCorral));
                if (filterAnimal) animalsList = animalsList.filter(a => a.crotal.toUpperCase().includes(filterAnimal.toUpperCase()) || (a.name && a.name.toUpperCase().includes(filterAnimal.toUpperCase())));

                const marketData = window.MarketDataManager;

                const processedList = animalsList.map(a => {
                    const animalEvents = events.filter(e => e.animalId === a.id || e.animalCrotal === a.crotal);
                    let totalCost = animalEvents.reduce((sum, e) => sum + (parseFloat(e.cost) || 0), 0);

                    // Add Diet costs
                    const dietEvents = animalEvents.filter(e => (e.desc && (e.desc.includes('DIETA') || e.desc.includes('Plan') || e.desc.includes('Coste')))).sort((x, y) => new Date(x.date) - new Date(y.date));
                    let lastPlanDate = null;
                    let lastDailyCost = 0;
                    dietEvents.forEach(e => {
                        const currentDate = new Date(e.date);
                        let cost = 0;
                        const match = e.desc.match(/Coste:\s*([\d\.,]+)/i);
                        if (match) cost = parseFloat(match[1].replace(',', '.'));
                        if (lastPlanDate && lastDailyCost > 0) {
                            const days = (currentDate - lastPlanDate) / (1000 * 60 * 60 * 24);
                            if (days > 0) totalCost += days * lastDailyCost;
                        }
                        lastPlanDate = currentDate;
                        lastDailyCost = cost;
                    });
                    if (lastPlanDate && lastDailyCost > 0) {
                        const days = (new Date() - lastPlanDate) / (1000 * 60 * 60 * 24);
                        if (days > 0) totalCost += days * lastDailyCost;
                    }

                    const birth = new Date(a.birthDate);
                    const ageMonths = (new Date() - birth) / (1000 * 60 * 60 * 24 * 30.44);
                    const sex = a.sex || 'Hembra';
                    const isParida = animalEvents.some(e => e.type === 'Parto');
                    const isCastrated = (a.subType || '').includes('Buey') || (a.category || '').includes('Buey');
                    const animalProfile = { ageMonths, sex, isParida, isCastrated };

                    let priceResult = { price: 3.0, code: 'Generic' };
                    if (marketData && typeof marketData.getBeefPrice === 'function') {
                        priceResult = marketData.getBeefPrice(a.category || '', 'R', 3, animalProfile);
                    }
                    const estimatedValue = (parseFloat(a.currentWeight) || 0) * (priceResult.price || 3.0);

                    return {
                        Crotal: a.crotal,
                        Raza: a.breed,
                        Coste: totalCost.toFixed(2),
                        Valor: estimatedValue.toFixed(2),
                        Margen: (estimatedValue - totalCost).toFixed(2)
                    };
                });

                if (format === 'csv') {
                    data = processedList.map(item => ({
                        Crotal: item.Crotal,
                        Raza: item.Raza,
                        'Coste Acumulado (€)': item.Coste,
                        'Valor Estimado (€)': item.Valor,
                        'Margen Aprox (€)': item.Margen
                    }));
                } else {
                    body = processedList.map(item => [item.Crotal, item.Raza, item.Coste + ' €', item.Valor + ' €', item.Margen + ' €']);
                }
                break;
            }

            case 'productivity': {
                title = 'Productividad (GMD)';
                headers = [['Crotal', 'Raza', 'GMD Vida', 'GMD Reciente', 'Dif %', 'Eficiencia']];

                const animalsList = storage.read(`animals_${currentUser}`, []);
                const processed = animalsList.map(a => {
                    const weightEvents = events.filter(e => (e.animalId === a.id || e.animalCrotal === a.crotal) && e.type === 'Pesaje').sort((x, y) => new Date(x.date) - new Date(y.date));

                    const weights = weightEvents.filter(e => e.desc.includes('kg')).map(e => ({
                        date: new Date(e.date),
                        weight: parseFloat(e.desc.match(/(\d+(\.\d+)?)\s*kg/)?.[1] || 0)
                    }));

                    const birth = new Date(a.birthDate);
                    const ageDays = (new Date() - birth) / (1000 * 60 * 60 * 24);
                    const currentWeight = parseFloat(a.currentWeight) || 0;
                    const birthWeight = parseFloat(a.birthWeight) || 40;

                    let lifetimeADG = (ageDays > 0) ? (currentWeight - birthWeight) / ageDays : 0;
                    let recentADG = 0;

                    if (weights.length >= 2) {
                        const w2 = weights[weights.length - 1];
                        const w1 = weights[weights.length - 2];
                        const diffDays = (w2.date - w1.date) / (1000 * 60 * 60 * 24);
                        if (diffDays > 0) recentADG = (w2.weight - w1.weight) / diffDays;
                    } else if (weights.length === 1 && ageDays > 0) {
                        recentADG = lifetimeADG;
                    }

                    const diffPct = (lifetimeADG > 0) ? ((recentADG - lifetimeADG) / lifetimeADG) * 100 : 0;

                    if (lifetimeADG <= 0 && recentADG <= 0) return null; // Skip invalid

                    return {
                        Crotal: a.crotal,
                        Raza: a.breed,
                        GMD_Vida: lifetimeADG.toFixed(3),
                        GMD_Reciente: recentADG.toFixed(3),
                        Dif: diffPct.toFixed(1) + '%',
                        Eff: recentADG > 1.2 ? 'Alta' : (recentADG > 0.8 ? 'Media' : 'Baja')
                    };
                }).filter(x => x);

                if (format === 'csv') {
                    filename = `productividad_gmd_${new Date().toISOString().split('T')[0]}.csv`;
                    data = processed.map(p => ({
                        Crotal: p.Crotal, Raza: p.Raza, 'GMD Vida': p.GMD_Vida, 'GMD Reciente': p.GMD_Reciente, Diferencia: p.Dif, Eficiencia: p.Eff
                    }));
                } else {
                    filename = `productividad_gmd_${new Date().toISOString().split('T')[0]}.pdf`;
                    body = processed.map(p => [p.Crotal, p.Raza, p.GMD_Vida, p.GMD_Reciente, p.Dif, p.Eff]);

                    // Chart Data Preparation
                    const breedStats = {};
                    processed.forEach(p => {
                        if (!breedStats[p.Raza]) breedStats[p.Raza] = { sum: 0, count: 0 };
                        breedStats[p.Raza].sum += parseFloat(p.GMD_Vida);
                        breedStats[p.Raza].count++;
                    });
                    const labels = Object.keys(breedStats);
                    const dataPoints = labels.map(l => breedStats[l].sum / breedStats[l].count);

                    chartImage = await createChartImage({
                        type: 'bar',
                        data: {
                            labels: labels,
                            datasets: [{ label: 'GMD Vida Promedio (kg/día)', data: dataPoints, backgroundColor: '#3b82f6' }]
                        },
                        options: { indexAxis: 'y' }
                    });
                }
                break;
            }

            case 'reproductive': {
                title = 'Ciclo Reproductivo';
                headers = [['Crotal', 'Edad', 'Estado', 'Dias Abiertos', 'Dias Post-Parto', 'IEP']];

                const animalsList = storage.read(`animals_${currentUser}`, []);
                const females = animalsList.filter(a => a.sex === 'Hembra');
                const statusCounts = {};

                const processed = females.map(a => {
                    const animalEvents = events.filter(e => e.animalId === a.id || e.animalCrotal === a.crotal);

                    // Helper or Mock logic
                    let status = 'Desconocido';
                    let daysPostPartum = 0;
                    const partos = animalEvents.filter(e => e.type === 'Parto').sort((x, y) => new Date(y.date) - new Date(x.date));

                    if (partos.length > 0) {
                        const lastParto = new Date(partos[0].date);
                        daysPostPartum = Math.floor((new Date() - lastParto) / (1000 * 60 * 60 * 24));
                        status = daysPostPartum > 90 ? 'Abierta (Alerta)' : 'Lactancia';
                    } else {
                        status = 'Nulípara';
                    }

                    statusCounts[status] = (statusCounts[status] || 0) + 1;

                    return {
                        Crotal: a.crotal,
                        Edad: ((new Date() - new Date(a.birthDate)) / (1000 * 60 * 60 * 24 * 30.44)).toFixed(1),
                        Estado: status,
                        DiasAbiertos: (status.includes('Abierta') ? daysPostPartum : 0),
                        PostParto: daysPostPartum,
                        IEP: partos.length > 1 ? Math.floor((new Date(partos[0].date) - new Date(partos[1].date)) / (1000 * 60 * 60 * 24)) : '-'
                    };
                });

                if (format === 'csv') {
                    filename = `reproductivo_${new Date().toISOString().split('T')[0]}.csv`;
                    data = processed.map(p => ({
                        Crotal: p.Crotal, Edad_Meses: p.Edad, Estado: p.Estado, Dias_Abiertos: p.DiasAbiertos, Dias_PostParto: p.PostParto, IEP_Dias: p.IEP
                    }));
                } else {
                    filename = `reproductivo_${new Date().toISOString().split('T')[0]}.pdf`;
                    body = processed.map(p => [p.Crotal, p.Edad, p.Estado, p.DiasAbiertos, p.PostParto, p.IEP]);

                    chartImage = await createChartImage({
                        type: 'doughnut',
                        data: {
                            labels: Object.keys(statusCounts),
                            datasets: [{
                                data: Object.values(statusCounts),
                                backgroundColor: ['#16a34a', '#eab308', '#dc2626', '#3b82f6']
                            }]
                        }
                    });
                }
                break;
            }

            case 'full_report': {
                title = 'Reporte Completo 360';
                headers = [['Crotal', 'Raza', 'Finca', 'Estado', 'Peso', 'Edad (m)', 'Eventos Periodo']];

                const filterFarm = document.getElementById('reportFarm') ? document.getElementById('reportFarm').value : '';
                const filterCorral = document.getElementById('reportCorral') ? document.getElementById('reportCorral').value : '';
                const filterAnimal = document.getElementById('reportAnimal') ? document.getElementById('reportAnimal').value.trim() : '';
                const startDate = document.getElementById('reportStartDate') ? document.getElementById('reportStartDate').value : '';
                const endDate = document.getElementById('reportEndDate') ? document.getElementById('reportEndDate').value : '';

                let animalsList = storage.read(`animals_${currentUser}`, []);
                const fincas = getFincas();

                if (filterFarm) animalsList = animalsList.filter(a => a.farmId === filterFarm);
                if (filterCorral) animalsList = animalsList.filter(a => String(a.corral) === String(filterCorral));
                if (filterAnimal) animalsList = animalsList.filter(a => a.crotal.toUpperCase().includes(filterAnimal.toUpperCase()) || (a.name && a.name.toUpperCase().includes(filterAnimal.toUpperCase())));

                const processed = animalsList.map(a => {
                    const animalEvents = events.filter(e => e.animalId === a.id || e.animalCrotal === a.crotal);
                    let periodEvents = animalEvents;
                    if (startDate) periodEvents = periodEvents.filter(ev => new Date(ev.date) >= new Date(startDate));
                    if (endDate) { const dEnd = new Date(endDate); dEnd.setHours(23, 59, 59); periodEvents = periodEvents.filter(ev => new Date(ev.date) <= dEnd); }
                    periodEvents.sort((x, y) => new Date(y.date) - new Date(x.date));

                    const birth = new Date(a.birthDate);
                    const ageMonths = ((new Date() - birth) / (1000 * 60 * 60 * 24 * 30.44)).toFixed(1);
                    const farm = fincas.find(f => f.id === a.farmId);
                    const eventSummary = periodEvents.map(e => `${e.type} [${new Date(e.date).toLocaleDateString()}]`).join(' | ');

                    return {
                        Crotal: a.crotal,
                        Raza: a.breed,
                        Finca: farm ? farm.name : 'Desconocida',
                        Estado: a.status || 'Activo',
                        Peso: a.currentWeight || 0,
                        Edad: ageMonths,
                        Eventos: eventSummary || 'Ninguno'
                    };
                });

                if (format === 'csv') {
                    filename = `reporte_completo_${new Date().toISOString().split('T')[0]}.csv`;
                    data = processed.map(p => ({
                        Crotal: p.Crotal, Raza: p.Raza, Finca: p.Finca, Estado: p.Estado, 'Peso Actual': p.Peso, 'Edad (Meses)': p.Edad, 'Resumen Eventos': p.Eventos
                    }));
                } else {
                    filename = `reporte_completo_${new Date().toISOString().split('T')[0]}.pdf`;
                    body = processed.map(p => [
                        p.Crotal, p.Raza, p.Finca, p.Estado, p.Peso + ' kg', p.Edad,
                        p.Eventos.substring(0, 100) + (p.Eventos.length > 100 ? '...' : '')
                    ]);
                }
                break;
            }
            case 'weather_history': {
                title = 'Historial Climático';
                headers = [['Fecha', 'Temp (°C)', 'Lluvia (mm)', 'Viento (km/h)']];

                // Get Filters
                const filterFarm = document.getElementById('reportFarm') ? document.getElementById('reportFarm').value : '';
                const startDate = document.getElementById('reportStartDate') ? document.getElementById('reportStartDate').value : '';
                const endDate = document.getElementById('reportEndDate') ? document.getElementById('reportEndDate').value : '';

                if (!filterFarm) {
                    alert('Por favor, selecciona una finca para obtener el historial climático.');
                    if (reportStatus) reportStatus.textContent = 'Faltan filtros.';
                    return;
                }

                if (!startDate || !endDate) {
                    alert('Por favor, selecciona fecha de inicio y fin.');
                    if (reportStatus) reportStatus.textContent = 'Faltan fechas.';
                    return;
                }

                // Get Farm Coords
                const fincas = getFincas();
                const farm = fincas.find(f => f.id === filterFarm);

                if (!farm || !farm.lat || !farm.lon) {
                    alert('La finca seleccionada no tiene coordenadas (latitud/longitud) configuradas.');
                    if (reportStatus) reportStatus.textContent = 'Sin coordenadas.';
                    return;
                }

                if (reportStatus) reportStatus.textContent = `Descargando datos de OpenMeteo...`;

                try {
                    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${farm.lat}&longitude=${farm.lon}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_mean,precipitation_sum,wind_speed_10m_max&timezone=auto`;

                    // We need to wait for fetch, but handleReportGeneration is async so it's okay.
                    // However, we need to populate data/body BEFORE the export logic runs at the end of the function.
                    // Since await is used here, execution pauses.

                    const res = await fetch(url);
                    if (!res.ok) throw new Error('Error OpenMeteo: ' + res.statusText);

                    const json = await res.json();

                    if (!json.daily || !json.daily.time) {
                        throw new Error('No hay datos diarios disponibles para este periodo.');
                    }

                    const weatherData = json.daily.time.map((date, idx) => ({
                        Fecha: date,
                        Temp: json.daily.temperature_2m_mean[idx],
                        Rain: json.daily.precipitation_sum[idx],
                        Wind: json.daily.wind_speed_10m_max[idx]
                    }));

                    if (format === 'csv') {
                        filename = `clima_${farm.name.replace(/\s+/g, '_')}_${startDate}_${endDate}.csv`;
                        data = weatherData.map(w => ({
                            Fecha: w.Fecha, 'Temp Media (°C)': w.Temp, 'Lluvia (mm)': w.Rain, 'Viento Max (km/h)': w.Wind
                        }));
                    } else {
                        filename = `clima_${farm.name.replace(/\s+/g, '_')}_${startDate}_${endDate}.pdf`;
                        body = weatherData.map(w => [w.Fecha, w.Temp, w.Rain, w.Wind]);
                    }

                } catch (e) {
                    alert('Error obteniendo clima: ' + e.message);
                    data = [];
                    body = [];
                }
                break;
            }


            default: {
                if (type !== 'weather_history') {
                    alert('Reporte no implementado en PDF aún.');
                    if (reportStatus) reportStatus.textContent = '';
                    return;
                }
            }
        }

        // --- EXPORT HANDLING (CSV or PDF) ---

        // If BODY is populated, generate PDF
        if (body.length > 0) {

            // 1. Header
            doc.setFillColor(21, 128, 61); // #15803d Green
            doc.rect(0, 0, 210, 20, 'F');

            doc.setFontSize(18);
            doc.setTextColor(255, 255, 255);
            doc.text("Soto del Prior", 14, 13);

            doc.setFontSize(10);
            doc.text(`${farmName} | ${new Date().toLocaleDateString()}`, 200, 13, { align: 'right' });

            // 2. Title & Context
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(16);
            doc.text(title, 14, 35);

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Ubicación: ${farmLocation}`, 14, 42);

            let yPos = 50;

            // 3. Chart Integration
            if (chartImage) {
                doc.addImage(chartImage, 'PNG', 14, yPos, 180, 80);
                yPos += 85;
            }

            // 4. Table
            doc.autoTable({
                head: headers,
                body: body,
                startY: yPos,
                theme: 'grid',
                headStyles: { fillColor: [21, 128, 61] },
                alternateRowStyles: { fillColor: [240, 253, 244] }, // Light green
                styles: { fontSize: 8 }
            });

            // 5. Save
            doc.save(filename);
            if (reportStatus) reportStatus.textContent = `✅ Descargado: ${filename}`;

        } else if (data.length > 0) {
            // Fallback: Generate CSV
            const keys = Object.keys(data[0]);
            const csvContent = [
                keys.join(','), // Header
                ...data.map(row => keys.map(k => `"${row[k] || ''}"`).join(',')) // Rows
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            if (reportStatus) reportStatus.textContent = `✅ Descargado: ${filename}`;
        } else {
            alert('No hay datos para generar el reporte.');
            reportStatus.textContent = 'Sin datos.';
        }

    } catch (err) {
        console.error(err);
        alert('Error generando PDF: ' + err.message);
        if (reportStatus) reportStatus.textContent = 'Error.';
    }
}


// --- CHART GENERATION HELPER ---
async function createChartImage(config) {
    return new Promise((resolve) => {
        // Create hidden canvas
        const canvas = document.createElement('canvas');
        canvas.width = 800; // High res
        canvas.height = 400;
        // Chart.js sometimes needs DOM attachment. Let's try off-screen first.
        // Actually, for toDataURL to work well with ChartJS, it prefers being in DOM to render fonts properly?
        // Let's hide it by position.

        canvas.style.position = 'fixed';
        canvas.style.left = '-9999px';
        canvas.style.visibility = 'hidden';
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');

        // Extend config for static rendering optimization
        config.options = config.options || {};
        config.options.animation = false; // Disable animation for instant render
        config.options.responsive = false;

        const chart = new Chart(ctx, config);

        // Wait for render (microtask)
        setTimeout(() => {
            const imgData = canvas.toDataURL('image/png');
            chart.destroy();
            document.body.removeChild(canvas);
            resolve(imgData);
        }, 100);
    });
}

// Global scope
window.handleReportGeneration = handleReportGeneration;
