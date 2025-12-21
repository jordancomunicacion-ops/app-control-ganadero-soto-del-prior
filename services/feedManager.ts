export interface FeedItem {
    id: string;
    type: string;
    name: string;
    dm_percent: number | null;
    cp_percent: number | null;
    p_percent: number | null;
    ndf_percent: number | null;
    adf_percent: number | null;
    energia_neta_Mcal_kg: number | null;
    risk_level: string;
    uso_recomendado: string;
    notes: string;
    cost_eur_kg: number | null;
}

const DEFAULT_CSV = `ID;Tipo;Nombre;Porcentaje_MS;Porcentaje_PB;Porcentaje_P;Porcentaje_FDN;Porcentaje_ADF;Energia_Neta_Mcal_kg;Riesgo;Uso_Recomendado;Notas;Coste_Eur_kg
F01;Forraje;Pasto natural;22;13;0.3;45;25;1.28;Bajo;Mantenimiento y recría;Alta variabilidad estacional;0.12
F02;Forraje;Pasto mejorado (ryegrass);23;15;0.35;45;27;1.35;Bajo;Recría y crecimiento;Joven y digestible;0.12
F03;Forraje;Heno de pradera;88;10;0.25;60;35;1.1;Bajo;Mantenimiento;Rumiantes adultos;0.12
F04;Forraje;Heno de alfalfa;89;18;0.3;45;30;1.25;Bajo;Recría y lactación;Alto calcio;0.12
F05;Forraje;Ensilado de maíz;35;8;0.25;49;27;1.6;Medio;Engorde;Alto aporte energético;0.12
C01;Concentrado;Maíz grano;89;9;0.3;12;4;2.05;Alto;ADG y marmoleo;Requiere fibra efectiva;0.25
C02;Concentrado;Cebada;88;11;0.35;18;6;1.95;Medio;Engorde seguro;Menor riesgo acidosis;0.25
C03;Concentrado;Trigo;88;12;0.4;10;5;2.0;Alto;Engorde rápido;Peligro de acidosis si mal manejado;0.25
C04;Concentrado;DDGS;90;28;0.8;32;17;2.05;Medio;Sustituto de cereal;Estable para rumen;0.25
C05;Concentrado;Pulpa de remolacha;90;10;0.1;40;25;1.7;Bajo;Mejora digestibilidad;Alta fibra soluble;0.25
C06;Concentrado;Cascarilla de soja;90;14;0.2;60;45;1.4;Bajo;Aumentar fibra efectiva;Muy segura;0.25
BELLHO_01;Concentrado;Bellota (encina / alcornoque);62;6;0.1;22;12;2.2;Medio-Alto;Acabado extensivo estacional;Alta en ácido oleico, baja proteína, suplementar PB, riesgo acidosis si exceso;0.10
P01;Proteico;Harina de soja 47%;88;47;0.65;15;10;1.9;Medio;Construcción muscular;Proteína by-pass;0.42
P02;Proteico;Colza;90;38;1.1;13;9;1.7;Bajo;Sustituir soja;Eficiente y económica;0.42
P03;Proteico;Guisante proteico;88;24;0.4;20;10;1.6;Bajo;Recría joven;Producción KM0;0.42
P04;Proteico;Urea (NNP);100;281;0.0;0;0;2.6;Alto;Solo animales >8 meses;No usar en terneros;0.42
S01;Suplemento;Núcleo mineral;100;0;10.0;0;0;0.0;Nulo;Salud general;Ca-P-Mg-Zn-Cu-Se;0.8
S02;Suplemento;Premezcla de engorde;95;12;4.0;0;0;0.0;Medio;Mejorar FCR;Incluye ionóforos/buffers;0.8
S03;Suplemento;Vitaminas ADE;100;0;0;0;0;0.0;Nulo;Salud inmunitaria;Animales estabulados;0.8
S04;Suplemento;Corrector de acidosis;100;0;0;0;0;0.0;Bajo;Estabilidad ruminal;Bicarbonatos y levaduras;0.8`;

