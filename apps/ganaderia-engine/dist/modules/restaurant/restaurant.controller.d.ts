import { RestaurantService } from './restaurant.service';
export declare class RestaurantController {
    private readonly service;
    constructor(service: RestaurantService);
    createRestaurant(body: any): Promise<{
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
    createZone(body: {
        restaurantId: string;
        name: string;
    }): Promise<{
        id: string;
        restaurantId: string;
        name: string;
        index: number;
        isActive: boolean;
    }>;
    createTable(body: {
        zoneId: string;
        name: string;
        capacity: number;
    }): Promise<{
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
    getTables(id: string): Promise<({
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
    syncZones(id: string, body: any[]): Promise<({
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
    syncTables(id: string, body: any[]): Promise<any[]>;
    getBookings(id: string, date: string): Promise<({
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
    createBooking(body: any): Promise<{
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
    addToWaitlist(id: string, body: any): Promise<{
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
    getWaitlist(id: string): Promise<{
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
    createPublicReservation(body: any): Promise<{
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
    confirmReservation(id: string): Promise<{
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
    cancelReservation(id: string): Promise<{
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
}
