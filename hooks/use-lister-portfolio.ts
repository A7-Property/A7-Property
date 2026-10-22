"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { useToast } from "@/components/ui/toast-provider";
import { ApiError, collectPages, isApiConfigured } from "@/lib/api/client";
import * as propertiesApi from "@/lib/api/properties";
import type { OwnerOverview } from "@/lib/api/properties";
import { fromApiProperty } from "@/lib/api/property-adapter";
import type { Property, PropertyType } from "@/lib/properties";

/**
 * The listings a signed-in lister actually owns.
 *
 * In device mode this stays the demo slice of the shared catalog, which is what
 * the CRM has always shown. In server mode it is the lister's own inventory,
 * drafts included, read through `/properties/mine`.
 */
export interface ListerPortfolio {
  portfolio: Property[];
  overview: OwnerOverview | null;
  ready: boolean;
  failed: boolean;
  serverBacked: boolean;
  refresh: () => void;
  /** Patches an existing listing. Returns false when the server refused it. */
  updateListing: (propertyId: string, patch: ListingPatch) => Promise<boolean>;
  /**
   * Creates a draft listing. Returns the new record on success so the caller
   * can jump straight to its edit view, or null when the server refused it.
   */
  createListing: (input: CreateListingInput) => Promise<Property | null>;
  publish: (propertyId: string) => Promise<boolean>;
  pause: (propertyId: string) => Promise<boolean>;
  confirmAvailability: (propertyId: string) => Promise<boolean>;
  markUnavailable: (propertyId: string, status: "SOLD" | "RENTED") => Promise<boolean>;
  /** Soft-archives the listing on the server; the CRM list refreshes afterwards. */
  archiveListing: (propertyId: string) => Promise<boolean>;
}

export interface ListingPatch {
  title?: string;
  description?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  areaSqft?: number;
  address?: string;
  city?: string;
  township?: string;
  purpose?: "rent" | "sale";
  propertyType?: PropertyType;
  furniture?: "unfurnished" | "partly_furnished" | "fully_furnished" | null;
  floor?: number | null;
  yearBuilt?: number | null;
  amenities?: string[];
  imageAssetIds?: string[];
  documents?: { documentId?: string; documentAssetId: string; documentUrl: string; documentType: string }[];
}

/** Everything the backend's CreatePropertyDto requires, plus the uploaded photo ids. */
export interface CreateListingInput {
  title: string;
  description: string;
  propertyType: PropertyType;
  purpose: "rent" | "sale";
  price: number;
  currency?: string;
  bedrooms: number;
  bathrooms: number;
  areaSqft: number;
  address: string;
  city: string;
  township: string;
  floor?: number;
  yearBuilt?: number;
  furniture?: "unfurnished" | "partly_furnished" | "fully_furnished";
  amenities?: string[];
  imageAssetIds?: string[];
  documents?: { documentId?: string; documentAssetId: string; documentUrl: string; documentType: string }[];
}

const apiPropertyTypes: Record<PropertyType, string> = {
  condo: "CONDO",
  apartment: "APARTMENT",
  house: "HOUSE",
  mini_condo: "MINI_CONDO",
  villa: "VILLA",
  land: "LAND",
  commercial: "COMMERCIAL",
  office: "OFFICE",
  shop: "SHOP",
  other: "OTHER",
};

const apiFurniture: Record<"unfurnished" | "partly_furnished" | "fully_furnished", "UNFURNISHED" | "PARTLY_FURNISHED" | "FULLY_FURNISHED"> = {
  unfurnished: "UNFURNISHED",
  partly_furnished: "PARTLY_FURNISHED",
  fully_furnished: "FULLY_FURNISHED",
};

function toApiCreate(input: CreateListingInput) {
  return {
    title: input.title,
    description: input.description,
    propertyType: apiPropertyTypes[input.propertyType],
    listingType: input.purpose === "sale" ? "SALE" : "RENT",
    price: input.price,
    currency: input.currency ?? "MMK",
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
    areaSqft: input.areaSqft,
    address: input.address,
    city: input.city,
    township: input.township,
    ...(input.floor !== undefined ? { floor: input.floor } : {}),
    ...(input.yearBuilt !== undefined ? { yearBuilt: input.yearBuilt } : {}),
    ...(input.furniture ? { furniture: apiFurniture[input.furniture] } : {}),
    ...(input.amenities?.length ? { amenities: input.amenities } : {}),
    ...(input.imageAssetIds?.length ? { images: input.imageAssetIds.map((assetId) => ({ assetId })) } : {}),
    ...(input.documents?.length ? { documents: input.documents } : {}),
  };
}

