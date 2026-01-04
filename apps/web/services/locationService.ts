
export interface Municipality {
    municipio_id: string; // "01051"
    provincia_id: string; // "01"
    cmun: string;         // "051"
    dc: string;           // "3"
    nombre: string;       // "Agurain/Salvatierra"
}

export interface Province {
    code: string;
    name: string;
    community: string; // Autonomous Community
}

export const SPANISH_PROVINCES: Province[] = [
    { code: '01', name: 'Araba/Álava', community: 'País Vasco' },
    { code: '02', name: 'Albacete', community: 'Castilla-La Mancha' },
    { code: '03', name: 'Alicante/Alacant', community: 'Comunidad Valenciana' },
    { code: '04', name: 'Almería', community: 'Andalucía' },
    { code: '05', name: 'Ávila', community: 'Castilla y León' },
    { code: '06', name: 'Badajoz', community: 'Extremadura' },
    { code: '07', name: 'Illes Balears', community: 'Illes Balears' },
    { code: '08', name: 'Barcelona', community: 'Cataluña' },
    { code: '09', name: 'Burgos', community: 'Castilla y León' },
    { code: '10', name: 'Cáceres', community: 'Extremadura' },
    { code: '11', name: 'Cádiz', community: 'Andalucía' },
    { code: '12', name: 'Castellón/Castelló', community: 'Comunidad Valenciana' },
    { code: '13', name: 'Ciudad Real', community: 'Castilla-La Mancha' },
    { code: '14', name: 'Córdoba', community: 'Andalucía' },
    { code: '15', name: 'A Coruña', community: 'Galicia' },
    { code: '16', name: 'Cuenca', community: 'Castilla-La Mancha' },
    { code: '17', name: 'Girona', community: 'Cataluña' },
    { code: '18', name: 'Granada', community: 'Andalucía' },
    { code: '19', name: 'Guadalajara', community: 'Castilla-La Mancha' },
    { code: '20', name: 'Gipuzkoa', community: 'País Vasco' },
    { code: '21', name: 'Huelva', community: 'Andalucía' },
    { code: '22', name: 'Huesca', community: 'Aragón' },
    { code: '23', name: 'Jaén', community: 'Andalucía' },
    { code: '24', name: 'León', community: 'Castilla y León' },
    { code: '25', name: 'Lleida', community: 'Cataluña' },
    { code: '26', name: 'La Rioja', community: 'La Rioja' },
    { code: '27', name: 'Lugo', community: 'Galicia' },
    { code: '28', name: 'Madrid', community: 'Comunidad de Madrid' },
    { code: '29', name: 'Málaga', community: 'Andalucía' },
    { code: '30', name: 'Murcia', community: 'Región de Murcia' },
    { code: '31', name: 'Navarra', community: 'Comunidad Foral de Navarra' },
    { code: '32', name: 'Ourense', community: 'Galicia' },
    { code: '33', name: 'Asturias', community: 'Principado de Asturias' },
    { code: '34', name: 'Palencia', community: 'Castilla y León' },
    { code: '35', name: 'Las Palmas', community: 'Canarias' },
    { code: '36', name: 'Pontevedra', community: 'Galicia' },
    { code: '37', name: 'Salamanca', community: 'Castilla y León' },
    { code: '38', name: 'Santa Cruz de Tenerife', community: 'Canarias' },
    { code: '39', name: 'Cantabria', community: 'Cantabria' },
    { code: '40', name: 'Segovia', community: 'Castilla y León' },
    { code: '41', name: 'Sevilla', community: 'Andalucía' },
    { code: '42', name: 'Soria', community: 'Castilla y León' },
    { code: '43', name: 'Tarragona', community: 'Cataluña' },
    { code: '44', name: 'Teruel', community: 'Aragón' },
    { code: '45', name: 'Toledo', community: 'Castilla-La Mancha' },
    { code: '46', name: 'Valencia/València', community: 'Comunidad Valenciana' },
    { code: '47', name: 'Valladolid', community: 'Castilla y León' },
    { code: '48', name: 'Bizkaia', community: 'País Vasco' },
    { code: '49', name: 'Zamora', community: 'Castilla y León' },
    { code: '50', name: 'Zaragoza', community: 'Aragón' },
    { code: '51', name: 'Ceuta', community: 'Ceuta' },
    { code: '52', name: 'Melilla', community: 'Melilla' }
];

export const getProvinceName = (code: string) => SPANISH_PROVINCES.find(p => p.code === code)?.name || code;
