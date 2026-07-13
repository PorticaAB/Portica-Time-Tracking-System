import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { api, getErrorMessage } from "../../lib/api";
import type { ClientRecord, Project, User } from "../../types";
import clsx from "../../lib/clsx";

interface ClientForm {
  name: string;
}

interface ProjectForm {
  name: string;
  billableRate: string;
}

interface TaskForm {
  name: string;
}

export default function ClientsProjectsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [contractors, setContractors] = useState<User[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [expandedProjectId, setExpandedProjectId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const clientForm = useForm<ClientForm>();
  const projectForm = useForm<ProjectForm>();
  const taskForm = useForm<TaskForm>();

  async function loadAll() {
    const [clientsRes, projectsRes, contractorsRes] = await Promise.all([
      api.get<ClientRecord[]>("/clients"),
      api.get<Project[]>("/projects"),
      api.get<User[]>("/contractors"),
    ]);
    setClients(clientsRes.data);
    setProjects(projectsRes.data);
    setContractors(contractorsRes.data);
    if (!selectedClientId && clientsRes.data.length > 0) setSelectedClientId(clientsRes.data[0].id);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const projectsForSelectedClient = useMemo(
    () => projects.filter((p) => p.clientId === selectedClientId),
    [projects, selectedClientId]
  );

  async function handleCreateClient(data: ClientForm) {
    setError(null);
    try {
      const res = await api.post<ClientRecord>("/clients", data);
      clientForm.reset();
      await loadAll();
      setSelectedClientId(res.data.id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function toggleClientActive(client: ClientRecord) {
    await api.patch(`/clients/${client.id}`, { isActive: !client.isActive });
    loadAll();
  }

  async function handleCreateProject(data: ProjectForm) {
    setError(null);
    try {
      await api.post("/projects", {
        name: data.name,
        clientId: selectedClientId,
        billableRate: data.billableRate ? Number(data.billableRate) : null,
      });
      projectForm.reset();
      loadAll();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function toggleProjectActive(project: Project) {
    await api.patch(`/projects/${project.id}`, { isActive: !project.isActive });
    loadAll();
  }

  async function updateBillableRate(project: Project, value: string) {
    await api.patch(`/projects/${project.id}`, { billableRate: value ? Number(value) : null });
    loadAll();
  }

  async function toggleAssignment(project: Project, userId: string) {
    const current = new Set((project.assignments ?? []).map((a) => a.userId));
    if (current.has(userId)) current.delete(userId);
    else current.add(userId);
    await api.put(`/projects/${project.id}/assignments`, { userIds: [...current] });
    loadAll();
  }

  async function handleCreateTask(project: Project, data: TaskForm) {
    setError(null);
    try {
      await api.post(`/projects/${project.id}/tasks`, data);
      taskForm.reset();
      loadAll();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function removeTask(taskId: string) {
    await api.delete(`/projects/tasks/${taskId}`);
    loadAll();
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-64 flex-none overflow-y-auto border-r border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Clients</h2>
        <form onSubmit={clientForm.handleSubmit(handleCreateClient)} className="mb-3 flex gap-1">
          <input
            placeholder="New client name"
            {...clientForm.register("name", { required: true })}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
          <button className="rounded-md bg-brand-600 px-2 text-sm text-white hover:bg-brand-700">+</button>
        </form>
        <ul className="space-y-1">
          {clients.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setSelectedClientId(c.id)}
                className={clsx(
                  "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm",
                  selectedClientId === c.id ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <span className={!c.isActive ? "opacity-50" : ""}>{c.name}</span>
                {!c.isActive && <span className="text-xs text-slate-400">inactive</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {!selectedClientId ? (
          <p className="text-slate-400">Create a client to get started.</p>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-lg font-semibold text-slate-900">{clients.find((c) => c.id === selectedClientId)?.name}</h1>
              <button
                onClick={() => {
                  const client = clients.find((c) => c.id === selectedClientId);
                  if (client) toggleClientActive(client);
                }}
                className="text-sm text-slate-500 hover:underline"
              >
                {clients.find((c) => c.id === selectedClientId)?.isActive ? "Deactivate client" : "Activate client"}
              </button>
            </div>

            <form onSubmit={projectForm.handleSubmit(handleCreateProject)} className="mb-6 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Project name</label>
                <input {...projectForm.register("name", { required: true })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Billable rate (SEK/hr, optional)</label>
                <input type="number" step="0.01" {...projectForm.register("billableRate")} className="w-40 rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <button className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Add project</button>
            </form>

            <div className="space-y-4">
              {projectsForSelectedClient.map((project) => (
                <div key={project.id} className="rounded-lg border border-slate-200 bg-white">
                  <button
                    onClick={() => setExpandedProjectId(expandedProjectId === project.id ? "" : project.id)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className={clsx("font-medium text-slate-800", !project.isActive && "opacity-50")}>{project.name}</span>
                      {!project.isActive && <span className="text-xs text-slate-400">inactive</span>}
                    </div>
                    <span className="text-slate-400">{expandedProjectId === project.id ? "▲" : "▼"}</span>
                  </button>

                  {expandedProjectId === project.id && (
                    <div className="border-t border-slate-100 p-4">
                      <div className="mb-4 flex items-center gap-2">
                        <label className="text-sm text-slate-600">Billable rate (SEK/hr):</label>
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={project.billableRate ?? ""}
                          onBlur={(e) => updateBillableRate(project, e.target.value)}
                          className="w-32 rounded-md border border-slate-300 px-2 py-1 text-sm"
                        />
                        <button onClick={() => toggleProjectActive(project)} className="ml-auto text-sm text-slate-500 hover:underline">
                          {project.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>

                      <div className="mb-4">
                        <h3 className="mb-2 text-sm font-semibold text-slate-700">Assigned contractors</h3>
                        <div className="flex flex-wrap gap-2">
                          {contractors.map((c) => {
                            const assigned = (project.assignments ?? []).some((a) => a.userId === c.id);
                            return (
                              <label key={c.id} className={clsx("flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm", assigned ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600")}>
                                <input type="checkbox" checked={assigned} onChange={() => toggleAssignment(project, c.id)} className="accent-brand-600" />
                                {c.name}
                              </label>
                            );
                          })}
                          {contractors.length === 0 && <p className="text-sm text-slate-400">No contractors yet.</p>}
                        </div>
                      </div>

                      <div>
                        <h3 className="mb-2 text-sm font-semibold text-slate-700">Premade tasks</h3>
                        <div className="mb-2 flex flex-wrap gap-2">
                          {project.tasks.map((t) => (
                            <span key={t.id} className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                              {t.name}
                              <button onClick={() => removeTask(t.id)} className="text-slate-400 hover:text-red-600">
                                ✕
                              </button>
                            </span>
                          ))}
                          {project.tasks.length === 0 && <p className="text-sm text-slate-400">No tasks yet.</p>}
                        </div>
                        <form onSubmit={taskForm.handleSubmit((data) => handleCreateTask(project, data))} className="flex gap-2">
                          <input placeholder="New task name" {...taskForm.register("name", { required: true })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                          <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">Add task</button>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {projectsForSelectedClient.length === 0 && <p className="text-slate-400">No projects yet for this client.</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
