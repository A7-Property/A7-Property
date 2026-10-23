"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Heart, MapPin, RotateCcw, SearchX } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { DiscoveryFilterSidebar } from "@/components/search/discovery-filter-sidebar";
import { useLanguage } from "@/components/i18n/language-provider";
import { DiscoveryToolbar } from "@/components/search/discovery-toolbar";
import { PersistentSearchBar } from "@/components/search/persistent-search-bar";
import {
  clearAdvancedFilters,
  clearRefinementFilters,
  createDiscoveryFilters,
  filterDiscoveryProperties,
  type DiscoveryFilters,
} from "@/components/search/search-discovery";
import { QuickFilterBar } from "@/components/search/quick-filter-bar";
import { SearchMapPanel } from "@/components/search/search-map-panel";
import { SearchNavbar } from "@/components/search/search-navbar";
import { SearchPropertyCard } from "@/components/search/search-property-card";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useSavedHomes } from "@/hooks/use-saved-homes";
import {
  defaultSearchFilters,
  sortProperties,
  type Property,
  type PropertySort,
} from "@/lib/properties";

function PropertySearch({ properties }: { properties: Property[] }) {
  const { tx } = useLanguage();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const initialPurpose = searchParams.get("purpose") === "sale" ? "sale" : "rent";
  const sellJourney = initialPurpose === "sale" && searchParams.get("journey") === "sell";
  const initialLocation = searchParams.get("location") ?? "All Myanmar";
  const initialType = searchParams.get("type") as Property["property_type"] | null;
  const initialMinPrice = Number(searchParams.get("minPrice"));
  const initialMaxPrice = Number(searchParams.get("maxPrice"));
  const initialBedrooms = Number(searchParams.get("bedrooms"));
  const initialBathrooms = Number(searchParams.get("bathrooms"));
  const initialSort = searchParams.get("sort");
  const initialFilters = createDiscoveryFilters({
    ...defaultSearchFilters,
    purpose: initialPurpose,
    location: initialLocation,
    propertyTypes: initialType ? [initialType] : [],
    minPrice: Number.isFinite(initialMinPrice) && initialMinPrice > 0 ? initialMinPrice : null,
    maxPrice: Number.isFinite(initialMaxPrice) && initialMaxPrice > 0 ? initialMaxPrice : null,
    bedrooms: Number.isFinite(initialBedrooms) && initialBedrooms > 0 ? initialBedrooms : null,
    bathrooms: Number.isFinite(initialBathrooms) && initialBathrooms > 0 ? initialBathrooms : null,
  });
  initialFilters.verifiedOnly = searchParams.get("verified") === "1";

  const [filters, setFilters] = useState<DiscoveryFilters>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<DiscoveryFilters>(initialFilters);
  const [sort, setSort] = useState<PropertySort>(initialSort === "newest" || initialSort === "price-asc" ? initialSort : "recommended");
  const [mapOpen, setMapOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { savedIds: saved, toggleSaved, canOfferSave } = useSavedHomes();
  const [saveNotice, setSaveNotice] = useState<{ id: string; title: string; saved: boolean } | null>(null);
  const [visibleCount, setVisibleCount] = useState(24);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
  }, []);

  useEffect(() => {
    if (!saveNotice) return;
    const timer = window.setTimeout(() => setSaveNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [saveNotice]);

  const results = useMemo(
    () => sortProperties(filterDiscoveryProperties(properties, filters), sort),
    [properties, filters, sort],
  );

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("purpose", filters.purpose);
    if (filters.purpose === "sale" && sellJourney) params.set("journey", "sell");
    if (filters.location !== "All Myanmar") params.set("location", filters.location);
    if (filters.minPrice !== null) params.set("minPrice", String(filters.minPrice));
    if (filters.maxPrice !== null) params.set("maxPrice", String(filters.maxPrice));
    if (filters.propertyTypes[0]) params.set("type", filters.propertyTypes[0]);
    if (filters.bedrooms !== null) params.set("bedrooms", String(filters.bedrooms));
    if (filters.bathrooms !== null) params.set("bathrooms", String(filters.bathrooms));
    if (filters.verifiedOnly) params.set("verified", "1");
    if (sort !== "recommended") params.set("sort", sort);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [filters, pathname, router, sellJourney, sort]);

  useEffect(() => {
    if (results.length === 0) return;
    if (!selectedId || !results.some((property) => property.id === selectedId)) {
      queueMicrotask(() => setSelectedId(results[0].id));
    }
  }, [results, selectedId]);

  function handleToggleSaved(property: Property) {
    const isSaving = !saved.includes(property.id);
    void toggleSaved(property).then(({ applied }) => {
      if (applied) setSaveNotice({ id: property.id, title: property.title, saved: isSaving });
    });
  }

  function openMoreFilters() {
    setDraftFilters(filters);
    setFilterOpen(true);
  }

  function applyMobileFilters() {
    setFilters(draftFilters);
    setFilterOpen(false);
    requestAnimationFrame(() => document.getElementById("search-results")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function clearFilters() {
    const reset = clearRefinementFilters(filters);
    setFilters(reset);
    setDraftFilters(reset);
  }

  function runSearch() {
    document.getElementById("search-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const cardInitial = reduceMotion ? false : { opacity: 0, y: 10 };
  const cardTransition = { duration: reduceMotion ? 0 : 0.22 };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_82%_-5%,rgba(18,59,115,.075),transparent_28rem),#F5F7FB] pb-20 md:pb-0">
      <SearchNavbar savedCount={saved.length} />
      <PersistentSearchBar value={filters} onChange={setFilters} onSearch={runSearch} />

      <main id="search-results" className="mx-auto w-full max-w-[1600px] scroll-mt-[185px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="min-w-0">
            <DiscoveryToolbar count={results.length} location={filters.location} purpose={filters.purpose} sort={sort} onSortChange={setSort} mapOpen={mapOpen} onMapToggle={() => setMapOpen((value) => !value)} />
            <QuickFilterBar value={filters} onChange={setFilters} onOpenMore={openMoreFilters} onClear={clearFilters} />

            {results.length === 0 ? (
              <SearchEmptyState location={filters.location} onClear={clearFilters} onLocation={(location) => setFilters({ ...clearRefinementFilters(filters), location })} />
            ) : mapOpen ? (
              <div className="mt-5 xl:grid xl:grid-cols-[minmax(480px,1fr)_minmax(360px,.82fr)] xl:items-start xl:gap-4 2xl:grid-cols-[minmax(560px,1.05fr)_minmax(420px,.95fr)]">
                <motion.div layout className="hidden gap-4 xl:grid">
                  <AnimatePresence initial={false}>
                    {results.slice(0, 18).map((property) => (
                      <motion.div key={property.id} layout initial={cardInitial} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98 }} transition={cardTransition}>
                        <SearchPropertyCard property={property} isFavorite={saved.includes(property.id)} selected={selectedId === property.id} onFavoriteToggle={canOfferSave ? handleToggleSaved : undefined} onFocus={(item) => setSelectedId(item.id)} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
                <SearchMapPanel className="h-[calc(100vh-220px)] min-h-[540px] xl:sticky xl:top-[185px]" properties={results} selectedId={selectedId} onSelect={setSelectedId} />
              </div>
            ) : (
              <motion.div layout className="mt-5 grid gap-4 xl:grid-cols-2">
                <AnimatePresence initial={false}>
                  {results.slice(0, visibleCount).map((property) => (
                    <motion.div key={property.id} layout initial={cardInitial} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98 }} transition={cardTransition}>
                      <SearchPropertyCard property={property} isFavorite={saved.includes(property.id)} selected={false} onFavoriteToggle={canOfferSave ? handleToggleSaved : undefined} onFocus={(item) => setSelectedId(item.id)} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            {results.length > visibleCount && !mapOpen && <div className="mt-8 flex justify-center"><Button variant="outline" className="h-12 px-6 text-xs" onClick={() => setVisibleCount((count) => count + 24)}>{tx("Show more homes", "နောက်ထပ်အိမ်များ ပြရန်")}</Button></div>}
        </section>
      </main>

      <AnimatePresence>
        {saveNotice && (
          <motion.div
            key={`${saveNotice.id}-${saveNotice.saved}`}
            initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            role="status"
            aria-live="polite"
            className="fixed inset-x-3 bottom-[82px] z-[70] mx-auto flex max-w-[430px] items-center gap-3 rounded-[18px] border border-[#172B3F]/10 bg-[#172B3F]/96 p-3.5 text-white shadow-[0_18px_46px_rgba(23,43,63,.28)] backdrop-blur-xl md:inset-x-auto md:bottom-6 md:right-6 md:w-[410px]"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/12 text-[#9EC7FF]">
              <Heart className="size-[18px]" fill={saveNotice.saved ? "currentColor" : "none"} />
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block text-[12px]">{saveNotice.saved ? tx("Saved to My Homes", "ကျွန်ုပ်၏အိမ်များတွင် သိမ်းပြီး") : tx("Removed from saved homes", "သိမ်းထားသောအိမ်များမှ ဖယ်ရှားပြီး")}</strong>
              <small className="mt-1 block truncate text-[10px] text-white/62">{saveNotice.title}</small>
            </span>
            {saveNotice.saved && (
              <Link href="/saved" className="shrink-0 rounded-full bg-white px-3 py-2 text-[10px] font-semibold text-[#17304A] transition-transform hover:-translate-y-0.5">
                {tx("View saved", "သိမ်းထားသည်ကို ကြည့်ရန်")}
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        title={tx("More filters", "နောက်ထပ်စစ်ထုတ်ရန်")}
        description={tx("Choose furniture, parking, amenities and nearby essentials", "ပရိဘောဂ၊ ကားပါကင်၊ ဝန်ဆောင်မှုများနှင့် အနီးအနားလိုအပ်ချက်များကို ရွေးပါ")}
        side="bottom"
        footer={<div className="grid grid-cols-[1fr_1.4fr] gap-2"><Button variant="outline" onClick={() => setDraftFilters(clearAdvancedFilters(draftFilters))}>{tx("Clear", "ရှင်းရန်")}</Button><Button className="!text-white" onClick={applyMobileFilters}>{tx(`Show ${filterDiscoveryProperties(properties, draftFilters).length} homes`, `အိမ် ${filterDiscoveryProperties(properties, draftFilters).length} လုံး ပြရန်`)}</Button></div>}
      >
        <DiscoveryFilterSidebar className="p-5 pb-8" value={draftFilters} onChange={setDraftFilters} />
      </Sheet>
    </div>
  );
}

function SearchEmptyState({ location, onClear, onLocation }: { location: string; onClear: () => void; onLocation: (location: string) => void }) {
  const { tx } = useLanguage();
  const nearby = ["Kamayut", "Bahan", "Sanchaung"].filter((item) => item !== location);
  return (
    <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-dashed border-[#9FC4FF] bg-white p-8 text-center shadow-[0_8px_26px_rgba(42,42,51,.06)] sm:p-10">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#F1F6FF] text-[#123B73]"><SearchX className="size-6" /></div>
      <h2 className="mt-5 text-xl font-semibold tracking-[-0.03em]">{tx("No exact matches yet", "အတိအကျကိုက်ညီသောအိမ် မတွေ့သေးပါ")}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#667085]">{tx("Try a nearby township or remove one filter. We’ll keep your Rent/Buy choice unchanged.", "အနီးအနားမြို့နယ်တစ်ခုကို စမ်းကြည့်ပါ သို့မဟုတ် စစ်ထုတ်မှုတစ်ခုဖယ်ပါ။ ငှားရန်/ဝယ်ရန် ရွေးချယ်မှုကို မပြောင်းဘဲထားမည်။")}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {nearby.map((item) => <button key={item} type="button" onClick={() => onLocation(item)} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#B9BEC4] bg-white px-4 text-xs font-semibold hover:border-[#123B73] hover:text-[#123B73]"><MapPin className="size-4" />{item}</button>)}
      </div>
      <button type="button" onClick={onClear} className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#123B73] hover:text-[#003F91]"><RotateCcw className="size-4" />{tx("Clear filters", "စစ်ထုတ်မှုများ ရှင်းရန်")}</button>
    </div>
  );
}

export { PropertySearch };
