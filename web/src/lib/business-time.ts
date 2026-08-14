import { addDays, addMonths, addWeeks, startOfMonth, startOfWeek } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const supportedTimezones = ["Asia/Shanghai", "Asia/Urumqi"] as const;
export type SupportedTimezone = (typeof supportedTimezones)[number];
export const timezoneLabels: Record<SupportedTimezone, string> = { "Asia/Shanghai": "北京时间", "Asia/Urumqi": "乌鲁木齐时间" };

export function businessDate(value: Date, timezone: string) { return formatInTimeZone(value, timezone, "yyyy-MM-dd"); }
export function businessDayBounds(value: string, timezone: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("INVALID_DATE");
  const start = fromZonedTime(value + " 00:00:00", timezone);
  if (Number.isNaN(start.getTime())) throw new Error("INVALID_DATE");
  return { start, end: addDays(start, 1) };
}
export function localInputToUtc(value: string, timezone: string) { return fromZonedTime(value.replace("T", " "), timezone); }
export function utcToLocalInput(value: Date | string, timezone: string) { return formatInTimeZone(new Date(value), timezone, "yyyy-MM-dd'T'HH:mm"); }
export function displayDateTime(value: Date | string, timezone: string) { return formatInTimeZone(new Date(value), timezone, "M月d日 HH:mm"); }
export function shiftBusinessDate(value: Date, days: number, timezone: string) { return businessDate(addDays(value, days), timezone); }
export function bucketKey(value: Date, timezone: string, granularity: "day" | "week" | "month") {
  const local = new Date(formatInTimeZone(value, timezone, "yyyy-MM-dd'T'12:00:00"));
  if (granularity === "day") return formatInTimeZone(value, timezone, "yyyy-MM-dd");
  if (granularity === "week") return formatInTimeZone(startOfWeek(local, { weekStartsOn: 1 }), timezone, "yyyy-MM-dd");
  return formatInTimeZone(startOfMonth(local), timezone, "yyyy-MM");
}
export function nextBucket(key: string, granularity: "day" | "week" | "month") {
  const date = new Date(key + (key.length === 7 ? "-01T12:00:00Z" : "T12:00:00Z"));
  const next = granularity === "day" ? addDays(date, 1) : granularity === "week" ? addWeeks(date, 1) : addMonths(date, 1);
  return next.toISOString().slice(0, granularity === "month" ? 7 : 10);
}
