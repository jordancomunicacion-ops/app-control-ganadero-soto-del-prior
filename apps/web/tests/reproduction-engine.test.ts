import { describe, it, expect } from 'vitest';
import {
    evaluateFemale,
    farmReproductionMetrics,
    sireFertility,
    reproductiveRadar,
    type RepEvent,
    type AnimalSummary,
} from '@/services/reproductionEngine';

const NOW = new Date('2026-05-20T10:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const baseFemale = (over: Partial<AnimalSummary>): AnimalSummary => ({
    id: 'V1',
    sex: 'H',
    birthDate: new Date('2020-01-01'),
    status: 'activo',
    ...over,
});

const event = (over: Partial<RepEvent>): RepEvent => ({
    id: 'E',
    animalId: 'V1',
    type: 'celo',
    date: NOW,
    data: null,
    ...over,
});

describe('evaluateFemale', () => {
    it('Macho devuelve desconocido', () => {
        const r = evaluateFemale(baseFemale({ sex: 'M' }), []);
        expect(r.status).toBe('desconocido');
    });

    it('Sin parto histórico → novilla', () => {
        const r = evaluateFemale(baseFemale({}), []);
        expect(r.status).toBe('novilla');
    });

    it('Con parto y sin servicio nuevo → vacía con daysOpen contando desde parto', () => {
        const events: RepEvent[] = [
            event({ type: 'parto', date: daysAgo(60) }),
        ];
        const r = evaluateFemale(baseFemale({}), events, NOW);
        expect(r.status).toBe('vacia');
        expect(r.lastParto).toBeDefined();
        expect(r.daysOpen).toBeCloseTo(60, 0);
    });

    it('Parto + servicio + diagnóstico positivo → gestante', () => {
        const events: RepEvent[] = [
            event({ type: 'parto', date: daysAgo(120) }),
            event({
                type: 'inseminacion',
                date: daysAgo(40),
                data: { sireId: 'TORO_42' },
            }),
            event({
                type: 'diagnostico_gestacion',
                date: daysAgo(10),
                data: { result: 'positivo' },
            }),
        ];
        const r = evaluateFemale(baseFemale({}), events, NOW);
        expect(r.status).toBe('gestante');
        expect(r.lastServicio?.sireId).toBe('TORO_42');
        expect(r.daysOpen).toBeCloseTo(80, 0); // 120-40
        expect(r.estimatedCalvingDate).toBeDefined();
    });

    it('Diagnóstico positivo seguido de aborto → vacía', () => {
        const events: RepEvent[] = [
            event({ type: 'parto', date: daysAgo(180) }),
            event({ type: 'inseminacion', date: daysAgo(100) }),
            event({
                type: 'diagnostico_gestacion',
                date: daysAgo(60),
                data: { result: 'positivo' },
            }),
            event({ type: 'aborto', date: daysAgo(30) }),
        ];
        const r = evaluateFemale(baseFemale({}), events, NOW);
        expect(r.status).toBe('vacia');
    });

    it('Diagnóstico negativo no marca como gestante', () => {
        const events: RepEvent[] = [
            event({ type: 'parto', date: daysAgo(180) }),
            event({ type: 'inseminacion', date: daysAgo(100) }),
            event({
                type: 'diagnostico_gestacion',
                date: daysAgo(60),
                data: { result: 'negativo' },
            }),
        ];
        const r = evaluateFemale(baseFemale({}), events, NOW);
        expect(r.status).toBe('vacia');
    });

    it('Estimated calving date = servicio + 283 días', () => {
        const events: RepEvent[] = [
            event({ type: 'inseminacion', date: daysAgo(50) }),
            event({
                type: 'diagnostico_gestacion',
                date: daysAgo(20),
                data: { result: 'positivo' },
            }),
        ];
        const r = evaluateFemale(baseFemale({}), events, NOW);
        expect(r.estimatedCalvingDate).toBeDefined();
        const expectedDays = (r.estimatedCalvingDate!.getTime() - daysAgo(50).getTime()) / 86_400_000;
        expect(expectedDays).toBeCloseTo(283, 0);
    });
});

