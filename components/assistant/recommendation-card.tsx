"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, GitCompareArrows, Sparkles } from "lucide-react";

import { useLanguage } from "@/components/i18n/language-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatPropertyPrice, type Property } from "@/lib/properties";
import { cn } from "@/lib/utils";

interface RecommendationCardProps {
  property: Property;
  match: number;
  reasons: string[];
  compared: boolean;
  priority?: boolean;
  onCompare: () => void;
}

function RecommendationCard({ property, match, reasons, compared, priority = false, onCompare }: RecommendationCardProps) {
  const { isMyanmar, tx } = useLanguage();

  function localizeReason(reason: string) {
    if (!isMyanmar) return reason;
    if (reason === "Verified listing and phone contact") return "ကြော်ငြာနှင့် ဖုန်းနံပါတ် စိစစ်ပြီး";
    if (reason === "Verified listing; phone not verified") return "ကြော်ငြာစိစစ်ပြီး၊ ဖုန်းနံပါတ် မစိစစ်ရသေး";
    if (reason === "Listing verification pending") return "ကြော်ငြာ စိစစ်ဆဲ";
    if (reason === "Unverified listing") return "မစိစစ်ရသေးသော ကြော်ငြာ";
    if (reason === "Strong value for the area") return "ဤဧရိယာအတွက် တန်ဖိုးကောင်း";
    if (reason.includes("MMK below your limit")) return `${reason.replace("MMK below your limit", "ကျပ် ဘတ်ဂျက်အောက်")}`;
    if (reason.startsWith("In your preferred ")) return `သင်နှစ်သက်သော ${reason.replace("In your preferred ", "").replace(" area", "")} ဧရိယာတွင်`;
    if (reason.startsWith("Easy access from ")) return `${reason.replace("Easy access from ", "")} မှ သွားလာရလွယ်ကူ`;
    return reason;
  }

  return (
    <Card className="group overflow-hidden rounded-[22px] bg-white transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(23,43,63,.14)]">
      <div className="relative aspect-[16/10] overflow-hidden bg-[#EEF5FC]"><Image src={property.images[0]} alt={property.title} fill loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} sizes="(max-width: 768px) 84vw, 30vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.025]" /><div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#111827]/35 to-transparent" /><span className="absolute left-3 top-3 inline-flex h-7 items-center justify-center gap-1.5 rounded-full bg-[#0057D9] px-2.5 text-[12px] font-semibold leading-none text-white shadow-md"><Sparkles className="size-3.5 shrink-0" /><span className="relative top-px inline-flex items-center leading-none">{tx(`${match}% match`, `${match}% ကိုက်ညီ`)}</span></span></div>
      <CardContent className="flex flex-col p-4">
        <strong data-type="number" className="flex flex-wrap items-baseline gap-x-1 text-[20px] font-bold leading-8 tracking-[-.035em] text-[#191B24]">{formatPropertyPrice(property, isMyanmar ? "my" : "en")} <span className="text-[12px] font-normal leading-none tracking-normal text-[#424655]">{property.purpose === "rent" ? tx("/month", "/လ") : ""}</span></strong>
        <Link href={`/properties/${property.id}`} className="mt-1 flex min-h-11 items-center text-[16px] font-semibold leading-6 text-[#191B24] hover:text-[#0057D9]"><span className="line-clamp-2">{property.title}</span></Link>
        <div className="mt-0.5 truncate text-[14px] leading-5 text-[#424655]">{property.township}, {property.city}</div>
        <div className="mt-3 space-y-1.5 border-t border-[#E3E8EE] pt-3">{reasons.map((reason) => <div key={reason} className="flex min-h-6 items-center gap-2 text-[14px] leading-5 text-[#5F6C7B]"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#EEF5FC] text-[#287A4B]"><Check className="size-3" /></span><span>{localizeReason(reason)}</span></div>)}</div>
        <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-2"><Link className="inline-flex h-11 items-center justify-center rounded-xl bg-[#0057D9] px-4 text-[14px] font-medium leading-none text-white transition-colors hover:bg-[#003F91] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0057D9]/25" href={`/properties/${property.id}`}>{tx("View home", "အိမ်ကြည့်ရန်")}</Link><Button size="icon" variant="outline" className={cn("size-11 items-center justify-center", compared && "border-[#0057D9] bg-[#FAF8F5] text-[#0057D9]")} onClick={onCompare} aria-label={compared ? tx(`Remove ${property.title} from comparison`, `${property.title} ကို နှိုင်းယှဉ်မှုမှ ဖယ်ရန်`) : tx(`Compare ${property.title}`, `${property.title} ကို နှိုင်းယှဉ်ရန်`)} aria-pressed={compared}><GitCompareArrows className="size-4" /></Button></div>
      </CardContent>
    </Card>
  );
}

export { RecommendationCard };
