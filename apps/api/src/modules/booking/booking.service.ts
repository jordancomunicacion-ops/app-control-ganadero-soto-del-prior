import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingStatus, BookingSource } from '../../common/constants';
import { RatesService } from '../rates/rates.service';
import { AvailabilityService } from '../rates/availability.service';

@Injectable()
export class BookingService {
    constructor(
        private prisma: PrismaService,
        private ratesService: RatesService,
        private availabilityService: AvailabilityService
    ) { }

    async createBooking(data: {
        hotelId: string;
        guestName: string;
        checkInDate: string;
        checkOutDate: string;
        roomTypeId: string;
        ratePlanId?: string; // Optional for backward compat
        pax: number;
        guestEmail?: string;
        guestPhone?: string;
    }) {
        const checkIn = new Date(data.checkInDate);
        const checkOut = new Date(data.checkOutDate);

        // 0. Default Rate Plan if missing
        let ratePlanId = data.ratePlanId;
        if (!ratePlanId) {
            const defaultPlan = await this.prisma.ratePlan.findFirst({
                where: { hotelId: data.hotelId, isDefault: true }
            });
            // Fallback if no default exists (should not happen in real app)
            if (!defaultPlan) {
                // Try find ANY plan
                const anyPlan = await this.prisma.ratePlan.findFirst({ where: { hotelId: data.hotelId } });
                if (!anyPlan) throw new BadRequestException("No Rate Plan configured for this hotel.");
                ratePlanId = anyPlan.id;
            } else {
                ratePlanId = defaultPlan.id;
            }
        }

        // 1. Check Availability & Restrictions
        try {
            await this.availabilityService.checkAvailability(
                data.hotelId,
                data.roomTypeId,
                ratePlanId,
                checkIn,
                checkOut,
                1 // units
            );
        } catch (e: any) {
            throw new BadRequestException(e.message);
        }

        // 2. Calculate Price (Server Side Authority)
        const priceInfo = await this.ratesService.calculatePrice(
            data.hotelId,
            data.roomTypeId,
            ratePlanId,
            checkIn,
            checkOut,
            data.pax
        );

        // 3. Allocate Room (Simple logic: pick first free)
        const room = await this.allocateRoom(data.hotelId, data.roomTypeId, checkIn, checkOut);
        if (!room) throw new BadRequestException('System error: Inventory check passed but no physical room found.');

        // 4. Create Booking
        const booking = await this.prisma.booking.create({
            data: {
                hotelId: data.hotelId,
                guestName: data.guestName,
                checkInDate: checkIn,
                checkOutDate: checkOut,
                totalPrice: priceInfo.totalPrice,
                nights: this.calculateNights(checkIn, checkOut),
                referenceCode: `RES-${Date.now()}`,
                status: BookingStatus.CONFIRMED,
                source: BookingSource.MANUAL,
                bookingRooms: {
                    create: [{
                        roomId: room.id,
                        priceSnapshot: priceInfo.totalPrice,
                        date: checkIn
                    }]
                }
            },
            include: { bookingRooms: true }
        });

        // 5. Sync with CRM (Fire and Forget)
        this.syncWithCRM(booking, data.guestEmail, data.guestPhone);

        return booking;
    }

    private async syncWithCRM(booking: any, email?: string, phone?: string) {
        if (!email) return; // Email is required for CRM identity

        const [firstName, ...rest] = booking.guestName.split(' ');
        const lastName = rest.join(' ') || '';

        try {
            // Hardcoded URL for MVP - in prod use env var
            await fetch('http://localhost:3004/api/integrations/hotel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    guest: {
                        email,
                        phone,
                        firstName,
                        lastName
                    },
                    booking: {
                        total: Number(booking.totalPrice),
                        nights: booking.nights,
                        roomType: 'Standard' // TODO: Fetch room type name
                    }
                })
            });
            console.log(`[CRM-SYNC] Synced booking ${booking.referenceCode} to CRM.`);
        } catch (error) {
            console.error('[CRM-SYNC] Failed to sync booking:', error);
            // Don't throw, we don't want to rollback the booking
        }
    }

    async getBookings(hotelId: string) {
        return this.prisma.booking.findMany({
            where: { hotelId },
            include: { bookingRooms: { include: { room: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }

    // PUBLIC AVAILABILITY
    async checkAvailability(hotelId: string, from: string, to: string, pax: number) {
        const checkIn = new Date(from);
        const checkOut = new Date(to);

        const roomTypes = await this.prisma.roomType.findMany({
            where: { hotelId, capacity: { gte: +pax } },
            // include: { dailyPrices: true } // Optimization possible (Requires Client Regen)
        });

        // Assume default rate plan for public search if none provided
        // In real app, we iterate all RatePlans.
        const defaultRatePlan = await this.prisma.ratePlan.findFirst({
            where: { hotelId, isDefault: true }
        });

        if (!defaultRatePlan) return []; // No public rates

        const availableTypes: any[] = [];

        for (const type of roomTypes) {
            try {
                // Check restrictions
                await this.availabilityService.checkAvailability(hotelId, type.id, defaultRatePlan.id, checkIn, checkOut);

                // Calculate Price
                const priceInfo = await this.ratesService.calculatePrice(hotelId, type.id, defaultRatePlan.id, checkIn, checkOut, pax);

                availableTypes.push({
                    ...type,
                    totalPrice: priceInfo.totalPrice,
                    ratePlan: defaultRatePlan.name,
                    breakdown: priceInfo.breakdown
                });
            } catch (e) {
                // Not available
                continue;
            }
        }

        return availableTypes;
    }

    // --- Helpers ---

    private async allocateRoom(hotelId: string, roomTypeId: string, start: Date, end: Date) {
        const allRooms = await this.prisma.room.findMany({
            where: { roomTypeId, isActive: true }
        });

        for (const room of allRooms) {
            const isBusy = await this.prisma.bookingRoom.findFirst({
                where: {
                    roomId: room.id,
                    booking: {
                        status: { not: 'CANCELLED' }, // Check valid status
                        checkInDate: { lt: end },
                        checkOutDate: { gt: start }
                    }
                }
            });

            if (!isBusy) return room;
        }
        return null;
    }

    private calculateNights(start: Date, end: Date) {
        return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }
}
