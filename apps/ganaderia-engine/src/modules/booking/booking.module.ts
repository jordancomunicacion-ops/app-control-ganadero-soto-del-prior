import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RatesModule } from '../rates/rates.module';

@Module({
    imports: [RatesModule],
    controllers: [BookingController],
    providers: [BookingService, PrismaService],
})
export class BookingModule { }
