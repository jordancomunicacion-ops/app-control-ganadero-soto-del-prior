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
let RestaurantService = class RestaurantService {
    ENGINE_URL = 'http://localhost:4005';
    constructor() { }
    async callEngine(method, endpoint, body) {
        try {
            const res = await fetch(`${this.ENGINE_URL}${endpoint}`, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: body ? JSON.stringify(body) : undefined
            });
            if (!res.ok) {
                throw new common_1.HttpException(await res.text(), res.status);
            }
            return await res.json();
        }
        catch (error) {
            console.error(`Gateway Error [${method} ${endpoint}]:`, error);
            if (error instanceof common_1.HttpException)
                throw error;
            throw new common_1.HttpException('Error communicating with Booking Engine', common_1.HttpStatus.BAD_GATEWAY);
        }
    }
    async getRestaurants() {
        return this.callEngine('GET', '/restaurant');
    }
    async createRestaurant(data) {
        return this.callEngine('POST', '/restaurant', data);
    }
    async getWaitlist(restaurantId) {
        return this.callEngine('GET', `/restaurant/${restaurantId}/waitlist`);
    }
    async addToWaitlist(restaurantId, data) {
        return this.callEngine('POST', `/restaurant/${restaurantId}/waitlist`, data);
    }
};
exports.RestaurantService = RestaurantService;
exports.RestaurantService = RestaurantService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], RestaurantService);
//# sourceMappingURL=restaurant.service.js.map