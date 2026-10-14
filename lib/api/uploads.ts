import { apiUpload } from "./client";
import type { ApiUser } from "./auth";

export interface UploadedAsset { id: string; url: string; storageKey: string; contentType: "image/webp"; byteSize: number }

export const uploadPropertyImage = (file: File) => apiUpload<UploadedAsset>("/uploads/property-image", file);
export const uploadPropertyDocument = (file: File) => apiUpload<UploadedAsset>("/uploads/property-document", file);
export const uploadAvatar = (file: File) => apiUpload<ApiUser>("/users/me/avatar", file);
