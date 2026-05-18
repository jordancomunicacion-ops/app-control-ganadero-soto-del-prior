import { auth } from '@/auth';
import { prisma } from './prisma';

/**
 * Resolves the effective userId for data access.
 * WORKER roles inherit their manager's userId so they see the same data.
 */
export async function getEffectiveUserId(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, managedById: true },
    });

    if (user?.role?.toUpperCase() === 'WORKER' && user.managedById) {
        return user.managedById;
    }
    return userId;
}

/**
 * Reads the current session, throws if missing, and returns the *effective*
 * userId (the manager's id for WORKER, otherwise the user's own id) along
 * with the caller identity. All data-access server actions must use this
 * helper instead of trusting a userId argument from the client.
 */
export async function requireEffectiveUserId(): Promise<{
    callerId: string;
    callerRole: string;
    effectiveUserId: string;
}> {
    const session = await auth();
    const callerId = session?.user?.id;
    if (!session || !callerId) {
        throw new Error('Unauthorized');
    }
    const effectiveUserId = await getEffectiveUserId(callerId);
    const callerRole = (session.user?.role || 'WORKER').toUpperCase();
    return { callerId, callerRole, effectiveUserId };
}

/**
 * Verifies the given farm belongs to the effective user (or that the user is
 * ADMIN). Throws on mismatch. Returns the farm row when found.
 */
export async function assertFarmOwnership(farmId: string, effectiveUserId: string, callerRole: string) {
    if (!farmId) throw new Error('Farm id required');
    const farm = await prisma.farm.findUnique({
        where: { id: farmId },
        select: { id: true, userId: true },
    });
    if (!farm) throw new Error('Farm not found');
    if (callerRole !== 'ADMIN' && farm.userId !== effectiveUserId) {
        throw new Error('Forbidden: farm does not belong to user');
    }
    return farm;
}

/**
 * Verifies the given animal lives in a farm owned by the effective user
 * (or that the caller is ADMIN). Throws on mismatch.
 */
export async function assertAnimalOwnership(animalId: string, effectiveUserId: string, callerRole: string) {
    if (!animalId) throw new Error('Animal id required');
    const animal = await prisma.animal.findUnique({
        where: { id: animalId },
        select: { id: true, farmId: true, farm: { select: { userId: true } } },
    });
    if (!animal) throw new Error('Animal not found');
    if (callerRole !== 'ADMIN' && animal.farm.userId !== effectiveUserId) {
        throw new Error('Forbidden: animal does not belong to user');
    }
    return animal;
}

/**
 * Safely parses a JSON string. Returns fallback on any error.
 */
export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
    if (!value) return fallback;
    try {
        return JSON.parse(value) as T;
    } catch {
        return fallback;
    }
}
