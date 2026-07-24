import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * Closes usage sessions that never received an app_background event.
 *
 * A session is opened on app_open and closed on app_background. When the OS
 * kills a backgrounded app, or the device loses power, that closing event never
 * arrives and the session would stay open forever — its time never counted and
 * the next app_open pairing against a stale row.
 *
 * Sweeping attributes a bounded amount of time (never more than MAX_SESSION_SEC)
 * so an abandoned session cannot inflate a user's totals by days.
 *
 * Uses a plain interval rather than @nestjs/schedule to avoid adding a
 * dependency for a single job.
 */
@Injectable()
export class SessionSweeperService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(SessionSweeperService.name);

    /** How often to sweep. */
    private static readonly INTERVAL_MS = 10 * 60 * 1000;
    /** A session older than this with no close is considered abandoned. */
    private static readonly STALE_AFTER_SEC = 30 * 60;
    /** Time credited to an abandoned session. */
    private static readonly MAX_SESSION_SEC = 30 * 60;
    private static readonly BATCH = 500;

    private timer: ReturnType<typeof setInterval> | null = null;

    constructor(private prisma: PrismaService) { }

    onModuleInit(): void {
        this.timer = setInterval(() => {
            void this.sweep().catch((err) => this.logger.error('Sweep failed', err));
        }, SessionSweeperService.INTERVAL_MS);
        // Do not hold the process open purely for the sweeper.
        this.timer.unref?.();
    }

    onModuleDestroy(): void {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
    }

    /** Close abandoned sessions and roll their capped duration into DailyUsage. */
    async sweep(): Promise<{ closed: number }> {
        const cutoff = new Date(Date.now() - SessionSweeperService.STALE_AFTER_SEC * 1000);

        const stale = await this.prisma.usageSession.findMany({
            where: { endedAt: null, startedAt: { lt: cutoff } },
            take: SessionSweeperService.BATCH,
        });
        if (stale.length === 0) return { closed: 0 };

        let closed = 0;
        for (const session of stale) {
            const elapsedSec = Math.round(
                (Date.now() - session.startedAt.getTime()) / 1000,
            );
            const durationSec = Math.min(elapsedSec, SessionSweeperService.MAX_SESSION_SEC);
            const endedAt = new Date(session.startedAt.getTime() + durationSec * 1000);

            try {
                await this.prisma.usageSession.update({
                    where: { id: session.id },
                    data: { endedAt, durationSec },
                });

                if (session.endUserId) {
                    const date = this.utcDay(session.startedAt);
                    await this.prisma.dailyUsage.upsert({
                        where: {
                            appId_endUserId_date: {
                                appId: session.appId,
                                endUserId: session.endUserId,
                                date,
                            },
                        },
                        create: {
                            appId: session.appId,
                            endUserId: session.endUserId,
                            date,
                            totalDurationSec: durationSec,
                            openCount: 1,
                            sessionCount: 1,
                        },
                        update: {
                            totalDurationSec: { increment: durationSec },
                            openCount: { increment: 1 },
                            sessionCount: { increment: 1 },
                        },
                    });
                }
                closed += 1;
            } catch (error) {
                this.logger.error(`Failed to close session ${session.id}`, error);
            }
        }

        this.logger.log(`Swept ${closed} abandoned session(s)`);
        return { closed };
    }

    private utcDay(d: Date): Date {
        return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    }
}
