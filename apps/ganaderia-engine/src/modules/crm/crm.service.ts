import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CrmService {
    private readonly logger = new Logger(CrmService.name);

    constructor(private prisma: PrismaService) { }

    async identify(data: { email?: string; phone?: string; firstName?: string; lastName?: string }) {
        // 1. Try to find existing profile by Email (Highest Priority)
        let profile: any = null;

        if (data.email) {
            profile = await (this.prisma as any).customerProfile.findUnique({
                where: { email: data.email },
            });
        }

        // 2. If not found, try by Phone
        if (!profile && data.phone) {
            // Phone is not unique in schema currently, but should be treated as identity key
            // We find the most recent one
            profile = await (this.prisma as any).customerProfile.findFirst({
                where: { phone: data.phone },
                orderBy: { updatedAt: 'desc' }
            });
        }

        // 3. If found, update basic info if missing
        if (profile) {
            const updateData: any = {};
            if (!profile.firstName && data.firstName) updateData.firstName = data.firstName;
            if (!profile.lastName && data.lastName) updateData.lastName = data.lastName;
            if (!profile.phone && data.phone) updateData.phone = data.phone;
            if (!profile.email && data.email) updateData.email = data.email;

            if (Object.keys(updateData).length > 0) {
                profile = await (this.prisma as any).customerProfile.update({
                    where: { id: profile.id },
                    data: updateData
                });
            }
            return profile;
        }

        // 4. If not found, create new
        return (this.prisma as any).customerProfile.create({
            data: {
                email: data.email,
                phone: data.phone,
                firstName: data.firstName,
                lastName: data.lastName,
                lifecycleStage: 'LEAD',
            }
        });
    }

    async trackVisit(data: { sessionId: string; url: string; visitorId?: string; email?: string }) {
        let customerProfileId: string | undefined;

        if (data.email) {
            const profile = await this.identify({ email: data.email });
            customerProfileId = profile.id;
        }

        return (this.prisma as any).webVisit.create({
            data: {
                sessionId: data.sessionId,
                url: data.url,
                visitorId: data.visitorId,
                customerProfileId,
            }
        });
    }

    async getProfiles(page = 1, limit = 50) {
        return (this.prisma as any).customerProfile.findMany({
            take: limit,
            skip: (page - 1) * limit,
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { identityLinks: true, webVisits: true } } }
        });
    }
}
