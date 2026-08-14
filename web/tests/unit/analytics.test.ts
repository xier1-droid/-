import { describe, expect, it } from "vitest";
import { EntryType, PaymentMethod } from "@prisma/client";
import { buildTrend, chooseGranularity, getSummary } from "@/lib/analytics";

describe("经营汇总", () => {
  it("汇总收入、支出、净收益和支付方式", () => {
    const summary = getSummary([
      { type: EntryType.INCOME, amountFen: 2550, paymentMethod: PaymentMethod.WECHAT, occurredAt: new Date("2026-08-14T02:00:00Z") },
      { type: EntryType.EXPENSE, amountFen: 480, paymentMethod: PaymentMethod.CASH, occurredAt: new Date("2026-08-14T03:00:00Z") },
    ], new Date("2026-08-13T16:00:00Z"), new Date("2026-08-14T16:00:00Z"));
    expect(summary.incomeFen).toBe(2550);
    expect(summary.expenseFen).toBe(480);
    expect(summary.netFen).toBe(2070);
    expect(summary.transactionCount).toBe(2);
    expect(summary.paymentBreakdown).toEqual([{ paymentMethod: PaymentMethod.WECHAT, amountFen: 2550 }]);
  });
});


describe("历史趋势粒度", () => {
  it("根据跨度自动切换日、周、月", () => {
    expect(chooseGranularity(new Date("2026-08-01T00:00:00Z"), new Date("2026-08-31T00:00:00Z"))).toBe("day");
    expect(chooseGranularity(new Date("2026-01-01T00:00:00Z"), new Date("2026-03-01T00:00:00Z"))).toBe("week");
    expect(chooseGranularity(new Date("2025-01-01T00:00:00Z"), new Date("2026-08-01T00:00:00Z"))).toBe("month");
  });
  it("填充空日期并按月聚合历史账目", () => {
    const trend = buildTrend([
      { type: EntryType.INCOME, amountFen: 1000, paymentMethod: PaymentMethod.WECHAT, occurredAt: new Date("2025-01-10T03:00:00Z") },
      { type: EntryType.EXPENSE, amountFen: 250, paymentMethod: PaymentMethod.CASH, occurredAt: new Date("2025-03-10T03:00:00Z") },
    ], new Date("2025-01-01T00:00:00Z"), new Date("2025-03-31T15:59:59Z"), "month");
    expect(trend).toHaveLength(3);
    expect(trend[0]?.incomeFen).toBe(1000);
    expect(trend[1]?.incomeFen).toBe(0);
    expect(trend[2]?.expenseFen).toBe(250);
  });
});
