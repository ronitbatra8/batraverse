-- CreateTable
CREATE TABLE "Otp" (
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Otp_pkey" PRIMARY KEY ("email")
);
