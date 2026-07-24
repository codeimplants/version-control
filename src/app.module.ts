import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { AppsModule } from './modules/apps/apps.module';
import { RulesModule } from './modules/rules/rules.module';
import { SdkModule } from './modules/sdk/sdk.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { UsersModule } from './modules/users/users.module';
import { AppAdminModule } from './modules/app-admin/app-admin.module';
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
    ],
    providers: [PrismaService],
})
export class AppModule { }
