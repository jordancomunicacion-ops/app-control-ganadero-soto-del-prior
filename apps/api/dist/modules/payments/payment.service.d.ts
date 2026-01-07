import { PrismaService } from '../../prisma/prisma.service';
export declare class PaymentService {
    private prisma;
    constructor(prisma: PrismaService);
    private stripe;
    createCustomer(email: string, name: string): Promise<{
        id: string;
    }>;
    savePaymentMethod(bookingId: string, paymentMethodId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        date: Date;
        guestName: string;
        guestEmail: string | null;
        guestPhone: string | null;
        status: string;
        stripeCustomerId: string | null;
        stripePaymentMethodId: string | null;
        pax: number;
        channelId: string | null;
        restaurantId: string;
        idempotencyKey: string | null;
        tableId: string | null;
        duration: number;
        tags: string | null;
        notes: string | null;
        origin: string;
        smsSent: boolean;
        emailSent: boolean;
    }>;
    chargeNoShowFee(bookingId: string): Promise<{
        success: boolean;
        paymentIntent: {
            id: string;
            client_secret: string;
        };
    }>;
}
