import { PrismaService } from '../../prisma/prisma.service';
export declare class RatesService {
    private prisma;
    constructor(prisma: PrismaService);
    calculatePrice(hotelId: string, roomTypeId: string, ratePlanId: string, checkIn: Date, checkOut: Date, guests: number): Promise<{
        totalPrice: number;
        breakdown: any[];
    }>;
}
