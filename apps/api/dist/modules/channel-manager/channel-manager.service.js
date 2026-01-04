"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ChannelManagerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelManagerService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../prisma/prisma.service");
const ical = __importStar(require("node-ical"));
const constants_1 = require("../../common/constants");
let ChannelManagerService = ChannelManagerService_1 = class ChannelManagerService {
    prisma;
    logger = new common_1.Logger(ChannelManagerService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async handleCron() {
        this.logger.log('Starting Channel Manager Sync...');
        await this.syncAllFeeds();
    }
    async getFeeds() {
        return this.prisma.iCalFeed.findMany({ include: { roomType: true } });
    }
    async createFeed(data) {
        return this.prisma.iCalFeed.create({ data });
    }
    async syncAllFeeds() {
        const feeds = await this.prisma.iCalFeed.findMany({ where: { isActive: true }, include: { roomType: true } });
        for (const feed of feeds) {
            this.logger.log(`Syncing iCal: ${feed.name || feed.url}`);
            await this.processICalUrl(feed);
        }
    }
    async processICalUrl(feed) {
        try {
            const events = await ical.async.fromURL(feed.url);
            for (const k in events) {
                const event = events[k];
                if (event.type !== 'VEVENT')
                    continue;
                const uid = event.uid;
                const start = new Date(event.start);
                const end = new Date(event.end);
                const summary = event.summary || 'OTA Booking';
                const existing = await this.prisma.booking.findFirst({
                    where: { otaId: uid }
                });
                if (existing) {
                    continue;
                }
                const roomTypeId = feed.roomTypeId;
                const room = await this.allocateRoomForOTA(roomTypeId, start, end);
                if (room) {
                    await this.prisma.booking.create({
                        data: {
                            hotelId: feed.roomType.hotelId,
                            guestName: `OTA Guest (${summary})`,
                            checkInDate: start,
                            checkOutDate: end,
                            nights: Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)),
                            totalPrice: 0,
                            status: constants_1.BookingStatus.CONFIRMED,
                            source: feed.source === 'BOOKING' ? constants_1.BookingSource.BOOKING_COM : constants_1.BookingSource.AIRBNB,
                            referenceCode: `EXT-${Date.now()}`,
                            otaId: uid,
                            bookingRooms: {
                                create: [{
                                        roomId: room.id,
                                        priceSnapshot: 0,
                                        date: start
                                    }]
                            }
                        }
                    });
                    this.logger.log(`imported iCal event ${uid} for RoomType ${roomTypeId}`);
                }
                else {
                    this.logger.error(`OVERBOOKING ALERT: No room available for OTA event ${uid} on dates ${start.toDateString()}`);
                }
            }
            await this.prisma.iCalFeed.update({ where: { id: feed.id }, data: { lastSync: new Date() } });
        }
        catch (e) {
            this.logger.error(`Error syncing feed ${feed.id}`, e);
        }
    }
    async allocateRoomForOTA(roomTypeId, start, end) {
        const allRooms = await this.prisma.room.findMany({ where: { roomTypeId, isActive: true } });
        for (const room of allRooms) {
            const conflict = await this.prisma.bookingRoom.findFirst({
                where: {
                    roomId: room.id,
                    booking: {
                        status: { not: 'CANCELLED' },
                        checkInDate: { lt: end },
                        checkOutDate: { gt: start }
                    }
                }
            });
            if (!conflict)
                return room;
        }
        return null;
    }
    async pushInventory(hotelId) {
        const mappings = await this.prisma.channelMapping.findMany({
            where: { channel: { name: 'Booking.com' }, roomType: { hotelId } },
            include: { roomType: { include: { dailyPrices: true, restrictions: true } } }
        });
        for (const map of mappings) {
        }
    }
    async generateICal(roomTypeId) {
        const bookings = await this.prisma.booking.findMany({
            where: {
                bookingRooms: { some: { room: { roomTypeId } } },
                status: constants_1.BookingStatus.CONFIRMED
            }
        });
        let ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//SotoDelPrior//PMS//EN\n`;
        for (const b of bookings) {
            ics += `BEGIN:VEVENT\n`;
            ics += `UID:${b.id}@sotodelprior.com\n`;
            ics += `DTSTART;VALUE=DATE:${b.checkInDate.toISOString().replace(/[-:]/g, '').split('T')[0]}\n`;
            ics += `DTEND;VALUE=DATE:${b.checkOutDate.toISOString().replace(/[-:]/g, '').split('T')[0]}\n`;
            ics += `SUMMARY:Reserved\n`;
            ics += `END:VEVENT\n`;
        }
        ics += `END:VCALENDAR`;
        return ics;
    }
};
exports.ChannelManagerService = ChannelManagerService;
__decorate([
    (0, schedule_1.Cron)('0 */10 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ChannelManagerService.prototype, "handleCron", null);
exports.ChannelManagerService = ChannelManagerService = ChannelManagerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ChannelManagerService);
//# sourceMappingURL=channel-manager.service.js.map