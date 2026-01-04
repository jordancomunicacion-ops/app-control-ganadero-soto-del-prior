import { Module } from '@nestjs/common';
import { GlobalController } from './global.controller';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
    controllers: [GlobalController],
    providers: [PrismaService],
})
export class GlobalModule { }
