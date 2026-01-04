import { Module } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { CrmModule } from '../crm/crm.module';

@Module({
    imports: [PrismaModule, CrmModule],
    controllers: [CampaignsController],
    providers: [CampaignsService],
})
export class CampaignsModule { }
