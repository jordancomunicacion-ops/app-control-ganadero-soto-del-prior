"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CampaignsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const crm_service_1 = require("../crm/crm.service");
let CampaignsService = CampaignsService_1 = class CampaignsService {
    prisma;
    crmService;
    logger = new common_1.Logger(CampaignsService_1.name);
    constructor(prisma, crmService) {
        this.prisma = prisma;
        this.crmService = crmService;
    }
    async createCampaign(data) {
        return this.prisma.campaign.create({
            data: {
                name: data.name,
                type: data.type,
                subject: data.subject,
                content: data.content,
                status: 'DRAFT'
            }
        });
    }
    async getCampaigns() {
        return this.prisma.campaign.findMany({
            orderBy: { createdAt: 'desc' }
        });
    }
    async executeCampaign(id) {
        const campaign = await this.prisma.campaign.findUnique({ where: { id } });
        if (!campaign)
            throw new Error('Campaign not found');
        if (campaign.status === 'SENT')
            throw new Error('Campaign already sent');
        const profiles = await this.crmService.getProfiles(1, 1000);
        this.logger.log(`Executing Campaign ${campaign.name} for ${profiles.length} profiles...`);
        let sentCount = 0;
        for (const profile of profiles) {
            if (campaign.type === 'EMAIL' && !profile.consentEmail)
                continue;
            if (campaign.type === 'WHATSAPP' && !profile.consentWhatsApp)
                continue;
            try {
                await this.sendMessage(campaign.type, profile, campaign);
                sentCount++;
            }
            catch (e) {
                this.logger.error(`Failed to send to ${profile.email}`, e);
            }
        }
        return this.prisma.campaign.update({
            where: { id },
            data: {
                status: 'SENT',
                sentCount,
                scheduledAt: new Date()
            }
        });
    }
    async sendMessage(type, profile, campaign) {
        this.logger.log(`[MOCK] Sending ${type} to ${profile.email || profile.phone}: ${campaign.subject || 'No Subject'}`);
        return true;
    }
};
exports.CampaignsService = CampaignsService;
exports.CampaignsService = CampaignsService = CampaignsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        crm_service_1.CrmService])
], CampaignsService);
//# sourceMappingURL=campaigns.service.js.map