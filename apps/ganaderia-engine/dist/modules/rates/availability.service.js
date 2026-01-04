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
exports.AvailabilityService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let AvailabilityService = class AvailabilityService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async checkAvailability(hotelId, roomTypeId, ratePlanId, checkIn, checkOut, unitsRequested = 1) {
        const nights = (checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24);
        let currentDate = new Date(checkIn);
        const endDate = new Date(checkOut);
        while (currentDate < endDate) {
            const restrictions = await this.prisma.restriction.findMany({
                where: {
                    hotelId,
                    date: currentDate,
                    OR: [
                        { roomTypeId: roomTypeId, ratePlanId: ratePlanId },
                        { roomTypeId: roomTypeId, ratePlanId: null },
                        { roomTypeId: null, ratePlanId: null }
                    ]
                }
            });
            const specific = restrictions.find(r => r.roomTypeId === roomTypeId && r.ratePlanId === ratePlanId);
            const roomGlobal = restrictions.find(r => r.roomTypeId === roomTypeId && !r.ratePlanId);
            const hotelGlobal = restrictions.find(r => !r.roomTypeId);
            const activeParams = { ...hotelGlobal, ...roomGlobal, ...specific };
            const effectiveStopSell = specific?.stopSell ?? roomGlobal?.stopSell ?? hotelGlobal?.stopSell ?? false;
            const effectiveCTA = specific?.closedToArrival ?? roomGlobal?.closedToArrival ?? hotelGlobal?.closedToArrival ?? false;
            const effectiveMinStay = specific?.minStay ?? roomGlobal?.minStay ?? hotelGlobal?.minStay ?? 0;
            if (effectiveStopSell) {
                throw new Error(`Stop Sell active on ${currentDate.toDateString()}`);
            }
            if (currentDate.getTime() === checkIn.getTime() && effectiveCTA) {
                throw new Error(`Closed to Arrival on ${currentDate.toDateString()}`);
            }
            if (effectiveMinStay > 0 && nights < effectiveMinStay) {
                throw new Error(`Minimum stay of ${effectiveMinStay} nights required on ${currentDate.toDateString()}`);
            }
            const roomsTotal = await this.prisma.room.count({
                where: { roomTypeId, isActive: true }
            });
            const bookingsCount = await this.prisma.bookingRoom.count({
                where: {
                    room: { roomTypeId },
                    booking: {
                        checkInDate: { lte: currentDate },
                        checkOutDate: { gt: currentDate },
                        status: { not: 'CANCELLED' }
                    }
                }
            });
            if (roomsTotal - bookingsCount < unitsRequested) {
                throw new Error(`No inventory available on ${currentDate.toDateString()}`);
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        const ctdRestriction = await this.prisma.restriction.findFirst({
            where: {
                hotelId,
                date: checkOut,
            }
        });
        if (ctdRestriction?.closedToDeparture) {
            throw new Error(`Closed to Departure on ${checkOut.toDateString()}`);
        }
        return true;
    }
};
exports.AvailabilityService = AvailabilityService;
exports.AvailabilityService = AvailabilityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AvailabilityService);
//# sourceMappingURL=availability.service.js.map