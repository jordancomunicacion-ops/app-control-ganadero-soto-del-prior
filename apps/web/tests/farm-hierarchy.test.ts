import { describe, it, expect } from 'vitest';
import { FarmSchema } from '@/app/lib/schemas';

// Tests de la jerarquía de fincas:
//   - Schema admite parentFarmId opcional (string | null | undefined)
//   - Una finca principal es la que tiene parentFarmId = null/undefined
//   - Las fincas asociadas tienen parentFarmId apuntando a una principal
//
// Validaciones de negocio (auto-referencia, ciclos) viven en farm-actions.ts
// y requieren mock de Prisma. Aquí solo blindamos el schema y el glosario.

describe('FarmSchema · parentFarmId', () => {
    const base = { name: 'Finca Test' };

    it('una finca principal puede omitir parentFarmId', () => {
        const r = FarmSchema.safeParse(base);
        expect(r.success).toBe(true);
    });

    it('una finca asociada lleva parentFarmId como string', () => {
        const r = FarmSchema.safeParse({ ...base, parentFarmId: 'farm-main-1' });
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.parentFarmId).toBe('farm-main-1');
    });

    it('parentFarmId acepta null para desvincular', () => {
        const r = FarmSchema.safeParse({ ...base, parentFarmId: null });
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.parentFarmId).toBeNull();
    });

    it('rechaza parentFarmId con tipo incorrecto', () => {
        const r = FarmSchema.safeParse({ ...base, parentFarmId: 123 });
        expect(r.success).toBe(false);
    });
});

describe('Glosario · jerarquía de fincas', () => {
    it('el glosario explica finca principal y asociada', async () => {
        const { glossary } = await import('@/lib/glossary');
        expect(glossary('farm_main')?.plain).toMatch(/ganado/i);
        expect(glossary('farm_associated')?.plain).toMatch(/(abastece|aliment)/i);
        const sigpac = glossary('sigpac_unified');
        expect(sigpac?.label).toMatch(/SIGPAC/);
        expect(sigpac?.plain).toMatch(/(provincia|polígono|parcela|catastro)/i);
    });
});
