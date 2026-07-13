import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, getErrorMessage } from "../lib/api";

interface FormValues {
  password: string;
  confirmPassword: string;
}

type Status = "checking" | "invalid" | "valid" | "done";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<FormValues>();

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    api
      .get<{ valid: boolean }>("/auth/reset-password/validate", { params: { token } })
      .then((res) => setStatus(res.data.valid ? "valid" : "invalid"))
      .catch(() => setStatus("invalid"));
  }, [token]);

  async function onSubmit(data: FormValues) {
    setError(null);
    try {
      await api.post("/auth/reset-password", { token, password: data.password });
      setStatus("done");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-9 shadow-soft-lg">
        <h1 className="mb-1 font-display text-2xl font-semibold tracking-tight text-ink">Reset password</h1>

        {status === "checking" && <p className="text-sm text-ink-muted">Checking your link…</p>}

        {status === "invalid" && (
          <>
            <p className="mb-6 text-sm text-ink-muted">This link is invalid or has expired.</p>
            <Link to="/forgot-password" className="text-sm font-medium text-brand-600 hover:underline">
              Request a new link
            </Link>
          </>
        )}

        {status === "done" && <p className="text-sm text-ink">Password updated. Redirecting you to sign in…</p>}

        {status === "valid" && (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">New password</label>
              <input
                type="password"
                {...register("password", { required: true, minLength: 8 })}
                className="w-full rounded-lg border border-line bg-canvas/40 px-3 py-2 text-sm text-ink transition-colors duration-150 focus:border-brand-500 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Confirm password</label>
              <input
                type="password"
                {...register("confirmPassword", { required: true, validate: (v) => v === watch("password") || "Passwords don't match" })}
                className="w-full rounded-lg border border-line bg-canvas/40 px-3 py-2 text-sm text-ink transition-colors duration-150 focus:border-brand-500 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            {error && <p className="text-sm text-danger-600">{error}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-soft transition-all duration-150 hover:bg-brand-700 hover:shadow-soft-md active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? "Saving…" : "Set new password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
