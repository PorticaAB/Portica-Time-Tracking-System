import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getErrorMessage } from "../lib/api";

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginForm>();

  if (user) {
    const redirectTo = (location.state as { from?: string } | null)?.from ?? "/";
    return <Navigate to={redirectTo} replace />;
  }

  async function onSubmit(data: LoginForm) {
    setError(null);
    try {
      await login(data.email, data.password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-9 shadow-soft-lg">
        <h1 className="mb-1 font-display text-3xl font-semibold tracking-tight text-ink">Klocka</h1>
        <p className="mb-7 text-sm text-ink-muted">Sign in to log your hours</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Email</label>
            <input
              type="email"
              {...register("email", { required: true })}
              className="w-full rounded-lg border border-line bg-canvas/40 px-3 py-2 text-sm text-ink transition-colors duration-150 focus:border-brand-500 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Password</label>
            <input
              type="password"
              {...register("password", { required: true })}
              className="w-full rounded-lg border border-line bg-canvas/40 px-3 py-2 text-sm text-ink transition-colors duration-150 focus:border-brand-500 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          {error && <p className="text-sm text-danger-600">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-soft transition-all duration-150 hover:bg-brand-700 hover:shadow-soft-md active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-7 text-center text-xs tracking-wide text-ink-faint">Klocka by Catarina Bertling</p>
      </div>
    </div>
  );
}
