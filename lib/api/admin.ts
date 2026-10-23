import { apiRequest, buildQuery, type ApiPage } from "./client";
import type { ApiUser } from "./auth";
import type { ApiProperty, ApiPropertyStatus, ApiVerificationStatus } from "./properties";

export interface AdminOverview {
  users: { total: number; active: number; locked: number; listers: number; seekers: number };
  properties: { total: number; published: number; pendingReview: number; staleReview: number; verified: number };
  inquiries: { total: number; new: number };
  viewings: { total: number; requested: number };
  reports: { pending: number };
  verificationDocuments: { pending: number };
}

export type AdminProperty = ApiProperty;

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  ip: string | null;
  userAgent: string | null;
  metadata: unknown;
  createdAt: string;
  actor?: { id: string; email: string; role: string } | null;
}

export interface VerificationDocument {
  id: string;
  documentType: string;
  documentUrl: string;
  status: ApiVerificationStatus;
  rejectionNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminVerificationDocument extends VerificationDocument {
  user: AdminUser;
}

export interface AdminUser extends ApiUser {
  isActive: boolean;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  deactivatedAt: string | null;
  createdAt: string;
  verificationDocs?: VerificationDocument[];
  _count?: { properties: number; sentInquiries: number; receivedInquiries: number };
}

export interface AdminPropertyReport {
  id: string;
  reason: "SUSPECTED_SCAM" | "INCORRECT_INFORMATION" | "DUPLICATE_LISTING" | "UNAVAILABLE_PROPERTY" | "OTHER";
  details: string;
  status: "PENDING" | "RESOLVED" | "DISMISSED";
  resolutionNote?: string | null;
  createdAt: string;
  property: { id: string; title: string; status: string; verificationStatus: string };
  reporter: { id: string; email: string; firstName: string; lastName: string };
}

export const getOverview = () => apiRequest<AdminOverview>("/admin/overview");

export const getProperties = (filters: {
  verificationStatus?: ApiVerificationStatus;
  status?: ApiPropertyStatus;
  search?: string;
  page?: number;
  limit?: number;
} = {}) => apiRequest<ApiPage<AdminProperty>>(`/admin/properties${buildQuery(filters)}`, { includeMeta: true });

export const setPropertyVerification = (id: string, status: "VERIFIED" | "REJECTED" | "PENDING", note?: string) =>
  apiRequest<AdminProperty>(`/admin/properties/${encodeURIComponent(id)}/verification`, {
    method: "PATCH",
    body: { status, note },
  });

export const getUsers = (filters: {
  role?: "SEEKER" | "LISTER";
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
} = {}) => apiRequest<ApiPage<AdminUser>>(`/admin/users${buildQuery(filters)}`, { includeMeta: true });

export const setUserStatus = (id: string, isActive: boolean, reason?: string) =>
  apiRequest<AdminUser>(`/admin/users/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: { isActive, reason },
  });

export const unlockUser = (id: string) =>
  apiRequest<{ success: boolean }>(`/admin/users/${encodeURIComponent(id)}/unlock`, { method: "POST" });

export const verifyUserEmail = (id: string) =>
  apiRequest<AdminUser>(`/admin/users/${encodeURIComponent(id)}/verify-email`, { method: "POST" });

export const deleteUser = (id: string) =>
  apiRequest<{ success: boolean }>(`/admin/users/${encodeURIComponent(id)}/delete`, { method: "POST" });

export const getAuditLogs = (filters: {
  search?: string;
  action?: string;
  page?: number;
  limit?: number;
} = {}) => apiRequest<ApiPage<AuditLogEntry>>(`/admin/audit-logs${buildQuery(filters)}`, { includeMeta: true });

export const getVerificationDocuments = (filters: {
  status?: ApiVerificationStatus;
  page?: number;
  limit?: number;
} = {}) => apiRequest<ApiPage<AdminVerificationDocument>>(`/admin/verification-documents${buildQuery(filters)}`, { includeMeta: true });

export const getPropertyReports = (filters: {
  status?: AdminPropertyReport["status"];
  search?: string;
  page?: number;
  limit?: number;
} = {}) => apiRequest<ApiPage<AdminPropertyReport>>(`/admin/property-reports${buildQuery(filters)}`, { includeMeta: true });

export const decidePropertyReport = (id: string, status: "RESOLVED" | "DISMISSED", resolutionNote: string) =>
  apiRequest<AdminPropertyReport>(`/admin/property-reports/${encodeURIComponent(id)}`, { method: "PATCH", body: { status, resolutionNote } });

export const setVerificationDocumentStatus = (id: string, status: "VERIFIED" | "REJECTED", rejectionNote?: string) =>
  apiRequest<AdminVerificationDocument>(`/admin/verification-documents/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: { status, rejectionNote },
  });
