"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { XIcon } from "./icons";

/** Modal built on the native <dialog>: focus trap and Esc come for free. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      aria-label={title}
      className={`m-auto w-[calc(100%-1.5rem)] ${wide ? "max-w-xl" : "max-w-md"} rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-[2px]`}
    >
      {open ? (
        <div className="relative p-6 sm:p-7">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink"
          >
            <XIcon />
          </button>
          <h2 className="pr-8 text-xl font-semibold">{title}</h2>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
