import { describe, it, expect } from 'vitest';
import { rowsToCSV, eur } from '@/lib/csv-export';

// Blindamos el helper que mueve los informes a CSV (Excel ES, separador `;`).
// Casos:
//   - cabecera y filas básicas
//   - escape de comillas, separador y saltos de línea
//   - numéricos en formato local (coma decimal)
//   - fechas → ISO yyyy-mm-dd
//   - filas vacías → cadena vacía (sin lanzar)
//   - eur() formatea moneda y maneja null/NaN

describe('csv-export · rowsToCSV', () => {
    it('genera cabecera y filas con separador ;', () => {
        const rows = [
            { id: 'A1', peso: 320 },
            { id: 'A2', peso: 410 },
        ];
        const csv = rowsToCSV(rows);
        const lines = csv.split('\n');
        expect(lines[0]).toBe('id;peso');
        expect(lines[1]).toBe('A1;320');
        expect(lines[2]).toBe('A2;410');
    });

    it('respeta cabeceras personalizadas', () => {
        const csv = rowsToCSV(
            [{ id: 'X', kg: 10 }],
            [
                { key: 'id', label: 'Crotal' },
                { key: 'kg', label: 'Peso (kg)' },
            ],
        );
        expect(csv.split('\n')[0]).toBe('Crotal;Peso (kg)');
    });

    it('escapa valores con ; comilla o salto de línea', () => {
        const csv = rowsToCSV([{ texto: 'Hola; mundo' }]);
        expect(csv).toContain('"Hola; mundo"');

        const csv2 = rowsToCSV([{ texto: 'Dijo "ok"' }]);
        expect(csv2).toContain('"Dijo ""ok"""');

        const csv3 = rowsToCSV([{ texto: 'línea1\nlínea2' }]);
        expect(csv3).toContain('"línea1\nlínea2"');
    });

    it('formatea decimales con coma (locale ES)', () => {
        const csv = rowsToCSV([{ valor: 12.5 }]);
        expect(csv.split('\n')[1]).toBe('12,5');
    });

    it('serializa Date como yyyy-mm-dd', () => {
        const d = new Date('2025-06-15T12:00:00Z');
        const csv = rowsToCSV([{ fecha: d }]);
        expect(csv.split('\n')[1]).toBe('2025-06-15');
    });

    it('null / undefined → celda vacía', () => {
        const csv = rowsToCSV([{ a: null, b: undefined, c: 1 }]);
        expect(csv.split('\n')[1]).toBe(';;1');
    });

    it('array vacío devuelve cadena vacía sin lanzar', () => {
        expect(rowsToCSV([])).toBe('');
    });
});

describe('csv-export · eur', () => {
    it('formatea importes como euros enteros', () => {
        const v = eur(1234);
        // El símbolo y separador dependen del runtime (Node ICU);
        // basta con verificar las cifras y el símbolo €.
        expect(v).toMatch(/1\D?234/); // 1.234 con punto o 1 234 con espacio
        expect(v).toContain('€');
    });

    it('redondea importes con decimales', () => {
        // maximumFractionDigits: 0 → 1234.5 → 1235
        expect(eur(1234.5)).toMatch(/1\D?235/);
    });

    it('null / undefined / NaN devuelven —', () => {
        expect(eur(null)).toBe('—');
        expect(eur(undefined)).toBe('—');
        expect(eur(Number.NaN)).toBe('—');
    });
});

describe('Glosario · informes y KPIs', () => {
    it('contiene entradas para los tres informes', async () => {
        const { glossary } = await import('@/lib/glossary');
        expect(glossary('report_economic')?.plain).toMatch(/ingres|coste|margen/i);
        expect(glossary('report_fcr')?.plain).toMatch(/(eficiencia|kilos|pienso)/i);
        expect(glossary('report_reproductive')?.plain).toMatch(/(fertilidad|partos|saneamiento)/i);
    });

    it('contiene KPIs derivados de los informes', async () => {
        const { glossary } = await import('@/lib/glossary');
        expect(glossary('fertility_rate')?.plain).toMatch(/inseminacion|preñad|positivo/i);
        expect(glossary('calving_interval')?.plain).toMatch(/partos|días/i);
        expect(glossary('inventory_value')?.plain).toMatch(/(canal|RC|55|7)/i);
        expect(glossary('mortality_loss')?.plain).toMatch(/(muertos|peso vivo)/i);
        expect(glossary('balance_economic')?.plain).toMatch(/(ingresos|costes|beneficio)/i);
        expect(glossary('gmd_source')?.plain).toMatch(/(pesajes|estimación|estimado)/i);
        expect(glossary('sanitary_status')?.plain).toMatch(/(brucelosis|tuberculosis|saneamiento)/i);
    });
});
