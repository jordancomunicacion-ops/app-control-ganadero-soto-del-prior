import { PrismaService } from '../../prisma/prisma.service';
export declare class AvailabilityService {
    private prisma;
    constructor(prisma: PrismaService);
    checkAvailability(hotelId: string, roomTypeId: string, ratePlanId: string, checkIn: Date, checkOut: Date, unitsRequested?: number): Promise<boolean>;
}
