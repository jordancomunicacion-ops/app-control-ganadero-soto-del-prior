// Feed Data Management Module
const FeedDataManager = {
    // Default Data: Table 2 (User Provided)
    defaultCSV: `tipo,nombre,%MS,%PB,%FDN,%ADF,Energia_neta_Mcal_kg,uso_recomendado
forraje,Ensilado de maíz,30,8,45,26,1.6,Dieta de engorde: alto aporte de energia digestible
forraje,Heno de alfalfa,90,18,40,35,1.2,Forraje de alta calidad para crecimiento o lactacion
forraje,Pasto ryegrass (fresco),20,15,45,25,1.5,Pastoreo en clima templado; mantenimientos y recria
forraje,Paja de trigo,90,3,80,50,0.8,Fibra de baja calidad; relleno en dietas de mantenimiento
suplemento,Grano de maiz,87,9,10,3,2.2,Concentrado energetico para engorde en feedlot
suplemento,Harina de soja 47,88,47,12,8,1.9,Suplemento proteico de alta calidad (crecimiento/engorda)
suplemento,Melaza de caña,75,5,0,0,2.0,Energia rapida; palatable para aumentar consumo
mineral,Sal comun (NaCl),100,0,0,0,0.0,Fuente de sodio; libre acceso en saleros
mineral,Carbonato de calcio,100,0,0,0,0.0,Aporta calcio; se mezcla en raciones pobres en Ca
mineral,Premezcla mineral bovina,100,0,0,0,0.0,Oligoelementos balanceados; uso diario segun requerimiento`,

    init() {
        // Initialize from storage or default CSV
        this.load().then(data => {
            if (Object.keys(data).length === 0) {
                const parsed = this.parseCSV(this.defaultCSV);
                this._feeds = parsed; // pseudo-cache or just save
                localStorage.setItem('FEED_DATA_CACHE', JSON.stringify(parsed));
            }
        });
    },

    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const feedData = {};

        if (lines.length === 0) return {};

        // Detect delimiter
        const firstLine = lines[0];
        const delimiter = firstLine.includes(';') ? ';' : ',';

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i], delimiter);
            if (values.length < 2) continue;

            // New CSV Structure: tipo,nombre,%MS,%PB,%FDN,%ADF,Energia_neta_Mcal_kg,uso_recomendado
            // values[0] = Type
            // values[1] = Name
            const type = values[0] ? values[0].trim() : 'Otro';
            const name = values[1] ? values[1].trim() : 'Sin Nombre';

            feedData[name] = {
                type: type,
                name: name,
                dm_percent: this.parseNumber(values[2]),
                cp_percent: this.parseNumber(values[3]),
                ndf_percent: this.parseNumber(values[4]),
                adf_percent: this.parseNumber(values[5]),
                energia_neta_Mcal_kg: this.parseNumber(values[6]),
                uso_recomendado: values[7] ? values[7].trim() : ''
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
        if (value.includes('-')) {
            const parts = value.split('-');
            const avg = (parseFloat(parts[0]) + parseFloat(parts[1])) / 2;
            return isNaN(avg) ? null : avg;
        }
        const num = parseFloat(value);
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
