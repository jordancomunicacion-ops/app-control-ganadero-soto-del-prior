
// SIGPAC INTEGRATION - Updated to use Parcel Data
const sigpacProvInput = qs('#sigpacProv');
const sigpacMuniInput = qs('#sigpacMuni');
const sigpacPoliInput = qs('#sigpacPoli');
const sigpacParcInput = qs('#sigpacParc');
const searchSigpacBtn = qs('#searchSigpacBtn');
const sigpacStatus = qs('#sigpacStatus');
const sigpacLoading = qs('#sigpacLoading');
const locationBadge = qs('#locationBadge');
const sizeBadge = qs('#sizeBadge');

const SIGPAC_API_BASE = 'https://sigpac-hubcloud.es/ogc-api/collections/recintos/items';

async function searchSIGPAC(provincia, municipio, poligono, parcela) {
    let url = SIGPAC_API_BASE + '?limit=10';

    if (provincia) url += '&provincia=' + encodeURIComponent(provincia.trim());
    if (municipio) url += '&municipio=' + encodeURIComponent(municipio.trim());
    if (poligono) url += '&poligono=' + encodeURIComponent(poligono.trim());
    if (parcela) url += '&parcela=' + encodeURIComponent(parcela.trim());

    const response = await fetch(url);
    if (!response.ok) throw new Error('Error HTTP: ' + response.status);
    return await response.json();
}

function parseSIGPACData(data) {
    if (!data || !data.features || !data.features.length) return null;
    const feature = data.features[0];
    const props = feature.properties;
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
    showSigpacStatus('success', 'Datos cargados: ' + parsed.superficie.toFixed(2) + ' ha en ' + parsed.location + ' (Pol: ' + parsed.poligono + ', Parc: ' + parsed.parcela + ')');
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
    const provincia = sigpacProvInput ? sigpacProvInput.value.trim() : '';
    const municipio = sigpacMuniInput ? sigpacMuniInput.value.trim() : '';
    const poligono = sigpacPoliInput ? sigpacPoliInput.value.trim() : '';
    const parcela = sigpacParcInput ? sigpacParcInput.value.trim() : '';

    if (!provincia && !municipio && !poligono && !parcela) {
        showSigpacStatus('error', 'Introduce al menos un dato de la parcela');
        return;
    }

    try {
        setSigpacLoading(true);
        const data = await searchSIGPAC(provincia, municipio, poligono, parcela);
        const parsed = parseSIGPACData(data);
        if (!parsed) {
            showSigpacStatus('error', 'No se encontro ninguna parcela con esos datos');
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

var sigpacInputs = [sigpacProvInput, sigpacMuniInput, sigpacPoliInput, sigpacParcInput];
for (var i = 0; i < sigpacInputs.length; i++) {
    if (sigpacInputs[i]) {
        sigpacInputs[i].addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSigpacSearch();
            }
        });
    }
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
