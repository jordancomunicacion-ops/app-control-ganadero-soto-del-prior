import { PrismaService } from '../../prisma/prisma.service';
export declare class PropertyService {
    private prisma;
    constructor(prisma: PrismaService);
    createHotel(data: {
        name: string;
        currency: string;
        timezone: string;
    }): Promise<{
        id: string;
        name: string;
        domain: string | null;
        timezone: string;
        currency: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getHotels(): Promise<{
        id: string;
        name: string;
        domain: string | null;
        timezone: string;
        currency: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getHotel(id: string): Promise<({
        roomTypes: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            basePrice: import("@prisma/client/runtime/library").Decimal;
            capacity: number;
            amenities: string | null;
            hotelId: string;
        }[];
    } & {
        id: string;
        name: string;
        domain: string | null;
        timezone: string;
        currency: string;
        createdAt: Date;
        updatedAt: Date;
    }) | null>;
    createRoomType(hotelId: string, data: {
        name: string;
        basePrice: number;
        capacity: number;
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        basePrice: import("@prisma/client/runtime/library").Decimal;
        capacity: number;
        amenities: string | null;
        hotelId: string;
    }>;
    getRoomTypes(hotelId: string): Promise<({
        rooms: {
            id: string;
            name: string;
            isActive: boolean;
            roomTypeId: string;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        basePrice: import("@prisma/client/runtime/library").Decimal;
        capacity: number;
        amenities: string | null;
        hotelId: string;
    })[]>;
    createRoom(roomTypeId: string, name: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        roomTypeId: string;
    }>;
}
