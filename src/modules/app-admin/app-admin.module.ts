import { Module } from '@nestjs/common';
import { AppAdminController } from './app-admin.controller';
import { AppAdminService } from './app-admin.service';
import { PrismaService } from '../../database/prisma.service';

@Module({
    controllers: [AppAdminController],
    providers: [AppAdminService, PrismaService],
    // AnalyticsModule uses this to resolve pseudonymous ids to real contacts.
    exports: [AppAdminService],
})
export class AppAdminModule { }
