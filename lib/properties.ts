import { formatMyanmarAmount } from "@/lib/myanmar-numbers";

export type PropertyPurpose = "rent" | "sale";

export interface PropertyOwner {
  id: string;
  name: string;
  type: "owner" | "agent";
  phone_verified: boolean;
  response_time_minutes: number | null;
}

export type PropertyType =
  | "condo"
  | "apartment"
  | "house"
  | "mini_condo"
  | "villa"
  | "land"
  | "commercial"
  | "office"
  | "shop"
  | "other";

export type FurnitureStatus = "unfurnished" | "partly_furnished" | "fully_furnished";

export type VerificationStatus = "verified" | "pending" | "unverified" | "rejected";

export type ListingStatus = "DRAFT" | "PUBLISHED" | "PAUSED" | "SOLD" | "RENTED" | "ARCHIVED";

/**
 * The shape every view consumes. Server-backed records are mapped onto it by
 * `lib/api/property-adapter.ts`, so a component never has to know which source
 * it came from.
 *
 * Fields a real lister may legitimately leave unset are nullable. Do not
 * substitute a placeholder for them: a missing rating is not 0, and a missing
 * coordinate is not the centre of the township.
 */
export interface Property {
  id: string;
  title: string;
  description: string;
  property_type: PropertyType;
  purpose: PropertyPurpose;
  city: string;
  township: string;
  address: string;
  price: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  area_sqft: number;
  floor: number | null;
  year_built: number | null;
  furniture: FurnitureStatus | null;
  amenities: string[];
  images: string[];
  owner: PropertyOwner;
  verification_status: VerificationStatus;
  /** The lister's own view of a listing; "PUBLISHED" for every record from the device catalog. */
  listing_status: ListingStatus;
  rating: number | null;
  lat: number | null;
  lng: number | null;
  posted_at: string;
  documents?: { id?: string; url: string; type: string; status?: string }[];
  image_asset_ids?: string[];
}

export interface SearchFilters {
  location: string;
  minPrice: number | null;
  maxPrice: number | null;
  purpose: "all" | PropertyPurpose;
  propertyTypes: PropertyType[];
  bedrooms: number | null;
  bathrooms: number | null;
  furniture: "all" | FurnitureStatus;
  parking: boolean;
}

export type PropertySort = "recommended" | "newest" | "price-asc" | "price-desc";

export const defaultSearchFilters: SearchFilters = {
  location: "All Myanmar",
  minPrice: null,
  maxPrice: null,
  purpose: "rent",
  propertyTypes: [],
  bedrooms: null,
  bathrooms: null,
  furniture: "all",
  parking: false,
};

export const propertyTypeLabels: Record<PropertyType, string> = {
  condo: "Condo",
  apartment: "Apartment",
  house: "House",
  mini_condo: "Mini condo",
  villa: "Villa",
  land: "Land",
  commercial: "Commercial",
  office: "Office",
  shop: "Shop",
  other: "Other",
};

/** Myanmar labels live beside the English ones so every surface stays in step. */
export const propertyTypeLabelsMy: Record<PropertyType, string> = {
  condo: "ကွန်ဒို",
  apartment: "တိုက်ခန်း",
  house: "အိမ်",
  mini_condo: "မီနီကွန်ဒို",
  villa: "ဗီလာ",
  land: "မြေကွက်",
  commercial: "စီးပွားရေးအသုံး",
  office: "ရုံးခန်း",
  shop: "ဆိုင်ခန်း",
  other: "အခြား",
};

export const furnitureLabels: Record<FurnitureStatus, string> = {
  unfurnished: "Unfurnished",
  partly_furnished: "Partly furnished",
  fully_furnished: "Fully furnished",
};

export const furnitureLabelsMy: Record<FurnitureStatus, string> = {
  unfurnished: "ပရိဘောဂမပါ",
  partly_furnished: "ပရိဘောဂအချို့ပါ",
  fully_furnished: "ပရိဘောဂအပြည့်အစုံပါ",
};

export const searchLocations = [
  "All Myanmar",
  "Yangon",
  "Mandalay",
  "Bahan",
  "Kamayut",
  "Hlaing",
  "Yankin",
  "Sanchaung",
  "Dagon",
  "Mayangone",
  "Chanmyathazi",
  "Aungmyaythazan",
] as const;

export type PriceLanguage = "en" | "my";

export function formatPropertyPrice(property: Pick<Property, "price" | "currency" | "purpose">, lang: PriceLanguage = "en") {
  if (lang === "my") {
    const isSale = property.purpose === "sale";
    const value = isSale ? property.price / 1_000_000 : property.price / 100_000;
    const unit = isSale ? "သန်း" : "သိန်း";
    return `${formatMyanmarAmount(value)} ${unit}`;
  }
  if (property.purpose === "sale") return `${property.price / 1_000_000}M ${property.currency}`;
  return `${new Intl.NumberFormat("en-US").format(property.price)} ${property.currency}`;
}

