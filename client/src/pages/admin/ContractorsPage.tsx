import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { api, getErrorMessage } from "../../lib/api";
import type { User } from "../../types";

interface CreateForm {
  name: string;
  email: string;
  password: string;
}

export default function ContractorsPage() {
  const [contractors, setContractors] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<CreateForm>();

  async function load() {
    const res = await api.get<User[]>("/contractors");
    setContractors(res.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(data: CreateForm) {
    setError(null);
    try {
      await api.post("/contractors", data);
      reset();
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function toggleActive(user: User) {
    await api.patch(`/contractors/${user.id}`, { isActive: !user.isActive });
    load();
  }

  async function resetPassword(user: User) {
    const password = window.prompt(`New password for ${user.name} (min 8 characters):`);
    if (!password) return;
    try {
      await api.patch(`/contractors/${user.id}`, { password });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="mx-auto max-w-3xl overflow-y-auto p-8">
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Contractors</h1>

      <form onSubmit={handleSubmit(onCreate)} className="mb-8 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Name</label>
          <input {...register("name", { required: true })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Email</label>
          <input type="email" {...register("email", { required: true })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Initial password</label>
          <input type="password" {...register("password", { required: true, minLength: 8 })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <button disabled={isSubmitting} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
          Add contractor
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contractors.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2 font-medium text-slate-800">{c.name}</td>
                <td className="px-4 py-2 text-slate-500">{c.email}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                    {c.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => resetPassword(c)} className="mr-3 text-brand-600 hover:underline">
                    Reset password
                  </button>
                  <button onClick={() => toggleActive(c)} className="text-slate-500 hover:underline">
                    {c.isActive ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
            {contractors.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  No contractors yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
