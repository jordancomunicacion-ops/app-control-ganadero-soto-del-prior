// Breed Data Management Module
// Handles Data Layer for Breeds and Subspecies, and CSV Import

const BreedDataManager = {
    // In-memory data stores
    _breeds: new Map(),      // Key: Code (ID) -> Object
    _subspecies: new Map(),  // Key: Name -> Object (to avoid duplicates by name on import)

    // Default Data: Table 1 (User Provided)
    defaultCSV: `raza_id,raza,subespecie,peso_macho_adulto_kg,peso_hembra_adulta_kg,edad_sacrificio_meses,ADG_feedlot_kg_dia,ADG_pastoreo_kg_dia,FCR,termotolerancia,potencial_marmoleo,facilidad_parto
1,Angus,Bos taurus,900,500,18,1.3,0.7,6.0,Media,Alta,Alta
2,Hereford,Bos taurus,1000,580,20,1.3,0.7,6.2,Media,Media,Alta
3,Charolais,Bos taurus,1100,800,24,1.5,0.9,5.5,Baja,Baja,Baja
4,Limousin,Bos taurus,950,650,16,1.4,0.8,5.0,Media,Baja,Alta
5,Brahman,Bos indicus,900,540,30,1.1,0.5,7.0,Muy alta,Baja,Alta
6,Nelore,Bos indicus,900,550,36,1.0,0.4,7.5,Muy alta,Baja,Alta
7,Droughtmaster,Bos indicus × taurus,950,600,30,1.2,0.6,6.0,Alta,Media,Alta
8,Betizú,Bos taurus,450,325,>36,0.8,0.3,8.0,Media,Baja,Alta
9,Pirenaica,Bos taurus,800,525,18,1.4,0.7,5.0,Media,Media,Alta
10,Aubrac,Bos taurus,1000,700,72,1.2,0.6,5.5,Media,Baja,Alta
11,Morucha,Bos taurus,900,500,30,1.2,0.5,5.0,Alta,Media,Alta
12,Retinta,Bos taurus,1000,580,30,1.4,0.6,4.8,Muy alta,Media,Alta`,

    async init() {
        if (this._breeds.size === 0) {
            await this.load();
        }
    },

    getAllBreeds() {
        const breeds = {};
        for (const breed of this._breeds.values()) {
            if (breed.name) {
                breeds[breed.name] = breed;
            }
        }
        return breeds;
    },

    async load() {
        // 1. Try Cache
        if (this._breeds.size > 0) return this.getAll();

        const cached = localStorage.getItem('BREED_DATA_CACHE');
        if (cached) {
            this.restoreFromCache(cached);
            if (this._breeds.size > 0) return this.getAll();
        }

        // 2. Try Default Data directly (Skip external fetch for now to ensure defaults appear)
        console.log('Loading default breed data...');
        this.importCSV(this.defaultCSV);
        this.saveToStorage();
        return this.getAll();
    },

    async reload() {
        this._breeds.clear();
        this._subspecies.clear();
        localStorage.removeItem('BREED_DATA_CACHE');
        return this.load();
    },

    // ... (rest of methods)

    // ==========================================
    // CSV IMPORT
    // ==========================================

    importCSV(csvText) {
        const rows = this.parseCSVText(csvText);
        let headerMap = new Map();
        let headersFound = false;

        const result = {
            total_rows: rows.length,
            rows_processed: 0,
            rows_skipped: 0,
            rows_created: 0,
            rows_updated: 0
        };

        for (const row of rows) {
            // Skip empty rows
            if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;

            // Header Detection (look for 'raza' or 'breed')
            if (!headersFound) {
                const rowStr = row.join(' ').toLowerCase();
                if (rowStr.includes('raza') || rowStr.includes('breed') || rowStr.includes('code')) {
                    row.forEach((col, idx) => {
                        headerMap.set(col.toLowerCase().trim(), idx);
                    });
                    headersFound = true;
                    console.log('Headers detected:', Array.from(headerMap.keys()));
                    continue;
                }
            }

            // Process Data Row
            if (headersFound) {
                try {
                    this.upsertBreedFromRow(row, headerMap, result);
                    result.rows_processed++;
                } catch (err) {
                    console.warn('Row error:', row, err);
                    result.rows_skipped++; // Fix for syntax error if variable was missing
                }
            }
        }
        return result;
    },

    upsertBreedFromRow(row, headerMap, result) {
        // Helper to find column
        const getValue = (colNameFragment) => {
            const target = colNameFragment.toLowerCase();
            // Direct match
            if (headerMap.has(target)) return row[headerMap.get(target)].trim();
            // Fuzzy
            for (const [key, idx] of headerMap.entries()) {
                if (key.includes(target) && idx < row.length) return row[idx].trim();
            }
            return null;
        };

        // 1. Identity
        const code = getValue('raza_id') || getValue('id');
        const name = getValue('raza') || getValue('breed');

        if (!code || !name) return; // Skip invalid rows

        // 2. Subspecies Logic
        const subName = getValue('subespecie') || 'Unknown';
        let sub = this._subspecies.get(subName.toLowerCase());

        if (!sub) {
            sub = {
                id: crypto.randomUUID(),
                code: this.slugify(subName),
                name: subName,
                status: 'active'
            };
            this._subspecies.set(subName.toLowerCase(), sub);
        }

        // 3. Map Attributes
        const breedData = {
            id: crypto.randomUUID(),
            code: code,
            name: name,
            subspecies_id: sub.id,
            subspecies: sub.name,
            subspecies_name: sub.name,

            // Numeric Attributes
            weight_male_adult: this.parseNum(getValue('peso_macho')),
            weight_female_adult: this.parseNum(getValue('peso_hembra')),

            // Slaughter Age (string or range)
            slaughter_age_months: getValue('edad_sacrificio'),

            // Production Stats
            adg_feedlot: this.parseNum(getValue('adg_feedlot')),
            adg_grazing: this.parseNum(getValue('adg_pastoreo')),
            fcr_feedlot: this.parseNum(getValue('fcr')),

            // Qualitative
            heat_tolerance: getValue('termotolerancia') || 'Media',
            marbling: getValue('potencial_marmoleo') || 'Media',
            calving_ease: getValue('facilidad_parto') || 'Media',

            extras: {}
        };

        // 4. Upsert
        const existing = this._breeds.get(code);
        if (existing) {
            breedData.id = existing.id;
            this._breeds.set(code, breedData);
            result.rows_updated++;
        } else {
            this._breeds.set(code, breedData);
            result.rows_created++;
        }
    },

    // ==========================================
    // UTILITIES
    // ==========================================

    parseCSVText(text) {
        // Auto-detect delimiter
        const firstLine = text.split('\n')[0];
        const delimiter = firstLine.includes(';') ? ';' : ',';
        console.log('Detected CSV delimiter:', delimiter);

        // Robust CSV splitter handling quotes and delimiter
        const lines = [];
        let currentRow = [];
        let currentVal = '';
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const next = text[i + 1];

            if (char === '"') {
                if (inQuotes && next === '"') {
                    currentVal += '"'; // Escaped quote
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === delimiter && !inQuotes) {
                currentRow.push(currentVal);
                currentVal = '';
            } else if ((char === '\r' || char === '\n') && !inQuotes) {
                if (currentVal || currentRow.length > 0) {
                    currentRow.push(currentVal);
                    lines.push(currentRow);
                }
                currentRow = [];
                currentVal = '';
                if (char === '\r' && next === '\n') i++; // Skip \n after \r
            } else {
                currentVal += char;
            }
        }
        if (currentVal || currentRow.length > 0) {
            currentRow.push(currentVal);
            lines.push(currentRow);
        }
        return lines;
    },

    parseNum(val) {
        if (val === null || val === undefined || val === '') return null;
        const n = parseFloat(val);
        return isNaN(n) ? null : n;
    },

    parseSlaughterAge(val) {
        if (!val) return { min: null, max: null, raw: null };
        const str = String(val).trim();
        // Try '18-22' format
        const parts = str.split('-');
        if (parts.length === 2) {
            return {
                min: this.parseNum(parts[0]),
                max: this.parseNum(parts[1]),
                raw: str
            };
        }
        // Fallback or single number
        const single = this.parseNum(str);
        if (single !== null) return { min: single, max: single, raw: str };
        return { min: null, max: null, raw: str };
    },

    slugify(text) {
        return text.toString().toLowerCase()
            .replace(/\s+/g, '_')           // Replace spaces with -
            .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
            .replace(/\-\-+/g, '_')         // Replace multiple - with single -
            .replace(/^-+/, '')             // Trim - from start of text
            .replace(/-+$/, '');            // Trim - from end of text
    },

    // ==========================================
    // STORAGE & INIT
    // ==========================================

    async load() {
        // 1. Check LocalStorage
        const cached = localStorage.getItem('BREED_V2_DATA');
        const cacheTime = localStorage.getItem('BREED_V2_TIME');

        let shouldLoadCSV = true;
        if (cached && cacheTime) {
            try {
                const data = JSON.parse(cached);
                if (data && Array.isArray(data) && data.length > 0) {
                    console.log('Restoring from cache...');
                    this.restoreFromCache(data);
                    shouldLoadCSV = false;
                }
            } catch (e) {
                console.warn('Cache invalid', e);
            }
        }

        if (shouldLoadCSV) {
            console.log('Loading from CSV...');
            await this.loadFromCSV();
        }

        return this.getAllBreeds();
    },

    restoreFromCache(dataArray) {
        this._breeds.clear();
        this._subspecies.clear();
        dataArray.forEach(b => {
            this._breeds.set(b.code, b);
            if (b.subspecies_name) {
                const sKey = b.subspecies_name.toLowerCase();
                if (!this._subspecies.has(sKey)) {
                    this._subspecies.set(sKey, {
                        id: b.subspecies_id || crypto.randomUUID(),
                        name: b.subspecies_name
                    });
                }
            }
        });
    },

    async loadFromCSV(path = 'breed_data.csv') {
        try {
            const res = await fetch(path);
            if (!res.ok) throw new Error('CSV not found');
            const text = await res.text();

            const report = this.importCSV(text);
            console.log('Import Report:', report);

            this.saveToStorage();
            return this.getAllBreeds();
        } catch (err) {
            console.warn('Failed to load CSV, using Embedded Defaults:', err);
            // FALLBACK TO DEFAULT CSV
            const report = this.importCSV(this.defaultCSV);
            console.log('Default Import Report:', report);

            this.saveToStorage();
            return this.getAllBreeds();
        }
    },

    async reload() {
        localStorage.removeItem('BREED_V2_DATA');
        return await this.loadFromCSV();
    },

    saveToStorage() {
        // Save as array to preserve structure
        const arr = Array.from(this._breeds.values());
        localStorage.setItem('BREED_V2_DATA', JSON.stringify(arr));
        localStorage.setItem('BREED_V2_TIME', Date.now().toString());
    }
};

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BreedDataManager;
}
