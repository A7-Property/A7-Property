import { apiRequest, setAccessToken } from "./client";

export type ApiRole = "SEEKER" | "LISTER" | "ADMIN";

export interface ApiUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: ApiRole;
  phone: string | null;
  avatarUrl: string | null;
  isAgent: boolean;
  phoneVerified: boolean;
  emailVerifiedAt: string | null;
  verificationDocs?: { status: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED" }[];
}

export interface ApiSession {
  id: string;
  ip: string | null;
  userAgent: string | null;
  lastUsedAt: string;
  createdAt: string;
  expiresAt: string;
}

interface AuthResult { user: ApiUser; accessToken: string; expiresIn: number; verificationEmailSent?: boolean }

/** Only self-service roles: the backend rejects ADMIN at registration. */
export async function register(input: { email: string; password: string; firstName: string; lastName: string; role: "SEEKER" | "LISTER" }) {
  const result = await apiRequest<AuthResult>("/auth/register", { method: "POST", body: input, auth: false });
  setAccessToken(result.accessToken);
  return { user: result.user, verificationEmailSent: result.verificationEmailSent ?? false };
}

export async function login(email: string, password: string) {
  const result = await apiRequest<AuthResult>("/auth/login", { method: "POST", body: { email, password }, auth: false });
  setAccessToken(result.accessToken);
  return result.user;
}

export async function logout() {
  try { await apiRequest<{ success: boolean }>("/auth/logout", { method: "POST", auth: false }); }
  finally { setAccessToken(null); }
}

export async function logoutAll() {
  try { await apiRequest<{ success: boolean }>("/auth/logout-all", { method: "POST" }); }
  finally { setAccessToken(null); }
}

export const me = () => apiRequest<ApiUser>("/auth/me");
export const verifyEmail = (token: string) => apiRequest<{ success: boolean }>("/auth/verify-email", { method: "POST", body: { token }, auth: false });
export const resendVerification = (email: string) => apiRequest<{ success: boolean }>("/auth/resend-verification", { method: "POST", body: { email }, auth: false });
export const forgotPassword = (email: string) => apiRequest<{ success: boolean }>("/auth/forgot-password", { method: "POST", body: { email }, auth: false });
export const resetPassword = (token: string, password: string) => apiRequest<{ success: boolean }>("/auth/reset-password", { method: "POST", body: { token, password }, auth: false });

/** Changing a password signs every device out, including this one. */
export async function changePassword(currentPassword: string, newPassword: string) {
  try { return await apiRequest<{ success: boolean }>("/auth/change-password", { method: "POST", body: { currentPassword, newPassword } }); }
  finally { setAccessToken(null); }
}

export async function deactivateAccount(password: string) {
  try { return await apiRequest<{ success: boolean }>("/auth/deactivate", { method: "POST", body: { password } }); }
  finally { setAccessToken(null); }
}

export const listSessions = () => apiRequest<ApiSession[]>("/auth/sessions");
export const revokeSession = (id: string) => apiRequest<{ success: boolean }>(`/auth/sessions/${encodeURIComponent(id)}`, { method: "DELETE" });
