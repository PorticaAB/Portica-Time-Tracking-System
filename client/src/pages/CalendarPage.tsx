import { useCallback, useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { useAuth } from "../contexts/AuthContext";
import { useProjects } from "../hooks/useProjects";
import { api, getErrorMessage } from "../lib/api";
import { nowInStockholm, SWEDEN_ZONE } from "../lib/time";
import TimerBar from "../components/timer/TimerBar";
import TimeGrid from "../components/calendar/TimeGrid";
import MonthGrid from "../components/calendar/MonthGrid";
import CreateEntryModal from "../components/calendar/CreateEntryModal";
import type { EntryPatch } from "../components/calendar/EntryPopover";
import type { Holiday, TimeEntry, User } from "../types";
import clsx from "../lib/clsx";

type ViewMode = "day" | "week" | "month";

export default function CalendarPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const { projects } = useProjects();

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState<DateTime>(nowInStockholm());
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [contractors, setContractors] = useState<User[]>([]);
  const [selectedContractorId, setSelectedContractorId] = useState<string>("");
  const [createRange, setCreateRange] = useState<{ start: DateTime; end: DateTime } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editable = !isAdmin;

  const range = useMemo(() => {
    if (viewMode === "day") {
      const start = anchor.setZone(SWEDEN_ZONE).startOf("day");
      return { start, end: start.plus({ days: 1 }) };
    }
    if (viewMode === "week") {
      const start = anchor.setZone(SWEDEN_ZONE).startOf("week");
      return { start, end: start.plus({ weeks: 1 }) };
    }
    const start = anchor.setZone(SWEDEN_ZONE).startOf("month").startOf("week");
    const end = anchor.setZone(SWEDEN_ZONE).endOf("month").endOf("week").plus({ milliseconds: 1 });
    return { start, end };
  }, [anchor, viewMode]);

  useEffect(() => {
    if (isAdmin) {
      api.get<User[]>("/contractors").then((res) => {
        setContractors(res.data);
        if (!selectedContractorId && res.data.length > 0) setSelectedContractorId(res.data[0].id);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const loadEntries = useCallback(async () => {
    if (isAdmin && !selectedContractorId) {
      setEntries([]);
      return;
    }
    try {
      const params: Record<string, string> = {
        from: range.start.toUTC().toISO()!,
        to: range.end.toUTC().toISO()!,
      };
      if (isAdmin) params.userId = selectedContractorId;
      const res = await api.get<TimeEntry[]>("/time-entries", { params });
      setEntries(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [range, isAdmin, selectedContractorId]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    const years = new Set([range.start.year, range.end.year]);
    Promise.all([...years].map((year) => api.get<Holiday[]>("/holidays", { params: { year } }))).then((results) => {
      setHolidays(results.flatMap((r) => r.data));
    });
  }, [range]);

  const holidaySet = useMemo(() => new Map(holidays.map((h) => [h.date.slice(0, 10), h.name])), [holidays]);

  async function handleUpdate(id: string, patch: EntryPatch) {
    try {
      await api.patch(`/time-entries/${id}`, patch);
      loadEntries();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/time-entries/${id}`);
      loadEntries();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleCreate(data: { projectId: string; taskId?: string; description: string; startTime: string; endTime: string }) {
    try {
      await api.post("/time-entries", data);
      setCreateRange(null);
      loadEntries();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function goToday() {
    setAnchor(nowInStockholm());
  }

  function shift(amount: number) {
    if (viewMode === "day") setAnchor((a) => a.plus({ days: amount }));
    else if (viewMode === "week") setAnchor((a) => a.plus({ weeks: amount }));
    else setAnchor((a) => a.plus({ months: amount }));
  }

  const days =
    viewMode === "day" ? [range.start] : viewMode === "week" ? Array.from({ length: 7 }, (_, i) => range.start.plus({ days: i })) : [];

  return (
    <div className="flex h-full flex-col">
      {!isAdmin && <TimerBar projects={projects} onEntryChanged={loadEntries} />}

      <div className="flex items-center justify-between border-b border-line bg-surface px-6 py-2.5">
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} className="rounded-lg px-2 py-1 text-ink-muted transition-colors duration-150 hover:bg-line-soft hover:text-ink">
            ‹
          </button>
          <button onClick={goToday} className="rounded-lg border border-line px-3 py-1 text-sm text-ink-muted transition-colors duration-150 hover:bg-line-soft hover:text-ink">
            Today
          </button>
          <button onClick={() => shift(1)} className="rounded-lg px-2 py-1 text-ink-muted transition-colors duration-150 hover:bg-line-soft hover:text-ink">
            ›
          </button>
          <span className="ml-2 font-display text-base font-medium text-ink">
            {viewMode === "month" ? anchor.toFormat("LLLL yyyy") : `${range.start.toFormat("d LLL")} – ${range.end.minus({ days: 1 }).toFormat("d LLL yyyy")}`}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <select
              value={selectedContractorId}
              onChange={(e) => setSelectedContractorId(e.target.value)}
              className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              {contractors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <div className="flex rounded-lg border border-line bg-line-soft/50 p-0.5">
            {(["day", "week", "month"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={clsx(
                  "rounded-md px-3 py-1 text-sm capitalize transition-all duration-150",
                  viewMode === mode ? "bg-surface text-brand-700 shadow-soft" : "text-ink-muted hover:text-ink"
                )}
              >
                {mode}
              </button>
            ))}
          </div>
          {editable && (
            <button
              onClick={() => setCreateRange({ start: nowInStockholm().set({ minute: 0, second: 0 }), end: nowInStockholm().set({ minute: 0, second: 0 }).plus({ hours: 1 }) })}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white shadow-soft transition-all duration-150 hover:bg-brand-700 hover:shadow-soft-md active:scale-[0.98]"
            >
              + Add entry
            </button>
          )}
        </div>
      </div>

      {error && <p className="bg-danger-50 px-6 py-1 text-sm text-danger-600">{error}</p>}

      <div className="flex-1 overflow-hidden">
        {viewMode === "month" ? (
          <MonthGrid
            month={anchor}
            entries={entries}
            holidaySet={holidaySet}
            onSelectDay={(day) => {
              setAnchor(day);
              setViewMode("day");
            }}
          />
        ) : (
          <TimeGrid
            days={days}
            entries={entries}
            holidaySet={holidaySet}
            projects={projects}
            editable={editable}
            onCreate={(start, end) => setCreateRange({ start, end })}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        )}
      </div>

      {createRange && (
        <CreateEntryModal
          day={createRange.start.startOf("day")}
          defaultStart={createRange.start}
          defaultEnd={createRange.end}
          projects={projects}
          onClose={() => setCreateRange(null)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
