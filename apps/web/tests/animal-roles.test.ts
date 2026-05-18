import { describe, it, expect } from 'vitest';
import {
    hasGivenBirth,
    isNurseCow,
    classifyFemaleRole,
    FEMALE_ROLE_LABEL,
} from '@/lib/animal-roles';

// Reglas que blindamos:
//   - nodriza ⇔ hembra adulta con ≥1 parto registrado
//   - novilla = hembra ≥24 m que NO ha parido nunca (aunque tenga la edad
//     de una nodriza). Esta es la distinción que se nos había escapado.
//   - macho nunca es nodriza, ni siquiera con "partos" en datos sucios.
//   - parityCount tiene prioridad sobre el array de eventos cuando viene.

const now = new Date('2025-06-01T00:00:00Z');
const ageYears = (years: number) => new Date(now.getTime() - years * 365.25 * 24 * 3600 * 1000);

describe('hasGivenBirth', () => {
    it('vaca con ≥1 evento Parto → true', () => {
        expect(hasGivenBirth({
            id: 'a', sex: 'Hembra', birthDate: ageYears(5),
            events: [{ type: 'Parto', date: new Date('2024-03-01') }],
        })).toBe(true);
    });

    it('vaca sin eventos → false (aunque la edad sea reproductiva)', () => {
        expect(hasGivenBirth({
            id: 'a', sex: 'Hembra', birthDate: ageYears(6), events: [],
        })).toBe(false);
    });

    it('eventos solo de inseminación / diagnóstico no cuentan', () => {
        expect(hasGivenBirth({
            id: 'a', sex: 'Hembra', birthDate: ageYears(4),
            events: [
                { type: 'Inseminación', date: new Date('2024-01-01') },
                { type: 'Diagnóstico Gestación', date: new Date('2024-02-15') },
            ],
        })).toBe(false);
    });

    it('parityCount explícito tiene prioridad', () => {
        // events vacíos, pero parityCount=2 → true
        expect(hasGivenBirth({
            id: 'a', sex: 'Hembra', birthDate: ageYears(5), events: [], parityCount: 2,
        })).toBe(true);
        // events con partos pero parityCount=0 → false (override)
        expect(hasGivenBirth({
            id: 'a', sex: 'Hembra', birthDate: ageYears(5),
            events: [{ type: 'Parto', date: new Date('2024-01-01') }],
            parityCount: 0,
        })).toBe(false);
    });

    it('sin events ni parityCount → false', () => {
        expect(hasGivenBirth({ id: 'a', sex: 'Hembra', birthDate: ageYears(5) })).toBe(false);
    });
});

describe('isNurseCow — la regla crítica', () => {
    it('hembra adulta CON partos → nodriza', () => {
        expect(isNurseCow({
            id: 'a', sex: 'Hembra', birthDate: ageYears(6),
            events: [{ type: 'Parto', date: new Date('2024-04-04') }],
        })).toBe(true);
    });

    it('hembra adulta SIN partos NO es nodriza (es novilla)', () => {
        // Esta es la distinción que pidió el ganadero: misma edad, NO es lo mismo.
        expect(isNurseCow({
            id: 'a', sex: 'Hembra', birthDate: ageYears(6), events: [],
        })).toBe(false);
    });

    it('macho con eventos Parto en datos sucios NUNCA es nodriza', () => {
        expect(isNurseCow({
            id: 'a', sex: 'Macho', birthDate: ageYears(4),
            events: [{ type: 'Parto', date: new Date('2024-01-01') }],
        })).toBe(false);
    });

    it('animal sin sexo registrado → false', () => {
        expect(isNurseCow({
            id: 'a', sex: null, birthDate: ageYears(4), parityCount: 3,
        })).toBe(false);
    });
});

describe('classifyFemaleRole', () => {
    it('hembra de 5 años con 2 partos → nodriza', () => {
        expect(classifyFemaleRole({
            id: 'a', sex: 'Hembra', birthDate: ageYears(5), parityCount: 2,
        }, now)).toBe('nodriza');
    });

    it('hembra de 5 años SIN partos → novilla (NO nodriza)', () => {
        expect(classifyFemaleRole({
            id: 'a', sex: 'Hembra', birthDate: ageYears(5), parityCount: 0,
        }, now)).toBe('novilla');
    });

    it('hembra de 18 meses sin partos → añoja', () => {
        expect(classifyFemaleRole({
            id: 'a', sex: 'Hembra', birthDate: new Date(now.getTime() - 18 * 30.44 * 24 * 3600 * 1000),
        }, now)).toBe('anoja');
    });

    it('hembra de 9 meses → ternera', () => {
        expect(classifyFemaleRole({
            id: 'a', sex: 'Hembra', birthDate: new Date(now.getTime() - 9 * 30.44 * 24 * 3600 * 1000),
        }, now)).toBe('ternera');
    });

    it('hembra de 3 meses → becerra', () => {
        expect(classifyFemaleRole({
            id: 'a', sex: 'Hembra', birthDate: new Date(now.getTime() - 3 * 30.44 * 24 * 3600 * 1000),
        }, now)).toBe('becerra');
    });

    it('macho → null', () => {
        expect(classifyFemaleRole({
            id: 'a', sex: 'Macho', birthDate: ageYears(3),
        }, now)).toBeNull();
    });

    it('hembra sin birthDate → null', () => {
        expect(classifyFemaleRole({
            id: 'a', sex: 'Hembra', birthDate: null,
        }, now)).toBeNull();
    });
});

describe('Glosario · nodriza vs novilla', () => {
    it('explica que nodriza requiere haber parido', async () => {
        const { glossary } = await import('@/lib/glossary');
        const nurse = glossary('nurse_cow');
        expect(nurse?.plain).toMatch(/parido/i);
    });

    it('explica novilla como hembra sin partos', async () => {
        const { glossary } = await import('@/lib/glossary');
        const heifer = glossary('heifer');
        expect(heifer?.plain).toMatch(/(no.+parido|sin.+partos|todavía)/i);
    });
});

describe('FEMALE_ROLE_LABEL', () => {
    it('cubre todos los roles con etiqueta legible', () => {
        expect(FEMALE_ROLE_LABEL.nodriza).toBe('Vaca nodriza');
        expect(FEMALE_ROLE_LABEL.novilla).toBe('Novilla');
        expect(FEMALE_ROLE_LABEL.anoja).toBe('Añoja');
        expect(FEMALE_ROLE_LABEL.ternera).toBe('Ternera');
        expect(FEMALE_ROLE_LABEL.becerra).toBe('Becerra');
    });
});
