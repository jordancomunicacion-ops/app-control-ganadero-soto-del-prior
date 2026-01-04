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
exports.RestaurantService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const mail_service_1 = require("../mail/mail.service");
let RestaurantService = class RestaurantService {
    prisma;
    mailService;
    constructor(prisma, mailService) {
        this.prisma = prisma;
        this.mailService = mailService;
    }
    async createPublicReservation(data) {
        const [hours, minutes] = data.time.split(':').map(Number);
        const start = new Date(data.date);
        start.setHours(hours, minutes, 0, 0);
        const booking = await this.prisma.resBooking.create({
            data: {
                restaurantId: data.restaurantId,
                date: start,
                pax: data.pax,
                guestName: data.name,
                guestEmail: data.email,
                guestPhone: data.phone,
                notes: data.notes,
                status: 'PENDING_CONFIRMATION',
                origin: 'WIDGET'
            }
        });
        await this.mailService.sendReservationPending(booking);
        return booking;
    }
    async confirmReservation(bookingId) {
        const booking = await this.prisma.resBooking.findUnique({ where: { id: bookingId } });
        if (!booking)
            throw new Error('Reserva no encontrada');
        if (booking.status === 'CONFIRMED')
            return booking;
        const updated = await this.prisma.resBooking.update({
            where: { id: bookingId },
            data: { status: 'CONFIRMED' }
        });
        await this.mailService.sendReservationConfirmed(updated);
        return updated;
    }
    async cancelReservation(bookingId) {
        const booking = await this.prisma.resBooking.findUnique({ where: { id: bookingId } });
        if (!booking)
            throw new Error('Reserva no encontrada');
        const updated = await this.prisma.resBooking.update({
            where: { id: bookingId },
            data: { status: 'CANCELLED' }
        });
        await this.mailService.sendReservationCancelled(updated);
        return updated;
    }
    async createRestaurant(data) {
        return this.prisma.restaurant.create({ data });
    }
    async getRestaurants() {
        return this.prisma.restaurant.findMany({ include: { zones: true } });
    }
    async syncZones(restaurantId, zones) {
        for (const z of zones) {
            if (z.id && z.id.length > 10) {
                await this.prisma.zone.update({ where: { id: z.id }, data: { name: z.name, index: z.index, isActive: z.isActive } });
            }
            else {
                await this.prisma.zone.create({ data: { restaurantId, name: z.name, index: z.index } });
            }
        }
        return this.getTables(restaurantId);
    }
    async createZone(restaurantId, name) {
        return this.prisma.zone.create({
            data: { restaurantId, name }
        });
    }
    async syncTables(zoneId, tables) {
        const results = [];
        for (const t of tables) {
            if (t.id && t.id.includes('-')) {
                const updated = await this.prisma.table.update({
                    where: { id: t.id },
                    data: {
                        x: t.x, y: t.y, width: t.width, height: t.height,
                        rotation: t.rotation, shape: t.shape,
                        name: t.name, capacity: t.capacity,
                        minPax: t.minPax, maxPax: t.maxPax
                    }
                });
                results.push(updated);
            }
            else {
                const created = await this.prisma.table.create({
                    data: {
                        zoneId,
                        name: t.name,
                        capacity: t.capacity,
                        x: t.x, y: t.y,
                        shape: t.shape
                    }
                });
                results.push(created);
            }
        }
        return results;
    }
    async createTable(zoneId, name, capacity) {
        return this.prisma.table.create({
            data: { zoneId, name, capacity }
        });
    }
    async getTables(restaurantId) {
        return this.prisma.zone.findMany({
            where: { restaurantId, isActive: true },
            orderBy: { index: 'asc' },
            include: {
                tables: {
                    where: { isActive: true },
                    include: {
                        resBookings: {
                            where: {
                                date: {
                                    gte: new Date(new Date().setHours(0, 0, 0, 0)),
                                    lte: new Date(new Date().setHours(23, 59, 59, 999))
                                },
                                status: { not: 'CANCELLED' }
                            }
                        }
                    }
                }
            }
        });
    }
    async createBooking(data) {
        return this.prisma.resBooking.create({ data });
    }
    async getBookings(restaurantId, dateStr) {
        const start = new Date(dateStr);
        start.setHours(0, 0, 0, 0);
        const end = new Date(dateStr);
        end.setHours(23, 59, 59, 999);
        return this.prisma.resBooking.findMany({
            where: {
                restaurantId,
                date: { gte: start, lte: end }
            },
            include: { table: { include: { zone: true } } },
            orderBy: { date: 'asc' }
        });
    }
    async addToWaitlist(restaurantId, data) {
        return this.prisma.restaurantWaitlist.create({
            data: {
                restaurantId,
                ...data
            }
        });
    }
    async getWaitlist(restaurantId) {
        return this.prisma.restaurantWaitlist.findMany({
            where: { restaurantId, status: { in: ['WAITING', 'NOTIFIED'] } },
            orderBy: { createdAt: 'asc' }
        });
    }
};
exports.RestaurantService = RestaurantService;
exports.RestaurantService = RestaurantService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService])
], RestaurantService);
//# sourceMappingURL=restaurant.service.js.map