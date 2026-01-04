import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class RestaurantService {
    constructor(
        private prisma: PrismaService,
        private mailService: MailService
    ) { }

    // ... (existing code) ...

    // --- Public Reservation Flow ---

    async createPublicReservation(data: {
        restaurantId: string;
        date: string;
        time: string;
        pax: number;
        name: string;
        email: string;
        phone: string;
        notes?: string;
    }) {
        // 1. Combine Date + Time
        const [hours, minutes] = data.time.split(':').map(Number);
        const start = new Date(data.date); // Assuming YYYY-MM-DD
        start.setHours(hours, minutes, 0, 0);

        // 2. Initial Status PENDING
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

        // 3. Send Email
        await this.mailService.sendReservationPending(booking);

        return booking;
    }

    async confirmReservation(bookingId: string) {
        const booking = await this.prisma.resBooking.findUnique({ where: { id: bookingId } });
        if (!booking) throw new Error('Reserva no encontrada');

        if (booking.status === 'CONFIRMED') return booking;

        const updated = await this.prisma.resBooking.update({
            where: { id: bookingId },
            data: { status: 'CONFIRMED' }
        });

        await this.mailService.sendReservationConfirmed(updated);
        return updated;
    }

    async cancelReservation(bookingId: string) {
        const booking = await this.prisma.resBooking.findUnique({ where: { id: bookingId } });
        if (!booking) throw new Error('Reserva no encontrada');

        const updated = await this.prisma.resBooking.update({
            where: { id: bookingId },
            data: { status: 'CANCELLED' }
        });

        await this.mailService.sendReservationCancelled(updated);
        return updated;
    }

    async createRestaurant(data: { name: string; currency: string }) {
        return this.prisma.restaurant.create({ data });
    }

    async getRestaurants() {
        return this.prisma.restaurant.findMany({ include: { zones: true } });
    }

    // --- Visual Plan & Zones ---
    async syncZones(restaurantId: string, zones: any[]) {
        for (const z of zones) {
            if (z.id && z.id.length > 10) {
                await this.prisma.zone.update({ where: { id: z.id }, data: { name: z.name, index: z.index, isActive: z.isActive } });
            } else {
                await this.prisma.zone.create({ data: { restaurantId, name: z.name, index: z.index } });
            }
        }
        return this.getTables(restaurantId);
    }

    async createZone(restaurantId: string, name: string) {
        return this.prisma.zone.create({
            data: { restaurantId, name }
        });
    }

    // --- Tables ---
    async syncTables(zoneId: string, tables: any[]) {
        // Bulk update positions for visual editor
        const results: any[] = [];
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
            } else {
                // New table
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

    async createTable(zoneId: string, name: string, capacity: number) {
        return this.prisma.table.create({
            data: { zoneId, name, capacity }
        });
    }

    async getTables(restaurantId: string) {
        // Return structured data for the planar view
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
                                    gte: new Date(new Date().setHours(0, 0, 0, 0)), // Today onwards
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

    // --- Bookings ---
    async createBooking(data: any) {
        // Basic impl, can be expanded for validation
        return this.prisma.resBooking.create({ data });
    }

    async getBookings(restaurantId: string, dateStr: string) {
        // dateStr YYYY-MM-DD
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

    // --- Waitlist ---
    async addToWaitlist(restaurantId: string, data: any) {
        return this.prisma.restaurantWaitlist.create({
            data: {
                restaurantId,
                ...data
            }
        });
    }

    async getWaitlist(restaurantId: string) {
        return this.prisma.restaurantWaitlist.findMany({
            where: { restaurantId, status: { in: ['WAITING', 'NOTIFIED'] } },
            orderBy: { createdAt: 'asc' }
        });
    }
}
