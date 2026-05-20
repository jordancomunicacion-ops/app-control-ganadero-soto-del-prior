/**
 * csvParser — Parser CSV minimalista y tolerante.
 *
 * Diseñado para importar exportaciones reales de campo (básculas
 * electrónicas, hojas de cálculo del ganadero, exportes de cooperativa)
 * que llegan con distintas convenciones:
 *
 *   - Separadores: `,` o `;` (mayoritario en CSV europeo).
 *   - Comillas dobles para campos con separador interno.
 *   - Saltos de línea CR / LF / CRLF.
 *   - Líneas vacías y BOM al principio se ignoran.
 *
 * Detecta el separador automáticamente (mayor número de ocurrencias en
 * la primera línea). El usuario puede forzar otro.
 *
 * Devuelve filas como objetos con las cabeceras normalizadas (trim +
 * lowercase + sin tildes) para que el mapeo de columnas sea robusto.
 *
 * También se exportan parsers de fechas y números españoles que cubren
 * los formatos habituales (dd/mm/yyyy, 1.234,56).
 */

export type CSVRow = Record<string, string>;

export interface ParseResult {
    headers: string[];
    rows: CSVRow[];
    separator: string;
}

export function detectSeparator(line: string): string {
    const commas = (line.match(/,/g) || []).length;
    const semis = (line.match(/;/g) || []).length;
    const tabs = (line.match(/\t/g) || []).length;
    if (tabs >= commas && tabs >= semis && tabs > 0) return '\t';
    return semis > commas ? ';' : ',';
}

/** Quita BOM, normaliza saltos de línea. */
function normalize(raw: string): string {
    let s = raw;
    if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
    return s.replace(/\r\n?/g, '\n');
}

/** Tokeniza una línea CSV respetando comillas dobles. */
function tokenizeLine(line: string, sep: string): string[] {
    const tokens: string[] = [];
    let buf = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"') {
                if (line[i + 1] === '"') {
                    buf += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                buf += ch;
            }
        } else if (ch === '"') {
            inQuotes = true;
        } else if (ch === sep) {
            tokens.push(buf);
            buf = '';
        } else {
            buf += ch;
        }
    }
    tokens.push(buf);
    return tokens;
}

/** Normaliza un header: lowercase, sin tildes ni espacios extra. */
export function normalizeHeader(header: string): string {
    return header
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '') // tildes
        .replace(/[^a-z0-9_]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

export function parseCSV(raw: string, separator?: string): ParseResult {
    const text = normalize(raw).trim();
    if (!text) return { headers: [], rows: [], separator: ',' };

    const firstNewline = text.indexOf('\n');
    const firstLine = firstNewline >= 0 ? text.slice(0, firstNewline) : text;
    const sep = separator ?? detectSeparator(firstLine);

    const lines = text.split('\n').filter((l) => l.trim() !== '');
    if (lines.length === 0) return { headers: [], rows: [], separator: sep };

    const headersRaw = tokenizeLine(lines[0], sep).map((h) => h.trim());
    const headers = headersRaw.map(normalizeHeader);

    const rows: CSVRow[] = [];
    for (let i = 1; i < lines.length; i++) {
        const cells = tokenizeLine(lines[i], sep);
        const row: CSVRow = {};
        for (let j = 0; j < headers.length; j++) {
            row[headers[j]] = (cells[j] ?? '').trim();
        }
        rows.push(row);
    }
    return { headers, rows, separator: sep };
}

// ─── PARSERS AUXILIARES (números, fechas) ──────────────────────────────────────

/**
 * Parsea un número con formato europeo (`1.234,56`) o anglosajón
 * (`1,234.56` o `1234.56`). Devuelve NaN si no se puede convertir.
 */
export function parseNumberSmart(raw: string): number {
    if (raw == null) return NaN;
    const s = String(raw).trim().replace(/\s/g, '');
    if (!s) return NaN;
    // Caso europeo: hay coma decimal (1.234,56 o 234,5)
    const hasComma = s.includes(',');
    const hasDot = s.includes('.');
    if (hasComma && hasDot) {
        // Si la coma viene después del último punto → europeo.
        const lastComma = s.lastIndexOf(',');
        const lastDot = s.lastIndexOf('.');
        if (lastComma > lastDot) {
            return Number(s.replace(/\./g, '').replace(',', '.'));
        }
        return Number(s.replace(/,/g, ''));
    }
    if (hasComma) {
        return Number(s.replace(',', '.'));
    }
    return Number(s);
}

/**
 * Parsea fechas en formatos comunes:
 *   - dd/mm/yyyy   dd-mm-yyyy   dd.mm.yyyy
 *   - yyyy-mm-dd   yyyy/mm/dd
 *   - dd/mm/yy (se asume 20yy)
 * Devuelve Date o null si no se reconoce.
 */
export function parseDateSmart(raw: string): Date | null {
    if (!raw) return null;
    const s = String(raw).trim();
    if (!s) return null;

    // ISO simple
    const iso = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(s);
    if (iso) {
        const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
        return isNaN(d.getTime()) ? null : d;
    }
    // Español dd/mm/yyyy
    const eu = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/.exec(s);
    if (eu) {
        const day = Number(eu[1]);
        const month = Number(eu[2]);
        let year = Number(eu[3]);
        if (year < 100) year += 2000;
        const d = new Date(year, month - 1, day);
        return isNaN(d.getTime()) ? null : d;
    }
    // Fallback al constructor por si llega un timestamp serializado
    const fallback = new Date(s);
    return isNaN(fallback.getTime()) ? null : fallback;
}
