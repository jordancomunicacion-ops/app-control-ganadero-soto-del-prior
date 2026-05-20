// Vademécum mínimo de medicamentos veterinarios de vacuno carne en España.
// Núcleo (~30 productos) más usados en explotaciones extensivas: antibióticos,
// antiparasitarios, vacunas oficiales, hormonales reproductivos y AINEs.
//
// Tiempos de retiro indicativos según fichas técnicas AEMPS/CIMA vigentes
// al momento del seed. El ganadero debe SIEMPRE verificar la ficha técnica
// del lote concreto antes de comercializar carne/leche. El catálogo es
// editable desde la UI: aquí solo sembramos un punto de partida útil.

const VET_PRODUCTS = [
    // ── ANTIBIÓTICOS ──────────────────────────────────────────────────────────
    {
        name: 'Terramicina LA',
        activeIngredient: 'Oxitetraciclina dihidrato',
        category: 'antibiotico',
        presentation: 'inyectable',
        withdrawalMeatDays: 28,
        withdrawalMilkDays: 7,
        unit: 'ml',
        defaultDosePerKg: 0.1, // 20 mg/kg = 0.1 ml/kg (200 mg/ml)
    },
    {
        name: 'Amoxicilina LA',
        activeIngredient: 'Amoxicilina trihidrato',
        category: 'antibiotico',
        presentation: 'inyectable',
        withdrawalMeatDays: 58,
        withdrawalMilkDays: 4,
        unit: 'ml',
        defaultDosePerKg: 0.0667,
    },
    {
        name: 'Pen & Strep',
        activeIngredient: 'Bencilpenicilina + Dihidroestreptomicina',
        category: 'antibiotico',
        presentation: 'inyectable',
        withdrawalMeatDays: 23,
        withdrawalMilkDays: 4,
        unit: 'ml',
        defaultDosePerKg: 0.05,
    },
    {
        name: 'Nuflor',
        activeIngredient: 'Florfenicol',
        category: 'antibiotico',
        presentation: 'inyectable',
        withdrawalMeatDays: 30,
        withdrawalMilkDays: 0, // prohibido en lactantes
        unit: 'ml',
        defaultDosePerKg: 0.1,
    },
    {
        name: 'Excenel RTU',
        activeIngredient: 'Ceftiofur clorhidrato',
        category: 'antibiotico',
        presentation: 'inyectable',
        withdrawalMeatDays: 8,
        withdrawalMilkDays: 0,
        unit: 'ml',
        defaultDosePerKg: 0.02,
    },
    {
        name: 'Baytril 10%',
        activeIngredient: 'Enrofloxacino',
        category: 'antibiotico',
        presentation: 'inyectable',
        withdrawalMeatDays: 14,
        withdrawalMilkDays: 0, // prohibido en lactantes
        unit: 'ml',
        defaultDosePerKg: 0.025,
    },
    {
        name: 'Micotil 300',
        activeIngredient: 'Tilmicosina',
        category: 'antibiotico',
        presentation: 'inyectable',
        withdrawalMeatDays: 28,
        withdrawalMilkDays: 0,
        unit: 'ml',
        defaultDosePerKg: 0.033,
    },
    {
        name: 'Marbocyl 10%',
        activeIngredient: 'Marbofloxacino',
        category: 'antibiotico',
        presentation: 'inyectable',
        withdrawalMeatDays: 6,
        withdrawalMilkDays: 3,
        unit: 'ml',
        defaultDosePerKg: 0.02,
    },
    {
        name: 'Draxxin',
        activeIngredient: 'Tulatromicina',
        category: 'antibiotico',
        presentation: 'inyectable',
        withdrawalMeatDays: 22,
        withdrawalMilkDays: 0,
        unit: 'ml',
        defaultDosePerKg: 0.025,
    },
    {
        name: 'Cobactan LA',
        activeIngredient: 'Cefquinoma',
        category: 'antibiotico',
        presentation: 'inyectable',
        withdrawalMeatDays: 4,
        withdrawalMilkDays: 1,
        unit: 'ml',
        defaultDosePerKg: 0.04,
    },

    // ── ANTIPARASITARIOS ──────────────────────────────────────────────────────
    {
        name: 'Ivomec Inyectable',
        activeIngredient: 'Ivermectina 1%',
        category: 'antiparasitario',
        presentation: 'inyectable',
        withdrawalMeatDays: 49,
        withdrawalMilkDays: 0, // prohibido en producción láctea
        unit: 'ml',
        defaultDosePerKg: 0.02,
    },
    {
        name: 'Ivomec Pour-On',
        activeIngredient: 'Ivermectina 0.5%',
        category: 'antiparasitario',
        presentation: 'pour-on',
        withdrawalMeatDays: 28,
        withdrawalMilkDays: 0,
        unit: 'ml',
        defaultDosePerKg: 0.1,
    },
    {
        name: 'Dectomax',
        activeIngredient: 'Doramectina',
        category: 'antiparasitario',
        presentation: 'inyectable',
        withdrawalMeatDays: 70,
        withdrawalMilkDays: 0,
        unit: 'ml',
        defaultDosePerKg: 0.02,
    },
    {
        name: 'Eprinex Pour-On',
        activeIngredient: 'Eprinomectina',
        category: 'antiparasitario',
        presentation: 'pour-on',
        withdrawalMeatDays: 0,
        withdrawalMilkDays: 0,
        unit: 'ml',
        defaultDosePerKg: 0.1,
    },
    {
        name: 'Cydectin Pour-On',
        activeIngredient: 'Moxidectina',
        category: 'antiparasitario',
        presentation: 'pour-on',
        withdrawalMeatDays: 14,
        withdrawalMilkDays: 0,
        unit: 'ml',
        defaultDosePerKg: 0.1,
    },
    {
        name: 'Ripercol',
        activeIngredient: 'Levamisol',
        category: 'antiparasitario',
        presentation: 'oral',
        withdrawalMeatDays: 14,
        withdrawalMilkDays: 4,
        unit: 'ml',
        defaultDosePerKg: 0.075,
    },
    {
        name: 'Valbazen',
        activeIngredient: 'Albendazol',
        category: 'antiparasitario',
        presentation: 'oral',
        withdrawalMeatDays: 14,
        withdrawalMilkDays: 3,
        unit: 'ml',
        defaultDosePerKg: 0.075,
    },
    {
        name: 'Flukiver',
        activeIngredient: 'Closantel',
        category: 'antiparasitario',
        presentation: 'oral',
        withdrawalMeatDays: 63,
        withdrawalMilkDays: 0,
        unit: 'ml',
        defaultDosePerKg: 0.05,
    },

    // ── VACUNAS ───────────────────────────────────────────────────────────────
    {
        name: 'Rev-1 / RB51 (Brucelosis)',
        activeIngredient: 'Brucella abortus cepa atenuada',
        category: 'vacuna',
        presentation: 'inyectable',
        withdrawalMeatDays: 0,
        withdrawalMilkDays: 0,
        unit: 'dosis',
        notes: 'Saneamiento oficial. Trazabilidad obligatoria.',
    },
    {
        name: 'Rispoval IBR-BVD',
        activeIngredient: 'Virus IBR + BVD inactivados',
        category: 'vacuna',
        presentation: 'inyectable',
        withdrawalMeatDays: 0,
        withdrawalMilkDays: 0,
        unit: 'dosis',
    },
    {
        name: 'Vacuna BTV-4/BTV-8 (Lengua azul)',
        activeIngredient: 'Virus BTV inactivado',
        category: 'vacuna',
        presentation: 'inyectable',
        withdrawalMeatDays: 0,
        withdrawalMilkDays: 0,
        unit: 'dosis',
        notes: 'Campaña oficial CCAA. Consultar serotipo vigente.',
    },
    {
        name: 'Covexin 10',
        activeIngredient: 'Clostridium spp. (10 cepas)',
        category: 'vacuna',
        presentation: 'inyectable',
        withdrawalMeatDays: 21,
        withdrawalMilkDays: 0,
        unit: 'dosis',
    },
    {
        name: 'Hiprabovis Somni/Lkt',
        activeIngredient: 'Pasteurella multocida + Mannheimia haemolytica',
        category: 'vacuna',
        presentation: 'inyectable',
        withdrawalMeatDays: 0,
        withdrawalMilkDays: 0,
        unit: 'dosis',
    },
    {
        name: 'Rispoval Intranasal',
        activeIngredient: 'PI3 + BRSV vivos atenuados',
        category: 'vacuna',
        presentation: 'intranasal',
        withdrawalMeatDays: 0,
        withdrawalMilkDays: 0,
        unit: 'dosis',
    },

    // ── HORMONALES / REPRODUCCIÓN ─────────────────────────────────────────────
    {
        name: 'Estrumate',
        activeIngredient: 'Cloprostenol sódico',
        category: 'hormonal',
        presentation: 'inyectable',
        withdrawalMeatDays: 1,
        withdrawalMilkDays: 0,
        unit: 'ml',
        notes: 'Embarazadas: NUNCA manipular sin guantes.',
    },
    {
        name: 'Receptal',
        activeIngredient: 'Buserelina (análogo GnRH)',
        category: 'hormonal',
        presentation: 'inyectable',
        withdrawalMeatDays: 0,
        withdrawalMilkDays: 0,
        unit: 'ml',
    },
    {
        name: 'CIDR Bovino',
        activeIngredient: 'Progesterona 1.38 g',
        category: 'hormonal',
        presentation: 'intravaginal',
        withdrawalMeatDays: 0,
        withdrawalMilkDays: 0,
        unit: 'dispositivo',
    },

    // ── ANTIINFLAMATORIOS ─────────────────────────────────────────────────────
    {
        name: 'Metacam 20 mg/ml',
        activeIngredient: 'Meloxicam',
        category: 'antiinflamatorio',
        presentation: 'inyectable',
        withdrawalMeatDays: 15,
        withdrawalMilkDays: 5,
        unit: 'ml',
        defaultDosePerKg: 0.025,
    },
    {
        name: 'Finadyne',
        activeIngredient: 'Flunixino meglumine',
        category: 'antiinflamatorio',
        presentation: 'inyectable',
        withdrawalMeatDays: 7,
        withdrawalMilkDays: 2,
        unit: 'ml',
        defaultDosePerKg: 0.022,
    },
    {
        name: 'Ketofen 10%',
        activeIngredient: 'Ketoprofeno',
        category: 'antiinflamatorio',
        presentation: 'inyectable',
        withdrawalMeatDays: 4,
        withdrawalMilkDays: 0,
        unit: 'ml',
        defaultDosePerKg: 0.03,
    },
];

async function seedVetProducts(prisma) {
    let created = 0;
    let updated = 0;
    for (const p of VET_PRODUCTS) {
        // Idempotente: nombre comercial como clave de búsqueda. Si existe se
        // actualiza tiempos de retiro y dosis (las fichas técnicas cambian
        // con los años); si no, se crea.
        const existing = await prisma.vetProduct.findFirst({ where: { name: p.name } });
        if (existing) {
            await prisma.vetProduct.update({ where: { id: existing.id }, data: p });
            updated++;
        } else {
            await prisma.vetProduct.create({ data: p });
            created++;
        }
    }
    return { created, updated, total: VET_PRODUCTS.length };
}

module.exports = { seedVetProducts, VET_PRODUCTS };
