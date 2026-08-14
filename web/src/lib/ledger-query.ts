import { EntryType, MemberRole, PaymentMethod } from "@prisma/client";
import { businessDayBounds } from "@/lib/business-time";

export function shanghaiDayBounds(from?: string | null, to?: string | null, timezone = "Asia/Shanghai") {
  const parse = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("INVALID_DATE");
    const date = businessDayBounds(value, timezone).start;
    if (Number.isNaN(date.getTime())) throw new Error("INVALID_DATE");
    return date;
  };
  const start = from ? parse(from) : undefined;
  const end = to ? parse(to) : undefined;
  if (start && end && start > end) throw new Error("INVALID_DATE_RANGE");
  if (end) end.setUTCDate(end.getUTCDate() + 1);
  return { ...(start ? { gte: start } : {}), ...(end ? { lt: end } : {}) };
}

export function parseLedgerQuery(params: URLSearchParams, timezone = "Asia/Shanghai") {
  const limit = Math.min(Math.max(Number(params.get("limit")) || 50, 1), 50);
  const type = params.get("type");
  const paymentMethod = params.get("paymentMethod");
  if (type && !Object.values(EntryType).includes(type as EntryType)) throw new Error("INVALID_TYPE");
  if (paymentMethod && !Object.values(PaymentMethod).includes(paymentMethod as PaymentMethod)) throw new Error("INVALID_PAYMENT_METHOD");
  return { limit, cursor: params.get("cursor") || undefined, type: type as EntryType | undefined, paymentMethod: paymentMethod as PaymentMethod | undefined, occurredAt: shanghaiDayBounds(params.get("from"), params.get("to"), timezone) };
}

export function ledgerPermissions(role: MemberRole) {
  return { canEdit: role !== MemberRole.VIEWER, canDelete: role === MemberRole.OWNER || role === MemberRole.ADMIN };
}
