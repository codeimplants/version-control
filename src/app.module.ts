import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { AppsModule } from './modules/apps/apps.module';
import { RulesModule } from './modules/rules/rules.module';
import { SdkModule } from './modules/sdk/sdk.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { UsersModule } from './modules/users/users.module';
import { AppAdminModule } from './modules/app-admin/app-admin.module';
import { HealthModule } from './health/health.module';
import { PrismaService } from './database/prisma.service';

@Module({
    imports: [
        AuthModule,
        AppsModule,
        RulesModule,
        SdkModule,
        AnalyticsModule,
        UsersModule,
        AppAdminModule,
        // HealthController existed but its module was never registered, so
        // /health returned 404. The deploy script's post-restart health check
        // depends on it.
        HealthModule,
    ],
    providers: [PrismaService],
})
export class AppModule { }
