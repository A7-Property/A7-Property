// Browser-facing API transport.
//
// The UI runs in one of two modes. With NEXT_PUBLIC_API_URL set it talks to the
// NestJS backend; without it every journey stays on the device-local demo data.
// Call `isApiConfigured()` before offering a server-backed action so the UI
// never claims to have reached a server that is not configured.
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiPage<T> {
  data: T[];
  meta: PageMeta;
}

/** Complete legacy collections without silently dropping records after the first API page. */
export async function collectPages<T>(load: (page: number) => Promise<ApiPage<T>>): Promise<T[]> {
  const records: T[] = [];
  for (let page = 1; ; page++) {
    const result = await load(page);
    records.push(...result.data);
    if (!result.data.length || page >= result.meta.totalPages) return records;
  }
}

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

/** Mirrors the backend error envelope: { statusCode, error, message, requestId }. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly requestId: string | null = null,
    public readonly fieldMessages: string[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** True when the account exists but its email has not been confirmed yet. */
  get needsEmailVerification() {
    return this.status === 403 && /verify your email/i.test(this.message);
  }

  get isRateLimited() {
    return this.status === 429;
  }
}

export function isApiConfigured() {
  return Boolean(API_URL);
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

function baseUrl() {
  if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL is not configured");
  return API_URL.replace(/\/$/, "");
}

async function parseResponse<T>(response: Response, includeMeta = false): Promise<T> {
  const payload = await response.json().catch(() => null) as
    | { data?: T; message?: string | string[]; requestId?: string | null }
    | null;
  if (!response.ok) {
    const raw = payload?.message;
    const fieldMessages = Array.isArray(raw) ? raw : [];
    const message = (Array.isArray(raw) ? raw.join("; ") : raw) || `API request failed (${response.status})`;
    throw new ApiError(response.status, message, payload?.requestId ?? null, fieldMessages);
  }
  return (includeMeta ? payload : payload?.data) as T;
}

/**
 * Refreshes the access token using the HttpOnly cookie. Concurrent callers share
 * one in-flight request so a burst of 401s cannot rotate the refresh token more
 * than once — the backend treats a replayed refresh token as a leak and would
 * revoke every session.
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (!API_URL) return null;
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(`${baseUrl()}/auth/refresh`, { method: "POST", credentials: "include" });
      if (!response.ok) { accessToken = null; return null; }
      const result = await parseResponse<{ accessToken: string }>(response);
      accessToken = result.accessToken;
      return accessToken;
    })().catch(() => { accessToken = null; return null; }).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export function buildQuery(params: Record<string, string | number | boolean | string[] | undefined | null>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  return search.size ? `?${search}` : "";
}

export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean; includeMeta?: boolean } = {},
): Promise<T> {
  const method = options.method ?? "GET";
  const send = () => fetch(`${baseUrl()}${path}`, {
    method,
    credentials: "include",
    headers: {
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(accessToken && options.auth !== false ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  let response = await send();
  if (response.status === 401 && options.auth !== false && await refreshAccessToken()) response = await send();
  return parseResponse<T>(response, options.includeMeta);
}

export async function apiUpload<T>(path: string, file: File): Promise<T> {
  const body = new FormData();
  body.set("file", file);
  // No Content-Type header: the browser must set the multipart boundary itself.
  const send = () => fetch(`${baseUrl()}${path}`, {
    method: "POST", credentials: "include", body,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  let response = await send();
  if (response.status === 401 && await refreshAccessToken()) response = await send();
  return parseResponse<T>(response);
}

/** Binary private media follows the same shared refresh path as JSON requests. */
export async function apiDownload(path: string): Promise<Blob> {
  const send = () => fetch(`${baseUrl()}${path}`, { credentials: "include", headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} });
  let response = await send();
  if (response.status === 401 && await refreshAccessToken()) response = await send();
  if (!response.ok) await parseResponse<never>(response);
  return response.blob();
}
