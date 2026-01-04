import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class RestaurantService {
    private readonly ENGINE_URL = 'http://localhost:4005';

    constructor() { }

    private async callEngine(method: string, endpoint: string, body?: any) {
        try {
            const res = await fetch(`${this.ENGINE_URL}${endpoint}`, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: body ? JSON.stringify(body) : undefined
            });

            if (!res.ok) {
                // Propagate error
                throw new HttpException(await res.text(), res.status);
            }

            return await res.json();
        } catch (error) {
            console.error(`Gateway Error [${method} ${endpoint}]:`, error);
            if (error instanceof HttpException) throw error;
            throw new HttpException('Error communicating with Booking Engine', HttpStatus.BAD_GATEWAY);
        }
    }

    // ... (Proxy Methods)

    async getRestaurants() {
        return this.callEngine('GET', '/restaurant');
    }

    async createRestaurant(data: any) {
        return this.callEngine('POST', '/restaurant', data);
    }

    // ... (rest of the file as viewed, up to addToWaitlist)

    // --- Waitlist ---
    async getWaitlist(restaurantId: string) {
        return this.callEngine('GET', `/restaurant/${restaurantId}/waitlist`);
    }

    async addToWaitlist(restaurantId: string, data: any) {
        return this.callEngine('POST', `/restaurant/${restaurantId}/waitlist`, data);
    }
}
