import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';

@Controller('campaigns')
export class CampaignsController {
    constructor(private readonly campaignsService: CampaignsService) { }

    @Post()
    async create(@Body() body: { name: string; type: string; subject?: string; content: string }) {
        return this.campaignsService.createCampaign(body);
    }

    @Get()
    async findAll() {
        return this.campaignsService.getCampaigns();
    }

    @Post(':id/execute')
    async execute(@Param('id') id: string) {
        return this.campaignsService.executeCampaign(id);
    }
}
