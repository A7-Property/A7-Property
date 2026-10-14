import { propertyTypeLabels, type PropertyPurpose, type PropertyType } from "./properties";
import type { PropertySearchFilters } from "./api/properties";

export interface WebSearchState {
  purpose: PropertyPurpose;
  query: string;
  min: number | null;
  max: number | null;
  beds: number | null;
  baths: number | null;
  type: PropertyType | "";
  verified: boolean;
  furniture: "" | "UNFURNISHED" | "PARTLY_FURNISHED" | "FULLY_FURNISHED";
  amenities: string[];
  sort: "newest" | "price_asc" | "price_desc" | "area_desc";
  page: number;
}

function number(value: string | null, max = Number.MAX_SAFE_INTEGER) {
  if (value === null || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= max ? parsed : null;
}

function rooms(value: string | null) {
  const parsed = number(value, 50);
  return parsed !== null && Number.isInteger(parsed) ? parsed : null;
}

export function parseWebSearch(params: { get: (key: string) => string | null }): WebSearchState {
  const type = params.get("type") ?? params.get("types") ?? "";
  const sort = (params.get("sort") ?? "newest").replace("price-", "price_");
  const furniture = params.get("furniture") ?? "";
  const purpose = params.get("purpose");
  return {
    purpose: purpose === "rent" || purpose === "sale" ? purpose : params.get("mode") === "buy" ? "sale" : "rent",
    query: params.get("q") ?? params.get("location") ?? "",
    min: number(params.get("min")), max: number(params.get("max")),
    beds: rooms(params.get("beds")), baths: rooms(params.get("baths")),
    type: Object.hasOwn(propertyTypeLabels, type) ? type as PropertyType : "",
    verified: params.get("verified") === "1",
    furniture: ["UNFURNISHED", "PARTLY_FURNISHED", "FULLY_FURNISHED"].includes(furniture) ? furniture as WebSearchState["furniture"] : "",
    amenities: (params.get("amenities") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
    sort: ["price_asc", "price_desc", "area_desc"].includes(sort) ? sort as WebSearchState["sort"] : "newest",
    page: Math.max(1, Math.floor(number(params.get("page"), 100000) ?? 1)),
  };
}

export function webSearchParams(state: WebSearchState) {
  const params = new URLSearchParams({ purpose: state.purpose });
  if (state.query.trim()) params.set("q", state.query.trim());
  for (const key of ["min", "max", "beds", "baths"] as const) if (state[key] !== null) params.set(key, String(state[key]));
  if (state.type) params.set("type", state.type);
  if (state.verified) params.set("verified", "1");
  if (state.furniture) params.set("furniture", state.furniture);
  if (state.amenities.length) params.set("amenities", state.amenities.join(","));
  if (state.sort !== "newest") params.set("sort", state.sort);
  if (state.page > 1) params.set("page", String(state.page));
  return params;
}

export function webApiFilters(state: WebSearchState): PropertySearchFilters {
  return {
    listingType: state.purpose === "sale" ? "SALE" : "RENT",
    search: state.query.trim() || undefined,
    propertyType: state.type ? state.type.toUpperCase() : undefined,
    minPrice: state.min ?? undefined, maxPrice: state.max ?? undefined,
    bedrooms: state.beds ?? undefined, bathrooms: state.baths ?? undefined,
    verifiedOnly: state.verified || undefined,
    furniture: state.furniture || undefined,
    amenities: state.amenities.length ? state.amenities : undefined,
    sort: state.sort, page: state.page, limit: 24,
  };
}
