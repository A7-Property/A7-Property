"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type ToastTone = "success" | "info" | "error";

interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  duration?: number;
}

interface ToastItem extends ToastInput {
  id: number;
}

interface ToastContextValue {
  toast: (input: ToastInput) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toastIcons = {
  success: CheckCircle2,
  info: Info,
  error: AlertCircle,
};

function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const reduceMotion = useReducedMotion();

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((input: ToastInput) => {
    const id = ++nextId.current;
    setItems((current) => [...current.slice(-2), { ...input, id, tone: input.tone ?? "info" }]);
    window.setTimeout(() => dismiss(id), input.duration ?? 2800);
    return id;
  }, [dismiss]);

  const value = useMemo(() => ({ toast, dismiss }), [dismiss, toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 bottom-[88px] z-[140] mx-auto flex max-w-[420px] flex-col gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[380px]"
        aria-live="polite"
        aria-atomic="false"
      >
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const tone = item.tone ?? "info";
            const Icon = toastIcons[tone];
            return (
              <motion.div
                key={item.id}
                role={tone === "error" ? "alert" : "status"}
                initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.985 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-auto flex min-h-14 items-center gap-3 rounded-[16px] border border-white/70 bg-[#0F1B2D]/96 py-2.5 pl-3.5 pr-2 text-white shadow-[0_16px_38px_rgba(15,27,45,.22)] backdrop-blur-xl"
              >
                <span className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full",
                  tone === "success" && "bg-[#E9F8F1] text-[#19734E]",
                  tone === "info" && "bg-[#EAF2FF] text-[#0057D9]",
                  tone === "error" && "bg-[#FFF0EE] text-[#C23B31]",
                )}>
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-[12px] font-semibold leading-5">{item.title}</strong>
                  {item.description && <span className="block text-[10px] leading-4 text-white/68">{item.description}</span>}
                </span>
                <button type="button" onClick={() => dismiss(item.id)} className="grid size-11 shrink-0 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white" aria-label="Dismiss notification">
                  <X className="size-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}

export { ToastProvider, useToast };
export type { ToastInput, ToastTone };
