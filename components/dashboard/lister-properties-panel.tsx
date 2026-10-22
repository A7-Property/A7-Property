"use client";

import { Archive, Building2, ChevronLeft, ChevronRight, Loader2, PauseCircle, Pencil, PlayCircle, Plus, Search } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useLanguage } from "@/components/i18n/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressiveImage } from "@/components/ui/progressive-image";
import { Skeleton } from "@/components/ui/skeleton";
import { getListerPropertyPage, formatPropertyPrice, listingVerificationLabel, type ListingStatus, type Property } from "@/lib/properties";

interface Props {
  properties: Property[];
  ready: boolean;
  failed: boolean;
  serverBacked: boolean;
  pendingIds: string[];
  onCreate: () => void;
  onEdit: (property: Property) => void;
  onTogglePublish: (property: Property) => void;
  onArchive: (property: Property) => void;
  onConfirmAvailability: (property: Property) => void;
  onMarkUnavailable: (property: Property) => void;
  onRetry: () => void;
  children?: ReactNode;
}

export function ListerPropertiesPanel({ properties, ready, failed, serverBacked, pendingIds, onCreate, onEdit, onTogglePublish, onArchive, onConfirmAvailability, onMarkUnavailable, onRetry, children }: Props) {
  const { tx, isMyanmar } = useLanguage();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ListingStatus | "all">("all");
  const [purpose, setPurpose] = useState<Property["purpose"] | "all">("all");
  const [page, setPage] = useState(1);
  const result = getListerPropertyPage(properties, { query, status, purpose, page });
  const statusLabels: Record<ListingStatus, string> = {
    DRAFT: tx("Draft", "မူကြမ်း"), PUBLISHED: tx("Published", "ကြော်ငြာထုတ်ပြီး"), PAUSED: tx("Paused", "ရပ်ထား"),
    SOLD: tx("Sold", "ရောင်းပြီး"), RENTED: tx("Rented", "ငှားပြီး"), ARCHIVED: tx("Archived", "သိမ်းဆည်းပြီး"),
  };
  const filtered = Boolean(query.trim() || status !== "all" || purpose !== "all");
  function reset() { setQuery(""); setStatus("all"); setPurpose("all"); setPage(1); }
  const selectClass = "h-11 min-w-0 rounded-xl border border-a7-line bg-white px-3 text-xs text-a7-navy outline-none focus-visible:ring-4 focus-visible:ring-a7-blue/20";

  return <section id="crm-properties" aria-labelledby="lister-properties-title" className="min-w-0 scroll-mt-24 overflow-hidden rounded-[22px] border border-a7-line bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-a7-line p-5 sm:p-6">
      <div><h2 id="lister-properties-title" className="text-lg font-semibold tracking-[-0.03em]">{tx("Properties", "အိမ်ခြံမြေများ")}</h2><p className="mt-1 text-xs text-a7-muted">{tx("Manage your drafts and published listings.", "မူကြမ်းနှင့် ကြော်ငြာထုတ်ထားသော အိမ်စာရင်းများကို စီမံပါ။")}</p></div>
      <Button variant="outline" onClick={onCreate}><Plus className="size-4" aria-hidden="true" />{tx("Add property", "အိမ်စာရင်းထည့်ရန်")}</Button>
    </div>
    {children}
    <div className="grid gap-2 border-b border-a7-line p-4 sm:grid-cols-2 sm:p-5">
      <label className="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-a7-line bg-[#F8FBFF] px-3 sm:col-span-2 focus-within:ring-4 focus-within:ring-a7-blue/20"><Search className="size-4 shrink-0 text-a7-muted" aria-hidden="true" /><span className="sr-only">{tx("Search your properties", "သင့်အိမ်စာရင်းများ ရှာရန်")}</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder={tx("Search title, township or address", "ခေါင်းစဉ်၊ မြို့နယ်၊ လိပ်စာဖြင့် ရှာပါ")} className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
      <select aria-label={tx("Listing status", "အိမ်စာရင်းအခြေအနေ")} className={selectClass} value={status} onChange={(event) => { setStatus(event.target.value as ListingStatus | "all"); setPage(1); }}><option value="all">{tx("All statuses", "အခြေအနေအားလုံး")}</option>{Object.entries(statusLabels).filter(([value]) => value !== "ARCHIVED").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <select aria-label={tx("Listing purpose", "အိမ်စာရင်းရည်ရွယ်ချက်")} className={selectClass} value={purpose} onChange={(event) => { setPurpose(event.target.value as Property["purpose"] | "all"); setPage(1); }}><option value="all">{tx("Buy and rent", "ဝယ်ရန်နှင့် ငှားရန်")}</option><option value="sale">{tx("For sale", "ရောင်းရန်")}</option><option value="rent">{tx("For rent", "ငှားရန်")}</option></select>
    </div>
    {!ready ? <div role="status" className="space-y-4 p-5"><span className="sr-only">{tx("Loading properties…", "အိမ်စာရင်းများ ဖွင့်နေသည်…")}</span>{[0, 1, 2].map((index) => <Skeleton key={index} className="h-24 rounded-xl" />)}</div>
      : failed ? <div role="alert" className="space-y-3 px-5 py-12 text-center"><p className="font-semibold">{tx("Properties could not be loaded", "အိမ်စာရင်းများ ဖွင့်မရပါ")}</p><p className="text-sm text-a7-muted">{tx("Check your connection and try again.", "ချိတ်ဆက်မှုကို စစ်ပြီး ပြန်လည်ကြိုးစားပါ။")}</p><Button variant="outline" onClick={onRetry}>{tx("Retry", "ပြန်ကြိုးစားရန်")}</Button></div>
      : !result.total ? <div className="px-5 py-12 text-center"><Building2 className="mx-auto size-10 text-a7-blue/50" aria-hidden="true" /><h3 className="mt-4 font-semibold">{filtered ? tx("No matching properties", "ကိုက်ညီသောအိမ်စာရင်း မရှိပါ") : tx("No properties yet", "အိမ်စာရင်း မရှိသေးပါ")}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-a7-muted">{filtered ? tx("Try another search or clear your filters.", "တခြားစာလုံးဖြင့် ရှာပါ သို့မဟုတ် စစ်ထုတ်မှုများ ရှင်းပါ။") : tx("Create your first draft. It stays private until you publish it.", "ပထမဆုံး မူကြမ်းဖန်တီးပါ။ ကြော်ငြာမထုတ်မီ သင်သာ မြင်နိုင်ပါသည်။")}</p><Button className="mt-5" variant={filtered ? "outline" : "default"} onClick={filtered ? reset : onCreate}>{filtered ? tx("Clear filters", "စစ်ထုတ်မှုရှင်းရန်") : tx("Create listing", "အိမ်စာရင်းဖန်တီးရန်")}</Button></div>
      : <ul className="divide-y divide-a7-line">{result.items.map((property) => {
        const pending = pendingIds.includes(property.id);
        const canManage = serverBacked && property.listing_status !== "ARCHIVED";
        return <li key={property.id} aria-busy={pending} className="p-4 sm:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#EAF4FF] text-a7-blue">{property.images[0] ? <ProgressiveImage src={property.images[0]} alt="" fill sizes="64px" className="object-cover" /> : <Building2 className="size-6" aria-hidden="true" />}</span>
            <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-semibold">{property.title}</h3><p className="mt-1 truncate text-xs text-a7-muted">{property.township} · {property.purpose === "sale" ? tx("For sale", "ရောင်းရန်") : tx("For rent", "ငှားရန်")}</p><p className="mt-2 text-sm font-semibold">{formatPropertyPrice(property, isMyanmar ? "my" : "en")}</p></div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><div className="min-w-0"><Badge variant={property.listing_status === "PUBLISHED" ? "success" : property.listing_status === "DRAFT" || property.listing_status === "PAUSED" ? "warning" : "neutral"}>{statusLabels[property.listing_status]}</Badge><p className="mt-1 text-xs text-a7-muted">{tx(listingVerificationLabel(property), ({ verified: "စိစစ်ပြီးသောအိမ်စာရင်း", pending: "စိစစ်မှု စောင့်ဆိုင်းနေသည်", rejected: "စိစစ်မှု ငြင်းပယ်ထားသည်", unverified: "မစိစစ်ရသေးသောအိမ်စာရင်း" })[property.verification_status])}</p>{property.expires_at && <p className="mt-1 text-[11px] text-a7-muted">{tx(`Availability expires ${new Date(property.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`, `ရရှိနိုင်မှု သက်တမ်း ${new Date(property.expires_at).toLocaleDateString("my-MM")}`)}</p>}</div>
            <div className="flex shrink-0 items-center gap-1">{pending && <Loader2 className="mr-1 size-4 animate-spin text-a7-blue" aria-label={tx("Updating listing", "အိမ်စာရင်း ပြင်နေသည်")} />}
              {canManage && <Button size="icon" variant="ghost" disabled={pending} onClick={() => onTogglePublish(property)} aria-label={property.listing_status === "PUBLISHED" ? tx(`Pause ${property.title}`, `${property.title} ကို ရပ်ရန်`) : tx(`Publish ${property.title}`, `${property.title} ကို ကြော်ငြာထုတ်ရန်`)}>{property.listing_status === "PUBLISHED" ? <PauseCircle className="size-4" /> : <PlayCircle className="size-4" />}</Button>}
              <Button size="icon" variant="ghost" disabled={pending || property.listing_status === "ARCHIVED"} onClick={() => onEdit(property)} aria-label={tx(`Edit ${property.title}`, `${property.title} ကို ပြင်ရန်`)}><Pencil className="size-4" /></Button>
              {canManage && <Button size="icon" variant="ghost" disabled={pending} onClick={() => onArchive(property)} aria-label={tx(`Archive ${property.title}`, `${property.title} ကို သိမ်းဆည်းရန်`)}><Archive className="size-4" /></Button>}
            </div>
          </div>
          {serverBacked && (property.listing_status === "PUBLISHED" || property.listing_status === "PAUSED") && <div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" disabled={pending} onClick={() => onConfirmAvailability(property)}>{tx("Still available", "ရရှိနိုင်သေးသည်")}</Button><Button variant="outline" disabled={pending} onClick={() => onMarkUnavailable(property)}>{property.purpose === "sale" ? tx("Mark sold", "ရောင်းပြီး") : tx("Mark rented", "ငှားပြီး")}</Button></div>}
        </li>;
      })}</ul>}
    {ready && !failed && result.total > 0 && <nav aria-label={tx("Property pages", "အိမ်စာရင်း စာမျက်နှာများ")} className="flex flex-wrap items-center justify-between gap-3 border-t border-a7-line p-4"><p className="text-xs text-a7-muted" aria-live="polite">{tx(`${result.first}–${result.last} of ${result.total}`, `${result.total} ခုအနက် ${result.first}–${result.last} ခု`)}</p><div className="flex items-center gap-2"><Button size="icon" variant="outline" disabled={result.page <= 1} onClick={() => setPage(result.page - 1)} aria-label={tx("Previous property page", "ရှေ့စာမျက်နှာ")}><ChevronLeft className="size-4" /></Button><span className="text-xs tabular-nums">{result.page} / {result.pages}</span><Button size="icon" variant="outline" disabled={result.page >= result.pages} onClick={() => setPage(result.page + 1)} aria-label={tx("Next property page", "နောက်စာမျက်နှာ")}><ChevronRight className="size-4" /></Button></div></nav>}
  </section>;
}
