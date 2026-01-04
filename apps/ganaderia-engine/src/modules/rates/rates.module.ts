
import { Module } from '@nestjs/common';
import { RatesService } from './rates.service';
import { AvailabilityService } from './availability.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { RatesController } from './rates.controller';

@Module({
    imports: [PrismaModule],
    controllers: [RatesController],
    providers: [RatesService, AvailabilityService],
    exports: [RatesService, AvailabilityService],
})
export class RatesModule { }
