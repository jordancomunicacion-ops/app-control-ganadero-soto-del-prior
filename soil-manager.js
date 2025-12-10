// Soil Data Management Module
// Handles Soil Characteristics, Relations, and Logic

const SoilDataManager = {
    // 1. Soil Characteristics (Definitions)
    soilCharacteristicsCSV: `id_suelo,nombre,textura,pH_t\u00EDpico,retenci\u00F3n_h\u00EDdrica,drenaje,riesgos,usos_recomendados,objetivos_productivos
1,Arcilloso,Arcillosa,6.0,alta,lento,"encharcamiento; agrietamiento en sequ\u00EDa","pradera permanente; pastoreo controlado","cr\u00EDa extensiva; doble prop\u00F3sito"
2,Arenoso,Arenosa,5.5,baja,r\u00E1pido,"sequ\u00EDa; erosi\u00F3n","pastoreo extensivo; cultivos solo con riego","cr\u00EDa extensiva"
3,Franco,Franca,6.5,media,bueno,"erosi\u00F3n moderada; compactaci\u00F3n","cultivos forrajeros; praderas intensivas","engorde r\u00E1pido; producci\u00F3n de leche; cr\u00EDa extensiva; doble prop\u00F3sito"
4,Limoso,Limosa,6.5,media-alta,lento,"compactaci\u00F3n; mal drenaje","pastoreo rotacional; labranza m\u00EDnima","cr\u00EDa extensiva; doble prop\u00F3sito"
5,Calizo,Arcillosa (caliza),7.5,alta,lento,"alcalinidad; deficiencias de micronutrientes","praderas tolerantes; cultivo con enmiendas","producci\u00F3n de leche; doble prop\u00F3sito"`,

    // 2. Soil-Feed Relations (Recommendations)
    soilFeedRelationsCSV: `id_suelo,tipo_alimento,nombre_alimento,tipo,condiciones_especiales
1,forraje,Festuca alta,gram\u00EDnea perenne,"tolera suelos pesados y h\u00FAmedos"
1,forraje,Tr\u00E9bol blanco,leguminosa rastrera,"requiere humedad constante; no tolera sequ\u00EDa prolongada"
1,suplemento,Sal mineralizada,mineral,"aporta f\u00F3sforo y microminerales en suelos \u00E1cidos"
2,forraje,Pasto buffel,gram\u00EDnea perenne,"tolera sequ\u00EDa; se adapta a suelos pobres (arenosos)"
2,forraje,Leucaena,leguminosa arbustiva,"requiere buen drenaje; fija nitr\u00F3geno mejorando el suelo"
2,suplemento,Melaza-urea,energ\u00E9tico-proteico,"aporta energ\u00EDa r\u00E1pida en \u00E9pocas secas"
3,forraje,Raigr\u00E1s perenne,gram\u00EDnea perenne,"exige suelo f\u00E9rtil; no tolera sequ\u00EDa"
3,forraje,Alfalfa,leguminosa perenne,"alto rendimiento; requiere drenaje y pH ~6.5-7.5"
3,forraje,Ma\u00EDz (ensilado),cereal anual,"demanda suelo profundo y f\u00E9rtil; requiere riego"
3,pienso compuesto,Concentrado 18% PB,pienso balanceado,"uso en engorde intensivo o dietas l\u00E1cteas"
4,forraje,Pasto elefante,gram\u00EDnea gigante,"altamente productivo; requiere humedad y fertilidad"
4,forraje,Lotus (pata de p\u00E1jaro),leguminosa perenne,"tolera acidez y mal drenaje"
4,suplemento,Heno de gram\u00EDnea,fibroso,"provee forraje seco en temporada lluviosa"
5,forraje,Alfalfa,leguminosa perenne,"tolera suelos alcalinos; necesita buen drenaje"
5,forraje,Grama Rhodes,gram\u00EDnea perenne,"resistente a salinidad y pH alto"
5,suplemento,Harina de soja 47%,proteico,"alto contenido de prote\u00EDna by-pass; complementa dietas energ\u00E9ticas"`,

    // 3. Logic Recommendations (Systems & Objectives)
    recommendationLogicCSV: `id_suelo,objetivo_productivo,forraje_recomendado,suplemento_recomendado,sistema_recomendado
1,engorde r\u00E1pido,Ma\u00EDz ensilado,Concentrado 18% PB,intensivo
1,producci\u00F3n de leche,Pradera festuca-tr\u00E9bol blanco,Concentrado 20% PB,mixto
1,cr\u00EDa extensiva,Brachiaria humid\u00EDcola,Bloque mineral,extensivo
1,doble prop\u00F3sito,Pasto elefante (corte),Melaza-urea,rotacional
2,engorde r\u00E1pido,Heno de alfalfa,Grano de ma\u00EDz,intensivo
2,producci\u00F3n de leche,Buffel (bajo riego),Concentrado 20% PB,mixto
2,cr\u00EDa extensiva,Pasto buffel,Sal mineralizada,extensivo
2,doble prop\u00F3sito,Buffel con Leucaena (silvopastoril),Torta de algod\u00F3n,rotacional
3,engorde r\u00E1pido,Ma\u00EDz ensilado,Concentrado 18% PB,intensivo
3,producci\u00F3n de leche,Pradera rotacional (ryegrass + tr\u00E9bol),Concentrado 20% PB,rotacional
3,cr\u00EDa extensiva,Pastizal natural,Bloque mineral,extensivo
3,doble prop\u00F3sito,Pasto Pangola,Ensilado de ma\u00EDz,mixto
4,engorde r\u00E1pido,Sorgo forrajero (ensilado),Concentrado 18% PB,intensivo
4,producci\u00F3n de leche,Pasto elefante (corte),Concentrado 20% PB,mixto
4,cr\u00EDa extensiva,Pasto bah\u00EDa (Paspalum),Bloque mineral,extensivo
4,doble prop\u00F3sito,Brachiaria brizantha,Melaza-urea,rotacional
5,engorde r\u00E1pido,Alfalfa (heno),Concentrado 18% PB,intensivo
5,producci\u00F3n de leche,Alfalfa (pastoreo rotacional),Harina de soja 47%,rotacional
5,cr\u00EDa extensiva,Pasto buffel,Bloque mineral,extensivo
5,doble prop\u00F3sito,Grama Rhodes,Heno de alfalfa,mixto`,

    // 4. Quantitative Indices (0-1 Scale)
    quantitativeIndexCSV: `id_suelo,nombre,indice_retencion_hidrica,indice_drenaje,indice_fertilidad,indice_riesgo_encharcamiento,indice_riesgo_sequia,indice_riesgo_erosion,aptitud_pastoreo_extensivo,aptitud_pastoreo_intensivo,aptitud_cultivos_forrajeros
1,Arcilloso,0.90,0.20,0.80,0.90,0.60,0.40,0.70,0.50,0.60
2,Arenoso,0.20,0.90,0.30,0.10,0.90,0.80,0.60,0.30,0.40
3,Franco,0.60,0.70,0.85,0.30,0.40,0.50,0.80,0.80,0.90
4,Limoso,0.70,0.30,0.70,0.60,0.40,0.70,0.70,0.60,0.70
5,Calizo,0.80,0.30,0.60,0.60,0.50,0.50,0.70,0.70,0.80`,

    // Internal Data Stores
    _data: {
        characteristics: {}, // mapped by ID
        feedRelations: [],   // list
        logic: [],           // list
        indices: {}          // mapped by ID
    },

    async init() {
        console.log('Initializing Soil Data Manager (Advanced Mode)...');
        this.parseAllData();
    },

    parseAllData() {
        // Parse Characteristics
        const charRows = this.parseCSV(this.soilCharacteristicsCSV);
        charRows.forEach(row => {
            if (row.id_suelo) this._data.characteristics[row.id_suelo] = row;
        });

        // Parse Feed Relations
        this._data.feedRelations = this.parseCSV(this.soilFeedRelationsCSV);

        // Parse Logic
        this._data.logic = this.parseCSV(this.recommendationLogicCSV);

        // Parse Indices
        const indexRows = this.parseCSV(this.quantitativeIndexCSV);
        indexRows.forEach(row => {
            if (row.id_suelo) {
                // Convert numeric strings to floats
                Object.keys(row).forEach(key => {
                    if (key.startsWith('indice_') || key.startsWith('aptitud_')) {
                        row[key] = parseFloat(row[key]);
                    }
                });
                this._data.indices[row.id_suelo] = row;
            }
        });

        console.log('Soil Data Parsed:',
            Object.keys(this._data.characteristics).length, 'Types,',
            this._data.feedRelations.length, 'Relations,',
            this._data.logic.length, 'Logic Rules,',
            Object.keys(this._data.indices).length, 'Indices'
        );

        // Self-test
        // this.test();
    },

    // --- Public API ---

    getSoilTypes() {
        return Object.values(this._data.characteristics);
    },

    getCharacteristics(soilId) {
        return this._data.characteristics[soilId];
    },

    getFeedRecommendations(soilId) {
        return this._data.feedRelations.filter(r => r.id_suelo == soilId);
    },

    getProductionSystem(soilId, objective) {
        // Find exact match for soil and objective
        // objective could be "engorde rápido", "producción de leche", etc.
        const rule = this._data.logic.find(r => r.id_suelo == soilId && r.objetivo_productivo.toLowerCase() === objective.toLowerCase());
        return rule || null;
    },

    /**
     * Calculates weighted indices for a mixture of soils.
     * @param {Object} composition Map of soilId -> percentage (0-100). E.g., { "1": 50, "2": 50 }
     */
    calculateMixture(composition) {
        const totalPercent = Object.values(composition).reduce((a, b) => a + b, 0);
        if (Math.abs(totalPercent - 100) > 0.1) console.warn('Composition does not sum to 100%:', totalPercent);

        const resultIndices = {
            indice_retencion_hidrica: 0,
            indice_drenaje: 0,
            indice_fertilidad: 0,
            indice_riesgo_encharcamiento: 0,
            indice_riesgo_sequia: 0,
            indice_riesgo_erosion: 0,
            aptitud_pastoreo_extensivo: 0,
            aptitud_pastoreo_intensivo: 0,
            aptitud_cultivos_forrajeros: 0
        };

        // Weighted Average Calculation
        Object.entries(composition).forEach(([soilId, pct]) => {
            const soilIndices = this._data.indices[soilId];
            if (!soilIndices) return;

            const weight = pct / 100;

            Object.keys(resultIndices).forEach(key => {
                resultIndices[key] += (soilIndices[key] || 0) * weight;
            });
        });

        // Round results to 2 decimals
        Object.keys(resultIndices).forEach(key => {
            resultIndices[key] = Math.round(resultIndices[key] * 100) / 100;
        });

        return resultIndices;
    },

    // --- Helpers ---

    parseCSV(text) {
        const lines = text.trim().split('\n');
        const data = [];
        if (lines.length < 2) return data;

        // Header detection
        const firstLine = lines[0];
        const delimiter = firstLine.includes(';') ? ';' : ',';
        // Note: The prompt data seems to use commas mostly, but let's be robust.
        // Actually, looking at the user prompt string: "id_suelo,nombre..." it uses commas.

        const headers = this.parseCSVLine(firstLine, delimiter).map(h => h.trim());

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i], delimiter);
            if (values.length < headers.length) continue;

            const row = {};
            headers.forEach((h, index) => {
                row[h] = values[index];
            });
            data.push(row);
        }
        return data;
    },

    parseCSVLine(line, delimiter) {
        // Matches quoted fields vs non-quoted fields
        // Note: The previous regex was `(?:^|${delimiter})("(?:[^"]|"")*"|[^${delimiter}]*)`
        // Let's stick to a robust one.
        const regex = new RegExp(`(?:^|${delimiter})("(?:[^"]|"")*"|[^${delimiter}]*)`, 'g');
        let matches = [];
        let match;
        while (match = regex.exec(line)) {
            let val = match[1];
            if (val) {
                if (val.startsWith('"') && val.endsWith('"')) {
                    val = val.slice(1, -1).replace(/""/g, '"');
                }
                matches.push(val.trim());
            } else {
                matches.push('');
            }
        }
        // Helper often produces one extra empty match at end
        if (matches.length > 0 && line.endsWith(delimiter)) matches.push('');
        // If regex logic produced artifact
        if (matches.length > line.split(delimiter).length) matches.pop(); // heuristic

        return matches;
    },

    // Debug method
    test() {
        console.log('--- Soil Manager Test ---');
        console.log('Get Soil 1:', this.getCharacteristics(1));
        console.log('Get Feed for Soil 2:', this.getFeedRecommendations(2));
        console.log('Get Logic for Soil 3 (Milk):', this.getProductionSystem(3, 'producción de leche'));

        console.log('--- Mixture Test (50% Clay(1) + 50% Sand(2)) ---');
        // Clay(1): Ret=0.9, Dren=0.2
        // Sand(2): Ret=0.2, Dren=0.9
        // Expected: Ret=0.55, Dren=0.55
        const mix = this.calculateMixture({ 1: 50, 2: 50 });
        console.log('Result:', mix);
    }
};

if (typeof window !== 'undefined') {
    window.SoilDataManager = SoilDataManager;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = SoilDataManager;
}
