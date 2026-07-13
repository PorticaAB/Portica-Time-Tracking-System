import { memo } from "react";
import { DateTime } from "luxon";
import { SWEDEN_ZONE, formatDurationHMS } from "../../lib/time";
import { colorForProject } from "../../lib/projectColor";
import { useNow } from "../../hooks/useNow";
import { minutesSinceMidnight, minutesToY } from "./gridMath";
import type { TimeEntry } from "../../types";
import type { BlockDragType } from "./TimeGrid";

interface TimeEntryBlockProps {
  entry: TimeEntry;
  dayIndex: number;
  editable: boolean;
  hidden: boolean;
  onPointerDown: (dayIndex: number, entry: TimeEntry, type: BlockDragType, e: React.PointerEvent<HTMLDivElement>) => void;
}

// Isolated so a running entry's live-ticking duration only re-renders this
// one block, never the parent grid (see the perf note in TimeGrid.tsx).
// `onPointerDown` must be a stable (useCallback'd) reference from the
// parent, and `entry` must keep the same object identity when nothing
// about it changed - otherwise memo() below can't skip unrelated blocks.
function TimeEntryBlock({ entry, dayIndex, editable, hidden, onPointerDown }: TimeEntryBlockProps) {
  const isRunning = !entry.endTime;
  const now = useNow(isRunning);

  if (hidden) return null;

  const start = DateTime.fromISO(entry.startTime).setZone(SWEDEN_ZONE);
  const end = entry.endTime ? DateTime.fromISO(entry.endTime).setZone(SWEDEN_ZONE) : now;
  const top = minutesToY(minutesSinceMidnight(start));
  const height = Math.max(minutesToY(minutesSinceMidnight(end)) - top, 16);
  const color = colorForProject(entry.projectId);

  return (
    <div
      onPointerDown={(e) => onPointerDown(dayIndex, entry, "move", e)}
      style={{ top, height, backgroundColor: `${color}1F`, borderColor: color }}
      className="group absolute left-1 right-1 z-20 cursor-grab overflow-hidden rounded-lg border-l-[3px] px-2 py-1 text-xs shadow-soft transition-all duration-150 hover:-translate-y-0.5 hover:shadow-soft-md active:cursor-grabbing active:shadow-soft-lg"
    >
      {editable && (
        <div onPointerDown={(e) => onPointerDown(dayIndex, entry, "resize-top", e)} className="absolute inset-x-0 top-0 h-1.5 cursor-ns-resize" />
      )}
      <p className="truncate font-medium" style={{ color }}>
        {entry.project.name}
        {isRunning && ` · ${formatDurationHMS(now.diff(start, "seconds").seconds)}`}
      </p>
      <p className="truncate text-ink-muted">{entry.description || entry.task?.name || ""}</p>
      {editable && (
        <div onPointerDown={(e) => onPointerDown(dayIndex, entry, "resize-bottom", e)} className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize" />
      )}
    </div>
  );
}

export default memo(TimeEntryBlock);