describe('farmReproductionMetrics', () => {
    it('calcula tasa de preñez agregada', () => {
        const animals: AnimalSummary[] = [
            baseFemale({ id: 'V1' }),
            baseFemale({ id: 'V2' }),
            baseFemale({ id: 'V3' }),
        ];
        const events: RepEvent[] = [
            // V1 gestante
            event({ animalId: 'V1', type: 'parto', date: daysAgo(200) }),
            event({ animalId: 'V1', type: 'inseminacion', date: daysAgo(80) }),
            event({
                animalId: 'V1',
                type: 'diagnostico_gestacion',
                date: daysAgo(40),
                data: { result: 'positivo' },
            }),
            // V2 vacía con parto
            event({ animalId: 'V2', type: 'parto', date: daysAgo(120) }),
            // V3 novilla (sin parto)
        ];
        const m = farmReproductionMetrics(animals, events, NOW);
        expect(m.breedingFemales).toBe(3);
        expect(m.pregnant).toBe(1);
        expect(m.empty).toBe(1);
        expect(m.heifers).toBe(1);
        expect(m.pregnancyRatePct).toBeCloseTo(33.33, 1);
    });

    it('calcula edad al primer parto', () => {
        const animals: AnimalSummary[] = [
            baseFemale({ id: 'V1', birthDate: new Date('2023-01-01') }),
        ];
        const events: RepEvent[] = [
            event({ animalId: 'V1', type: 'parto', date: new Date('2025-08-01') }),
        ];
        const m = farmReproductionMetrics(animals, events, NOW);
        expect(m.edadPrimerPartoMeses).toBeCloseTo(31, 0); // ~31 meses
    });

    it('calcula IEP entre partos consecutivos', () => {
        const animals: AnimalSummary[] = [baseFemale({ id: 'V1' })];
        const events: RepEvent[] = [
            event({ animalId: 'V1', type: 'parto', date: new Date('2024-01-15') }),
            event({ animalId: 'V1', type: 'parto', date: new Date('2025-02-10') }),
        ];
        const m = farmReproductionMetrics(animals, events, NOW);
        expect(m.iepDias).toBeCloseTo(392, 0);
    });

    it('ignora hembras de < 15 meses como no reproductoras', () => {
        const animals: AnimalSummary[] = [
            baseFemale({ id: 'V1', birthDate: daysAgo(200) }), // ~7 meses
        ];
        const m = farmReproductionMetrics(animals, [], NOW);
        expect(m.breedingFemales).toBe(0);
    });

    it('ignora animales en estado inactivo', () => {
        const animals: AnimalSummary[] = [
            baseFemale({ id: 'V1', status: 'vendido' }),
            baseFemale({ id: 'V2' }),
        ];
        const m = farmReproductionMetrics(animals, [], NOW);
        expect(m.breedingFemales).toBe(1);
    });
});

describe('sireFertility', () => {
    it('cuenta servicios y gestaciones por sireId', () => {
        const events: RepEvent[] = [
            event({
                animalId: 'V1',
                type: 'inseminacion',
                date: daysAgo(120),
                data: { sireId: 'TORO_A' },
            }),
            event({
                animalId: 'V1',
                type: 'diagnostico_gestacion',
                date: daysAgo(80),
                data: { result: 'positivo' },
            }),
            event({
                animalId: 'V2',
                type: 'inseminacion',
                date: daysAgo(100),
                data: { sireId: 'TORO_A' },
            }),
            event({
                animalId: 'V2',
                type: 'diagnostico_gestacion',
                date: daysAgo(60),
                data: { result: 'negativo' },
            }),
            event({
                animalId: 'V3',
                type: 'inseminacion',
                date: daysAgo(90),
                data: { sireId: 'TORO_B' },
            }),
        ];
        const result = sireFertility(events);
        const a = result.find((r) => r.sireId === 'TORO_A')!;
        const b = result.find((r) => r.sireId === 'TORO_B')!;
        expect(a.services).toBe(2);
        expect(a.confirmedPregnancies).toBe(1);
        expect(a.pregnancyRatePct).toBe(50);
        expect(b.services).toBe(1);
        expect(b.confirmedPregnancies).toBe(0);
    });

    it('agrupa servicios sin sireId como "desconocido"', () => {
        const events: RepEvent[] = [
            event({ animalId: 'V1', type: 'inseminacion', date: daysAgo(60) }),
        ];
        const result = sireFertility(events);
        expect(result[0].sireId).toBe('desconocido');
    });
});

describe('reproductiveRadar', () => {
    it('todos los ejes normalizados entre 0 y 1', () => {
        const radar = reproductiveRadar({
            breedingFemales: 50,
            pregnant: 40,
            empty: 8,
            heifers: 2,
            pregnancyRatePct: 80,
            averageDaysOpen: 95,
            iepDias: 370,
            edadPrimerPartoMeses: 29,
            replacementRatePct: 20,
            avgPartoConcepcion: 95,
        });
        expect(radar).toHaveLength(6);
        for (const p of radar) {
            expect(p.score).toBeGreaterThanOrEqual(0);
            expect(p.score).toBeLessThanOrEqual(1);
        }
    });

    it('métricas excelentes dan scores cercanos a 1', () => {
        const radar = reproductiveRadar({
            breedingFemales: 50,
            pregnant: 50,
            empty: 0,
            heifers: 0,
            pregnancyRatePct: 95,
            averageDaysOpen: 80,
            iepDias: 360,
            edadPrimerPartoMeses: 26,
            replacementRatePct: 30,
            avgPartoConcepcion: 80,
        });
        const preg = radar.find((r) => r.axis === 'Tasa preñez')!;
        expect(preg.score).toBeGreaterThan(0.8);
    });

    it('métricas pésimas dan scores cercanos a 0', () => {
        const radar = reproductiveRadar({
            breedingFemales: 50,
            pregnant: 10,
            empty: 30,
            heifers: 10,
            pregnancyRatePct: 20,
            averageDaysOpen: 220,
            iepDias: 500,
            edadPrimerPartoMeses: 45,
            replacementRatePct: 2,
            avgPartoConcepcion: null,
        });
        for (const p of radar) {
            if (p.axis !== 'Gestantes/vacas') {
                expect(p.score).toBeLessThan(0.5);
            }
        }
    });
});
