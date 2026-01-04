import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PaymentService {
    constructor(private prisma: PrismaService) { }

    // Mock Stripe Client
    private stripe = {
        customers: {
            create: async (data: any) => ({ id: 'cus_mock_' + Date.now() }),
            update: async (id: string, data: any) => ({ id }),
        },
        paymentMethods: {
            attach: async (id: string, data: any) => ({ id }),
        },
        paymentIntents: {
            create: async (data: any) => ({ id: 'pi_mock_' + Date.now(), client_secret: 'secret_mock' }),
        }
    };

    async createCustomer(email: string, name: string) {
        return this.stripe.customers.create({ email, name });
    }

    async savePaymentMethod(bookingId: string, paymentMethodId: string) {
        // 1. Get booking
        const booking = await this.prisma.resBooking.findUnique({ where: { id: bookingId } });
        if (!booking) throw new Error('Booking not found');

        // 2. Create customer if needed (mock logic)
        // In real world, we would check if this user already has a stripeId
        const customer = await this.createCustomer(booking.guestEmail || 'unknown@example.com', booking.guestName);

        // 3. Attach method to customer
        await this.stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id });

        // 4. Update booking with Stripe info
        return this.prisma.resBooking.update({
            where: { id: bookingId },
            data: {
                stripeCustomerId: customer.id,
                stripePaymentMethodId: paymentMethodId
            }
        });
    }

    async chargeNoShowFee(bookingId: string) {
        const booking = await this.prisma.resBooking.findUnique({ where: { id: bookingId } });
        if (!booking) throw new Error('Booking not found');
        if (!booking.stripePaymentMethodId || !booking.stripeCustomerId) throw new Error('No payment method attached');

        // Fetch policy
        // Assuming global policy for now or linked via restaurant
        // const policy = await this.prisma.resPolicy.findFirst({ where: { isActive: true } });

        // Mock Charge
        const amount = 2000; // 20.00 EUR

        const paymentIntent = await this.stripe.paymentIntents.create({
            amount,
            currency: 'eur',
            customer: booking.stripeCustomerId,
            payment_method: booking.stripePaymentMethodId,
            off_session: true,
            confirm: true
        });

        return { success: true, paymentIntent };
    }
}
