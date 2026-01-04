import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';


@Injectable()
export class InstallerService {
    constructor(private prisma: PrismaService) { }

    async getStatus() {
        // Check if any booking exists as a proxy for "is installed and used"
        // Or better, check if any HOTEL exists.
        const hotelCount = await this.prisma.hotel.count();
        return {
            isInstalled: hotelCount > 0,
            setupRequired: hotelCount === 0
        };
    }

    async setupSystem(data: {
        hotelName: string;
        currency: string;
        adminEmail: string;
        createRestaurant?: boolean;
        restaurantName?: string;
        zones?: { name: string; tables: number }[];
    }) {
        const existing = await this.prisma.hotel.count();
        if (existing > 0) {
            throw new BadRequestException('System already installed');
        }

        // 1. Create Hotel
        const hotel = await this.prisma.hotel.create({
            data: {
                name: data.hotelName,
                currency: data.currency,
                timezone: 'Europe/Madrid', // Default changed to ES
            }
        });

        // 2. Create Default Inventory (Demo Data)
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

        // 3. Create Restaurant (Optional)
        if (data.createRestaurant && data.restaurantName) {
            const restaurant = await this.prisma.restaurant.create({
                data: {
                    name: data.restaurantName,
                    currency: data.currency
                }
            });

            // Custom Zones or Default fallback
            const zonesToCreate = data.zones && data.zones.length > 0
                ? data.zones
                : [
                    { name: 'Salón Principal', tables: 6 },
                    { name: 'Terraza', tables: 4 }
                ];

            const tables: any[] = [];

            let zoneIndex = 0;
            for (const z of zonesToCreate) {
                const zone = await this.prisma.zone.create({
                    data: { restaurantId: restaurant.id, name: z.name, index: zoneIndex++ }
                });

                // Create tables for this zone
                for (let i = 1; i <= z.tables; i++) {
                    tables.push({
                        zoneId: zone.id,
                        name: i <= 9 ? `M-${i}` : `${i}`,
                        capacity: 4,
                        x: (i - 1) % 4 * 100, // Grid layout
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
}
