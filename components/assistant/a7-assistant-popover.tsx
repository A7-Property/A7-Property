"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Send, X } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";

import { useLanguage } from "@/components/i18n/language-provider";
import { AnimatedAssetIcon } from "@/components/ui/animated-asset-icon";
import { cn } from "@/lib/utils";

const quickPrompts = [
  "2-bed near Hledan under 8 သိန်း",
  "Quiet family home in Yankin",
  "Verified homes with parking",
];

const quickPromptsMyanmar = [
  "လှည်းတန်းအနီး ၈ သိန်းအောက် အိပ်ခန်း ၂ ခန်း",
  "ရန်ကင်းရှိ တိတ်ဆိတ်သော မိသားစုအိမ်",
  "ကားပါကင်ပါသော စိစစ်ပြီးအိမ်များ",
];

function recommendationFor(question: string, isMyanmar: boolean) {
  const normalized = question.toLowerCase();

  if (normalized.includes("hledan") || normalized.includes("8 သိန်း")) {
    return isMyanmar
      ? "ကမာရွတ်နှင့် လှိုင်သည် သင့်အတွက် စတင်ရှာဖွေရန် အကောင်းဆုံးနေရာများဖြစ်သည်။ လှည်းတန်းအနီး ၈ သိန်းအောက် စိစစ်ပြီး အိပ်ခန်း ၂ ခန်းပါအိမ်များကို ဦးစားပေးမည်။"
      : "Kamayut and Hlaing are your strongest starting points. I’ll prioritise verified 2-bed homes near Hledan with a budget up to 8 သိန်း.";
  }

  if (normalized.includes("family") || normalized.includes("quiet") || normalized.includes("yankin") || normalized.includes("ရန်ကင်း") || normalized.includes("တိတ်ဆိတ်")) {
    return isMyanmar
      ? "ရန်ကင်းသည် တိတ်ဆိတ်သောလမ်းများနှင့် မိသားစုအတွက်သင့်တော်သောအိမ်များ ရှာဖွေရန် ကိုက်ညီသည်။ လူစည်ကားသောလမ်းမကြီးများနှင့် ဝေးသည့် စိစစ်ပြီးအိမ်များကို ဦးစားပေးမည်။"
      : "Yankin is a strong match for quieter streets and family-friendly homes. I’ll focus on verified listings away from busy main roads.";
  }

  if (normalized.includes("parking") || normalized.includes("verified") || normalized.includes("ကားပါကင်")) {
    return isMyanmar
      ? "ကားပါကင်အတည်ပြုထားပြီး အိမ်ရှင်အချက်အလက်ရှင်းလင်းသည့် စိစစ်ပြီးအိမ်များကို ရွေးကာ အကြောင်းပြန်မြန်သည့် စာရင်းများကို ဦးစားပေးမည်။"
      : "I’ll narrow the search to verified homes with confirmed parking and clear owner details, then rank the most responsive listings first.";
  }

  if (normalized.includes("buy") || normalized.includes("sale")) {
    return isMyanmar
      ? "ရောင်းရန်အိမ်များကို စုစုပေါင်းဈေးနှုန်း၊ နေရာ၊ အိမ်အမျိုးအစားနှင့် ပိုင်ဆိုင်မှုအချက်အလက်အလိုက် နှိုင်းယှဉ်ပေးမည်။"
      : "I’ll compare verified homes for sale by total price, location, property type, and ownership details—so the shortlist is easier to trust.";
  }

  return isMyanmar
    ? "သင်ပြောသည့်အချက်များကို နေရာ၊ ဘတ်ဂျက်၊ အိမ်အမျိုးအစားနှင့် စိစစ်ထားသောအိမ်ရှင်အချက်အလက်များသုံး၍ တိကျသောရှာဖွေမှုအဖြစ် ပြောင်းပေးမည်။"
    : "I’ll turn that into a focused home search using location, budget, home type, and verified-owner details.";
}

interface A7AssistantPopoverProps {
  className?: string;
  labelClassName?: string;
}

