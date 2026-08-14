import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizationError, requireUser } from "@/lib/auth";
import { apiError, handleApiError } from "@/lib/http";
import { resolveStoreScope } from "@/lib/store-scope";

const escapeCsv = (value: string | number | Date | null) => '"' + String(value ?? "").replaceAll('"', '""') + '"';

export async function GET(request: NextRequest) {
  try {
    const userId = await requireUser();
    const organizationId = request.nextUrl.searchParams.get("organizationId");
    const storeId = request.nextUrl.searchParams.get("storeId") ?? "all";
    if (!organizationId) return apiError("缺少家庭商户标识", 422);
    const { storeIds } = await resolveStoreScope(userId, organizationId, storeId);
    const entries = await prisma.ledgerEntry.findMany({ where: { storeId: { in: storeIds }, deletedAt: null }, include: { store: { select: { name: true } } }, orderBy: { occurredAt: "desc" } });
    const rows = [["摊位", "类型", "金额（元）", "收付款方式", "分类", "发生时间", "备注"], ...entries.map((entry) => [entry.store.name, entry.type === "INCOME" ? "收入" : "支出", (entry.amountFen / 100).toFixed(2), entry.paymentMethod, entry.category, entry.occurredAt.toISOString(), entry.note])];
    const csv = "\uFEFF" + rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="stall-ledger.csv"' } });
  } catch (error) { return authorizationError(error) ?? handleApiError(error); }
}
