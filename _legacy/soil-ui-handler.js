// Soil UI Handler
// Renders the Soil Data Table in the 'Datos' section

document.addEventListener('DOMContentLoaded', async function () {
    // Wait for SoilDataManager to be available
    if (window.SoilDataManager) {
        await window.SoilDataManager.init();
        renderSoilTable();
    } else {
        console.warn('SoilDataManager not found');
    }

    function renderSoilTable() {
        const tableBody = document.querySelector('#soilTable tbody');
        const countSpan = document.querySelector('#soilCount');

        if (!tableBody) return;

        // Clear existing
        tableBody.innerHTML = '';

        // Get Data
        const soils = window.SoilDataManager.getSoilTypes(); // formatted as array of objects

        if (countSpan) countSpan.textContent = soils.length;

        soils.forEach(soil => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #e2e8f0';

            tr.innerHTML = `
                <td style="padding: 12px; font-weight: bold;">${soil.id_suelo}</td>
                <td style="padding: 12px;">${soil.nombre}</td>
                <td style="padding: 12px;">${soil.textura}</td>
                <td style="padding: 12px;">${soil.pH_típico}</td>
                <td style="padding: 12px;">${soil.retención_hídrica}</td>
                <td style="padding: 12px;">${soil.drenaje}</td>
                <td style="padding: 12px; color: #dc2626;">${soil.riesgos}</td>
            `;
            tableBody.appendChild(tr);
        });

        console.log('Soil Table Rendered with', soils.length, 'entries');

        // Render Matrix Table
        renderMatrixTable();
    }

    function renderMatrixTable() {
        const matrixBody = document.querySelector('#soilFeedTable tbody');
        if (!matrixBody) return;

        matrixBody.innerHTML = '';
        const soils = window.SoilDataManager.getSoilTypes(); // Get all soils

        soils.forEach(soil => {
            const recommendations = window.SoilDataManager.getFeedRecommendations(soil.id_suelo);

            recommendations.forEach(rec => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #e2e8f0';
                tr.innerHTML = `
                    <td style="padding: 12px; font-weight: bold;">${soil.nombre}</td>
                    <td style="padding: 12px;">${rec.tipo_alimento}</td>
                    <td style="padding: 12px;">${rec.nombre_alimento}</td>
                    <td style="padding: 12px;">${rec.condiciones_especiales}</td>
                `;
                matrixBody.appendChild(tr);
            });
        });
        console.log('Soil-Feed Matrix Rendered');
    }

    // Expose render function just in case
    window.renderSoilTable = renderSoilTable;
});
