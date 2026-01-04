import { Controller, Get, Post, Body } from '@nestjs/common';
import { InstallerService } from './installer.service';

@Controller('installer')
export class InstallerController {
    constructor(private readonly installerService: InstallerService) { }

    @Get('status')
    getStatus() {
        return this.installerService.getStatus();
    }

    @Post('setup')
    async setup(@Body() body: {
        hotelName: string;
        currency: string;
        adminEmail: string;
        createRestaurant?: boolean;
        restaurantName?: string;
        zones?: { name: string; tables: number }[]
    }) {
        return this.installerService.setupSystem(body);
    }
}
