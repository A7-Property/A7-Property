import { apiRequest, type ApiPage } from "./client";
import type { ApiProperty } from "./properties";

export interface SavedProperty { id: string; createdAt: string; property: ApiProperty }

export const listSaved = (page = 1) => apiRequest<ApiPage<SavedProperty>>(`/saved-properties?page=${page}`, { includeMeta: true });
/** Ids only, for rendering save state across a results grid in one request. */
export const listSavedIds = () => apiRequest<string[]>("/saved-properties/ids");
export const saveProperty = (id: string) => apiRequest<{ id: string; userId: string; propertyId: string }>(`/saved-properties/${encodeURIComponent(id)}`, { method: "POST" });
export const removeSaved = (id: string) => apiRequest<{ success: boolean }>(`/saved-properties/${encodeURIComponent(id)}`, { method: "DELETE" });
