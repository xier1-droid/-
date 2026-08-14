import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizationError, requireOwner, requireUser } from "@/lib/auth";
import { apiError, handleApiError } from "@/lib/http";
import { getCurrentSettings } from "@/lib/settings";
import { organizationSettingsSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try { return NextResponse.json(await getCurrentSettings(await requireUser(), request.nextUrl.searchParams.get("organizationId"))); }
  catch (error) { return authorizationError(error) ?? handleApiError(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await requireUser();
    const organizationId = request.nextUrl.searchParams.get("organizationId");
    if (!organizationId) return apiError("缺少家庭商户标识", 422);
    const input = organizationSettingsSchema.parse(await request.json());
    await requireOwner(userId, organizationId);
    const result = await prisma.$transaction(async (tx) => {
      const [entries, closings] = await Promise.all([tx.ledgerEntry.count({ where: { store: { organizationId } } }), tx.dailyClosing.count({ where: { store: { organizationId } } })]);
      if (entries + closings > 0) throw new Error("TIMEZONE_LOCKED");
      await tx.organization.update({ where: { id: organizationId }, data: { timezone: input.timezone } });
      await tx.store.updateMany({ where: { organizationId }, data: { timezone: input.timezone } });
      return input.timezone;
    });
    return NextResponse.json({ ok: true, timezone: result });
  } catch (error) {
    if (error instanceof Error && error.message === "TIMEZONE_LOCKED") return apiError("已有账目或日结后不能修改时区，避免历史营业日发生变化。", 409, "TIMEZONE_LOCKED");
    return authorizationError(error) ?? handleApiError(error);
  }
}
