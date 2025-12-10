// Feed Data Management Module
const FeedDataManager = {
    // Default Data: Table 2 (User Provided - Updated 2025)
    defaultCSV: `ID;Tipo;Nombre;Porcentaje_MS;Porcentaje_PB;Porcentaje_FDN;Porcentaje_ADF;Energia_Neta_Mcal_kg;Riesgo;Uso_Recomendado;Notas;Coste_Eur_kg
F01;Forraje;Pasto natural;22;13;45;25;1.28;Bajo;Mantenimiento y recr\u00EDa;Alta variabilidad estacional;0.12
F02;Forraje;Pasto mejorado (ryegrass);23;15;45;27;1.35;Bajo;Recr\u00EDa y crecimiento;Joven y digestible;0.12
F03;Forraje;Heno de pradera;88;10;60;35;1.1;Bajo;Mantenimiento;Rumiantes adultos;0.12
F04;Forraje;Heno de alfalfa;89;18;45;30;1.25;Bajo;Recr\u00EDa y lactaci\u00F3n;Alto calcio;0.12
F05;Forraje;Ensilado de ma\u00EDz;35;8;49;27;1.6;Medio;Engorde;Alto aporte energ\u00E9tico;0.12
C01;Concentrado;Ma\u00EDz grano;89;9;12;4;2.05;Alto;ADG y marmoleo;Requiere fibra efectiva;0.25
C02;Concentrado;Cebada;88;11;18;6;1.95;Medio;Engorde seguro;Menor riesgo acidosis;0.25
C03;Concentrado;Trigo;88;12;10;5;2.0;Alto;Engorde r\u00E1pido;Peligro de acidosis si mal manejado;0.25
C04;Concentrado;DDGS;90;28;32;17;2.05;Medio;Sustituto de cereal;Estable para rumen;0.25
C05;Concentrado;Pulpa de remolacha;90;10;40;25;1.7;Bajo;Mejora digestibilidad;Alta fibra soluble;0.25
C06;Concentrado;Cascarilla de soja;90;14;60;45;1.4;Bajo;Aumentar fibra efectiva;Muy segura;0.25
P01;Proteico;Harina de soja 47%;88;47;15;10;1.9;Medio;Construcci\u00F3n muscular;Prote\u00EDna by-pass;0.42
P02;Proteico;Colza;90;38;13;9;1.7;Bajo;Sustituir soja;Eficiente y econ\u00F3mica;0.42
P03;Proteico;Guisante proteico;88;24;20;10;1.6;Bajo;Recr\u00EDa joven;Producci\u00F3n KM0;0.42
P04;Proteico;Urea (NNP);100;281;0;0;2.6;Alto;Solo animales >8 meses;No usar en terneros;0.42
S01;Suplemento;N\u00FAcleo mineral;100;0;0;0;0.0;Nulo;Salud general;Ca-P-Mg-Zn-Cu-Se;0.8
S02;Suplemento;Premezcla de engorde;95;12;0;0;0.0;Medio;Mejorar FCR;Incluye ion\u00F3foros/buffers;0.8
S03;Suplemento;Vitaminas ADE;100;0;0;0;0.0;Nulo;Salud inmunitaria;Animales estabulados;0.8
S04;Suplemento;Corrector de acidosis;100;0;0;0;0.0;Bajo;Estabilidad ruminal;Bicarbonatos y levaduras;0.8`,

    init() {
        // Force reload to apply new defaults
        if (!sessionStorage.getItem('FEED_CACHE_CLEARED_V15')) {
            localStorage.removeItem('FEED_DATA_CACHE');
            sessionStorage.setItem('FEED_CACHE_CLEARED_V15', 'true');
        }

        this.load().then(data => {
            if (Object.keys(data).length === 0) {
                const parsed = this.parseCSV(this.defaultCSV);
                this._feeds = parsed;
                localStorage.setItem('FEED_DATA_CACHE', JSON.stringify(parsed));
            }
        });
    },

    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const feedData = {};

        if (lines.length < 2) return {}; // Need headers + data

        // Detect delimiter
        const firstLine = lines[0];
        const delimiter = firstLine.includes(';') ? ';' : ',';

        // Map Headers to Indices
        const headers = this.parseCSVLine(firstLine, delimiter).map(h => h.trim().toLowerCase());
        const col = {
            id: headers.findIndex(h => h === 'id'),
            tipo: headers.findIndex(h => h === 'tipo' || h === 'feed type'),
            nombre: headers.findIndex(h => h === 'nombre' || h === 'name'),
            ms: headers.findIndex(h => h.includes('ms') || h.includes('dm')),
            pb: headers.findIndex(h => h.includes('pb') || h.includes('cp')),
            fdn: headers.findIndex(h => h.includes('fdn') || h.includes('ndf')),
            adf: headers.findIndex(h => h.includes('adf')),
            en: headers.findIndex(h => h.includes('energ') || h.includes('net energy')),
            riesgo: headers.findIndex(h => h.includes('riesgo') || h.includes('risk')),
            uso: headers.findIndex(h => h.includes('uso') || h.includes('usage') || h.includes('recom')),
            notas: headers.findIndex(h => h.includes('notas') || h.includes('notes')),
            coste: headers.findIndex(h => h.includes('coste') || h.includes('precio') || h.includes('price'))
        };
        console.log('CSV Column Mapping:', col);

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i], delimiter);
            if (i === 1) console.log('First Row Values:', values);

            // Skip empty lines
            if (values.length < 2) continue;

            const name = col.nombre > -1 ? values[col.nombre]?.trim() : (values[2]?.trim() || 'Sin Nombre');
            if (!name) continue;

            feedData[name] = {
                id: col.id > -1 ? values[col.id]?.trim() : '',
                type: col.tipo > -1 ? values[col.tipo]?.trim() : 'Otro',
                name: name,
                dm_percent: this.parseNumber(values[col.ms]),
                cp_percent: this.parseNumber(values[col.pb]),
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

    determineFeedType(name) {
        const nameLower = name.toLowerCase();
        if (nameLower.includes('silage') || nameLower.includes('ensilado')) return 'Ensilado';
        if (nameLower.includes('hay') || nameLower.includes('heno')) return 'Forraje';
        if (nameLower.includes('grass') || nameLower.includes('pasto')) return 'Pasto';
        if (nameLower.includes('meal') || nameLower.includes('harina')) return 'Concentrado';
        return 'Otro';
    },

    parseCSVLine(line, delimiter = ',') {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    },

    parseNumber(value) {
        if (!value || value === '') return null;
        // Handle ranges like "20-25"
        if (value.includes('-') && !value.includes(',')) { // Simple check to avoid confusing negative numbers or ranges
            // If it looks like a range "20-25"
            const parts = value.split('-');
            if (parts.length === 2) {
                const v1 = parseFloat(parts[0]);
                const v2 = parseFloat(parts[1]);
                if (!isNaN(v1) && !isNaN(v2)) return (v1 + v2) / 2;
            }
        }
        // Handle Spanish format (comma decimal)
        const normalized = value.replace(',', '.');
        const num = parseFloat(normalized);
        return isNaN(num) ? null : num;
    },

    async loadFromCSV(filePath = 'feed_data.csv') {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                console.warn('Could not load feed_data.csv, using default data');
                return this.defaultData;
            }
            const csvText = await response.text();
            const feedData = this.parseCSV(csvText);
            console.log('Feed data loaded from CSV:', Object.keys(feedData).length, 'feeds');
            return feedData;
        } catch (error) {
            console.error('Error loading feed data:', error);
            return this.defaultData;
        }
    },

    async load() {
        const cached = localStorage.getItem('FEED_DATA_CACHE');
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (Object.keys(parsed).length > 0) return parsed;
            } catch (e) { console.error('Cache parse error', e); }
        }

        // Load Default
        console.log('Loading default feed data...');
        const parsed = this.parseCSV(this.defaultCSV);
        localStorage.setItem('FEED_DATA_CACHE', JSON.stringify(parsed));
        return parsed;
    },

    async reload() {
        localStorage.removeItem('FEED_DATA_CACHE');
        return this.load();
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FeedDataManager;
}
