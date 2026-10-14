import { fromApiProperty } from "@/lib/api/property-adapter";
import type { ApiProperty } from "@/lib/api/properties";
import type { Property } from "@/lib/properties";

/**
 * Server-side property reads. **Server components only.**
 *
 * Every record comes from the NestJS API and reflects the real database. There
 * is no bundled demo catalog: an unreachable API yields an empty list, never
 * fabricated listings presented as real inventory.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/** The API caps a page at 100; this bounds how much one request will pull in. */
const pageSize = 100;
const maxPages = 5;

export function isServerBacked() {
  return Boolean(API_URL);
}

function baseUrl() {
  return (API_URL ?? "").replace(/\/$/, "");
}

/**
 * Bound each attempt and retry once. Collection readers return an honest empty
 * result on failure; individual property failures remain explicit errors.
 */
async function fetchJson<T>(path: string, includeMeta = false): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl()}${path}`, {
        headers: { accept: "application/json" },
        // Listings change whenever a lister publishes, so never serve a cached page.
        // A native export is a build-time snapshot; the web reads live records.
        cache: process.env.CAPACITOR_BUILD === "1" ? "force-cache" : "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      if (response.status === 404) return null as T;
      if (!response.ok) throw new Error(`API responded ${response.status} for ${path}`);
      const payload = await response.json() as { data?: T };
      return (includeMeta ? payload : payload?.data) as T;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`Property API request failed: ${path}`, { cause: lastError });
}

async function listProperties(): Promise<Property[]> {
  const records: ApiProperty[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const result = await fetchJson<{ data: ApiProperty[]; meta: { totalPages: number } } | ApiProperty[]>(
      `/properties?page=${page}&limit=${pageSize}`,
    );
    // The list route returns the envelope, so `data` is the array and `meta` sits beside it.
    const pageRecords = Array.isArray(result) ? result : result?.data ?? [];
    records.push(...pageRecords);
    if (pageRecords.length < pageSize) break;
  }
  return records.map(fromApiProperty);
}

export async function getAllProperties(): Promise<Property[]> {
  if (!API_URL) return [];
  try {
    return await listProperties();
  } catch {
    return [];
  }
}

export async function getPropertyById(id: string): Promise<Property | undefined> {
  if (!API_URL) return undefined;
  const record = await fetchJson<ApiProperty | null>(`/properties/${encodeURIComponent(id)}`);
  return record ? fromApiProperty(record) : undefined;
}

export async function getSimilarProperties(id: string, limit = 6): Promise<Property[]> {
  if (!API_URL) return [];
  try {
    const records = await fetchJson<ApiProperty[]>(`/properties/${encodeURIComponent(id)}/similar?limit=${limit}`);
    return (records ?? []).map(fromApiProperty);
  } catch {
    return [];
  }
}

/**
 * Ids for the sitemap and for pre-rendering. An unreachable API yields an empty
 * list rather than a failed build: those pages are rendered on demand instead.
 */
export async function getPropertyIds(): Promise<string[]> {
  try {
    return (await getAllProperties()).map((property) => property.id);
  } catch {
    return [];
  }
}
/** A route-specific search page, retaining the API's real pagination metadata. */
export interface PropertySearchPage {
  properties: Property[];
  total: number;
  totalPages: number;
  unavailable: boolean;
}

export async function getPropertySearch(filters: import("@/lib/api/properties").PropertySearchFilters): Promise<PropertySearchPage> {
  const empty = { properties: [], total: 0, totalPages: 0, unavailable: false };
  if (!API_URL) return empty;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  try {
    const result = await fetchJson<import("@/lib/api/properties").PropertyPage>(`/properties?${params}`, true);
    return { properties: result.data.map(fromApiProperty), total: result.meta.total, totalPages: result.meta.totalPages, unavailable: false };
  } catch { return { ...empty, unavailable: true }; }
}
