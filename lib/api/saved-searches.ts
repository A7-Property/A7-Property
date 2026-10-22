import { apiRequest } from "./client";

export interface ApiSavedSearch {
  id: string;
  title: string;
  detail: string;
  href: string;
  filters: Record<string, unknown>;
  notificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SavedSearchInput {
  title: string;
  detail: string;
  href: string;
  filters: Record<string, unknown>;
  notificationsEnabled?: boolean;
}

export const listSavedSearches = () => apiRequest<ApiSavedSearch[]>("/saved-searches");
export const createSavedSearch = (input: SavedSearchInput) => apiRequest<ApiSavedSearch>("/saved-searches", { method: "POST", body: input });
export const updateSavedSearch = (id: string, patch: Pick<Partial<SavedSearchInput>, "title" | "detail" | "notificationsEnabled">) => apiRequest<ApiSavedSearch>(`/saved-searches/${encodeURIComponent(id)}`, { method: "PATCH", body: patch });
export const deleteSavedSearch = (id: string) => apiRequest<{ success: boolean }>(`/saved-searches/${encodeURIComponent(id)}`, { method: "DELETE" });
