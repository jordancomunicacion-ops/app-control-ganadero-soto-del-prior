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
exports.PropertyController = void 0;
const common_1 = require("@nestjs/common");
const property_service_1 = require("./property.service");
let PropertyController = class PropertyController {
    propertyService;
    constructor(propertyService) {
        this.propertyService = propertyService;
    }
    createHotel(body) {
        return this.propertyService.createHotel(body);
    }
    getHotels() {
        return this.propertyService.getHotels();
    }
    getHotel(id) {
        return this.propertyService.getHotel(id);
    }
    createRoomType(hotelId, body) {
        return this.propertyService.createRoomType(hotelId, body);
    }
    getRoomTypes(hotelId) {
        return this.propertyService.getRoomTypes(hotelId);
    }
    createRoom(roomTypeId, name) {
        return this.propertyService.createRoom(roomTypeId, name);
    }
};
exports.PropertyController = PropertyController;
__decorate([
    (0, common_1.Post)('hotels'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PropertyController.prototype, "createHotel", null);
__decorate([
    (0, common_1.Get)('hotels'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PropertyController.prototype, "getHotels", null);
__decorate([
    (0, common_1.Get)('hotels/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PropertyController.prototype, "getHotel", null);
__decorate([
    (0, common_1.Post)('hotels/:id/room-types'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PropertyController.prototype, "createRoomType", null);
__decorate([
    (0, common_1.Get)('hotels/:id/room-types'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PropertyController.prototype, "getRoomTypes", null);
__decorate([
    (0, common_1.Post)('room-types/:id/rooms'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PropertyController.prototype, "createRoom", null);
exports.PropertyController = PropertyController = __decorate([
    (0, common_1.Controller)('property'),
    __metadata("design:paramtypes", [property_service_1.PropertyService])
], PropertyController);
//# sourceMappingURL=property.controller.js.map