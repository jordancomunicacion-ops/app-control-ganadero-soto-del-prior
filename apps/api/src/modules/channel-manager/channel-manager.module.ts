import { Module } from '@nestjs/common';
import { ChannelManagerService } from './channel-manager.service';
import { ChannelManagerController } from './channel-manager.controller';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
    controllers: [ChannelManagerController],
    providers: [ChannelManagerService, PrismaService],
})
export class ChannelManagerModule { }
