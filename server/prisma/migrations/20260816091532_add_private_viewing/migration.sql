-- CreateEnum
CREATE TYPE "PrivateViewingStatus" AS ENUM ('requested', 'confirmed', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "PrivateViewing" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "note" TEXT,
    "status" "PrivateViewingStatus" NOT NULL DEFAULT 'requested',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivateViewing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrivateViewing_status_idx" ON "PrivateViewing"("status");

-- CreateIndex
CREATE INDEX "PrivateViewing_createdAt_idx" ON "PrivateViewing"("createdAt");
