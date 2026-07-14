import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { api, getErrorMessage } from "../../lib/api";
import type { ClientRecord, Project, User } from "../../types";
import clsx from "../../lib/clsx";
import ConfirmDeleteDialog from "../../components/ConfirmDeleteDialog";

function entryCountText(count: number): string {
  return count === 1 ? "1 time entry" : `${count} time entries`;
}

interface ClientForm {
  name: string;
}

interface ProjectForm {
  name: string;
  clientId: string;
  billableRate: string;
}

interface TaskForm {
  name: string;
}

// Clients and Projects are lightweight tags attached to time entries - this
// page is intentionally flat, with no per-project team assignment. Only
// Tasks (within a project) can be scoped to specific people.
export default function ProjectsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [team, setTeam] = useState<User[]>([]);
  const [clientFilter, setClientFilter] = useState<string>("");
  const [expandedProjectId, setExpandedProjectId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    { kind: "client"; client: ClientRecord } | { kind: "project"; project: Project } | null
  >(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const clientForm = useForm<ClientForm>();
  const projectForm = useForm<ProjectForm>();
  const taskForm = useForm<TaskForm>();

  async function loadAll() {
    const [clientsRes, projectsRes, teamRes] = await Promise.all([
      api.get<ClientRecord[]>("/clients"),
      api.get<Project[]>("/projects"),
      api.get<User[]>("/contractors"),
    ]);
    setClients(clientsRes.data);
    setProjects(projectsRes.data);
    setTeam(teamRes.data);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const visibleProjects = useMemo(
    () => (clientFilter ? projects.filter((p) => p.clientId === clientFilter) : projects),
    [projects, clientFilter]
  );

  async function handleCreateClient(data: ClientForm) {
    setError(null);
    try {
      await api.post("/clients", data);
      clientForm.reset();
      loadAll();
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
        clientId: data.clientId,
        billableRate: data.billableRate ? Number(data.billableRate) : null,
      });
      projectForm.reset({ name: "", clientId: data.clientId, billableRate: "" });
      loadAll();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function toggleProjectActive(project: Project) {
    await api.patch(`/projects/${project.id}`, { isActive: !project.isActive });
    loadAll();
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setError(null);
    setDeleteBusy(true);
    try {
      if (deleteTarget.kind === "client") {
        await api.delete(`/clients/${deleteTarget.client.id}`);
      } else {
        await api.delete(`/projects/${deleteTarget.project.id}`);
      }
      setDeleteTarget(null);
      loadAll();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleteBusy(false);
    }
  }

  async function updateBillableRate(project: Project, value: string) {
    await api.patch(`/projects/${project.id}`, { billableRate: value ? Number(value) : null });
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

  async function toggleTaskAssignment(taskId: string, currentUserIds: string[], userId: string) {
    const set = new Set(currentUserIds);
    if (set.has(userId)) set.delete(userId);
    else set.add(userId);
    await api.put(`/projects/tasks/${taskId}/assignments`, { userIds: [...set] });
    loadAll();
  }

  const fieldClass =
    "rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

  return (
    <div className="mx-auto max-w-4xl overflow-y-auto p-8">
      <h1 className="mb-1 font-display text-2xl font-semibold tracking-tight text-ink">Projects</h1>
      <p className="mb-6 text-sm text-ink-muted">
        Clients and projects are simple tags attached to time entries. Tasks live inside a project and can be assigned to specific people.
      </p>

      {error && <p className="mb-4 text-sm text-danger-600">{error}</p>}

      {/* Clients: flat tag list */}
      <div className="mb-6 rounded-xl border border-line bg-surface p-5 shadow-soft">
        <p className="mb-3 text-sm font-medium text-ink">Clients</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {clients.map((c) => (
            <span
              key={c.id}
              className={clsx(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm",
                c.isActive ? "border-line bg-line-soft/50 text-ink" : "border-line text-ink-faint opacity-60"
              )}
            >
              {c.name}
              <button onClick={() => toggleClientActive(c)} className="text-ink-faint hover:text-ink" title={c.isActive ? "Archive" : "Restore"}>
                {c.isActive ? "✕" : "↺"}
              </button>
              <button
                onClick={() => setDeleteTarget({ kind: "client", client: c })}
                className="text-xs font-medium text-danger-500 hover:text-danger-700"
                title="Delete permanently"
              >
                Delete
              </button>
            </span>
          ))}
          {clients.length === 0 && <p className="text-sm text-ink-faint">No clients yet.</p>}
        </div>
        <form onSubmit={clientForm.handleSubmit(handleCreateClient)} className="flex gap-2">
          <input placeholder="New client name" {...clientForm.register("name", { required: true })} className={fieldClass} />
          <button className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-muted transition-all duration-150 hover:bg-line-soft active:scale-[0.98]">
            Add client
          </button>
        </form>
      </div>

      {/* Projects: flat list with expandable tasks */}
      <div className="rounded-xl border border-line bg-surface p-5 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-ink">Projects</p>
          <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className={fieldClass}>
            <option value="">All clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={projectForm.handleSubmit(handleCreateProject)} className="mb-4 flex flex-wrap items-end gap-2 rounded-lg bg-canvas/60 p-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Project name</label>
            <input {...projectForm.register("name", { required: true })} className={fieldClass} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Client</label>
            <select {...projectForm.register("clientId", { required: true })} className={fieldClass}>
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Rate (SEK/hr, optional)</label>
            <input type="number" step="0.01" {...projectForm.register("billableRate")} className={clsx(fieldClass, "w-32")} />
          </div>
          <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-soft transition-all duration-150 hover:bg-brand-700 hover:shadow-soft-md active:scale-[0.98]">
            Add project
          </button>
        </form>

        <div className="space-y-2">
          {visibleProjects.map((project) => {
            const expanded = expandedProjectId === project.id;
            return (
              <div key={project.id} className="rounded-lg border border-line">
                <button
                  onClick={() => setExpandedProjectId(expanded ? "" : project.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors duration-150 hover:bg-line-soft/30"
                >
                  <div className="flex items-center gap-2">
                    <span className={clsx("font-medium text-ink", !project.isActive && "text-ink-faint opacity-60")}>{project.name}</span>
                    <span className="text-xs text-ink-faint">· {project.client.name}</span>
                    {!project.isActive && <span className="rounded-full bg-line-soft px-1.5 py-0.5 text-[10px] text-ink-faint">archived</span>}
                  </div>
                  <span className="text-ink-faint">{expanded ? "▲" : "▼"}</span>
                </button>

                {expanded && (
                  <div className="border-t border-line p-4">
                    <div className="mb-4 flex items-center gap-2">
                      <label className="text-sm text-ink-muted">Rate (SEK/hr):</label>
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={project.billableRate ?? ""}
                        onBlur={(e) => updateBillableRate(project, e.target.value)}
                        className={clsx(fieldClass, "w-28")}
                      />
                      <div className="ml-auto flex items-center gap-3">
                        <button
                          onClick={() => toggleProjectActive(project)}
                          className="text-sm text-ink-muted transition-colors duration-150 hover:text-ink"
                        >
                          {project.isActive ? "Archive project" : "Restore project"}
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ kind: "project", project })}
                          className="rounded-lg border border-danger-200 px-2 py-1 text-sm font-medium text-danger-600 transition-all duration-150 hover:bg-danger-50 active:scale-[0.98]"
                        >
                          Delete project
                        </button>
                      </div>
                    </div>

                    <p className="mb-2 text-sm font-semibold text-ink">Tasks</p>
                    <div className="mb-3 space-y-2">
                      {project.tasks.map((task) => {
                        const assignedIds = (task.assignments ?? []).map((a) => a.userId);
                        return (
                          <div key={task.id} className="rounded-lg bg-canvas/60 p-3">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-sm font-medium text-ink">{task.name}</span>
                              <button onClick={() => removeTask(task.id)} className="text-xs text-ink-faint hover:text-danger-600">
                                Remove
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {team.map((member) => {
                                const assigned = assignedIds.includes(member.id);
                                return (
                                  <button
                                    key={member.id}
                                    onClick={() => toggleTaskAssignment(task.id, assignedIds, member.id)}
                                    className={clsx(
                                      "rounded-full border px-2.5 py-1 text-xs transition-colors duration-150",
                                      assigned ? "border-brand-300 bg-brand-50 text-brand-700" : "border-line text-ink-muted hover:bg-line-soft"
                                    )}
                                  >
                                    {member.name}
                                  </button>
                                );
                              })}
                              {team.length === 0 && <span className="text-xs text-ink-faint">No team members yet.</span>}
                            </div>
                            {assignedIds.length === 0 && (
                              <p className="mt-1.5 text-xs text-ink-faint">Open to everyone (no one assigned yet).</p>
                            )}
                          </div>
                        );
                      })}
                      {project.tasks.length === 0 && <p className="text-sm text-ink-faint">No tasks yet.</p>}
                    </div>
                    <form onSubmit={taskForm.handleSubmit((data) => handleCreateTask(project, data))} className="flex gap-2">
                      <input placeholder="New task name" {...taskForm.register("name", { required: true })} className={fieldClass} />
                      <button className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-muted transition-all duration-150 hover:bg-line-soft active:scale-[0.98]">
                        Add task
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
          {visibleProjects.length === 0 && <p className="text-sm text-ink-faint">No projects yet.</p>}
        </div>
      </div>

      {deleteTarget?.kind === "client" && (
        <ConfirmDeleteDialog
          title={`Delete "${deleteTarget.client.name}"?`}
          description={
            deleteTarget.client._count?.projects
              ? `This permanently deletes "${deleteTarget.client.name}" and its ${deleteTarget.client._count.projects} project(s). Any time entries logged against them will be moved to an "Unassigned" bucket so historical reports stay accurate. This cannot be undone.`
              : `This permanently deletes "${deleteTarget.client.name}". This cannot be undone.`
          }
          busy={deleteBusy}
          error={error}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {deleteTarget?.kind === "project" && (
        <ConfirmDeleteDialog
          title={`Delete "${deleteTarget.project.name}"?`}
          description={
            deleteTarget.project._count?.timeEntries
              ? `This permanently deletes "${deleteTarget.project.name}". ${entryCountText(deleteTarget.project._count.timeEntries)} logged against it will be moved to an "Unassigned" bucket so historical reports stay accurate. This cannot be undone.`
              : `This permanently deletes "${deleteTarget.project.name}". This cannot be undone.`
          }
          busy={deleteBusy}
          error={error}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
