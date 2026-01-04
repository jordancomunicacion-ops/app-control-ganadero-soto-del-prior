import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';

@Controller('restaurant')
export class RestaurantController {
    constructor(private readonly service: RestaurantService) { }

    @Post()
    createRestaurant(@Body() body: any) {
        return this.service.createRestaurant(body);
    }

    @Get()
    getRestaurants() {
        return this.service.getRestaurants();
    }

    @Post('zones')
    createZone(@Body() body: { restaurantId: string; name: string }) {
        return this.service.createZone(body.restaurantId, body.name);
    }

    @Post('tables')
    createTable(@Body() body: { zoneId: string; name: string; capacity: number }) {
        return this.service.createTable(body.zoneId, body.name, body.capacity);
    }

    @Get(':id/tables')
    getTables(@Param('id') id: string) {
        return this.service.getTables(id);
    }

    @Post(':id/zones/sync')
    syncZones(@Param('id') id: string, @Body() body: any[]) {
        return this.service.syncZones(id, body);
    }

    @Post('zones/:id/tables/sync')
    syncTables(@Param('id') id: string, @Body() body: any[]) {
        return this.service.syncTables(id, body);
    }

    // --- Bookings ---
    @Get(':id/bookings')
    getBookings(@Param('id') id: string, @Query('date') date: string) {
        return this.service.getBookings(id, date);
    }

    @Post('bookings')
    createBooking(@Body() body: any) {
        return this.service.createBooking(body);
    }

    // --- Waitlist ---
    @Post(':id/waitlist')
    addToWaitlist(@Param('id') id: string, @Body() body: any) {
        return this.service.addToWaitlist(id, body);
    }

    @Get(':id/waitlist')
    getWaitlist(@Param('id') id: string) {
        return this.service.getWaitlist(id);
    }

    // --- Public Widget Flow ---

    @Post('public/reservation')
    createPublicReservation(@Body() body: any) {
        return this.service.createPublicReservation(body);
    }

    @Post('reservation/:id/confirm')
    confirmReservation(@Param('id') id: string) {
        return this.service.confirmReservation(id);
    }

    @Post('reservation/:id/cancel')
    cancelReservation(@Param('id') id: string) {
        return this.service.cancelReservation(id);
    }
}
