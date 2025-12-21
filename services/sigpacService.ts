export interface SigpacParcel {
    location: string;
    superficie: number;
    uso: string;
    pendiente: number;
    regadio: number;
    lat: number;
    lon: number;
}

const SIGPAC_QUERY_BASE = 'https://sigpac-hubcloud.es/servicioconsultassigpac/query';
const SIGPAC_CODES_BASE = 'https://sigpac-hubcloud.es/codigossigpac';

export const SigpacService = {
    async getMunicipalities(provCode: string) {
        if (!provCode) return [];
        try {
            const response = await fetch(`${SIGPAC_CODES_BASE}/municipio${provCode}.json`);
            if (!response.ok) throw new Error('Error al cargar municipios');
            const data = await response.json();
            const municipios = data.codigos || [];
            municipios.sort((a: any, b: any) => a.descripcion.localeCompare(b.descripcion));
            return municipios;
        } catch (error) {
            console.error(error);
            return [];
        }
    },

    async fetchParcelData(prov: string, muni: string, pol: string, parc: string): Promise<SigpacParcel | null> {
        const results: any[] = [];
        const fetches: Promise<any>[] = [];

        // Scan Recintos 1 to 5
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

        for (const data of responses) {
            const parsed = this.parseSIGPACData(data);
            if (parsed) results.push(parsed);
        }

        if (results.length === 0) return null;

        // Aggregate
        const totalSize = results.reduce((sum, r) => sum + r.superficie, 0);

        // Determine Dominant Recinto
        results.sort((a, b) => b.superficie - a.superficie);
        const mainRecinto = results[0];

        return {
            location: mainRecinto.location,
            superficie: parseFloat(totalSize.toFixed(4)),
            uso: mainRecinto.uso,
            pendiente: mainRecinto.pendiente,
            regadio: mainRecinto.regadio,
            lat: mainRecinto.lat,
            lon: mainRecinto.lon
        };
    },

    parseSIGPACData(data: any): SigpacParcel | null {
        if (!data) return null;
        let item = null;
        if (Array.isArray(data) && data.length > 0) item = data[0];
        else if (data.properties) item = data.properties;
        else item = data;

        if (!item) return null;

        let lat = 0, lon = 0;
        // Simplified WKT parsing for centroid if needed, 
        // or rely on what's available. The legacy code had a UTM converter.
        // For brevity, we'll try to extract if available or default to 0.
        // Ideally we should port the utmToLatLon function if precise coordinates are needed.
        // We will include the UTM conversion logic for completeness.

        if (item.wkt) {
            try {
                const match = /([\-\d\.]+)\s+([\-\d\.]+)/.exec(item.wkt);
                if (match) {
                    let rawX = parseFloat(match[1]);
                    let rawY = parseFloat(match[2]);
                    if (rawY > 10000) {
                        const converted = this.utmToLatLon(rawX, rawY);
                        lat = converted.lat;
                        lon = converted.lon;
                    } else {
                        lon = rawX;
                        lat = rawY;
                    }
                }
            } catch (e) { }
        }

        return {
            location: `${item.dn_muni || item.municipio || ''}, ${item.dn_prov || item.provincia || ''}`,
            superficie: parseFloat(item.superficie || 0),
            uso: item.uso_sigpac || item.uso || '',
            pendiente: parseFloat(item.pendiente_media || 0),
            regadio: parseFloat(item.coef_regadio || 0),
            lat: lat,
            lon: lon
        };
    },

    utmToLatLon(easting: number, northing: number, zone = 30) {
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
};
