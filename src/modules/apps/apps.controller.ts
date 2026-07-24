import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { AppsService } from './apps.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { AppAccessGuard } from '../../common/guards/app-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { User } from '../../common/decorators/user.decorator';

@Controller('admin/apps')
@UseGuards(JwtGuard)
export class AppsController {
    constructor(private apps: AppsService) { }

    @Post()
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    create(@Body() body: any, @User() user: { id: string; role: string }) {
        return this.apps.create(body, { userId: user.id, role: user.role });
    }

    @Get()
    findAll(@User() user: { id: string; role: string }) {
        return this.apps.findAll({ userId: user.id, role: user.role });
    }

    @Get(':id')
    @UseGuards(AppAccessGuard)
    findOne(@Param('id') id: string, @User() user: { id: string; role: string }) {
        return this.apps.findOne(id, { userId: user.id, role: user.role });
    }

    @Put(':id')
    @UseGuards(AppAccessGuard, RolesGuard)
    @Roles('ADMIN', 'COLLABORATOR')
    update(@Param('id') id: string, @Body() body: any, @User() user: { id: string; role: string }) {
        return this.apps.update(id, body, { userId: user.id, role: user.role });
    }

    @Delete(':id')
    @UseGuards(AppAccessGuard, RolesGuard)
    @Roles('ADMIN')
    remove(@Param('id') id: string, @User() user: { id: string; role: string }) {
        return this.apps.remove(id, { userId: user.id, role: user.role });
    }

    @Get(':id/stats')
    @UseGuards(AppAccessGuard)
    getStats(@Param('id') id: string) {
        return this.apps.getStats(id);
    }

    // Version control + store config below is management, not analytics — blocked
    // for LEAD_GEN via RolesGuard (allow-list excludes it). findAll/findOne/getStats
    // above stay open so lead-gen users can still populate the sidebar and overview.

    @Get(':id/rules')
    @UseGuards(AppAccessGuard, RolesGuard)
    @Roles('ADMIN', 'COLLABORATOR')
    getRules(@Param('id') id: string) {
        return this.apps.getRules(id);
    }

    @Post(':id/rules')
    @UseGuards(AppAccessGuard, RolesGuard)
    @Roles('ADMIN', 'COLLABORATOR')
    createRule(@Param('id') id: string, @Body() body: any) {
        return this.apps.createRule(id, body);
    }

    @Get(':id/store-urls')
    @UseGuards(AppAccessGuard, RolesGuard)
    @Roles('ADMIN', 'COLLABORATOR')
    getStoreUrls(@Param('id') id: string) {
        return this.apps.getStoreUrls(id);
    }

    @Post(':id/store-urls')
    @UseGuards(AppAccessGuard, RolesGuard)
    @Roles('ADMIN', 'COLLABORATOR')
    upsertStoreUrl(@Param('id') id: string, @Body() body: any) {
        return this.apps.upsertStoreUrl(id, body);
    }

    @Delete(':id/store-urls/:platform')
    @UseGuards(AppAccessGuard, RolesGuard)
    @Roles('ADMIN', 'COLLABORATOR')
    deleteStoreUrl(@Param('id') id: string, @Param('platform') platform: string) {
        return this.apps.deleteStoreUrl(id, platform);
    }

    @Get(':id/maintenance')
    @UseGuards(AppAccessGuard, RolesGuard)
    @Roles('ADMIN', 'COLLABORATOR')
    getMaintenance(@Param('id') id: string) {
        return this.apps.getMaintenance(id);
    }

    @Put(':id/maintenance')
    @UseGuards(AppAccessGuard, RolesGuard)
    @Roles('ADMIN', 'COLLABORATOR')
    updateMaintenance(@Param('id') id: string, @Body() body: any) {
        return this.apps.updateMaintenance(id, body);
    }

    @Patch(':id/maintenance/toggle')
    @UseGuards(AppAccessGuard, RolesGuard)
    @Roles('ADMIN', 'COLLABORATOR')
    toggleMaintenance(@Param('id') id: string) {
        return this.apps.toggleMaintenance(id);
    }
}