"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstallerModule = void 0;
const common_1 = require("@nestjs/common");
const installer_service_1 = require("./installer.service");
const installer_controller_1 = require("./installer.controller");
const prisma_service_1 = require("../../prisma/prisma.service");
let InstallerModule = class InstallerModule {
};
exports.InstallerModule = InstallerModule;
exports.InstallerModule = InstallerModule = __decorate([
    (0, common_1.Module)({
        controllers: [installer_controller_1.InstallerController],
        providers: [installer_service_1.InstallerService, prisma_service_1.PrismaService],
    })
], InstallerModule);
//# sourceMappingURL=installer.module.js.map