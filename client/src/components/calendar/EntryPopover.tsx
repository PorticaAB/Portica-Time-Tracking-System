import { useEffect, useRef, useState } from "react";
import { DateTime } from "luxon";
import { SWEDEN_ZONE } from "../../lib/time";
import type { Project, TimeEntry } from "../../types";

export interface EntryPatch {
  projectId?: string;
  taskId?: string | null;
  description?: string;
  startTime?: string;
  endTime?: string;
}

interface EntryPopoverProps {
  entry: TimeEntry;
  projects: Project[];
  position: { x: number; y: number };
  editable: boolean;
  onClose: () => void;
  onSave: (patch: EntryPatch) => void;
  onDelete: () => void;
}

export default function EntryPopover({ entry, projects, position, editable, onClose, onSave, onDelete }: EntryPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [description, setDescription] = useState(entry.description);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const start = DateTime.fromISO(entry.startTime).setZone(SWEDEN_ZONE);
  const end = entry.endTime ? DateTime.fromISO(entry.endTime).setZone(SWEDEN_ZONE) : DateTime.now().setZone(SWEDEN_ZONE);
  const project = projects.find((p) => p.id === entry.projectId);

  const style: React.CSSProperties = {
    position: "fixed",
    left: Math.min(position.x, window.innerWidth - 300),
    top: Math.min(position.y, window.innerHeight - 320),
    zIndex: 50,
  };

  function handleTimeChange(field: "start" | "end", value: string) {
    const [h, m] = value.split(":").map(Number);
    const base = field === "start" ? start : end;
    const updated = base.set({ hour: h, minute: m, second: 0, millisecond: 0 });
    if (field === "start") {
      onSave({ startTime: updated.toUTC().toISO()! });
    } else {
      onSave({ endTime: updated.toUTC().toISO()! });
    }
  }

  return (
    <div ref={ref} style={style} className="w-72 rounded-lg border border-slate-200 bg-white p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase text-slate-400">
          {start.toFormat("ccc d LLL")}
        </span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          ✕
        </button>
      </div>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={() => description !== entry.description && onSave({ description })}
        disabled={!editable}
        placeholder="Description"
        rows={2}
        className="mb-2 w-full resize-none rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-50"
      />

      <select
        value={entry.projectId}
        onChange={(e) => onSave({ projectId: e.target.value, taskId: null })}
        disabled={!editable}
        className="mb-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-50"
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.client.name} · {p.name}
          </option>
        ))}
      </select>

      {project && project.tasks.length > 0 && (
        <select
          value={entry.taskId ?? ""}
          onChange={(e) => onSave({ taskId: e.target.value || null })}
          disabled={!editable}
          className="mb-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-50"
        >
          <option value="">No task</option>
          {project.tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      )}

      <div className="mb-3 flex items-center gap-2">
        <input
          type="time"
          defaultValue={start.toFormat("HH:mm")}
          onChange={(e) => handleTimeChange("start", e.target.value)}
          disabled={!editable}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-50"
        />
        <span className="text-slate-400">–</span>
        <input
          type="time"
          defaultValue={entry.endTime ? end.toFormat("HH:mm") : ""}
          onChange={(e) => handleTimeChange("end", e.target.value)}
          disabled={!editable || !entry.endTime}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-50"
        />
      </div>

      {editable && (
        <button
          onClick={onDelete}
          className="w-full rounded-md border border-red-200 px-2 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Delete entry
        </button>
      )}
    </div>
  );
}
