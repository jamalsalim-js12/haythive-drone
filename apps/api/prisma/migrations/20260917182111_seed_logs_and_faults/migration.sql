-- CreateEnum
CREATE TYPE "FaultSeverity" AS ENUM ('WARNING', 'CRITICAL');

-- CreateTable
CREATE TABLE "Fault" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "severity" "FaultSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Fault_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Fault_deviceId_createdAt_idx" ON "Fault"("deviceId", "createdAt");

-- CreateIndex
CREATE INDEX "Fault_resolved_idx" ON "Fault"("resolved");

-- AddForeignKey
ALTER TABLE "Fault" ADD CONSTRAINT "Fault_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
