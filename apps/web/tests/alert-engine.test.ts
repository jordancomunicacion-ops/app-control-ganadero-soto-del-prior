import { describe, it, expect } from 'vitest';
import {
    ruleHembrasAParir,
    ruleSinPesar,
    rulePerdiendoPeso,
    ruleRetiroVencido,
    ruleSaneamientoProximo,
    ruleCargaExcedida,
    evaluateAll,
    DEFAULT_RULES,
    type AnimalSnap,
    type FarmSnap,
} from '@/services/alertEngine';

const NOW = new Date('2026-05-20T10:00:00Z');
const daysFromNow = (n: number) => new Date(NOW.getTime() + n * 86_400_000);
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const baseAnimal = (over: Partial<AnimalSnap>): AnimalSnap => ({
    id: 'ES001',
    sex: 'H',
    birthDate: new Date('2022-01-01'),
    ...over,
});

describe('ruleHembrasAParir', () => {
    it('detecta parto previsto a partir de cubrición', () => {
        // 282 días → parto en 1 día desde NOW (gestación bovina default 283)
        const cubri = new Date(NOW.getTime() - 282 * 86_400_000);
        const animals = [baseAnimal({ id: 'V1', lastCubricion: cubri })];
        const out = ruleHembrasAParir(animals, { daysAhead: 7 }, { now: NOW });
        expect(out).toHaveLength(1);
        expect(out[0].severity).toBe('critical'); // <= 2 días
        expect(out[0].animalId).toBe('V1');
        expect(out[0].type).toBe('hembras_a_parir');
    });

    it('ignora machos y animales con baja', () => {
        const animals = [
            baseAnimal({
                id: 'M1',
                sex: 'M',
                lastCubricion: daysAgo(280),
            }),
            baseAnimal({
                id: 'V2',
                status: 'vendido',
                lastCubricion: daysAgo(280),
            }),
        ];
        const out = ruleHembrasAParir(animals, { daysAhead: 7 }, { now: NOW });
        expect(out).toHaveLength(0);
    });

    it('no alerta si la fecha esperada cae fuera del horizonte', () => {
        const animals = [
            baseAnimal({ id: 'V1', expectedCalvingDate: daysFromNow(30) }),
        ];
        const out = ruleHembrasAParir(animals, { daysAhead: 7 }, { now: NOW });
        expect(out).toHaveLength(0);
    });
});

describe('ruleSinPesar', () => {
    it('alerta sobre animal sin peso si > 3 meses de edad', () => {
        const animals = [
            baseAnimal({ id: 'V1', birthDate: new Date('2024-01-01') }),
        ];
        const out = ruleSinPesar(animals, { daysSince: 60 }, { now: NOW });
        expect(out).toHaveLength(1);
        expect(out[0].message).toContain('Sin ningún peso');
    });

    it('alerta sobre animal con último peso > umbral', () => {
        const animals = [
            baseAnimal({
                id: 'V1',
                birthDate: new Date('2023-01-01'),
                lastWeight: { date: daysAgo(120), weightKg: 350 },
            }),
        ];
        const out = ruleSinPesar(animals, { daysSince: 60 }, { now: NOW });
        expect(out).toHaveLength(1);
        expect(out[0].message).toMatch(/120 días/);
    });

    it('ignora terneros < 3 meses', () => {
        const animals = [
            baseAnimal({ id: 'T1', birthDate: daysAgo(40) }),
        ];
        const out = ruleSinPesar(animals, { daysSince: 60 }, { now: NOW });
        expect(out).toHaveLength(0);
    });
});

describe('rulePerdiendoPeso', () => {
    it('detecta pérdida ≥ umbral en ≥ semanas mínimas', () => {
        const animals = [
            baseAnimal({
                id: 'V1',
                lastWeight: { date: NOW, weightKg: 380 },
                secondLastWeight: { date: daysAgo(21), weightKg: 420 },
            }),
        ];
        const out = rulePerdiendoPeso(
            animals,
            { weeksOfLoss: 2, thresholdPct: 5 },
            { now: NOW },
        );
        expect(out).toHaveLength(1);
        expect(out[0].severity).toBe('warning');
    });

    it('escala a critical si pérdida > 2× umbral', () => {
        const animals = [
            baseAnimal({
                id: 'V1',
                lastWeight: { date: NOW, weightKg: 350 },
                secondLastWeight: { date: daysAgo(20), weightKg: 420 },
            }),
        ];
        const out = rulePerdiendoPeso(
            animals,
            { weeksOfLoss: 2, thresholdPct: 5 },
            { now: NOW },
        );
        expect(out[0].severity).toBe('critical');
    });

    it('no alerta si intervalo < weeksOfLoss', () => {
        const animals = [
            baseAnimal({
                id: 'V1',
                lastWeight: { date: NOW, weightKg: 380 },
                secondLastWeight: { date: daysAgo(7), weightKg: 420 },
            }),
        ];
        const out = rulePerdiendoPeso(
            animals,
            { weeksOfLoss: 2, thresholdPct: 5 },
            { now: NOW },
        );
        expect(out).toHaveLength(0);
    });
});

