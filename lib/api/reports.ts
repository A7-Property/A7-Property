import { apiRequest } from "./client";

export type PropertyReportReason = "SUSPECTED_SCAM" | "INCORRECT_INFORMATION" | "DUPLICATE_LISTING" | "UNAVAILABLE_PROPERTY" | "OTHER";

export function createPropertyReport(propertyId: string, input: { reason: PropertyReportReason; details?: string }) {
  return apiRequest<{ id: string }>(`/properties/${encodeURIComponent(propertyId)}/reports`, { method: "POST", body: input });
}
