'use server';

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import {
    requireEffectiveUserId,
    assertAnimalOwnership,
} from '@/lib/server-utils';
import { revalidatePath } from 'next/cache';

// ─── BÚSQUEDA POR DIB / CROTAL ─────────────────────────────────────────────────

/**
 * Busca un animal por su DIB o crotal en las fincas del usuario efectivo.
 * Usado por el `DIBScanner` para decidir si abre la ficha existente o
 * pre-rellena el alta. Devuelve solo la información mínima necesaria
 * (no se valida ownership por animal porque si pertenece a otro tenant
 * directamente decimos que no existe — sin filtrado el usuario podría
 * confirmar la existencia de crotales ajenos).
 */
export async function findAnimalByDibOrCrotal(code: string): Promise<{
    exists: boolean;
    animalId?: string;
}> {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    const cleaned = code.trim();
    if (!cleaned) return { exists: false };

    const animal = await prisma.animal.findFirst({
        where: {
            OR: [{ id: cleaned }, { dibCode: cleaned }],
            ...(callerRole === 'ADMIN'
                ? {}
                : { farm: { userId: effectiveUserId } }),
        },
        select: { id: true },
    });
    return animal ? { exists: true, animalId: animal.id } : { exists: false };
}

/**
 * Actions para la hoja de vida del animal:
 *   - Detalle agregado (animal + pesos + eventos + sanidad + adjuntos)
 *   - Subida de adjuntos (fotos, ecografías, documentos, notas)
 *   - Foto principal del animal (Animal.photoUrl)
 *   - Notas libres (AnimalAttachment type='note' sin file)
 *
 * Las subidas van a `public/uploads/animals/<animalId>/<uuid>_<filename>`.
 * Esto es deliberadamente simple — listo para sustituir por S3 o R2
 * sin cambiar el contrato del action.
 */

// ─── LECTURA ───────────────────────────────────────────────────────────────────

export async function getAnimalDetail(animalId: string) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertAnimalOwnership(animalId, effectiveUserId, callerRole);

    const [animal, weights, events, healthRecords, attachments, alerts] =
        await Promise.all([
            prisma.animal.findUnique({
                where: { id: animalId },
                include: {
                    genotype: {
                        include: { motherBreed: true, fatherBreed: true },
                    },
                    mother: { select: { id: true } },
                    father: { select: { id: true } },
                    farm: { select: { id: true, name: true } },
                },
            }),
            prisma.weight.findMany({
                where: { animalId },
                orderBy: { date: 'desc' },
                take: 50,
            }),
            prisma.managementEvent.findMany({
                where: { animalId },
                orderBy: { date: 'desc' },
                take: 50,
            }),
            prisma.healthRecord.findMany({
                where: { animalId },
                orderBy: { appliedAt: 'desc' },
                include: {
                    product: {
                        select: { id: true, name: true, withdrawalMeatDays: true },
                    },
                    campaign: {
                        select: { id: true, kind: true, scheduledFor: true },
                    },
                },
                take: 100,
            }),
            prisma.animalAttachment.findMany({
                where: { animalId },
                orderBy: { takenAt: 'desc' },
                take: 100,
            }),
            prisma.alert.findMany({
                where: { animalId, resolvedAt: null },
                orderBy: { date: 'desc' },
            }),
        ]);

    if (!animal) throw new Error('Animal not found');

    // Retiro vigente más cercano (para badge "no apto sacrificio").
    const now = new Date();
    const activeWithdrawal = healthRecords
        .filter(
            (h) =>
                h.withdrawalMeatUntil && h.withdrawalMeatUntil.getTime() > now.getTime(),
        )
        .sort(
            (a, b) =>
                (a.withdrawalMeatUntil!.getTime() ?? 0) -
                (b.withdrawalMeatUntil!.getTime() ?? 0),
        )[0];

    return {
        animal,
        weights,
        events,
        healthRecords,
        attachments,
        alerts,
        activeWithdrawal: activeWithdrawal
            ? {
                  productName: activeWithdrawal.product?.name ?? 'Tratamiento',
                  until: activeWithdrawal.withdrawalMeatUntil!,
              }
            : null,
    };
}

// ─── ADJUNTOS ──────────────────────────────────────────────────────────────────

