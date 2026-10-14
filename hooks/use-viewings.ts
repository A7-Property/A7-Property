"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { useToast } from "@/components/ui/toast-provider";
import { ApiError, collectPages, isApiConfigured } from "@/lib/api/client";
import * as viewingsApi from "@/lib/api/viewings";
import type { ApiViewing, ApiViewingStatus } from "@/lib/api/viewings";
import { readStoredJson, STORAGE_KEYS, writeStoredJson } from "@/lib/local-storage";
import type { UserAppointment } from "@/lib/messages-types";

/**
 * Viewing requests, in whichever mode the deployment is configured for.
 *
 * Both modes present the same `UserAppointment` shape so the dashboard and the
 * CRM render identically. The status strings mirror the labels the views already
 * display; `apiStatus` keeps the server's own value for transition calls.
 */
export interface ViewingsState {
  appointments: UserAppointment[];
  ready: boolean;
  failed: boolean;
  refresh: () => void;
  serverBacked: boolean;
  /** @returns true when the change was stored. A rejected transition returns false. */
  changeStatus: (appointmentId: string, status: ApiViewingStatus) => Promise<boolean>;
}

/** The label each server status is shown as. */
const statusLabels: Record<ApiViewingStatus, string> = {
  REQUESTED: "Awaiting owner",
  CONFIRMED: "Confirmed",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};

export function toUserAppointment(viewing: ApiViewing, viewerId: string): UserAppointment {
  const counterpart = viewing.seeker.id === viewerId ? viewing.lister : viewing.seeker;
  const when = new Date(viewing.scheduledAt);
  return {
    id: viewing.id,
    propertyId: viewing.propertyId,
    date: when.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "Asia/Yangon" }),
    time: when.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Yangon" }),
    contact: `${counterpart.firstName} ${counterpart.lastName}`.trim(),
    status: statusLabels[viewing.status] ?? viewing.status,
    seekerName: `${viewing.seeker.firstName} ${viewing.seeker.lastName}`.trim(),
  };
}

export function useViewings(): ViewingsState {
  const serverBacked = isApiConfigured();
  const { user, status } = useAuth();
  const { tx } = useLanguage();
  const { toast } = useToast();

  const [appointments, setAppointments] = useState<UserAppointment[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const refresh = useCallback(() => setReloadToken((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;

    if (!serverBacked) {
      const raw = readStoredJson<UserAppointment[]>(STORAGE_KEYS.viewings, []);
      queueMicrotask(() => {
        if (cancelled) return;
        setAppointments(raw);
        setReady(true);
      });
      return () => { cancelled = true; };
    }

    if (status === "loading") return;
    if (status !== "authenticated" || !user) {
      queueMicrotask(() => {
        if (cancelled) return;
        setAppointments([]);
        setReady(true);
      });
      return () => { cancelled = true; };
    }

    const viewerId = user.id;
    void (async () => {
      try {
        const records = await collectPages(viewingsApi.listViewings);
        if (cancelled) return;
        setAppointments(records.map((viewing) => toUserAppointment(viewing, viewerId)));
        setFailed(false);
      } catch {
        if (!cancelled) { setAppointments([]); setFailed(true); }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => { cancelled = true; };
  }, [serverBacked, status, user, reloadToken]);

  const changeStatus = useCallback(async (appointmentId: string, nextStatus: ApiViewingStatus) => {
    if (!serverBacked) {
      setAppointments((current) => {
        const next = current.map((item) => item.id === appointmentId ? { ...item, status: statusLabels[nextStatus] } : item);
        writeStoredJson(STORAGE_KEYS.viewings, next);
        return next;
      });
      return true;
    }

    try {
      const updated = await viewingsApi.updateViewingStatus(appointmentId, nextStatus);
      if (user) {
        const mapped = toUserAppointment(updated, user.id);
        setAppointments((current) => current.map((item) => item.id === appointmentId ? mapped : item));
      }
      return true;
    } catch (error) {
      toast({
        tone: "error",
        title: tx("Could not update this viewing", "ဤအိမ်ကြည့်ချိန်ကို ပြင်ဆင်မရပါ"),
        // The server owns which transitions are allowed, so a refusal is reported
        // rather than worked around in the client.
        description: error instanceof ApiError && (error.status === 403 || error.status === 409)
          ? tx("That change is no longer available for this viewing.", "ဤအိမ်ကြည့်ချိန်အတွက် ထိုပြောင်းလဲမှုကို မရနိုင်တော့ပါ။")
          : tx("Check your connection and try again.", "အင်တာနက်ချိတ်ဆက်မှုကို စစ်ပြီး ထပ်မံကြိုးစားပါ။"),
      });
      return false;
    }
  }, [serverBacked, user, toast, tx]);

  return { appointments, ready, failed, refresh, serverBacked, changeStatus };
}
