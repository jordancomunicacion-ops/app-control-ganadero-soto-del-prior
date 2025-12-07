// Fix for CSV download - override the existing handler
document.addEventListener('DOMContentLoaded', function () {
    const downloadBtn = document.querySelector('#downloadBreedTemplate');
    if (downloadBtn) {
        // Remove old listeners by cloning
        const newBtn = downloadBtn.cloneNode(true);
        downloadBtn.parentNode.replaceChild(newBtn, downloadBtn);

        // Add new working listener
        newBtn.addEventListener('click', function (e) {
            e.preventDefault();
            console.log('CSV Download clicked');

            try {
                const headers = 'raza_id,raza,subespecie,peso_macho_adulto_kg,peso_hembra_adulta_kg,edad_sacrificio_meses,ADG_feedlot_kg_dia,ADG_pastoreo_kg_dia,FCR,termotolerancia,potencial_marmoleo,facilidad_parto\n';

                const rows = Object.entries(BREED_DATA).map(([name, breed]) => {
                    return [
                        breed.id || '',
                        `"${name}"`,
                        breed.subspecies || '',
                        breed.weight_male_adult || '',
                        breed.weight_female_adult || '',
                        breed.slaughter_age_months || '',
                        breed.adg_feedlot || '',
                        breed.adg_grazing || '',
                        breed.fcr_feedlot || '',
                        breed.heat_tolerance || '',
                        breed.marbling || '',
                        breed.calving_ease || ''
                    ].join(',');
                }).join('\n');

                const csv = '\uFEFF' + headers + rows;
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'breed_data.csv';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                console.log('Download successful');
                const status = document.querySelector('#csvUploadStatus');
                if (status) {
                    status.classList.remove('hidden');
                    status.style.background = '#f0fdf4';
                    status.style.color = '#166534';
                    status.textContent = 'Plantilla descargada correctamente';
                    setTimeout(() => status.classList.add('hidden'), 3000);
                }
            } catch (err) {
                console.error('Download failed:', err);
                alert('Error al descargar: ' + err.message);
            }
        });
    }
});
