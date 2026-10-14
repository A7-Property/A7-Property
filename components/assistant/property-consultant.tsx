"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, GitCompareArrows, MapPin, Send, ShieldCheck, Sparkles, UserRound, WalletCards } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { RecommendationCard } from "@/components/assistant/recommendation-card";
import { AppHeader } from "@/components/layout/app-header";
import { useLanguage } from "@/components/i18n/language-provider";
import { AnimatedAssetIcon } from "@/components/ui/animated-asset-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatPropertyPrice, type Property } from "@/lib/properties";
import { parsePropertyRequest, recommendProperties, type AssistantIntent, type RankedRecommendation } from "@/lib/property-assistant";

interface ChatMessage { id: number; role: "user" | "assistant"; textEn: string; textMy: string; }

const initialQuery = "I need a condo near Hledan under 700,000 MMK";
const initialIntent = parsePropertyRequest(initialQuery);

function PropertyConsultant({ properties }: { properties: Property[] }) {
  const { isMyanmar, tx } = useLanguage();
  const initialRecommendations = useMemo(() => recommendProperties(properties, initialIntent), [properties]);
  const priceLang = isMyanmar ? "my" : "en";
  const comparisonRows: Array<[string, (property: Property) => string]> = [
    [tx("Price", "ဈေးနှုန်း"), (property) => formatPropertyPrice(property, priceLang)],
    [tx("Bedrooms", "အိပ်ခန်း"), (property) => String(property.bedrooms)],
    [tx("Bathrooms", "ရေချိုးခန်း"), (property) => String(property.bathrooms)],
    [tx("Area", "အကျယ်အဝန်း"), (property) => `${property.area_sqft} sqft`],
    [tx("Verification", "စိစစ်မှု"), (property) => property.verification_status === "verified" ? tx("Verified", "စိစစ်ပြီး") : tx("Pending", "စိစစ်ဆဲ")],
  ];
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, role: "user", textEn: initialQuery, textMy: "လှည်းတန်းအနီး တစ်လ ၇၀၀,၀၀၀ ကျပ်အောက် ကွန်ဒိုလိုချင်ပါတယ်" },
    { id: 2, role: "assistant", textEn: "I understand. I kept the budget below 700,000 MMK and ranked verified options first. If exact Hledan inventory is limited, I’ll include nearby Yangon homes and explain the trade-off clearly.", textMy: "နားလည်ပါပြီ။ ဘတ်ဂျက်ကို ၇၀၀,၀၀၀ ကျပ်အောက်ထားပြီး စိစစ်ပြီးသောအိမ်များကို အရင်စီထားပါတယ်။ လှည်းတန်းမှာ ရွေးချယ်စရာနည်းပါက အနီးဝန်းကျင်ရန်ကုန်အိမ်များကို ကွာခြားချက်နှင့်အတူ ရှင်းလင်းစွာ ပြပါမယ်။" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [intent, setIntent] = useState<AssistantIntent>(initialIntent);
  const [recommendations, setRecommendations] = useState<RankedRecommendation[]>(initialRecommendations);
  const [comparedIds, setComparedIds] = useState<string[]>([]);
  const threadEnd = useRef<HTMLDivElement>(null);

  useEffect(() => { threadEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, loading]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const query = input.trim();
    if (!query || loading) return;
    setMessages((current) => [...current, { id: Date.now(), role: "user", textEn: query, textMy: query }]);
    setInput("");
    setLoading(true);
    window.setTimeout(() => {
      const nextIntent = parsePropertyRequest(query);
      const nextRecommendations = recommendProperties(properties, nextIntent);
      setIntent(nextIntent);
      setRecommendations(nextRecommendations);
      setComparedIds([]);
      setMessages((current) => [...current, { id: Date.now() + 1, role: "assistant", textEn: `I found ${nextRecommendations.length} strong matches for your brief. Exact-area homes come first; nearby alternatives are included only when inventory is limited, with the trade-off explained.`, textMy: `သင့်လိုအပ်ချက်နှင့် ကိုက်ညီသောအိမ် ${nextRecommendations.length} လုံး တွေ့ထားပါတယ်။ သတ်မှတ်နေရာရှိအိမ်များကို အရင်ပြပြီး ရွေးချယ်စရာနည်းမှသာ အနီးဝန်းကျင်အိမ်များကို ကွာခြားချက်နှင့်အတူ ထည့်ပြထားပါတယ်။` }]);
      setLoading(false);
    }, 900);
  }

  function toggleCompare(id: string) {
    setComparedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length >= 3 ? [...current.slice(1), id] : [...current, id]);
  }

  const compared = useMemo(() => comparedIds.map((id) => recommendations.find((item) => item.property.id === id)).filter(Boolean) as RankedRecommendation[], [comparedIds, recommendations]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_82%_-8%,rgba(0,87,217,.09),transparent_30rem),#F5F7FB]">
      <AppHeader compact />
      <main className="mx-auto grid w-full max-w-[1480px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[390px_minmax(0,1fr)] lg:px-8 lg:py-8">
        <section className="flex h-[530px] flex-col overflow-hidden rounded-[24px] border border-[#172B3F]/10 bg-white shadow-[0_18px_50px_rgba(23,43,63,.12)] sm:h-[620px] lg:sticky lg:top-[88px] lg:h-[calc(100vh-112px)]">
          <div className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_90%_0%,rgba(0,87,217,.45),transparent_16rem),linear-gradient(145deg,#172B3F,#111827)] p-5 text-white"><div className="pointer-events-none absolute -right-12 -top-16 size-40 rounded-full border border-white/10" /><div className="relative flex items-center gap-3"><AnimatedAssetIcon src="/icons/a7-property-match-3d.png" width={44} height={44} hover="float" className="size-11" imageClassName="drop-shadow-[0_7px_10px_rgba(0,0,0,.28)]" /><span className="min-w-0"><h1 className="text-[16px] font-semibold leading-5">{tx("A7 matching demo", "A7 အိမ်ရွေးချယ်မှု demo")}</h1><p className="mt-1 inline-flex items-center gap-1.5 text-[12px] leading-4 text-white/70"><span className="size-1.5 shrink-0 rounded-full bg-[#65D69E] shadow-[0_0_0_4px_rgba(101,214,158,.12)]" />{tx("Runs in this browser", "ဤ browser ထဲတွင်သာ အလုပ်လုပ်သည်")}</p></span></div><p className="relative mt-4 text-[14px] leading-5 text-white/75">{tx("This rule-based demo turns your request into filters and an explainable shortlist; it is not a live AI service.", "ဤ rule-based demo က သင့်လိုအပ်ချက်ကို filter များနှင့် ရှင်းပြနိုင်သောအိမ်စာရင်းအဖြစ် ပြောင်းပေးသည်။ Live AI service မဟုတ်ပါ။")}</p></div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">{messages.map((message) => <div key={message.id} className={`flex items-start gap-2.5 ${message.role === "user" ? "flex-row-reverse" : ""}`}><span className={`grid size-8 shrink-0 place-items-center rounded-full ${message.role === "assistant" ? "bg-[#EEF5FC] text-[#0057D9]" : "bg-[#F1F6FF] text-[#53606E]"}`}>{message.role === "assistant" ? <Sparkles className="size-4" /> : <UserRound className="size-4" />}</span><p className={`max-w-[84%] rounded-2xl px-4 py-3 text-[14px] leading-5 ${message.role === "assistant" ? "rounded-tl-md bg-[#F2F5F9] text-[#425267]" : "rounded-tr-md bg-[linear-gradient(135deg,#0B76FF,#003F91)] text-white shadow-[0_8px_18px_rgba(0,87,217,.16)]"}`}>{isMyanmar ? message.textMy : message.textEn}</p></div>)}<AnimatePresence>{loading && <motion.div role="status" aria-live="polite" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-full bg-[#EEF5FC] text-[#0057D9]"><Sparkles className="size-4" /></span><div className="rounded-2xl rounded-tl-md bg-[#F2F5F9] px-4 py-3"><span className="mb-2 block text-[12px] text-[#5F6C7B]">{tx("Matching demo listings", "Demo အိမ်များကို ကိုက်ညီမှုစစ်နေသည်")}</span><div className="flex gap-1">{[0, 1, 2].map((item) => <motion.span key={item} className="size-1.5 rounded-full bg-[#0057D9]" animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }} transition={{ duration: 0.9, repeat: Infinity, delay: item * 0.16 }} />)}</div></div></motion.div>}</AnimatePresence><div ref={threadEnd} /></div>
          <form onSubmit={submit} className="border-t border-[#172B3F]/8 bg-white p-3"><div className="flex items-center gap-2 rounded-2xl border border-[#D7E0EA] bg-[#F7F9FC] p-2 shadow-inner focus-within:border-[#4DA3FF] focus-within:ring-3 focus-within:ring-[#0057D9]/10"><textarea value={input} onChange={(event) => setInput(event.target.value)} rows={2} placeholder={tx("Describe the home you need...", "လိုအပ်သောအိမ်ကို ရေးပါ...")} className="min-h-11 flex-1 resize-none bg-transparent px-2 py-1 text-[16px] leading-5 outline-none" /><Button size="icon" className="size-11 shrink-0 self-center rounded-xl" type="submit" disabled={!input.trim() || loading} aria-label={tx("Send request", "တောင်းဆိုချက် ပို့ရန်")}><Send className="size-4" /></Button></div><div className="hide-scrollbar mt-2 flex gap-2 overflow-x-auto">{[
            { en: "Near work, but quiet", my: "အလုပ်နားမှာ အေးဆေးတဲ့နေရာ" },
            { en: "2 bedrooms in Yankin", my: "ရန်ကင်းတွင် အိပ်ခန်း ၂ ခန်း" },
            { en: "Family house under 500M", my: "သန်း ၅၀၀ အောက် မိသားစုအိမ်" },
          ].map((prompt) => <button type="button" key={prompt.en} className="inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-[#D7E0EA] bg-white p-0 text-[14px] font-medium leading-none text-[#5F6C7B] hover:border-[#9FC4FF] hover:text-[#0057D9]" onClick={() => setInput(isMyanmar ? prompt.my : prompt.en)}><span className="inline-flex h-full translate-y-px items-center justify-center px-3 leading-none">{isMyanmar ? prompt.my : prompt.en}</span></button>)}</div></form>
        </section>

        <section className="min-w-0 space-y-5">
          <Card><CardContent className="p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="eyebrow flex items-center gap-2 text-[12px]"><Sparkles className="size-4 shrink-0" />{tx("What I understood", "နားလည်ထားသော လိုအပ်ချက်")}</div><h2 className="mt-2 text-[20px] font-semibold leading-6 tracking-[-.035em] sm:text-[28px]">{tx("A focused brief, not more filters", "Filter များထက် ရှင်းလင်းသော လိုအပ်ချက်")}</h2></div><span className="inline-flex h-7 items-center justify-center gap-1.5 rounded-full bg-[#F3FAF6] px-2.5 text-[12px] font-semibold leading-none text-[#287A4B]"><ShieldCheck className="size-3.5 shrink-0" /><span className="relative top-px inline-flex items-center leading-none">{tx("Verified first", "စိစစ်ပြီးသောအိမ် ဦးစားပေး")}</span></span></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-[#172B3F]/6 bg-[#F7F9FC] p-4"><MapPin className="size-5 text-[#0057D9]" /><span className="mt-3 block text-[12px] uppercase tracking-wider text-[#667486]">{tx("Location", "နေရာ")}</span><strong className="mt-1 block text-[14px] leading-5">{intent.rawLocation ?? tx("Flexible in Yangon", "ရန်ကုန်အတွင်း နေရာအဆင်ပြေ")}</strong></div><div className="rounded-2xl border border-[#D9E8FF] bg-[#F1F6FF] p-4"><WalletCards className="size-5 text-[#53606E]" /><span className="mt-3 block text-[12px] uppercase tracking-wider text-[#667486]">{tx("Maximum budget", "အများဆုံးဘတ်ဂျက်")}</span><strong className="mt-1 block text-[14px] leading-5">{intent.budget ? (isMyanmar ? `${new Intl.NumberFormat("en-US").format(intent.budget).replace(/[0-9]/g, (d) => "၀၁၂၃၄၅၆၇၈၉"[Number(d)])} ကျပ်` : `${new Intl.NumberFormat("en-US").format(intent.budget)} MMK`) : tx("Open budget", "ဘတ်ဂျက် မသတ်မှတ်")}</strong></div><div className="rounded-2xl border border-[#D9E8FF] bg-[#EDF4FF] p-4"><Check className="size-5 text-[#0057D9]" /><span className="mt-3 block text-[12px] uppercase tracking-wider text-[#667486]">{tx("Rooms", "အခန်း")}</span><strong className="mt-1 block text-[14px] leading-5">{intent.bedrooms ? tx(`${intent.bedrooms}+ bedrooms`, `အိပ်ခန်း ${intent.bedrooms} ခန်းနှင့်အထက်`) : tx("Flexible rooms", "အခန်းအရေအတွက် အဆင်ပြေ")}</strong></div></div></CardContent></Card>

          <div className="flex items-end justify-between gap-4"><div><h2 className="text-[20px] font-semibold leading-6 tracking-[-.03em]">{tx("Recommended homes", "အကြံပြုထားသောအိမ်များ")}</h2><p className="mt-1 text-[12px] leading-4 text-[#6B7078]">{tx("Ranked by fit, trust, and value", "ကိုက်ညီမှု၊ ယုံကြည်ရမှုနှင့် တန်ဖိုးအလိုက် စီထားသည်")}</p></div><span className="shrink-0 text-[12px] leading-4 text-[#6B7078]">{tx(`${recommendations.length} matches`, `${recommendations.length} လုံး ကိုက်ညီသည်`)}</span></div>
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">{recommendations.map((item, index) => <RecommendationCard key={item.property.id} property={item.property} match={item.match} reasons={item.reasons} compared={comparedIds.includes(item.property.id)} priority={index < 2} onCompare={() => toggleCompare(item.property.id)} />)}</div>

          {compared.length >= 2 && <Card className="overflow-hidden rounded-[22px] border-[#2A2A33]/8 shadow-sm"><CardContent className="p-0"><div className="flex items-center gap-2 border-b border-[#2A2A33]/8 p-5"><GitCompareArrows className="size-5 text-[#0057D9]" /><div><h2 className="text-sm font-semibold">{tx("Side-by-side comparison", "ဘေးချင်းယှဉ် နှိုင်းယှဉ်မှု")}</h2><p className="mt-1 text-[9px] text-[#6B7078]">{tx("The details that affect your decision", "ဆုံးဖြတ်ချက်အတွက် အရေးကြီးသောအချက်များ")}</p></div></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-[10px]"><thead className="bg-[#FAFAFA]"><tr><th className="px-5 py-3 font-medium text-[#6B7078]">{tx("Home", "အိမ်")}</th>{compared.map((item) => <th key={item.property.id} className="max-w-[200px] px-4 py-3 font-semibold">{item.property.township} · {item.match}%</th>)}</tr></thead><tbody className="divide-y divide-[#D1D1D5]">{comparisonRows.map(([label, getter]) => <tr key={label}><th className="px-5 py-3 font-medium text-[#6B7078]">{label}</th>{compared.map((item) => <td key={item.property.id} className="px-4 py-3 font-medium">{getter(item.property)}</td>)}</tr>)}</tbody></table></div></CardContent></Card>}
        </section>
      </main>
    </div>
  );
}

export { PropertyConsultant };
