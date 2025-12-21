// Feed Data CSV Management
document.addEventListener('DOMContentLoaded', function () {

    // Render Feed Data Table
    window.renderFeedData = function () {
        const tbody = document.querySelector('#feedTable tbody');
        const feedCountSpan = document.querySelector('#feedCount');
        if (!tbody) return;

        tbody.innerHTML = '';
        const feedCount = Object.keys(FEED_DATA).length;
        if (feedCountSpan) feedCountSpan.textContent = feedCount;

        Object.entries(FEED_DATA).forEach(([name, feed]) => {
            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid #e2e8f0';
            row.innerHTML = `
        <td style="padding: 12px;">${feed.id || '-'}</td>
        <td style="padding: 12px;">${feed.type || '-'}</td>
        <td style="padding: 12px;">${name}</td>
        <td style="padding: 12px;">${feed.dm_percent || '-'}</td>
        <td style="padding: 12px;">${feed.cp_percent || '-'}</td>
        <td style="padding: 12px;">${feed.ndf_percent || '-'}</td>
        <td style="padding: 12px;">${feed.adf_percent || '-'}</td>
        <td style="padding: 12px;">${feed.energia_neta_Mcal_kg || '-'}</td>
        <td style="padding: 12px;">${feed.risk_level || '-'}</td>
        <td style="padding: 12px; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${feed.uso_recomendado || '-'}</td>
        <td style="padding: 12px; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${feed.notes || '-'}</td>
        <td style="padding: 12px;">${feed.cost_eur_kg || '-'} €</td>
      `;
            tbody.appendChild(row);
        });
    };

    // Feed CSV Upload
    const feedCSVInput = document.querySelector('#feedCSVInput');
    const uploadFeedCSVBtn = document.querySelector('#uploadFeedCSV');
    const feedUploadStatus = document.querySelector('#feedUploadStatus');

    function showFeedStatus(type, message) {
        if (!feedUploadStatus) return;
        feedUploadStatus.classList.remove('hidden');
        if (type === 'success') {
            feedUploadStatus.style.background = '#f0fdf4';
            feedUploadStatus.style.color = '#166534';
            feedUploadStatus.style.border = '1px solid #bbf7d0';
        } else if (type === 'error') {
            feedUploadStatus.style.background = '#fef2f2';
            feedUploadStatus.style.color = '#991b1b';
            feedUploadStatus.style.border = '1px solid #fecaca';
        }
        feedUploadStatus.textContent = message;
        setTimeout(() => feedUploadStatus.classList.add('hidden'), 5000);
    }

    if (uploadFeedCSVBtn) {
        uploadFeedCSVBtn.addEventListener('click', () => {
            const file = feedCSVInput?.files[0];
            if (!file) {
                showFeedStatus('error', 'Por favor selecciona un archivo CSV');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const csvText = e.target.result;
                    const newFeedData = FeedDataManager.parseCSV(csvText);

                    if (Object.keys(newFeedData).length === 0) {
                        showFeedStatus('error', 'No se encontraron alimentos válidos en el CSV');
                        return;
                    }

                    FEED_DATA = newFeedData;
                    localStorage.setItem('FEED_DATA_CACHE', JSON.stringify(FEED_DATA));
                    localStorage.setItem('FEED_DATA_CACHE_TIME', Date.now().toString());

                    renderFeedData();
                    showFeedStatus('success', `${Object.keys(newFeedData).length} alimentos cargados correctamente`);

                    if (feedCSVInput) feedCSVInput.value = '';
                } catch (error) {
                    console.error('Error parsing CSV:', error);
                    showFeedStatus('error', 'Error al procesar el CSV: ' + error.message);
                }
            };

            reader.onerror = () => showFeedStatus('error', 'Error al leer el archivo');
            reader.readAsText(file);
        });
    }

    // Feed CSV Download
    const downloadFeedTemplateBtn = document.querySelector('#downloadFeedTemplate');
    if (downloadFeedTemplateBtn) {
        downloadFeedTemplateBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Feed CSV Download clicked');

            try {
                const headers = 'ID;Tipo;Nombre;Porcentaje_MS;Porcentaje_PB;Porcentaje_FDN;Porcentaje_ADF;Energia_Neta_Mcal_kg;Riesgo;Uso_Recomendado;Notas;Coste_Eur_kg\n';

                const rows = Object.entries(FEED_DATA).map(([name, feed]) => {
                    return [
                        feed.id || '',
                        feed.type || 'Otro',
                        `"${name}"`,
                        feed.dm_percent || '',
                        feed.cp_percent || '',
                        feed.ndf_percent || '',
                        feed.adf_percent || '',
                        feed.energia_neta_Mcal_kg || '',
                        feed.risk_level || 'Bajo',
                        `"${(feed.uso_recomendado || '').replace(/"/g, '""')}"`,
                        `"${(feed.notes || '').replace(/"/g, '""')}"`,
                        feed.cost_eur_kg || ''
                    ].join(';');
                }).join('\n');

                const csv = '\uFEFF' + headers + rows;
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'feed_data.csv';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                console.log('Feed CSV download successful');
                showFeedStatus('success', 'Plantilla descargada correctamente');
            } catch (err) {
                console.error('Download failed:', err);
                showFeedStatus('error', 'Error al descargar: ' + err.message);
            }
        });
    }
});
