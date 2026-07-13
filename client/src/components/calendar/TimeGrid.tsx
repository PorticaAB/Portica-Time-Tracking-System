import { useRef, useState } from "react";
import { DateTime } from "luxon";
import { SWEDEN_ZONE } from "../../lib/time";
import { colorForProject } from "../../lib/projectColor";
import {
  DAY_HEIGHT,
  HOUR_HEIGHT,
  formatClock,
  minutesSinceMidnight,
  minutesToY,
  yToMinutes,
} from "./gridMath";
import EntryPopover, { type EntryPatch } from "./EntryPopover";
import type { Project, TimeEntry } from "../../types";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const CLICK_THRESHOLD_PX = 5;

interface DragState {
  type: "move" | "resize-top" | "resize-bottom" | "create";
  dayIndex: number;
  entryId?: string;
  pointerId: number;
  originClientY: number;
  originStartMin: number;
  originEndMin: number;
  currentStartMin: number;
  currentEndMin: number;
  moved: boolean;
}

interface TimeGridProps {
  days: DateTime[];
  entries: TimeEntry[];
  holidaySet: Map<string, string>;
  projects: Project[];
  editable: boolean;
  onCreate: (start: DateTime, end: DateTime) => void;
  onUpdate: (id: string, patch: EntryPatch) => void;
  onDelete: (id: string) => void;
}

