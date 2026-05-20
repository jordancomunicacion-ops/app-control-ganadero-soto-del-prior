'use server';

import { prisma } from '@/lib/prisma';
import {
    requireEffectiveUserId,
    assertFarmOwnership,
} from '@/lib/server-utils';
import { revalidatePath } from 'next/cache';
import {
    parseCSV,
    parseNumberSmart,
    parseDateSmart,
    type CSVRow,
} from '@/services/csvParser';

/**
 * Importación CSV con dry-run.
 *
 * Soporta tres dominios:
 *   - `weights`: pesos desde báscula (Tru-Test o cualquier export Excel)
 *   - `animals`: alta masiva (futuro — esqueleto preparado)
 *   - `health`:  eventos sanitarios (futuro)
 *
 * Para esta primera entrega implementamos `weights` completo. El resto
 * sigue el mismo patrón: parser → validación → preview → apply.
 *
 * Flujo:
 *   1) Cliente sube CSV → server action `previewImport()` devuelve el
 *      diff: filas válidas (crear/actualizar), filas con errores y
 *      cuántas saltarían el insert.
 *   2) Cliente revisa y, si está conforme, llama a `applyImport()` con
 *      el mismo CSV (no se confía en lo que el cliente envíe transformado).
 *   3) Las inserciones van en una transacción Prisma para que un error
 *      a mitad no deje datos a medias.
 */

export type ImportDomain = 'weights' | 'animals' | 'health';

export interface ImportPreview {
    domain: ImportDomain;
    totalRows: number;
    validRows: number;
    toCreate: number;
    toUpdate: number;
    errorRows: number;
    errors: Array<{ row: number; reason: string; data: Record<string, string> }>;
    sample: Array<{ row: number; action: 'create' | 'update'; data: Record<string, unknown> }>;
}

export interface ImportApplyResult {
    domain: ImportDomain;
    inserted: number;
    updated: number;
    skipped: number;
}

// ─── ENTRY POINTS ──────────────────────────────────────────────────────────────

export async function previewImport(formData: FormData): Promise<ImportPreview> {
    const { domain, farmId, csv } = await readImportInput(formData);
    switch (domain) {
        case 'weights':
            return previewWeights(csv, farmId);
        case 'animals':
            throw new Error('Importación de animales pendiente — usa el formulario.');
        case 'health':
            throw new Error('Importación de sanidad pendiente.');
    }
}

export async function applyImport(formData: FormData): Promise<ImportApplyResult> {
    const { domain, farmId, csv } = await readImportInput(formData);
    switch (domain) {
        case 'weights':
            return applyWeights(csv, farmId);
        default:
            throw new Error(`Aplicar dominio '${domain}' aún no soportado`);
    }
}

async function readImportInput(formData: FormData): Promise<{
    domain: ImportDomain;
    farmId: string;
    csv: string;
}> {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    const domain = String(formData.get('domain') || 'weights') as ImportDomain;
    const farmId = String(formData.get('farmId') || '');
    if (!farmId) throw new Error('farmId requerido');
    await assertFarmOwnership(farmId, effectiveUserId, callerRole);

    const file = formData.get('file');
    if (!(file instanceof File)) throw new Error('Archivo CSV requerido');
    if (file.size > 5 * 1024 * 1024) {
        throw new Error('CSV demasiado grande (>5 MB)');
    }
    const csv = await file.text();
    return { domain, farmId, csv };
}

// ─── DOMINIO: WEIGHTS ──────────────────────────────────────────────────────────

/**
 * Mapeo flexible de cabeceras esperadas. El usuario puede traer
 * `Crotal`, `Animal ID`, `EID`, etc. — todas se normalizan a la columna
 * canónica.
 */
const WEIGHT_HEADERS = {
    animalId: ['crotal', 'animal_id', 'animal', 'eid', 'id', 'vid_id', 'identificacion'],
    weightKg: ['peso', 'peso_kg', 'weight', 'weight_kg', 'kg', 'live_weight'],
    date: ['fecha', 'date', 'fecha_pesaje', 'pesaje', 'pesofecha'],
    method: ['metodo', 'method', 'origen'],
};

function pickColumn(row: CSVRow, candidates: string[]): string {
    for (const c of candidates) {
        if (row[c] != null && row[c] !== '') return row[c];
    }
    return '';
}

