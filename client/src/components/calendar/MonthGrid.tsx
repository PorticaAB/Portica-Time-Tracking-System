import { DateTime } from "luxon";
import { SWEDEN_ZONE } from "../../lib/time";
import { colorForProject } from "../../lib/projectColor";
import type { TimeEntry } from "../../types";

interface MonthGridProps {
  month: DateTime;
  entries: TimeEntry[];
  holidaySet: Map<string, string>;
  onSelectDay: (day: DateTime) => void;
}

export default function MonthGrid({ month, entries, holidaySet, onSelectDay }: MonthGridProps) {
  const monthStart = month.setZone(SWEDEN_ZONE).startOf("month");
  const monthEnd = month.setZone(SWEDEN_ZONE).endOf("month");
  const gridStart = monthStart.startOf("week");
  const gridEnd = monthEnd.endOf("week");

  const days: DateTime[] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    days.push(cursor);
    cursor = cursor.plus({ days: 1 });
  }

  const now = DateTime.now().setZone(SWEDEN_ZONE);
  const weekdayLabels = days.slice(0, 7).map((d) => d.toFormat("ccc"));

  function entriesForDay(day: DateTime) {
    return entries.filter((e) => DateTime.fromISO(e.startTime).setZone(SWEDEN_ZONE).hasSame(day, "day"));
  }

  return (
    <div className="grid h-full grid-rows-[auto_1fr] overflow-auto bg-canvas p-4">
      <div className="mb-2 grid grid-cols-7 text-center text-xs font-medium uppercase tracking-wide text-ink-faint">
        {weekdayLabels.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5" style={{ gridAutoRows: "minmax(110px, 1fr)" }}>
        {days.map((day) => {
          const dayEntries = entriesForDay(day);
          const totalHours = dayEntries.reduce((sum, e) => {
            const end = e.endTime ? DateTime.fromISO(e.endTime) : DateTime.now();
            return sum + end.diff(DateTime.fromISO(e.startTime), "hours").hours;
          }, 0);
          const holidayName = holidaySet.get(day.toFormat("yyyy-MM-dd"));
          const isHoliday = !!holidayName;
          const isToday = day.hasSame(now, "day");
          const isWeekend = day.weekday === 6 || day.weekday === 7;
          const inMonth = day.hasSame(month, "month");

          return (
            <button
              key={day.toISO()}
              title={holidayName}
              onClick={() => onSelectDay(day)}
              className={`flex flex-col items-stretch rounded-lg border p-1.5 text-left shadow-soft transition-all duration-150 hover:-translate-y-0.5 hover:shadow-soft-md ${
                isToday
                  ? "border-accent-200 bg-accent-50/60"
                  : isHoliday
                    ? "border-accent-100 bg-accent-50/25"
                    : isWeekend
                      ? "border-line bg-line-soft/40"
                      : "border-line bg-surface"
              } ${!inMonth ? "opacity-40" : ""}`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={`text-xs font-medium ${
                    isToday ? "rounded-full bg-accent-600 px-1.5 py-0.5 text-white" : "text-ink-muted"
                  }`}
                >
                  {day.day}
                </span>
                {totalHours > 0 && <span className="text-[11px] font-semibold text-ink-muted">{totalHours.toFixed(1)}h</span>}
              </div>
              <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                {dayEntries.slice(0, 3).map((e) => (
                  <div
                    key={e.id}
                    style={{ backgroundColor: `${colorForProject(e.projectId)}1F`, color: colorForProject(e.projectId) }}
                    className="truncate rounded px-1 text-[10px] font-medium"
                  >
                    {e.project.name}
                  </div>
                ))}
                {dayEntries.length > 3 && <span className="text-[10px] text-ink-faint">+{dayEntries.length - 3} more</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
