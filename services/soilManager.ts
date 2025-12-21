export interface SoilCharacteristics {
    id_suelo: string;
    nombre: string;
    textura: string;
    pH_tipico: number;
    retencion_hidrica: string;
    drenaje: string;
    riesgos: string;
    usos_recomendados: string;
    objetivos_productivos: string;
}

export interface SoilFeedRelation {
    id_suelo: string;
    tipo_alimento: string;
    nombre_alimento: string;
    tipo: string;
    condiciones_especiales: string;
}

export interface SoilLogicRule {
    id_suelo: string;
    objetivo_productivo: string;
    forraje_recomendado: string;
    suplemento_recomendado: string;
    sistema_recomendado: string;
}

export interface SoilIndices {
    id_suelo: string;
    nombre: string;
    indice_retencion_hidrica: number;
    indice_drenaje: number;
    indice_fertilidad: number;
    indice_riesgo_encharcamiento: number;
    indice_riesgo_sequia: number;
    indice_riesgo_erosion: number;
    aptitud_pastoreo_extensivo: number;
    aptitud_pastoreo_intensivo: number;
    aptitud_cultivos_forrajeros: number;
    [key: string]: any;
}

export const SoilManager = {
    soilCharacteristicsCSV: `id_suelo,nombre,textura,pH_típico,retención_hídrica,drenaje,riesgos,usos_recomendados,objetivos_productivos
1,Arcilloso,Arcillosa,6.0,alta,lento,"encharcamiento; agrietamiento en sequía","pradera permanente; pastoreo controlado","cría extensiva; doble propósito"
2,Arenoso,Arenosa,5.5,baja,rápido,"sequía; erosión","pastoreo extensivo; cultivos solo con riego","cría extensiva"
3,Franco,Franca,6.5,media,bueno,"erosión moderada; compactación","cultivos forrajeros; praderas intensivas","engorde rápido; producción de leche; cría extensiva; doble propósito"
4,Limoso,Limosa,6.5,media-alta,lento,"compactación; mal drenaje","pastoreo rotacional; labranza mínima","cría extensiva; doble propósito"
5,Calizo,Arcillosa (caliza),7.5,alta,lento,"alcalinidad; deficiencias de micronutrientes","praderas tolerantes; cultivo con enmiendas","producción de leche; doble propósito"`,

    soilFeedRelationsCSV: `id_suelo,tipo_alimento,nombre_alimento,tipo,condiciones_especiales
1,forraje,Festuca alta,gramínea perenne,"tolera suelos pesados y húmedos"
1,forraje,Trébol blanco,leguminosa rastrera,"requiere humedad constante; no tolera sequía prolongada"
1,suplemento,Sal mineralizada,mineral,"aporta fósforo y microminerales en suelos ácidos"
2,forraje,Pasto buffel,gramínea perenne,"tolera sequía; se adapta a suelos pobres (arenosos)"
2,forraje,Leucaena,leguminosa arbustiva,"requiere buen drenaje; fija nitrógeno mejorando el suelo"
2,suplemento,Melaza-urea,energético-proteico,"aporta energía rápida en épocas secas"
3,forraje,Raigrás perenne,gramínea perenne,"exige suelo fértil; no tolera sequía"
3,forraje,Alfalfa,leguminosa perenne,"alto rendimiento; requiere drenaje y pH ~6.5-7.5"
3,forraje,Maíz (ensilado),cereal anual,"demanda suelo profundo y fértil; requiere riego"
3,pienso compuesto,Concentrado 18% PB,pienso balanceado,"uso en engorde intensivo o dietas lácteas"
4,forraje,Pasto elefante,gramínea gigante,"altamente productivo; requiere humedad y fertilidad"
4,forraje,Lotus (pata de pájaro),leguminosa perenne,"tolera acidez y mal drenaje"
4,suplemento,Heno de gramínea,fibroso,"provee forraje seco en temporada lluviosa"
5,forraje,Alfalfa,leguminosa perenne,"tolera suelos alcalinos; necesita buen drenaje"
5,forraje,Grama Rhodes,gramínea perenne,"resistente a salinidad y pH alto"
5,suplemento,Harina de soja 47%,proteico,"alto contenido de proteína by-pass; complementa dietas energéticas"`,

    recommendationLogicCSV: `id_suelo,objetivo_productivo,forraje_recomendado,suplemento_recomendado,sistema_recomendado
1,engorde rápido,Maíz ensilado,Concentrado 18% PB,intensivo
1,producción de leche,Pradera festuca-trébol blanco,Concentrado 20% PB,mixto
1,cría extensiva,Brachiaria humidícola,Bloque mineral,extensivo
1,doble propósito,Pasto elefante (corte),Melaza-urea,rotacional
2,engorde rápido,Heno de alfalfa,Grano de maíz,intensivo
2,producción de leche,Buffel (bajo riego),Concentrado 20% PB,mixto
2,cría extensiva,Pasto buffel,Sal mineralizada,extensivo
2,doble propósito,Buffel con Leucaena (silvopastoril),Torta de algodón,rotacional
3,engorde rápido,Maíz ensilado,Concentrado 18% PB,intensivo
3,producción de leche,Pradera rotacional (ryegrass + trébol),Concentrado 20% PB,rotacional
3,cría extensiva,Pastizal natural,Bloque mineral,extensivo
3,doble propósito,Pasto Pangola,Ensilado de maíz,mixto
4,engorde rápido,Sorgo forrajero (ensilado),Concentrado 18% PB,intensivo
4,producción de leche,Pasto elefante (corte),Concentrado 20% PB,mixto
4,cría extensiva,Pasto bahía (Paspalum),Bloque mineral,extensivo
4,doble propósito,Brachiaria brizantha,Melaza-urea,rotacional
5,engorde rápido,Alfalfa (heno),Concentrado 18% PB,intensivo
5,producción de leche,Alfalfa (pastoreo rotacional),Harina de soja 47%,rotacional
5,cría extensiva,Pasto buffel,Bloque mineral,extensivo
5,doble propósito,Grama Rhodes,Heno de alfalfa,mixto`,

    quantitativeIndexCSV: `id_suelo,nombre,indice_retencion_hidrica,indice_drenaje,indice_fertilidad,indice_riesgo_encharcamiento,indice_riesgo_sequia,indice_riesgo_erosion,aptitud_pastoreo_extensivo,aptitud_pastoreo_intensivo,aptitud_cultivos_forrajeros
1,Arcilloso,0.90,0.20,0.80,0.90,0.60,0.40,0.70,0.50,0.60
2,Arenoso,0.20,0.90,0.30,0.10,0.90,0.80,0.60,0.30,0.40
3,Franco,0.60,0.70,0.85,0.30,0.40,0.50,0.80,0.80,0.90
4,Limoso,0.70,0.30,0.70,0.60,0.40,0.70,0.70,0.60,0.70
5,Calizo,0.80,0.30,0.60,0.60,0.50,0.50,0.70,0.70,0.80`,

    _data: {
        characteristics: {} as Record<string, SoilCharacteristics>,
        feedRelations: [] as SoilFeedRelation[],
        logic: [] as SoilLogicRule[],
        indices: {} as Record<string, SoilIndices>
    },

    init() {
        this.parseAllData();
    },

    parseAllData() {
        const charRows = this.parseCSV(this.soilCharacteristicsCSV);
        charRows.forEach((row: any) => {
            if (row.id_suelo) this._data.characteristics[row.id_suelo] = row;
        });

        this._data.feedRelations = this.parseCSV(this.soilFeedRelationsCSV) as any[];
        this._data.logic = this.parseCSV(this.recommendationLogicCSV) as any[];

        const indexRows = this.parseCSV(this.quantitativeIndexCSV);
        indexRows.forEach((row: any) => {
            if (row.id_suelo) {
                Object.keys(row).forEach(key => {
                    if (key.startsWith('indice_') || key.startsWith('aptitud_')) {
                        row[key] = parseFloat(row[key]);
                    }
                });
                this._data.indices[row.id_suelo] = row;
            }
        });
    },

    getSoilTypes() {
        return Object.values(this._data.characteristics);
    },

    getCharacteristics(soilId: string) {
        return this._data.characteristics[soilId];
    },

    getFeedRecommendations(soilId: string) {
        return this._data.feedRelations.filter(r => r.id_suelo == soilId);
    },

    getProductionSystem(soilId: string, objective: string) {
        const rule = this._data.logic.find(r => r.id_suelo == soilId && r.objetivo_productivo.toLowerCase() === objective.toLowerCase());
        return rule || null;
    },

    filterCropsForSoil(criteria: any) {
        const name = (criteria.textura_ideal || criteria.nombre || '').toLowerCase();
        if (!name) return [];

        const soil = Object.values(this._data.characteristics).find(s =>
            s.nombre.toLowerCase() === name || s.textura.toLowerCase() === name
        );

        if (!soil) return [];
        return this.getFeedRecommendations(soil.id_suelo);
    },

    calculateMixture(composition: Record<string, number>) {
        const resultIndices: any = {
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

        Object.entries(composition).forEach(([soilId, pct]) => {
            const soilIndices = this._data.indices[soilId];
            if (!soilIndices) return;

            const weight = pct / 100;
            Object.keys(resultIndices).forEach(key => {
                resultIndices[key] += (soilIndices[key] || 0) * weight;
            });
        });

        Object.keys(resultIndices).forEach(key => {
            resultIndices[key] = Math.round(resultIndices[key] * 100) / 100;
        });

        return resultIndices;
    },

    parseCSV(text: string) {
        const lines = text.trim().split('\n');
        const data: any[] = [];
        if (lines.length < 2) return data;

        const firstLine = lines[0];
        const delimiter = firstLine.includes(';') ? ';' : ',';
        const headers = this.parseCSVLine(firstLine, delimiter).map(h => h.trim());

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i], delimiter);
            if (values.length < headers.length) continue;

            const row: any = {};
            headers.forEach((h, index) => {
                row[h] = values[index];
            });
            data.push(row);
        }
        return data;
    },

    parseCSVLine(line: string, delimiter: string) {
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
        if (matches.length > 0 && line.endsWith(delimiter)) matches.push('');
        return matches;
    }
};
