import { RestaurantService } from './restaurant.service';
export declare class RestaurantController {
    private readonly service;
    constructor(service: RestaurantService);
    createRestaurant(body: any): Promise<any>;
    getRestaurants(): Promise<any>;
    createZone(body: {
        restaurantId: string;
        name: string;
    }): any;
    createTable(body: {
        zoneId: string;
        name: string;
        capacity: number;
    }): any;
    getTables(id: string): any;
    syncZones(id: string, body: any[]): any;
    syncTables(id: string, body: any[]): any;
    getBookings(id: string, date: string): any;
    createBooking(body: any): any;
    addToWaitlist(id: string, body: any): Promise<any>;
    getWaitlist(id: string): Promise<any>;
    createPublicReservation(body: any): any;
    confirmReservation(id: string): any;
    cancelReservation(id: string): any;
}
