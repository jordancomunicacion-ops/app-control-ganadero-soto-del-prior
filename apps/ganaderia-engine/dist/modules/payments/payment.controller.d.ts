import { PaymentService } from './payment.service';
export declare class PaymentController {
    private paymentService;
    constructor(paymentService: PaymentService);
    attachCard(bookingId: string, paymentMethodId: string): Promise<{
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
        duration: number;
        tags: string | null;
        notes: string | null;
        origin: string;
        smsSent: boolean;
        emailSent: boolean;
        idempotencyKey: string | null;
        tableId: string | null;
    }>;
    chargeNoShow(bookingId: string): Promise<{
        success: boolean;
        paymentIntent: {
            id: string;
            client_secret: string;
        };
    }>;
}
