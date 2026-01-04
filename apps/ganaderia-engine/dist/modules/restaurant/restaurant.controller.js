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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestaurantController = void 0;
const common_1 = require("@nestjs/common");
const restaurant_service_1 = require("./restaurant.service");
let RestaurantController = class RestaurantController {
    service;
    constructor(service) {
        this.service = service;
    }
    createRestaurant(body) {
        return this.service.createRestaurant(body);
    }
    getRestaurants() {
        return this.service.getRestaurants();
    }
    createZone(body) {
        return this.service.createZone(body.restaurantId, body.name);
    }
    createTable(body) {
        return this.service.createTable(body.zoneId, body.name, body.capacity);
    }
    getTables(id) {
        return this.service.getTables(id);
    }
    syncZones(id, body) {
        return this.service.syncZones(id, body);
    }
    syncTables(id, body) {
        return this.service.syncTables(id, body);
    }
    getBookings(id, date) {
        return this.service.getBookings(id, date);
    }
    createBooking(body) {
        return this.service.createBooking(body);
    }
    addToWaitlist(id, body) {
        return this.service.addToWaitlist(id, body);
    }
    getWaitlist(id) {
        return this.service.getWaitlist(id);
    }
    createPublicReservation(body) {
        return this.service.createPublicReservation(body);
    }
    confirmReservation(id) {
        return this.service.confirmReservation(id);
    }
    cancelReservation(id) {
        return this.service.cancelReservation(id);
    }
};
exports.RestaurantController = RestaurantController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RestaurantController.prototype, "createRestaurant", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RestaurantController.prototype, "getRestaurants", null);
__decorate([
    (0, common_1.Post)('zones'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RestaurantController.prototype, "createZone", null);
__decorate([
    (0, common_1.Post)('tables'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RestaurantController.prototype, "createTable", null);
__decorate([
    (0, common_1.Get)(':id/tables'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RestaurantController.prototype, "getTables", null);
__decorate([
    (0, common_1.Post)(':id/zones/sync'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array]),
    __metadata("design:returntype", void 0)
], RestaurantController.prototype, "syncZones", null);
__decorate([
    (0, common_1.Post)('zones/:id/tables/sync'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array]),
    __metadata("design:returntype", void 0)
], RestaurantController.prototype, "syncTables", null);
__decorate([
    (0, common_1.Get)(':id/bookings'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], RestaurantController.prototype, "getBookings", null);
__decorate([
    (0, common_1.Post)('bookings'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RestaurantController.prototype, "createBooking", null);
__decorate([
    (0, common_1.Post)(':id/waitlist'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RestaurantController.prototype, "addToWaitlist", null);
__decorate([
    (0, common_1.Get)(':id/waitlist'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RestaurantController.prototype, "getWaitlist", null);
__decorate([
    (0, common_1.Post)('public/reservation'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RestaurantController.prototype, "createPublicReservation", null);
__decorate([
    (0, common_1.Post)('reservation/:id/confirm'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RestaurantController.prototype, "confirmReservation", null);
__decorate([
    (0, common_1.Post)('reservation/:id/cancel'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RestaurantController.prototype, "cancelReservation", null);
exports.RestaurantController = RestaurantController = __decorate([
    (0, common_1.Controller)('restaurant'),
    __metadata("design:paramtypes", [restaurant_service_1.RestaurantService])
], RestaurantController);
//# sourceMappingURL=restaurant.controller.js.map