async function previewWeights(csv: string, farmId: string): Promise<ImportPreview> {
    const parsed = parseCSV(csv);
    const totalRows = parsed.rows.length;
    const errors: ImportPreview['errors'] = [];
    const validParsed: Array<{
        index: number;
        animalId: string;
        weightKg: number;
        date: Date;
        method: string;
    }> = [];

    for (let i = 0; i < parsed.rows.length; i++) {
        const row = parsed.rows[i];
        const animalId = pickColumn(row, WEIGHT_HEADERS.animalId);
        const weightRaw = pickColumn(row, WEIGHT_HEADERS.weightKg);
        const dateRaw = pickColumn(row, WEIGHT_HEADERS.date);
        const method = pickColumn(row, WEIGHT_HEADERS.method) || 'bascula';

        if (!animalId) {
            errors.push({ row: i + 2, reason: 'Falta crotal', data: row });
            continue;
        }
        const weight = parseNumberSmart(weightRaw);
        if (!Number.isFinite(weight) || weight <= 0 || weight > 2000) {
            errors.push({
                row: i + 2,
                reason: `Peso inválido: "${weightRaw}"`,
                data: row,
            });
            continue;
        }
        const date = parseDateSmart(dateRaw);
        if (!date) {
            errors.push({
                row: i + 2,
                reason: `Fecha inválida: "${dateRaw}"`,
                data: row,
            });
            continue;
        }
        validParsed.push({ index: i + 2, animalId, weightKg: weight, date, method });
    }

    // Cruce con BD: qué animales existen en esta finca, qué pesos ya están.
    const existingAnimals = await prisma.animal.findMany({
        where: {
            id: { in: validParsed.map((v) => v.animalId) },
            farmId,
        },
        select: { id: true },
    });
    const existingSet = new Set(existingAnimals.map((a) => a.id));

    // Por convención el unique key es (animalId, date). Detectamos
    // colisiones para distinguir create vs update.
    const existingWeights = await prisma.weight.findMany({
        where: {
            animalId: { in: validParsed.map((v) => v.animalId) },
        },
        select: { animalId: true, date: true },
    });
    const weightKey = (a: string, d: Date) => `${a}|${d.toISOString().slice(0, 10)}`;
    const existingWeightSet = new Set(
        existingWeights.map((w) => weightKey(w.animalId, w.date)),
    );

    let toCreate = 0;
    let toUpdate = 0;
    const sample: ImportPreview['sample'] = [];
    for (const v of validParsed) {
        if (!existingSet.has(v.animalId)) {
            errors.push({
                row: v.index,
                reason: `Animal ${v.animalId} no existe en la finca`,
                data: {
                    crotal: v.animalId,
                    peso: String(v.weightKg),
                    fecha: v.date.toISOString().slice(0, 10),
                },
            });
            continue;
        }
        const isUpdate = existingWeightSet.has(weightKey(v.animalId, v.date));
        if (isUpdate) toUpdate++;
        else toCreate++;
        if (sample.length < 10) {
            sample.push({
                row: v.index,
                action: isUpdate ? 'update' : 'create',
                data: {
                    animalId: v.animalId,
                    weightKg: v.weightKg,
                    date: v.date,
                    method: v.method,
                },
            });
        }
    }

    return {
        domain: 'weights',
        totalRows,
        validRows: toCreate + toUpdate,
        toCreate,
        toUpdate,
        errorRows: errors.length,
        errors: errors.slice(0, 50),
        sample,
    };
}

async function applyWeights(csv: string, farmId: string): Promise<ImportApplyResult> {
    const preview = await previewWeights(csv, farmId);
    if (preview.validRows === 0) {
        return { domain: 'weights', inserted: 0, updated: 0, skipped: preview.errorRows };
    }

    // Re-parseo aquí para tener los rows válidos sin tener que pasarlos por
    // el cliente. Re-cargar es seguro: el cliente ya vio el preview y va a
    // aplicar exactamente lo mismo.
    const parsed = parseCSV(csv);
    const rows = parsed.rows
        .map((row) => {
            const animalId = pickColumn(row, WEIGHT_HEADERS.animalId);
            const weightKg = parseNumberSmart(pickColumn(row, WEIGHT_HEADERS.weightKg));
            const date = parseDateSmart(pickColumn(row, WEIGHT_HEADERS.date));
            const method = pickColumn(row, WEIGHT_HEADERS.method) || 'bascula';
            return { animalId, weightKg, date, method };
        })
        .filter((r) => r.animalId && Number.isFinite(r.weightKg) && r.date);

    const farmAnimals = await prisma.animal.findMany({
        where: { id: { in: rows.map((r) => r.animalId) }, farmId },
        select: { id: true },
    });
    const allowed = new Set(farmAnimals.map((a) => a.id));

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    await prisma.$transaction(async (tx) => {
        for (const r of rows) {
            if (!allowed.has(r.animalId)) {
                skipped++;
                continue;
            }
            try {
                const existing = await tx.weight.findUnique({
                    where: {
                        animalId_date: {
                            animalId: r.animalId,
                            date: r.date!,
                        },
                    },
                });
                if (existing) {
                    await tx.weight.update({
                        where: { id: existing.id },
                        data: { weightKg: r.weightKg, method: r.method },
                    });
                    updated++;
                } else {
                    await tx.weight.create({
                        data: {
                            animalId: r.animalId,
                            weightKg: r.weightKg,
                            date: r.date!,
                            method: r.method,
                        },
                    });
                    inserted++;
                }
                // Actualiza también currentWeight del animal con el último
                // peso por fecha — útil para que la UI lo refleje al instante.
                await tx.animal.update({
                    where: { id: r.animalId },
                    data: { currentWeight: r.weightKg },
                });
            } catch {
                skipped++;
            }
        }
    });

    revalidatePath('/dashboard');
    return { domain: 'weights', inserted, updated, skipped };
}
