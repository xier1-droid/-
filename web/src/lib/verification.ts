import { createHmac, randomInt } from "node:crypto";
import { VerificationPurpose, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const pepper = () => process.env.SMS_CODE_PEPPER ?? "development-sms-pepper-change-me";
export const mockVerificationCode = "246810";
export function hashVerificationCode(phone: string, purpose: VerificationPurpose, code: string) { return createHmac("sha256", pepper()).update(`${phone}:${purpose}:${code}`).digest("hex"); }
export function generateVerificationCode() { return (process.env.SMS_PROVIDER ?? "mock") === "mock" || process.env.NODE_ENV === "test" ? mockVerificationCode : String(randomInt(0, 1_000_000)).padStart(6, "0"); }

export async function consumeVerificationCode(transaction: Prisma.TransactionClient, input: { phone: string; purpose: VerificationPurpose; code: string }) {
  const challenge = await transaction.verificationChallenge.findFirst({ where: { phone: input.phone, purpose: input.purpose, consumedAt: null }, orderBy: { createdAt: "desc" } });
  if (!challenge || challenge.expiresAt <= new Date()) return "VERIFICATION_EXPIRED" as const;
  if (challenge.attemptCount >= challenge.maxAttempts) return "VERIFICATION_ATTEMPTS_EXCEEDED" as const;
  if (challenge.codeHash !== hashVerificationCode(input.phone, input.purpose, input.code)) {
    await transaction.verificationChallenge.update({ where: { id: challenge.id }, data: { attemptCount: { increment: 1 } } });
    return "VERIFICATION_INVALID" as const;
  }
  await transaction.verificationChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
  return "VERIFICATION_OK" as const;
}

export async function invalidateOpenChallenges(phone: string, purpose: VerificationPurpose) { await prisma.verificationChallenge.updateMany({ where: { phone, purpose, consumedAt: null }, data: { consumedAt: new Date() } }); }
