import { DateTime } from "luxon";
import { SWEDEN_ZONE } from "../../lib/time";

export const HOUR_HEIGHT = 56; // px per hour
export const DAY_HEIGHT = HOUR_HEIGHT * 24;
export const SNAP_MINUTES = 5;

export function minutesSinceMidnight(dt: DateTime): number {
  const local = dt.setZone(SWEDEN_ZONE);
  return local.hour * 60 + local.minute + local.second / 60;
}

export function minutesToY(minutes: number): number {
  return (minutes / 60) * HOUR_HEIGHT;
}

export function yToMinutes(y: number, snap = SNAP_MINUTES): number {
  const rawMinutes = (y / HOUR_HEIGHT) * 60;
  const snapped = Math.round(rawMinutes / snap) * snap;
  return Math.min(Math.max(snapped, 0), 24 * 60);
}

export function setMinutesOnDay(day: DateTime, minutes: number): DateTime {
  const clamped = Math.min(Math.max(minutes, 0), 24 * 60);
  return day.setZone(SWEDEN_ZONE).startOf("day").plus({ minutes: clamped });
}

export function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.round(minutes % 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}
