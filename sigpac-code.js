
// SIGPAC INTEGRATION
const sigpacRefInput = qs('#sigpacRef');
const searchSigpacBtn = qs('#searchSigpacBtn');
const sigpacStatus = qs('#sigpacStatus');
const sigpacLoading = qs('#sigpacLoading');
const locationBadge = qs('#locationBadge');
const sizeBadge = qs('#sizeBadge');

const SIGPAC_API_BASE = 'https://sigpac-hubcloud.es/ogc-api/collections/recintos/items';

async function searchSIGPAC(refcat) {
    const cleanRef = refcat.trim().toUpperCase();
    const url = SIGPAC_API_BASE + '?refcat=' + cleanRef + '&limit=1';
    const response = await fetch(url);
    if (!response.ok) throw new Error('Error HTTP: ' + response.status);
    return await response.json();
}

function parseSIGPACData(data) {
    if (!data || !data.features || !data.features.length) return null;
    const props = data.features[0].properties;
    return {
        location: (props.dn_muni || props.municipio || '') + ', ' + (props.dn_prov || props.provincia || ''),
        superficie: props.superficie || 0,
        uso: props.uso_sigpac || props.uso || ''
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

function setSigpacLoading(loading) {
    if (!sigpacLoading) return;
    if (loading) {
        sigpacLoading.classList.remove('hidden');
    } else {
        sigpacLoading.classList.add('hidden');
    }
    if (searchSigpacBtn) searchSigpacBtn.disabled = loading;
}

async function handleSigpacSearch() {
    const refcat = sigpacRefInput ? sigpacRefInput.value.trim() : '';
    if (!refcat) {
        showSigpacStatus('error', 'Introduce una referencia catastral');
        return;
    }
    try {
        setSigpacLoading(true);
        const data = await searchSIGPAC(refcat);
        const parsed = parseSIGPACData(data);
        if (!parsed) {
            showSigpacStatus('error', 'No se encontro ninguna parcela');
            return;
        }
        fillFarmFormFromSIGPAC(parsed);
    } catch (error) {
        showSigpacStatus('error', 'Error: ' + error.message);
    } finally {
        setSigpacLoading(false);
    }
}

if (searchSigpacBtn) {
    searchSigpacBtn.addEventListener('click', handleSigpacSearch);
}
if (sigpacRefInput) {
    sigpacRefInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSigpacSearch();
        }
    });
}
if (farmLocationInput) {
    farmLocationInput.addEventListener('input', function () {
        if (locationBadge) locationBadge.classList.add('hidden');
    });
}
if (farmSizeInput) {
    farmSizeInput.addEventListener('input', function () {
        if (sizeBadge) sizeBadge.classList.add('hidden');
    });
}
