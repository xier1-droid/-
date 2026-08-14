import { EntryType, PaymentMethod } from "@prisma/client";

export type AnalyticsEntry = { type: EntryType; amountFen: number; paymentMethod: PaymentMethod; occurredAt: Date };

const dayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" });

export function dayKey(date: Date) { return dayFormatter.format(date); }

export function getSummary(entries: AnalyticsEntry[], from: Date, to: Date) {
  const incomeFen = entries.filter((entry) => entry.type === "INCOME").reduce((sum, entry) => sum + entry.amountFen, 0);
  const expenseFen = entries.filter((entry) => entry.type === "EXPENSE").reduce((sum, entry) => sum + entry.amountFen, 0);
  const paymentBreakdown = Object.values(PaymentMethod).map((paymentMethod) => ({
    paymentMethod,
    amountFen: entries.filter((entry) => entry.type === "INCOME" && entry.paymentMethod === paymentMethod).reduce((sum, entry) => sum + entry.amountFen, 0),
  })).filter((item) => item.amountFen > 0);
  const trendMap = new Map<string, { incomeFen: number; expenseFen: number }>();
  for (let current = new Date(from); current <= to; current.setDate(current.getDate() + 1)) trendMap.set(dayKey(current), { incomeFen: 0, expenseFen: 0 });
  for (const entry of entries) {
    const day = trendMap.get(dayKey(entry.occurredAt));
    if (!day) continue;
    if (entry.type === "INCOME") day.incomeFen += entry.amountFen;
    else day.expenseFen += entry.amountFen;
  }
  return {
    incomeFen,
    expenseFen,
    netFen: incomeFen - expenseFen,
    transactionCount: entries.length,
    paymentBreakdown,
    trend: [...trendMap.entries()].map(([date, totals]) => ({ date, ...totals, netFen: totals.incomeFen - totals.expenseFen })),
  };
}

export function getDayBounds(input: string) {
  const [year, month, day] = input.split("-").map(Number);
  if (!year || !month || !day) throw new Error("日期格式应为 YYYY-MM-DD");
  const start = new Date(Date.UTC(year, month - 1, day, -8, 0, 0));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}
