"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { apiDownload } from "@/lib/api/client";
import { Button } from "./button";

export function PrivateDocumentPreview({ src, alt, label, openLabel }: { src: string; alt: string; label: string; openLabel: string }) {
  const { user, status } = useAuth();
  const { tx } = useLanguage();
  const userId = status === "authenticated" ? user?.id : undefined;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ src: string; userId: string; attempt: number; objectUrl?: string; failed?: boolean }>();

  useEffect(() => {
    if (!userId) return;
    let active = true;
    let objectUrl: string | undefined;
    // Public media and Next's optimizer cannot authorize private documents.
    void apiDownload(`/uploads/document?url=${encodeURIComponent(src)}`).then((blob) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setResult({ src, userId, attempt, objectUrl });
    }).catch(() => {
      if (active) setResult({ src, userId, attempt, failed: true });
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, userId, attempt]);

  const current = result?.src === src && result.userId === userId && result.attempt === attempt ? result : undefined;
  if (!current?.objectUrl) {
    return <div className="flex min-h-40 flex-col items-center justify-center gap-2 p-3 text-center text-xs text-[#667085]" role="status">
      <span>{!userId && status !== "loading"
        ? tx("Sign in to view this document.", "ဤစာရွက်စာတမ်းကို ကြည့်ရန် အကောင့်ဝင်ပါ။")
        : current?.failed
          ? tx("Could not load this document.", "ဤစာရွက်စာတမ်းကို ဖွင့်၍မရပါ။")
          : tx("Loading document…", "စာရွက်စာတမ်း ဖွင့်နေသည်…")}</span>
      {current?.failed && <Button type="button" variant="outline" onClick={() => setAttempt((value) => value + 1)}>{tx("Try again", "ထပ်မံကြိုးစားရန်")}</Button>}
    </div>;
  }

  return <a href={current.objectUrl} target="_blank" rel="noreferrer" aria-label={openLabel} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#123B73]">
    <span className="relative block aspect-[4/3] overflow-hidden bg-[#F2F4F7]">
      {/* Authenticated browser-local blobs must never go through a public image optimizer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={current.objectUrl} alt={alt} className="absolute inset-0 size-full object-cover transition-transform group-hover:scale-[1.02]" />
    </span>
    <span className="flex min-h-11 items-center gap-1.5 px-3 text-[11px] font-medium text-[#344054]">
      <ExternalLink className="size-3.5 shrink-0" />{label}
    </span>
  </a>;
}
