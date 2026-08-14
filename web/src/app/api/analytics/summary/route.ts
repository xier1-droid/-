import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizationError, requireUser } from "@/lib/auth";
import { apiError, handleApiError } from "@/lib/http";
import { getSummary, type TrendGranularity } from "@/lib/analytics";
import { resolveStoreScope } from "@/lib/store-scope";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function startOfChinaDay(value: string) { return new Date(value + "T00:00:00+08:00"); }
function endOfChinaDay(value: string) { return new Date(value + "T23:59:59.999+08:00"); }
function toChinaDate(value: Date) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(value); }

export async function GET(request: NextRequest) {
  try {
    const userId = await requireUser();
    const organizationId = request.nextUrl.searchParams.get("organizationId");
    const storeId = request.nextUrl.searchParams.get("storeId") ?? "all";
    const fromParam = request.nextUrl.searchParams.get("from");
    const toParam = request.nextUrl.searchParams.get("to");
    const requestedGranularity = request.nextUrl.searchParams.get("granularity") ?? "auto";
    if (!organizationId) return apiError("缺少家庭商户标识", 422);
    if (!["auto", "day", "week", "month"].includes(requestedGranularity)) return apiError("统计粒度不正确", 422);
    const { storeIds } = await resolveStoreScope(userId, organizationId, storeId);
    const firstEntry = await prisma.ledgerEntry.findFirst({ where: { storeId: { in: storeIds }, deletedAt: null }, orderBy: { occurredAt: "asc" }, select: { occurredAt: true } });
    const today = toChinaDate(new Date());
    const fromDate = fromParam === "all" ? (firstEntry ? toChinaDate(firstEntry.occurredAt) : today) : (fromParam ?? toChinaDate(new Date(Date.now() - 6 * 86_400_000)));
    const toDate = toParam ?? today;
    if (!datePattern.test(fromDate) || !datePattern.test(toDate) || fromDate > toDate) return apiError("开始日期不能晚于结束日期", 422, "INVALID_DATE_RANGE");
    if (toDate > today) return apiError("结束日期不能晚于今天", 422, "FUTURE_DATE_RANGE");
    const from = startOfChinaDay(fromDate);
    const to = endOfChinaDay(toDate);
    const granularity = requestedGranularity === "auto" ? undefined : requestedGranularity as TrendGranularity;
    const entries = await prisma.ledgerEntry.findMany({ where: { storeId: { in: storeIds }, deletedAt: null, occurredAt: { gte: from, lte: to } }, select: { type: true, amountFen: true, paymentMethod: true, occurredAt: true } });
    const recentEntries = await prisma.ledgerEntry.findMany({ where: { storeId: { in: storeIds }, deletedAt: null, occurredAt: { gte: from, lte: to } }, include: { store: { select: { name: true } } }, orderBy: { occurredAt: "desc" }, take: 8 });
    return NextResponse.json({ ...getSummary(entries, from, to, granularity), recentEntries, storeIds, range: { from: fromDate, to: toDate } });
  } catch (error) { return authorizationError(error) ?? handleApiError(error); }
}
