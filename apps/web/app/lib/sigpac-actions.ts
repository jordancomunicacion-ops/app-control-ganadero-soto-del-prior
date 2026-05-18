'use server';

import { auth } from '@/auth';
import { SigpacService, ParcelInfo } from '@/services/sigpacService';

export async function searchParcel(prov: number, muni: number, pol: number, parc: number): Promise<{ success: boolean, data?: ParcelInfo, error?: string }> {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const data = await SigpacService.fetchParcelData(prov, muni, pol, parc);
        if (data) {
            return { success: true, data };
        }
        return { success: false, error: 'Parcela no encontrada' };
    } catch (error) {
        console.error('Server Action Error (searchParcel):', error);
        return { success: false, error: 'Error de conexión con SIGPAC' };
    }
}
