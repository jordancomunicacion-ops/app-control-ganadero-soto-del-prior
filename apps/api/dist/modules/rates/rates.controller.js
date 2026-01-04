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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RatesController = void 0;
const common_1 = require("@nestjs/common");
const rates_service_1 = require("./rates.service");
const availability_service_1 = require("./availability.service");
const prisma_service_1 = require("../../prisma/prisma.service");
let RatesController = class RatesController {
    ratesService;
    availabilityService;
    prisma;
    constructor(ratesService, availabilityService, prisma) {
        this.ratesService = ratesService;
        this.availabilityService = availabilityService;
        this.prisma = prisma;
    }
    async getRatePlans(hotelId) {
        return this.prisma.ratePlan.findMany({
            where: { hotelId }
        });
    }
    async createRatePlan(body) {
        return this.prisma.ratePlan.create({ data: body });
    }
    async updatePrices(body) {
        const start = new Date(body.fromDate);
        const end = new Date(body.toDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateKey = new Date(d);
        }
        return { status: 'success', count: 0 };
    }
};
exports.RatesController = RatesController;
__decorate([
    (0, common_1.Get)('plans/:hotelId'),
    __param(0, (0, common_1.Param)('hotelId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RatesController.prototype, "getRatePlans", null);
__decorate([
    (0, common_1.Post)('plans'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RatesController.prototype, "createRatePlan", null);
__decorate([
    (0, common_1.Post)('prices/bulk'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RatesController.prototype, "updatePrices", null);
exports.RatesController = RatesController = __decorate([
    (0, common_1.Controller)('rates'),
    __metadata("design:paramtypes", [rates_service_1.RatesService,
        availability_service_1.AvailabilityService,
        prisma_service_1.PrismaService])
], RatesController);
//# sourceMappingURL=rates.controller.js.map