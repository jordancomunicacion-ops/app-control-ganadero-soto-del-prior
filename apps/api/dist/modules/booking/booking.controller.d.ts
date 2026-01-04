import { BookingService } from './booking.service';
export declare class BookingController {
    private readonly bookingService;
    constructor(bookingService: BookingService);
    createBooking(body: any): Promise<{
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
    checkAvailability(hotelId: string, from: string, to: string, pax: string): Promise<any[]>;
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
}
