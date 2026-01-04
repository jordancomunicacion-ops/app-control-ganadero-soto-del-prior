import { PrismaService } from '../../prisma/prisma.service';
export declare class CrmService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    identify(data: {
        email?: string;
        phone?: string;
        firstName?: string;
        lastName?: string;
    }): Promise<any>;
    trackVisit(data: {
        sessionId: string;
        url: string;
        visitorId?: string;
        email?: string;
    }): Promise<any>;
    getProfiles(page?: number, limit?: number): Promise<any>;
}
