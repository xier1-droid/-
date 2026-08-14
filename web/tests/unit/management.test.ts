import { describe, expect, it } from "vitest";
import { memberUpdateSchema, storeCreateSchema, storeUpdateSchema } from "@/lib/validators";

describe("成员与摊位管理校验", () => {
  it("接受非所有者角色和唯一的摊位授权", () => {
    expect(memberUpdateSchema.parse({ role: "BOOKKEEPER", storeIds: ["store-a", "store-b"] })).toEqual({ role: "BOOKKEEPER", storeIds: ["store-a", "store-b"] });
  });

  it("拒绝转让所有者、空授权和重复授权", () => {
    expect(memberUpdateSchema.safeParse({ role: "OWNER", storeIds: ["store-a"] }).success).toBe(false);
    expect(memberUpdateSchema.safeParse({ role: "VIEWER", storeIds: [] }).success).toBe(false);
    expect(memberUpdateSchema.safeParse({ role: "ADMIN", storeIds: ["store-a", "store-a"] }).success).toBe(false);
  });

  it("清理摊位名称并限制长度", () => {
    expect(storeCreateSchema.parse({ organizationId: "org-a", name: "  夜市摊位  " }).name).toBe("夜市摊位");
    expect(storeUpdateSchema.safeParse({ name: " " }).success).toBe(false);
    expect(storeUpdateSchema.safeParse({ name: "摊".repeat(61) }).success).toBe(false);
  });
});
