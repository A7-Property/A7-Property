import { filterProperties, type Property, type SearchFilters } from "@/lib/properties";

export type LifestyleFilter = "school" | "office" | "market" | "transport";

export interface DiscoveryFilters extends SearchFilters {
  amenities: string[];
  lifestyle: LifestyleFilter[];
  verifiedOnly: boolean;
}

export function createDiscoveryFilters(base: SearchFilters): DiscoveryFilters {
  return { ...base, amenities: [], lifestyle: [], verifiedOnly: false };
}

export const amenityOptions = [
  { value: "security", label: "24-hour security" },
  { value: "lift", label: "Lift" },
  { value: "generator", label: "Backup generator" },
  { value: "air conditioning", label: "Air conditioning" },
] as const;

export const lifestyleOptions: Array<{ value: LifestyleFilter; label: string }> = [
  { value: "school", label: "Near school" },
  { value: "office", label: "Near office" },
  { value: "market", label: "Near market" },
  { value: "transport", label: "Near public transportation" },
];

export function getDiscoveryMeta(property: Property) {
  const seed = Number(property.id.match(/\d+$/)?.[0] ?? 1);
  const lifestyle = new Set<LifestyleFilter>();
  if (["Yankin", "Mayangone", "Bahan"].includes(property.township) || seed % 2 === 0) lifestyle.add("school");
  if (["Bahan", "Dagon", "Yankin", "Kamayut"].includes(property.township) || seed % 5 === 0) lifestyle.add("office");
  if (property.description.toLowerCase().includes("market") || seed % 3 !== 0) lifestyle.add("market");
  if (["Kamayut", "Hlaing", "Sanchaung", "Dagon"].includes(property.township) || seed % 4 !== 0) lifestyle.add("transport");

  return {
    locationQuality: lifestyle.has("transport") ? "Easy transport" : lifestyle.has("school") ? "Family-friendly area" : "Daily essentials nearby",
    lifestyle: [...lifestyle],
    realPhotos: property.images.length >= 3,
  };
}

export function filterDiscoveryProperties(properties: Property[], filters: DiscoveryFilters) {
  return filterProperties(properties, filters).filter((property) => {
    const amenitiesMatch = filters.amenities.every((amenity) => property.amenities.some((item) => item.toLowerCase().includes(amenity)));
    const propertyLifestyle = getDiscoveryMeta(property).lifestyle;
    const lifestyleMatch = filters.lifestyle.every((item) => propertyLifestyle.includes(item));
    const verificationMatch = !filters.verifiedOnly || property.verification_status === "verified";
    return amenitiesMatch && lifestyleMatch && verificationMatch;
  });
}

export function countDiscoveryFilters(filters: DiscoveryFilters) {
  return [
    filters.location !== "All Myanmar",
    filters.minPrice !== null,
    filters.maxPrice !== null,
    filters.purpose !== "rent",
    filters.propertyTypes.length > 0,
    filters.bedrooms !== null,
    filters.bathrooms !== null,
    filters.verifiedOnly,
    filters.furniture !== "all",
    filters.parking,
    filters.amenities.length > 0,
    filters.lifestyle.length > 0,
  ].filter(Boolean).length;
}

export function countAdvancedFilters(filters: DiscoveryFilters) {
  return [filters.furniture !== "all", filters.parking, filters.amenities.length > 0, filters.lifestyle.length > 0].filter(Boolean).length;
}

export function clearAdvancedFilters(filters: DiscoveryFilters): DiscoveryFilters {
  return { ...filters, furniture: "all", parking: false, amenities: [], lifestyle: [] };
}

export function clearRefinementFilters(filters: DiscoveryFilters): DiscoveryFilters {
  return {
    ...clearAdvancedFilters(filters),
    minPrice: null,
    maxPrice: null,
    propertyTypes: [],
    bedrooms: null,
    bathrooms: null,
    verifiedOnly: false,
  };
}
