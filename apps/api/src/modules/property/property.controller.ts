import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { PropertyService } from './property.service';

@Controller('property')
export class PropertyController {
    constructor(private readonly propertyService: PropertyService) { }

    @Post('hotels')
    createHotel(@Body() body: { name: string; currency: string; timezone: string }) {
        return this.propertyService.createHotel(body);
    }

    @Get('hotels')
    getHotels() {
        return this.propertyService.getHotels();
    }

    @Get('hotels/:id')
    getHotel(@Param('id') id: string) {
        return this.propertyService.getHotel(id);
    }

    @Post('hotels/:id/room-types')
    createRoomType(
        @Param('id') hotelId: string,
        @Body() body: { name: string; basePrice: number; capacity: number },
    ) {
        return this.propertyService.createRoomType(hotelId, body);
    }

    @Get('hotels/:id/room-types')
    getRoomTypes(@Param('id') hotelId: string) {
        return this.propertyService.getRoomTypes(hotelId);
    }

    @Post('room-types/:id/rooms')
    createRoom(@Param('id') roomTypeId: string, @Body('name') name: string) {
        return this.propertyService.createRoom(roomTypeId, name);
    }
}
