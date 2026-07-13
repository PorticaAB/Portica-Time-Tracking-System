// Shown when the backend couldn't actually send an email (Resend isn't
// configured yet) - surfaces the raw link so the flow can still be tested.
export default function DevLinkNotice({ label, link }: { label: string; link: string }) {
  return (
    <div className="mt-4 rounded-lg border border-accent-200 bg-accent-50 p-3">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-accent-700">Email not configured yet</p>
      <p className="mb-2 text-xs text-ink-muted">{label}</p>
      <a href={link} className="block break-all rounded-md bg-surface px-2 py-1.5 text-xs text-brand-700 underline">
        {link}
      </a>
    </div>
  );
}
