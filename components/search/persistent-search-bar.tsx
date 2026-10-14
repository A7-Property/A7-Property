"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LocateFixed, MapPin, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { useLanguage } from "@/components/i18n/language-provider";
import type { DiscoveryFilters } from "@/components/search/search-discovery";
import { searchLocations } from "@/lib/properties";

interface PersistentSearchBarProps {
  value: DiscoveryFilters;
  onChange: (filters: DiscoveryFilters) => void;
  onSearch: () => void;
}

interface LocationSuggestion {
  label: string;
  value: string;
  detail: string;
}

const locationSuggestions: LocationSuggestion[] = [
  ...searchLocations.filter((location) => location !== "All Myanmar").map((location) => ({
    label: location,
    value: location,
    detail: location === "Yangon" || location === "Mandalay" ? "City" : "Township, Myanmar",
  })),
  { label: "Hledan", value: "Kamayut", detail: "Landmark · Kamayut, Yangon" },
  { label: "Junction Square", value: "Kamayut", detail: "Landmark · Kamayut, Yangon" },
  { label: "Myanmar Plaza", value: "Bahan", detail: "Landmark · Bahan, Yangon" },
  { label: "Inya Lake", value: "Kamayut", detail: "Landmark · Kamayut, Yangon" },
];

const popularLocations = ["Yangon", "Kamayut", "Bahan", "Sanchaung", "Yankin"];

