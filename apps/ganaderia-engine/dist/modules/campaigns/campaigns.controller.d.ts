import { CampaignsService } from './campaigns.service';
export declare class CampaignsController {
    private readonly campaignsService;
    constructor(campaignsService: CampaignsService);
    create(body: {
        name: string;
        type: string;
        subject?: string;
        content: string;
    }): Promise<any>;
    findAll(): Promise<any>;
    execute(id: string): Promise<any>;
}
