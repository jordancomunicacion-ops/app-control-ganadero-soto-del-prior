/**
 * Conversión genérica de un array de filas en CSV y descarga en el navegador.
 * Separador `;` (compatible con Excel locale ES). Numéricos en formato local.
 */

export function rowsToCSV<T extends Record<string, unknown>>(
    rows: T[],
    headers?: { key: keyof T; label: string }[],
): string {
    if (rows.length === 0) return '';

    const cols = headers ?? Object.keys(rows[0]).map((k) => ({ key: k as keyof T, label: k }));
    const headerLine = cols.map((c) => escapeCsv(c.label)).join(';');
    const dataLines = rows.map((r) =>
        cols.map((c) => formatValue(r[c.key])).join(';'),
    );

    return [headerLine, ...dataLines].join('\n');
}

function escapeCsv(v: string): string {
    if (v.includes(';') || v.includes('"') || v.includes('\n')) {
        return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
}

function formatValue(v: unknown): string {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') return v.toString().replace('.', ',');
    if (v instanceof Date) return v.toISOString().split('T')[0];
    return escapeCsv(String(v));
}

export function downloadCSV(content: string, filename: string): void {
    if (typeof window === 'undefined') return;
    const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function eur(amount: number | null | undefined): string {
    if (amount === null || amount === undefined || !Number.isFinite(amount)) return '—';
    return amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}
