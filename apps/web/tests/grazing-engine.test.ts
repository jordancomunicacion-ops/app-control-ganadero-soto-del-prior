import { describe, it, expect } from 'vitest';
import {
    parcelKeyOf,
    computeStockingByParcel,
    restPeriodsByPlot,
    grazingPressure,
    animalGrazingHistory,
    stockingStatus,
    type GrazingEventLike,
} from '@/services/grazingEngine';

const NOW = new Date('2026-05-20T10:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const baseEvent = (over: Partial<GrazingEventLike>): GrazingEventLike => ({
    id: 'E',
    animalId: null,
    corralId: null,
    cropPlotId: null,
    sigpacRef: null,
    startAt: daysAgo(30),
    endAt: null,
    areaHa: null,
    lu: null,
    ...over,
});

describe('parcelKeyOf', () => {
    it('prefiere cropPlot sobre corral y sigpac', () => {
        const e = baseEvent({
            cropPlotId: 'P1',
            corralId: 'C1',
            sigpacRef: '31/099/5/142/3',
        });
        expect(parcelKeyOf(e)?.key).toBe('P1');
        expect(parcelKeyOf(e)?.kind).toBe('cropPlot');
    });
    it('cae a corral si no hay plot', () => {
        const e = baseEvent({ corralId: 'C1', sigpacRef: '31/099/5/142/3' });
        expect(parcelKeyOf(e)?.kind).toBe('corral');
    });
    it('cae a sigpac si no hay plot ni corral', () => {
        const e = baseEvent({ sigpacRef: '31/099/5/142/3' });
        expect(parcelKeyOf(e)?.kind).toBe('sigpac');
    });
    it('null si no hay ninguna referencia', () => {
        expect(parcelKeyOf(baseEvent({}))).toBeNull();
    });
});

describe('computeStockingByParcel', () => {
    it('cuenta solo eventos activos en NOW', () => {
        const events: GrazingEventLike[] = [
            baseEvent({ id: 'A', cropPlotId: 'P1', animalId: 'V1', startAt: daysAgo(10) }),
            baseEvent({ id: 'B', cropPlotId: 'P1', animalId: 'V2', startAt: daysAgo(5) }),
            baseEvent({
                id: 'C',
                cropPlotId: 'P1',
                animalId: 'V3',
                startAt: daysAgo(20),
                endAt: daysAgo(15),
            }),
        ];
        const s = computeStockingByParcel(events, NOW);
        expect(s).toHaveLength(1);
        expect(s[0].activeAnimals).toBe(2);
        expect(s[0].activeLU).toBe(2);
    });

    it('LU/ha solo se calcula si hay areaHa', () => {
        const events: GrazingEventLike[] = [
            baseEvent({ cropPlotId: 'P1', animalId: 'V1', areaHa: 5, lu: 5 }),
        ];
        const s = computeStockingByParcel(events, NOW);
        expect(s[0].luPerHa).toBe(1);
    });

    it('agrega varios eventos en la misma parcela', () => {
        const events: GrazingEventLike[] = [
            baseEvent({ cropPlotId: 'P1', animalId: 'V1', areaHa: 5, lu: 1 }),
            baseEvent({ cropPlotId: 'P1', animalId: 'V2', areaHa: 5, lu: 1 }),
            baseEvent({ cropPlotId: 'P1', animalId: 'V3', areaHa: 5, lu: 1 }),
        ];
        const s = computeStockingByParcel(events, NOW);
        expect(s[0].activeLU).toBe(3);
        expect(s[0].luPerHa).toBe(0.6);
    });
});

