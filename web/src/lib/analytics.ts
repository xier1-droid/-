import { EntryType, PaymentMethod } from "@prisma/client";

export type AnalyticsEntry = { type: EntryType; amountFen: number; paymentMethod: PaymentMethod; occurredAt: Date };
export type TrendGranularity = "day" | "week" | "month";
export type TrendPoint = { date: string; label: string; incomeFen: number; expenseFen: number; netFen: number };

export function dayKey(date: Date, timezone = "Asia/Shanghai") { return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date); }

export function chooseGranularity(from: Date, to: Date): TrendGranularity {
  const days = Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;
  if (days <= 31) return "day";
  if (days <= 180) return "week";
  return "month";
}

function mondayKey(date: Date) {
  const [year, month, day] = dayKey(date).split("-").map(Number);
  const local = new Date(Date.UTC(year, month - 1, day));
  const weekday = (local.getUTCDay() + 6) % 7;
  local.setUTCDate(local.getUTCDate() - weekday);
  return local.toISOString().slice(0, 10);
}

function monthKey(date: Date) { return dayKey(date).slice(0, 7); }

function bucketKey(date: Date, granularity: TrendGranularity) {
  if (granularity === "day") return dayKey(date);
  if (granularity === "week") return mondayKey(date);
  return monthKey(date);
}

function bucketLabel(key: string, granularity: TrendGranularity) {
  if (granularity === "day") return key.slice(5).replace("-", "/");
  if (granularity === "week") return key.slice(5).replace("-", "/") + " 周";
  const [year, month] = key.split("-");
  return year + "年" + Number(month) + "月";
}

function nextBucket(key: string, granularity: TrendGranularity) {
  const [year, month, day = 1] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (granularity === "day") date.setUTCDate(date.getUTCDate() + 1);
  else if (granularity === "week") date.setUTCDate(date.getUTCDate() + 7);
  else date.setUTCMonth(date.getUTCMonth() + 1, 1);
  return granularity === "month" ? date.toISOString().slice(0, 7) : date.toISOString().slice(0, 10);
}

export function buildTrend(entries: AnalyticsEntry[], from: Date, to: Date, granularity = chooseGranularity(from, to), timezone = "Asia/Shanghai") {
  const trendMap = new Map<string, { incomeFen: number; expenseFen: number }>();
  let key = bucketKey(from, granularity);
  const finalKey = bucketKey(to, granularity);
  while (key <= finalKey) { trendMap.set(key, { incomeFen: 0, expenseFen: 0 }); key = nextBucket(key, granularity); }
  for (const entry of entries) {
    const entryKey = granularity === "day" ? dayKey(entry.occurredAt, timezone) : bucketKey(entry.occurredAt, granularity);
    const bucket = trendMap.get(entryKey);
    if (!bucket) continue;
    if (entry.type === "INCOME") bucket.incomeFen += entry.amountFen;
    else bucket.expenseFen += entry.amountFen;
  }
  return [...trendMap.entries()].map(([date, totals]) => ({ date, label: bucketLabel(date, granularity), ...totals, netFen: totals.incomeFen - totals.expenseFen }));
}

export function getSummary(entries: AnalyticsEntry[], from: Date, to: Date, granularity = chooseGranularity(from, to), timezone = "Asia/Shanghai") {
  const incomeFen = entries.filter((entry) => entry.type === "INCOME").reduce((sum, entry) => sum + entry.amountFen, 0);
  const expenseFen = entries.filter((entry) => entry.type === "EXPENSE").reduce((sum, entry) => sum + entry.amountFen, 0);
  const paymentBreakdown = Object.values(PaymentMethod).map((paymentMethod) => ({
    paymentMethod,
    amountFen: entries.filter((entry) => entry.type === "INCOME" && entry.paymentMethod === paymentMethod).reduce((sum, entry) => sum + entry.amountFen, 0),
  })).filter((item) => item.amountFen > 0);
  return { incomeFen, expenseFen, netFen: incomeFen - expenseFen, transactionCount: entries.length, paymentBreakdown, granularity, trend: buildTrend(entries, from, to, granularity, timezone) };
}

export function getDayBounds(input: string, timezone = "Asia/Shanghai") {
  const [year, month, day] = input.split("-").map(Number);
  if (!year || !month || !day) throw new Error("日期格式应为 YYYY-MM-DD");
  const offsetHours = timezone === "Asia/Urumqi" ? 6 : 8;
  const start = new Date(Date.UTC(year, month - 1, day, -offsetHours, 0, 0));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export function dateRangeLabel(from: string, to: string) {
  return from === to ? from.replaceAll("-", "/") : from.replaceAll("-", "/") + " - " + to.replaceAll("-", "/");
}
