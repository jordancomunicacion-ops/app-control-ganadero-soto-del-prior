import { describe, it, expect } from 'vitest';
import { parseSpanishCrotal } from '@/components/DIBScanner';

// El crotal oficial español tiene formato `ES` + 12 dígitos. Estos tests
// cubren las variantes habituales que aparecen tanto al escanear como al
// teclear: con espacios, con prefijo extra, con texto a su alrededor.

describe('parseSpanishCrotal', () => {
    it('reconoce el formato canónico ES + 12 dígitos', () => {
        expect(parseSpanishCrotal('ES010122345678')).toBe('ES010122345678');
    });

    it('admite espacios entre grupos', () => {
        expect(parseSpanishCrotal('ES 01 01 22345678')).toBe('ES010122345678');
        expect(parseSpanishCrotal('ES 010122 345678')).toBe('ES010122345678');
    });

    it('admite minúsculas y normaliza el prefijo', () => {
        expect(parseSpanishCrotal('es010122345678')).toBe('ES010122345678');
    });

    it('extrae el crotal cuando viene rodeado de texto (lectura QR DIB)', () => {
        const dibText = 'CROTAL ES010122345678 RAZA AVILEÑA';
        expect(parseSpanishCrotal(dibText)).toBe('ES010122345678');
    });

    it('devuelve null si no hay 12 dígitos detrás de ES', () => {
        expect(parseSpanishCrotal('ES12345')).toBeNull();
        expect(parseSpanishCrotal('FR010122345678')).toBeNull();
        expect(parseSpanishCrotal('')).toBeNull();
    });

    it('no confunde con otros prefijos europeos', () => {
        expect(parseSpanishCrotal('FR010122345678')).toBeNull();
        expect(parseSpanishCrotal('PT010122345678')).toBeNull();
    });

    it('toma siempre los primeros 12 dígitos si vienen más', () => {
        // Algunos códigos de barras añaden checksum extra al final.
        expect(parseSpanishCrotal('ES0101223456789999')).toBe('ES010122345678');
    });
});
