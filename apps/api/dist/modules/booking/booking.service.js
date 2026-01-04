"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const constants_1 = require("../../common/constants");
const rates_service_1 = require("../rates/rates.service");
const availability_service_1 = require("../rates/availability.service");
let BookingService = class BookingService {
    prisma;
    ratesService;
    availabilityService;
    constructor(prisma, ratesService, availabilityService) {
        this.prisma = prisma;
        this.ratesService = ratesService;
        this.availabilityService = availabilityService;
    }
    async createBooking(data) {
        const checkIn = new Date(data.checkInDate);
        const checkOut = new Date(data.checkOutDate);
        let ratePlanId = data.ratePlanId;
        if (!ratePlanId) {
            const defaultPlan = await this.prisma.ratePlan.findFirst({
                where: { hotelId: data.hotelId, isDefault: true }
            });
            if (!defaultPlan) {
                const anyPlan = await this.prisma.ratePlan.findFirst({ where: { hotelId: data.hotelId } });
                if (!anyPlan)
                    throw new common_1.BadRequestException("No Rate Plan configured for this hotel.");
                ratePlanId = anyPlan.id;
            }
            else {
                ratePlanId = defaultPlan.id;
            }
        }
        try {
            await this.availabilityService.checkAvailability(data.hotelId, data.roomTypeId, ratePlanId, checkIn, checkOut, 1);
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
        const priceInfo = await this.ratesService.calculatePrice(data.hotelId, data.roomTypeId, ratePlanId, checkIn, checkOut, data.pax);
        const room = await this.allocateRoom(data.hotelId, data.roomTypeId, checkIn, checkOut);
        if (!room)
            throw new common_1.BadRequestException('System error: Inventory check passed but no physical room found.');
        const booking = await this.prisma.booking.create({
            data: {
                hotelId: data.hotelId,
                guestName: data.guestName,
                checkInDate: checkIn,
                checkOutDate: checkOut,
                totalPrice: priceInfo.totalPrice,
                nights: this.calculateNights(checkIn, checkOut),
                referenceCode: `RES-${Date.now()}`,
                status: constants_1.BookingStatus.CONFIRMED,
                source: constants_1.BookingSource.MANUAL,
                bookingRooms: {
                    create: [{
                            roomId: room.id,
                            priceSnapshot: priceInfo.totalPrice,
                            date: checkIn
                        }]
                }
            },
            include: { bookingRooms: true }
        });
        this.syncWithCRM(booking, data.guestEmail, data.guestPhone);
        return booking;
    }
    async syncWithCRM(booking, email, phone) {
        if (!email)
            return;
        const [firstName, ...rest] = booking.guestName.split(' ');
        const lastName = rest.join(' ') || '';
        try {
            await fetch('http://localhost:3004/api/integrations/hotel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    guest: {
                        email,
                        phone,
                        firstName,
                        lastName
                    },
                    booking: {
                        total: Number(booking.totalPrice),
                        nights: booking.nights,
                        roomType: 'Standard'
                    }
                })
            });
            console.log(`[CRM-SYNC] Synced booking ${booking.referenceCode} to CRM.`);
        }
        catch (error) {
            console.error('[CRM-SYNC] Failed to sync booking:', error);
        }
    }
    async getBookings(hotelId) {
        return this.prisma.booking.findMany({
            where: { hotelId },
            include: { bookingRooms: { include: { room: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async checkAvailability(hotelId, from, to, pax) {
        const checkIn = new Date(from);
        const checkOut = new Date(to);
        const roomTypes = await this.prisma.roomType.findMany({
            where: { hotelId, capacity: { gte: +pax } },
        });
        const defaultRatePlan = await this.prisma.ratePlan.findFirst({
            where: { hotelId, isDefault: true }
        });
        if (!defaultRatePlan)
            return [];
        const availableTypes = [];
        for (const type of roomTypes) {
            try {
                await this.availabilityService.checkAvailability(hotelId, type.id, defaultRatePlan.id, checkIn, checkOut);
                const priceInfo = await this.ratesService.calculatePrice(hotelId, type.id, defaultRatePlan.id, checkIn, checkOut, pax);
                availableTypes.push({
                    ...type,
                    totalPrice: priceInfo.totalPrice,
                    ratePlan: defaultRatePlan.name,
                    breakdown: priceInfo.breakdown
                });
            }
            catch (e) {
                continue;
            }
        }
        return availableTypes;
    }
    async allocateRoom(hotelId, roomTypeId, start, end) {
        const allRooms = await this.prisma.room.findMany({
            where: { roomTypeId, isActive: true }
        });
        for (const room of allRooms) {
            const isBusy = await this.prisma.bookingRoom.findFirst({
                where: {
                    roomId: room.id,
                    booking: {
                        status: { not: 'CANCELLED' },
                        checkInDate: { lt: end },
                        checkOutDate: { gt: start }
                    }
                }
            });
            if (!isBusy)
                return room;
        }
        return null;
    }
    calculateNights(start, end) {
        return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }
};
exports.BookingService = BookingService;
exports.BookingService = BookingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        rates_service_1.RatesService,
        availability_service_1.AvailabilityService])
], BookingService);
//# sourceMappingURL=booking.service.js.map