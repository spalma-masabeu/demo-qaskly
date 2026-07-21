"use client";

import { type ReactNode, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { IconButton } from "./icon-button";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
};

export function Dialog({ open, onClose, title, children, size = "md" }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const stableClose = useCallback(() => onCloseRef.current(), []);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    el.addEventListener("close", stableClose);
    return () => el.removeEventListener("close", stableClose);
  }, [stableClose]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      if (!el.open) el.showModal();
    } else {
      if (el.open) el.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={[
        "rounded-2xl bg-white shadow-brand-xl",
        "backdrop:bg-gray-900/50 backdrop:backdrop-blur-sm",
        "w-full p-0",
        sizeClasses[size],
      ].join(" ")}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      {title && (
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <IconButton aria-label="Cerrar" onClick={onClose}>
            <X className="h-5 w-5" />
          </IconButton>
        </div>
      )}
      <div className="px-6 py-5">{children}</div>
    </dialog>
  );
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
      {children}
    </div>
  );
}
