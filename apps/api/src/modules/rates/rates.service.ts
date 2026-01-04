
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RatesService {
    constructor(private prisma: PrismaService) { }

    /**
     * Calculate final rate for a RoomType over a date range.
     * Priority: DailyPrice > (Season * BasePrice) > BasePrice
     */
    async calculatePrice(
        hotelId: string,
        roomTypeId: string,
        ratePlanId: string,
        checkIn: Date,
        checkOut: Date,
        guests: number
    ): Promise<{ totalPrice: number; breakdown: any[] }> {
        // 1. Fetch Configuration
        const roomType = await this.prisma.roomType.findUnique({ where: { id: roomTypeId } });
        if (!roomType) throw new Error('Room Type not found');

        const ratePlan = await this.prisma.ratePlan.findUnique({ where: { id: ratePlanId } });
        if (!ratePlan) throw new Error('Rate Plan not found');

        const seasons = await this.prisma.season.findMany({ where: { hotelId } });

        // 2. Iterate dates
        let currentDate = new Date(checkIn);
        const endDate = new Date(checkOut);
        let total = 0;
        const breakdown: any[] = [];

        while (currentDate < endDate) {
            const dateKey = currentDate;
            // Note: In real implementation, handle timezone accurately (e.g., set hours to 00:00:00 UTC)

            // A. Check for Daily Price Override
            // A. Check for Daily Price Override
            const dailyPrice = await this.prisma.dailyPrice.findFirst({
                where: {
                    roomTypeId,
                    ratePlanId,
                    date: dateKey,
                },
            });

            let nightlyRate = 0;

            if (dailyPrice) {
                nightlyRate = Number(dailyPrice.price);
            } else {
                // B. Check Season Multiplier
                const activeSeason = seasons.find(
                    (s) => currentDate >= s.startDate && currentDate <= s.endDate
                );
                const multiplier = activeSeason ? Number(activeSeason.priceMultiplier) : 1.0;

                // Base Calculation
                nightlyRate = Number(roomType.basePrice) * multiplier;
            }

            // C. Apply Rate Plan modifiers (if any, e.g. defined in schema as JSON or simple logic)
            // For now, assume RatePlan is just a container for DailyPrices, but you could add -10% for "Non-Refundable" logic here.

            total += nightlyRate;
            breakdown.push({ date: new Date(currentDate), price: nightlyRate });

            // Next Day
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return { totalPrice: total, breakdown };
    }
}
