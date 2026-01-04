export declare class RestaurantService {
    private readonly ENGINE_URL;
    constructor();
    private callEngine;
    getRestaurants(): Promise<any>;
    createRestaurant(data: any): Promise<any>;
    syncZones(restaurantId: string, zones: any[]): Promise<any>;
    createZone(restaurantId: string, name: string): Promise<any>;
    syncTables(zoneId: string, tables: any[]): Promise<any>;
    getTables(restaurantId: string): Promise<any>;
    createTable(zoneId: string, name: string, capacity: number): Promise<any>;
    createPublicReservation(data: any): Promise<any>;
    confirmReservation(id: string): Promise<any>;
    cancelReservation(id: string): Promise<any>;
    getBookings(restaurantId: string, date: string): Promise<any>;
    createBooking(data: any): Promise<any>;
    getWaitlist(restaurantId: string): Promise<any>;
    addToWaitlist(restaurantId: string, data: any): Promise<any>;
}
