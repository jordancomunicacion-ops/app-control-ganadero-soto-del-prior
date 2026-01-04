import { Module } from '@nestjs/common';
import { InstallerService } from './installer.service';
import { InstallerController } from './installer.controller';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
    controllers: [InstallerController],
    providers: [InstallerService, PrismaService],
})
export class InstallerModule { }
