import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizationError, requireUser } from "@/lib/auth";
import { apiError, handleApiError } from "@/lib/http";
import { getSummary } from "@/lib/analytics";
import { resolveStoreScope } from "@/lib/store-scope";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireUser();
    const organizationId = request.nextUrl.searchParams.get("organizationId");
    const storeId = request.nextUrl.searchParams.get("storeId") ?? "all";
    const fromParam = request.nextUrl.searchParams.get("from");
    const toParam = request.nextUrl.searchParams.get("to");
    if (!organizationId) return apiError("缺少家庭商户标识", 422);
    const to = toParam ? new Date(toParam) : new Date();
    const from = fromParam ? new Date(fromParam) : new Date(to.getTime() - 6 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(from.valueOf()) || Number.isNaN(to.valueOf()) || from > to) return apiError("日期范围不正确", 422);
    const { storeIds } = await resolveStoreScope(userId, organizationId, storeId);
    const entries = await prisma.ledgerEntry.findMany({ where: { storeId: { in: storeIds }, deletedAt: null, occurredAt: { gte: from, lte: to } }, select: { type: true, amountFen: true, paymentMethod: true, occurredAt: true } });
    const recentEntries = await prisma.ledgerEntry.findMany({ where: { storeId: { in: storeIds }, deletedAt: null }, include: { store: { select: { name: true } } }, orderBy: { occurredAt: "desc" }, take: 8 });
    return NextResponse.json({ ...getSummary(entries, from, to), recentEntries, storeIds });
  } catch (error) { return authorizationError(error) ?? handleApiError(error); }
}
