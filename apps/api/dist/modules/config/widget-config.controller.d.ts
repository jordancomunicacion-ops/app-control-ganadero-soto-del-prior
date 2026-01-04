import { WidgetConfigService } from './widget-config.service';
export declare class WidgetConfigController {
    private readonly service;
    constructor(service: WidgetConfigService);
    getConfig(hotelId: string): Promise<{
        id: string;
        hotelId: string;
        primaryColor: string;
        secondaryColor: string;
        customCss: string | null;
        showLogo: boolean;
        title: string | null;
    } | null>;
    updateConfig(hotelId: string, body: any): Promise<{
        id: string;
        hotelId: string;
        primaryColor: string;
        secondaryColor: string;
        customCss: string | null;
        showLogo: boolean;
        title: string | null;
    }>;
}
