import { CrmService } from './crm.service';
export declare class CrmController {
    private readonly crmService;
    constructor(crmService: CrmService);
    identify(body: {
        email?: string;
        phone?: string;
        firstName?: string;
        lastName?: string;
    }): Promise<any>;
    track(body: {
        sessionId: string;
        url: string;
        visitorId?: string;
        email?: string;
    }): Promise<any>;
    getProfiles(page?: number): Promise<any>;
}
