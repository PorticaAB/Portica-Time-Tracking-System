import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { nowInStockholm } from "../lib/time";

// Ticks a DateTime forward every `intervalMs` while `enabled`. Kept as its
// own hook (rather than lifted into a parent) so only the component that
// actually needs a live clock re-renders on each tick - everything else in
// the tree is untouched.
export function useNow(enabled: boolean, intervalMs = 1000): DateTime {
  const [now, setNow] = useState(() => nowInStockholm());

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(nowInStockholm()), intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs]);

  return now;
}
