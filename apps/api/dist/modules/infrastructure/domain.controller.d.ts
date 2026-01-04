import { DomainService } from './domain.service';
export declare class DomainController {
    private readonly service;
    constructor(service: DomainService);
    findAll(): Promise<any>;
    create(body: any): Promise<any>;
    update(id: string, body: any): Promise<any>;
    delete(id: string): Promise<any>;
}
