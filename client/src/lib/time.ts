import { DateTime, Interval } from "luxon";

export const SWEDEN_ZONE = "Europe/Stockholm";

export function nowInStockholm(): DateTime {
  return DateTime.now().setZone(SWEDEN_ZONE);
}

export function fromISO(iso: string): DateTime {
  return DateTime.fromISO(iso, { zone: "utc" }).setZone(SWEDEN_ZONE);
}

export function toISO(dt: DateTime): string {
  return dt.toUTC().toISO()!;
}

export function startOfDayStockholm(dt: DateTime): DateTime {
  return dt.setZone(SWEDEN_ZONE).startOf("day");
}

export function startOfWeekStockholm(dt: DateTime): DateTime {
  return dt.setZone(SWEDEN_ZONE).startOf("week");
}

export function startOfMonthStockholm(dt: DateTime): DateTime {
  return dt.setZone(SWEDEN_ZONE).startOf("month");
}

export function formatTime(dt: DateTime): string {
  return dt.toFormat("HH:mm");
}

export function formatDateLabel(dt: DateTime): string {
  return dt.toFormat("ccc d LLL");
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export function durationHours(start: DateTime, end: DateTime): number {
  return end.diff(start, "hours").hours;
}

export function formatDurationHMS(seconds: number): string {
  const total = Math.max(Math.floor(seconds), 0);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => n.toString().padStart(2, "0")).join(":");
}

// Given a Stockholm-local calendar day, returns the [startUTC, endUTC) instant
// interval covering that day - handles DST transitions correctly since Luxon
// resolves local wall-clock times to the right UTC instant for that date.
export function stockholmDayToUtcInterval(day: DateTime): Interval {
  const start = day.setZone(SWEDEN_ZONE).startOf("day");
  const end = start.plus({ days: 1 });
  return Interval.fromDateTimes(start, end);
}

export function isSameStockholmDay(a: DateTime, b: DateTime): boolean {
  const sa = a.setZone(SWEDEN_ZONE);
  const sb = b.setZone(SWEDEN_ZONE);
  return sa.hasSame(sb, "day");
}
