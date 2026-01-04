import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { BookingService } from './booking.service';

@Controller('bookings')
export class BookingController {
    constructor(private readonly bookingService: BookingService) { }

    @Post()
    createBooking(@Body() body: any) {
        return this.bookingService.createBooking(body);
    }

    @Get('availability')
    checkAvailability(
        @Query('hotelId') hotelId: string,
        @Query('from') from: string,
        @Query('to') to: string,
        @Query('pax') pax: string
    ) {
        return this.bookingService.checkAvailability(hotelId, from, to, +pax);
    }

    @Get(':hotelId')
    getBookings(@Param('hotelId') hotelId: string) {
        return this.bookingService.getBookings(hotelId);
    }
}
