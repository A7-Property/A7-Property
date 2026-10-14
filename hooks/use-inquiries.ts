"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { collectPages, isApiConfigured } from "@/lib/api/client";
import { listInquiries, updateInquiryStatus, type ApiInquiry } from "@/lib/api/inquiries";

export function useInquiries() {
  const { user, status } = useAuth();
  const [inquiries, setInquiries] = useState<ApiInquiry[]>([]);
  const [failed, setFailed] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const refresh = useCallback(() => setReloadToken((value) => value + 1), []);
  useEffect(() => {
    let cancelled = false;
    if (!isApiConfigured() || status !== "authenticated" || user?.accountType !== "lister") return;
    void collectPages(listInquiries).then((records) => {
      if (!cancelled) { setInquiries(records); setFailed(false); }
    }).catch(() => { if (!cancelled) { setInquiries([]); setFailed(true); } });
    return () => { cancelled = true; };
  }, [status, user?.id, user?.accountType, reloadToken]);
  const changeStatus = useCallback(async (id: string, next: ApiInquiry["status"]) => {
    try {
      const updated = await updateInquiryStatus(id, next);
      setInquiries((current) => current.map((record) => record.id === id ? updated : record));
      return true;
    } catch { return false; }
  }, []);
  return { inquiries, failed, refresh, changeStatus };
}
