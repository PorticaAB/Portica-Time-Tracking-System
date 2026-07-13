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

  return (
    <div className="mx-auto max-w-2xl overflow-y-auto p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Swedish public holidays</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setYear((y) => y - 1)} className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100">
            ‹
          </button>
          <span className="w-14 text-center font-medium">{year}</span>
          <button onClick={() => setYear((y) => y + 1)} className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100">
            ›
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="ml-3 rounded-md border border-brand-300 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50"
          >
            {syncing ? "Syncing…" : `Sync ${year}`}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onCreate)} className="mb-6 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Date</label>
          <input type="date" {...register("date", { required: true })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Name</label>
          <input {...register("name", { required: true })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <button disabled={isSubmitting} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
          Add / update
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {holidays.map((h) => (
              <tr key={h.id}>
                <td className="px-4 py-2 text-slate-600">{h.date.slice(0, 10)}</td>
                <td className="px-4 py-2 font-medium text-slate-800">{h.name}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => handleDelete(h.id)} className="text-slate-400 hover:text-red-600">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {holidays.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
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
