import { Module } from '@nestjs/common';
import { SdkController } from './sdk.controller';
import { SdkService } from './sdk.service';
import { SessionSweeperService } from './session-sweeper.service';
import { PrismaService } from '../../database/prisma.service';

@Module({
    controllers: [SdkController],
    providers: [SdkService, SessionSweeperService, PrismaService],
})
export class SdkModule { }
