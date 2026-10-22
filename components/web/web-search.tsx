"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Bookmark, ChevronDown, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { PropertyMap } from "@/components/property/property-map";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast-provider";
import { useWebSearch, type WebSearchPage } from "@/hooks/use-web-search";
import { isApiConfigured } from "@/lib/api/client";
import { propertyTypeLabels, propertyTypeLabelsMy, type PropertyType } from "@/lib/properties";
import { webSearchParams, type WebSearchState } from "@/lib/web-search";
import { useSavedHomes } from "@/hooks/use-saved-homes";
import { useWebSavedSearches } from "@/hooks/use-web-saved-searches";
import { WebShell } from "./web-shell";
import { WebPropertyCard } from "./web-property-card";

type FilterGroup = "price" | "rooms" | "type" | "all";

export function WebSearch({ initial, initialQuery }: { initial: WebSearchPage; initialQuery: string }) {
  const { tx, isMyanmar } = useLanguage();
  const { state, page, loading, update, retry } = useWebSearch(initial, initialQuery);
  const [input, setInput] = useState(state.query);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [group, setGroup] = useState<FilterGroup | null>(null);
  const [draft, setDraft] = useState(state);
  const [invalid, setInvalid] = useState(false);
  const resultsRef = useRef<HTMLElement>(null);
  const { save, serverBacked: savedSearchesServerBacked } = useWebSavedSearches();
  const savedHomes = useSavedHomes();
  const { toast } = useToast();
  useEffect(() => { queueMicrotask(() => setInput(state.query)); }, [state.query]);
  const selected = page.properties.some((property) => property.id === selectedId) ? selectedId : null;
  const located = page.properties.filter((property) => property.lat !== null && property.lng !== null);
  function openFilters(next: FilterGroup) { setDraft(state); setInvalid(false); setGroup(next); }
  function submitSearch(event: FormEvent) { event.preventDefault(); update({ query: input.trim() }); }
  function apply(event: FormEvent) {
    event.preventDefault();
    if (draft.min !== null && draft.max !== null && draft.min > draft.max) { setInvalid(true); return; }
    setGroup(null); update({ ...draft, page: 1 });
  }
  function select(id: string, scroll = false) {
    setSelectedId(id);
    if (!scroll || !resultsRef.current) return;
    const element = [...resultsRef.current.querySelectorAll<HTMLElement>("[data-web-property-id]")].find((card) => card.dataset.webPropertyId === id);
    if (element) resultsRef.current.scrollTo({ top: element.offsetTop - resultsRef.current.offsetTop - 16, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }
  function saveSearch() {
    const title = `${state.query || tx("All Myanmar", "မြန်မာနိုင်ငံတစ်ဝန်း")} · ${state.purpose === "sale" ? tx("For sale", "ရောင်းရန်") : tx("For rent", "ငှားရန်")}`;
    save({ id: crypto.randomUUID(), title, detail: savedSearchesServerBacked ? tx("Saved to your account", "သင့်အကောင့်တွင် သိမ်းထားပါသည်") : tx("Search saved on this browser", "ဤဘရောက်ဇာတွင် ရှာဖွေမှုသိမ်းထားပါသည်"), count: page.total, href: `/search?${webSearchParams({ ...state, page: 1 })}`, notificationsEnabled: false, createdAt: new Date().toISOString() });
    toast({ tone: "success", title: savedSearchesServerBacked ? tx("Search saved to your account", "ရှာဖွေမှုကို သင့်အကောင့်တွင် သိမ်းပြီး") : tx("Search saved on this browser", "ဤဘရောက်ဇာတွင် ရှာဖွေမှုသိမ်းပြီး"), description: tx("Open Plan to return to it. Email alerts are unavailable.", "ပြန်ကြည့်ရန် အစီအစဉ်ကို ဖွင့်ပါ။ အီးမေးလ်အသိပေးချက်များ မရရှိပါ။") });
  }
  const hasFilters = Boolean(state.query || state.min !== null || state.max !== null || state.beds !== null || state.baths !== null || state.type || state.verified || state.furniture || state.amenities.length);
  const title = state.purpose === "sale" ? tx(`${state.query || "Myanmar"} Real Estate & Homes for Sale`, `${state.query || "မြန်မာနိုင်ငံ"} ရောင်းရန်အိမ်ခြံမြေများ`) : tx(`${state.query || "Myanmar"} Rental Listings`, `${state.query || "မြန်မာနိုင်ငံ"} ငှားရန်အိမ်များ`);
  return (
    <WebShell section={state.purpose === "sale" ? "buy" : "rent"} search>
      <div className="web-search-toolbar">
        <form onSubmit={submitSearch} className="web-location-input" role="search"><input aria-label={tx("Location or property name", "နေရာ သို့မဟုတ် အိမ်အမည်")} placeholder={tx("City, township, or property name", "မြို့၊ မြို့နယ် သို့မဟုတ် အိမ်အမည်")} value={input} onChange={(event) => setInput(event.target.value)} />{input && <button type="button" onClick={() => { setInput(""); update({ query: "" }); }} aria-label={tx("Clear location", "နေရာဖယ်ရန်")}><X /></button>}<button type="submit" aria-label={tx("Search properties", "အိမ်များရှာရန်")}><Search /></button></form>
        <label className="web-toolbar-select"><span className="sr-only">{tx("Listing type", "စာရင်းအမျိုးအစား")}</span><select value={state.purpose} onChange={(event) => update({ purpose: event.target.value as WebSearchState["purpose"], min: null, max: null })}><option value="sale">{tx("For sale", "ရောင်းရန်")}</option><option value="rent">{tx("For rent", "ငှားရန်")}</option></select></label>
        <button type="button" className={`web-filter-button ${state.min !== null || state.max !== null ? "is-active" : ""}`} onClick={() => openFilters("price")}>{tx("Price", "ဈေးနှုန်း")}<ChevronDown /></button>
        <button type="button" className={`web-filter-button ${state.beds !== null || state.baths !== null ? "is-active" : ""}`} onClick={() => openFilters("rooms")}>{tx("Beds & baths", "အခန်းများ")}<ChevronDown /></button>
        <button type="button" className={`web-filter-button ${state.type ? "is-active" : ""}`} onClick={() => openFilters("type")}>{state.type ? isMyanmar ? propertyTypeLabelsMy[state.type] : propertyTypeLabels[state.type] : tx("Property type", "အိမ်အမျိုးအစား")}<ChevronDown /></button>
        <button type="button" className="web-filter-button" onClick={() => openFilters("all")} aria-label={tx("Open all filters", "စစ်ထုတ်မှုအားလုံးဖွင့်ရန်")}><SlidersHorizontal />{tx("Filters", "စစ်ထုတ်ရန်")}</button>
        <button type="button" className="web-button web-button-primary" onClick={saveSearch}><Bookmark />{tx("Save search", "ရှာဖွေမှုသိမ်းရန်")}</button>
      </div>
      <div className="web-search-body">
        <div className="web-map-pane"><PropertyMap properties={page.properties} selectedId={selected} onSelect={(id) => select(id, true)} className="web-property-map" showPrivacyNotice={false} showLiveLabel={false} keyboardSelection tileUrl="https://tile.openstreetmap.org/{z}/{x}/{y}.png" /><div className="web-map-note"><MapPin /><span>{loading ? tx("Updating results…", "ရလဒ်များပြင်ဆင်နေသည်…") : tx(`${located.length} homes with locations on this page`, `ဤစာမျက်နှာတွင် တည်နေရာပါ အိမ် ${located.length} လုံး`)}<small>{tx("Listings without coordinates appear in the results only.", "တည်နေရာမပါသောအိမ်များကို ရလဒ်စာရင်းတွင်သာ ဖော်ပြပါသည်။")}</small></span></div></div>
        <section className="web-results-pane" ref={resultsRef} aria-label={tx("Property results", "အိမ်ရှာရလဒ်များ")} aria-busy={loading}>
          <div className="web-results-heading"><h1>{title}</h1><div><p role="status" aria-live="polite">{loading ? tx("Finding homes…", "အိမ်များရှာနေသည်…") : tx(`${page.total.toLocaleString()} results`, `ရလဒ် ${page.total.toLocaleString()} ခု`)}</p><label>{tx("Sort:", "စီရန်:")}<select aria-label={tx("Sort results", "ရလဒ်များစီရန်")} value={state.sort} onChange={(event) => update({ sort: event.target.value as WebSearchState["sort"] })}><option value="newest">{tx("Newest", "အသစ်ဆုံး")}</option><option value="price_asc">{tx("Price: low to high", "ဈေးနှုန်း နည်းမှများ")}</option><option value="price_desc">{tx("Price: high to low", "ဈေးနှုန်း များမှနည်း")}</option><option value="area_desc">{tx("Largest area", "ဧရိယာအများဆုံး")}</option></select></label></div>{hasFilters && <div className="web-applied-filters"><span>{tx("Search filters applied", "စစ်ထုတ်မှုများ အသုံးပြုထားပါသည်")}</span><button type="button" onClick={() => update({ query: "", min: null, max: null, beds: null, baths: null, type: "", verified: false, furniture: "", amenities: [] })}>{tx("Clear filters", "စစ်ထုတ်မှုများဖယ်ရန်")}<X /></button></div>}</div>
          {loading ? <div className="web-results-grid web-result-skeletons" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <div key={index}><span /><i /><i /><i /></div>)}</div> : page.unavailable ? <div className="web-search-empty" role="alert"><Search /><h2>{tx("We couldn't load properties", "အိမ်စာရင်းများ ဖွင့်မရပါ")}</h2><p>{tx("The property service is unavailable. Please try again.", "အိမ်ခြံမြေဝန်ဆောင်မှု မရရှိပါ။ ထပ်မံကြိုးစားပါ။")}</p><button type="button" className="web-button web-button-primary" onClick={retry}>{tx("Try again", "ပြန်ကြိုးစားရန်")}</button></div> : !page.properties.length ? <div className="web-search-empty"><Search /><h2>{tx("No homes found", "အိမ်များမတွေ့ပါ")}</h2><p>{isApiConfigured() ? tx("Try a different location or a wider price range.", "နေရာပြောင်းပြီး သို့မဟုတ် ဈေးနှုန်းအပိုင်းအခြားချဲ့ပြီး ရှာပါ။") : tx("This website has no API configured. Live listings will appear when the property service is connected.", "ဤဝဘ်ဆိုက်တွင် API မချိတ်ဆက်ထားပါ။ အိမ်ခြံမြေဝန်ဆောင်မှု ချိတ်ဆက်ပြီးမှ အိမ်စာရင်းများဖော်ပြပါမည်။")}</p><Link href="/help" className="web-button web-button-outline">{tx("Get help", "အကူအညီ")}</Link></div> : <div className="web-results-grid">{page.properties.map((property) => <WebPropertyCard key={property.id} property={property} savedHomes={savedHomes} selected={selected === property.id} onSelect={select} />)}</div>}
          {!loading && page.totalPages > 1 && <nav className="web-pagination" aria-label={tx("Results pages", "ရလဒ်စာမျက်နှာများ")}><button type="button" disabled={state.page <= 1} onClick={() => { update({ page: state.page - 1 }); resultsRef.current?.scrollTo(0, 0); }}>{tx("Previous", "နောက်သို့")}</button><span>{tx(`Page ${state.page} of ${page.totalPages}`, `စာမျက်နှာ ${state.page} / ${page.totalPages}`)}</span><button type="button" disabled={state.page >= page.totalPages} onClick={() => { update({ page: state.page + 1 }); resultsRef.current?.scrollTo(0, 0); }}>{tx("Next", "ရှေ့သို့")}</button></nav>}
          <p className="web-results-disclaimer">{savedSearchesServerBacked ? tx("Saved searches sync with your account. No email alerts are sent yet.", "သိမ်းထားသောရှာဖွေမှုများသည် သင့်အကောင့်နှင့် ချိတ်ဆက်ထားပါသည်။ အီးမေးလ်အသိပေးချက် မပို့သေးပါ။") : tx("Searches are saved on this browser. No email alerts are sent.", "ရှာဖွေမှုများကို ဤဘရောက်ဇာတွင် သိမ်းပါသည်။ အီးမေးလ်အသိပေးချက် မပို့ပါ။")}</p>
        </section>
      </div>
      <Sheet open={group !== null} onOpenChange={(open) => { if (!open) setGroup(null); }} title={group === "price" ? tx("Price range", "ဈေးနှုန်းအပိုင်းအခြား") : group === "rooms" ? tx("Beds & baths", "အိပ်ခန်းနှင့်ရေချိုးခန်း") : group === "type" ? tx("Property type", "အိမ်အမျိုးအစား") : tx("Filters", "စစ်ထုတ်မှုများ")}>
        <form onSubmit={apply} className="web-filter-form">
          {(group === "price" || group === "all") && <fieldset><legend>{state.purpose === "rent" ? tx("Monthly rent (MMK)", "လစဉ်ငှားရမ်းခ (ကျပ်)") : tx("Purchase price (MMK)", "ဝယ်ယူဈေးနှုန်း (ကျပ်)")}</legend><div className="web-field-pair">{(["min", "max"] as const).map((key) => <label key={key}>{key === "min" ? tx("Minimum", "အနည်းဆုံး") : tx("Maximum", "အများဆုံး")}<input type="number" min="0" step="1" aria-invalid={invalid} value={draft[key] ?? ""} placeholder={tx("Any", "အားလုံး")} onChange={(event) => { setInvalid(false); setDraft({ ...draft, [key]: event.target.value ? Number(event.target.value) : null }); }} /></label>)}</div>{invalid && <p role="alert">{tx("Maximum price must be at least the minimum price.", "အများဆုံးဈေးသည် အနည်းဆုံးဈေးထက် မနည်းရပါ။")}</p>}</fieldset>}
          {(group === "rooms" || group === "all") && <fieldset><legend>{tx("Rooms", "အခန်းများ")}</legend><div className="web-field-pair">{(["beds", "baths"] as const).map((key) => <label key={key}>{key === "beds" ? tx("Bedrooms", "အိပ်ခန်း") : tx("Bathrooms", "ရေချိုးခန်း")}<select value={draft[key] ?? ""} onChange={(event) => setDraft({ ...draft, [key]: event.target.value ? Number(event.target.value) : null })}><option value="">{tx("Any", "အားလုံး")}</option>{[1, 2, 3, 4, 5].map((count) => <option key={count} value={count}>{count}+</option>)}</select></label>)}</div></fieldset>}
          {(group === "type" || group === "all") && <label>{tx("Property type", "အိမ်အမျိုးအစား")}<select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as PropertyType | "" })}><option value="">{tx("All property types", "အိမ်အမျိုးအစားအားလုံး")}</option>{Object.entries(propertyTypeLabels).map(([value, label]) => <option key={value} value={value}>{isMyanmar ? propertyTypeLabelsMy[value as PropertyType] : label}</option>)}</select></label>}
          {group === "all" && <><label>{tx("Furnishing", "ပရိဘောဂ")}<select value={draft.furniture} onChange={(event) => setDraft({ ...draft, furniture: event.target.value as WebSearchState["furniture"] })}><option value="">{tx("Any", "အားလုံး")}</option><option value="UNFURNISHED">{tx("Unfurnished", "ပရိဘောဂမပါ")}</option><option value="PARTLY_FURNISHED">{tx("Partly furnished", "ပရိဘောဂအချို့ပါ")}</option><option value="FULLY_FURNISHED">{tx("Fully furnished", "ပရိဘောဂအပြည့်အစုံပါ")}</option></select></label><fieldset><legend>{tx("Amenities", "အဆင်ပြေမှုများ")}</legend>{[{ value: "parking", en: "Parking", my: "ကားပါကင်" }, { value: "security", en: "Security", my: "လုံခြုံရေး" }, { value: "lift", en: "Lift", my: "ဓာတ်လှေကား" }, { value: "generator", en: "Generator", my: "မီးစက်" }].map((amenity) => <label className="web-checkbox" key={amenity.value}><input type="checkbox" checked={draft.amenities.includes(amenity.value)} onChange={(event) => setDraft({ ...draft, amenities: event.target.checked ? [...draft.amenities, amenity.value] : draft.amenities.filter((item) => item !== amenity.value) })} />{tx(amenity.en, amenity.my)}</label>)}</fieldset><label className="web-checkbox"><input type="checkbox" checked={draft.verified} onChange={(event) => setDraft({ ...draft, verified: event.target.checked })} />{tx("Verified listings only", "စိစစ်ပြီးအိမ်များသာ")}</label></>}
          <div className="web-filter-actions"><button type="submit" className="web-button web-button-primary">{tx("Apply filters", "စစ်ထုတ်မှုများအသုံးပြုရန်")}</button><button type="button" className="web-button web-button-outline" onClick={() => setGroup(null)}>{tx("Cancel", "မလုပ်တော့ပါ")}</button></div>
        </form>
      </Sheet>
    </WebShell>
  );
}
