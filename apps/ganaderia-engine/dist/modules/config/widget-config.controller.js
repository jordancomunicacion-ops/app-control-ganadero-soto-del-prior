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
exports.WidgetConfigController = void 0;
const common_1 = require("@nestjs/common");
const widget_config_service_1 = require("./widget-config.service");
let WidgetConfigController = class WidgetConfigController {
    service;
    constructor(service) {
        this.service = service;
    }
    getConfig(hotelId) {
        return this.service.getConfig(hotelId);
    }
    updateConfig(hotelId, body) {
        return this.service.updateConfig(hotelId, body);
    }
};
exports.WidgetConfigController = WidgetConfigController;
__decorate([
    (0, common_1.Get)(':hotelId'),
    __param(0, (0, common_1.Param)('hotelId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WidgetConfigController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Post)(':hotelId'),
    __param(0, (0, common_1.Param)('hotelId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], WidgetConfigController.prototype, "updateConfig", null);
exports.WidgetConfigController = WidgetConfigController = __decorate([
    (0, common_1.Controller)('config'),
    __metadata("design:paramtypes", [widget_config_service_1.WidgetConfigService])
], WidgetConfigController);
//# sourceMappingURL=widget-config.controller.js.map