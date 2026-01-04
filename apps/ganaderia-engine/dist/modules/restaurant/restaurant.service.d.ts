import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
export declare class RestaurantService {
    private prisma;
    private mailService;
    constructor(prisma: PrismaService, mailService: MailService);
    createPublicReservation(data: {
        restaurantId: string;
        date: string;
        time: string;
        pax: number;
        name: string;
        email: string;
        phone: string;
        notes?: string;
    }): Promise<{
        id: string;
        guestName: string;
        guestPhone: string | null;
        guestEmail: string | null;
        pax: number;
        date: Date;
        duration: number;
        status: string;
        tags: string | null;
        notes: string | null;
        origin: string;
        stripeCustomerId: string | null;
        stripePaymentMethodId: string | null;
        smsSent: boolean;
        emailSent: boolean;
        createdAt: Date;
        updatedAt: Date;
        idempotencyKey: string | null;
        restaurantId: string;
        tableId: string | null;
        channelId: string | null;
    }>;
    confirmReservation(bookingId: string): Promise<{
        id: string;
        guestName: string;
        guestPhone: string | null;
        guestEmail: string | null;
        pax: number;
        date: Date;
        duration: number;
        status: string;
        tags: string | null;
        notes: string | null;
        origin: string;
        stripeCustomerId: string | null;
        stripePaymentMethodId: string | null;
        smsSent: boolean;
        emailSent: boolean;
        createdAt: Date;
        updatedAt: Date;
        idempotencyKey: string | null;
        restaurantId: string;
        tableId: string | null;
        channelId: string | null;
    }>;
    cancelReservation(bookingId: string): Promise<{
        id: string;
        guestName: string;
        guestPhone: string | null;
        guestEmail: string | null;
        pax: number;
        date: Date;
        duration: number;
        status: string;
        tags: string | null;
        notes: string | null;
        origin: string;
        stripeCustomerId: string | null;
        stripePaymentMethodId: string | null;
        smsSent: boolean;
        emailSent: boolean;
        createdAt: Date;
        updatedAt: Date;
        idempotencyKey: string | null;
        restaurantId: string;
        tableId: string | null;
        channelId: string | null;
    }>;
    createRestaurant(data: {
        name: string;
        currency: string;
    }): Promise<{
        id: string;
        name: string;
        currency: string;
    }>;
    getRestaurants(): Promise<({
        zones: {
            id: string;
            restaurantId: string;
            name: string;
            index: number;
            isActive: boolean;
        }[];
    } & {
        id: string;
        name: string;
        currency: string;
    })[]>;
    syncZones(restaurantId: string, zones: any[]): Promise<({
        tables: ({
            resBookings: {
                id: string;
                guestName: string;
                guestPhone: string | null;
                guestEmail: string | null;
                pax: number;
                date: Date;
                duration: number;
                status: string;
                tags: string | null;
                notes: string | null;
                origin: string;
                stripeCustomerId: string | null;
                stripePaymentMethodId: string | null;
                smsSent: boolean;
                emailSent: boolean;
                createdAt: Date;
                updatedAt: Date;
                idempotencyKey: string | null;
                restaurantId: string;
                tableId: string | null;
                channelId: string | null;
            }[];
        } & {
            id: string;
            name: string;
            isActive: boolean;
            zoneId: string;
            capacity: number;
            x: number;
            y: number;
            width: number;
            height: number;
            shape: string;
            rotation: number;
            minPax: number;
            maxPax: number;
        })[];
    } & {
        id: string;
        restaurantId: string;
        name: string;
        index: number;
        isActive: boolean;
    })[]>;
    createZone(restaurantId: string, name: string): Promise<{
        id: string;
        restaurantId: string;
        name: string;
        index: number;
        isActive: boolean;
    }>;
    syncTables(zoneId: string, tables: any[]): Promise<any[]>;
    createTable(zoneId: string, name: string, capacity: number): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        zoneId: string;
        capacity: number;
        x: number;
        y: number;
        width: number;
        height: number;
        shape: string;
        rotation: number;
        minPax: number;
        maxPax: number;
    }>;
    getTables(restaurantId: string): Promise<({
        tables: ({
            resBookings: {
                id: string;
                guestName: string;
                guestPhone: string | null;
                guestEmail: string | null;
                pax: number;
                date: Date;
                duration: number;
                status: string;
                tags: string | null;
                notes: string | null;
                origin: string;
                stripeCustomerId: string | null;
                stripePaymentMethodId: string | null;
                smsSent: boolean;
                emailSent: boolean;
                createdAt: Date;
                updatedAt: Date;
                idempotencyKey: string | null;
                restaurantId: string;
                tableId: string | null;
                channelId: string | null;
            }[];
        } & {
            id: string;
            name: string;
            isActive: boolean;
            zoneId: string;
            capacity: number;
            x: number;
            y: number;
            width: number;
            height: number;
            shape: string;
            rotation: number;
            minPax: number;
            maxPax: number;
        })[];
    } & {
        id: string;
        restaurantId: string;
        name: string;
        index: number;
        isActive: boolean;
    })[]>;
    createBooking(data: any): Promise<{
        id: string;
        guestName: string;
        guestPhone: string | null;
        guestEmail: string | null;
        pax: number;
        date: Date;
        duration: number;
        status: string;
        tags: string | null;
        notes: string | null;
        origin: string;
        stripeCustomerId: string | null;
        stripePaymentMethodId: string | null;
        smsSent: boolean;
        emailSent: boolean;
        createdAt: Date;
        updatedAt: Date;
        idempotencyKey: string | null;
        restaurantId: string;
        tableId: string | null;
        channelId: string | null;
    }>;
    getBookings(restaurantId: string, dateStr: string): Promise<({
        table: ({
            zone: {
                id: string;
                restaurantId: string;
                name: string;
                index: number;
                isActive: boolean;
            };
        } & {
            id: string;
            name: string;
            isActive: boolean;
            zoneId: string;
            capacity: number;
            x: number;
            y: number;
            width: number;
            height: number;
            shape: string;
            rotation: number;
            minPax: number;
            maxPax: number;
        }) | null;
    } & {
        id: string;
        guestName: string;
        guestPhone: string | null;
        guestEmail: string | null;
        pax: number;
        date: Date;
        duration: number;
        status: string;
        tags: string | null;
        notes: string | null;
        origin: string;
        stripeCustomerId: string | null;
        stripePaymentMethodId: string | null;
        smsSent: boolean;
        emailSent: boolean;
        createdAt: Date;
        updatedAt: Date;
        idempotencyKey: string | null;
        restaurantId: string;
        tableId: string | null;
        channelId: string | null;
    })[]>;
    addToWaitlist(restaurantId: string, data: any): Promise<{
        id: string;
        pax: number;
        status: string;
        notes: string | null;
        createdAt: Date;
        restaurantId: string;
        name: string;
        phone: string | null;
        notifiedAt: Date | null;
    }>;
    getWaitlist(restaurantId: string): Promise<{
        id: string;
        pax: number;
        status: string;
        notes: string | null;
        createdAt: Date;
        restaurantId: string;
        name: string;
        phone: string | null;
        notifiedAt: Date | null;
    }[]>;
}
