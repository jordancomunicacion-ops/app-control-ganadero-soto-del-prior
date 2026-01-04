import { PrismaService } from '../../prisma/prisma.service';
export declare class WidgetConfigService {
    private prisma;
    constructor(prisma: PrismaService);
    getConfig(hotelId: string): Promise<{
        id: string;
        hotelId: string;
        primaryColor: string;
        secondaryColor: string;
        customCss: string | null;
        showLogo: boolean;
        title: string | null;
    } | null>;
    updateConfig(hotelId: string, data: any): Promise<{
        id: string;
        hotelId: string;
        primaryColor: string;
        secondaryColor: string;
        customCss: string | null;
        showLogo: boolean;
        title: string | null;
    }>;
}
