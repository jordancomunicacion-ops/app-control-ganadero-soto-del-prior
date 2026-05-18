/**
 * Definición canónica de roles reproductivos para hembras bovinas.
 *
 * Una hembra puede tener varios «roles» a lo largo de su vida, y NO son
 * sinónimos aunque mucha gente los confunda en el campo:
 *
 *   - Becerra (<6 m)
 *   - Ternera blanca / ternera (6 – 8/12 m, etapa de destete)
 *   - Añoja (12 – 24 m)
 *   - Novilla (≥24 m sin haber parido todavía — apta para cubrición)
 *   - Vaca o Vaca seca: hembra adulta. Si NUNCA ha parido se sigue
 *     considerando novilla (no es nodriza).
 *   - **Nodriza** (vaca nodriza o vaca de cría): vaca que **ya ha parido al
 *     menos una vez** y por tanto está incluida en el rebaño de cría
 *     (objetivo: producir un ternero al año).
 *
 * Distinción crítica para PAC (ayuda asociada a vaca nodriza) y para
 * indicadores reproductivos (la fertilidad sólo tiene sentido sobre nodrizas
 * + novillas en cubrición, no sobre añojas en crecimiento).
 *
 * Esta función toma la decisión a partir de eventos de tipo `Parto` en el
 * histórico — la pertenencia a la categoría textual «Nodriza» NO basta y
 * además categoria=='Vaca' tampoco implica nodriza (puede ser una novilla
 * adulta sin partos).
 */

export type FemaleRole =
    | 'becerra'
    | 'ternera'
    | 'anoja'
    | 'novilla'
    | 'nodriza';

export interface MinimalAnimalForRole {
    id: string;
    sex: string | null;
    birthDate: Date | null;
    /** Histórico de eventos del animal (puede venir ya filtrado por tipo). */
    events?: Array<{ type: string; date: Date }>;
    /** Override numérico: si se sabe el nº de partos previos, evita revisar eventos. */
    parityCount?: number;
}

/**
 * Devuelve `true` solo si la hembra ha tenido al menos un parto registrado.
 * Acepta el conteo de partos directamente (`parityCount`) o lo deriva del
 * histórico de eventos.
 */
export function hasGivenBirth(a: MinimalAnimalForRole): boolean {
    if (typeof a.parityCount === 'number') return a.parityCount > 0;
    if (!a.events) return false;
    return a.events.some((e) => e.type === 'Parto');
}

/**
 * Aplica la regla de negocio: nodriza ⇔ hembra adulta CON ≥1 parto.
 * Es la regla que debe usarse para PAC (ayuda asociada) y para distinguir
 * el rebaño productivo en informes.
 */
export function isNurseCow(a: MinimalAnimalForRole): boolean {
    if (a.sex !== 'Hembra') return false;
    return hasGivenBirth(a);
}

/**
 * Devuelve el rol predominante según edad + partos. Útil para listados y
 * para reportes individuales.
 */
export function classifyFemaleRole(a: MinimalAnimalForRole, now: Date = new Date()): FemaleRole | null {
    if (a.sex !== 'Hembra') return null;
    if (!a.birthDate) return null;
    const ageMonths = (now.getTime() - a.birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    if (hasGivenBirth(a)) return 'nodriza';
    if (ageMonths < 6) return 'becerra';
    if (ageMonths < 12) return 'ternera';
    if (ageMonths < 24) return 'anoja';
    return 'novilla';
}

/** Etiquetas en castellano para UI. */
export const FEMALE_ROLE_LABEL: Record<FemaleRole, string> = {
    becerra: 'Becerra',
    ternera: 'Ternera',
    anoja: 'Añoja',
    novilla: 'Novilla',
    nodriza: 'Vaca nodriza',
};