function toApiPatch(patch: ListingPatch) {
  return {
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.price !== undefined ? { price: patch.price } : {}),
    ...(patch.bedrooms !== undefined ? { bedrooms: patch.bedrooms } : {}),
    ...(patch.bathrooms !== undefined ? { bathrooms: patch.bathrooms } : {}),
    ...(patch.areaSqft !== undefined ? { areaSqft: patch.areaSqft } : {}),
    ...(patch.address !== undefined ? { address: patch.address } : {}),
    ...(patch.city !== undefined ? { city: patch.city } : {}),
    ...(patch.township !== undefined ? { township: patch.township } : {}),
    ...(patch.purpose !== undefined ? { listingType: patch.purpose === "sale" ? "SALE" : "RENT" } : {}),
    ...(patch.propertyType !== undefined ? { propertyType: apiPropertyTypes[patch.propertyType] } : {}),
    ...(patch.floor !== undefined ? { floor: patch.floor } : {}),
    ...(patch.yearBuilt !== undefined ? { yearBuilt: patch.yearBuilt } : {}),
    // The server rejects a null for an enum, so an "unset" clear sends an empty
    // string which it validates. In practice the UI never sends `null` here;
    // sending `undefined` just omits the field.
    ...(patch.furniture !== undefined && patch.furniture !== null ? { furniture: apiFurniture[patch.furniture] } : {}),
    ...(patch.amenities !== undefined ? { amenities: patch.amenities } : {}),
    // A patch replaces the whole image list, so sending it without any ids
    // would detach every photo. The CRM only sends it when the lister
    // actually uploaded replacements.
    ...(patch.imageAssetIds !== undefined && patch.imageAssetIds.length > 0
      ? { images: patch.imageAssetIds.map((assetId) => ({ assetId })) }
      : {}),
    ...(patch.documents !== undefined ? { documents: patch.documents } : {}),
  };
}

