import { apiRequest, type ApiPage } from "./client";

export interface ApiInquiry {
  id: string;
  seekerId: string;
  listerId: string;
  propertyId: string;
  subject: string;
  message: string;
  status: "NEW" | "READ" | "REPLIED" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  property: { id: string; title: string; city: string; township: string; images: { url: string }[] };
  seeker: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  lister: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
}

export const listInquiries = (page = 1) => apiRequest<ApiPage<ApiInquiry>>(`/inquiries?page=${page}`, { includeMeta: true });
export const getInquiry = (id: string) => apiRequest<ApiInquiry>(`/inquiries/${encodeURIComponent(id)}`);
/** Lister-only badge count of inquiries still marked NEW. */
export const newInquiryCount = () => apiRequest<{ count: number }>("/inquiries/unread-count");
export const createInquiry = (propertyId: string, subject: string, message: string) => apiRequest<ApiInquiry>("/inquiries", { method: "POST", body: { propertyId, subject, message } });
export const updateInquiryStatus = (id: string, status: ApiInquiry["status"]) => apiRequest<ApiInquiry>(`/inquiries/${encodeURIComponent(id)}/status`, { method: "PATCH", body: { status } });
