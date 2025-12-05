
// SIGPAC INTEGRATION - Dynamic Dropdowns
const sigpacProvInput = qs('#sigpacProv');
const sigpacMuniInput = qs('#sigpacMuni');
const sigpacPoliInput = qs('#sigpacPoli');
const sigpacParcInput = qs('#sigpacParc');
const searchSigpacBtn = qs('#searchSigpacBtn');
const sigpacStatus = qs('#sigpacStatus');
const sigpacLoading = qs('#sigpacLoading');
const locationBadge = qs('#locationBadge');
const sizeBadge = qs('#sizeBadge');

// SIGPAC API Endpoints
const SIGPAC_QUERY_BASE = 'https://sigpac-hubcloud.es/servicioconsultassigpac/query';
const SIGPAC_CODES_BASE = 'https://sigpac-hubcloud.es/codigossigpac';

async function fetchMunicipalities(provCode) {
    if (!provCode) return [];
    const url = SIGPAC_CODES_BASE + '/municipio' + provCode + '.json';
    const response = await fetch(url);
    if (!response.ok) throw new Error('Error al cargar municipios');
    const data = await response.json();
    // data.codigos is the array of municipalities
    return data.codigos || [];
}

async function searchSIGPAC(provincia, municipio, poligono, parcela) {
    const pr = provincia || '00';
    const mu = municipio || '000';
    const ag = '0'; // agregado
    const zo = '0'; // zona
    const po = poligono || '0';
    const pa = parcela || '0';
    const re = '0'; // recinto - we'll query for recinto 0 initially or handle first valid

    // We actually need to query the parcel or enclosure. 
    // Let's try querying "recinfo" which gives enclosure info. 
    // Note: recinto '0' is usually not valid, we might need to iterate or find a way to list enclosures.
    // Actually, standard usage usually requires a recinto number. 
    // But let's try querying for recinto 1 if 0 fails, or use a different endpoint if needed.
    // The user only gives pol/parc. Usually parcel has recintos 1, 2, 3...
    // Let's try recinto 1 by default if regular query fails, or handle the list.

    // Improvement: query Recinto 1 by default as it's most common for simple parcels.
    const url = SIGPAC_QUERY_BASE + '/recinfo/' + pr + '/' + mu + '/' + ag + '/' + zo + '/' + po + '/' + pa + '/1.json';

    const response = await fetch(url);
    if (!response.ok) {
        // fallback to recinto 0?
        throw new Error('No se encontró la parcela (o recinto 1)');
    }
    return await response.json();
}

function parseSIGPACData(data) {
    if (!data || !data.properties) return null;
    const props = data.properties;
    return {
        location: (props.dn_muni || props.municipio || '') + ', ' + (props.dn_prov || props.provincia || ''),
        superficie: props.superficie || 0,
        uso: props.uso_sigpac || props.uso || '',
        provincia: props.dn_prov || props.provincia || '',
        municipio: props.dn_muni || props.municipio || '',
        poligono: props.poligono || '',
        parcela: props.parcela || ''
    };
}

function fillFarmFormFromSIGPAC(parsed) {
    if (!parsed) return;
    if (parsed.location && farmLocationInput) {
        farmLocationInput.value = parsed.location;
        if (locationBadge) locationBadge.classList.remove('hidden');
    }
    if (parsed.superficie && farmSizeInput) {
        farmSizeInput.value = parsed.superficie.toFixed(2);
        if (sizeBadge) sizeBadge.classList.remove('hidden');
    }
    showSigpacStatus('success', 'Datos cargados: ' + parsed.superficie.toFixed(2) + ' ha en ' + parsed.location);
}

function showSigpacStatus(type, message) {
    if (!sigpacStatus) return;
    sigpacStatus.className = 'sigpac-status ' + type;
    sigpacStatus.classList.remove('hidden');
    sigpacStatus.textContent = message;
    setTimeout(function () { if (sigpacStatus) sigpacStatus.classList.add('hidden'); }, 10000);
}

function setSigpacLoading(loading, message) {
    if (!sigpacLoading) return;
    if (loading) {
        sigpacLoading.classList.remove('hidden');
        if (message) {
            const span = sigpacLoading.querySelector('span');
            if (span) span.textContent = message;
        }
    } else {
        sigpacLoading.classList.add('hidden');
    }
    if (searchSigpacBtn) searchSigpacBtn.disabled = loading;
}

// Event Listeners

// Province Change -> Load Municipalities
if (sigpacProvInput) {
    sigpacProvInput.addEventListener('change', async function () {
        const provCode = this.value;
        const muniSelect = sigpacMuniInput;

        if (!muniSelect) return;

        // Reset municipality dropdown
        muniSelect.innerHTML = '<option value="">Municipios...</option>';
        muniSelect.disabled = true;

        if (!provCode) return;

        try {
            setSigpacLoading(true, 'Cargando municipios...');
            const municipios = await fetchMunicipalities(provCode);

            // Populate dropdown
            // municipios is array of { codigo: "001", descripcion: "Nombre" }
            municipios.sort((a, b) => a.descripcion.localeCompare(b.descripcion));

            municipios.forEach(m => {
                const option = document.createElement('option');
                option.value = m.codigo;
                option.textContent = m.descripcion; // Only name as requested
                muniSelect.appendChild(option);
            });

            muniSelect.disabled = false;
        } catch (error) {
            console.error(error);
            showSigpacStatus('error', 'Error al cargar municipios');
        } finally {
            setSigpacLoading(false, 'Consultando SIGPAC...');
        }
    });
}

async function handleSigpacSearch() {
    const provincia = sigpacProvInput ? sigpacProvInput.value : '';
    const municipio = sigpacMuniInput ? sigpacMuniInput.value : '';
    const poligono = sigpacPoliInput ? sigpacPoliInput.value.trim() : '';
    const parcela = sigpacParcInput ? sigpacParcInput.value.trim() : '';

    if (!provincia || !municipio || !poligono || !parcela) {
        showSigpacStatus('error', 'Por favor selecciona todos los campos');
        return;
    }

    try {
        setSigpacLoading(true, 'Buscando parcela...');
        const data = await searchSIGPAC(provincia, municipio, poligono, parcela);
        const parsed = parseSIGPACData(data);
        if (!parsed) {
            showSigpacStatus('error', 'No se encontró la parcela');
            return;
        }
        fillFarmFormFromSIGPAC(parsed);
    } catch (error) {
        showSigpacStatus('error', 'Error: ' + error.message + ' (Verifica Polígono/Parcela)');
    } finally {
        setSigpacLoading(false);
    }
}

if (searchSigpacBtn) {
    searchSigpacBtn.addEventListener('click', handleSigpacSearch);
}
