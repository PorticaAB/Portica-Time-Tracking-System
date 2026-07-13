import { memo } from "react";
import type { DateTime } from "luxon";
import { useNow } from "../../hooks/useNow";
import { minutesSinceMidnight, minutesToY } from "./gridMath";

// Isolated for the same reason as TimeEntryBlock: this is the only other
// thing in the grid that needs to tick, so it gets its own tiny re-render
// loop instead of forcing the whole grid to update. A 1px line's position
// doesn't need per-second precision, so it ticks every 30s rather than 1s.
function NowIndicator({ day }: { day: DateTime }) {
  const now = useNow(true, 30_000);
  if (!day.hasSame(now, "day")) return null;

  return (
    <div className="pointer-events-none absolute left-0 right-0 z-10 flex items-center" style={{ top: minutesToY(minutesSinceMidnight(now)) }}>
      <span className="-ml-1 h-2 w-2 rounded-full bg-danger-500" />
      <span className="h-px flex-1 bg-danger-500" />
    </div>
  );
}

export default memo(NowIndicator);
