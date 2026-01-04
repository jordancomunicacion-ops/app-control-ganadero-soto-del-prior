import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PropertyService {
    constructor(private prisma: PrismaService) { }

    // HOTEL
    async createHotel(data: { name: string; currency: string; timezone: string }) {
        return this.prisma.hotel.create({ data });
    }

    async getHotels() {
        return this.prisma.hotel.findMany();
    }

    async getHotel(id: string) {
        return this.prisma.hotel.findUnique({
            where: { id },
            include: { roomTypes: true },
        });
    }

    // ROOM TYPES
    async createRoomType(hotelId: string, data: { name: string; basePrice: number; capacity: number }) {
        return this.prisma.roomType.create({
            data: {
                ...data,
                hotelId,
            },
        });
    }

    async getRoomTypes(hotelId: string) {
        return this.prisma.roomType.findMany({
            where: { hotelId },
            include: { rooms: true },
        });
    }

    // ROOMS (UNITS)
    async createRoom(roomTypeId: string, name: string) {
        return this.prisma.room.create({
            data: {
                roomTypeId,
                name,
            },
        });
    }
}
