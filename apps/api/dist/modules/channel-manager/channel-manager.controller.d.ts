import { ChannelManagerService } from './channel-manager.service';
import type { Response } from 'express';
export declare class ChannelManagerController {
    private readonly channelService;
    constructor(channelService: ChannelManagerService);
    forceSync(): Promise<{
        status: string;
    }>;
    exportICal(mk: string, res: Response): Promise<void>;
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
    createFeed(body: {
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
}
