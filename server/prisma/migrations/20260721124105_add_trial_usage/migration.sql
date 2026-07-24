-- AlterTable
ALTER TABLE "User" ADD COLUMN     "trialUsed" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AnonymousUsage" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnonymousUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnonymousUsage_deviceId_key" ON "AnonymousUsage"("deviceId");
