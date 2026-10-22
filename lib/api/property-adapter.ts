import type { FurnitureStatus, Property, PropertyType, SearchFilters, VerificationStatus } from "@/lib/properties";
import type { ApiProperty, PropertySearchFilters } from "./properties";

/**
 * Translates a server record into the shape every view already consumes, so no
 * component needs to know whether it is looking at live data or the local demo
 * catalog.
 *
 * Nothing is invented here. A field the lister left unset stays null, and the
 * views render "not provided" rather than a placeholder that would read as fact.
 */

const propertyTypes: Record<string, PropertyType> = {
  CONDO: "condo",
  APARTMENT: "apartment",
  HOUSE: "house",
  MINI_CONDO: "mini_condo",
  VILLA: "villa",
  LAND: "land",
  COMMERCIAL: "commercial",
  OFFICE: "office",
  SHOP: "shop",
  OTHER: "other",
};

const furnitureStatuses: Record<string, FurnitureStatus> = {
  UNFURNISHED: "unfurnished",
  PARTLY_FURNISHED: "partly_furnished",
  FULLY_FURNISHED: "fully_furnished",
};

const verificationStatuses: Record<string, VerificationStatus> = {
  VERIFIED: "verified",
  PENDING: "pending",
  UNVERIFIED: "unverified",
  REJECTED: "rejected",
};

export function fromApiProperty(record: ApiProperty): Property {
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    property_type: propertyTypes[record.propertyType] ?? "other",
    purpose: record.listingType === "SALE" ? "sale" : "rent",
    city: record.city,
    township: record.township,
    address: record.address,
    price: record.price,
    currency: record.currency,
    bedrooms: record.bedrooms,
    bathrooms: record.bathrooms,
    area_sqft: record.areaSqft,
    floor: record.floor,
    year_built: record.yearBuilt,
    furniture: record.furniture ? furnitureStatuses[record.furniture] ?? null : null,
    amenities: record.amenities,
    images: record.images.map((image) => image.url),
    owner: {
      id: record.owner.id,
      name: `${record.owner.firstName} ${record.owner.lastName}`.trim(),
      type: record.owner.isAgent ? "agent" : "owner",
      phone_verified: record.owner.phoneVerified,
      response_time_minutes: record.owner.responseTimeMinutes ?? null,
    },
    verification_status: verificationStatuses[record.verificationStatus] ?? "unverified",
    listing_status: record.status,
    rating: record.rating,
    lat: record.latitude,
    lng: record.longitude,
    posted_at: record.createdAt,
    availability_confirmed_at: record.availabilityConfirmedAt,
    expires_at: record.expiresAt,
    documents: record.documents ? record.documents.map(d => ({ id: d.id, url: d.documentUrl, type: d.documentType, status: d.status })) : undefined,
    image_asset_ids: record.images.flatMap((image) => image.uploadId ? [image.uploadId] : []),
  };
}

const apiPropertyTypes: Record<PropertyType, string> = {
  condo: "CONDO",
  apartment: "APARTMENT",
  house: "HOUSE",
  mini_condo: "MINI_CONDO",
  villa: "VILLA",
  land: "LAND",
  commercial: "COMMERCIAL",
  office: "OFFICE",
  shop: "SHOP",
  other: "OTHER",
};

const apiFurniture: Record<FurnitureStatus, "UNFURNISHED" | "PARTLY_FURNISHED" | "FULLY_FURNISHED"> = {
  unfurnished: "UNFURNISHED",
  partly_furnished: "PARTLY_FURNISHED",
  fully_furnished: "FULLY_FURNISHED",
};

/**
 * Maps the UI's filter object onto API query parameters.
 *
 * The API accepts one property type per request while the UI allows several, so
 * a multi-type selection is left to the client-side filter rather than silently
 * narrowed to the first choice.
 */
export function toApiFilters(filters: Partial<SearchFilters> & { page?: number; limit?: number }): PropertySearchFilters {
  const singleType = filters.propertyTypes?.length === 1 ? apiPropertyTypes[filters.propertyTypes[0]] : undefined;
  return {
    ...(filters.location && filters.location !== "All Myanmar" ? { city: filters.location } : {}),
    ...(filters.purpose && filters.purpose !== "all" ? { listingType: filters.purpose === "sale" ? "SALE" : "RENT" } : {}),
    ...(singleType ? { propertyType: singleType } : {}),
    ...(filters.furniture && filters.furniture !== "all" ? { furniture: apiFurniture[filters.furniture] } : {}),
    ...(filters.minPrice !== null && filters.minPrice !== undefined ? { minPrice: filters.minPrice } : {}),
    ...(filters.maxPrice !== null && filters.maxPrice !== undefined ? { maxPrice: filters.maxPrice } : {}),
    ...(filters.bedrooms !== null && filters.bedrooms !== undefined ? { bedrooms: filters.bedrooms } : {}),
    ...(filters.bathrooms !== null && filters.bathrooms !== undefined ? { bathrooms: filters.bathrooms } : {}),
    ...(filters.page ? { page: filters.page } : {}),
    ...(filters.limit ? { limit: filters.limit } : {}),
  };
}
