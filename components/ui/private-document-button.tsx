"use client";

import { useState } from "react";
import { apiDownload } from "@/lib/api/client";
import { useLanguage } from "@/components/i18n/language-provider";
import { useToast } from "./toast-provider";
import { Button } from "./button";

export function PrivateDocumentButton({ url, label }: { url: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const { tx } = useLanguage();
  const { toast } = useToast();
  async function download() {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await apiDownload(`/uploads/document?url=${encodeURIComponent(url)}`);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "a7-document.webp";
      link.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
    } catch {
      toast({ tone: "error", title: tx("Could not download this private document", "ဤပုဂ္ဂလိကစာရွက်စာတမ်းကို ရယူ၍မရပါ") });
    } finally { setBusy(false); }
  }
  return <Button variant="outline" disabled={busy} onClick={() => void download()}>{busy ? tx("Loading…", "ဖွင့်နေသည်…") : label ?? tx("Download private document", "ပုဂ္ဂလိကစာရွက်စာတမ်း ရယူရန်")}</Button>;
}
