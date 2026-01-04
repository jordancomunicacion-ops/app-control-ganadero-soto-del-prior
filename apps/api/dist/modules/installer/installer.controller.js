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
exports.InstallerController = void 0;
const common_1 = require("@nestjs/common");
const installer_service_1 = require("./installer.service");
let InstallerController = class InstallerController {
    installerService;
    constructor(installerService) {
        this.installerService = installerService;
    }
    getStatus() {
        return this.installerService.getStatus();
    }
    async setup(body) {
        return this.installerService.setupSystem(body);
    }
};
exports.InstallerController = InstallerController;
__decorate([
    (0, common_1.Get)('status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InstallerController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Post)('setup'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InstallerController.prototype, "setup", null);
exports.InstallerController = InstallerController = __decorate([
    (0, common_1.Controller)('installer'),
    __metadata("design:paramtypes", [installer_service_1.InstallerService])
], InstallerController);
//# sourceMappingURL=installer.controller.js.map