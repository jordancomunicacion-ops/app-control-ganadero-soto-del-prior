// ========================================
// APP-SIGPAC MODULE
// Purpose: Handle SIGPAC API connectivity and coordinate parsing
// ========================================

const AppSigpac = (function () {

    // --- DOM Elements ---
    const sigpacProv = document.querySelector('#sigpacProv');
    const sigpacMuni = document.querySelector('#sigpacMuni');
    const sigpacPoli = document.querySelector('#sigpacPoli');
    const sigpacParc = document.querySelector('#sigpacParc');
    const searchBtn = document.querySelector('#searchSigpacBtn');
    const statusDiv = document.querySelector('#sigpacStatus');
    const loadingDiv = document.querySelector('#sigpacLoading');

    const locationBadge = document.querySelector('#locationBadge');
    const sizeBadge = document.querySelector('#sizeBadge');


    // --- Inputs to auto-fill ---
    let formInputs = {};

    // --- API Constants ---
    const SIGPAC_QUERY_BASE = 'https://sigpac-hubcloud.es/servicioconsultassigpac/query';
    const SIGPAC_CODES_BASE = 'https://sigpac-hubcloud.es/codigossigpac';

    // --- Initialization ---
    function init() {
        // Query DOM elements here to ensure they exist (safe execution after DOMContentLoaded)
        formInputs = {
            name: document.querySelector('#farmName'),
            location: document.querySelector('#farmLocation'),
            size: document.querySelector('#farmSize'),
            soil: document.querySelector('#farmSoil'),
            slope: document.querySelector('#farmSlope'),
            irrigation: document.querySelector('#farmIrrigation'),
            use: document.querySelector('#farmSigpacUse'),
            lat: document.querySelector('#farmLat'),
            lon: document.querySelector('#farmLon')
        };

        if (sigpacProv) {
            sigpacProv.addEventListener('change', loadMunicipalities);
        }
        if (searchBtn) {
            searchBtn.addEventListener('click', performSearch);
        }
        console.log('AppSigpac initialized (Real API)');
    }

    // --- Logic ---

    async function loadMunicipalities() {
        const provCode = sigpacProv.value;
        if (!provCode) {
            sigpacMuni.innerHTML = '<option value="">Selecciona provincia primero</option>';
            sigpacMuni.disabled = true;
            return;
        }

        try {
            updateLoading(true, 'Cargando municipios...');

            // Fetch from API
            const response = await fetch(SIGPAC_CODES_BASE + '/municipio' + provCode + '.json');
            if (!response.ok) throw new Error('Error al cargar municipios');

            const data = await response.json();
            const municipios = data.codigos || [];

            // Sort by name
            municipios.sort((a, b) => a.descripcion.localeCompare(b.descripcion));

            // Populate
            sigpacMuni.innerHTML = '<option value="">Selecciona municipio</option>';
            municipios.forEach(m => {
                const option = document.createElement('option');
                option.value = m.codigo;
                option.textContent = m.descripcion;
                sigpacMuni.appendChild(option);
            });

            sigpacMuni.disabled = false;

        } catch (error) {
            console.error(error);
            showStatus('Error al cargar municipios. Intenta de nuevo.', 'error');
        } finally {
            updateLoading(false);
        }
    }

    async function performSearch() {
        const prov = sigpacProv.value;
        const muni = sigpacMuni.value;
        const poli = sigpacPoli.value.trim();
        const parc = sigpacParc.value.trim();

        if (!prov || !muni || !poli || !parc) {
            showStatus('Completa todos los campos SIGPAC (Provincia, Municipio, Polígono, Parcela)', 'error');
            return;
        }

        try {
            updateLoading(true, 'Consultando SIGPAC...');

            const data = await publicFetchParcelData(prov, muni, poli, parc);

            if (data) {
                fillForm(data);
            } else {
                showStatus(' Datos no legibles o no encontrados.', 'error');
            }

        } catch (error) {
            console.error(error);
            showStatus('No se encontró información. Verifica Polígono/Parcela.', 'error');
        } finally {
            updateLoading(false);
        }
    }

    function parseSIGPACData(data) {
        if (!data) return null;

        // Normalize response (Array vs GeoJSON vs Object)
        let item = null;
        if (Array.isArray(data) && data.length > 0) item = data[0];
        else if (data.properties) item = data.properties;
        else item = data; // Fallback

        if (!item) return null;

        // WKT Extraction for Centroid (Simplified)
        let lat = 0, lon = 0;
        if (item.wkt) {
            try {
                // Gets the first point of the polygon as a "good enough" location anchor
                const match = /([\-\d\.]+)\s+([\-\d\.]+)/.exec(item.wkt);
                if (match) {
                    let rawX = parseFloat(match[1]);
                    let rawY = parseFloat(match[2]);

                    // Check if UTM (Large numbers)
                    // Madrid is roughly X=440000, Y=4470000. 
                    if (rawY > 10000) {
                        try {
                            const converted = utmToLatLon(rawX, rawY);
                            lat = converted.lat;
                            lon = converted.lon;
                            console.log(`Converted UTM ${rawX},${rawY} to WGS84 ${lat},${lon}`);
                        } catch (convErr) {
                            console.error('UTM Conversion failed', convErr);
                        }
                    } else {
                        lon = rawX;
                        lat = rawY;
                    }
                }
            } catch (e) { console.error('Error parsing WKT', e); }
        }

        let locationStr = `${item.dn_muni || item.municipio || ''}, ${item.dn_prov || item.provincia || ''}`;

        // Fallback: If API returns codes (or empty), try to grab names from the Search UI dropdowns
        // This fixes the "109, 31" display issue during manual search
        if (!locationStr || /^\d+/.test(item.dn_muni || item.municipio)) {
            const pSel = document.querySelector('#sigpacProv');
            const mSel = document.querySelector('#sigpacMuni');
            if (pSel && mSel && pSel.value && mSel.value) {
                // Only override if the dropdowns match the returned item codes (loose check)
                // Actually, for manual search, the dropdowns ARE the source of truth for the query.
                const pName = pSel.options[pSel.selectedIndex]?.text;
                const mName = mSel.options[mSel.selectedIndex]?.text;
                if (pName && mName) {
                    locationStr = `${mName}, ${pName}`;
                }
            }
        }

        return {
            location: locationStr,
            superficie: parseFloat(item.superficie || 0),
            uso: item.uso_sigpac || item.uso || '',
            pendiente: parseFloat(item.pendiente_media || 0),
            regadio: parseFloat(item.coef_regadio || 0),
            lat: lat,
            lon: lon
        };
    }

    // Reference: Simplified UTM to LatLon for Zone 30N (Spain common)
    function utmToLatLon(easting, northing, zone = 30) {
        const k0 = 0.9996;
        const a = 6378137;
        const e1sq = 0.00669438;
        const pi = Math.PI;

        const x = easting - 500000;
        const y = northing;

        const m = y / k0;
        const mu = m / (a * (1 - e1sq / 4 - 3 * e1sq * e1sq / 64 - 5 * Math.pow(e1sq, 3) / 256));

        const e1 = (1 - Math.sqrt(1 - e1sq)) / (1 + Math.sqrt(1 - e1sq));
        const J1 = (3 * e1 / 2 - 27 * Math.pow(e1, 3) / 32);
        const J2 = (21 * e1 * e1 / 16 - 55 * Math.pow(e1, 4) / 32);
        const J3 = (151 * Math.pow(e1, 3) / 96);

        const phi1 = mu + J1 * Math.sin(2 * mu) + J2 * Math.sin(4 * mu) + J3 * Math.sin(6 * mu);

        const C1 = e1sq * Math.pow(Math.cos(phi1), 2) / (1 - e1sq);
        const T1 = Math.pow(Math.tan(phi1), 2);
        const N1 = a / Math.sqrt(1 - e1sq * Math.pow(Math.sin(phi1), 2));
        const R1 = a * (1 - e1sq) / Math.pow(1 - e1sq * Math.pow(Math.sin(phi1), 2), 1.5);
        const D = x / (N1 * k0);

        let lat = phi1 - (N1 * Math.tan(phi1) / R1) * (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * e1sq) * Math.pow(D, 4) / 24 + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * e1sq - 3 * C1 * C1) * Math.pow(D, 6) / 720);
        let lon = (D - (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * e1sq + 24 * T1 * T1) * Math.pow(D, 5) / 120) / Math.cos(phi1);

        lat = (lat * 180) / pi;
        lon = (lon * 180) / pi + (zone * 6 - 183);

        return { lat: parseFloat(lat.toFixed(6)), lon: parseFloat(lon.toFixed(6)) };
    }

    function fillForm(data) {
        // Auto-fill inputs
        if (formInputs.location) {
            formInputs.location.value = data.location;
            if (formInputs.location.value) triggerChange(formInputs.location);
        }

        if (formInputs.size) formInputs.size.value = data.superficie;
        if (formInputs.slope) formInputs.slope.value = data.pendiente;
        if (formInputs.irrigation) formInputs.irrigation.value = data.regadio;
        if (formInputs.use) formInputs.use.value = data.uso;

        // Hidden Coordinates
        if (formInputs.lat) formInputs.lat.value = data.lat;
        if (formInputs.lon) formInputs.lon.value = data.lon;

        showStatus(`¡Éxito! Datos cargados: ${data.superficie} ha en ${data.location}`, 'success');
    }

    // --- UI Helpers ---

    function triggerChange(element) {
        if ("createEvent" in document) {
            var evt = document.createEvent("HTMLEvents");
            evt.initEvent("change", false, true);
            element.dispatchEvent(evt);
        } else {
            element.fireEvent("onchange");
        }
    }

    function updateLoading(isLoading, text) {
        if (!loadingDiv) return;
        if (isLoading) {
            loadingDiv.classList.remove('hidden');
            const span = loadingDiv.querySelector('span');
            if (span && text) span.textContent = text;
            if (searchBtn) searchBtn.disabled = true;
        } else {
            loadingDiv.classList.add('hidden');
            if (searchBtn) searchBtn.disabled = false;
        }
    }

    function showStatus(msg, type) {
        if (!statusDiv) return;
        statusDiv.textContent = msg;
        statusDiv.classList.remove('hidden');

        // Styles
        statusDiv.className = ''; // Reset classes
        statusDiv.style.marginTop = '12px';
        statusDiv.style.padding = '10px';
        statusDiv.style.borderRadius = '8px';
        statusDiv.style.fontSize = '14px';

        if (type === 'error') {
            statusDiv.style.backgroundColor = '#fee2e2';
            statusDiv.style.color = '#991b1b';
        } else if (type === 'success') {
            statusDiv.style.backgroundColor = '#dcfce7';
            statusDiv.style.color = '#166534';
        }

        // Auto hide after 5s
        setTimeout(() => {
            statusDiv.classList.add('hidden');
        }, 8000);
    }

    // --- Public Logic ---

    async function publicFetchParcelData(prov, muni, pol, parc) {
        // Fetch Recintos 1 to 5 to find the main use and total area
        const results = [];
        const fetches = [];

        console.log(`Scanning Recintos 1-5 for ${prov}-${muni}-${pol}-${parc}...`);

        for (let i = 1; i <= 5; i++) {
            const url = `${SIGPAC_QUERY_BASE}/recinfo/${prov}/${muni}/0/0/${pol}/${parc}/${i}.json`;
            fetches.push(
                fetch(url)
                    .then(res => {
                        if (res.ok) return res.json();
                        return null;
                    })
                    .catch(() => null)
            );
        }

        const responses = await Promise.all(fetches);

        // Parse valid responses
        for (const data of responses) {
            const parsed = parseSIGPACData(data);
            if (parsed) results.push(parsed);
        }

        if (results.length === 0) {
            console.warn('No recintos found.');
            return null;
        }

        // Aggregate Data
        // 1. Calculate Total Surface
        const totalSize = results.reduce((sum, r) => sum + r.superficie, 0);

        // 2. Determine Dominant Recinto (Largest Area)
        results.sort((a, b) => b.superficie - a.superficie);
        const mainRecinto = results[0];

        // Return composite object
        return {
            location: mainRecinto.location,
            superficie: parseFloat(totalSize.toFixed(4)),
            uso: mainRecinto.uso,
            pendiente: mainRecinto.pendiente,
            regadio: mainRecinto.regadio,
            lat: mainRecinto.lat,
            lon: mainRecinto.lon
        };
    }

    // Public API
    return {
        init: init,
        fetchParcelData: publicFetchParcelData
    };

    // Internal helper for UI Search
    async function performSearch() {
        // ... (access DOM inputs)
        const prov = sigpacProv.value;
        const muni = sigpacMuni.value;
        const poli = sigpacPoli.value.trim();
        const parc = sigpacParc.value.trim();

        if (!prov || !muni || !poli || !parc) {
            showStatus('Completa todos los campos', 'error');
            return;
        }

        updateLoading(true, 'Consultando SIGPAC...');

        const data = await publicFetchParcelData(prov, muni, poli, parc);

        updateLoading(false);

        if (data) {
            fillForm(data);
        } else {
            showStatus('No se encontró información. Verifica los datos.', 'error');
        }
    }

})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    AppSigpac.init();
});
