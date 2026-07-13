import { useCallback, useMemo, useRef, useState } from "react";
import { DateTime } from "luxon";
import { SWEDEN_ZONE, nowInStockholm } from "../../lib/time";
import {
  DAY_HEIGHT,
  HOUR_HEIGHT,
  formatClock,
  minutesSinceMidnight,
  minutesToY,
  yToMinutes,
} from "./gridMath";
import EntryPopover, { type EntryPatch } from "./EntryPopover";
import TimeEntryBlock from "./TimeEntryBlock";
import NowIndicator from "./NowIndicator";
import type { Project, TimeEntry } from "../../types";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const CLICK_THRESHOLD_PX = 5;

export type BlockDragType = "move" | "resize-top" | "resize-bottom";

interface DragState {
  type: BlockDragType | "create";
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

// Perf note: dragging/resizing updates `drag` state on every pointermove,
// which re-renders TimeGrid itself very frequently. Two things keep that
// cheap and keep it from cascading into a full-grid re-render:
//  1. Entries are grouped by day once per `entries`/`days` change (useMemo),
//     not refiltered on every drag tick.
//  2. Each block is its own memo()'d component (TimeEntryBlock) that only
//     re-renders when ITS OWN props change - so during a drag, unrelated
//     blocks are skipped entirely. The live-ticking duration on a running
//     entry works the same way: it's a self-contained interval inside that
//     one block, isolated from this component and from every other block.
export default function TimeGrid({ days, entries, holidaySet, projects, editable, onCreate, onUpdate, onDelete }: TimeGridProps) {
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragRef = useRef<DragState | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [openEntry, setOpenEntry] = useState<{ entry: TimeEntry; x: number; y: number } | null>(null);

  const now = nowInStockholm();

  const entriesByDay = useMemo(() => {
    const map = new Map<string, TimeEntry[]>();
    for (const day of days) map.set(day.toISODate()!, []);
    for (const entry of entries) {
      const key = DateTime.fromISO(entry.startTime).setZone(SWEDEN_ZONE).toISODate()!;
      map.get(key)?.push(entry);
    }
    return map;
  }, [days, entries]);

  function applyDrag(next: DragState | null) {
    dragRef.current = next;
    setDrag(next);
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

  // Stable across renders (deps limited to `editable`) so TimeEntryBlock's
  // memo() can actually skip unrelated blocks - see the perf note above.
  const handleBlockPointerDown = useCallback(
    (dayIndex: number, entry: TimeEntry, type: BlockDragType, e: React.PointerEvent<HTMLDivElement>) => {
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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editable]
  );

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
        const dayEntries = entriesByDay.get(day.toISODate()!) ?? [];
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

              <NowIndicator day={day} />

              {dayEntries.map((entry) => (
                <TimeEntryBlock
                  key={entry.id}
                  entry={entry}
                  dayIndex={dayIndex}
                  editable={editable}
                  hidden={drag?.entryId === entry.id}
                  onPointerDown={handleBlockPointerDown}
                />
              ))}

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
