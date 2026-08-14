ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD CONSTRAINT "User_identifier_required" CHECK ("email" IS NOT NULL OR "phone" IS NOT NULL);
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

CREATE TYPE "VerificationPurpose" AS ENUM ('REGISTER', 'RESET_PASSWORD');
CREATE TABLE "VerificationChallenge" (
  "id" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "purpose" "VerificationPurpose" NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "requestIpHash" TEXT NOT NULL,
  CONSTRAINT "VerificationChallenge_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VerificationChallenge_phone_purpose_createdAt_idx" ON "VerificationChallenge"("phone", "purpose", "createdAt");
CREATE INDEX "VerificationChallenge_requestIpHash_createdAt_idx" ON "VerificationChallenge"("requestIpHash", "createdAt");
