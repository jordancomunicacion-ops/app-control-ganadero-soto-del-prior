// Soil Data Management Module
// Handles Soil-to-Crop suitability data

const SoilDataManager = {
    // Default Data: Table 3 (User Provided) as CSV string
    defaultCSV: `cultivo_forrajero,textura_ideal,pH_ideal,contenido_MO,retencion_agua,drenaje
Ryegrass (Lolium perenne),Franco limoso (40% arena/40% limo/20% arcilla),6.0,Media (≥3%),Moderada,Bueno (evitar encharcamiento)
Alfalfa (Medicago sativa),Franco arenoso (suelo profundo bien drenado),7.0,Media (≥2%),Moderada,Excelente (no tolera anegamiento)
Maiz (Zea mays),Franco arcilloso (20% arena/40% limo/40% arcilla),6.5,Media (≥2%),Alta,Bueno (drenaje eficiente)`,

    _soils: [],

    async init() {
        console.log('Initializing Soil Data...');
        if (this._soils.length === 0) {
            await this.load();
        }
    },

    async load() {
        try {
            // Try fetching external file first
            const res = await fetch('soil_data.csv');
            if (res.ok) {
                const text = await res.text();
                this._soils = this.parseCSV(text);
                console.log('Soil data loaded from CSV file');
            } else {
                throw new Error('No external file');
            }
        } catch (e) {
            console.log('Using default soil data (embedded)');
            this._soils = this.parseCSV(this.defaultCSV);
        }
        return this._soils;
    },

    getAll() {
        return this._soils;
    },

    parseCSV(text) {
        const lines = text.trim().split('\n');
        const data = [];
        if (lines.length < 2) return data;

        // Detect delimiter
        const firstLine = lines[0];
        const delimiter = firstLine.includes(';') ? ';' : ',';

        // Skip header if it looks like header
        let startIndex = 1;

        for (let i = startIndex; i < lines.length; i++) {
            const row = this.parseLine(lines[i], delimiter);
            if (row.length < 6) continue;

            data.push({
                cultivo_forrajero: row[0],
                textura_ideal: row[1],
                pH_ideal: row[2], // Keep as string or parse? Table view uses string usually, but logic might need number.
                contenido_MO: row[3],
                retencion_agua: row[4],
                drenaje: row[5]
            });
        }
        return data;
    },

    parseLine(line, delimiter) {
        // Simple regex for CSV parsing handles quotes
        const regex = new RegExp(`(?:^|${delimiter})("(?:[^"]|"")*"|[^${delimiter}]*)`, 'g');
        let matches = [];
        let match;
        while (match = regex.exec(line)) {
            let val = match[1];
            if (val && val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            matches.push(val ? val.trim() : '');
        }
        // Remove the empty match at the end if any logic artifact
        if (matches.length > 0 && matches[matches.length - 1] === undefined) matches.pop();
        return matches.filter(m => m !== undefined);
    },

    // Legacy support wrapper for manual upload
    importCSV(text) {
        try {
            const data = this.parseCSV(text);
            this._soils = data;
            return { success: true, count: data.length };
        } catch (e) {
            return { success: false, message: e.message };
        }
    },

    saveToStorage() {
        // Not necessary for file-based approach but kept for compatibility
    }
};

window.SoilDataManager = SoilDataManager;
