import { useEffect, useLayoutEffect, useRef, useState } from "react";
import clsx from "../lib/clsx";

export interface KebabMenuItem {
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
  dividerBefore?: boolean;
}

// A compact "⋮" trigger that opens a small floating action list. Positioned
// with `fixed` (computed from the trigger's own bounding rect) rather than
// `absolute`, so it escapes the table wrapper's `overflow-hidden` (used to
// clip the header's rounded corners) instead of being cut off near the
// bottom of a scrolling table.
export default function KebabMenu({ items }: { items: KebabMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; bottom: number; right: number } | null>(null);
  const [openUpward, setOpenUpward] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Flip the menu above the trigger instead of below it when there isn't
  // enough room left in the viewport - runs before paint, so there's no
  // visible flash of it opening downward first.
  useLayoutEffect(() => {
    if (!open || !anchor || !menuRef.current) return;
    const menuHeight = menuRef.current.getBoundingClientRect().height;
    setOpenUpward(anchor.bottom + 4 + menuHeight > window.innerHeight);
  }, [open, anchor]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function handleScroll() {
      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  function toggleOpen() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setAnchor({ top: rect.top, bottom: rect.bottom, right: window.innerWidth - rect.right });
      setOpenUpward(false);
    }
    setOpen((o) => !o);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        aria-label="Actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className={clsx(
          "flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition-colors duration-150 hover:bg-line-soft hover:text-ink",
          open && "bg-line-soft text-ink"
        )}
      >
        <span className="text-base leading-none tracking-wider">⋮</span>
      </button>

      {open && anchor && (
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: "fixed",
            right: anchor.right,
            ...(openUpward ? { bottom: window.innerHeight - anchor.top + 4 } : { top: anchor.bottom + 4 }),
          }}
          className="z-50 w-44 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-soft-lg"
        >
          {items.map((item, i) => (
            <div key={i}>
              {item.dividerBefore && <div className="my-1 border-t border-line" />}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={clsx(
                  "block w-full px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-line-soft",
                  item.tone === "danger" ? "font-medium text-danger-600" : "text-ink"
                )}
              >
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
