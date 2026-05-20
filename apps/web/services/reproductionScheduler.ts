/**
 * ReproductionScheduler — Auto-programación de eventos reproductivos en
 * cascada.
 *
 * Cuando el ganadero registra el primer evento (inseminación, parto…),
 * el motor calcula los hitos futuros derivados y los persiste como
 * `ManagementEvent` con `status='scheduled'`. Así el calendario y el
 * AlertEngine (regla `hembras_a_parir`) los recogen sin que el ganadero
 * tenga que registrar cada paso a mano.
 *
 * Cadena modelada:
 *
 *   Inseminación / Cubrición
 *      → Diagnóstico gestación  (+45 días, scheduled)
 *      → Parto previsto         (+283 días, scheduled)
 *
 *   Diagnóstico positivo
 *      → Confirma parto previsto (si ya estaba programado, se mantiene)
 *
 *   Diagnóstico negativo
 *      → Cancela parto previsto y diagnóstico programado
 *
 *   Parto
 *      → Cancela parto previsto (era una expectativa, ahora real)
 *      → Programa Destete       (+210 días, scheduled)
 *
 *   Aborto
 *      → Cancela parto previsto y destete programado
 *
 * Es un motor PURO: recibe el evento que se acaba de registrar y los
 * eventos programados existentes; devuelve dos listas — `toCreate` y
 * `toCancel`. El server action persiste el resultado.
 */

export type RepEventType =
    | 'celo'
    | 'inseminacion'
    | 'cubricion'
    | 'diagnostico_gestacion'
    | 'aborto'
    | 'parto'
    | 'examen_andrologico';

export interface SchedulerEvent {
    /** ID si ya existe (cancelaciones); ausente si es nuevo. */
    id?: string;
    animalId: string;
    farmId: string;
    type: RepEventType | 'destete';
    date: Date;
    status: 'scheduled' | 'completed' | 'pending' | 'cancelled';
    parentEventId?: string;
    data?: Record<string, unknown>;
    notes?: string;
}

export interface SchedulerInput {
    /** Evento recién registrado (el "trigger"). */
    triggerEvent: SchedulerEvent & { id: string };
    /** Eventos `scheduled` ya existentes del mismo animal — para detectar
     *  los que deben cancelarse o respetarse. */
    existingScheduled: SchedulerEvent[];
}

export interface SchedulerResult {
    toCreate: SchedulerEvent[];
    toCancel: string[]; // ids
}

// ─── CONSTANTES ────────────────────────────────────────────────────────────────

export const GESTATION_DAYS = 283;
export const DIAGNOSTIC_OFFSET_DAYS = 45;
export const WEANING_OFFSET_DAYS = 210;

// ─── LÓGICA ────────────────────────────────────────────────────────────────────

export function computeFollowUpEvents(input: SchedulerInput): SchedulerResult {
    const { triggerEvent, existingScheduled } = input;
    const result: SchedulerResult = { toCreate: [], toCancel: [] };

    switch (triggerEvent.type) {
        case 'inseminacion':
        case 'cubricion': {
            // 1) Programar diagnóstico gestación a +45 días si no existe ya
            //    uno programado posterior al trigger.
            const diagDate = addDays(triggerEvent.date, DIAGNOSTIC_OFFSET_DAYS);
            if (!findScheduled(existingScheduled, 'diagnostico_gestacion', triggerEvent.date)) {
                result.toCreate.push({
                    animalId: triggerEvent.animalId,
                    farmId: triggerEvent.farmId,
                    type: 'diagnostico_gestacion',
                    date: diagDate,
                    status: 'scheduled',
                    parentEventId: triggerEvent.id,
                    notes: `Diagnóstico programado (45d tras ${triggerEvent.type})`,
                });
            }

            // 2) Programar parto previsto a +283 días si no existe.
            const partoDate = addDays(triggerEvent.date, GESTATION_DAYS);
            if (!findScheduled(existingScheduled, 'parto', triggerEvent.date)) {
                result.toCreate.push({
                    animalId: triggerEvent.animalId,
                    farmId: triggerEvent.farmId,
                    type: 'parto',
                    date: partoDate,
                    status: 'scheduled',
                    parentEventId: triggerEvent.id,
                    notes: `Parto previsto (283d tras ${triggerEvent.type})`,
                });
            }
            break;
        }

        case 'diagnostico_gestacion': {
            const isNegative = String(triggerEvent.data?.result ?? '')
                .toLowerCase() === 'negativo';
            if (isNegative) {
                // Cancela parto previsto y diagnósticos programados pendientes.
                for (const ev of existingScheduled) {
                    if (
                        (ev.type === 'parto' || ev.type === 'diagnostico_gestacion') &&
                        ev.id &&
                        ev.date >= triggerEvent.date
                    ) {
                        result.toCancel.push(ev.id);
                    }
                }
            } else {
                // Diagnóstico positivo: solo cierra el diagnóstico programado
                // (el de inseminación + 45 días) si está vigente.
                for (const ev of existingScheduled) {
                    if (
                        ev.type === 'diagnostico_gestacion' &&
                        ev.id &&
                        Math.abs(diffDays(ev.date, triggerEvent.date)) <= 15
                    ) {
                        result.toCancel.push(ev.id);
                    }
                }
            }
            break;
        }

        case 'parto': {
            // 1) Cancela el parto previsto (era una proyección).
            for (const ev of existingScheduled) {
                if (
                    ev.type === 'parto' &&
                    ev.id &&
                    // Tolerancia: parto real ± 30 días respecto al previsto.
                    Math.abs(diffDays(ev.date, triggerEvent.date)) <= 30
                ) {
                    result.toCancel.push(ev.id);
                }
            }
            // 2) Programa destete a +210 días.
            const weanDate = addDays(triggerEvent.date, WEANING_OFFSET_DAYS);
            result.toCreate.push({
                animalId: triggerEvent.animalId,
                farmId: triggerEvent.farmId,
                type: 'destete',
                date: weanDate,
                status: 'scheduled',
                parentEventId: triggerEvent.id,
                notes: `Destete programado (210d tras parto)`,
            });
            break;
        }

        case 'aborto': {
            // Cancela parto previsto y destete programado si existían.
            for (const ev of existingScheduled) {
                if (
                    (ev.type === 'parto' || ev.type === 'destete') &&
                    ev.id &&
                    ev.date >= triggerEvent.date
                ) {
                    result.toCancel.push(ev.id);
                }
            }
            break;
        }

        // celo / examen_andrologico no programan eventos en cascada.
    }

    return result;
}

// ─── HELPERS ───────────────────────────────────────────────────────────────────

function findScheduled(
    list: SchedulerEvent[],
    type: SchedulerEvent['type'],
    afterDate: Date,
): SchedulerEvent | undefined {
    return list.find(
        (e) =>
            e.type === type &&
            e.status === 'scheduled' &&
            e.date >= afterDate,
    );
}

function addDays(d: Date, days: number): Date {
    return new Date(d.getTime() + days * 86_400_000);
}

function diffDays(a: Date, b: Date): number {
    return (a.getTime() - b.getTime()) / 86_400_000;
}
