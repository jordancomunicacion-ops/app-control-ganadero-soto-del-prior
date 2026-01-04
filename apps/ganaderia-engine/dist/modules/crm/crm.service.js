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
var CrmService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrmService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let CrmService = CrmService_1 = class CrmService {
    prisma;
    logger = new common_1.Logger(CrmService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async identify(data) {
        let profile = null;
        if (data.email) {
            profile = await this.prisma.customerProfile.findUnique({
                where: { email: data.email },
            });
        }
        if (!profile && data.phone) {
            profile = await this.prisma.customerProfile.findFirst({
                where: { phone: data.phone },
                orderBy: { updatedAt: 'desc' }
            });
        }
        if (profile) {
            const updateData = {};
            if (!profile.firstName && data.firstName)
                updateData.firstName = data.firstName;
            if (!profile.lastName && data.lastName)
                updateData.lastName = data.lastName;
            if (!profile.phone && data.phone)
                updateData.phone = data.phone;
            if (!profile.email && data.email)
                updateData.email = data.email;
            if (Object.keys(updateData).length > 0) {
                profile = await this.prisma.customerProfile.update({
                    where: { id: profile.id },
                    data: updateData
                });
            }
            return profile;
        }
        return this.prisma.customerProfile.create({
            data: {
                email: data.email,
                phone: data.phone,
                firstName: data.firstName,
                lastName: data.lastName,
                lifecycleStage: 'LEAD',
            }
        });
    }
    async trackVisit(data) {
        let customerProfileId;
        if (data.email) {
            const profile = await this.identify({ email: data.email });
            customerProfileId = profile.id;
        }
        return this.prisma.webVisit.create({
            data: {
                sessionId: data.sessionId,
                url: data.url,
                visitorId: data.visitorId,
                customerProfileId,
            }
        });
    }
    async getProfiles(page = 1, limit = 50) {
        return this.prisma.customerProfile.findMany({
            take: limit,
            skip: (page - 1) * limit,
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { identityLinks: true, webVisits: true } } }
        });
    }
};
exports.CrmService = CrmService;
exports.CrmService = CrmService = CrmService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CrmService);
//# sourceMappingURL=crm.service.js.map