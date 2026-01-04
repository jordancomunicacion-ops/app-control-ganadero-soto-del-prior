import { PrismaService } from '../../prisma/prisma.service';
export declare class ChannelManagerService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    handleCron(): Promise<void>;
    getFeeds(): Promise<({
        roomType: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            basePrice: import("@prisma/client/runtime/library").Decimal;
            capacity: number;
            amenities: string | null;
            hotelId: string;
        };
    } & {
        id: string;
        name: string | null;
        isActive: boolean;
        roomTypeId: string;
        source: string;
        url: string;
        lastSync: Date | null;
    })[]>;
    createFeed(data: {
        roomTypeId: string;
        url: string;
        name: string;
        source: string;
    }): Promise<{
        id: string;
        name: string | null;
        isActive: boolean;
        roomTypeId: string;
        source: string;
        url: string;
        lastSync: Date | null;
    }>;
    syncAllFeeds(): Promise<void>;
    private processICalUrl;
    private allocateRoomForOTA;
    pushInventory(hotelId: string): Promise<void>;
    generateICal(roomTypeId: string): Promise<string>;
}
