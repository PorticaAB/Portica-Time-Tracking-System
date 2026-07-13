import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { useAuth } from "../contexts/AuthContext";
import { api, getErrorMessage } from "../lib/api";
import { nowInStockholm } from "../lib/time";
import { colorForProject } from "../lib/projectColor";
import type { ClientRecord, Project, ReportSummary, User } from "../types";

export default function ReportsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [contractors, setContractors] = useState<User[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [userId, setUserId] = useState("");
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [from, setFrom] = useState(nowInStockholm().startOf("month").toFormat("yyyy-MM-dd"));
  const [to, setTo] = useState(nowInStockholm().endOf("month").toFormat("yyyy-MM-dd"));

  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) api.get<User[]>("/contractors").then((res) => setContractors(res.data));
    api.get<ClientRecord[]>("/clients").then((res) => setClients(res.data));
    api.get<Project[]>("/projects").then((res) => setProjects(res.data));
  }, [isAdmin]);

  const filteredProjects = useMemo(() => (clientId ? projects.filter((p) => p.clientId === clientId) : projects), [projects, clientId]);

  const params = useMemo(() => {
    const p: Record<string, string> = {
      from: `${from}T00:00:00.000Z`,
      to: `${to}T23:59:59.999Z`,
    };
    if (isAdmin && userId) p.userId = userId;
    if (clientId) p.clientId = clientId;
    if (projectId) p.projectId = projectId;
    return p;
  }, [from, to, userId, clientId, projectId, isAdmin]);

  useEffect(() => {
    api
      .get<ReportSummary>("/reports/summary", { params })
      .then((res) => setSummary(res.data))
      .catch((err) => setError(getErrorMessage(err)));
  }, [params]);

  async function handleExport() {
    try {
      const res = await api.get("/reports/export.csv", { params, responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "time-report.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const chartData = (summary?.byProject ?? []).map((p) => ({
    name: p.projectName,
    hours: Math.round(p.hours * 100) / 100,
    color: colorForProject(p.projectId),
  }));

  const fieldClass =
    "rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

  return (
    <div className="h-full overflow-y-auto bg-canvas p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Reports</h1>
        <button
          onClick={handleExport}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-soft transition-all duration-150 hover:bg-brand-700 hover:shadow-soft-md active:scale-[0.98]"
        >
          Export CSV
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-4 shadow-soft">
        {isAdmin && (
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Team Member</label>
            <select value={userId} onChange={(e) => setUserId(e.target.value)} className={fieldClass}>
              <option value="">All team members</option>
              {contractors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Client</label>
          <select
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              setProjectId("");
            }}
            className={fieldClass}
          >
            <option value="">All clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Project</label>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={fieldClass}>
            <option value="">All projects</option>
            {filteredProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={fieldClass} />
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-danger-600">{error}</p>}

      {summary && (
        <>
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-line bg-surface p-4 shadow-soft">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Total hours</p>
              <p className="font-display text-3xl font-semibold text-ink">{summary.totalHours.toFixed(1)}h</p>
            </div>
            <div className="rounded-xl border border-line bg-surface p-4 shadow-soft">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Entries</p>
              <p className="font-display text-3xl font-semibold text-ink">{summary.entryCount}</p>
            </div>
            <div className="rounded-xl border border-line bg-surface p-4 shadow-soft">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Projects</p>
              <p className="font-display text-3xl font-semibold text-ink">{summary.byProject.length}</p>
            </div>
          </div>

          <div className="mb-6 h-72 rounded-xl border border-line bg-surface p-4 shadow-soft">
            <p className="mb-2 text-sm font-semibold text-ink">Hours by project</p>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 6" stroke="#E7E2D8" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6F6B62" }} axisLine={{ stroke: "#E7E2D8" }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#6F6B62" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "#EFEBE2" }}
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid #E7E2D8",
                    boxShadow: "0 4px 8px rgba(33,31,27,0.06), 0 16px 36px rgba(33,31,27,0.11)",
                    fontSize: 13,
                    fontFamily: "Inter, sans-serif",
                  }}
                  labelStyle={{ color: "#211F1B", fontWeight: 600 }}
                />
                <Bar dataKey="hours" radius={[6, 6, 0, 0]} maxBarSize={56}>
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-soft">
            <table className="w-full text-sm">
              <thead className="bg-line-soft/60 text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-4 py-2.5">Client</th>
                  <th className="px-4 py-2.5">Project</th>
                  <th className="px-4 py-2.5 text-right">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {summary.byProject.map((p) => (
                  <tr key={p.projectId} className="transition-colors duration-150 hover:bg-line-soft/40">
                    <td className="px-4 py-2.5 text-ink-muted">{p.clientName}</td>
                    <td className="px-4 py-2.5 font-medium text-ink">{p.projectName}</td>
                    <td className="px-4 py-2.5 text-right text-ink">{p.hours.toFixed(2)}</td>
                  </tr>
                ))}
                {summary.byProject.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-ink-faint">
                      No time entries in this range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
