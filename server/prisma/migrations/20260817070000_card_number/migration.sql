-- AlterTable
ALTER TABLE "User" ADD COLUMN "cardNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_cardNumber_key" ON "User"("cardNumber");