const UPLOADS_ROOT = path.join(process.cwd(), 'public', 'uploads', 'animals');
const ALLOWED_MIME = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'application/pdf',
]);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Sube un archivo y crea un `AnimalAttachment`. Si `setAsPrimary=true` y el
 * archivo es imagen, también actualiza `Animal.photoUrl`.
 */
export async function uploadAnimalAttachment(formData: FormData): Promise<{
    id: string;
    url: string;
    type: string;
}> {
    const { callerId, effectiveUserId, callerRole } = await requireEffectiveUserId();

    const animalId = String(formData.get('animalId') || '');
    const type = String(formData.get('type') || 'photo');
    const caption = formData.get('caption')?.toString() || null;
    const setAsPrimary = formData.get('setAsPrimary') === 'true';
    const file = formData.get('file');

    if (!animalId) throw new Error('animalId requerido');
    if (!(file instanceof File)) throw new Error('Archivo requerido');
    if (file.size > MAX_BYTES) {
        throw new Error('Archivo demasiado grande (>10 MB)');
    }
    if (file.type && !ALLOWED_MIME.has(file.type)) {
        throw new Error(`Tipo no permitido: ${file.type}`);
    }
    if (!['photo', 'ultrasound', 'document'].includes(type)) {
        throw new Error(`type inválido: ${type}`);
    }

    await assertAnimalOwnership(animalId, effectiveUserId, callerRole);

    const animalDir = path.join(UPLOADS_ROOT, animalId);
    await fs.mkdir(animalDir, { recursive: true });

    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(-80);
    const fileName = `${randomUUID()}_${safeName}`;
    const absPath = path.join(animalDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(absPath, buffer);

    const url = `/uploads/animals/${animalId}/${fileName}`;

    const attachment = await prisma.animalAttachment.create({
        data: {
            animalId,
            type,
            url,
            caption,
            uploadedBy: callerId,
        },
    });

    if (setAsPrimary && type === 'photo') {
        await prisma.animal.update({
            where: { id: animalId },
            data: { photoUrl: url },
        });
    }

    revalidatePath('/dashboard');
    return { id: attachment.id, url, type };
}

/**
 * Añade una nota libre con fecha. No requiere archivo.
 */
export async function addAnimalNote(animalId: string, text: string) {
    const { callerId, effectiveUserId, callerRole } = await requireEffectiveUserId();
    await assertAnimalOwnership(animalId, effectiveUserId, callerRole);

    const trimmed = text.trim();
    if (!trimmed) throw new Error('La nota no puede estar vacía');
    if (trimmed.length > 4000) throw new Error('Nota demasiado larga (>4000 caracteres)');

    const attachment = await prisma.animalAttachment.create({
        data: {
            animalId,
            type: 'note',
            url: null,
            caption: trimmed,
            uploadedBy: callerId,
        },
    });
    revalidatePath('/dashboard');
    return attachment;
}

/**
 * Borra un adjunto (también el archivo del disco si tiene url física).
 * Para evitar leaks de path, validamos que la url comience por el prefijo
 * correcto y no contenga `..`.
 */
export async function deleteAnimalAttachment(attachmentId: string) {
    const { effectiveUserId, callerRole } = await requireEffectiveUserId();

    const attachment = await prisma.animalAttachment.findUnique({
        where: { id: attachmentId },
        select: { id: true, url: true, animalId: true },
    });
    if (!attachment) throw new Error('Adjunto no encontrado');
    await assertAnimalOwnership(attachment.animalId, effectiveUserId, callerRole);

    if (attachment.url && attachment.url.startsWith('/uploads/animals/') && !attachment.url.includes('..')) {
        const abs = path.join(process.cwd(), 'public', attachment.url);
        try {
            await fs.unlink(abs);
        } catch {
            // El fichero puede ya no existir; ignoramos.
        }
    }

    // Si era la foto principal del animal, limpiar el campo
    const animal = await prisma.animal.findUnique({
        where: { id: attachment.animalId },
        select: { photoUrl: true },
    });
    if (animal?.photoUrl === attachment.url) {
        await prisma.animal.update({
            where: { id: attachment.animalId },
            data: { photoUrl: null },
        });
    }

    await prisma.animalAttachment.delete({ where: { id: attachmentId } });
    revalidatePath('/dashboard');
}
