import { describe, it, expect } from 'vitest';
import { AnimalSchema, EventSchema, FarmSchema } from '@/app/lib/schemas';

// ─── AnimalSchema ─────────────────────────────────────────────────────────────

describe('AnimalSchema', () => {
    const valid = {
        id: 'ES040123456789',
        farmId: 'farm-001',
        sex: 'Macho',
        birth: '2022-03-15',
    };

    it('acepta datos mínimos válidos', () => {
        expect(AnimalSchema.safeParse(valid).success).toBe(true);
    });

    it('acepta campos opcionales', () => {
        const result = AnimalSchema.safeParse({ ...valid, breed: 'Wagyu', weight: 450, notes: 'Sano' });
        expect(result.success).toBe(true);
    });

    it('convierte weight string a número', () => {
        const result = AnimalSchema.safeParse({ ...valid, weight: '350.5' });
        expect(result.success && result.data.weight).toBe(350.5);
    });

    it('falla sin id', () => {
        const result = AnimalSchema.safeParse({ ...valid, id: '' });
        expect(result.success).toBe(false);
    });

    it('falla sin farmId', () => {
        const result = AnimalSchema.safeParse({ ...valid, farmId: '' });
        expect(result.success).toBe(false);
    });

    it('falla sin sex', () => {
        const result = AnimalSchema.safeParse({ ...valid, sex: '' });
        expect(result.success).toBe(false);
    });

    it('falla con fecha de nacimiento inválida', () => {
        const result = AnimalSchema.safeParse({ ...valid, birth: 'no-es-fecha' });
        expect(result.success).toBe(false);
    });

    it('falla sin birth', () => {
        const result = AnimalSchema.safeParse({ ...valid, birth: '' });
        expect(result.success).toBe(false);
    });
});

// ─── EventSchema ─────────────────────────────────────────────────────────────

describe('EventSchema', () => {
    const valid = {
        type: 'Vacunación',
        date: '2024-06-01',
        farmId: 'farm-001',
    };

    it('acepta datos mínimos válidos', () => {
        expect(EventSchema.safeParse(valid).success).toBe(true);
    });

    it('acepta status válido', () => {
        const result = EventSchema.safeParse({ ...valid, status: 'completed' });
        expect(result.success).toBe(true);
    });

    it('rechaza status inválido', () => {
        const result = EventSchema.safeParse({ ...valid, status: 'desconocido' });
        expect(result.success).toBe(false);
    });

    it('convierte cost string a número', () => {
        const result = EventSchema.safeParse({ ...valid, cost: '120.50' });
        expect(result.success && result.data.cost).toBe(120.50);
    });

    it('falla sin type', () => {
        const result = EventSchema.safeParse({ ...valid, type: '' });
        expect(result.success).toBe(false);
    });

    it('falla con fecha inválida', () => {
        const result = EventSchema.safeParse({ ...valid, date: 'not-a-date' });
        expect(result.success).toBe(false);
    });

    it('falla sin farmId', () => {
        const result = EventSchema.safeParse({ ...valid, farmId: '' });
        expect(result.success).toBe(false);
    });

    it('acepta typeData como record', () => {
        const result = EventSchema.safeParse({ ...valid, typeData: { price: 1200, buyer: 'Acme' } });
        expect(result.success).toBe(true);
    });
});

// ─── FarmSchema ───────────────────────────────────────────────────────────────

describe('FarmSchema', () => {
    const valid = { name: 'Soto del Prior' };

    it('acepta nombre mínimo', () => {
        expect(FarmSchema.safeParse(valid).success).toBe(true);
    });

    it('falla con nombre vacío', () => {
        const result = FarmSchema.safeParse({ name: '' });
        expect(result.success).toBe(false);
    });

    it('convierte superficie string a número', () => {
        const result = FarmSchema.safeParse({ ...valid, superficie: '125.5' });
        expect(result.success && result.data.superficie).toBe(125.5);
    });

    it('convierte maxHeads string a número', () => {
        const result = FarmSchema.safeParse({ ...valid, maxHeads: '300' });
        expect(result.success && result.data.maxHeads).toBe(300);
    });

    it('acepta todos los campos opcionales', () => {
        const full = {
            ...valid,
            municipio: 'Salamanca',
            superficie: 200,
            corrals: 5,
            corralNames: ['A', 'B', 'C'],
            feedingSystem: 'extensivo',
            irrigationCoef: 0.3,
        };
        expect(FarmSchema.safeParse(full).success).toBe(true);
    });

    it('acepta recintos como array', () => {
        const result = FarmSchema.safeParse({ ...valid, recintos: [{ id: 1 }, { id: 2 }] });
        expect(result.success).toBe(true);
    });
});
