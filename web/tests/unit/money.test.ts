import { describe, expect, it } from "vitest";
import { calculateExpectedCash, calculateNetIncome, formatFen, yuanToFen } from "@/lib/money";

describe("金额工具", () => {
  it("将人民币字符串精确转换为分", () => {
    expect(yuanToFen("25.50")).toBe(2550);
    expect(yuanToFen("4.8")).toBe(480);
  });
  it("拒绝浮点误差风险格式", () => {
    expect(() => yuanToFen("12.345")).toThrow("金额格式不正确");
  });
  it("正确计算净收益与应有现金", () => {
    expect(calculateNetIncome(2550, 480)).toBe(2070);
    expect(calculateExpectedCash(10000, 22000, 3000)).toBe(29000);
    expect(formatFen(2070)).toContain("20.70");
  });
});
