import { createHash } from "node:crypto";

const mainlandPhone = /^1[3-9]\d{9}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type NormalizedIdentity = { kind: "email"; value: string } | { kind: "phone"; value: string };

export function normalizePhone(value: string) {
  const compact = value.trim().replace(/[ -]/g, "");
  const local = compact.startsWith("+86") ? compact.slice(3) : compact.startsWith("86") && compact.length === 13 ? compact.slice(2) : compact;
  if (!mainlandPhone.test(local)) throw new Error("INVALID_PHONE");
  return `+86${local}`;
}

export function normalizeIdentity(value: string): NormalizedIdentity {
  const trimmed = value.trim();
  if (trimmed.includes("@")) {
    const email = trimmed.toLowerCase();
    if (!emailPattern.test(email)) throw new Error("INVALID_IDENTIFIER");
    return { kind: "email", value: email };
  }
  return { kind: "phone", value: normalizePhone(trimmed) };
}

export function maskPhone(phone: string) { return phone.replace(/^(\+86)(\d{3})\d{4}(\d{4})$/, "$1 $2****$3"); }
export function identityHash(value: string) { return createHash("sha256").update(value).digest("hex"); }
