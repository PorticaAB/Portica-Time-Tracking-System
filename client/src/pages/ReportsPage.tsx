import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useAuth } from "../contexts/AuthContext";
import { api, getErrorMessage } from "../lib/api";
import { nowInStockholm } from "../lib/time";
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

  const chartData = (summary?.byProject ?? []).map((p) => ({ name: p.projectName, hours: Math.round(p.hours * 100) / 100 }));

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Reports</h1>
        <button onClick={handleExport} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          Export CSV
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        {isAdmin && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Contractor</label>
            <select value={userId} onChange={(e) => setUserId(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              <option value="">All contractors</option>
              {contractors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Client</label>
          <select
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              setProjectId("");
            }}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
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
          <label className="mb-1 block text-xs font-medium text-slate-500">Project</label>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">All projects</option>
            {filteredProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {summary && (
        <>
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase text-slate-400">Total hours</p>
              <p className="text-2xl font-semibold text-slate-900">{summary.totalHours.toFixed(1)}h</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase text-slate-400">Entries</p>
              <p className="text-2xl font-semibold text-slate-900">{summary.entryCount}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase text-slate-400">Projects</p>
              <p className="text-2xl font-semibold text-slate-900">{summary.byProject.length}</p>
            </div>
          </div>

          <div className="mb-6 h-72 rounded-lg border border-slate-200 bg-white p-4">
            <p className="mb-2 text-sm font-semibold text-slate-700">Hours by project</p>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="hours" fill="#3568f5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Client</th>
                  <th className="px-4 py-2">Project</th>
                  <th className="px-4 py-2 text-right">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.byProject.map((p) => (
                  <tr key={p.projectId}>
                    <td className="px-4 py-2 text-slate-500">{p.clientName}</td>
                    <td className="px-4 py-2 font-medium text-slate-800">{p.projectName}</td>
                    <td className="px-4 py-2 text-right">{p.hours.toFixed(2)}</td>
                  </tr>
                ))}
                {summary.byProject.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
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
