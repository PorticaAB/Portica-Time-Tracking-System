interface ConfirmActionDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

// A lighter-weight sibling of ConfirmDeleteDialog, for actions that are
// permission-sensitive but reversible (unlike a permanent delete) - no
// typed confirm word, just a clear description and a Cancel/Confirm pair,
// in accent (not danger) styling to keep the visual vocabulary distinct
// from irreversible destructive actions.
export default function ConfirmActionDialog({ title, description, confirmLabel, busy, error, onConfirm, onCancel }: ConfirmActionDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 backdrop-blur-[2px]" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-96 rounded-xl border border-accent-200 bg-surface p-5 shadow-soft-lg">
        <h3 className="mb-2 font-display text-base font-semibold text-ink">{title}</h3>
        <p className="mb-4 text-sm text-ink-muted">{description}</p>
        {error && <p className="mb-4 text-sm text-danger-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-muted transition-all duration-150 hover:bg-line-soft active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white shadow-soft transition-all duration-150 hover:bg-accent-700 hover:shadow-soft-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
