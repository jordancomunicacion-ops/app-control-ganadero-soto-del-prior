import { PrismaService } from '../../prisma/prisma.service';
import { RatesService } from '../rates/rates.service';
import { AvailabilityService } from '../rates/availability.service';
export declare class BookingService {
    private prisma;
    private ratesService;
    private availabilityService;
    constructor(prisma: PrismaService, ratesService: RatesService, availabilityService: AvailabilityService);
    createBooking(data: {
        hotelId: string;
        guestName: string;
        checkInDate: string;
        checkOutDate: string;
        roomTypeId: string;
        ratePlanId?: string;
        pax: number;
        guestEmail?: string;
        guestPhone?: string;
    }): Promise<{
        bookingRooms: {
            id: string;
            date: Date;
            priceSnapshot: import("@prisma/client/runtime/library").Decimal;
            roomId: string;
            bookingId: string;
        }[];
    } & {
        id: string;
        currency: string;
        createdAt: Date;
        updatedAt: Date;
        hotelId: string;
        totalPrice: import("@prisma/client/runtime/library").Decimal;
        referenceCode: string;
        guestId: string | null;
        guestName: string;
        guestEmail: string | null;
        guestPhone: string | null;
        status: string;
        source: string;
        isPaid: boolean;
        stripeCustomerId: string | null;
        stripePaymentMethodId: string | null;
        stripePaymentIntentId: string | null;
        checkInDate: Date;
        checkOutDate: Date;
        nights: number;
        otaId: string | null;
        otaRawData: string | null;
    }>;
    private syncWithCRM;
    getBookings(hotelId: string): Promise<({
        bookingRooms: ({
            room: {
                id: string;
                name: string;
                isActive: boolean;
                roomTypeId: string;
            };
        } & {
            id: string;
            date: Date;
            priceSnapshot: import("@prisma/client/runtime/library").Decimal;
            roomId: string;
            bookingId: string;
        })[];
    } & {
        id: string;
        currency: string;
        createdAt: Date;
        updatedAt: Date;
        hotelId: string;
        totalPrice: import("@prisma/client/runtime/library").Decimal;
        referenceCode: string;
        guestId: string | null;
        guestName: string;
        guestEmail: string | null;
        guestPhone: string | null;
        status: string;
        source: string;
        isPaid: boolean;
        stripeCustomerId: string | null;
        stripePaymentMethodId: string | null;
        stripePaymentIntentId: string | null;
        checkInDate: Date;
        checkOutDate: Date;
        nights: number;
        otaId: string | null;
        otaRawData: string | null;
    })[]>;
    checkAvailability(hotelId: string, from: string, to: string, pax: number): Promise<any[]>;
    private allocateRoom;
    private calculateNights;
}
