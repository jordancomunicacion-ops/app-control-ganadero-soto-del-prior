import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CrmService } from '../crm/crm.service';

@Injectable()
export class CampaignsService {
    private readonly logger = new Logger(CampaignsService.name);

    constructor(
        private prisma: PrismaService,
        private crmService: CrmService
    ) { }

    async createCampaign(data: { name: string; type: string; subject?: string; content: string }) {
        return (this.prisma as any).campaign.create({
            data: {
                name: data.name,
                type: data.type, // EMAIL, WHATSAPP
                subject: data.subject,
                content: data.content,
                status: 'DRAFT'
            }
        });
    }

    async getCampaigns() {
        return (this.prisma as any).campaign.findMany({
            orderBy: { createdAt: 'desc' }
        });
    }

    async executeCampaign(id: string) {
        const campaign = await (this.prisma as any).campaign.findUnique({ where: { id } });
        if (!campaign) throw new Error('Campaign not found');

        if (campaign.status === 'SENT') throw new Error('Campaign already sent');

        // 1. Fetch Audience (All profiles for MVP)
        // In V2: Use segmentConfig to filter
        const profiles = await this.crmService.getProfiles(1, 1000); // Limit 1000 for safety

        this.logger.log(`Executing Campaign ${campaign.name} for ${profiles.length} profiles...`);

        let sentCount = 0;

        // 2. Iterate and Send
        for (const profile of profiles) {
            // Check consent
            if (campaign.type === 'EMAIL' && !profile.consentEmail) continue;
            if (campaign.type === 'WHATSAPP' && !profile.consentWhatsApp) continue;

            try {
                await this.sendMessage(campaign.type, profile, campaign);
                sentCount++;
            } catch (e) {
                this.logger.error(`Failed to send to ${profile.email}`, e);
            }
        }

        // 3. Update Status
        return (this.prisma as any).campaign.update({
            where: { id },
            data: {
                status: 'SENT',
                sentCount,
                scheduledAt: new Date()
            }
        });
    }

    private async sendMessage(type: string, profile: any, campaign: any) {
        // MOCK SENDING
        this.logger.log(`[MOCK] Sending ${type} to ${profile.email || profile.phone}: ${campaign.subject || 'No Subject'}`);

        // In V2: Integrate SES / WhatsApp Cloud API here
        return true;
    }
}