export const FeedManager = {
    _feeds: {} as Record<string, FeedItem>,

    init() {
        if (typeof window !== 'undefined') {
            const cleared = sessionStorage.getItem('FEED_CACHE_CLEARED_V17_P');
            if (!cleared) {
                localStorage.removeItem('FEED_DATA_CACHE');
                sessionStorage.setItem('FEED_CACHE_CLEARED_V17_P', 'true');
            }
        }
    },

    async load(): Promise<Record<string, FeedItem>> {
        if (typeof window === 'undefined') return {};

        const cached = localStorage.getItem('FEED_DATA_CACHE');
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (Object.keys(parsed).length > 0) {
                    this._feeds = parsed;
                    return parsed;
                }
            } catch (e) {
                console.error('Feed Cache Error', e);
            }
        }

        const parsed = this.parseCSV(DEFAULT_CSV);
        this._feeds = parsed;
        localStorage.setItem('FEED_DATA_CACHE', JSON.stringify(parsed));
        return parsed;
    },

    getFeeds() {
        return this._feeds;
    },

    parseCSV(csvText: string): Record<string, FeedItem> {
        const lines = csvText.trim().split('\n');
        const feedData: Record<string, FeedItem> = {};

        if (lines.length < 2) return {};

        const firstLine = lines[0];
        const delimiter = firstLine.includes(';') ? ';' : ',';
        const headers = this.parseCSVLine(firstLine, delimiter).map(h => h.trim().toLowerCase());

        const col = {
            id: headers.findIndex(h => h === 'id'),
            tipo: headers.findIndex(h => h === 'tipo' || h === 'feed type'),
            nombre: headers.findIndex(h => h === 'nombre' || h === 'name'),
            ms: headers.findIndex(h => h.includes('ms') || h.includes('dm')),
            pb: headers.findIndex(h => h.includes('pb') || h.includes('cp')),
            p: headers.findIndex(h => h.includes('porcentaje_p') || h.includes('phosphorus') || h === 'p'),
            fdn: headers.findIndex(h => h.includes('fdn') || h.includes('ndf')),
            adf: headers.findIndex(h => h.includes('adf')),
            en: headers.findIndex(h => h.includes('energ') || h.includes('net energy')),
            riesgo: headers.findIndex(h => h.includes('riesgo') || h.includes('risk')),
            uso: headers.findIndex(h => h.includes('uso') || h.includes('usage')),
            notas: headers.findIndex(h => h.includes('notas') || h.includes('notes')),
            coste: headers.findIndex(h => h.includes('coste') || h.includes('precio'))
        };

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i], delimiter);
            if (values.length < 2) continue;

            const name = col.nombre > -1 ? values[col.nombre]?.trim() : (values[2]?.trim() || 'Sin Nombre');
            if (!name) continue;

            feedData[name] = {
                id: col.id > -1 ? values[col.id]?.trim() : '',
                type: col.tipo > -1 ? values[col.tipo]?.trim() : 'Otro',
                name: name,
                dm_percent: this.parseNumber(values[col.ms]),
                cp_percent: this.parseNumber(values[col.pb]),
                p_percent: (col.p > -1 && values[col.p]) ? this.parseNumber(values[col.p]) : 0.3,
                ndf_percent: this.parseNumber(values[col.fdn]),
                adf_percent: this.parseNumber(values[col.adf]),
                energia_neta_Mcal_kg: this.parseNumber(values[col.en]),
                risk_level: col.riesgo > -1 ? values[col.riesgo]?.trim() : 'Bajo',
                uso_recomendado: col.uso > -1 ? values[col.uso]?.trim() : '',
                notes: col.notas > -1 ? values[col.notas]?.trim() : '',
                cost_eur_kg: this.parseNumber(values[col.coste])
            };
        }
        return feedData;
    },

    parseCSVLine(line: string, delimiter: string) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') inQuotes = !inQuotes;
            else if (char === delimiter && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else current += char;
        }
        result.push(current.trim());
        return result;
    },

    parseNumber(value: any) {
        if (!value || value === '') return null;
        if (typeof value === 'string') {
            value = value.replace(',', '.');
            if (value.includes('-')) {
                const parts = value.split('-');
                const v1 = parseFloat(parts[0]);
                const v2 = parseFloat(parts[1]);
                if (!isNaN(v1) && !isNaN(v2)) return (v1 + v2) / 2;
            }
        }
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
    }
};
