import { apiRequest, apiUpload } from "./client";
import type { ApiUser } from "./auth";

export const getProfile = () => apiRequest<ApiUser>("/users/me");
export const updateProfile = (patch: { firstName?: string; lastName?: string; phone?: string }) => apiRequest<ApiUser>("/users/me", { method: "PATCH", body: patch });

export async function submitIdentification(file: File) {
  const asset = await apiUpload<{ id: string; url: string }>("/uploads/identification", file);
  return apiRequest<{ status: string }>("/users/me/verification-document", { method: "POST", body: { documentAssetId: asset.id, documentUrl: asset.url, documentType: "NATIONAL_ID" } });
}