export function formatCompactPrice(property: Pick<Property, "price" | "purpose">, lang: PriceLanguage = "en") {
  if (lang === "my") {
    const isSale = property.purpose === "sale";
    const value = isSale ? property.price / 1_000_000 : property.price / 100_000;
    const unit = isSale ? "သန်း" : "သိန်း";
    return `${formatMyanmarAmount(value)} ${unit}`;
  }
  if (property.purpose === "sale") return `${property.price / 1_000_000}M`;
  if (property.price >= 1_000_000) return `${(property.price / 1_000_000).toFixed(1)}M`;
  return `${property.price / 1_000}K`;
}

export function filterProperties(properties: Property[], filters: SearchFilters) {
  const location = filters.location.toLowerCase();
  return properties.filter((property) => {
    const matchesLocation = location === "all myanmar"
      || property.city.toLowerCase() === location
      || property.township.toLowerCase() === location;
    const matchesPurpose = filters.purpose === "all" || property.purpose === filters.purpose;
    const matchesType = filters.propertyTypes.length === 0 || filters.propertyTypes.includes(property.property_type);
    const matchesMin = filters.minPrice === null || property.price >= filters.minPrice;
    const matchesMax = filters.maxPrice === null || property.price <= filters.maxPrice;
    const matchesBedrooms = filters.bedrooms === null || property.bedrooms >= filters.bedrooms;
    const matchesBathrooms = filters.bathrooms === null || property.bathrooms >= filters.bathrooms;
    const matchesFurniture = filters.furniture === "all" || property.furniture === filters.furniture;
    const matchesParking = !filters.parking || property.amenities.some((item) => item.toLowerCase().includes("parking"));
    return matchesLocation && matchesPurpose && matchesType && matchesMin && matchesMax && matchesBedrooms && matchesBathrooms && matchesFurniture && matchesParking;
  });
}

export function sortProperties(properties: Property[], sort: PropertySort) {
  const sorted = [...properties];
  if (sort === "price-asc") return sorted.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") return sorted.sort((a, b) => b.price - a.price);
  // The demo dataset has no publication timestamp. Its sequential IDs are the
  // only listing-recency signal, so do not mislabel the construction year as new.
  if (sort === "newest") return sorted.sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));
  return sorted.sort((a, b) => {
    const verification = Number(b.verification_status === "verified") - Number(a.verification_status === "verified");
    // An unrated listing sorts after a rated one rather than ahead of a 0.0.
    return verification || (b.rating ?? -1) - (a.rating ?? -1) || a.price - b.price;
  });
}

export function listingVerificationLabel(property: Pick<Property, "verification_status">) {
  if (property.verification_status === "verified") return "Verified listing";
  if (property.verification_status === "pending") return "Verification pending";
  if (property.verification_status === "rejected") return "Verification rejected";
  return "Unverified listing";
}

export function contactVerificationLabel(owner: Pick<PropertyOwner, "type" | "phone_verified">) {
  const role = owner.type === "agent" ? "agent" : "owner";
  return owner.phone_verified ? `Phone-verified ${role}` : `${role[0].toUpperCase()}${role.slice(1)} contact not verified`;
}

export function countActiveFilters(filters: SearchFilters) {
  return [
    filters.location !== "All Myanmar",
    filters.minPrice !== null,
    filters.maxPrice !== null,
    filters.purpose !== "all",
    filters.propertyTypes.length > 0,
    filters.bedrooms !== null,
    filters.bathrooms !== null,
    filters.furniture !== "all",
    filters.parking,
  ].filter(Boolean).length;
}

export function getListerPropertyPage(properties: Property[], options: {
  query: string;
  status: ListingStatus | "all";
  purpose: Property["purpose"] | "all";
  page: number;
  pageSize?: number;
}) {
  const query = options.query.trim().toLocaleLowerCase();
  const filtered = properties.filter((property) =>
    (options.status === "all" || property.listing_status === options.status) &&
    (options.purpose === "all" || property.purpose === options.purpose) &&
    (!query || `${property.title} ${property.township} ${property.address} ${property.id}`.toLocaleLowerCase().includes(query)),
  );
  const pageSize = Math.max(1, Math.floor(options.pageSize ?? 6));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.max(1, Math.min(pages, Math.floor(options.page) || 1));
  const start = (page - 1) * pageSize;
  return { items: filtered.slice(start, start + pageSize), total: filtered.length, page, pages, first: filtered.length ? start + 1 : 0, last: Math.min(start + pageSize, filtered.length) };
}
