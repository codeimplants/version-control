-- Engagement / end-user tracking models for the centralized admin platform.
-- Adds EndUser, UsageSession, DailyUsage; promotes device make/model to columns;
-- adds per-app backend federation config to App.
-- NOTE: apply against a dev / Neon branch database first, not production.

-- AlterTable: App federation config
ALTER TABLE "App"
    ADD COLUMN "backendBaseUrl" TEXT,
    ADD COLUMN "backendServiceToken" TEXT;

-- AlterTable: Device make/model + end-user link
ALTER TABLE "Device"
    ADD COLUMN "make" TEXT,
    ADD COLUMN "model" TEXT,
    ADD COLUMN "manufacturer" TEXT,
    ADD COLUMN "endUserId" TEXT;

-- CreateTable: EndUser
CREATE TABLE "EndUser" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "externalUserId" TEXT NOT NULL,
    "platform" TEXT,
    "authMethod" TEXT,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EndUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable: UsageSession
CREATE TABLE "UsageSession" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "endUserId" TEXT,
    "deviceId" TEXT NOT NULL,
    "platform" TEXT,
    "appVersion" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationSec" INTEGER,

    CONSTRAINT "UsageSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DailyUsage
CREATE TABLE "DailyUsage" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "endUserId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalDurationSec" INTEGER NOT NULL DEFAULT 0,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "sessionCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailyUsage_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "EndUser_appId_externalUserId_key" ON "EndUser"("appId", "externalUserId");
CREATE INDEX "EndUser_appId_lastActiveAt_idx" ON "EndUser"("appId", "lastActiveAt");

CREATE INDEX "UsageSession_appId_deviceId_endedAt_idx" ON "UsageSession"("appId", "deviceId", "endedAt");
CREATE INDEX "UsageSession_appId_startedAt_idx" ON "UsageSession"("appId", "startedAt");
CREATE INDEX "UsageSession_endUserId_idx" ON "UsageSession"("endUserId");

CREATE UNIQUE INDEX "DailyUsage_appId_endUserId_date_key" ON "DailyUsage"("appId", "endUserId", "date");
CREATE INDEX "DailyUsage_appId_date_idx" ON "DailyUsage"("appId", "date");

CREATE INDEX "Device_endUserId_idx" ON "Device"("endUserId");

-- Foreign keys
ALTER TABLE "EndUser"
    ADD CONSTRAINT "EndUser_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Device"
    ADD CONSTRAINT "Device_endUserId_fkey" FOREIGN KEY ("endUserId") REFERENCES "EndUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UsageSession"
    ADD CONSTRAINT "UsageSession_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UsageSession"
    ADD CONSTRAINT "UsageSession_endUserId_fkey" FOREIGN KEY ("endUserId") REFERENCES "EndUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DailyUsage"
    ADD CONSTRAINT "DailyUsage_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DailyUsage"
    ADD CONSTRAINT "DailyUsage_endUserId_fkey" FOREIGN KEY ("endUserId") REFERENCES "EndUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
