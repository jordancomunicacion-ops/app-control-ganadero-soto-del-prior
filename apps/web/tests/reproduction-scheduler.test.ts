import { describe, it, expect } from 'vitest';
import {
    computeFollowUpEvents,
    GESTATION_DAYS,
    DIAGNOSTIC_OFFSET_DAYS,
    WEANING_OFFSET_DAYS,
    type SchedulerEvent,
} from '@/services/reproductionScheduler';

const NOW = new Date('2026-05-20T10:00:00Z');
const days = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

function trigger(over: Partial<SchedulerEvent> & { id: string; type: SchedulerEvent['type'] }): SchedulerEvent & { id: string } {
    return {
        animalId: 'V1',
        farmId: 'F1',
        date: NOW,
        status: 'completed',
        ...over,
    };
}

describe('Inseminación / Cubrición → programa diagnóstico + parto', () => {
    it('Inseminación crea dos eventos programados', () => {
        const r = computeFollowUpEvents({
            triggerEvent: trigger({ id: 'E1', type: 'inseminacion' }),
            existingScheduled: [],
        });
        expect(r.toCreate).toHaveLength(2);
        const diag = r.toCreate.find((e) => e.type === 'diagnostico_gestacion');
        const parto = r.toCreate.find((e) => e.type === 'parto');
        expect(diag).toBeDefined();
        expect(parto).toBeDefined();
        expect(diag!.date.getTime()).toBe(days(DIAGNOSTIC_OFFSET_DAYS).getTime());
        expect(parto!.date.getTime()).toBe(days(GESTATION_DAYS).getTime());
        expect(diag!.status).toBe('scheduled');
        expect(diag!.parentEventId).toBe('E1');
    });

    it('Si ya hay parto programado posterior, no duplica', () => {
        const r = computeFollowUpEvents({
            triggerEvent: trigger({ id: 'E1', type: 'cubricion' }),
            existingScheduled: [
                {
                    id: 'S1',
                    animalId: 'V1',
                    farmId: 'F1',
                    type: 'parto',
                    date: days(290),
                    status: 'scheduled',
                },
            ],
        });
        expect(r.toCreate.find((e) => e.type === 'parto')).toBeUndefined();
        // El diagnóstico sí lo crea porque no estaba programado.
        expect(r.toCreate.find((e) => e.type === 'diagnostico_gestacion')).toBeDefined();
    });
});

describe('Diagnóstico positivo → solo cierra el diagnóstico programado', () => {
    it('Cancela el diagnóstico programado cercano', () => {
        const r = computeFollowUpEvents({
            triggerEvent: trigger({
                id: 'E2',
                type: 'diagnostico_gestacion',
                data: { result: 'positivo' },
            }),
            existingScheduled: [
                {
                    id: 'S_DIAG',
                    animalId: 'V1',
                    farmId: 'F1',
                    type: 'diagnostico_gestacion',
                    date: days(2), // a 2 días — caería dentro del ±15
                    status: 'scheduled',
                },
                {
                    id: 'S_PARTO',
                    animalId: 'V1',
                    farmId: 'F1',
                    type: 'parto',
                    date: days(238),
                    status: 'scheduled',
                },
            ],
        });
        // Cancela el diagnóstico, mantiene el parto previsto.
        expect(r.toCancel).toContain('S_DIAG');
        expect(r.toCancel).not.toContain('S_PARTO');
        expect(r.toCreate).toHaveLength(0);
    });
});

describe('Diagnóstico negativo → cancela parto previsto y diagnóstico', () => {
    it('Cancela ambos', () => {
        const r = computeFollowUpEvents({
            triggerEvent: trigger({
                id: 'E3',
                type: 'diagnostico_gestacion',
                data: { result: 'negativo' },
            }),
            existingScheduled: [
                {
                    id: 'S_DIAG',
                    animalId: 'V1',
                    farmId: 'F1',
                    type: 'diagnostico_gestacion',
                    date: days(2),
                    status: 'scheduled',
                },
                {
                    id: 'S_PARTO',
                    animalId: 'V1',
                    farmId: 'F1',
                    type: 'parto',
                    date: days(238),
                    status: 'scheduled',
                },
            ],
        });
        expect(r.toCancel).toContain('S_DIAG');
        expect(r.toCancel).toContain('S_PARTO');
    });
});

describe('Parto → cancela parto previsto + programa destete', () => {
    it('Cancela el parto programado próximo y crea destete', () => {
        const r = computeFollowUpEvents({
            triggerEvent: trigger({ id: 'E4', type: 'parto' }),
            existingScheduled: [
                {
                    id: 'S_PARTO',
                    animalId: 'V1',
                    farmId: 'F1',
                    type: 'parto',
                    date: days(-5), // 5 días antes — dentro de la tolerancia de 30
                    status: 'scheduled',
                },
            ],
        });
        expect(r.toCancel).toContain('S_PARTO');
        const dest = r.toCreate.find((e) => e.type === 'destete');
        expect(dest).toBeDefined();
        expect(dest!.date.getTime()).toBe(days(WEANING_OFFSET_DAYS).getTime());
    });

    it('No cancela un parto previsto muy lejano (otra gestación)', () => {
        const r = computeFollowUpEvents({
            triggerEvent: trigger({ id: 'E4', type: 'parto' }),
            existingScheduled: [
                {
                    id: 'S_OTRO_PARTO',
                    animalId: 'V1',
                    farmId: 'F1',
                    type: 'parto',
                    date: days(150), // muy lejos
                    status: 'scheduled',
                },
            ],
        });
        expect(r.toCancel).not.toContain('S_OTRO_PARTO');
    });
});

describe('Aborto → cancela parto previsto y destete programado', () => {
    it('Cancela ambos si existen', () => {
        const r = computeFollowUpEvents({
            triggerEvent: trigger({ id: 'E5', type: 'aborto' }),
            existingScheduled: [
                {
                    id: 'S_PARTO',
                    animalId: 'V1',
                    farmId: 'F1',
                    type: 'parto',
                    date: days(60),
                    status: 'scheduled',
                },
                {
                    id: 'S_DEST',
                    animalId: 'V1',
                    farmId: 'F1',
                    type: 'destete',
                    date: days(270),
                    status: 'scheduled',
                },
            ],
        });
        expect(r.toCancel).toContain('S_PARTO');
        expect(r.toCancel).toContain('S_DEST');
    });
});

describe('Eventos sin cascada (celo, andrológico)', () => {
    it('Celo no produce nada', () => {
        const r = computeFollowUpEvents({
            triggerEvent: trigger({ id: 'E6', type: 'celo' }),
            existingScheduled: [],
        });
        expect(r.toCreate).toHaveLength(0);
        expect(r.toCancel).toHaveLength(0);
    });

    it('Examen andrológico no produce nada', () => {
        const r = computeFollowUpEvents({
            triggerEvent: trigger({ id: 'E7', type: 'examen_andrologico' }),
            existingScheduled: [],
        });
        expect(r.toCreate).toHaveLength(0);
        expect(r.toCancel).toHaveLength(0);
    });
});
