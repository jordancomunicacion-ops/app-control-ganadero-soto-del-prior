import { RestaurantService } from './restaurant.service';
export declare class RestaurantController {
    private readonly service;
    constructor(service: RestaurantService);
    createRestaurant(body: any): Promise<any>;
    getRestaurants(): Promise<any>;
    createZone(body: {
        restaurantId: string;
        name: string;
    }): Promise<any>;
    createTable(body: {
        zoneId: string;
        name: string;
        capacity: number;
    }): Promise<any>;
    getTables(id: string): Promise<any>;
    syncZones(id: string, body: any[]): Promise<any>;
    syncTables(id: string, body: any[]): Promise<any>;
    getBookings(id: string, date: string): Promise<any>;
    createBooking(body: any): Promise<any>;
    addToWaitlist(id: string, body: any): Promise<any>;
    getWaitlist(id: string): Promise<any>;
    createPublicReservation(body: any): Promise<any>;
    confirmReservation(id: string): Promise<any>;
    cancelReservation(id: string): Promise<any>;
}
