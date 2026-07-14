import { useState } from "react";

interface ConfirmDeleteDialogProps {
  title: string;
  description: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const CONFIRM_WORD = "DELETE";

// Shared destructive-action confirmation dialog. Matches the app's usual
// modal chrome (fixed overlay + rounded panel) but in danger styling, and
// requires typing the exact confirm word before the button enables - a
// permanent delete should never be a single accidental click.
export default function ConfirmDeleteDialog({ title, description, busy, error, onConfirm, onCancel }: ConfirmDeleteDialogProps) {
  const [value, setValue] = useState("");
  const confirmed = value === CONFIRM_WORD;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 backdrop-blur-[2px]" onClick={onCancel}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-96 rounded-xl border border-danger-200 bg-surface p-5 shadow-soft-lg"
      >
        <h3 className="mb-2 font-display text-base font-semibold text-danger-700">{title}</h3>
        <p className="mb-4 text-sm text-ink-muted">{description}</p>
        <label className="mb-1 block text-xs font-medium text-ink-muted">
          Type <span className="font-mono font-semibold text-ink">{CONFIRM_WORD}</span> to confirm
        </label>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mb-4 w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink focus:border-danger-500 focus:outline-none focus:ring-2 focus:ring-danger-500/20"
        />
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
            disabled={!confirmed || busy}
            onClick={onConfirm}
            className="rounded-lg bg-danger-600 px-3 py-1.5 text-sm font-medium text-white shadow-soft transition-all duration-150 enabled:hover:bg-danger-700 enabled:hover:shadow-soft-md enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Deleting…" : "Delete permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}
