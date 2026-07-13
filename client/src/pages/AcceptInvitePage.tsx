import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, getErrorMessage } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import type { User } from "../types";

interface FormValues {
  password: string;
  confirmPassword: string;
}

type Status = "checking" | "invalid" | "valid";

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const { applySession } = useAuth();
  const [status, setStatus] = useState<Status>("checking");
  const [invitee, setInvitee] = useState<{ name: string; email: string } | null>(null);
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
      .get<{ valid: boolean; name?: string; email?: string }>("/auth/accept-invite/validate", { params: { token } })
      .then((res) => {
        if (res.data.valid && res.data.name && res.data.email) {
          setInvitee({ name: res.data.name, email: res.data.email });
          setStatus("valid");
        } else {
          setStatus("invalid");
        }
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  async function onSubmit(data: FormValues) {
    setError(null);
    try {
      const res = await api.post<{ token: string; user: User }>("/auth/accept-invite", { token, password: data.password });
      applySession(res.data.token, res.data.user);
      navigate("/", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-9 shadow-soft-lg">
        <h1 className="mb-1 font-display text-2xl font-semibold tracking-tight text-ink">Welcome to Klocka</h1>

        {status === "checking" && <p className="text-sm text-ink-muted">Checking your invite…</p>}

        {status === "invalid" && (
          <>
            <p className="mb-6 text-sm text-ink-muted">This invite link is invalid or has expired. Ask your admin to resend it.</p>
            <Link to="/login" className="text-sm font-medium text-brand-600 hover:underline">
              Back to sign in
            </Link>
          </>
        )}

        {status === "valid" && invitee && (
          <>
            <p className="mb-6 text-sm text-ink-muted">
              Set a password for <span className="font-medium text-ink">{invitee.email}</span> to activate your account.
            </p>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">Password</label>
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
                {isSubmitting ? "Setting up…" : "Activate account"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
