"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, HelpCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { useLanguage } from "@/components/i18n/language-provider";
import { AppHeader } from "@/components/layout/app-header";
import { AnimatedAssetIcon } from "@/components/ui/animated-asset-icon";

interface LocalizedText {
  en: string;
  my: string;
}

interface InformationSection {
  title: LocalizedText;
  body: LocalizedText;
  points?: LocalizedText[];
}

interface InformationPageProps {
  eyebrow: LocalizedText;
  title: LocalizedText;
  intro: LocalizedText;
  updated?: LocalizedText;
  sections: InformationSection[];
  helpMode?: boolean;
  visualSrc?: string;
}

const defaultUpdated: LocalizedText = {
  en: "Updated 29 July 2026",
  my: "၂၀၂၆ ဇူလိုင် ၂၉ ရက်တွင် ပြင်ဆင်ထားသည်",
};

function InformationPage({ eyebrow, title, intro, updated = defaultUpdated, sections, helpMode = false, visualSrc }: InformationPageProps) {
  const { tx } = useLanguage();
  const localize = (value: LocalizedText) => tx(value.en, value.my);

  return (
    <div className="min-h-screen bg-[#F7F7F4] text-[#17263A]">
      <AppHeader compact />
      <main className="mx-auto max-w-[1120px] px-4 pb-20 pt-10 sm:px-6 sm:pt-14 lg:px-10">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-1 text-xs font-semibold text-[#0057D9]"><ArrowLeft className="size-4" />{tx("Back to A7 Property", "A7 Property သို့ ပြန်သွားရန်")}</Link>
        <section className="mt-8 overflow-hidden rounded-[32px] bg-[#17304A] px-6 py-10 text-white shadow-[0_18px_55px_rgba(23,48,74,.18)] sm:px-10 sm:py-14 lg:px-14">
          <div className={visualSrc ? "flex flex-col items-start gap-5 sm:flex-row sm:gap-6" : "flex items-start gap-4"}>
            {visualSrc ? (
              <AnimatedAssetIcon src={visualSrc} width={96} height={96} hover="float" className="size-20 sm:size-24" />
            ) : (
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-[#BFD8FF]">{helpMode ? <HelpCircle className="size-6" /> : <ShieldCheck className="size-6" />}</span>
            )}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">{localize(eyebrow)}</p>
              <h1 className="mt-3 max-w-[760px] text-[38px] font-semibold leading-[1.04] tracking-[-0.055em] sm:text-[54px]">{localize(title)}</h1>
              <p className="mt-5 max-w-[720px] text-[14px] leading-7 text-white/72 sm:text-[16px]">{localize(intro)}</p>
              <p className="mt-6 text-[10px] font-medium text-white/42">{localize(updated)}</p>
            </div>
          </div>
        </section>

        {helpMode && (
          <section className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { title: { en: "Find a home", my: "အိမ်ရှာရန်" }, body: { en: "Search, filters, saved homes, and recommendations.", my: "ရှာဖွေမှု၊ စစ်ထုတ်မှု၊ သိမ်းထားသောအိမ်နှင့် အကြံပြုချက်များ။" }, href: "/search?purpose=rent" },
              { title: { en: "Talk to an owner", my: "ပိုင်ရှင်နှင့် ဆက်သွယ်ရန်" }, body: { en: "Open your conversations and viewing requests.", my: "စကားပြောဆိုမှုနှင့် အိမ်ကြည့်ရန် တောင်းဆိုချက်များကို ဖွင့်ပါ။" }, href: "/dashboard?section=messages#conversations" },
              { title: { en: "Ask A7", my: "A7 ကို မေးရန်" }, body: { en: "Describe what you need in everyday language.", my: "သင်လိုအပ်သောအိမ်ကို ရိုးရိုးစကားဖြင့် ဖော်ပြပါ။" }, href: "/assistant" },
            ].map((item) => (
              <Link key={item.title.en} href={item.href} className="group rounded-[22px] bg-white p-5 shadow-[0_8px_28px_rgba(26,39,56,.06)] ring-1 ring-[#17263A]/7 transition-transform hover:-translate-y-0.5">
                <strong className="text-sm">{localize(item.title)}</strong>
                <p className="mt-2 text-[11px] leading-5 text-[#6C7884]">{localize(item.body)}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-[10px] font-semibold text-[#0057D9]">{tx("Open", "ဖွင့်ရန်")} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></span>
              </Link>
            ))}
          </section>
        )}

        <div className="mt-10 grid gap-5 sm:mt-12">
          {sections.map((section, index) => (
            <section key={section.title.en} className="rounded-[26px] bg-white p-6 shadow-[0_10px_34px_rgba(26,39,56,.05)] ring-1 ring-[#17263A]/7 sm:p-8">
              <div className="flex items-start gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#EEF5FC] text-[11px] font-semibold text-[#0057D9]">{index + 1}</span>
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold tracking-[-0.035em]">{localize(section.title)}</h2>
                  <p className="mt-3 text-[13px] leading-7 text-[#64717E]">{localize(section.body)}</p>
                  {section.points && (
                    <ul className="mt-5 grid gap-3">
                      {section.points.map((point) => (
                        <li key={point.en} className="flex items-start gap-2.5 text-[12px] leading-6 text-[#536170]"><CheckCircle2 className="mt-1 size-4 shrink-0 text-[#2B7A52]" />{localize(point)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>

        <section className="mt-10 flex flex-col gap-4 rounded-[26px] border border-[#BCD5FA] bg-[#F1F6FF] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div><h2 className="text-lg font-semibold">{tx("Still need help?", "အကူအညီ လိုသေးပါသလား။")}</h2><p className="mt-2 text-xs text-[#637284]">{tx("Ask A7 or contact the trust team from your profile.", "A7 ကို မေးမြန်းပါ၊ သို့မဟုတ် Profile မှ trust team ကို ဆက်သွယ်ပါ။")}</p></div>
          <Link href="/assistant" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#0057D9] px-5 text-xs font-semibold text-white">{tx("Ask A7 AI", "A7 AI ကို မေးရန်")} <ArrowRight className="size-4" /></Link>
        </section>
      </main>
    </div>
  );
}

export { InformationPage };
export type { InformationSection, LocalizedText };
