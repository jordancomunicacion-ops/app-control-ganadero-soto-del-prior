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
exports.RatesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let RatesService = class RatesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async calculatePrice(hotelId, roomTypeId, ratePlanId, checkIn, checkOut, guests) {
        const roomType = await this.prisma.roomType.findUnique({ where: { id: roomTypeId } });
        if (!roomType)
            throw new Error('Room Type not found');
        const ratePlan = await this.prisma.ratePlan.findUnique({ where: { id: ratePlanId } });
        if (!ratePlan)
            throw new Error('Rate Plan not found');
        const seasons = await this.prisma.season.findMany({ where: { hotelId } });
        let currentDate = new Date(checkIn);
        const endDate = new Date(checkOut);
        let total = 0;
        const breakdown = [];
        while (currentDate < endDate) {
            const dateKey = currentDate;
            const dailyPrice = await this.prisma.dailyPrice.findFirst({
                where: {
                    roomTypeId,
                    ratePlanId,
                    date: dateKey,
                },
            });
            let nightlyRate = 0;
            if (dailyPrice) {
                nightlyRate = Number(dailyPrice.price);
            }
            else {
                const activeSeason = seasons.find((s) => currentDate >= s.startDate && currentDate <= s.endDate);
                const multiplier = activeSeason ? Number(activeSeason.priceMultiplier) : 1.0;
                nightlyRate = Number(roomType.basePrice) * multiplier;
            }
            total += nightlyRate;
            breakdown.push({ date: new Date(currentDate), price: nightlyRate });
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return { totalPrice: total, breakdown };
    }
};
exports.RatesService = RatesService;
exports.RatesService = RatesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RatesService);
//# sourceMappingURL=rates.service.js.map