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
exports.GlobalController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let GlobalController = class GlobalController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getContexts() {
        const [hotels, restaurants] = await Promise.all([
            this.prisma.hotel.findMany({
                select: { id: true, name: true }
            }),
            this.prisma.restaurant.findMany({
                select: { id: true, name: true }
            })
        ]);
        return {
            hotels,
            restaurants
        };
    }
};
exports.GlobalController = GlobalController;
__decorate([
    (0, common_1.Get)('contexts'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GlobalController.prototype, "getContexts", null);
exports.GlobalController = GlobalController = __decorate([
    (0, common_1.Controller)('global'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GlobalController);
//# sourceMappingURL=global.controller.js.map