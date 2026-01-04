import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WidgetConfigService {
    constructor(private prisma: PrismaService) { }

    async getConfig(hotelId: string) {
        return this.prisma.widgetConfig.findUnique({ where: { hotelId } });
    }

    async updateConfig(hotelId: string, data: any) {
        return this.prisma.widgetConfig.upsert({
            where: { hotelId },
            update: { ...data },
            create: { hotelId, ...data }
        });
    }
}
