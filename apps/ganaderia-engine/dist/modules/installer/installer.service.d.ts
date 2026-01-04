import { PrismaService } from '../../prisma/prisma.service';
export declare class InstallerService {
    private prisma;
    constructor(prisma: PrismaService);
    getStatus(): Promise<{
        isInstalled: boolean;
        setupRequired: boolean;
    }>;
    setupSystem(data: {
        hotelName: string;
        currency: string;
        adminEmail: string;
        createRestaurant?: boolean;
        restaurantName?: string;
        zones?: {
            name: string;
            tables: number;
        }[];
    }): Promise<{
        success: boolean;
        hotelId: string;
        message: string;
    }>;
}
