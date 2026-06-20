-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "telegramUserId" BIGINT,
  ADD COLUMN "telegramUsername" TEXT,
  ADD COLUMN "telegramFirstName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramUserId_key" ON "User"("telegramUserId");

-- AlterTable
-- A place has a single physical location, so it has one IANA timezone.
-- Templates inherit it; we don't duplicate the column on EventTemplate.
ALTER TABLE "Place"
  ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Europe/Moscow';

-- AlterTable
ALTER TABLE "Event"
  ADD COLUMN "templateId" TEXT,
  ADD COLUMN "announcements" JSONB;

-- CreateTable
CREATE TABLE "EventTemplate" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "infoUrl" TEXT,
    -- ISO weekday: 1 = Monday … 7 = Sunday (matches Luxon's `weekday`).
    "dayOfWeek" INTEGER NOT NULL,
    -- Local time of day in the place's timezone. TIME so Postgres rejects
    -- "25:99" at insert time without app-level validation.
    "localTime" TIME(0) NOT NULL,
    "durationMinutes" INTEGER DEFAULT 60,
    "capacity" INTEGER,
    "reserveCapacity" INTEGER,
    "announceOffsetMinutes" INTEGER NOT NULL DEFAULT 1440,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventTemplateNotificationChannel" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "type" "NotificationChannelType" NOT NULL,
    "target" TEXT NOT NULL,
    "meta" JSONB,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventTemplateNotificationChannel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventTemplate_placeId_enabled_idx" ON "EventTemplate"("placeId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "EventTemplateNotificationChannel_templateId_type_target_key" ON "EventTemplateNotificationChannel"("templateId", "type", "target");

-- CreateIndex
CREATE UNIQUE INDEX "Event_templateId_startAt_key" ON "Event"("templateId", "startAt");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EventTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTemplate" ADD CONSTRAINT "EventTemplate_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTemplateNotificationChannel" ADD CONSTRAINT "EventTemplateNotificationChannel_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EventTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
