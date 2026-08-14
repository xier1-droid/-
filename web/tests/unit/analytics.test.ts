import { describe, expect, it } from "vitest";
import { EntryType, PaymentMethod } from "@prisma/client";
import { getSummary } from "@/lib/analytics";

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
