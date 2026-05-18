import { describe, it, expect } from 'vitest';
import { CorralSchema, CropRotationSchema } from '@/app/lib/schemas';

// Tests de la separación conceptual Corral ↔ CropPlot:
//   - El Corral admite linkedPlotId opcional para el caso "cercado de
//     pastoreo sobre pradera sembrada".
//   - El destino productivo se decide por siembra, no por parcela, así que
//     se valida en CropRotation.
//
// Estas pruebas blindan la separación: si alguien cambia el schema de un
// lado, los tests del otro lado siguen funcionando.

describe('CorralSchema · linkedPlotId opcional', () => {
    it('acepta un corral sin parcela vinculada (pasto natural)', () => {
        const r = CorralSchema.safeParse({
            farmId: 'farm-1', name: 'Cercado Norte', kind: 'pasto',
        });
        expect(r.success).toBe(true);
    });

    it('acepta linkedPlotId cuando el corral es pasto_mejorado', () => {
        const r = CorralSchema.safeParse({
            farmId: 'farm-1', name: 'Cercado Alfalfa', kind: 'pasto_mejorado',
            linkedPlotId: 'plot-42',
        });
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.linkedPlotId).toBe('plot-42');
    });

    it('acepta linkedPlotId = null para desvincular', () => {
        const r = CorralSchema.safeParse({
            farmId: 'farm-1', name: 'Cercado Norte', kind: 'pasto_mejorado',
            linkedPlotId: null,
        });
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.linkedPlotId).toBeNull();
    });

    it('rechaza kind inválido', () => {
        const r = CorralSchema.safeParse({
            farmId: 'farm-1', name: 'X', kind: 'futbolín',
        });
        expect(r.success).toBe(false);
    });

    it('campo legacy currentCrop sigue admitido (retro-compat)', () => {
        const r = CorralSchema.safeParse({
            farmId: 'farm-1', name: 'C', kind: 'pasto_mejorado',
            currentCrop: 'Alfalfa (legacy)',
        });
        expect(r.success).toBe(true);
    });
});

describe('CropRotationSchema · destinos productivos ampliados', () => {
    const base = {
        plotId: 'plot-1',
        cropName: 'Cebada',
        sowDate: '2026-10-15',
    };

    it('acepta los 6 destinos nuevos', () => {
        for (const d of ['pastoreo_directo', 'henificacion', 'ensilado', 'grano', 'venta', 'mejora_suelo']) {
            const r = CropRotationSchema.safeParse({ ...base, destinationFor: d });
            expect(r.success, `destino ${d}`).toBe(true);
        }
    });

    it('mantiene consumo_animal como valor legacy (retro-compat)', () => {
        const r = CropRotationSchema.safeParse({ ...base, destinationFor: 'consumo_animal' });
        expect(r.success).toBe(true);
    });

    it('rechaza destino inválido', () => {
        const r = CropRotationSchema.safeParse({ ...base, destinationFor: 'cosecharlo' });
        expect(r.success).toBe(false);
    });

    it('destinationFor es opcional', () => {
        const r = CropRotationSchema.safeParse(base);
        expect(r.success).toBe(true);
    });

    it('exige sowDate válida', () => {
        const r = CropRotationSchema.safeParse({
            plotId: 'p', cropName: 'C', sowDate: 'no-es-fecha',
        });
        expect(r.success).toBe(false);
    });
});

// El concepto clave a defender con tests es:
//   - Corral describe DÓNDE ESTÁ EL GANADO
//   - CropPlot describe DÓNDE CRECE LA COMIDA
//   - linkedPlotId es la única vía de unión, y solo aplica a corrales de
//     pasto sembrado. Tests más completos requieren mocking de Prisma.

describe('Conceptos en glosario', () => {
    it('el glosario distingue corral y parcela', async () => {
        const { glossary } = await import('@/lib/glossary');
        expect(glossary('corral_concept')?.plain).toMatch(/donde está el ganado/i);
        expect(glossary('plot_concept')?.plain).toMatch(/crece la comida/i);
        expect(glossary('corral_plot_link')?.plain).toMatch(/vincul/i);
    });

    it('el glosario documenta los 6 destinos productivos', async () => {
        const { glossary } = await import('@/lib/glossary');
        for (const k of ['destination_pastoreo', 'destination_henificacion', 'destination_ensilado', 'destination_grano', 'destination_venta', 'destination_mejora_suelo']) {
            const entry = glossary(k);
            expect(entry, `falta ${k}`).toBeDefined();
            expect(entry?.plain.length).toBeGreaterThan(20);
        }
    });
});
