-- AlterTable: AdRequest (ad fee fields)
ALTER TABLE "AdRequest" ADD COLUMN "cost" FLOAT8 NOT NULL DEFAULT 100;
ALTER TABLE "AdRequest" ADD COLUMN "deducted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AdRequest" ADD COLUMN "deductedAt" TIMESTAMP(3);
ALTER TABLE "AdRequest" ADD COLUMN "payoutId" TEXT;

-- AlterTable: SellerPayout (ad-fee deductions applied to this payout)
ALTER TABLE "SellerPayout" ADD COLUMN "deductions" JSONB;