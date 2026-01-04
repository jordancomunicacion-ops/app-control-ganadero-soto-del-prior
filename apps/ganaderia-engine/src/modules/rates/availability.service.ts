
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AvailabilityService {
    constructor(private prisma: PrismaService) { }

    /**
     * Check if a booking is allowed based on Restrictions and Inventory.
     * Throws Error if validation fails.
     */
    async checkAvailability(
        hotelId: string,
        roomTypeId: string,
        ratePlanId: string,
        checkIn: Date,
        checkOut: Date,
        unitsRequested: number = 1
    ): Promise<boolean> {
        const nights = (checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24);

        // 1. Iterate Dates for Restrictions
        let currentDate = new Date(checkIn);
        const endDate = new Date(checkOut);

        while (currentDate < endDate) {
            // Fetch Restrictions with Priority
            // Note: Restriction model missing in Stale Client. Forcing empty.
            const restrictions = await this.prisma.restriction.findMany({
                where: {
                    hotelId,
                    date: currentDate,
                    OR: [
                        { roomTypeId: roomTypeId, ratePlanId: ratePlanId }, // Specific
                        { roomTypeId: roomTypeId, ratePlanId: null },       // Room Global
                        { roomTypeId: null, ratePlanId: null }              // Hotel Global
                    ]
                }
            });

            // Find most specific
            // Find most specific
            const specific = restrictions.find(r => r.roomTypeId === roomTypeId && r.ratePlanId === ratePlanId);
            const roomGlobal = restrictions.find(r => r.roomTypeId === roomTypeId && !r.ratePlanId);
            const hotelGlobal = restrictions.find(r => !r.roomTypeId);

            const activeParams = { ...hotelGlobal, ...roomGlobal, ...specific };

            const effectiveStopSell = specific?.stopSell ?? roomGlobal?.stopSell ?? hotelGlobal?.stopSell ?? false;
            const effectiveCTA = specific?.closedToArrival ?? roomGlobal?.closedToArrival ?? hotelGlobal?.closedToArrival ?? false;
            const effectiveMinStay = specific?.minStay ?? roomGlobal?.minStay ?? hotelGlobal?.minStay ?? 0;

            // A. Stop Sell
            if (effectiveStopSell) {
                throw new Error(`Stop Sell active on ${currentDate.toDateString()}`);
            }

            // B. CTA (Only on CheckIn date)
            if (currentDate.getTime() === checkIn.getTime() && effectiveCTA) {
                throw new Error(`Closed to Arrival on ${currentDate.toDateString()}`);
            }

            // D. Min Stay
            if (effectiveMinStay > 0 && nights < effectiveMinStay) {
                throw new Error(`Minimum stay of ${effectiveMinStay} nights required on ${currentDate.toDateString()}`);
            }

            // E. Inventory Check
            // Count existing bookings consuming this roomtype on this date
            const roomsTotal = await this.prisma.room.count({
                where: { roomTypeId, isActive: true }
            });

            const bookingsCount = await this.prisma.bookingRoom.count({
                where: {
                    room: { roomTypeId },
                    booking: {
                        checkInDate: { lte: currentDate },
                        checkOutDate: { gt: currentDate }, // Stays *over* this night
                        status: { not: 'CANCELLED' }
                    }
                }
            });

            if (roomsTotal - bookingsCount < unitsRequested) {
                throw new Error(`No inventory available on ${currentDate.toDateString()}`);
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Check CTD on Checkout Date
        // Check CTD on Checkout Date
        const ctdRestriction = await this.prisma.restriction.findFirst({
            where: {
                hotelId,
                date: checkOut,
                // Logic for priority again...
            }
        });
        if (ctdRestriction?.closedToDeparture) {
            throw new Error(`Closed to Departure on ${checkOut.toDateString()}`);
        }

        return true;
    }
}
