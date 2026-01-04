import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { WidgetConfigService } from './widget-config.service';

@Controller('config')
export class WidgetConfigController {
    constructor(private readonly service: WidgetConfigService) { }

    @Get(':hotelId')
    getConfig(@Param('hotelId') hotelId: string) {
        return this.service.getConfig(hotelId);
    }

    @Post(':hotelId')
    updateConfig(@Param('hotelId') hotelId: string, @Body() body: any) {
        return this.service.updateConfig(hotelId, body);
    }
}
