
// SIGPAC INTEGRATION - Fixed API endpoints
const sigpacProvInput = qs('#sigpacProv');
const sigpacMuniInput = qs('#sigpacMuni');
const sigpacPoliInput = qs('#sigpacPoli');
const sigpacParcInput = qs('#sigpacParc');
const searchSigpacBtn = qs('#searchSigpacBtn');
const sigpacStatus = qs('#sigpacStatus');
const sigpacLoading = qs('#sigpacLoading');
const locationBadge = qs('#locationBadge');
const sizeBadge = qs('#sizeBadge');

// SIGPAC API - Using correct query service
const SIGPAC_QUERY_BASE = 'https://sigpac-hubcloud.es/servicioconsultassigpac/query';

async function searchSIGPAC(provincia, municipio, poligono, parcela) {
    // For SIGPAC query service, we need: pr/mu/ag/zo/po/pa/re
    // ag (agregado), zo (zona), re (recinto) default to 0 if not provided
    const pr = provincia || '00';
    const mu = municipio || '000';
    const ag = '0'; // agregado - usually 0
    const zo = '0'; // zona - usually 0
    const po = poligono || '0';
    const pa = parcela || '0';
    const re = '0'; // recinto - we'll get the first one

    const url = SIGPAC_QUERY_BASE + '/recinfo/' + pr + '/' + mu + '/' + ag + '/' + zo + '/' + po + '/' + pa + '/' + re + '.json';

    const response = await fetch(url);
    if (!response.ok) throw new Error('Error HTTP: ' + response.status);
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

    if (!provincia || !municipio || !poligono || !parcela) {
        showSigpacStatus('error', 'Introduce provincia, municipio, poligono y parcela');
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
        showSigpacStatus('error', 'Error: ' + error.message + '. Verifica que los datos sean correctos (provincia debe ser codigo de 2 digitos)');
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
