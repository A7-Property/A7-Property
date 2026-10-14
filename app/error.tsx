"use client";

import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { AnimatedAssetIcon } from "@/components/ui/animated-asset-icon";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="a7-page grid min-h-[calc(100svh-72px)] place-items-center px-5 py-16">
      <section className="w-full max-w-[520px] text-center" aria-labelledby="error-title">
        <AnimatedAssetIcon src="/icons/a7-retry-home-3d.png" width={96} height={96} hover="float" className="mx-auto size-24" />
        <p className="mt-6 text-[10px] font-semibold uppercase tracking-[.16em] text-a7-blue">A7 Property</p>
        <h1 id="error-title" className="mt-2 text-[30px] font-semibold tracking-[-0.045em] text-a7-navy sm:text-[38px]">We couldn’t load this page</h1>
        <p className="mx-auto mt-3 max-w-[430px] text-[13px] leading-6 text-a7-muted">Your search is safe. Check your connection and try again, or return home to continue browsing.</p>
        <div className="mt-7 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-center">
          <Button variant="outline" className="h-12 rounded-[14px] px-5" onClick={() => router.push("/")}><ArrowLeft className="size-4" />Back home</Button>
          <Button className="h-12 rounded-[14px] px-5" onClick={reset}><RefreshCw className="size-4" />Try again</Button>
        </div>
        <Link href="/messages" className="mt-5 inline-flex min-h-11 items-center text-[11px] font-semibold text-a7-blue">Need help? Open Messages</Link>
      </section>
    </main>
  );
}
