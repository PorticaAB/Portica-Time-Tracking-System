// Computes Sweden's public holidays for a given year. Several are tied to
// Easter Sunday (computed via the Anonymous Gregorian / Meeus algorithm);
// Midsummer and All Saints' Day are tied to the nearest weekend to a fixed date.

export interface ComputedHoliday {
  date: string; // YYYY-MM-DD
  name: string;
}

function toDateOnly(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return toDateOnly(year, month, day);
}

// First date >= `from` whose weekday (0=Sun..6=Sat) matches `weekday`.
function nextWeekdayOnOrAfter(from: Date, weekday: number): Date {
  const d = new Date(from.getTime());
  const diff = (weekday - d.getUTCDay() + 7) % 7;
  return addDays(d, diff);
}

export function getSwedishHolidays(year: number): ComputedHoliday[] {
  const easter = easterSunday(year);
  const goodFriday = addDays(easter, -2);
  const easterMonday = addDays(easter, 1);
  const ascensionDay = addDays(easter, 39);

  // Midsummer's Eve: Friday between June 19-25. Midsummer's Day: the Saturday after it.
  const midsummerEve = nextWeekdayOnOrAfter(toDateOnly(year, 6, 19), 5);
  const midsummerDay = addDays(midsummerEve, 1);

  // All Saints' Day: Saturday between Oct 31 - Nov 6.
  const allSaintsDay = nextWeekdayOnOrAfter(toDateOnly(year, 10, 31), 6);

  const holidays: ComputedHoliday[] = [
    { date: formatDate(toDateOnly(year, 1, 1)), name: "New Year's Day" },
    { date: formatDate(toDateOnly(year, 1, 6)), name: "Epiphany" },
    { date: formatDate(goodFriday), name: "Good Friday" },
    { date: formatDate(easter), name: "Easter Sunday" },
    { date: formatDate(easterMonday), name: "Easter Monday" },
    { date: formatDate(toDateOnly(year, 5, 1)), name: "May Day" },
    { date: formatDate(ascensionDay), name: "Ascension Day" },
    { date: formatDate(toDateOnly(year, 6, 6)), name: "National Day" },
    { date: formatDate(midsummerEve), name: "Midsummer's Eve" },
    { date: formatDate(midsummerDay), name: "Midsummer's Day" },
    { date: formatDate(allSaintsDay), name: "All Saints' Day" },
    { date: formatDate(toDateOnly(year, 12, 24)), name: "Christmas Eve" },
    { date: formatDate(toDateOnly(year, 12, 25)), name: "Christmas Day" },
    { date: formatDate(toDateOnly(year, 12, 26)), name: "Boxing Day" },
    { date: formatDate(toDateOnly(year, 12, 31)), name: "New Year's Eve" },
  ];

  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}
