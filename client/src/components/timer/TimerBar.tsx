import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { api, getErrorMessage } from "../../lib/api";
import type { Project, TimeEntry } from "../../types";

interface TimerBarProps {
  projects: Project[];
  onEntryChanged: () => void;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((n) => n.toString().padStart(2, "0")).join(":");
}

export default function TimerBar({ projects, onEntryChanged }: TimerBarProps) {
  const [running, setRunning] = useState<TimeEntry | null>(null);
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [description, setDescription] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<TimeEntry | null>("/time-entries/running").then((res) => {
      if (res.data) {
        setRunning(res.data);
        setProjectId(res.data.projectId);
        setTaskId(res.data.taskId ?? "");
        setDescription(res.data.description);
      }
    });
  }, []);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const start = DateTime.fromISO(running.startTime);
      setElapsed(DateTime.now().diff(start, "seconds").seconds);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [running]);

  const selectedProject = useMemo(() => projects.find((p) => p.id === projectId), [projects, projectId]);

  async function handleStart() {
    if (!projectId) {
      setError("Pick a client/project first");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<TimeEntry>("/time-entries/start", {
        projectId,
        taskId: taskId || undefined,
        description,
      });
      setRunning(res.data);
      onEntryChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleStop() {
    if (!running) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/time-entries/${running.id}/stop`);
      setRunning(null);
      setElapsed(0);
      onEntryChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-line bg-surface px-6 py-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="What are you working on?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!!running}
          className="min-w-[220px] flex-1 rounded-lg border border-line bg-canvas/40 px-3 py-2 text-sm text-ink transition-colors duration-150 focus:border-brand-500 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-line-soft/60"
        />
        <select
          value={projectId}
          onChange={(e) => {
            setProjectId(e.target.value);
            setTaskId("");
          }}
          disabled={!!running}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink transition-colors duration-150 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-line-soft/60"
        >
          <option value="">Select client / project…</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.client.name} · {p.name}
            </option>
          ))}
        </select>
        {selectedProject && selectedProject.tasks.length > 0 && (
          <select
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            disabled={!!running}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink transition-colors duration-150 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-line-soft/60"
          >
            <option value="">No task</option>
            {selectedProject.tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
        <div className="w-28 text-center font-display text-xl tabular-nums text-ink">
          {formatElapsed(elapsed)}
        </div>
        {running ? (
          <button
            onClick={handleStop}
            disabled={busy}
            className="rounded-lg bg-accent-600 px-5 py-2 text-sm font-semibold text-white shadow-soft transition-all duration-150 hover:bg-accent-700 hover:shadow-soft-md active:scale-[0.98] disabled:opacity-50"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={handleStart}
            disabled={busy}
            className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-soft transition-all duration-150 hover:bg-brand-700 hover:shadow-soft-md active:scale-[0.98] disabled:opacity-50"
          >
            Start
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-danger-600">{error}</p>}
    </div>
  );
}
