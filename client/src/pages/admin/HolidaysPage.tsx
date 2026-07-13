import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { api, getErrorMessage } from "../../lib/api";
import type { Holiday } from "../../types";

interface HolidayForm {
  date: string;
  name: string;
}

export default function HolidaysPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<HolidayForm>();

  async function load() {
    const res = await api.get<Holiday[]>("/holidays", { params: { year } });
    setHolidays(res.data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  async function onCreate(data: HolidayForm) {
    setError(null);
    try {
      await api.post("/holidays", data);
      reset();
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleSync() {
    setSyncing(true);
    setError(null);
    try {
      await api.post("/holidays/sync", { year });
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSyncing(false);
    }
  }

  async function handleDelete(id: string) {
    await api.delete(`/holidays/${id}`);
    load();
  }

  const fieldClass =
    "rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

  return (
    <div className="mx-auto max-w-2xl overflow-y-auto p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Swedish public holidays</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setYear((y) => y - 1)} className="rounded-lg px-2 py-1 text-ink-muted transition-colors duration-150 hover:bg-line-soft hover:text-ink">
            ‹
          </button>
          <span className="w-14 text-center font-medium text-ink">{year}</span>
          <button onClick={() => setYear((y) => y + 1)} className="rounded-lg px-2 py-1 text-ink-muted transition-colors duration-150 hover:bg-line-soft hover:text-ink">
            ›
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="ml-3 rounded-lg border border-brand-200 px-3 py-1.5 text-sm font-medium text-brand-700 transition-all duration-150 hover:bg-brand-50 active:scale-[0.98] disabled:opacity-50"
          >
            {syncing ? "Syncing…" : `Sync ${year}`}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onCreate)} className="mb-6 flex flex-wrap items-end gap-2 rounded-xl border border-line bg-surface p-4 shadow-soft">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Date</label>
          <input type="date" {...register("date", { required: true })} className={fieldClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Name</label>
          <input {...register("name", { required: true })} className={fieldClass} />
        </div>
        <button
          disabled={isSubmitting}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-soft transition-all duration-150 hover:bg-brand-700 hover:shadow-soft-md active:scale-[0.98] disabled:opacity-50"
        >
          Add / update
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-danger-600">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-line-soft/60 text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {holidays.map((h) => (
              <tr key={h.id} className="transition-colors duration-150 hover:bg-line-soft/30">
                <td className="px-4 py-2.5 text-ink-muted">{h.date.slice(0, 10)}</td>
                <td className="px-4 py-2.5 font-medium text-ink">{h.name}</td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => handleDelete(h.id)} className="text-ink-faint transition-colors duration-150 hover:text-danger-600">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {holidays.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-ink-faint">
                  No holidays for {year} yet. Use "Sync {year}" to populate automatically.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
