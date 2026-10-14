import { apiRequest, buildQuery, type ApiPage } from "./client";

export type ApiVerificationStatus = "VERIFIED" | "PENDING" | "UNVERIFIED" | "REJECTED";
export type ApiPropertyStatus = "DRAFT" | "PUBLISHED" | "PAUSED" | "SOLD" | "RENTED" | "ARCHIVED";

export interface ApiPropertyImage { id: string; url: string; altText: string | null; isPrimary: boolean; uploadId: string | null }

export interface ApiProperty {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  propertyType: string;
  listingType: "RENT" | "SALE";
  price: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  areaSqft: number;
  address: string;
  city: string;
  township: string;
  latitude: number | null;
  longitude: number | null;
  floor: number | null;
  yearBuilt: number | null;
  furniture: "UNFURNISHED" | "PARTLY_FURNISHED" | "FULLY_FURNISHED" | null;
  rating: number | null;
  status: ApiPropertyStatus;
  verificationStatus: ApiVerificationStatus;
  createdAt: string;
  updatedAt: string;
  images: ApiPropertyImage[];
  amenities: string[];
  documents?: { id: string; documentUrl: string; documentType: string; status: ApiVerificationStatus }[];
  owner: { id: string; firstName: string; lastName: string; isAgent: boolean; phoneVerified: boolean; responseTimeMinutes: number | null };
}

export type PropertyPage = ApiPage<ApiProperty>;

export interface PropertySearchFilters {
  city?: string;
  township?: string;
  search?: string;
  propertyType?: string;
  listingType?: "RENT" | "SALE";
  furniture?: ApiProperty["furniture"];
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  minArea?: number;
  maxArea?: number;
  /** Every listed amenity must be present on the result, not just one. */
  amenities?: string[];
  verifiedOnly?: boolean;
  sort?: "newest" | "oldest" | "price_asc" | "price_desc" | "area_desc";
  page?: number;
  limit?: number;
}

export interface OwnerOverview {
  properties: Record<ApiPropertyStatus, number>;
  verification: Record<ApiVerificationStatus, number>;
  inquiries: { total: number; new: number };
  viewings: { total: number; requested: number };
  savedByOthers: number;
}

export function listProperties(filters: PropertySearchFilters = {}) {
  return apiRequest<PropertyPage>(`/properties${buildQuery({ ...filters })}`, { auth: false, includeMeta: true });
}

export const getProperty = (id: string) => apiRequest<ApiProperty>(`/properties/${encodeURIComponent(id)}`, { auth: false });
export const getSimilarProperties = (id: string, limit = 6) => apiRequest<ApiProperty[]>(`/properties/${encodeURIComponent(id)}/similar?limit=${limit}`, { auth: false });

export const myProperties = (filters: { status?: ApiPropertyStatus; search?: string; page?: number; limit?: number } = {}) =>
  apiRequest<PropertyPage>(`/properties/mine${buildQuery({ ...filters })}`, { includeMeta: true });
export const myOverview = () => apiRequest<OwnerOverview>("/properties/mine/overview");

export const createProperty = (input: Record<string, unknown>) => apiRequest<ApiProperty>("/properties", { method: "POST", body: input });
export const updateProperty = (id: string, input: Record<string, unknown>) => apiRequest<ApiProperty>(`/properties/${encodeURIComponent(id)}`, { method: "PATCH", body: input });
export const archiveProperty = (id: string) => apiRequest<ApiProperty>(`/properties/${encodeURIComponent(id)}`, { method: "DELETE" });
export const publishProperty = (id: string) => apiRequest<ApiProperty>(`/properties/${encodeURIComponent(id)}/publish`, { method: "POST" });
export const pauseProperty = (id: string) => apiRequest<ApiProperty>(`/properties/${encodeURIComponent(id)}/pause`, { method: "POST" });
