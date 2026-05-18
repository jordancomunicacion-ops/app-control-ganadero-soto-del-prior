/**
 * Glosario centralizado: para cada concepto técnico de la app, una
 * explicación en lenguaje claro pensada para usuarios de campo que no
 * trabajan con la nomenclatura científica a diario.
 *
 * Convenciones:
 *   - `label`: cómo aparece el concepto en la UI (puede coincidir con el
 *     término técnico).
 *   - `plain`: explicación breve (1-2 frases), conversacional, sin más
 *     jerga. Debe responder "¿qué significa esto y por qué me importa?".
 *
 * Las claves son estables (snake_case) para reusar entre componentes.
 */

export interface GlossaryEntry {
    label: string;
    plain: string;
}

const G: Record<string, GlossaryEntry> = {
    // ── SUELO: clasificación y química ─────────────────────────────────────
    wrb_group: {
        label: 'Clasificación WRB',
        plain: 'Nombre internacional del tipo de suelo según la FAO. Permite comparar tu finca con otras del mundo.',
    },
    usda_texture: {
        label: 'Textura USDA',
        plain: 'Mezcla de arena, limo y arcilla del suelo. Determina cómo drena el agua y cómo se trabaja.',
    },
    soil_ph: {
        label: 'pH del suelo',
        plain: 'Cuanto más bajo, más ácido (mejor para centeno, peor para alfalfa). Por encima de 7,5 se bloquea el hierro y el zinc.',
    },
    awc: {
        label: 'Agua útil (AWC)',
        plain: 'Litros de agua disponibles para las raíces por cada metro de suelo. Más AWC = aguanta mejor las sequías cortas.',
    },
    organic_matter: {
        label: 'Materia orgánica',
        plain: 'Restos vegetales descompuestos. Por encima del 3 % el suelo retiene agua y nutrientes mucho mejor.',
    },
    cec: {
        label: 'Capacidad de intercambio (CIC)',
        plain: 'Capacidad del suelo para "agarrar" nutrientes. Baja en arenas (se lavan), alta en arcillas y materia orgánica.',
    },
    free_lime: {
        label: 'Cal libre',
        plain: 'Caliza activa del suelo. Hace que el pH suba y bloquea hierro y manganeso de los pastos.',
    },
    salinity_ec: {
        label: 'Salinidad',
        plain: 'Sales disueltas en el suelo. Por encima de 4 dS/m la mayoría de pastos sufren. Solo halófitas tolerantes.',
    },
    carrying_capacity: {
        label: 'Carga sostenible (LU/ha)',
        plain: 'Cuántas vacas adultas equivalentes puede mantener una hectárea sin que se degrade el pasto.',
    },
    mineral_deficiencies: {
        label: 'Deficiencias minerales típicas',
        plain: 'Minerales que suelen faltar en pastos de este suelo. Hay que aportarlos en el bloque o el corrector.',
    },
    hoof_damage_risk: {
        label: 'Riesgo de daño en pezuña',
        plain: 'Probabilidad de que las pezuñas sufran si se pastorea en condiciones húmedas. Alto en arcillas, bajo en arenas.',
    },
    parasite_habitat: {
        label: 'Hábitat de parásitos',
        plain: 'Suelos húmedos con restos vegetales favorecen los parásitos gastrointestinales del ganado. Conviene desparasitar antes.',
    },
    erodibility_k: {
        label: 'Erosionabilidad (USLE K)',
        plain: 'Facilidad con que la lluvia arrastra este suelo. Más alto = más sensible a la erosión por arroyada.',
    },

    // ── Tipos de suelo concretos ───────────────────────────────────────────
    wrb_cambisol: {
        label: 'Cambisol',
        plain: 'Suelo joven, intermedio. El más común en España, equilibrado para casi todo.',
    },
    wrb_luvisol: {
        label: 'Luvisol',
        plain: 'Tiene una capa interna de arcilla acumulada. Buen suelo agrícola pero se compacta fácil.',
    },
    wrb_calcisol: {
        label: 'Calcisol',
        plain: 'Suelo calizo seco — típico del centro y sur peninsular. Carga baja, dehesa extensiva.',
    },
    wrb_vertisol: {
        label: 'Vertisol',
        plain: 'Arcilla que se hincha cuando llueve y se agrieta cuando seca. Muy fértil pero difícil de manejar.',
    },
    wrb_fluvisol: {
        label: 'Fluvisol',
        plain: 'Vegas y riberas — suelos formados por sedimentos del río. Los más productivos si no se inundan.',
    },
    wrb_gleysol: {
        label: 'Gleysol',
        plain: 'Suelo con la capa freática alta. Encharcamiento crónico — solo razas rústicas adaptadas.',
    },
    wrb_leptosol: {
        label: 'Leptosol',
        plain: 'Suelo somero, pedregoso. Pocos centímetros útiles — solo pastoreo extensivo rústico.',
    },
    wrb_regosol: {
        label: 'Regosol',
        plain: 'Suelo degradado o erosionado. Carga muy baja, conviene restaurar antes de explotar.',
    },
    wrb_phaeozem: {
        label: 'Phaeozem',
        plain: 'Tierras negras templadas tipo Tierra de Campos. De los más fértiles que hay en España.',
    },
    wrb_solonchak: {
        label: 'Solonchak',
        plain: 'Suelo salino — marismas y zonas áridas. Pasto raquítico, solo razas adaptadas a sal.',
    },
    wrb_andosol: {
        label: 'Andosol',
        plain: 'Suelo volcánico de Canarias. Esponjoso, oscuro, muy productivo.',
    },
    wrb_arenosol: {
        label: 'Arenosol',
        plain: 'Suelo arenoso casi puro. Drena rapidísimo, retiene poco agua y pierde nutrientes.',
    },

    // ── Nutrición animal ───────────────────────────────────────────────────
    nem: {
        label: 'NEm (energía de mantenimiento)',
        plain: 'Energía mínima que el animal necesita solo para vivir, antes de crecer o producir leche.',
    },
    neg: {
        label: 'NEg (energía de ganancia)',
        plain: 'Energía adicional para que el animal gane peso. Cuanto más alta la dieta, más rápido crece.',
    },
    adg: {
        label: 'GMD (ganancia media diaria)',
        plain: 'Kilos que gana el animal al día. 0,1 kg = mantenimiento; 1,0 kg = recría; 1,5+ kg = cebo intensivo.',
    },
    fcr: {
        label: 'IC (índice de conversión, FCR)',
        plain: 'Kilos de pienso que come para ganar 1 kilo de peso. Cuanto más bajo, mejor.',
    },
    dmi: {
        label: 'Ingesta de materia seca (DMI)',
        plain: 'Comida real que come al día sin contar el agua. Las vacas adultas comen 2-2,5 % de su peso vivo.',
    },
    ndf: {
        label: 'FDN (fibra detergente neutra)',
        plain: 'Fibra total de la dieta. Demasiado poca = acidosis. Demasiada = no engorda. Mínimo 15-30 % según el sistema.',
    },
    adf: {
        label: 'FDA (fibra detergente ácida)',
        plain: 'Fracción más dura de la fibra. Indica cuánto puede aprovechar el animal: menos FDA = más digestible.',
    },
    starch: {
        label: 'Almidón',
        plain: 'Carbohidratos rápidos del maíz y los cereales. Aporta mucha energía pero produce acidosis si pasa del 50 %.',
    },
    rup: {
        label: 'RUP (proteína bypass)',
        plain: 'Proteína que escapa del rumen y llega al intestino. Es la "buena" para crecer y producir leche.',
    },
    cp: {
        label: 'PB (proteína bruta)',
        plain: 'Total de proteína de la dieta. Recría: 15-16 %. Mantenimiento: 8-9 %. Acabado: 11-12 %.',
    },
    oleic: {
        label: 'Ácido oleico (C18:1)',
        plain: 'El mismo ácido graso del aceite de oliva y de la bellota. Mejora el sabor y la salud de la carne.',
    },
    lecithin_synergy: {
        label: 'Sinergia bellota + lecitina',
        plain: 'Mezcla probada en Soto del Prior (Viera 2024): bellota encina + 0,5 % lecitina de soja aumenta la infiltración de grasa en bueyes maduros.',
    },

    // ── SEUROP y clasificación canal ──────────────────────────────────────
    seurop_conformation: {
        label: 'Conformación SEUROP',
        plain: 'Cómo de "lleno" sale el animal en canal. S = súper musculado, P = magro flaco. Tu mercado paga más cuanto más cerca de S.',
    },
    seurop_fat: {
        label: 'Engrasamiento (1-5)',
        plain: 'Grasa de cobertura de la canal. 1 = magrísimo, 5 = muy grasiento. El óptimo comercial es 3.',
    },
    marbling: {
        label: 'Infiltración / Veteado',
        plain: 'Grasa entre las fibras del músculo. Da sabor y jugosidad a la carne premium tipo Wagyu o buey.',
    },
    bms: {
        label: 'BMS (Beef Marbling Standard)',
        plain: 'Escala internacional de veteado (1-12). 4+ = carne premium; 8+ = nivel Wagyu.',
    },
    carcass_yield: {
        label: 'Rendimiento canal (RC)',
        plain: 'Qué porcentaje del animal queda como canal después del sacrificio. Continental ≈ 60 %, rústico ≈ 52 %.',
    },
    mapa_category: {
        label: 'Categoría MAPA',
        plain: 'Letra oficial UE: V/Z (<12m), A (añojo), B (toro), C (buey), D (vaca parida), E (novilla).',
    },
    price_source: {
        label: 'Fuente del precio',
        plain: 'Exact = precio exacto para esta clase. Class = precio aproximado de la conformación. Letter = precio genérico de la categoría.',
    },

    // ── Genética y biotipos ────────────────────────────────────────────────
    biotype_british: {
        label: 'Biotipo Británico',
        plain: 'Angus, Hereford. Crecen moderado, marmolean mucho, dan carne sabrosa. Sufren calor.',
    },
    biotype_continental: {
        label: 'Biotipo Continental',
        plain: 'Charolais, Limousin, Blonde. Grandes, magros, alta conformación. Necesitan mucha proteína.',
    },
    biotype_rustic: {
        label: 'Biotipo Rústico Europeo',
        plain: 'Morucha, Retinta, Avileña, Pirenaica. Adaptadas al campo difícil. Crecen poco pero aguantan todo.',
    },
    biotype_dairy: {
        label: 'Biotipo Lechero',
        plain: 'Holstein, Frisona, Simmental. Pensadas para leche — sus terneros engordan pero rinden poco a canal.',
    },
    biotype_indicus: {
        label: 'Biotipo Cebuino',
        plain: 'Brahman, Nelore. Resisten calor y trópico. Aprovechan pasto pobre. Crecen lento y poco veteado.',
    },
    biotype_composite: {
        label: 'Biotipo Compuesto',
        plain: 'Cruces estabilizados como Brangus o Droughtmaster. Mezcla virtudes de las dos partes.',
    },
    brahman_percent: {
        label: '% Brahman',
        plain: 'Cuánto Bos indicus lleva el animal. 100 % = puro Brahman, 50 % = F1. Sube tolerancia al calor.',
    },
    heterosis: {
        label: 'Heterosis (vigor híbrido)',
        plain: 'Plus que ganan los F1 sobre la media de sus padres. Más alto cuando se cruzan razas muy distintas (taurus × indicus).',
    },
    sire_dam_asymmetry: {
        label: 'Asimetría padre/madre',
        plain: 'En los cruces, el padre aporta más conformación y crecimiento, la madre aporta más leche e infiltración.',
    },

    // ── Clima y estrés térmico ─────────────────────────────────────────────
    thi: {
        label: 'THI (índice temperatura-humedad)',
        plain: 'Mide el confort del animal. Por encima de 72 una vaca lechera empieza a comer menos.',
    },
    hli: {
        label: 'HLI (índice de carga térmica)',
        plain: 'Versión más fina del THI para cebadero. Umbral 86 en Angus negro, 96 en Brahman puro.',
    },
    heat_tolerance: {
        label: 'Tolerancia al calor',
        plain: 'Escala 1-10. Brahman 10, Angus 4. Los animales por encima de su umbral comen menos y crecen peor.',
    },

    // ── Suelo + carga ──────────────────────────────────────────────────────
    stocking_rate: {
        label: 'Carga ganadera actual',
        plain: 'Cabezas que tienes hoy en la finca, convertidas a vacas adultas equivalentes (LU).',
    },
    supportable_lu: {
        label: 'Carga soportable',
        plain: 'Vacas equivalentes que la finca puede mantener sin que se degrade el pasto. Combina tipo de suelo, lluvia anual y arbolado.',
    },
    lu_unit: {
        label: 'LU (Livestock Unit)',
        plain: 'Unidad de ganado. 1 LU = 1 vaca adulta de unos 600 kg. Un ternero pequeño cuenta menos.',
    },

    // ── Reportes ───────────────────────────────────────────────────────────
    report_economic: {
        label: 'Informe Económico',
        plain: 'Resumen de ingresos, costes y márgenes por finca y por animal. Útil para cierre de campaña.',
    },
    report_fcr: {
        label: 'Informe de Rendimiento (FCR)',
        plain: 'Eficiencia alimentaria por animal: cuántos kilos de pienso consume para ganar 1 kg de peso vivo. Más bajo es mejor.',
    },
    report_reproductive: {
        label: 'Informe Reproductivo',
        plain: 'Tasas de fertilidad, intervalo entre partos, abortos y resultado del saneamiento sanitario.',
    },

    // ── KPIs de los informes ───────────────────────────────────────────────
    fertility_rate: {
        label: 'Tasa de fertilidad',
        plain: 'De cada 100 inseminaciones, cuántas quedaron preñadas (diagnóstico positivo). Objetivo dehesa extensiva: ≥ 60 %.',
    },
    calving_interval: {
        label: 'Intervalo entre partos',
        plain: 'Días entre un parto y el siguiente de la misma vaca. Lo razonable es 365–400 días; por encima de 450 conviene revisar manejo o alimentación.',
    },
    inventory_value: {
        label: 'Valor del inventario',
        plain: 'Estimación del valor de los animales activos al precio de canal medio (55 % RC × 7,5 €/kg). Es una referencia, no precio de mercado real.',
    },
    mortality_loss: {
        label: 'Pérdida por mortalidad',
        plain: 'Coste estimado de los animales muertos en la campaña, valorando su peso vivo a 2,5 €/kg como aproximación conservadora.',
    },
    balance_economic: {
        label: 'Balance económico',
        plain: 'Ingresos totales (ventas + cosechas + PAC) menos costes registrados (eventos + mortalidad). Positivo: la campaña dio beneficio sobre lo registrado.',
    },
    gmd_source: {
        label: 'Origen de la GMD',
        plain: 'Si el dato viene de pesajes reales («pesajes») o de una estimación por edad/raza («estimado_breed»). Sólo los pesajes son fiables para tomar decisiones.',
    },
    sanitary_status: {
        label: 'Estado sanitario',
        plain: 'Resultado y fecha del último saneamiento oficial (brucelosis/tuberculosis). Si han pasado más de 365 días la campaña está vencida.',
    },

    // ── Roles reproductivos: nodriza ≠ novilla ─────────────────────────────
    nurse_cow: {
        label: 'Vaca nodriza',
        plain: 'Vaca que YA ha parido al menos una vez. Es la que entra en el rebaño de cría: su trabajo es destetar un ternero al año. La distinción es importante para la PAC y para los informes reproductivos.',
    },
    heifer: {
        label: 'Novilla',
        plain: 'Hembra adulta (≥24 meses) que TODAVÍA NO HA PARIDO nunca. Aunque tenga la misma edad que una nodriza, no es lo mismo: la novilla está pendiente de su primer parto y no cobra la ayuda PAC de vaca nodriza.',
    },
    anoja: {
        label: 'Añoja',
        plain: 'Ternera de entre 12 y 24 meses. Está creciendo; aún no se cubre.',
    },
    ternera: {
        label: 'Ternera',
        plain: 'Hembra de 6 a 12 meses, en fase de cebo/recría. Ya destetada en sistemas extensivos.',
    },
    becerra: {
        label: 'Becerra',
        plain: 'Cría de menos de 6 meses, lactante.',
    },

    // ── Filtros del informe ────────────────────────────────────────────────
    report_filter_individual: {
        label: 'Informe individual',
        plain: 'Selecciona una única vaca y verás solo sus eventos, partos, GMD e ingresos asociados. Útil para fichas de cría y para auditar un animal concreto.',
    },
    report_filter_corral: {
        label: 'Filtro por corral',
        plain: 'Limita el informe a los animales asignados a ese corral. Útil para comparar el rendimiento de lotes en distintos pastos o cercados.',
    },

    // ── Conceptos: jerarquía de fincas y SIGPAC ────────────────────────────
    farm_main: {
        label: 'Finca principal',
        plain: 'La finca donde está el ganado (con corrales y animales). Es el centro de la explotación.',
    },
    farm_associated: {
        label: 'Finca de producción asociada',
        plain: 'Otra finca que abastece de alimento a tu finca principal. Suele ser de cultivo: maíz, alfalfa, cereal para grano o ensilado.',
    },
    sigpac_unified: {
        label: 'Identificación SIGPAC',
        plain: 'El mismo sistema (provincia · municipio · polígono · parcela) identifica TANTO la finca completa COMO cada parcela de cultivo dentro de ella. Es el catastro agrícola oficial español.',
    },

    // ── Conceptos finca: corral vs parcela ─────────────────────────────────
    corral_concept: {
        label: 'Corral',
        plain: 'Espacio físico donde está el ganado: cercados de pastoreo, cebaderos, naves, paritorios, mangas. Habla de dónde DUERME y COME el animal.',
    },
    plot_concept: {
        label: 'Parcela de cultivo',
        plain: 'Trozo de tierra donde CRECE LA COMIDA. Tiene su rotación, su uso PAC y su histórico de siembras. Puede ser una pradera vinculada a un corral o un cultivo para cosechar.',
    },
    corral_plot_link: {
        label: 'Pradera vinculada',
        plain: 'Cuando un corral de «pasto mejorado» se solapa con una parcela sembrada (alfalfa, ryegrass...), se vinculan: el corral define dónde está el ganado, la parcela define qué crece.',
    },

    // ── Destinos productivos de la siembra ─────────────────────────────────
    destination_pastoreo: {
        label: 'Pastoreo directo',
        plain: 'El ganado entra a la parcela y come la planta in situ. No se cosecha. Típico de praderas y dehesa.',
    },
    destination_henificacion: {
        label: 'Henificación',
        plain: 'Siega + secado + empacado. El forraje seco se almacena para el invierno o se vende.',
    },
    destination_ensilado: {
        label: 'Ensilado',
        plain: 'Siega + ensilado en silo húmedo (fermentación anaerobia). Conserva más nutrientes que el heno.',
    },
    destination_grano: {
        label: 'Grano',
        plain: 'Cosecha del grano cuando la planta está madura. Se almacena para pienso propio o venta.',
    },
    destination_venta: {
        label: 'Venta',
        plain: 'Cosecha destinada a venta externa, sin pasar por el ganado de la explotación.',
    },
    destination_mejora_suelo: {
        label: 'Mejora del suelo',
        plain: 'Cultivo de cobertura sembrado para enterrar como abono verde — fija nitrógeno, mejora estructura del suelo, no se cosecha.',
    },

    // ── Tipos de evento sanitario / reproductivo ───────────────────────────
    event_saneamiento: {
        label: 'Saneamiento',
        plain: 'Campaña oficial de control de tuberculosis y brucelosis. Obligatoria por normativa.',
    },
    event_pesaje: {
        label: 'Pesaje',
        plain: 'Control mensual de peso del animal. Permite calcular GMD y ajustar la ración.',
    },
    event_inseminacion: {
        label: 'Inseminación',
        plain: 'Inseminación artificial. Inicia el protocolo de 5 eventos (IA, diagnóstico, confirmación).',
    },
    event_parto: {
        label: 'Parto',
        plain: 'Nacimiento de un ternero. Crea automáticamente el registro del cría con su madre.',
    },
    event_diagnostico: {
        label: 'Diagnóstico Gestación',
        plain: 'Ecografía o palpación a los 35-60 días post-inseminación. Confirma o descarta preñez.',
    },

    // ── Sinergias y composición de ración ──────────────────────────────────
    synergy_oleic_lecithin: {
        label: 'Sinergia Oleico + Lecitina',
        plain: 'Cuando hay bellota (o concentrado alto-oleico) más lecitina de soja protegida en la ración, mejora la infiltración de grasa intramuscular. Probado en bueyes Morucha y terneras F1×Angus (Viera 2024).',
    },
    synergy_bellota_encina: {
        label: 'Bellota Encina (Quercus ilex)',
        plain: 'La bellota de encina tiene ~63 % ácido oleico — el mismo del aceite de oliva. Acabado de calidad oct-feb.',
    },
    synergy_bellota_roble: {
        label: 'Bellota Roble (Quercus pyrenaica)',
        plain: 'Más taninos amargos. Apetencia inferior a la encina, mejor mezclada con concentrado.',
    },

    // ── Alertas de dieta ───────────────────────────────────────────────────
    alert_acidosis: {
        label: 'Riesgo acidosis',
        plain: 'La dieta tiene poca fibra y mucho cereal. El rumen baja de pH, el animal deja de comer y enferma. Solución: añadir paja o forraje y subir tampones.',
    },
    alert_bloat: {
        label: 'Riesgo meteorismo',
        plain: 'Demasiada leguminosa fresca (alfalfa, trébol) en verde puro. El rumen se hincha. Solución: pastorear con cereal/gramínea o usar aceite anti-meteorismo.',
    },
    alert_bellota_fiber: {
        label: 'Falta fibra en montanera',
        plain: 'La bellota no aporta fibra efectiva. Si solo come acorn, el rumen falla. Necesita pasto o paja siempre disponibles.',
    },
    alert_bellota_protein: {
        label: 'Déficit proteico en montanera',
        plain: 'La bellota es muy energética pero baja en proteína. Si quieres que crezca músculo, suplementa con torta de soja o girasol.',
    },
    alert_low_n_eff: {
        label: 'Déficit proteína',
        plain: 'Está comiendo menos proteína de la que necesita. Dejará de crecer. Solución: añadir proteaginosa (soja, guisante, alfalfa).',
    },
    alert_high_pollution: {
        label: 'Exceso de proteína',
        plain: 'Le sobra proteína. La elimina por orina como nitrógeno (cuesta dinero y contamina). Solución: reducir proteaginosas.',
    },
};

export function glossary(key: string): GlossaryEntry | undefined {
    return G[key];
}

export const GLOSSARY = G;
