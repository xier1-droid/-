import { describe, expect, it } from "vitest";
import { maskPhone, normalizeIdentity, normalizePhone } from "@/lib/identity";
import { hashVerificationCode } from "@/lib/verification";

describe("账号标识", () => {
  it("规范化邮箱和中国大陆手机号", () => { expect(normalizeIdentity(" User@Example.COM " )).toEqual({ kind: "email", value: "user@example.com" }); expect(normalizePhone("138 1234 5678")).toBe("+8613812345678"); expect(normalizePhone("+8613812345678")).toBe("+8613812345678"); });
  it("拒绝非法和国际手机号", () => { expect(() => normalizePhone("12812345678")).toThrow("INVALID_PHONE"); expect(() => normalizePhone("+14155552671")).toThrow("INVALID_PHONE"); });
  it("脱敏手机号并稳定哈希验证码", () => { expect(maskPhone("+8613812345678")).toBe("+86 138****5678"); expect(hashVerificationCode("+8613812345678", "REGISTER", "246810")).toBe(hashVerificationCode("+8613812345678", "REGISTER", "246810")); expect(hashVerificationCode("+8613812345678", "REGISTER", "246810")).not.toBe(hashVerificationCode("+8613812345678", "RESET_PASSWORD", "246810")); });
});
