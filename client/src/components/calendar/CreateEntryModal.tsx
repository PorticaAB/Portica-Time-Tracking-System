import { useForm } from "react-hook-form";
import { DateTime } from "luxon";
import type { Project } from "../../types";

interface CreateEntryModalProps {
  day: DateTime;
  defaultStart: DateTime;
  defaultEnd: DateTime;
  projects: Project[];
  onClose: () => void;
  onCreate: (data: { projectId: string; taskId?: string; description: string; startTime: string; endTime: string }) => void;
}

interface FormValues {
  projectId: string;
  taskId: string;
  description: string;
  startTime: string;
  endTime: string;
}

export default function CreateEntryModal({ day, defaultStart, defaultEnd, projects, onClose, onCreate }: CreateEntryModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      projectId: projects[0]?.id ?? "",
      taskId: "",
      description: "",
      startTime: defaultStart.toFormat("HH:mm"),
      endTime: defaultEnd.toFormat("HH:mm"),
    },
  });

  const projectId = watch("projectId");
  const project = projects.find((p) => p.id === projectId);

  function toIso(time: string): string {
    const [h, m] = time.split(":").map(Number);
    return day.startOf("day").set({ hour: h, minute: m }).toUTC().toISO()!;
  }

  function onSubmit(values: FormValues) {
    const startTime = toIso(values.startTime);
    const endTime = toIso(values.endTime);
    onCreate({
      projectId: values.projectId,
      taskId: values.taskId || undefined,
      description: values.description,
      startTime,
      endTime,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 backdrop-blur-[2px]" onClick={onClose}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        onClick={(e) => e.stopPropagation()}
        className="w-80 rounded-xl border border-line bg-surface p-5 shadow-soft-lg"
      >
        <h3 className="mb-1 font-display text-base font-semibold text-ink">New time entry</h3>
        <p className="mb-3 text-xs text-ink-muted">{day.toFormat("ccc d LLL yyyy")}</p>

        {projects.length === 0 ? (
          <p className="mb-3 text-sm text-danger-600">You have no assigned projects yet. Ask your admin to assign one.</p>
        ) : (
          <>
            <select
              {...register("projectId", { required: true })}
              className="mb-2 w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.client.name} · {p.name}
                </option>
              ))}
            </select>

            {project && project.tasks.length > 0 && (
              <select
                {...register("taskId")}
                className="mb-2 w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">No task</option>
                {project.tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}

            <textarea
              {...register("description")}
              placeholder="Description"
              rows={2}
              className="mb-2 w-full resize-none rounded-lg border border-line bg-canvas/40 px-2 py-1.5 text-sm text-ink focus:border-brand-500 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />

            <div className="mb-3 flex items-center gap-2">
              <input
                type="time"
                {...register("startTime", { required: true })}
                className="w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <span className="text-ink-faint">–</span>
              <input
                type="time"
                {...register("endTime", { required: true })}
                className="w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            {(errors.startTime || errors.endTime) && <p className="mb-2 text-xs text-danger-600">Start and end time are required.</p>}
          </>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-muted transition-all duration-150 hover:bg-line-soft active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={projects.length === 0}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white shadow-soft transition-all duration-150 hover:bg-brand-700 hover:shadow-soft-md active:scale-[0.98] disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
