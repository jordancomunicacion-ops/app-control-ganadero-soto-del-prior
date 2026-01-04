import { PrismaService } from '../../prisma/prisma.service';
import { CrmService } from '../crm/crm.service';
export declare class CampaignsService {
    private prisma;
    private crmService;
    private readonly logger;
    constructor(prisma: PrismaService, crmService: CrmService);
    createCampaign(data: {
        name: string;
        type: string;
        subject?: string;
        content: string;
    }): Promise<any>;
    getCampaigns(): Promise<any>;
    executeCampaign(id: string): Promise<any>;
    private sendMessage;
}
