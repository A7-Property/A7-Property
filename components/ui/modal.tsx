"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { a7Motion } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

function Modal({ open, onOpenChange, title, description, children, footer, className }: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => closeRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter((element) => !element.hidden && element.getAttribute("aria-hidden") !== "true");
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [open, onOpenChange]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] grid place-items-center p-4">
          <motion.button aria-label="Close modal" className="absolute inset-0 bg-a7-navy/45 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => onOpenChange(false)} />
          <motion.section
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            className={cn("relative z-10 max-h-[90vh] w-full max-w-[560px] overflow-hidden rounded-[var(--radius-sheet)] border border-white/70 bg-[#F8FBFF] shadow-[var(--shadow-overlay)]", className)}
            initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={reduceMotion ? { duration: 0 } : a7Motion.base}
          >
            <header className="flex items-start gap-4 border-b border-a7-line px-5 py-5">
              <div className="min-w-0 flex-1"><h2 id={titleId} className="text-xl font-semibold text-a7-navy">{title}</h2>{description && <p id={descriptionId} className="mt-1.5 text-sm text-a7-muted">{description}</p>}</div>
              <Button ref={closeRef} size="icon" variant="ghost" onClick={() => onOpenChange(false)} aria-label="Close"><X className="size-5" /></Button>
            </header>
            <div className="max-h-[65vh] overflow-y-auto">{children}</div>
            {footer && <footer className="border-t border-a7-line px-5 py-4">{footer}</footer>}
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}

export { Modal };
export type { ModalProps };
