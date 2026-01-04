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
exports.InstallerService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let InstallerService = class InstallerService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getStatus() {
        const hotelCount = await this.prisma.hotel.count();
        return {
            isInstalled: hotelCount > 0,
            setupRequired: hotelCount === 0
        };
    }
    async setupSystem(data) {
        const existing = await this.prisma.hotel.count();
        if (existing > 0) {
            throw new common_1.BadRequestException('System already installed');
        }
        const hotel = await this.prisma.hotel.create({
            data: {
                name: data.hotelName,
                currency: data.currency,
                timezone: 'Europe/Madrid',
            }
        });
        await this.prisma.roomType.create({
            data: {
                hotelId: hotel.id,
                name: 'Habitación Doble',
                basePrice: 100,
                capacity: 2,
                rooms: {
                    createMany: {
                        data: [{ name: '101' }, { name: '102' }, { name: '103' }]
                    }
                }
            }
        });
        await this.prisma.roomType.create({
            data: {
                hotelId: hotel.id,
                name: 'Suite de Lujo',
                basePrice: 250,
                capacity: 4,
                rooms: {
                    createMany: {
                        data: [{ name: '201' }, { name: '202' }]
                    }
                }
            }
        });
        if (data.createRestaurant && data.restaurantName) {
            const restaurant = await this.prisma.restaurant.create({
                data: {
                    name: data.restaurantName,
                    currency: data.currency
                }
            });
            const zonesToCreate = data.zones && data.zones.length > 0
                ? data.zones
                : [
                    { name: 'Salón Principal', tables: 6 },
                    { name: 'Terraza', tables: 4 }
                ];
            const tables = [];
            let zoneIndex = 0;
            for (const z of zonesToCreate) {
                const zone = await this.prisma.zone.create({
                    data: { restaurantId: restaurant.id, name: z.name, index: zoneIndex++ }
                });
                for (let i = 1; i <= z.tables; i++) {
                    tables.push({
                        zoneId: zone.id,
                        name: i <= 9 ? `M-${i}` : `${i}`,
                        capacity: 4,
                        x: (i - 1) % 4 * 100,
                        y: Math.floor((i - 1) / 4) * 100
                    });
                }
            }
            if (tables.length > 0) {
                await this.prisma.table.createMany({ data: tables });
            }
        }
        return { success: true, hotelId: hotel.id, message: 'System setup complete.' };
    }
};
exports.InstallerService = InstallerService;
exports.InstallerService = InstallerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InstallerService);
//# sourceMappingURL=installer.service.js.map