"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let PaymentService = class PaymentService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    stripe = {
        customers: {
            create: async (data) => ({ id: 'cus_mock_' + Date.now() }),
            update: async (id, data) => ({ id }),
        },
        paymentMethods: {
            attach: async (id, data) => ({ id }),
        },
        paymentIntents: {
            create: async (data) => ({ id: 'pi_mock_' + Date.now(), client_secret: 'secret_mock' }),
        }
    };
    async createCustomer(email, name) {
        return this.stripe.customers.create({ email, name });
    }
    async savePaymentMethod(bookingId, paymentMethodId) {
        const booking = await this.prisma.resBooking.findUnique({ where: { id: bookingId } });
        if (!booking)
            throw new Error('Booking not found');
        const customer = await this.createCustomer(booking.guestEmail || 'unknown@example.com', booking.guestName);
        await this.stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id });
        return this.prisma.resBooking.update({
            where: { id: bookingId },
            data: {
                stripeCustomerId: customer.id,
                stripePaymentMethodId: paymentMethodId
            }
        });
    }
    async chargeNoShowFee(bookingId) {
        const booking = await this.prisma.resBooking.findUnique({ where: { id: bookingId } });
        if (!booking)
            throw new Error('Booking not found');
        if (!booking.stripePaymentMethodId || !booking.stripeCustomerId)
            throw new Error('No payment method attached');
        const amount = 2000;
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
};
exports.PaymentService = PaymentService;
exports.PaymentService = PaymentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PaymentService);
//# sourceMappingURL=payment.service.js.map