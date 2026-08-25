-- CreateEnum
CREATE TYPE "UpgradeDuration" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "UpgradeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "cardExpiry" TIMESTAMP(3),
ADD COLUMN     "cardLevel" TEXT;

-- CreateTable
CREATE TABLE "CardUpgradePricing" (
    "id" TEXT NOT NULL,
    "fromLevel" TEXT NOT NULL,
    "toLevel" TEXT NOT NULL,
    "duration" "UpgradeDuration" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardUpgradePricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardUpgradeRequest" (
    "id" TEXT NOT NULL,
    "fromLevel" TEXT NOT NULL,
    "toLevel" TEXT NOT NULL,
    "duration" "UpgradeDuration" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "status" "UpgradeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,

    CONSTRAINT "CardUpgradeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CardUpgradePricing_fromLevel_toLevel_duration_key" ON "CardUpgradePricing"("fromLevel", "toLevel", "duration");

-- CreateIndex
CREATE INDEX "CardUpgradeRequest_userId_idx" ON "CardUpgradeRequest"("userId");

-- CreateIndex
CREATE INDEX "CardUpgradeRequest_status_idx" ON "CardUpgradeRequest"("status");

-- AddForeignKey
ALTER TABLE "CardUpgradeRequest" ADD CONSTRAINT "CardUpgradeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