describe('ruleRetiroVencido', () => {
    it('avisa retiro activo a 2 días de vencer', () => {
        const animals = [
            baseAnimal({ id: 'V1', nearestWithdrawalEnd: daysFromNow(2) }),
        ];
        const out = ruleRetiroVencido(animals, { warnDaysBefore: 3 }, { now: NOW });
        expect(out).toHaveLength(1);
        expect(out[0].severity).toBe('warning');
    });

    it('recuerda retiro recién vencido (apto)', () => {
        const animals = [
            baseAnimal({ id: 'V1', nearestWithdrawalEnd: daysAgo(2) }),
        ];
        const out = ruleRetiroVencido(animals, { warnDaysBefore: 3 }, { now: NOW });
        expect(out).toHaveLength(1);
        expect(out[0].severity).toBe('info');
        expect(out[0].message).toContain('Apto');
    });

    it('no avisa si el retiro está lejos', () => {
        const animals = [
            baseAnimal({ id: 'V1', nearestWithdrawalEnd: daysFromNow(20) }),
        ];
        const out = ruleRetiroVencido(animals, { warnDaysBefore: 3 }, { now: NOW });
        expect(out).toHaveLength(0);
    });
});

describe('ruleSaneamientoProximo', () => {
    it('alerta cuando hay campaña próxima', () => {
        const farms: FarmSnap[] = [
            {
                farmId: 'F1',
                nextCampaign: { kind: 'brucelosis', scheduledFor: daysFromNow(10) },
            },
        ];
        const out = ruleSaneamientoProximo(farms, { daysAhead: 14 }, { now: NOW });
        expect(out).toHaveLength(1);
        expect(out[0].farmScoped).toBe(true);
        expect(out[0].farmId).toBe('F1');
    });

    it('escala a warning si <= 3 días', () => {
        const farms: FarmSnap[] = [
            {
                farmId: 'F1',
                nextCampaign: { kind: 'tuberculosis', scheduledFor: daysFromNow(2) },
            },
        ];
        const out = ruleSaneamientoProximo(farms, { daysAhead: 14 }, { now: NOW });
        expect(out[0].severity).toBe('warning');
    });
});

describe('ruleCargaExcedida', () => {
    it('alerta sobrecarga 20 % por encima del límite', () => {
        const out = ruleCargaExcedida(
            [{ farmId: 'F1', cargaRatio: 1.2 }],
            { tolerancePct: 10 },
            { now: NOW },
        );
        expect(out).toHaveLength(1);
        expect(out[0].farmScoped).toBe(true);
        expect(out[0].message).toMatch(/20 %/);
    });

    it('escala a critical si ratio > 1.3', () => {
        const out = ruleCargaExcedida(
            [{ farmId: 'F1', cargaRatio: 1.4 }],
            { tolerancePct: 10 },
            { now: NOW },
        );
        expect(out[0].severity).toBe('critical');
    });
});

describe('evaluateAll — orquestador', () => {
    it('ejecuta todas las reglas activas y combina resultados', () => {
        const animals: AnimalSnap[] = [
            baseAnimal({
                id: 'V1',
                lastCubricion: daysAgo(280),
            }),
            baseAnimal({
                id: 'V2',
                birthDate: new Date('2024-01-01'),
            }), // sin pesar
        ];
        const farms: FarmSnap[] = [
            { farmId: 'F1', cargaRatio: 1.25 },
        ];
        const out = evaluateAll({
            animals,
            farms,
            rules: DEFAULT_RULES.map((r) => ({
                kind: r.kind,
                paramsJson: r.paramsJson,
                severity: r.severity,
            })),
            now: NOW,
        });
        // Esperamos al menos 3 alertas (parir, sin pesar, carga)
        expect(out.length).toBeGreaterThanOrEqual(3);
        const kinds = new Set(out.map((c) => c.type));
        expect(kinds.has('hembras_a_parir')).toBe(true);
        expect(kinds.has('sin_pesar')).toBe(true);
        expect(kinds.has('carga_excedida')).toBe(true);
    });

    it('los ruleCode son estables y únicos por entidad', () => {
        const out1 = ruleHembrasAParir(
            [baseAnimal({ id: 'V1', lastCubricion: daysAgo(280) })],
            { daysAhead: 7 },
            { now: NOW },
        );
        const out2 = ruleHembrasAParir(
            [baseAnimal({ id: 'V1', lastCubricion: daysAgo(280) })],
            { daysAhead: 7 },
            { now: NOW },
        );
        expect(out1[0].ruleCode).toBe(out2[0].ruleCode);
    });
});
