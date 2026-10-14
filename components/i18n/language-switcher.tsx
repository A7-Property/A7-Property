"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown, Globe2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useLanguage, type Language } from "@/components/i18n/language-provider";
import { cn } from "@/lib/utils";

const options: Array<{ value: Language; label: string; nativeLabel: string }> = [
  { value: "en", label: "English", nativeLabel: "English" },
  { value: "my", label: "Myanmar", nativeLabel: "မြန်မာ" },
];

interface LanguageSwitcherProps {
  className?: string;
  buttonClassName?: string;
  labelClassName?: string;
  compact?: boolean;
  menuAlign?: "left" | "right";
}

function LanguageSwitcher({ className, buttonClassName, labelClassName, compact = false, menuAlign = "right" }: LanguageSwitcherProps) {
  const { language, setLanguage, tx } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const current = options.find((option) => option.value === language) ?? options[0];

  useEffect(() => {
    if (!open) return;

    function closeOnOutsidePress(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function chooseLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-label={tx("Change language", "ဘာသာစကား ပြောင်းရန်")}
        aria-expanded={open}
        aria-controls="a7-language-options"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex h-11 items-center justify-center rounded-full text-[#526172] transition-[background-color,color,box-shadow] hover:bg-[#EEF5FC] hover:text-[#0057D9] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0057D9]/18",
          compact ? "w-11" : "gap-1.5 px-3",
          open && "bg-[#EEF5FC] text-[#0057D9]",
          buttonClassName,
        )}
      >
        <Globe2 className="size-[18px] shrink-0" strokeWidth={2} />
        {!compact && (
          <>
            <span className={cn("relative top-[2px] inline-flex h-full items-center text-[12px] font-semibold leading-none", labelClassName)}>{language === "my" ? current.nativeLabel : current.label}</span>
            <ChevronDown className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-180")} />
          </>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="a7-language-options"
            aria-label={tx("Choose language", "ဘာသာစကား ရွေးချယ်ရန်")}
            initial={reduceMotion ? false : { opacity: 0, y: -7, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -5, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0 : 0.16, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "absolute top-[calc(100%+10px)] z-[90] w-[210px] overflow-hidden rounded-[20px] border border-[#172B3F]/10 bg-white p-2 shadow-[0_4px_20px_rgba(0,0,0,.08)]",
              menuAlign === "right" ? "right-0" : "left-0",
            )}
          >
            <div className="px-3 pb-2 pt-1">
              <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#7A8794]">{tx("Language", "ဘာသာစကား")}</p>
              <p className="mt-1 text-[10px] text-[#8A96A3]">{tx("Choose your preferred language", "သင်နှစ်သက်ရာ ဘာသာစကားကို ရွေးပါ")}</p>
            </div>
            {options.map((option) => {
              const selected = option.value === language;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => chooseLanguage(option.value)}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition-colors",
                    selected ? "bg-[#EEF5FC] text-[#0057D9]" : "text-[#33495E] hover:bg-[#F5F6F2]",
                  )}
                >
                  <span className="grid size-8 place-items-center rounded-lg bg-white text-[11px] font-bold shadow-sm ring-1 ring-[#172B3F]/8">{option.value === "en" ? "EN" : "မြန်"}</span>
                  <span className="min-w-0 flex-1">
                    <strong lang={option.value === "my" ? "my" : "en"} className="block text-[12px] font-semibold">{option.nativeLabel}</strong>
                    <small className="mt-0.5 block text-[9px] font-normal text-[#7A8794]">{option.label}</small>
                  </span>
                  {selected && <Check className="size-4 text-[#0057D9]" strokeWidth={2.5} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { LanguageSwitcher };
