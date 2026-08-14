import { describe, expect, it } from "vitest";
import { MemberRole } from "@prisma/client";
import { ledgerPermissions, parseLedgerQuery, shanghaiDayBounds } from "@/lib/ledger-query";

describe("账目查询", () => {
  it("使用上海时区完整日期边界", () => {
    const range = shanghaiDayBounds("2026-08-14", "2026-08-14");
    expect(range.gte?.toISOString()).toBe("2026-08-13T16:00:00.000Z");
    expect(range.lt?.toISOString()).toBe("2026-08-14T16:00:00.000Z");
  });
  it("限制分页并解析筛选", () => {
    const query = parseLedgerQuery(new URLSearchParams("limit=200&type=INCOME&paymentMethod=WECHAT&cursor=abc"));
    expect(query).toMatchObject({ limit: 50, type: "INCOME", paymentMethod: "WECHAT", cursor: "abc" });
  });
  it("拒绝倒置日期和未知筛选值", () => {
    expect(() => shanghaiDayBounds("2026-08-15", "2026-08-14")).toThrow("INVALID_DATE_RANGE");
    expect(() => parseLedgerQuery(new URLSearchParams("type=UNKNOWN"))).toThrow("INVALID_TYPE");
  });
  it("按角色返回编辑删除权限", () => {
    expect(ledgerPermissions(MemberRole.OWNER)).toEqual({ canEdit: true, canDelete: true });
    expect(ledgerPermissions(MemberRole.BOOKKEEPER)).toEqual({ canEdit: true, canDelete: false });
    expect(ledgerPermissions(MemberRole.VIEWER)).toEqual({ canEdit: false, canDelete: false });
  });
});
