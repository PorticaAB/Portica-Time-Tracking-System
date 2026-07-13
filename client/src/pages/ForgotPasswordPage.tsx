import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { api, getErrorMessage } from "../lib/api";
import DevLinkNotice from "../components/DevLinkNotice";

interface FormValues {
  email: string;
}

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>();

  async function onSubmit(data: FormValues) {
    setError(null);
    setMessage(null);
    setDevLink(null);
    try {
      const res = await api.post<{ message: string; devLink?: string }>("/auth/forgot-password", data);
      setMessage(res.data.message);
      if (res.data.devLink) setDevLink(res.data.devLink);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-9 shadow-soft-lg">
        <h1 className="mb-1 font-display text-2xl font-semibold tracking-tight text-ink">Forgot password?</h1>
        <p className="mb-7 text-sm text-ink-muted">Enter your email and we'll send you a reset link.</p>

        {message ? (
          <>
            <p className="text-sm text-ink">{message}</p>
            {devLink && <DevLinkNotice label="Use this link to test the reset flow:" link={devLink} />}
          </>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Email</label>
              <input
                type="email"
                {...register("email", { required: true })}
                className="w-full rounded-lg border border-line bg-canvas/40 px-3 py-2 text-sm text-ink transition-colors duration-150 focus:border-brand-500 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            {error && <p className="text-sm text-danger-600">{error}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-soft transition-all duration-150 hover:bg-brand-700 hover:shadow-soft-md active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <Link to="/login" className="mt-6 block text-center text-sm font-medium text-brand-600 hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
