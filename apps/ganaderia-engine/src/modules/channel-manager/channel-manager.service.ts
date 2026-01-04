
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import * as ical from 'node-ical';
import { BookingStatus, BookingSource } from '../../common/constants';

@Injectable()
export class ChannelManagerService {
    private readonly logger = new Logger(ChannelManagerService.name);

    constructor(private prisma: PrismaService) { }

    // Run every 10 minutes
    @Cron('0 */10 * * * *')
    async handleCron() {
        this.logger.log('Starting Channel Manager Sync...');
        await this.syncAllFeeds();
        // await this.syncBcomApi(); // Level 2/3 Feature
    }

    // --- LEVEL 1: iCal Sync ---

    async getFeeds() {
        return this.prisma.iCalFeed.findMany({ include: { roomType: true } });
    }

    async createFeed(data: { roomTypeId: string; url: string; name: string; source: string }) {
        return this.prisma.iCalFeed.create({ data });
    }

    async syncAllFeeds() {
        const feeds = await this.prisma.iCalFeed.findMany({ where: { isActive: true }, include: { roomType: true } });
        for (const feed of feeds) {
            this.logger.log(`Syncing iCal: ${feed.name || feed.url}`);
            await this.processICalUrl(feed);
        }
    }

    private async processICalUrl(feed: any) {
        try {
            const events = await ical.async.fromURL(feed.url);

            for (const k in events) {
                const event = events[k];
                if (event.type !== 'VEVENT') continue;

                // Handle Booking.com Cancelled Events (often have STATUS:CANCELLED or SUMMARY:Cancelled)
                // if (event.status === 'CANCELLED') ...

                const uid = event.uid;
                const start = new Date(event.start);
                const end = new Date(event.end);
                const summary = event.summary || 'OTA Booking';

                // Idempotency Check
                const existing = await this.prisma.booking.findFirst({
                    where: { otaId: uid }
                });

                if (existing) {
                    // TODO: Check if dates changed and update
                    continue;
                }

                // New Booking from OTA
                // Logic: Find the mapped RoomType from the feed
                const roomTypeId = feed.roomTypeId;

                // Allocate Room (First Available)
                // In a real Channel Manager, we might map to a specific Room if the feed is per-room.
                // Here our feeds are per-RoomType usually.
                const room = await this.allocateRoomForOTA(roomTypeId, start, end);

                if (room) {
                    await this.prisma.booking.create({
                        data: {
                            hotelId: feed.roomType.hotelId,
                            guestName: `OTA Guest (${summary})`,
                            checkInDate: start,
                            checkOutDate: end,
                            nights: Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)),
                            totalPrice: 0, // iCal doesn't verify price
                            status: BookingStatus.CONFIRMED,
                            source: feed.source === 'BOOKING' ? BookingSource.BOOKING_COM : BookingSource.AIRBNB,
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
                } else {
                    this.logger.error(`OVERBOOKING ALERT: No room available for OTA event ${uid} on dates ${start.toDateString()}`);
                    // Notify Admin via Email (TODO)
                }
            }

            await this.prisma.iCalFeed.update({ where: { id: feed.id }, data: { lastSync: new Date() } });

        } catch (e) {
            this.logger.error(`Error syncing feed ${feed.id}`, e);
        }
    }

    private async allocateRoomForOTA(roomTypeId: string, start: Date, end: Date) {
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
            if (!conflict) return room;
        }
        return null;
    }

    // --- LEVEL 3: Booking.com API Stub ---
    // Requires "Connectivity Partner" credentials

    async pushInventory(hotelId: string) {
        // 1. Get Mappings
        const mappings = await this.prisma.channelMapping.findMany({
            where: { channel: { name: 'Booking.com' }, roomType: { hotelId } },
            include: { roomType: { include: { dailyPrices: true, restrictions: true } } }
        });

        for (const map of mappings) {
            // ... (Logic to push inventory would go here)
        }

        /*
        for (const map of mappings) {
            this.logger.log(`Pushing inventory for Room ${map.roomType.name} -> Booking.com ID ${map.externalId}`);
            
            // Construct OTA OTA_HotelRateAmountNotifRQ XML or JSON
            const payload = {
                id: map.externalId,
                dates: []
            };
            
            // await axios.post('https://supply-xml.booking.com/hotels/xml/availability', payload);
        }
        */
    }
    async generateICal(roomTypeId: string) {
        const bookings = await this.prisma.booking.findMany({
            where: {
                bookingRooms: { some: { room: { roomTypeId } } },
                status: BookingStatus.CONFIRMED
            }
        });

        let ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//SotoDelPrior//PMS//EN\n`;

        for (const b of bookings) {
            ics += `BEGIN:VEVENT\n`;
            ics += `UID:${b.id}@sotodelprior.com\n`;
            // Format dates YYYYMMDD
            ics += `DTSTART;VALUE=DATE:${b.checkInDate.toISOString().replace(/[-:]/g, '').split('T')[0]}\n`;
            ics += `DTEND;VALUE=DATE:${b.checkOutDate.toISOString().replace(/[-:]/g, '').split('T')[0]}\n`;
            ics += `SUMMARY:Reserved\n`;
            ics += `END:VEVENT\n`;
        }

        ics += `END:VCALENDAR`;
        return ics;
    }
}
