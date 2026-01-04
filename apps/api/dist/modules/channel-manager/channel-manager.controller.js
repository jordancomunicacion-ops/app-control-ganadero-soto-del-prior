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
exports.ChannelManagerController = void 0;
const common_1 = require("@nestjs/common");
const channel_manager_service_1 = require("./channel-manager.service");
let ChannelManagerController = class ChannelManagerController {
    channelService;
    constructor(channelService) {
        this.channelService = channelService;
    }
    async forceSync() {
        await this.channelService.syncAllFeeds();
        return { status: 'Sync started' };
    }
    async exportICal(mk, res) {
        const ics = await this.channelService.generateICal(mk);
        res.setHeader('Content-Type', 'text/calendar');
        res.setHeader('Content-Disposition', 'attachment; filename="calendar.ics"');
        res.send(ics);
    }
    async getFeeds() {
        return this.channelService.getFeeds();
    }
    async createFeed(body) {
        return this.channelService.createFeed(body);
    }
};
exports.ChannelManagerController = ChannelManagerController;
__decorate([
    (0, common_1.Post)('sync'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ChannelManagerController.prototype, "forceSync", null);
__decorate([
    (0, common_1.Get)('export/:roomTypeId/calendar.ics'),
    __param(0, (0, common_1.Param)('roomTypeId')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ChannelManagerController.prototype, "exportICal", null);
__decorate([
    (0, common_1.Get)('feeds'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ChannelManagerController.prototype, "getFeeds", null);
__decorate([
    (0, common_1.Post)('feeds'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChannelManagerController.prototype, "createFeed", null);
exports.ChannelManagerController = ChannelManagerController = __decorate([
    (0, common_1.Controller)('channels'),
    __metadata("design:paramtypes", [channel_manager_service_1.ChannelManagerService])
], ChannelManagerController);
//# sourceMappingURL=channel-manager.controller.js.map