function A7AssistantPopover({ className, labelClassName }: A7AssistantPopoverProps) {
  const { isMyanmar, tx } = useLanguage();
  const reduceMotion = useReducedMotion();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    if (!open) return;

    const focusFrame = window.requestAnimationFrame(() => inputRef.current?.focus());
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function ask(questionToAsk: string) {
    const normalizedQuestion = questionToAsk.trim();
    if (!normalizedQuestion) return;
    setQuestion(normalizedQuestion);
    setAnswer(recommendationFor(normalizedQuestion, isMyanmar));
  }

  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(question);
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        aria-label={tx("Open A7 matching demo", "A7 အိမ်ကိုက်ညီမှုနမူနာကို ဖွင့်ရန်")}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex h-11 min-w-11 items-center gap-2 rounded-full px-3 text-xs font-medium text-[#0057D9] transition-[background-color,box-shadow,transform] duration-200 hover:bg-[#F1F6FF] active:scale-[.97]",
          open && "bg-[#EEF5FC] shadow-[inset_0_0_0_1px_rgba(0, 87, 217,.12)]",
        )}
      >
        <span className="relative grid size-8 place-items-center">
          <AnimatedAssetIcon src="/icons/a7-property-match-3d.png" width={32} height={32} className="size-8" imageClassName="drop-shadow-[0_5px_7px_rgba(18,59,115,.22)]" />
          <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-[#35C778] ring-2 ring-white" />
        </span>
        <span className={labelClassName}>{tx("A7 match demo", "A7 ကိုက်ညီမှုနမူနာ")}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.section
            id={panelId}
            role="dialog"
            aria-label={tx("A7 browser matching demo", "A7 browser ကိုက်ညီမှုနမူနာ")}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -5, scale: 0.985 }}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed left-3 right-3 top-[78px] z-[90] overflow-hidden rounded-[24px] border border-[#DCE4ED] bg-white shadow-[0_28px_80px_rgba(20,45,72,.22),0_2px_10px_rgba(20,45,72,.08)] sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+12px)] sm:w-[390px]"
          >
            <div className="relative overflow-hidden bg-[linear-gradient(145deg,#F5F9FF_0%,#FFFFFF_62%)] px-5 pb-4 pt-5">
              <div className="pointer-events-none absolute -right-12 -top-14 size-36 rounded-full bg-[#CFE1FF]/50 blur-2xl" />
              <div className="relative flex items-start gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#EAF3FF] shadow-[0_8px_20px_rgba(16,42,67,.12)]">
                  <AnimatedAssetIcon src="/icons/a7-property-match-3d.png" width={48} height={48} hover="float" className="size-12" imageClassName="drop-shadow-[0_6px_8px_rgba(18,59,115,.2)]" />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-[#172B3F]">{tx("A7 match demo", "A7 ကိုက်ညီမှုနမူနာ")}</h2>
                    <span className="inline-flex items-center gap-1.5 text-[9px] font-medium text-[#2B7751]">
                      <span className="size-1.5 rounded-full bg-[#35C778]" />
                      {tx("Ready", "အသင့်ရှိသည်")}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-4 text-[#667486]">{tx("Rule-based suggestions generated in this browser.", "ဤ browser ထဲတွင် rule-based အကြံပြုချက်များ ထုတ်ပေးသည်။")}</p>
                </div>
                <button
                  type="button"
                  aria-label={tx("Close Ask A7", "A7 မေးမြန်းမှုကို ပိတ်ရန်")}
                  onClick={() => setOpen(false)}
                  className="grid size-11 shrink-0 place-items-center rounded-full text-[#667486] transition-colors hover:bg-[#E8EFF8] hover:text-[#172B3F]"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="px-5 pb-5">
              <AnimatePresence mode="wait" initial={false}>
                {answer ? (
                  <motion.div
                    key="answer"
                    aria-live="polite"
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mb-4 rounded-[18px] border border-[#CFE0FA] bg-[#F4F8FF] p-4"
                  >
                    <div className="flex gap-3">
                      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[#0057D9] text-white">
                        <Check className="size-3.5" strokeWidth={2.5} />
                      </span>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#0057D9]">{tx("A7 starting point", "A7 ၏ စတင်အကြံပြုချက်")}</p>
                        <p className="mt-1.5 text-[12px] leading-5 text-[#33495E]">{answer}</p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="prompts"
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mb-4"
                  >
                    <p className="mb-2.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[#667486]">{tx("Try asking", "ဒီလိုမေးကြည့်ပါ")}</p>
                    <div className="grid gap-2">
                      {(isMyanmar ? quickPromptsMyanmar : quickPrompts).map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => ask(prompt)}
                          className="group flex min-h-11 items-center justify-between gap-3 rounded-[14px] border border-[#E1E7EF] bg-white px-3.5 py-2.5 text-left text-[11px] leading-4 text-[#33495E] transition-[border-color,background-color,transform] hover:border-[#AACBFF] hover:bg-[#F8FBFF] active:scale-[.99]"
                        >
                          <span>{prompt}</span>
                          <ArrowRight className="size-3.5 shrink-0 text-[#8A98A8] transition-transform group-hover:translate-x-0.5 group-hover:text-[#0057D9]" />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={submitQuestion}>
                <div className="flex items-center gap-2 rounded-[16px] border border-[#C9D5E2] bg-white p-1.5 pl-3.5 shadow-[0_5px_16px_rgba(31,55,79,.06)] transition-[border-color,box-shadow] focus-within:border-[#75AEFF] focus-within:shadow-[0_0_0_3px_rgba(0, 87, 217,.1)]">
                  <input
                    ref={inputRef}
                    type="text"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    data-focus-ring="parent"
                    placeholder={tx("Describe the home you need…", "လိုချင်သောအိမ်ကို ဖော်ပြပါ…")}
                    aria-label={tx("Ask A7 a question", "A7 ကို မေးခွန်းမေးရန်")}
                    className="h-11 min-w-0 flex-1 border-0 bg-transparent p-0 text-[12px] text-[#172B3F] outline-none placeholder:text-[#8A98A8] focus:outline-none focus-visible:outline-none"
                  />
                  <button
                    type="submit"
                    aria-label={tx("Send question", "မေးခွန်းပို့ရန်")}
                    disabled={!question.trim()}
                    className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#0057D9] text-white shadow-[0_7px_16px_rgba(0, 87, 217,.22)] transition-[background-color,transform,opacity] hover:bg-[#005EE5] active:scale-[.95] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <Send className="size-4" />
                  </button>
                </div>
              </form>

              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-[9px] leading-4 text-[#8A98A8]">{tx("Suggestions use your search—not private account data.", "အကြံပြုချက်များသည် သင့်ရှာဖွေမှုကိုသာ အသုံးပြုပြီး ကိုယ်ရေးအချက်အလက်ကို မသုံးပါ။")}</p>
                <Link
                  href="/assistant"
                  onClick={() => setOpen(false)}
                  className="inline-flex min-h-11 shrink-0 items-center gap-1 text-[10px] font-medium text-[#0057D9] hover:underline"
                >
                  {tx("Full matching demo", "ကိုက်ညီမှုနမူနာအပြည့်")}
                  <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

export { A7AssistantPopover };