export default function TimeGrid({ days, entries, holidaySet, projects, editable, onCreate, onUpdate, onDelete }: TimeGridProps) {
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragRef = useRef<DragState | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [openEntry, setOpenEntry] = useState<{ entry: TimeEntry; x: number; y: number } | null>(null);

  function applyDrag(next: DragState | null) {
    dragRef.current = next;
    setDrag(next);
  }

  const now = DateTime.now().setZone(SWEDEN_ZONE);

  function entriesForDay(day: DateTime) {
    return entries.filter((e) => DateTime.fromISO(e.startTime).setZone(SWEDEN_ZONE).hasSame(day, "day"));
  }

  function startDrag(next: DragState) {
    applyDrag(next);

    const handleMove = (e: PointerEvent) => {
      const prev = dragRef.current;
      if (!prev) return;
      const rect = columnRefs.current[prev.dayIndex]?.getBoundingClientRect();
      if (!rect) return;
      const minutes = yToMinutes(e.clientY - rect.top);
      const moved = prev.moved || Math.abs(e.clientY - prev.originClientY) > CLICK_THRESHOLD_PX;
      const duration = prev.originEndMin - prev.originStartMin;

      if (prev.type === "create") {
        const start = Math.min(prev.originStartMin, minutes);
        const end = Math.max(prev.originStartMin, minutes);
        applyDrag({ ...prev, currentStartMin: start, currentEndMin: end, moved });
        return;
      }
      if (prev.type === "move") {
        const deltaMin = minutes - yToMinutes(prev.originClientY - rect.top);
        let newStart = prev.originStartMin + deltaMin;
        newStart = Math.min(Math.max(newStart, 0), 24 * 60 - duration);
        applyDrag({ ...prev, currentStartMin: newStart, currentEndMin: newStart + duration, moved });
        return;
      }
      if (prev.type === "resize-top") {
        const newStart = Math.min(Math.max(minutes, 0), prev.originEndMin - 5);
        applyDrag({ ...prev, currentStartMin: newStart, moved });
        return;
      }
      // resize-bottom
      const newEnd = Math.max(Math.min(minutes, 24 * 60), prev.originStartMin + 5);
      applyDrag({ ...prev, currentEndMin: newEnd, moved });
    };

    const handleUp = () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
      const finalState = dragRef.current;
      applyDrag(null);
      if (finalState) commitDrag(finalState);
    };

    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
  }

  function commitDrag(state: DragState) {
    const day = days[state.dayIndex];
    if (state.type === "create") {
      if (!state.moved || state.currentEndMin - state.currentStartMin < 5) return;
      onCreate(
        day.startOf("day").plus({ minutes: state.currentStartMin }),
        day.startOf("day").plus({ minutes: state.currentEndMin })
      );
      return;
    }

    if (!state.entryId) return;

    if (!state.moved) {
      // Treat as a click - open the edit popover instead of committing a resize/move.
      const entry = entries.find((e) => e.id === state.entryId);
      if (entry) {
        const rect = columnRefs.current[state.dayIndex]?.getBoundingClientRect();
        setOpenEntry({ entry, x: (rect?.right ?? state.originClientY) + 8, y: state.originClientY });
      }
      return;
    }

    const start = day.startOf("day").plus({ minutes: state.currentStartMin });
    const end = day.startOf("day").plus({ minutes: state.currentEndMin });
    onUpdate(state.entryId, { startTime: start.toUTC().toISO()!, endTime: end.toUTC().toISO()! });
  }

  function handleColumnPointerDown(dayIndex: number, e: React.PointerEvent<HTMLDivElement>) {
    if (!editable || e.target !== e.currentTarget) return;
    const rect = columnRefs.current[dayIndex]!.getBoundingClientRect();
    const minutes = yToMinutes(e.clientY - rect.top);
    startDrag({
      type: "create",
      dayIndex,
      pointerId: e.pointerId,
      originClientY: e.clientY,
      originStartMin: minutes,
      originEndMin: minutes,
      currentStartMin: minutes,
      currentEndMin: minutes,
      moved: false,
    });
  }

  function handleBlockPointerDown(
    dayIndex: number,
    entry: TimeEntry,
    type: "move" | "resize-top" | "resize-bottom",
    e: React.PointerEvent<HTMLDivElement>
  ) {
    e.stopPropagation();
    const start = DateTime.fromISO(entry.startTime).setZone(SWEDEN_ZONE);
    const end = entry.endTime ? DateTime.fromISO(entry.endTime).setZone(SWEDEN_ZONE) : DateTime.now().setZone(SWEDEN_ZONE);
    if (!editable) {
      setOpenEntry({ entry, x: e.clientX + 8, y: e.clientY });
      return;
    }
    startDrag({
      type,
      dayIndex,
      entryId: entry.id,
      pointerId: e.pointerId,
      originClientY: e.clientY,
      originStartMin: minutesSinceMidnight(start),
      originEndMin: minutesSinceMidnight(end),
      currentStartMin: minutesSinceMidnight(start),
      currentEndMin: minutesSinceMidnight(end),
      moved: false,
    });
  }

  return (
    <div className="flex h-full overflow-auto bg-canvas">
      <div className="sticky left-0 z-10 w-14 flex-none bg-canvas">
        <div className="h-11 border-b border-line" />
        {HOURS.map((h) => (
          <div key={h} style={{ height: HOUR_HEIGHT }} className="relative -top-2.5 pr-2 text-right text-xs text-ink-faint">
            {h.toString().padStart(2, "0")}:00
          </div>
        ))}
      </div>

      {days.map((day, dayIndex) => {
        const dayEntries = entriesForDay(day);
        const holidayName = holidaySet.get(day.toFormat("yyyy-MM-dd"));
        const isHoliday = !!holidayName;
        const isToday = day.hasSame(now, "day");
        const isWeekend = day.weekday === 6 || day.weekday === 7;
        const draggingHere = drag && drag.dayIndex === dayIndex;

        return (
          <div key={day.toISO()} className="relative flex-1 border-l border-line" style={{ minWidth: days.length > 1 ? 120 : undefined }}>
            <div
              title={holidayName}
              className={`sticky top-0 z-10 flex h-11 items-center justify-center gap-1.5 border-b border-line px-2 text-sm font-medium ${
                isToday ? "bg-accent-50 text-accent-700" : isHoliday ? "bg-accent-50/50 text-accent-700" : "bg-surface text-ink-muted"
              }`}
            >
              {isToday && <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />}
              {day.toFormat("ccc d LLL")}
              {isHoliday && !isToday && <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />}
            </div>
            <div
              ref={(el) => (columnRefs.current[dayIndex] = el)}
              onPointerDown={(e) => handleColumnPointerDown(dayIndex, e)}
              className={`relative ${isToday ? "bg-accent-50/40" : isHoliday ? "bg-accent-50/20" : isWeekend ? "bg-line-soft/50" : "bg-surface"}`}
              style={{ height: DAY_HEIGHT }}
            >
              {HOURS.map((h) => (
                <div key={h} className="pointer-events-none border-b border-line-soft" style={{ height: HOUR_HEIGHT }} />
              ))}

              {isToday && (
                <div
                  className="pointer-events-none absolute left-0 right-0 z-10 flex items-center"
                  style={{ top: minutesToY(minutesSinceMidnight(now)) }}
                >
                  <span className="-ml-1 h-2 w-2 rounded-full bg-danger-500" />
                  <span className="h-px flex-1 bg-danger-500" />
                </div>
              )}

              {dayEntries.map((entry) => {
                if (drag?.type !== undefined && drag.entryId === entry.id) return null;
                const start = DateTime.fromISO(entry.startTime).setZone(SWEDEN_ZONE);
                const end = entry.endTime ? DateTime.fromISO(entry.endTime).setZone(SWEDEN_ZONE) : now;
                const top = minutesToY(minutesSinceMidnight(start));
                const height = Math.max(minutesToY(minutesSinceMidnight(end)) - top, 16);
                const color = colorForProject(entry.projectId);
                const isRunning = !entry.endTime;

                return (
                  <div
                    key={entry.id}
                    onPointerDown={(e) => handleBlockPointerDown(dayIndex, entry, "move", e)}
                    style={{ top, height, backgroundColor: `${color}1F`, borderColor: color }}
                    className="group absolute left-1 right-1 z-20 cursor-grab overflow-hidden rounded-lg border-l-[3px] px-2 py-1 text-xs shadow-soft transition-all duration-150 hover:-translate-y-0.5 hover:shadow-soft-md active:cursor-grabbing active:shadow-soft-lg"
                  >
                    {editable && (
                      <div
                        onPointerDown={(e) => handleBlockPointerDown(dayIndex, entry, "resize-top", e)}
                        className="absolute inset-x-0 top-0 h-1.5 cursor-ns-resize"
                      />
                    )}
                    <p className="truncate font-medium" style={{ color }}>
                      {entry.project.name}
                      {isRunning && " · running"}
                    </p>
                    <p className="truncate text-ink-muted">{entry.description || entry.task?.name || ""}</p>
                    {editable && (
                      <div
                        onPointerDown={(e) => handleBlockPointerDown(dayIndex, entry, "resize-bottom", e)}
                        className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize"
                      />
                    )}
                  </div>
                );
              })}

              {draggingHere && drag.type === "create" && (
                <div
                  style={{ top: minutesToY(drag.currentStartMin), height: minutesToY(drag.currentEndMin - drag.currentStartMin) }}
                  className="pointer-events-none absolute left-1 right-1 z-30 rounded-lg border-l-[3px] border-brand-500 bg-brand-100/70 px-2 py-1 text-xs font-medium text-brand-700 shadow-soft-md"
                >
                  {formatClock(drag.currentStartMin)} – {formatClock(drag.currentEndMin)}
                </div>
              )}

              {draggingHere && drag.entryId && (drag.type === "move" || drag.type === "resize-top" || drag.type === "resize-bottom") && (
                <div
                  style={{ top: minutesToY(drag.currentStartMin), height: Math.max(minutesToY(drag.currentEndMin - drag.currentStartMin), 16) }}
                  className="pointer-events-none absolute left-1 right-1 z-30 rounded-lg border-l-[3px] border-brand-500 bg-brand-100/80 px-2 py-1 text-xs font-medium text-brand-700 shadow-soft-lg"
                >
                  {formatClock(drag.currentStartMin)} – {formatClock(drag.currentEndMin)}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {openEntry && (
        <EntryPopover
          entry={openEntry.entry}
          projects={projects}
          position={{ x: openEntry.x, y: openEntry.y }}
          editable={editable}
          onClose={() => setOpenEntry(null)}
          onSave={(patch) => onUpdate(openEntry.entry.id, patch)}
          onDelete={() => {
            onDelete(openEntry.entry.id);
            setOpenEntry(null);
          }}
        />
      )}
    </div>
  );
}
