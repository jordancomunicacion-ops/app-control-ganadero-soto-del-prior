import { Controller, Post, Body, Param } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payments')
export class PaymentController {
    constructor(private paymentService: PaymentService) { }

    @Post('attach/:bookingId')
    async attachCard(
        @Param('bookingId') bookingId: string,
        @Body('paymentMethodId') paymentMethodId: string
    ) {
        return this.paymentService.savePaymentMethod(bookingId, paymentMethodId);
    }

    @Post('charge-no-show/:bookingId')
    async chargeNoShow(@Param('bookingId') bookingId: string) {
        return this.paymentService.chargeNoShowFee(bookingId);
    }
}
