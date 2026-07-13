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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        onClick={(e) => e.stopPropagation()}
        className="w-80 rounded-lg border border-slate-200 bg-white p-4 shadow-xl"
      >
        <h3 className="mb-1 text-sm font-semibold text-slate-800">New time entry</h3>
        <p className="mb-3 text-xs text-slate-500">{day.toFormat("ccc d LLL yyyy")}</p>

        {projects.length === 0 ? (
          <p className="mb-3 text-sm text-red-600">You have no assigned projects yet. Ask your admin to assign one.</p>
        ) : (
          <>
            <select {...register("projectId", { required: true })} className="mb-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.client.name} · {p.name}
                </option>
              ))}
            </select>

            {project && project.tasks.length > 0 && (
              <select {...register("taskId")} className="mb-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
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
              className="mb-2 w-full resize-none rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />

            <div className="mb-3 flex items-center gap-2">
              <input type="time" {...register("startTime", { required: true })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
              <span className="text-slate-400">–</span>
              <input type="time" {...register("endTime", { required: true })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
            </div>
            {(errors.startTime || errors.endTime) && <p className="mb-2 text-xs text-red-600">Start and end time are required.</p>}
          </>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={projects.length === 0}
            className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
