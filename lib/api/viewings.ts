import { apiRequest, type ApiPage } from "./client";

export type ApiViewingStatus = "REQUESTED" | "CONFIRMED" | "DECLINED" | "CANCELLED" | "COMPLETED";

export interface ApiViewing {
  id: string;
  propertyId: string;
  seekerId: string;
  listerId: string;
  scheduledAt: string;
  note: string | null;
  status: ApiViewingStatus;
  createdAt: string;
  updatedAt: string;
  property: { id: string; title: string; city: string; township: string; address: string; images: { url: string }[] };
  seeker: { id: string; firstName: string; lastName: string; phone: string | null };
  lister: { id: string; firstName: string; lastName: string; phone: string | null };
}

export const listViewings = (page = 1) => apiRequest<ApiPage<ApiViewing>>(`/viewings?page=${page}`, { includeMeta: true });
export const getViewing = (id: string) => apiRequest<ApiViewing>(`/viewings/${encodeURIComponent(id)}`);
export const createViewing = (propertyId: string, scheduledAt: string, note?: string) => apiRequest<ApiViewing>("/viewings", { method: "POST", body: { propertyId, scheduledAt, note } });

/**
 * A seeker may only cancel; a lister confirms, declines, completes or cancels.
 * The backend rejects any other transition.
 */
export const updateViewingStatus = (id: string, status: ApiViewingStatus) => apiRequest<ApiViewing>(`/viewings/${encodeURIComponent(id)}/status`, { method: "PATCH", body: { status } });
export const rescheduleViewing = (id: string, scheduledAt: string) => apiRequest<ApiViewing>(`/viewings/${encodeURIComponent(id)}/reschedule`, { method: "PATCH", body: { scheduledAt } });
export const cancelViewing = (id: string) => updateViewingStatus(id, "CANCELLED");
