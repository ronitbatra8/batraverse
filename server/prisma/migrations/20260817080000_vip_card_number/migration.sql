CREATE TABLE IF NOT EXISTS "_prisma_migrations_check" (id INT PRIMARY KEY DEFAULT 1);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "vipCardNumber" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_vipCardNumber_key" ON "User"("vipCardNumber");
DROP TABLE IF EXISTS "_prisma_migrations_check";
