// Breed Data Management Module
// Handles Data Layer for Breeds and Subspecies, and CSV Import

const BreedDataManager = {
    // In-memory data stores
    _breeds: new Map(),      // Key: Code (ID) -> Object
    _subspecies: new Map(),  // Key: Name -> Object (to avoid duplicates by name on import)

    // Default Data: Table 1 (User Provided + New Configs)
    // Default Data: Table 1 (Standard Spanish & International Breeds)
    defaultCSV: `raza_id;subespecie;raza;peso_macho_adulto_kg;peso_hembra_adulta_kg;edad_sacrificio_tipica_meses;ADG_feedlot_kg_dia;ADG_pastoreo_kg_dia;FCR_feedlot;termotolerancia;potencial_marmoleo;facilidad_parto;DMI_pct_PV;NEI_min;NEI_max;DOF_min;DOF_max;ADG_min;ADG_max;Conc_min;Conc_max;THI_comfort;THI_max;changes_30d_limit;w_DOF;w_NEI;w_CONC;w_ADG;w_HEAT;w_STAB;w_HEALTH;Z0;k;rc_base;rc_min;rc_max
WAG;Bos taurus;Wagyu;850;550;26-32;0.90;0.60;8.50;0.40;5;2.0;0.0192;12;18;180;420;0.60;1.10;0.60;0.85;72;84;4;1.6;1.2;0.8;0.6;1.2;0.9;0.7;1.2;3.0;0.637;0.60;0.65
ANG;Bos taurus;Angus;900;500;18;1.40;0.90;7.90;0.40;4;Alta;0.0220;14;20;120;240;0.80;1.60;0.55;0.80;72;84;4;1.3;1.2;0.7;0.7;1.1;0.8;0.7;1.1;3.0;0.60;0.55;0.65
HER;Bos taurus;Hereford;1000;580;20;1.40;0.80;7.80;0.30;3;Alta;0.0215;13;19;110;220;0.75;1.50;0.50;0.78;72;83;4;1.2;1.1;0.6;0.7;1.2;0.8;0.7;1.1;3.0;0.59;0.54;0.64
CHA;Bos taurus;Charolais;1100;800;24;1.50;1.00;7.20;0.30;3;Baja;0.0230;15;21;90;170;0.95;1.80;0.55;0.82;72;83;4;0.9;1.2;0.6;0.9;1.2;0.8;0.7;1.0;3.0;0.63;0.58;0.68
LIM;Bos taurus;Limousin;950;650;16;1.40;0.90;7.40;0.40;3;Alta;0.0225;14;20;100;190;0.90;1.70;0.55;0.82;72;84;4;1.0;1.1;0.6;0.8;1.1;0.8;0.7;1.0;3.0;0.64;0.60;0.70
BRA;Bos indicus;Brahman;900;540;30;1.20;0.70;8.00;0.80;2;Alta;0.0200;12;18;80;140;0.70;1.40;0.45;0.70;74;88;5;0.6;1.0;0.4;0.6;0.8;0.7;0.7;1.0;2.8;0.58;0.52;0.62
NEL;Bos indicus;Nelore;900;550;36;1.10;0.60;8.20;0.90;2;Alta;0.0195;11;17;80;140;0.65;1.30;0.45;0.68;74;90;5;0.6;0.9;0.4;0.6;0.7;0.7;0.7;1.0;2.8;0.58;0.52;0.62
DRM;Bos indicus × taurus;Droughtmaster;950;600;30;1.30;0.80;7.90;0.80;3;Alta;0.0205;12;18;90;160;0.75;1.45;0.50;0.72;74;88;5;0.8;1.0;0.5;0.6;0.8;0.7;0.7;1.0;2.8;0.59;0.54;0.64
RET;Bos taurus;Retinta;1000;580;30;1.10;0.75;8.30;0.60;3;Alta;0.0210;12;18;120;240;0.70;1.35;0.50;0.75;73;86;4;1.1;1.0;0.6;0.6;1.0;0.9;0.7;1.1;3.0;0.57;0.52;0.62
MOR;Bos taurus;Morucha;900;500;30;1.10;0.70;8.40;0.60;3;Alta;0.0210;12;18;120;240;0.70;1.35;0.50;0.75;73;86;4;1.1;1.0;0.6;0.6;1.0;0.9;0.7;1.1;3.0;0.56;0.50;0.60
PIR;Bos taurus;Pirenaica;800;525;18;1.30;0.85;7.80;0.50;3;Alta;0.0220;13;19;100;190;0.80;1.55;0.52;0.78;72;85;4;1.0;1.1;0.6;0.7;1.1;0.8;0.7;1.0;3.0;0.61;0.56;0.66
BET;Bos taurus;Betizú;450;325;>36;0.90;0.55;9.20;0.60;2;Alta;0.0200;10;16;90;180;0.50;1.10;0.40;0.65;73;86;3;0.8;0.9;0.4;0.5;1.0;0.9;0.7;1.2;3.0;0.55;0.50;0.60
BER;Bos taurus;Berrenda;800;500;23;1.10;0.70;8.30;0.60;3;Alta;0.0210;12;18;110;220;0.70;1.35;0.50;0.75;73;86;4;1.0;1.0;0.6;0.6;1.0;0.9;0.7;1.1;3.0;0.59;0.58;0.60
SIM;Bos taurus;Simmental;1100;750;18;1.4;0.8;5.8;Media;3;Alta;0.0225;14;20;110;200;0.90;1.60;0.55;0.80;72;84;4;1.1;1.1;0.6;0.7;1.1;0.8;0.7;1.0;3.0;0.60;0.56;0.66
BDA;Bos taurus;Blonde d'Aquitaine;1200;700;18;1.6;1.1;7.1;Media;2;Media;0.0235;15;22;90;170;1.10;2.00;0.60;0.85;72;83;4;0.9;1.2;0.6;0.9;1.2;0.8;0.7;1.0;3.0;0.64;0.63;0.65
AZB;Bos taurus;Azul Belga;1175;775;16.5;1.7;1.0;6.75;Baja;1;Muy Baja;0.0240;16;24;80;150;1.20;2.20;0.65;0.90;70;80;4;0.8;1.3;0.7;1.0;1.3;0.8;0.7;0.8;3.0;0.675;0.65;0.70`,

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

    getBreedByName(name) {
        if (!name) return null;
        const target = name.toLowerCase();
        for (const breed of this._breeds.values()) {
            if (breed.name.toLowerCase() === target) return breed;
            // Fuzzy check?
            if (breed.name.toLowerCase().includes(target)) return breed;
        }
        return null;
    },

    getBreedSmart(nameOrId) {
        if (!nameOrId) return null;
        const target = this.slugify(nameOrId);

        // 1. Direct Lookup
        let match = this._breeds.get(nameOrId) ||
            this.getBreedByName(nameOrId) ||
            this._breeds.get(target.toUpperCase()); // Check Code (WAG, ANG)

        if (match) return match;

        // 2. Check for "Cross" syntax: "Wagyu x Angus" or "Wagyu/Angus" or "Cruza Wagyu Angus"
        const separators = [' x ', ' X ', '/', ' cruzado con ', ' cruce '];
        let parts = null;

        for (const sep of separators) {
            if (nameOrId.includes(sep)) {
                parts = nameOrId.split(sep);
                break;
            }
        }

        if (parts && parts.length >= 2) {
            const b1 = this.getBreedByName(parts[0].trim());
            const b2 = this.getBreedByName(parts[1].trim());
            if (b1 && b2) {
                return this.mixBreeds(b1, b2, nameOrId);
            }
        }

        return null;
    },

    mixBreeds(b1, b2, mixedName) {
        // Average the parameters
        const mix = {
            id: 'mix-' + b1.code + '-' + b2.code,
            code: (b1.code + 'x' + b2.code).substring(0, 10),
            name: mixedName || `${b1.name} x ${b2.name}`,
            subspecies_name: 'Cruzado',

            // Average Weights
            weight_male_adult: (b1.weight_male_adult + b2.weight_male_adult) / 2,
            weight_female_adult: (b1.weight_female_adult + b2.weight_female_adult) / 2,

            // Average Production
            adg_feedlot: (b1.adg_feedlot + b2.adg_feedlot) / 2,
            adg_grazing: (b1.adg_grazing + b2.adg_grazing) / 2,

            // Marbling
            marbling_potential: (b1.marbling_potential + b2.marbling_potential) / 2,

            // Metabolic (Wagyu Model)
            dmi_pct_pv: (b1.dmi_pct_pv + b2.dmi_pct_pv) / 2,
            nei_min: (b1.nei_min + b2.nei_min) / 2,
            nei_max: (b1.nei_max + b2.nei_max) / 2,
            dof_min: (b1.dof_min + b2.dof_min) / 2,
            dof_max: (b1.dof_max + b2.dof_max) / 2,

            // Stress
            thi_comfort: (b1.thi_comfort + b2.thi_comfort) / 2,
            thi_max: (b1.thi_max + b2.thi_max) / 2,

            // Weights (Average the scoring weights too!)
            weights: {
                w_dof: (b1.weights.w_dof + b2.weights.w_dof) / 2,
                w_nei: (b1.weights.w_nei + b2.weights.w_nei) / 2,
                w_conc: (b1.weights.w_conc + b2.weights.w_conc) / 2,
                w_adg: (b1.weights.w_adg + b2.weights.w_adg) / 2,
                w_heat: (b1.weights.w_heat + b2.weights.w_heat) / 2,
                w_stab: (b1.weights.w_stab + b2.weights.w_stab) / 2,
                w_health: (b1.weights.w_health + b2.weights.w_health) / 2,
                z0: (b1.weights.z0 + b2.weights.z0) / 2,
                k: (b1.weights.k + b2.weights.k) / 2
            },

            // Defaults for safety
            conc_min: 0.5, conc_max: 0.8,
            changes_30d_limit: 4,
            adg_min_quality: 0.7, adg_max_quality: 1.5
        };
        console.log(`[BreedManager] Created Mix: ${mix.name}`);
        return mix;
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
            if (headerMap.has(target)) {
                const val = row[headerMap.get(target)];
                return val ? val.trim() : '';
            }
            // Fuzzy
            for (const [key, idx] of headerMap.entries()) {
                if (key.includes(target) && idx < row.length) {
                    const val = row[idx];
                    return val ? val.trim() : '';
                }
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

            // New Carcass & Quality Data (Wagyu Model)
            rc_base: this.parseNum(getValue('rc_base')),
            rc_min: this.parseNum(getValue('rc_min')),
            rc_max: this.parseNum(getValue('rc_max')),
            marbling_potential: this.parseNum(getValue('potencial_marmoleo')) || 3,

            // Metabolic & Marbling Model Params
            dmi_pct_pv: this.parseNum(getValue('DMI_pct_PV')) || 0.021, // Default Intakes

            // Normalization Ranges
            nei_min: this.parseNum(getValue('NEI_min')) || 12,
            nei_max: this.parseNum(getValue('NEI_max')) || 18,
            dof_min: this.parseNum(getValue('DOF_min')) || 100,
            dof_max: this.parseNum(getValue('DOF_max')) || 200,
            adg_min_quality: this.parseNum(getValue('ADG_min')) || 0.6,
            adg_max_quality: this.parseNum(getValue('ADG_max')) || 1.4,
            conc_min: this.parseNum(getValue('Conc_min')) || 0.5,
            conc_max: this.parseNum(getValue('Conc_max')) || 0.8,

            // Environmental & Stress
            thi_comfort: this.parseNum(getValue('THI_comfort')) || 72,
            thi_max: this.parseNum(getValue('THI_max')) || 84,
            changes_30d_limit: this.parseNum(getValue('changes_30d_limit')) || 4,

            // Scoring Weights
            weights: {
                w_dof: this.parseNum(getValue('w_DOF')) || 1.0,
                w_nei: this.parseNum(getValue('w_NEI')) || 1.0,
                w_conc: this.parseNum(getValue('w_CONC')) || 0.6,
                w_adg: this.parseNum(getValue('w_ADG')) || 0.8,
                w_heat: this.parseNum(getValue('w_HEAT')) || 1.0,
                w_stab: this.parseNum(getValue('w_STAB')) || 0.8,
                w_health: this.parseNum(getValue('w_HEALTH')) || 0.7,
                z0: this.parseNum(getValue('Z0')) || 1.0,
                k: this.parseNum(getValue('k')) || 3.0
            },

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

    downloadCSV() {
        const breeds = Array.from(this._breeds.values());
        if (breeds.length === 0) {
            alert("No hay razas para descargar.");
            return;
        }

        const headers = ["raza_id", "raza", "subespecie", "peso_macho_adulto_kg", "peso_hembra_adulta_kg", "edad_sacrificio_meses", "ADG_feedlot_kg_dia", "ADG_pastoreo_kg_dia", "FCR", "termotolerancia", "potencial_marmoleo", "facilidad_parto"];

        const csvContent = [
            headers.join(','),
            ...breeds.map(b => [
                b.code,
                b.name,
                b.subspecies_name || '',
                b.weight_male_adult || '',
                b.weight_female_adult || '',
                b.slaughter_age_months || '',
                b.adg_feedlot || '',
                b.adg_grazing || '',
                b.fcr_feedlot || '',
                b.heat_tolerance || '',
                b.marbling || '',
                b.calving_ease || ''
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "razas_data.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    // ==========================================
    // STORAGE & INIT
    // ==========================================

    async load() {
        // 1. Check LocalStorage (VERSIONED to force refresh)
        const cached = localStorage.getItem('BREED_DATA_V4');
        const cacheTime = localStorage.getItem('BREED_TIME_V4');

        let shouldLoadCSV = true;
        if (cached && cacheTime) {
            try {
                const data = JSON.parse(cached);
                if (data && Array.isArray(data) && data.length > 0) {
                    console.log('Restoring from cache (V4)...');
                    this.restoreFromCache(data);
                    shouldLoadCSV = false;
                }
            } catch (e) {
                console.warn('Cache invalid', e);
            }
        }

        if (shouldLoadCSV) {
            console.log('Loading from CSV (New Defaults)...');
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
        localStorage.removeItem('BREED_DATA_V4');
        return await this.loadFromCSV();
    },

    saveToStorage() {
        // Save as array to preserve structure
        const arr = Array.from(this._breeds.values());
        localStorage.setItem('BREED_DATA_V4', JSON.stringify(arr));
        localStorage.setItem('BREED_TIME_V4', Date.now().toString());
    }
};

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BreedDataManager;
} else {
    window.BreedDataManager = BreedDataManager;
}
