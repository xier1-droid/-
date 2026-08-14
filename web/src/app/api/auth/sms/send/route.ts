import { NextRequest, NextResponse } from "next/server";
import { VerificationPurpose } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiError, handleApiError } from "@/lib/http";
import { identityHash, normalizePhone } from "@/lib/identity";
import { smsSendSchema } from "@/lib/validators";
import { generateVerificationCode, hashVerificationCode, invalidateOpenChallenges } from "@/lib/verification";
import { getSmsProvider } from "@/lib/sms";

export async function POST(request: NextRequest) { try {
  const input = smsSendSchema.parse(await request.json()); const phone = normalizePhone(input.phone); const purpose = input.purpose as VerificationPurpose; const now = new Date();
  const user = await prisma.user.findUnique({ where: { phone }, select: { id: true } });
  if (purpose === "REGISTER" && user) return apiError("该手机号已注册，请直接登录", 409, "PHONE_EXISTS");
  if (purpose === "RESET_PASSWORD" && !user) return NextResponse.json({ ok: true, retryAfterSeconds: 60 });
  const recent = await prisma.verificationChallenge.findFirst({ where: { phone, purpose, createdAt: { gt: new Date(Date.now() - 60_000) } } }); if (recent) return apiError("验证码发送太频繁，请稍后再试", 429, "SMS_TOO_FREQUENT");
  const dayCount = await prisma.verificationChallenge.count({ where: { phone, createdAt: { gt: new Date(Date.now() - 86_400_000) } } }); if (dayCount >= 10) return apiError("今日验证码发送次数已达上限", 429, "SMS_DAILY_LIMIT");
  const ipHash = identityHash(request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown"); const ipCount = await prisma.verificationChallenge.count({ where: { requestIpHash: ipHash, createdAt: { gt: new Date(Date.now() - 3_600_000) } } }); if (ipCount >= 20) return apiError("验证码请求过于频繁", 429, "SMS_IP_LIMIT");
  await invalidateOpenChallenges(phone, purpose); const code = generateVerificationCode(); await getSmsProvider().sendVerificationCode({ phoneE164: phone, code, purpose });
  await prisma.verificationChallenge.create({ data: { phone, purpose, codeHash: hashVerificationCode(phone, purpose, code), expiresAt: new Date(now.getTime() + 300_000), requestIpHash: ipHash } });
  return NextResponse.json({ ok: true, retryAfterSeconds: 60 });
} catch (error) { const message = error instanceof Error ? error.message : ""; if (message === "INVALID_PHONE") return apiError("请输入正确的中国大陆手机号", 422, message); return handleApiError(error); } }
