-- AlterTable
ALTER TABLE "WalletTopUp" ADD COLUMN "paymentMethod" TEXT;

-- AlterTable
ALTER TABLE "WalletTopUp" ALTER COLUMN "transactionId" DROP NOT NULL;