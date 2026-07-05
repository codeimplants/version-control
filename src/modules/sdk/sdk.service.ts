import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { VersionEngine, VersionRule, MaintenanceMode } from '../versions/version.engine';
import { VersionCheckDto, VersionCheckResponse } from './dto/version-check.dto';

@Injectable()
export class SdkService {
    private readonly logger = new Logger(SdkService.name);

    constructor(private prisma: PrismaService) { }

    async checkVersion(
        apiKey: string,
        data: VersionCheckDto,
    ): Promise<VersionCheckResponse> {
        try {
            // 1. Validate API Key and get app
            if (!apiKey) {
                throw new UnauthorizedException('Missing API Key');
            }

            const app = await this.prisma.app.findUnique({
                where: { apiKey },
                include: {
                    maintenanceMode: true,
                    storeUrls: true,
                },
            });

            if (!app) {
                throw new UnauthorizedException('Invalid API Key');
            }

            if (!app.isActive) {
                throw new UnauthorizedException('App is deactivated');
            }

            // 2. Track device (async, non-blocking)
            this.trackDevice(app.id, data).catch((err) => {
                this.logger.error('Failed to track device', err);
            });

            // 3. Get version rules for the platform/environment
            const rules = await this.prisma.versionRule.findMany({
                where: {
                    appId: app.id,
                    platform: { in: [data.platform, 'all'] },
                    environment: data.environment,
                    isActive: true,
                },
                orderBy: {
                    priority: 'desc',
                },
            });

            // Map Prisma rules to VersionRule interface, transforming null dates to undefined
            const mappedRules: VersionRule[] = rules.map(rule => ({
                killSwitch: rule.killSwitch,
                blockedVersions: rule.blockedVersions,
                latestVersion: rule.latestVersion,
                updateType: rule.updateType,
                messageConfig: rule.messageConfig,
                isActive: rule.isActive,
                priority: rule.priority,
                rolloutPercentage: rule.rolloutPercentage,
                startDate: rule.startDate || undefined,
                endDate: rule.endDate || undefined,
            }));

            // 4. Get store URL for the platform
            const storeUrl = app.storeUrls.find(
                (url) => url.platform === data.platform,
            )?.storeUrl;

            // 5. Evaluate version using the engine
            const evaluationContext = {
                currentVersion: data.currentVersion,
                buildNumber: data.buildNumber,
                deviceId: data.deviceId,
            };

            // Map maintenance mode to interface
            const maintenanceMode: MaintenanceMode | undefined = app.maintenanceMode ? {
                isEnabled: app.maintenanceMode.isEnabled,
                title: app.maintenanceMode.title,
                message: app.maintenanceMode.message,
                estimatedEnd: app.maintenanceMode.estimatedEnd || undefined,
            } : undefined;

            let result;

            if (mappedRules.length > 0) {
                result = VersionEngine.evaluateMultiple(
                    mappedRules,
                    evaluationContext,
                    maintenanceMode,
                    storeUrl,
                );
            } else {
                result = VersionEngine.evaluate(
                    null,
                    evaluationContext,
                    maintenanceMode,
                    storeUrl,
                );
            }

            // 6. Log analytics (async, non-blocking)
            this.logAnalytics(app.id, data, result.status).catch((err) => {
                this.logger.error('Failed to log analytics', err);
            });

            // 7. Return response
            return {
                ...result,
                deviceTracked: !!data.deviceId,
                analytics: true,
            } as VersionCheckResponse;
        } catch (error) {
            this.logger.error('Error checking version', error);
            throw error;
        }
    }

    /**
     * Track or update device information
     */
    private async trackDevice(
        appId: string,
        data: VersionCheckDto,
    ): Promise<void> {
        if (!data.deviceId) return;

        try {
            await this.prisma.device.upsert({
                where: {
                    appId_deviceId: {
                        appId,
                        deviceId: data.deviceId,
                    },
                },
                create: {
                    appId,
                    deviceId: data.deviceId,
                    platform: data.platform,
                    osVersion: data.osVersion,
                    appVersion: data.currentVersion as any,
                    buildNumber: data.buildNumber,
                    metadata: data.metadata,
                    lastCheckIn: new Date(),
                    firstSeen: new Date(),
                },
                update: {
                    appVersion: data.currentVersion as any,
                    buildNumber: data.buildNumber,
                    osVersion: data.osVersion,
                    lastCheckIn: new Date(),
                    metadata: data.metadata,
                    isActive: true,
                },
            });
        } catch (error) {
            this.logger.error('Failed to track device', error);
            // Don't throw - device tracking is non-critical
        }
    }

    /**
     * Log analytics event
     */
    private async logAnalytics(
        appId: string,
        data: VersionCheckDto,
        eventType: string,
    ): Promise<void> {
        try {
            await this.prisma.appAnalytics.create({
                data: {
                    appId,
                    platform: data.platform,
                    environment: data.environment,
                    version: data.currentVersion as any,
                    eventType,
                    deviceId: data.deviceId,
                    metadata: {
                        buildNumber: data.buildNumber,
                        osVersion: data.osVersion,
                        ...data.metadata,
                    },
                },
            });
        } catch (error) {
            this.logger.error('Failed to log analytics', error);
            // Don't throw - analytics is non-critical
        }
    }

    /**
     * Get app statistics
     */
    async getAppStats(apiKey: string) {
        if (!apiKey) {
            throw new UnauthorizedException('Missing API Key');
        }

        const app = await this.prisma.app.findUnique({
            where: { apiKey },
            include: {
                _count: {
                    select: {
                        devices: true,
                        analytics: true,
                        rules: true,
                    },
                },
            },
        });

        if (!app) {
            throw new UnauthorizedException('Invalid API Key');
        }

        // Get active devices (checked in last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const activeDevices = await this.prisma.device.count({
            where: {
                appId: app.id,
                lastCheckIn: {
                    gte: sevenDaysAgo,
                },
            },
        });

        return {
            totalDevices: app._count.devices,
            activeDevices,
            totalAnalytics: app._count.analytics,
            totalRules: app._count.rules,
        };
    }
}