function PersistentSearchBar({ value, onChange, onSearch }: PersistentSearchBarProps) {
  const { tx } = useLanguage();
  const [query, setQuery] = useState(value.location === "All Myanmar" ? "" : value.location);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [compact, setCompact] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const reduceMotion = useReducedMotion();

  const suggestions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const source = normalized
      ? locationSuggestions.filter((location) => `${location.label} ${location.value} ${location.detail}`.toLowerCase().includes(normalized))
      : popularLocations.map((label) => locationSuggestions.find((location) => location.label === label)).filter((location): location is LocationSuggestion => Boolean(location));
    return source.slice(0, 6);
  }, [query]);

  useEffect(() => {
    function handleOutsidePress(event: PointerEvent) {
      if (!searchRef.current?.contains(event.target as Node)) setSuggestionsOpen(false);
    }
    document.addEventListener("pointerdown", handleOutsidePress);
    return () => document.removeEventListener("pointerdown", handleOutsidePress);
  }, []);

  useEffect(() => {
    function handleScroll() {
      setCompact(window.scrollY > 72);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function chooseLocation(location: LocationSuggestion) {
    setQuery(location.label);
    setSuggestionsOpen(false);
    onChange({ ...value, location: location.value });
    requestAnimationFrame(onSearch);
  }

  function submitSearch() {
    const normalized = query.trim().toLowerCase();
    const suggestion = locationSuggestions.find((item) => item.label.toLowerCase() === normalized)
      ?? locationSuggestions.find((item) => `${item.label} ${item.detail}`.toLowerCase().includes(normalized));
    const location = suggestion?.value ?? (normalized ? value.location : "All Myanmar");
    setQuery(suggestion?.label ?? (location === "All Myanmar" ? "" : location));
    setSuggestionsOpen(false);
    onChange({ ...value, location });
    requestAnimationFrame(onSearch);
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSuggestionsOpen(true);
      if (suggestions.length > 0) setActiveIndex((current) => Math.min(current + 1, suggestions.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (suggestionsOpen && suggestions[activeIndex]) chooseLocation(suggestions[activeIndex]);
      else submitSearch();
    }
    if (event.key === "Escape") setSuggestionsOpen(false);
  }

  return (
    <section className={`sticky top-[72px] z-40 border-b border-[#172B3F]/8 bg-white/86 px-4 shadow-[0_5px_20px_rgba(23,43,63,.045)] backdrop-blur-2xl transition-[padding] duration-200 sm:px-6 lg:px-8 ${compact ? "py-2" : "py-3"}`} aria-label={tx("Property search", "အိမ်ခြံမြေရှာဖွေရေး")}>
      <motion.div
        className="mx-auto max-w-[1480px]"
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.38, ease: [0.22, 1, 0.36, 1] }}
      >
        <div ref={searchRef} className="relative">
          <label className={`flex items-center gap-3 rounded-2xl border border-[#D5DEE8] bg-white px-4 shadow-[0_8px_24px_rgba(23,43,63,.075)] transition-[height,border-color,box-shadow] duration-200 focus-within:border-[#D4A574] focus-within:shadow-[0_0_0_4px_rgba(18,59,115,.12),0_12px_32px_rgba(23,43,63,.1)] sm:px-5 ${compact ? "h-[52px]" : "h-16"}`}>
            <span className="min-w-0 flex-1">
              <input
                role="combobox"
                aria-label={tx("Search by address, township, city or landmark", "လိပ်စာ၊ မြို့နယ်၊ မြို့ သို့မဟုတ် အထင်ကရနေရာဖြင့် ရှာရန်")}
                aria-expanded={suggestionsOpen}
                aria-controls={listboxId}
                aria-autocomplete="list"
                aria-activedescendant={suggestionsOpen && suggestions[activeIndex] ? `${listboxId}-${activeIndex}` : undefined}
                autoComplete="off"
                className={`w-full bg-transparent font-medium text-[#172B3F] placeholder:font-normal placeholder:text-[#9AA6B3] focus-visible:!outline-none ${compact ? "text-sm sm:text-base" : "text-base sm:text-lg"}`}
                placeholder={tx("Address, township, city or landmark", "လိပ်စာ၊ မြို့နယ်၊ မြို့ သို့မဟုတ် အထင်ကရနေရာ")}
                value={query}
                onFocus={() => setSuggestionsOpen(true)}
                onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); setSuggestionsOpen(true); }}
                onKeyDown={handleInputKeyDown}
              />
            </span>
            {query && <button type="button" className="grid size-9 shrink-0 place-items-center rounded-full text-[#667085] transition-colors hover:bg-[#F1F3F6] hover:text-[#101828]" aria-label={tx("Clear location", "နေရာရှင်းရန်")} onClick={() => { setQuery(""); setActiveIndex(0); setSuggestionsOpen(true); onChange({ ...value, location: "All Myanmar" }); }}><X className="size-4" /></button>}
            <motion.button type="button" className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#172B3F] text-white shadow-[0_7px_18px_rgba(23,43,63,.18)] transition-colors hover:bg-[#123B73]" aria-label={tx("Search homes", "အိမ်များရှာရန်")} onClick={submitSearch} whileTap={{ scale: 0.94 }} transition={{ type: "spring", stiffness: 520, damping: 30 }}><Search className="size-5" strokeWidth={2.4} /></motion.button>
          </label>

          <AnimatePresence>
            {suggestionsOpen && (
              <motion.div
                id={listboxId}
                role="listbox"
                className="absolute left-0 right-0 top-[calc(100%+10px)] overflow-hidden rounded-[22px] border border-[#172B3F]/10 bg-white p-2 shadow-[0_24px_65px_rgba(23,43,63,.18)]"
                initial={{ opacity: 0, y: -8, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.99 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex items-center justify-between px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[.1em] text-[#667085]">
                  <span>{query ? tx("Matching locations", "ကိုက်ညီသောနေရာများ") : tx("Popular locations", "လူကြိုက်များသောနေရာများ")}</span>
                  <span className="normal-case tracking-normal text-[#9A9EA4]">Yangon & Mandalay</span>
                </div>
                {suggestions.length > 0 ? suggestions.map((location, index) => (
                  <button
                    id={`${listboxId}-${index}`}
                    key={`${location.label}-${location.value}`}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${index === activeIndex ? "bg-[#F1F6FF]" : "hover:bg-[#EAF4FF]"}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => chooseLocation(location)}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#F1F6FF] text-[#123B73]"><MapPin className="size-[18px]" /></span>
                    <span><strong className="block text-sm font-semibold">{location.label}</strong><span className="mt-0.5 block text-[11px] text-[#667085]">{tx(location.detail, location.detail.replace("City", "မြို့").replace("Township", "မြို့နယ်").replace("Landmark", "အထင်ကရနေရာ"))}</span></span>
                  </button>
                )) : (
                  <div className="flex items-center gap-3 rounded-xl px-3 py-4 text-xs text-[#667085]"><LocateFixed className="size-5 text-[#123B73]" />{tx("Try a township such as Kamayut or Bahan.", "ကမာရွတ် သို့မဟုတ် ဗဟန်းကဲ့သို့ မြို့နယ်တစ်ခုဖြင့် ရှာကြည့်ပါ။")}</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </section>
  );
}

export { PersistentSearchBar };
