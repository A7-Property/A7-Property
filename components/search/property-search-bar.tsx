"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import type { FormEvent } from "react";

import { cn } from "@/lib/utils";

type PropertySearchTab = "rent" | "buy";

interface PropertySearchBarProps {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  activeTab: PropertySearchTab;
  onTabChange: (tab: PropertySearchTab) => void;
  placeholder: string;
  searchLabel: string;
  clearLabel: string;
  tabs: Array<{ id: PropertySearchTab; label: string }>;
  onOpenFilters?: () => void;
  filterCount?: number;
  filterLabel?: string;
  compact?: boolean;
  className?: string;
}

function PropertySearchBar({
  value,
  onValueChange,
  onSubmit,
  onClear,
  activeTab,
  onTabChange,
  placeholder,
  searchLabel,
  clearLabel,
  tabs,
  onOpenFilters,
  filterCount = 0,
  filterLabel = "Open filters",
  compact = false,
  className,
}: PropertySearchBarProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <div className={cn("w-full space-y-2.5", className)}>
      <form onSubmit={submit} role="search" className="flex min-h-[60px] items-center rounded-full border border-[#DDE4EE] bg-white p-1.5 shadow-[0_10px_28px_rgba(24,48,86,.07)] transition-[border-color,box-shadow] duration-[var(--duration-base)] focus-within:border-[#9DBCE8] focus-within:shadow-[0_0_0_3px_rgba(18,59,115,.08),0_12px_30px_rgba(16,24,40,.08)]">
        <button type="submit" className="grid size-11 shrink-0 place-items-center rounded-full text-[#243A60] transition-colors hover:bg-[#F2F6FC] hover:text-a7-blue" aria-label={searchLabel}>
          <Search className="size-[21px]" />
        </button>
        <input
          data-focus-ring="parent"
          type="search"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={placeholder}
          aria-label={searchLabel}
          className="min-h-11 min-w-0 flex-1 appearance-none bg-transparent px-2 text-[14px] text-a7-navy outline-none placeholder:text-[#8190A7] [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button type="button" onClick={onClear} className="grid size-11 shrink-0 place-items-center rounded-full text-[#8A929E] transition-colors hover:bg-[#F3F1ED] hover:text-a7-navy" aria-label={clearLabel}>
            <X className="size-[17px]" />
          </button>
        )}
        {onOpenFilters && (
          <button type="button" onClick={onOpenFilters} className="relative grid size-12 shrink-0 place-items-center rounded-[18px] bg-[#EEF3FF] text-[#0A4BB8] transition-[background-color,color,transform] hover:bg-[#E3EDFF] hover:text-a7-blue active:scale-[.96]" aria-label={filterLabel}>
            <SlidersHorizontal className="size-[19px]" />
            {filterCount > 0 && <span className="absolute -right-0.5 -top-0.5 grid size-[18px] place-items-center rounded-full border-2 border-white bg-a7-blue text-[8px] font-bold leading-none text-white">{filterCount}</span>}
          </button>
        )}
      </form>

      {!compact && (
        <div role="tablist" aria-label="Property search purpose" className="grid grid-cols-3 gap-1.5 rounded-full border border-a7-line bg-white p-1 shadow-[var(--shadow-hairline)]">
          {tabs.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "min-h-11 rounded-full px-2 text-[10px] font-semibold transition-[background-color,color,box-shadow,transform] duration-[var(--duration-base)]",
                  selected
                    ? "bg-a7-blue text-white shadow-[0_4px_12px_rgba(18,59,115,.2)]"
                    : "bg-[#F5F6F7] text-a7-muted hover:bg-[#DCEBFF] hover:text-a7-blue",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { PropertySearchBar };
export type { PropertySearchBarProps, PropertySearchTab };
