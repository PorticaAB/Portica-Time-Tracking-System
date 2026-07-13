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
  holidaySet: Set<string>;
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
    <div className="flex h-full overflow-auto">
      <div className="sticky left-0 z-10 w-14 flex-none bg-white">
        <div className="h-10 border-b border-slate-200" />
        {HOURS.map((h) => (
          <div key={h} style={{ height: HOUR_HEIGHT }} className="relative -top-2.5 pr-2 text-right text-xs text-slate-400">
            {h.toString().padStart(2, "0")}:00
          </div>
        ))}
      </div>

      {days.map((day, dayIndex) => {
        const dayEntries = entriesForDay(day);
        const isHoliday = holidaySet.has(day.toFormat("yyyy-MM-dd"));
        const isToday = day.hasSame(now, "day");
        const draggingHere = drag && drag.dayIndex === dayIndex;

        return (
          <div key={day.toISO()} className="relative flex-1 border-l border-slate-200" style={{ minWidth: days.length > 1 ? 120 : undefined }}>
            <div
              className={`sticky top-0 z-10 h-10 border-b border-slate-200 px-2 py-1.5 text-center text-sm font-medium ${
                isHoliday ? "bg-amber-50 text-amber-700" : isToday ? "bg-brand-50 text-brand-700" : "bg-white text-slate-600"
              }`}
            >
              {day.toFormat("ccc d LLL")}
              {isHoliday && <span className="ml-1 text-xs">🎌</span>}
            </div>
            <div
              ref={(el) => (columnRefs.current[dayIndex] = el)}
              onPointerDown={(e) => handleColumnPointerDown(dayIndex, e)}
              className={`relative ${isHoliday ? "bg-amber-50/40" : ""}`}
              style={{ height: DAY_HEIGHT }}
            >
              {HOURS.map((h) => (
                <div key={h} className="pointer-events-none border-b border-slate-100" style={{ height: HOUR_HEIGHT }} />
              ))}

              {isToday && (
                <div
                  className="pointer-events-none absolute left-0 right-0 z-10 border-t-2 border-red-500"
                  style={{ top: minutesToY(minutesSinceMidnight(now)) }}
                />
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
                    style={{ top, height, backgroundColor: `${color}22`, borderColor: color }}
                    className="absolute left-1 right-1 z-20 cursor-grab overflow-hidden rounded-md border-l-4 px-2 py-1 text-xs shadow-sm"
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
                    <p className="truncate text-slate-600">{entry.description || entry.task?.name || ""}</p>
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
                  className="pointer-events-none absolute left-1 right-1 z-30 rounded-md border-l-4 border-brand-500 bg-brand-100/70 px-2 py-1 text-xs"
                >
                  {formatClock(drag.currentStartMin)} – {formatClock(drag.currentEndMin)}
                </div>
              )}

              {draggingHere && drag.entryId && (drag.type === "move" || drag.type === "resize-top" || drag.type === "resize-bottom") && (
                <div
                  style={{ top: minutesToY(drag.currentStartMin), height: Math.max(minutesToY(drag.currentEndMin - drag.currentStartMin), 16) }}
                  className="pointer-events-none absolute left-1 right-1 z-30 rounded-md border-l-4 border-brand-500 bg-brand-100/80 px-2 py-1 text-xs"
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
