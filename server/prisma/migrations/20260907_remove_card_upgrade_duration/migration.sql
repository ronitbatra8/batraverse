-- DropIndex
DROP INDEX "CardUpgradePricing_fromLevel_toLevel_duration_key";

-- AlterTable
ALTER TABLE "CardUpgradePricing" DROP COLUMN "duration";

-- AlterTable
ALTER TABLE "CardUpgradeRequest" DROP COLUMN "duration";

-- AlterTable
ALTER TABLE "CardUpgradeRequest" ADD COLUMN     "transactionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CardUpgradePricing_fromLevel_toLevel_key" ON "CardUpgradePricing"("fromLevel", "toLevel");

-- DropEnum
DROP TYPE "UpgradeDuration";