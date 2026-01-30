'use server';

import { SigpacService, ParcelInfo } from '@/services/sigpacService';

export async function searchParcel(prov: number, muni: number, pol: number, parc: number): Promise<{ success: boolean, data?: ParcelInfo, error?: string }> {
    try {
        console.log(`[SERVER ACTION] Searching Parcel: ${prov}-${muni}-${pol}-${parc}`);
        const data = await SigpacService.fetchParcelData(prov, muni, pol, parc);
        if (data) {
            return { success: true, data };
        }
        return { success: false, error: 'Parcela no encontrada' };
    } catch (error) {
        console.error("Server Action Error:", error);
        return { success: false, error: 'Error de conexión con SIGPAC' };
    }
}