describe('restPeriodsByPlot', () => {
    it('detecta gap entre eventos consecutivos', () => {
        const events: GrazingEventLike[] = [
            baseEvent({
                cropPlotId: 'P1',
                startAt: daysAgo(60),
                endAt: daysAgo(50),
            }),
            baseEvent({
                cropPlotId: 'P1',
                startAt: daysAgo(20),
                endAt: daysAgo(10),
            }),
        ];
        const rests = restPeriodsByPlot(events, 'P1', NOW);
        expect(rests).toHaveLength(2); // gap 50-20 + descanso vigente 10→now
        expect(rests[0].days).toBe(30);
        expect(rests[1].days).toBe(10);
    });

    it('si la parcela está activa, no añade descanso vigente', () => {
        const events: GrazingEventLike[] = [
            baseEvent({ cropPlotId: 'P1', startAt: daysAgo(5) }), // sigue abierto
        ];
        expect(restPeriodsByPlot(events, 'P1', NOW)).toHaveLength(0);
    });
});

describe('grazingPressure', () => {
    it('cuenta días pastoreados solapados con el periodo', () => {
        const events: GrazingEventLike[] = [
            baseEvent({
                cropPlotId: 'P1',
                areaHa: 10,
                lu: 10,
                startAt: daysAgo(45),
                endAt: daysAgo(35),
            }),
            baseEvent({
                cropPlotId: 'P1',
                areaHa: 10,
                lu: 10,
                startAt: daysAgo(15),
                endAt: daysAgo(5),
            }),
        ];
        const p = grazingPressure(events, 'P1', daysAgo(60), NOW);
        expect(p.daysGrazed).toBeCloseTo(20, 1);
        expect(p.daysRested).toBeCloseTo(40, 1);
        expect(p.luDays).toBeCloseTo(200, 1);
        expect(p.averageLUperHa).toBeCloseTo(1, 2);
        expect(p.pressureRatio).toBeCloseTo(20 / 60, 2);
    });

    it('eventos sin solape con el periodo no cuentan', () => {
        const events: GrazingEventLike[] = [
            baseEvent({
                cropPlotId: 'P1',
                startAt: daysAgo(200),
                endAt: daysAgo(180),
            }),
        ];
        const p = grazingPressure(events, 'P1', daysAgo(60), NOW);
        expect(p.daysGrazed).toBe(0);
    });
});

describe('animalGrazingHistory', () => {
    it('agrega días por parcela y calcula sharePct', () => {
        const events: GrazingEventLike[] = [
            baseEvent({
                animalId: 'V1',
                cropPlotId: 'P1',
                startAt: daysAgo(30),
                endAt: daysAgo(20),
            }),
            baseEvent({
                animalId: 'V1',
                cropPlotId: 'P2',
                startAt: daysAgo(15),
                endAt: daysAgo(10),
            }),
        ];
        const h = animalGrazingHistory('V1', events, daysAgo(60), NOW);
        expect(h).toHaveLength(2);
        const totalDays = h.reduce((a, b) => a + b.totalDays, 0);
        expect(totalDays).toBeCloseTo(15, 1);
        const sumPct = h.reduce((a, b) => a + b.sharePct, 0);
        expect(sumPct).toBeCloseTo(100, 1);
    });

    it('incluye eventos colectivos del lote', () => {
        const own: GrazingEventLike[] = [
            baseEvent({
                animalId: 'V1',
                cropPlotId: 'P1',
                startAt: daysAgo(20),
                endAt: daysAgo(10),
            }),
        ];
        const collective: GrazingEventLike[] = [
            baseEvent({
                animalId: null,
                cropPlotId: 'P2',
                startAt: daysAgo(60),
                endAt: daysAgo(40),
            }),
        ];
        const h = animalGrazingHistory('V1', own, daysAgo(90), NOW, collective);
        expect(h.map((p) => p.parcelKey).sort()).toEqual(['P1', 'P2']);
    });
});

describe('stockingStatus', () => {
    it('verde por debajo del 100 %', () => {
        expect(stockingStatus(0.4, 0.5)).toBe('verde');
    });
    it('ámbar entre 100 % y 120 %', () => {
        expect(stockingStatus(0.55, 0.5)).toBe('ambar');
    });
    it('rojo por encima del 120 %', () => {
        expect(stockingStatus(0.7, 0.5)).toBe('rojo');
    });
    it('sin_dato si falta capacidad', () => {
        expect(stockingStatus(0.4, 0)).toBe('sin_dato');
        expect(stockingStatus(null, 0.5)).toBe('sin_dato');
    });
});
