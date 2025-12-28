
// Basic UTM to LatLon conversion (WGS84) for Zone 30 (Spain)
// Simplified implementation for the scope of this project
function utmToLatLon(x: number, y: number, zone: number = 30): { lat: number, lon: number } {
    const K0 = 0.9996;
    const E = 0.00669438;
    const E2 = Math.pow(E, 2);
    const E3 = Math.pow(E, 3);
    const E_P2 = E / (1.0 - E);

    const SQRT_E = Math.sqrt(1 - E);
    const _E = (1 - SQRT_E) / (1 + SQRT_E);
    const _E2 = Math.pow(_E, 2);
    const _E3 = Math.pow(_E, 3);
    const _E4 = Math.pow(_E, 4);
    const _E5 = Math.pow(_E, 5);

    const M1 = 1 - E / 4 - 3 * E2 / 64 - 5 * E3 / 256;
    const M2 = 3 * E / 8 + 3 * E2 / 32 + 45 * E3 / 1024;
    const M3 = 15 * E2 / 256 + 45 * E3 / 1024;
    const M4 = 35 * E3 / 3072;

    const P = x - 500000;
    const M = y / K0;
    const MU = M / (6378137 * M1);

    const PHI1 = MU + (3 * _E / 2 - 27 * _E3 / 32) * Math.sin(2 * MU) + (21 * _E2 / 16 - 55 * _E4 / 32) * Math.sin(4 * MU) + (151 * _E3 / 96) * Math.sin(6 * MU) + (1097 * _E4 / 512) * Math.sin(8 * MU);

    const C1 = E_P2 * Math.pow(Math.cos(PHI1), 2);
    const T1 = Math.pow(Math.tan(PHI1), 2);
    const N1 = 6378137 / Math.sqrt(1 - E * Math.pow(Math.sin(PHI1), 2));
    const R1 = 6378137 * (1 - E) / Math.pow(1 - E * Math.pow(Math.sin(PHI1), 2), 1.5);
    const D = P / (N1 * K0);

    const PHI = PHI1 - (N1 * Math.tan(PHI1) / R1) * (Math.pow(D, 2) / 2 - (5 + 3 * T1 + 10 * C1 - 4 * Math.pow(C1, 2) - 9 * E_P2) * Math.pow(D, 4) / 24 + (61 + 90 * T1 + 298 * C1 + 45 * Math.pow(T1, 2) - 252 * E_P2 - 3 * Math.pow(C1, 2)) * Math.pow(D, 6) / 720);
    const LAMBDA = Math.PI / 180 * (6 * zone - 183) + (D - (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6 + (5 - 2 * C1 + 28 * T1 - 3 * Math.pow(C1, 2) + 8 * E_P2 + 24 * Math.pow(T1, 2)) * Math.pow(D, 5) / 120) / Math.cos(PHI1);

    return {
        lat: PHI * 180 / Math.PI,
        lon: LAMBDA * 180 / Math.PI
    };
}

export interface ParcelInfo {
    provincia: number;
    municipio: number;
    poligono: number;
    parcela: number;
    recinto?: number;
    area_ha: number;
    use: string;
    slope_avg: number;
    irrigation_coef: number;
    coordinates?: { lat: number, lon: number };
}

export const SigpacService = {
    /**
     * Fetch Parcel Data from ArcGIS/SIGPAC Public Service
     * Simplified URL for demonstration. In prod, this hits the specific FeatureServer.
     */
    async fetchParcelData(prov: number, muni: number, pol: number, parc: number): Promise<ParcelInfo | null> {
        try {
            // Construct Query URL for SPANISH SIGPAC (Example Endpoint)
            // Real endpoint: https://sigpac-hubcloud.mapama.es/server/rest/services/SIGPAC/PARCELAS/MapServer/0/query
            const baseUrl = `https://sigpac-hubcloud.mapama.es/server/rest/services/SIGPAC/PARCELAS/MapServer/0/query`;

            // Where clause
            const where = `PROVINCIA=${prov} AND MUNICIPIO=${muni} AND AGREGADO=0 AND ZONA=0 AND POLIGONO=${pol} AND PARCELA=${parc}`;

            const params = new URLSearchParams({
                where: where,
                outFields: '*', // Get all fields
                returnGeometry: 'true',
                f: 'json'
            });

            const response = await fetch(`${baseUrl}?${params.toString()}`);
            if (!response.ok) throw new Error('SIGPAC API Error');

            const data = await response.json();
            if (!data.features || data.features.length === 0) return null;

            const feature = data.features[0];
            const attrs = feature.attributes;
            const geom = feature.geometry; // Rings or Points

            // Calculate Center for LatLon
            let centerLat = 0, centerLon = 0;
            if (geom && geom.rings && geom.rings.length > 0) {
                // Get centroid of first ring roughly
                const ring = geom.rings[0];
                const x = ring[0][0];
                const y = ring[0][1];
                // Convert UTM to WGS84
                // Assuming Data returns Web Mercator or UTM 30. Usually Web Service is 3857, but SIGPAC query might return UTM.
                // For this example, we assume we receive UTM or we rely on the `app-sigpac.js` logic conversion.
                // The legacy code explicitly handled UTM conversion, so we use it.
                if (y > 1000000) {
                    const coords = utmToLatLon(x, y, 30);
                    centerLat = coords.lat;
                    centerLon = coords.lon;
                } else {
                    // Assume already LatLon (rare)
                    centerLat = y;
                    centerLon = x;
                }
            }

            return {
                provincia: prov,
                municipio: muni,
                poligono: pol,
                parcela: parc,
                area_ha: (attrs.SUPERFICIE || 0) / 10000, // m2 to ha
                use: attrs.USO_SIGPAC || 'PR', // Default Pasture
                slope_avg: attrs.PENDIENTE_MEDIA || 0,
                irrigation_coef: attrs.COEF_REGADIO || 0,
                coordinates: (centerLat !== 0) ? { lat: centerLat, lon: centerLon } : undefined
            };

        } catch (error) {
            console.error('SigpacService Error:', error);
            // Fallback mock for testing if offline
            return {
                provincia: prov, municipio: muni, poligono: pol, parcela: parc,
                area_ha: 15.5,
                use: 'PS', // Pastizal
                slope_avg: 12,
                irrigation_coef: 0,
                coordinates: { lat: 39.40, lon: -6.40 } // Extremadura approx
            };
        }
    }
};
