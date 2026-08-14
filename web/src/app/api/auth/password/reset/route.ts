import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, handleApiError } from "@/lib/http";
import { normalizePhone } from "@/lib/identity";
import { passwordResetSchema } from "@/lib/validators";
import { consumeVerificationCode } from "@/lib/verification";

export async function POST(request: NextRequest) {
  try {
    const input = passwordResetSchema.parse(await request.json()); const phone = normalizePhone(input.phone); const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) return apiError("验证码无效或已过期", 422, "VERIFICATION_INVALID");
    const passwordHash = await bcrypt.hash(input.newPassword, 12);
    const result = await prisma.$transaction(async (tx) => {
      const verification = await consumeVerificationCode(tx, { phone, purpose: "RESET_PASSWORD", code: input.verificationCode });
      if (verification !== "VERIFICATION_OK") return verification;
      await tx.user.update({ where: { id: user.id }, data: { passwordHash, sessionVersion: { increment: 1 } } });
      return verification;
    });
    if (result !== "VERIFICATION_OK") return apiError("验证码无效、已过期或尝试次数过多", 422, result);
    return NextResponse.json({ ok: true });
  } catch (error) { return handleApiError(error); }
}
