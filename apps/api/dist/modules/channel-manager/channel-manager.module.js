"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelManagerModule = void 0;
const common_1 = require("@nestjs/common");
const channel_manager_service_1 = require("./channel-manager.service");
const channel_manager_controller_1 = require("./channel-manager.controller");
const prisma_service_1 = require("../../prisma/prisma.service");
let ChannelManagerModule = class ChannelManagerModule {
};
exports.ChannelManagerModule = ChannelManagerModule;
exports.ChannelManagerModule = ChannelManagerModule = __decorate([
    (0, common_1.Module)({
        controllers: [channel_manager_controller_1.ChannelManagerController],
        providers: [channel_manager_service_1.ChannelManagerService, prisma_service_1.PrismaService],
    })
], ChannelManagerModule);
//# sourceMappingURL=channel-manager.module.js.map