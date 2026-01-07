export declare class RestaurantService {
    private readonly ENGINE_URL;
    constructor();
    private callEngine;
    getRestaurants(): Promise<any>;
    createRestaurant(data: any): Promise<any>;
    getWaitlist(restaurantId: string): Promise<any>;
    addToWaitlist(restaurantId: string, data: any): Promise<any>;
}
