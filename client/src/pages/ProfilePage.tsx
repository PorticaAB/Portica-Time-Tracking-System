import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../contexts/AuthContext";
import { api, getErrorMessage } from "../lib/api";

interface ProfileForm {
  name: string;
  password: string;
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ProfileForm>({ defaultValues: { name: user?.name ?? "", password: "" } });

  async function onSubmit(data: ProfileForm) {
    setMessage(null);
    setError(null);
    try {
      const payload: Partial<ProfileForm> = { name: data.name };
      if (data.password) payload.password = data.password;
      await api.patch("/auth/me", payload);
      await refreshUser();
      setMessage("Profile updated.");
      reset({ name: data.name, password: "" });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Your profile</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input value={user?.email ?? ""} disabled className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
          <input {...register("name", { required: true })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">New password</label>
          <input type="password" placeholder="Leave blank to keep current password" {...register("password", { minLength: 8 })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
        </div>
        {message && <p className="text-sm text-green-600">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={isSubmitting} className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
          Save changes
        </button>
      </form>
    </div>
  );
}
