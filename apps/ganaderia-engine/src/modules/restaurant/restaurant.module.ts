import { Module } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { RestaurantController } from './restaurant.controller';
import { PrismaService } from '../../prisma/prisma.service';

import { MailModule } from '../mail/mail.module';

@Module({
    imports: [MailModule],
    controllers: [RestaurantController],
    providers: [RestaurantService, PrismaService],
})
export class RestaurantModule { }
