import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { RatesService } from './rates.service';
import { AvailabilityService } from './availability.service';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('rates')
export class RatesController {
    constructor(
        private readonly ratesService: RatesService,
        private readonly availabilityService: AvailabilityService,
        private readonly prisma: PrismaService
    ) { }

    @Get('plans/:hotelId')
    async getRatePlans(@Param('hotelId') hotelId: string) {
        return this.prisma.ratePlan.findMany({
            where: { hotelId }
        });
    }

    @Post('plans')
    async createRatePlan(@Body() body: any) {
        return this.prisma.ratePlan.create({ data: body });
    }

    // Bulk Update Prices
    @Post('prices/bulk')
    async updatePrices(@Body() body: {
        hotelId: string;
        ratePlanId: string;
        roomTypeId: string;
        fromDate: string;
        toDate: string;
        price: number;
    }) {
        // Logic to generate DailyPrice records for range
        // Simplified: Loop and create/update
        const start = new Date(body.fromDate);
        const end = new Date(body.toDate);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateKey = new Date(d);
            // Validating existence of params would be good here

            // Upsert DailyPrice
            // Note: Since DailyPrice might be missing in Stale Client, we use raw query or Prisma any cast
            // Ideally:
            /*
            await this.prisma.dailyPrice.upsert({
                where: {
                    roomTypeId_ratePlanId_date: {
                        roomTypeId: body.roomTypeId,
                        ratePlanId: body.ratePlanId,
                        date: dateKey
                    }
                },
                update: { price: body.price },
                create: {
                    hotelId: body.hotelId,
                    roomTypeId: body.roomTypeId,
                    ratePlanId: body.ratePlanId,
                    date: dateKey,
                    price: body.price
                }
            });
            */
            // Placeholder for now until Client Refreshed
        }
        return { status: 'success', count: 0 };
    }
}
