/*
  Warnings:

  - You are about to drop the `SchemaMeta` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OPERATOR', 'TECHNICIAN');

-- CreateEnum
CREATE TYPE "Connectivity" AS ENUM ('ONLINE', 'OFFLINE', 'DEGRADED');

-- CreateEnum
CREATE TYPE "OpState" AS ENUM ('IDLE', 'MOVING', 'FAULT', 'SERVICE');

-- CreateEnum
CREATE TYPE "LidState" AS ENUM ('OPEN', 'CLOSED', 'MOVING', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PlatformState" AS ENUM ('UP', 'DOWN', 'MOVING', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('UNKNOWN', 'NOT_CHARGING', 'CHARGING', 'CHARGED', 'FAULT');

-- CreateEnum
CREATE TYPE "Readiness" AS ENUM ('READY', 'NOT_READY');

-- CreateEnum
CREATE TYPE "CommandType" AS ENUM ('LID_OPEN', 'LID_CLOSE', 'PLATFORM_RAISE', 'PLATFORM_LOWER', 'ABORT');

-- CreateEnum
CREATE TYPE "CommandStatus" AS ENUM ('PENDING', 'SENT', 'ACKED', 'FAILED', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('COMMAND', 'STATE', 'HEALTH', 'AUTH', 'DEVICE');

-- DropTable
DROP TABLE "SchemaMeta";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OPERATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "siteId" TEXT,
    "name" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "ingestTokenHash" TEXT,
    "lastHeartbeatAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceState" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "connectivity" "Connectivity" NOT NULL DEFAULT 'OFFLINE',
    "opState" "OpState" NOT NULL DEFAULT 'IDLE',
    "lid" "LidState" NOT NULL DEFAULT 'UNKNOWN',
    "platform" "PlatformState" NOT NULL DEFAULT 'UNKNOWN',
    "chargeStatus" "ChargeStatus" NOT NULL DEFAULT 'UNKNOWN',
    "socPercent" INTEGER,
    "readiness" "Readiness" NOT NULL DEFAULT 'NOT_READY',
    "readinessReasons" JSONB NOT NULL DEFAULT '[]',
    "extras" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Command" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" "CommandType" NOT NULL,
    "status" "CommandStatus" NOT NULL DEFAULT 'PENDING',
    "request" JSONB,
    "response" JSONB,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Command_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" "AuditEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Device_serial_key" ON "Device"("serial");

-- CreateIndex
CREATE INDEX "Device_siteId_idx" ON "Device"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceState_deviceId_key" ON "DeviceState"("deviceId");

-- CreateIndex
CREATE INDEX "Command_deviceId_createdAt_idx" ON "Command"("deviceId", "createdAt");

-- CreateIndex
CREATE INDEX "Command_status_idx" ON "Command"("status");

-- CreateIndex
CREATE INDEX "AuditEvent_deviceId_createdAt_idx" ON "AuditEvent"("deviceId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceState" ADD CONSTRAINT "DeviceState_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Command" ADD CONSTRAINT "Command_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Command" ADD CONSTRAINT "Command_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
