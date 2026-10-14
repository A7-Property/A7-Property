"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { useToast } from "@/components/ui/toast-provider";
import { ApiError, isApiConfigured } from "@/lib/api/client";
import * as savedApi from "@/lib/api/saved";
import { readStoredIds, STORAGE_KEYS, writeStoredIds } from "@/lib/local-storage";

/**
 * The single place saved homes are read and written.
 *
 * With the API configured the list belongs to the signed-in seeker's account;
 * saving is only offered to a signed-in seeker, because that is the only case
 * the API accepts — a lister or a visitor is told so rather than being shown a
 * heart that silently does nothing.
 */
/** What a toggle actually did, so a caller only confirms a change that happened. */
export interface SaveOutcome {
  /** False when the viewer may not save, or when the server rejected the change. */
  applied: boolean;
  /** The resulting state when `applied`. */
  saved: boolean;
}

export interface SavedHomes {
  savedIds: string[];
  isSaved: (propertyId: string) => boolean;
  toggleSaved: (property: { id: string }) => Promise<SaveOutcome>;
  /** False until the stored or server list has loaded. */
  ready: boolean;
  /** True when this viewer is allowed to save at all. */
  canSave: boolean;
}

export function useSavedHomes(): SavedHomes {
  const serverBacked = isApiConfigured();
  const { user, status } = useAuth();
  const { tx } = useLanguage();
  const { toast } = useToast();

  // A fresh browser starts with no shortlist; only the viewer's own saves appear.
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  // `toggleSaved` runs only from event handlers, so it reads the latest list
  // through a ref rather than taking `savedIds` as a dependency and changing
  // identity on every toggle. The ref is synced after render, never during it.
  const savedRef = useRef(savedIds);
  useEffect(() => {
    savedRef.current = savedIds;
  }, [savedIds]);

  const canSave = serverBacked ? status === "authenticated" && user?.accountType === "seeker" : true;

  useEffect(() => {
    let cancelled = false;

    if (!serverBacked) {
      const stored = readStoredIds(STORAGE_KEYS.saved, STORAGE_KEYS.legacySaved, []);
      queueMicrotask(() => {
        if (cancelled) return;
        setSavedIds(stored);
        setReady(true);
      });
      return () => { cancelled = true; };
    }

    if (status === "loading") return;
    if (status !== "authenticated" || user?.accountType !== "seeker") {
      queueMicrotask(() => {
        if (cancelled) return;
        setSavedIds([]);
        setReady(true);
      });
      return () => { cancelled = true; };
    }

    void (async () => {
      try {
        const ids = await savedApi.listSavedIds();
        if (cancelled) return;
        setSavedIds(ids);
      } catch {
        // An unreachable API leaves the list empty rather than showing a stale
        // device list as if it were the account's shortlist.
        if (!cancelled) setSavedIds([]);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => { cancelled = true; };
  }, [serverBacked, status, user?.accountType, user?.id]);

  // Sibling components stay in step through the same event in both modes.
  useEffect(() => {
    function sync(event: Event) {
      const detail = (event as CustomEvent<{ key: string; ids: string[] }>).detail;
      if (detail?.key !== STORAGE_KEYS.saved) return;
      setSavedIds(detail.ids);
    }
    window.addEventListener("a7:stored-ids-change", sync);
    return () => window.removeEventListener("a7:stored-ids-change", sync);
  }, []);

  const broadcast = useCallback((ids: string[]) => {
    setSavedIds(ids);
    if (serverBacked) {
      // Server mode owns the list, so only the in-page event fires; nothing is
      // written to device storage.
      window.dispatchEvent(new CustomEvent("a7:stored-ids-change", { detail: { key: STORAGE_KEYS.saved, ids } }));
      return;
    }
    writeStoredIds(STORAGE_KEYS.saved, ids);
  }, [serverBacked]);

  const toggleSaved = useCallback(async (property: { id: string }): Promise<SaveOutcome> => {
    const current = savedRef.current;
    const wasSaved = current.includes(property.id);
    const next = wasSaved ? current.filter((id) => id !== property.id) : [...current, property.id];

    if (!serverBacked) {
      broadcast(next);
      return { applied: true, saved: !wasSaved };
    }

    if (!canSave) {
      toast({
        tone: "info",
        title: status === "authenticated"
          ? tx("Saving homes is for seeker accounts", "အိမ်သိမ်းဆည်းမှုသည် အိမ်ရှာသူအကောင့်အတွက်သာ")
          : tx("Sign in to save homes", "အိမ်များသိမ်းရန် အကောင့်ဝင်ပါ"),
        description: status === "authenticated"
          ? tx("Switch to a home seeker account to build a shortlist.", "စာရင်းတစ်ခုဖန်တီးရန် အိမ်ရှာသူအကောင့်သို့ ပြောင်းပါ။")
          : tx("Your shortlist is kept on your A7 Property account.", "သင့်စာရင်းကို A7 Property အကောင့်တွင် သိမ်းဆည်းပါမည်။"),
      });
      return { applied: false, saved: wasSaved };
    }

    // Optimistic: the heart responds immediately and is rolled back if the
    // request fails, so the UI never claims a save that did not happen.
    broadcast(next);
    try {
      if (wasSaved) await savedApi.removeSaved(property.id);
      else await savedApi.saveProperty(property.id);
      return { applied: true, saved: !wasSaved };
    } catch (error) {
      broadcast(current);
      toast({
        tone: "error",
        title: tx("Could not update your shortlist", "သင့်စာရင်းကို ပြင်ဆင်မရပါ"),
        description: error instanceof ApiError && error.status === 404
          ? tx("That home is no longer published.", "ထိုအိမ်ကို ကြော်ငြာမထားတော့ပါ။")
          : tx("Check your connection and try again.", "အင်တာနက်ချိတ်ဆက်မှုကို စစ်ပြီး ထပ်မံကြိုးစားပါ။"),
      });
      return { applied: false, saved: wasSaved };
    }
  }, [serverBacked, canSave, broadcast, toast, tx, status]);

  // Depends on state, not the ref, so callers re-render when the list changes.
  const isSaved = useCallback((propertyId: string) => savedIds.includes(propertyId), [savedIds]);

  return { savedIds, isSaved, toggleSaved, ready, canSave };
}
