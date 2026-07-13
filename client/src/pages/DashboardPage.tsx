import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DateTime } from "luxon";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import { nowInStockholm, formatHours } from "../lib/time";
import type { ReportSummary, TimeEntry } from "../types";

function useThisWeekSummary() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);

  useEffect(() => {
    const from = nowInStockholm().startOf("week").toUTC().toISO();
    const to = nowInStockholm().endOf("week").toUTC().toISO();
    api.get<ReportSummary>("/reports/summary", { params: { from, to } }).then((res) => setSummary(res.data));
  }, []);

  return summary;
}

function formatElapsed(startIso: string): string {
  const start = DateTime.fromISO(startIso);
  const seconds = Math.max(DateTime.now().diff(start, "seconds").seconds, 0);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function ShortcutCard({ to, title, description }: { to: string; title: string; description: string }) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-line bg-surface p-4 shadow-soft transition-all duration-150 hover:-translate-y-0.5 hover:shadow-soft-md"
    >
      <p className="font-medium text-ink">{title}</p>
      <p className="mt-0.5 text-sm text-ink-muted">{description}</p>
    </Link>
  );
}

function TeamMemberDashboard() {
  const { user } = useAuth();
  const summary = useThisWeekSummary();
  const [running, setRunning] = useState<TimeEntry | null>(null);

  useEffect(() => {
    api.get<TimeEntry | null>("/time-entries/running").then((res) => setRunning(res.data));
  }, []);

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-1 font-display text-2xl font-semibold tracking-tight text-ink">
        {nowInStockholm().hour < 12 ? "Good morning" : nowInStockholm().hour < 18 ? "Good afternoon" : "Good evening"}, {user?.name?.split(" ")[0]}
      </h1>
      <p className="mb-6 text-sm text-ink-muted">Here's where things stand this week.</p>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-line bg-surface p-5 shadow-soft">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">This week</p>
          <p className="font-display text-3xl font-semibold text-ink">{summary ? formatHours(summary.totalHours) : "…"}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-5 shadow-soft">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Timer</p>
          {running ? (
            <>
              <p className="font-display text-3xl font-semibold text-accent-600">{formatElapsed(running.startTime)}</p>
              <p className="mt-0.5 truncate text-sm text-ink-muted">{running.project.name}{running.description ? ` · ${running.description}` : ""}</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-ink-muted">Nothing running right now</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ShortcutCard to="/calendar" title="Open Calendar" description={running ? "Stop your timer or add an entry" : "Start a timer or log time"} />
        <ShortcutCard to="/reports" title="View Reports" description="See your hours by project" />
      </div>
    </div>
  );
}

function AdminDashboard() {
  const summary = useThisWeekSummary();

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-1 font-display text-2xl font-semibold tracking-tight text-ink">Dashboard</h1>
      <p className="mb-6 text-sm text-ink-muted">Team activity this week.</p>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-line bg-surface p-5 shadow-soft">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Team hours</p>
          <p className="font-display text-3xl font-semibold text-ink">{summary ? formatHours(summary.totalHours) : "…"}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-5 shadow-soft">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Entries</p>
          <p className="font-display text-3xl font-semibold text-ink">{summary?.entryCount ?? "…"}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-5 shadow-soft">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Active projects</p>
          <p className="font-display text-3xl font-semibold text-ink">{summary?.byProject.length ?? "…"}</p>
        </div>
      </div>

      {summary && summary.byContractor.length > 0 && (
        <div className="mb-6 overflow-hidden rounded-xl border border-line bg-surface shadow-soft">
          <div className="border-b border-line px-4 py-2.5 text-sm font-medium text-ink">Hours by team member</div>
          <div className="divide-y divide-line">
            {summary.byContractor.map((c) => (
              <div key={c.userId} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-ink">{c.userName}</span>
                <span className="text-ink-muted">{formatHours(c.hours)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <ShortcutCard to="/admin/team" title="Manage Team" description="Add or edit team members" />
        <ShortcutCard to="/admin/projects" title="Manage Projects" description="Clients, projects & tasks" />
        <ShortcutCard to="/reports" title="View Reports" description="Filter and export CSV" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  return user?.role === "ADMIN" ? <AdminDashboard /> : <TeamMemberDashboard />;
}
