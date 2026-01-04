import { RatesService } from './rates.service';
import { AvailabilityService } from './availability.service';
import { PrismaService } from '../../prisma/prisma.service';
export declare class RatesController {
    private readonly ratesService;
    private readonly availabilityService;
    private readonly prisma;
    constructor(ratesService: RatesService, availabilityService: AvailabilityService, prisma: PrismaService);
    getRatePlans(hotelId: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        hotelId: string;
        isDefault: boolean;
        cancellationPolicy: string | null;
        mealsIncluded: string | null;
        requireCreditCard: boolean;
        noShowFee: import("@prisma/client/runtime/library").Decimal;
    }[]>;
    createRatePlan(body: any): Promise<{
        id: string;
        name: string;
        description: string | null;
        hotelId: string;
        isDefault: boolean;
        cancellationPolicy: string | null;
        mealsIncluded: string | null;
        requireCreditCard: boolean;
        noShowFee: import("@prisma/client/runtime/library").Decimal;
    }>;
    updatePrices(body: {
        hotelId: string;
        ratePlanId: string;
        roomTypeId: string;
        fromDate: string;
        toDate: string;
        price: number;
    }): Promise<{
        status: string;
        count: number;
    }>;
}
