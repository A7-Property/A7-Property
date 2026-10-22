import { apiRequest } from "./client";
import type { Property } from "../properties";
import type { ApiUser } from "./auth";

export interface AdminOverview {
  users: { total: number; active: number; listers: number; seekers: number };
  properties: { total: number; published: number; pendingReview: number; verified: number };
  inquiries: { total: number; new: number };
  viewings: { total: number; requested: number };
  reports: { pending: number };
}

export interface AdminProperty extends Omit<Property, "owner"> {
  owner: ApiUser;
}

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
  actor?: ApiUser;
}

export const getOverview = () => apiRequest<AdminOverview>("/admin/overview");

export const getProperties = (verificationStatus?: string) =>
  apiRequest<AdminProperty[]>(`/admin/properties${verificationStatus ? `?verificationStatus=${verificationStatus}` : ""}`);

export const setPropertyVerification = (id: string, status: "VERIFIED" | "REJECTED" | "PENDING") =>
  apiRequest<{ success: boolean }>(`/admin/properties/${id}/verification`, {
    method: "PATCH",
    body: { status },
  });

export interface VerificationDocument {
  id: string;
  documentType: string;
  documentUrl: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  rejectionNote: string | null;
  createdAt: string;
  updatedAt: string;
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

export const getUsers = (role?: "SEEKER" | "LISTER") =>
  apiRequest<AdminUser[]>(`/admin/users${role ? `?role=${role}` : ""}`);

export const setUserStatus = (id: string, isActive: boolean) =>
  apiRequest<{ success: boolean }>(`/admin/users/${id}/status`, {
    method: "PATCH",
    body: { isActive },
  });

export const unlockUser = (id: string) =>
  apiRequest<{ success: boolean }>(`/admin/users/${id}/unlock`, {
    method: "POST",
  });

export const verifyUserEmail = (id: string) =>
  apiRequest<AdminUser>(`/admin/users/${id}/verify-email`, {
    method: "POST",
  });

export const deleteUser = (id: string) =>
  apiRequest<{ success: boolean }>(`/admin/users/${id}/delete`, {
    method: "POST",
  });

export const getAuditLogs = () => apiRequest<AuditLogEntry[]>("/admin/audit-logs");

export interface AdminPropertyReport {
  id: string;
  reason: "SUSPECTED_SCAM" | "INCORRECT_INFORMATION" | "DUPLICATE_LISTING" | "UNAVAILABLE_PROPERTY" | "OTHER";
  details: string;
  status: "PENDING" | "RESOLVED" | "DISMISSED";
  createdAt: string;
  property: { id: string; title: string; status: string; verificationStatus: string };
  reporter: { id: string; email: string; firstName: string; lastName: string };
}

export const getPropertyReports = (status = "PENDING") =>
  apiRequest<AdminPropertyReport[]>(`/admin/property-reports?status=${encodeURIComponent(status)}`);

export const decidePropertyReport = (id: string, status: "RESOLVED" | "DISMISSED", resolutionNote?: string) =>
  apiRequest<AdminPropertyReport>(`/admin/property-reports/${encodeURIComponent(id)}`, { method: "PATCH", body: { status, resolutionNote } });

export const setVerificationDocumentStatus = (id: string, status: "VERIFIED" | "REJECTED", rejectionNote?: string) =>
  apiRequest<VerificationDocument>(`/admin/verification-documents/${id}/status`, {
    method: "PATCH",
    body: { status, rejectionNote },
  });