export function useListerPortfolio(role: "owner" | "agent", catalog: Property[]): ListerPortfolio {
  const serverBacked = isApiConfigured();
  const { user, status } = useAuth();
  const { tx } = useLanguage();
  const { toast } = useToast();

  const [serverPortfolio, setServerPortfolio] = useState<Property[]>([]);
  const [overview, setOverview] = useState<OwnerOverview | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  // The demo CRM shows a fixed slice of the shared catalog per role.
  const demoPortfolio = useMemo(
    () => catalog.slice(role === "owner" ? 0 : 20, role === "owner" ? 25 : 88),
    [catalog, role],
  );

  useEffect(() => {
    let cancelled = false;

    if (!serverBacked) {
      queueMicrotask(() => {
        if (!cancelled) setReady(true);
      });
      return () => { cancelled = true; };
    }

    if (status === "loading") return;
    if (status !== "authenticated" || user?.accountType !== "lister") {
      queueMicrotask(() => {
        if (cancelled) return;
        setServerPortfolio([]);
        setOverview(null);
        setReady(true);
      });
      return () => { cancelled = true; };
    }

    void (async () => {
      try {
        const [records, counters] = await Promise.all([
          collectPages((page) => propertiesApi.myProperties({ page, limit: 100 })),
          propertiesApi.myOverview(),
        ]);
        if (cancelled) return;
        setServerPortfolio(records.map(fromApiProperty));
        setFailed(false);
        setOverview(counters);
      } catch {
        // No inventory is shown rather than the demo catalog, which does not
        // belong to this lister.
        if (!cancelled) {
          setServerPortfolio([]);
          setOverview(null);
          setFailed(true);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => { cancelled = true; };
  }, [serverBacked, status, user?.accountType, user?.id, reloadToken]);

  const refresh = useCallback(() => setReloadToken((token) => token + 1), []);

  const reportFailure = useCallback((error: unknown, title: string) => {
    toast({
      tone: "error",
      title,
      description: error instanceof ApiError
        ? (error.needsEmailVerification
          ? tx("Confirm your email address first, then try again.", "သင့်အီးမေးလ်လိပ်စာကို အရင်အတည်ပြုပြီးမှ ထပ်မံကြိုးစားပါ။")
          : error.message)
        : tx("Check your connection and try again.", "အင်တာနက်ချိတ်ဆက်မှုကို စစ်ပြီး ထပ်မံကြိုးစားပါ။"),
    });
  }, [toast, tx]);

  const applyUpdated = useCallback((updated: Property) => {
    setServerPortfolio((current) => current.map((item) => item.id === updated.id ? updated : item));
  }, []);

  const updateListing = useCallback(async (propertyId: string, patch: ListingPatch) => {
    if (!serverBacked) return true;
    try {
      applyUpdated(fromApiProperty(await propertiesApi.updateProperty(propertyId, toApiPatch(patch))));
      refresh();
      return true;
    } catch (error) {
      reportFailure(error, tx("Could not save this listing", "ဤအိမ်စာရင်းကို သိမ်းမရပါ"));
      return false;
    }
  }, [serverBacked, applyUpdated, refresh, reportFailure, tx]);

  const publish = useCallback(async (propertyId: string) => {
    if (!serverBacked) return true;
    try {
      applyUpdated(fromApiProperty(await propertiesApi.publishProperty(propertyId)));
      refresh();
      return true;
    } catch (error) {
      // Publishing needs at least one image and a verified email; the server
      // decides, and its reason is shown rather than guessed at.
      reportFailure(error, tx("Could not publish this listing", "ဤအိမ်စာရင်းကို ကြော်ငြာမရပါ"));
      return false;
    }
  }, [serverBacked, applyUpdated, refresh, reportFailure, tx]);

  const pause = useCallback(async (propertyId: string) => {
    if (!serverBacked) return true;
    try {
      applyUpdated(fromApiProperty(await propertiesApi.pauseProperty(propertyId)));
      refresh();
      return true;
    } catch (error) {
      reportFailure(error, tx("Could not pause this listing", "ဤအိမ်စာရင်းကို ရပ်မရပါ"));
      return false;
    }
  }, [serverBacked, applyUpdated, refresh, reportFailure, tx]);

  const createListing = useCallback(async (input: CreateListingInput) => {
    if (!serverBacked) return null;
    try {
      const created = fromApiProperty(await propertiesApi.createProperty(toApiCreate(input)));
      setServerPortfolio((current) => [created, ...current]);
      refresh();
      return created;
    } catch (error) {
      reportFailure(error, tx("Could not create this listing", "ဤအိမ်စာရင်းကို ဖန်တီး၍ မရပါ"));
      return null;
    }
  }, [serverBacked, refresh, reportFailure, tx]);

  const confirmAvailability = useCallback(async (propertyId: string) => {
    if (!serverBacked) return false;
    try { applyUpdated(fromApiProperty(await propertiesApi.confirmPropertyAvailability(propertyId))); return true; }
    catch (error) { reportFailure(error, tx("Could not confirm this listing", "ဤအိမ်စာရင်းကို အတည်မပြုနိုင်ပါ")); return false; }
  }, [serverBacked, applyUpdated, reportFailure, tx]);

  const markUnavailable = useCallback(async (propertyId: string, nextStatus: "SOLD" | "RENTED") => {
    if (!serverBacked) return false;
    try { applyUpdated(fromApiProperty(await propertiesApi.markPropertyUnavailable(propertyId, nextStatus))); refresh(); return true; }
    catch (error) { reportFailure(error, tx("Could not update availability", "ရရှိနိုင်မှုကို မပြောင်းနိုင်ပါ")); return false; }
  }, [serverBacked, applyUpdated, refresh, reportFailure, tx]);

  const archiveListing = useCallback(async (propertyId: string) => {
    if (!serverBacked) return true;
    try {
      await propertiesApi.archiveProperty(propertyId);
      // Archived listings drop out of /properties/mine, so refresh the list
      // rather than keeping a stale card around.
      setServerPortfolio((current) => current.filter((item) => item.id !== propertyId));
      refresh();
      return true;
    } catch (error) {
      reportFailure(error, tx("Could not archive this listing", "ဤအိမ်စာရင်းကို archive မလုပ်နိုင်ပါ"));
      return false;
    }
  }, [serverBacked, refresh, reportFailure, tx]);

  return {
    portfolio: serverBacked ? serverPortfolio : demoPortfolio,
    overview,
    ready,
    failed,
    serverBacked,
    refresh,
    updateListing,
    createListing,
    publish,
    pause,
    confirmAvailability,
    markUnavailable,
    archiveListing,
  };
}
