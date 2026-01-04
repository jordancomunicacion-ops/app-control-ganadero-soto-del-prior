import { PrismaService } from '../../prisma/prisma.service';
export declare class DomainService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<any>;
    create(data: any): Promise<any>;
    update(id: string, data: any): Promise<any>;
    delete(id: string): Promise<any>;
}
