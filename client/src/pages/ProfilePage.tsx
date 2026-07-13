import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../contexts/AuthContext";
import { api, getErrorMessage } from "../lib/api";

interface ProfileForm {
  name: string;
  phone: string;
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
  } = useForm<ProfileForm>({ defaultValues: { name: user?.name ?? "", phone: user?.phone ?? "", password: "" } });

  async function onSubmit(data: ProfileForm) {
    setMessage(null);
    setError(null);
    try {
      const payload: Partial<ProfileForm> = { name: data.name, phone: data.phone || undefined };
      if (data.password) payload.password = data.password;
      await api.patch("/auth/me", payload);
      await refreshUser();
      setMessage("Profile updated.");
      reset({ name: data.name, phone: data.phone, password: "" });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const fieldClass =
    "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="mb-6 font-display text-2xl font-semibold tracking-tight text-ink">Your profile</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl border border-line bg-surface p-6 shadow-soft">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Email</label>
          <input value={user?.email ?? ""} disabled className="w-full rounded-lg border border-line bg-line-soft/50 px-3 py-2 text-sm text-ink-faint" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Name</label>
          <input {...register("name", { required: true })} className={fieldClass} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Phone</label>
          <input type="tel" {...register("phone")} className={fieldClass} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">New password</label>
          <input type="password" placeholder="Leave blank to keep current password" {...register("password", { minLength: 8 })} className={fieldClass} />
        </div>
        {message && <p className="text-sm text-brand-700">{message}</p>}
        {error && <p className="text-sm text-danger-600">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-soft transition-all duration-150 hover:bg-brand-700 hover:shadow-soft-md active:scale-[0.98] disabled:opacity-50"
        >
          Save changes
        </button>
      </form>
    </div>
  );
}
