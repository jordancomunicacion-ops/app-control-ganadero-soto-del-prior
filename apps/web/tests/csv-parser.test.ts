import { describe, it, expect } from 'vitest';
import {
    parseCSV,
    detectSeparator,
    parseNumberSmart,
    parseDateSmart,
    normalizeHeader,
} from '@/services/csvParser';

describe('detectSeparator', () => {
    it('prefiere coma cuando hay más comas', () => {
        expect(detectSeparator('a,b,c')).toBe(',');
    });
    it('detecta punto y coma (CSV europeo)', () => {
        expect(detectSeparator('a;b;c')).toBe(';');
    });
    it('detecta tabuladores', () => {
        expect(detectSeparator('a\tb\tc')).toBe('\t');
    });
});

describe('normalizeHeader', () => {
    it('aplana espacios, mayúsculas y tildes', () => {
        expect(normalizeHeader('Fecha Pesaje')).toBe('fecha_pesaje');
        expect(normalizeHeader('Peso (kg)')).toBe('peso_kg');
    });
});

describe('parseCSV', () => {
    it('parsea CSV con coma', () => {
        const r = parseCSV('crotal,peso,fecha\nES01,420,2026-04-15');
        expect(r.headers).toEqual(['crotal', 'peso', 'fecha']);
        expect(r.rows).toHaveLength(1);
        expect(r.rows[0].crotal).toBe('ES01');
        expect(r.rows[0].peso).toBe('420');
    });

    it('parsea CSV europeo con punto y coma', () => {
        const r = parseCSV('Crotal;Peso (kg);Fecha\nES010122345678;420,5;15/04/2026');
        expect(r.separator).toBe(';');
        expect(r.rows[0].peso_kg).toBe('420,5');
        expect(r.rows[0].fecha).toBe('15/04/2026');
    });

    it('soporta comillas con separador interno', () => {
        const r = parseCSV('crotal,nombre\nES01,"García, S.L."');
        expect(r.rows[0].nombre).toBe('García, S.L.');
    });

    it('ignora líneas en blanco y BOM', () => {
        const r = parseCSV('﻿crotal,peso\nES01,300\n\nES02,310');
        expect(r.rows).toHaveLength(2);
        expect(r.rows[0].crotal).toBe('ES01');
        expect(r.rows[1].crotal).toBe('ES02');
    });
});

describe('parseNumberSmart', () => {
    it('reconoce números europeos con coma decimal', () => {
        expect(parseNumberSmart('420,5')).toBe(420.5);
        expect(parseNumberSmart('1.234,56')).toBe(1234.56);
    });
    it('reconoce números anglosajones', () => {
        expect(parseNumberSmart('420.5')).toBe(420.5);
        expect(parseNumberSmart('1,234.56')).toBe(1234.56);
    });
    it('NaN para strings inválidos', () => {
        expect(Number.isNaN(parseNumberSmart('xx'))).toBe(true);
        expect(Number.isNaN(parseNumberSmart(''))).toBe(true);
    });
});

describe('parseDateSmart', () => {
    it('parsea dd/mm/yyyy español', () => {
        const d = parseDateSmart('15/04/2026');
        expect(d?.getFullYear()).toBe(2026);
        expect(d?.getMonth()).toBe(3); // abril = 3 (0-indexed)
        expect(d?.getDate()).toBe(15);
    });
    it('parsea ISO yyyy-mm-dd', () => {
        const d = parseDateSmart('2026-04-15');
        expect(d?.getMonth()).toBe(3);
    });
    it('expande dd/mm/yy a 20yy', () => {
        const d = parseDateSmart('15/04/26');
        expect(d?.getFullYear()).toBe(2026);
    });
    it('null para fechas inválidas', () => {
        expect(parseDateSmart('')).toBeNull();
        expect(parseDateSmart('xxx')).toBeNull();
    });
});
