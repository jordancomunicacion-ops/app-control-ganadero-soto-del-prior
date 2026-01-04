"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("./prisma/prisma.module");
const property_module_1 = require("./modules/property/property.module");
const booking_module_1 = require("./modules/booking/booking.module");
const channel_manager_module_1 = require("./modules/channel-manager/channel-manager.module");
const installer_module_1 = require("./modules/installer/installer.module");
const restaurant_module_1 = require("./modules/restaurant/restaurant.module");
const widget_config_module_1 = require("./modules/config/widget-config.module");
const rates_module_1 = require("./modules/rates/rates.module");
const payment_module_1 = require("./modules/payments/payment.module");
const crm_module_1 = require("./modules/crm/crm.module");
const campaigns_module_1 = require("./modules/campaigns/campaigns.module");
const mail_module_1 = require("./modules/mail/mail.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            schedule_1.ScheduleModule.forRoot(),
            prisma_module_1.PrismaModule,
            property_module_1.PropertyModule,
            booking_module_1.BookingModule,
            channel_manager_module_1.ChannelManagerModule,
            installer_module_1.InstallerModule,
            restaurant_module_1.RestaurantModule,
            widget_config_module_1.WidgetConfigModule,
            restaurant_module_1.RestaurantModule,
            widget_config_module_1.WidgetConfigModule,
            rates_module_1.RatesModule,
            crm_module_1.CrmModule,
            campaigns_module_1.CampaignsModule,
            payment_module_1.PaymentModule,
            mail_module_1.MailModule
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map