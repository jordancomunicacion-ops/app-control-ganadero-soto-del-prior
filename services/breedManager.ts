import { Breed } from './nutritionEngine';

export interface BreedData extends Breed {
    subspecies?: string;
    subspecies_name?: string;
    weight_male_adult: number;
    weight_female_adult: number;
    slaughter_age_months?: string;
    adg_feedlot: number;
    adg_grazing: number;
    fcr_feedlot?: number;
    heat_tolerance?: string;
    marbling?: string;
    calving_ease?: string;
    rc_base?: number;
    rc_min?: number;
    rc_max?: number;
    marbling_potential?: number;
    dmi_pct_pv?: number;
    [key: string]: any;
}

const DEFAULT_CSV = `raza_id;subespecie;raza;peso_macho_adulto_kg;peso_hembra_adulta_kg;edad_sacrificio_tipica_meses;ADG_feedlot_kg_dia;ADG_pastoreo_kg_dia;FCR_feedlot;termotolerancia;potencial_marmoleo;facilidad_parto;DMI_pct_PV;NEI_min;NEI_max;DOF_min;DOF_max;ADG_min;ADG_max;Conc_min;Conc_max;THI_comfort;THI_max;changes_30d_limit;w_DOF;w_NEI;w_CONC;w_ADG;w_HEAT;w_STAB;w_HEALTH;Z0;k;rc_base;rc_min;rc_max
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
AZB;Bos taurus;Azul Belga;1175;775;16.5;1.7;1.0;6.75;Baja;1;Muy Baja;0.0240;16;24;80;150;1.20;2.20;0.65;0.90;70;80;4;0.8;1.3;0.7;1.0;1.3;0.8;0.7;0.8;3.0;0.675;0.65;0.70`;

export class BreedManager {
    private _breeds = new Map<string, BreedData>();
    private _subspecies = new Map<string, any>();

    constructor() { }

    async init() {
        if (this._breeds.size === 0) {
            await this.load();
        }
    }

    getAllBreeds(): Record<string, BreedData> {
        const breeds: Record<string, BreedData> = {};
        for (const breed of this._breeds.values()) {
            if (breed.name) {
                breeds[breed.name] = breed;
            }
        }
        return breeds;
    }

    getBreedByName(name: string): BreedData | null {
        if (!name) return null;
        const target = name.toLowerCase();
        for (const breed of this._breeds.values()) {
            if (breed.name.toLowerCase() === target) return breed;
            if (breed.name.toLowerCase().includes(target)) return breed;
        }
        return null;
    }

    getBreedSmart(nameOrId: string): BreedData | null {
        if (!nameOrId) return null;
        const target = this.slugify(nameOrId);

        // 1. Direct Lookup
        let match = this._breeds.get(nameOrId) ||
            this.getBreedByName(nameOrId) ||
            this._breeds.get(target.toUpperCase());

        if (match) return match;

        // 2. Mix Check
        const separators = [' x ', ' X ', '/', ' cruzado con ', ' cruce '];
        let parts: string[] | null = null;

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
    }

    mixBreeds(b1: BreedData, b2: BreedData, mixedName: string): BreedData {
        const mix: BreedData = {
            id: 'mix-' + (b1.code || b1.id) + '-' + (b2.code || b2.id),
            code: ((b1.code || '') + 'x' + (b2.code || '')).substring(0, 10),
            name: mixedName || `${b1.name} x ${b2.name}`,
            subspecies_name: 'Cruzado',

            weight_male_adult: ((b1.weight_male_adult || 0) + (b2.weight_male_adult || 0)) / 2,
            weight_female_adult: ((b1.weight_female_adult || 0) + (b2.weight_female_adult || 0)) / 2,
            adg_feedlot: ((b1.adg_feedlot || 0) + (b2.adg_feedlot || 0)) / 2,
            adg_grazing: ((b1.adg_grazing || 0) + (b2.adg_grazing || 0)) / 2,
            marbling_potential: ((b1.marbling_potential || 3) + (b2.marbling_potential || 3)) / 2,

            // ... fill other averaged props as needed
            weights: {} // Initialize if expected
        };
        // Note: Simplified mixing for brevity, in production should copy all props
        return mix;
    }

    async load() {
        // For now, load default CSV directly. In real app, check localStorage cache.
        this.importCSV(DEFAULT_CSV);
    }

    importCSV(csvText: string) {
        const lines = csvText.split('\n');
        const headerLine = lines[0];
        const delimiter = headerLine.includes(';') ? ';' : ',';

        // Simple parser assuming no commas in values for now
        const headers = headerLine.split(delimiter).map(h => h.trim());

        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(delimiter);
            if (row.length < 2) continue;

            const breed: any = {};
            headers.forEach((h, idx) => {
                breed[h] = row[idx];
            });

            // Manual mapping from CSV headers to keys
            const bData: BreedData = {
                id: breed.raza_id || breed.code,
                code: breed.raza_id,
                name: breed.raza,
                weight_male_adult: parseFloat(breed.peso_macho_adulto_kg) || 0,
                weight_female_adult: parseFloat(breed.peso_hembra_adulta_kg) || 0,
                adg_feedlot: parseFloat(breed.ADG_feedlot_kg_dia) || 0,
                adg_grazing: parseFloat(breed.ADG_pastoreo_kg_dia) || 0,
                marbling_potential: parseFloat(breed.potencial_marmoleo) || 3,
                rc_base: parseFloat(breed.rc_base),
                rc_min: parseFloat(breed.rc_min),
                rc_max: parseFloat(breed.rc_max),
                // ... map others
            };

            if (bData.id) {
                this._breeds.set(bData.id, bData);
            }
        }
    }

    slugify(text: string) {
        return text.toString().toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '_')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
    }
}

export const breedManager = new BreedManager();
