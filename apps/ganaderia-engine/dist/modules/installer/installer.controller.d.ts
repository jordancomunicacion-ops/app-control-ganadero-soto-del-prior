import { InstallerService } from './installer.service';
export declare class InstallerController {
    private readonly installerService;
    constructor(installerService: InstallerService);
    getStatus(): Promise<{
        isInstalled: boolean;
        setupRequired: boolean;
    }>;
    setup(body: {
        hotelName: string;
        currency: string;
        adminEmail: string;
        createRestaurant?: boolean;
        restaurantName?: string;
        zones?: {
            name: string;
            tables: number;
        }[];
    }): Promise<{
        success: boolean;
        hotelId: string;
        message: string;
    }>;
}
