"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth, type AccountType } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";

interface RequireAuthProps {
  children: ReactNode;
  requireRole?: AccountType;
  fallback?: ReactNode;
  /** Explain a denied role without sending the viewer to an unrelated journey. */
  roleMismatchFallback?: ReactNode;
}

function RequireAuth({ children, requireRole, fallback, roleMismatchFallback }: RequireAuthProps) {
  const { user, status } = useAuth();
  const { tx } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      const returnTo = `${pathname}${window.location.search}`;
      window.sessionStorage.setItem("a7-auth-return-to", returnTo);
      if (requireRole === "admin") {
        router.replace("/admin/login");
      } else {
        router.replace(requireRole === "lister" ? "/sign-in?role=lister" : "/sign-in");
      }
      return;
    }
    if (status === "authenticated" && requireRole && user?.accountType !== requireRole) {
      if (roleMismatchFallback !== undefined) return;
      if (user?.accountType === "admin") {
        router.replace("/admin");
      } else if (user?.accountType === "lister") {
        router.replace("/owner");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [status, requireRole, user, router, pathname, roleMismatchFallback]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center" role="status" aria-live="polite">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#123B73] border-t-transparent" aria-hidden="true" />
        <p className="text-sm font-medium text-[#526172]">{tx("Loading your A7 experience…", "သင့် A7 အတွေ့အကြုံကို ဖွင့်နေပါသည်…")}</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return fallback ?? (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-[15px] font-medium text-[#101828]">{tx("Please sign in to continue.", "ဆက်လုပ်ရန် အကောင့်ဝင်ပါ။")}</p>
        <a href={requireRole === "admin" ? "/admin/login" : "/sign-in"} className="inline-flex h-11 items-center rounded-xl bg-[#123B73] px-5 text-sm font-semibold text-white">{tx("Sign in", "အကောင့်ဝင်ရန်")}</a>
      </div>
    );
  }

  if (requireRole && user?.accountType !== requireRole) {
    if (roleMismatchFallback !== undefined) return <>{roleMismatchFallback}</>;
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-[15px] font-medium text-[#101828]">
          {requireRole === "admin"
            ? tx("This page is for administrators only.", "ဤစာမျက်နှာသည် အက်ဒမင်များအတွက်သာဖြစ်သည်။")
            : requireRole === "lister"
              ? tx("This page is for property listers only.", "ဤစာမျက်နှာသည် အိမ်စာရင်းတင်သူများအတွက်သာဖြစ်သည်။")
              : tx("This page is for home seekers only.", "ဤစာမျက်နှာသည် အိမ်ရှာသူများအတွက်သာဖြစ်သည်။")}
        </p>
        <a href={user?.accountType === "admin" ? "/admin" : user?.accountType === "lister" ? "/owner" : "/dashboard"} className="inline-flex h-11 items-center rounded-xl bg-[#123B73] px-5 text-sm font-semibold text-white">{tx("Go to your dashboard", "ဒက်ရှ်ဘုတ်သို့သွားရန်")}</a>
      </div>
    );
  }

  return <>{children}</>;
}

export { RequireAuth };
