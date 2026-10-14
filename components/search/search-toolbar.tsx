"use client";

import { Map, Rows3, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PropertySort } from "@/lib/properties";

interface SearchToolbarProps {
  count: number;
  location: string;
  sort: PropertySort;
  onSortChange: (sort: PropertySort) => void;
  mapOpen: boolean;
  onMapToggle: () => void;
  activeFilters: number;
  onOpenFilters: () => void;
}

function SearchToolbar({ count, location, sort, onSortChange, mapOpen, onMapToggle, activeFilters, onOpenFilters }: SearchToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#101828]/8 pb-4">
      <div><h1 className="text-xl font-semibold tracking-[-0.03em] sm:text-2xl">Homes in {location === "All Myanmar" ? "Myanmar" : location}</h1><p className="mt-1 text-[11px] text-[#667085]">{count} matching listings</p></div>
      <div className="flex items-center gap-2">
        <Button variant="outline" className="relative h-11 px-3 text-xs lg:hidden" onClick={onOpenFilters}><SlidersHorizontal className="size-4" />Filters{activeFilters > 0 && <span className="grid size-5 place-items-center rounded-full bg-[#123B73] text-[9px] text-white">{activeFilters}</span>}</Button>
        <label className="hidden sm:block"><span className="sr-only">Sort properties</span><select value={sort} onChange={(event) => onSortChange(event.target.value as PropertySort)} className="h-11 rounded-xl border border-[#101828]/12 bg-white px-3 text-xs font-medium outline-none focus:border-[#123B73]"><option value="recommended">Recommended</option><option value="newest">Newest</option><option value="price-asc">Price low–high</option></select></label>
        <Button variant="outline" className="h-11 px-3 text-xs" onClick={onMapToggle}>{mapOpen ? <Rows3 className="size-4" /> : <Map className="size-4" />}{mapOpen ? "List" : "Map"}<span className="hidden sm:inline"> view</span></Button>
      </div>
      <label className="w-full sm:hidden"><span className="sr-only">Sort properties</span><select value={sort} onChange={(event) => onSortChange(event.target.value as PropertySort)} className="h-11 w-full rounded-xl border border-[#101828]/12 bg-white px-3 text-xs font-medium outline-none"><option value="recommended">Recommended</option><option value="newest">Newest</option><option value="price-asc">Price low–high</option></select></label>
    </div>
  );
}

export { SearchToolbar };
