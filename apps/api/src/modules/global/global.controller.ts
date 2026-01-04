import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('global')
export class GlobalController {
    constructor(private prisma: PrismaService) { }

    @Get('contexts')
    async getContexts() {
        const [hotels, restaurants] = await Promise.all([
            this.prisma.hotel.findMany({
                select: { id: true, name: true }
            }),
            this.prisma.restaurant.findMany({
                select: { id: true, name: true }
            })
        ]);

        return {
            hotels,
            restaurants
        };
    }
}
