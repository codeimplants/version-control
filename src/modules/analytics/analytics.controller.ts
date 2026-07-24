import { BadRequestException, Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService, UsageGranularity } from './analytics.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { AppAccessGuard } from '../../common/guards/app-access.guard';
import { User } from '../../common/decorators/user.decorator';

const GRANULARITIES: UsageGranularity[] = ['day', 'week', 'month', 'year'];

@Controller('admin/analytics')
@UseGuards(JwtGuard)
export class AnalyticsController {
    constructor(private analytics: AnalyticsService) { }

    @Get('overview')
    getOverview(@User() user: { id: string; role: string }) {
        return this.analytics.getOverview({ userId: user.id, role: user.role });
    }

    @Get('apps/:appId')
    @UseGuards(AppAccessGuard)
    getByApp(@Param('appId') appId: string) {
        return this.analytics.getByApp(appId);
    }

    // ---- Engagement / user statistics (per app, guarded by AppAccessGuard) ----

    @Get('apps/:appId/audience')
    @UseGuards(AppAccessGuard)
    getAudience(@Param('appId') appId: string, @Query('days') days?: string) {
        return this.analytics.getAudience(appId, days ? Number(days) : undefined);
    }

    @Get('apps/:appId/users')
    @UseGuards(AppAccessGuard)
    getUsers(
        @Param('appId') appId: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
        @Query('days') days?: string,
        @Query('inactiveDays') inactiveDays?: string,
    ) {
        return this.analytics.getUsers(appId, {
            limit: limit ? Number(limit) : undefined,
            offset: offset ? Number(offset) : undefined,
            days: days ? Number(days) : undefined,
            inactiveDays: inactiveDays ? Number(inactiveDays) : undefined,
        });
    }

    @Get('apps/:appId/users/:userId/usage')
    @UseGuards(AppAccessGuard)
    getUserUsage(
        @Param('appId') appId: string,
        @Param('userId') userId: string,
        @Query('granularity') granularity?: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        const g = (granularity ?? 'day') as UsageGranularity;
        if (!GRANULARITIES.includes(g)) {
            throw new BadRequestException(`granularity must be one of ${GRANULARITIES.join(', ')}`);
        }
        return this.analytics.getUserUsage(
            appId,
            userId,
            g,
            from ? new Date(from) : undefined,
            to ? new Date(to) : undefined,
        );
    }

    @Get('apps/:appId/leads')
    @UseGuards(AppAccessGuard)
    getLeads(
        @Param('appId') appId: string,
        @Query('minMinutes') minMinutes?: string,
        @Query('minSessions') minSessions?: string,
        @Query('minActiveDays') minActiveDays?: string,
        @Query('days') days?: string,
    ) {
        return this.analytics.getLeads(appId, {
            minMinutes: minMinutes ? Number(minMinutes) : undefined,
            minSessions: minSessions ? Number(minSessions) : undefined,
            minActiveDays: minActiveDays ? Number(minActiveDays) : undefined,
            days: days ? Number(days) : undefined,
        });
    }

    @Get('version-checks')
    getVersionChecks(@User() user: { id: string; role: string }) {
        return this.analytics.getVersionChecks({ userId: user.id, role: user.role });
    }

    @Get('platform-distribution')
    getPlatformDistribution(@User() user: { id: string; role: string }) {
        return this.analytics.getPlatformDistribution({ userId: user.id, role: user.role });
    }
}
