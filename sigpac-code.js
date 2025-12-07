
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
    if (!data) return null;

    let item = null;

    // Handle Array response (standard for some regions/endpoints)
    if (Array.isArray(data) && data.length > 0) {
        item = data[0];
    }
    // Handle GeoJSON-like response (if applicable)
    else if (data.properties) {
        item = data.properties;
    }

    if (!item) return null;

    const muniName = item.dn_muni || item.municipio || '';
    const provName = item.dn_prov || item.provincia || '';

    // Extract coordinates from WKT -> "POLYGON((lon lat, ...))"
    let lat = 0, lon = 0;
    if (item.wkt) {
        try {
            // Simple regex to get first point: space separated numbers
            const match = /([\-\d\.]+)\s+([\-\d\.]+)/.exec(item.wkt);
            if (match) {
                lon = parseFloat(match[1]);
                lat = parseFloat(match[2]);
            }
        } catch (e) { console.error('Error parsing WKT', e); }
    }

    return {
        location: `${muniName}, ${provName}`,
        superficie: item.superficie || 0,
        uso: item.uso_sigpac || item.uso || '',
        pendiente: item.pendiente_media || 0,
        regadio: item.coef_regadio || 0,
        provincia: item.provincia || '',
        municipio: item.municipio || '',
        poligono: item.poligono || '',
        parcela: item.parcela || '',
        lat: lat,
        lon: lon
    };
}

function fillFarmFormFromSIGPAC(parsed) {
    if (!parsed) return;

    // Globals assumed: farmLocationInput, farmSizeInput, locationBadge, sizeBadge
    // But they might not be defined in this file scope if they are from app.js or querySelectors at top
    // The top of file has qs('#locationBadge') etc.

    // Important: check if farmLocationInput is defined in this file. 
    // It is NOT defined at the top of this file in the current view (lines 1-12).
    // However, app.js might be relying on global scope or they should be defined here. 
    // Looking at previous valid code (Step 191 log shows lines 1-165), farmLocationInput is NOT defined at top.
    // It might have been defined in previous versions or I missed it.
    // app.js defines them. 
    // BUT, this file seems to treat them as globals or they are missing.
    // Let's use `qs` locally if they are not defined, or assume they are global if that's how the app works.
    // Checking lines 3-11: only sigpac inputs are defined.
    // I should probably safer query them here or use what was there before.
    // The broken code at line 55 used `farmSizeInput`.

    const farmLocationInput = qs('#farmLocation');
    const farmSizeInput = qs('#farmSize');

    if (parsed.location && farmLocationInput) {
        farmLocationInput.value = parsed.location;
        if (locationBadge) locationBadge.classList.remove('hidden');
    }
    if (parsed.superficie !== undefined && farmSizeInput) {
        farmSizeInput.value = parsed.superficie;
        if (sizeBadge) sizeBadge.classList.remove('hidden');
    }

    // Fill new fields
    const slopeInput = qs('#farmSlope');
    if (slopeInput && parsed.pendiente !== undefined) slopeInput.value = parsed.pendiente;

    const useInput = qs('#farmSigpacUse');
    if (useInput && parsed.uso) useInput.value = parsed.uso;

    const irrigationInput = qs('#farmIrrigation');
    if (irrigationInput && parsed.regadio !== undefined) irrigationInput.value = parsed.regadio;

    showSigpacStatus('success', 'Datos cargados: ' + parsed.superficie + ' ha en ' + parsed.location);
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
