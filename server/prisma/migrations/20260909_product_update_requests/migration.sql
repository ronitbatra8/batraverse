ALTER TABLE "Product" ADD COLUMN "approvalType" TEXT NOT NULL DEFAULT 'add';
ALTER TABLE "Product" ADD COLUMN "baseProductId" TEXT;
ALTER TABLE "Product" ADD CONSTRAINT "Product_baseProductId_fkey" FOREIGN KEY ("baseProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Product_baseProductId_idx" ON "Product"("baseProductId");
