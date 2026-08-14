import { describe, expect, it } from "vitest";
import { businessDate, businessDayBounds, utcToLocalInput } from "@/lib/business-time";

describe("营业时区", () => {
  it("按北京时间计算完整营业日", () => {
    const range = businessDayBounds("2026-08-14", "Asia/Shanghai");
    expect(range.start.toISOString()).toBe("2026-08-13T16:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-08-14T16:00:00.000Z");
  });
  it("按乌鲁木齐时间计算跨年营业日", () => {
    const range = businessDayBounds("2026-01-01", "Asia/Urumqi");
    expect(range.start.toISOString()).toBe("2025-12-31T18:00:00.000Z");
    expect(businessDate(range.start, "Asia/Urumqi")).toBe("2026-01-01");
    expect(utcToLocalInput(range.start, "Asia/Urumqi")).toBe("2026-01-01T00:00");
  });
});
