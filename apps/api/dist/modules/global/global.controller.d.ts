import { PrismaService } from '../../prisma/prisma.service';
export declare class GlobalController {
    private prisma;
    constructor(prisma: PrismaService);
    getContexts(): Promise<{
        hotels: {
            id: string;
            name: string;
        }[];
        restaurants: {
            id: string;
            name: string;
        }[];
    }>;
}
