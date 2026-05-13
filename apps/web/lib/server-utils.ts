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
