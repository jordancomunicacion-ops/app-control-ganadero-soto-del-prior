import { Module } from '@nestjs/common';
import { WidgetConfigService } from './widget-config.service';
import { WidgetConfigController } from './widget-config.controller';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
    controllers: [WidgetConfigController],
    providers: [WidgetConfigService, PrismaService],
})
export class WidgetConfigModule { }
