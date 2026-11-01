"use client";

import Link from "next/link";
import { Bell, Bookmark, Heart, Inbox, Search } from "lucide-react";
import type { ReactNode } from "react";
import { A7Brand } from "@/components/brand/a7-brand";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import "./marketplace.css";

export type WebSection = "home" | "buy" | "rent" | "listers" | "searches";

export function WebShell({ children, section = "home", search = false }: { children: ReactNode; section?: WebSection; search?: boolean }) {
  const { tx } = useLanguage();
  const { user } = useAuth();
  const isLister = user?.accountType === "lister";
  return (
    <div className={`a7-web ${search ? "a7-web-search" : ""}`}>
      <header className="web-header">
        <Link href="/" className="web-brand" aria-label="A7 Property home"><A7Brand /></Link>
        <nav className="web-header-left" aria-label={tx("Property navigation", "အိမ်ခြံမြေ လမ်းညွှန်")}>
          <Link href="/search?purpose=sale" aria-current={section === "buy" ? "page" : undefined}>{tx("Buy", "ဝယ်ရန်")}</Link>
          <Link href="/search?purpose=rent" aria-current={section === "rent" ? "page" : undefined}>{tx("Rent", "ငှားရန်")}</Link>
          <Link href="/owner?create=1">{tx("List property", "အိမ်စာရင်းတင်ရန်")}</Link>
          <Link href="/listers" aria-current={section === "listers" ? "page" : undefined}>{tx("Find a lister", "အိမ်စာရင်းတင်သူရှာရန်")}</Link>
        </nav>
        <nav className="web-header-right" aria-label={tx("Account navigation", "အကောင့် လမ်းညွှန်")}>
          {!isLister && <Link href="/saved" className="web-saved-link">{tx("Saved properties", "သိမ်းထားသောအိမ်များ")}</Link>}
          <Link href="/help" className="web-help-link">{tx("Get help", "အကူအညီ")}</Link>
          <LanguageSwitcher compact />
          <Link href={user ? "/profile" : "/sign-in"} className="web-button web-button-primary">{user ? tx("My account", "ကျွန်ုပ်အကောင့်") : tx("Sign in", "အကောင့်ဝင်ရန်")}</Link>
        </nav>
      </header>
      <aside className="web-rail">
        <nav aria-label={tx("Your home journey", "သင့်အိမ်ရှာခရီးစဉ်")}>
          <Link href="/search?purpose=rent" aria-current={section === "buy" || section === "rent" ? "page" : undefined}><span className="web-rail-icon"><Search aria-hidden="true" /></span><span>{tx("Search", "ရှာရန်")}</span></Link>
          <span className="web-rail-unavailable" title={tx("Property updates are not available yet", "အိမ်သတင်းအသစ်များ မရရှိသေးပါ")}><span className="web-rail-icon"><Bell aria-hidden="true" /></span><span>{tx("Updates", "သတင်းအသစ်")}</span><small>{tx("Soon", "မကြာမီ")}</small></span>
          {!isLister && <Link href="/saved"><span className="web-rail-icon"><Heart aria-hidden="true" /></span><span>{tx("Favorites", "အကြိုက်များ")}</span></Link>}
          {!isLister && <Link href="/saved-searches" aria-current={section === "searches" ? "page" : undefined}><span className="web-rail-icon"><Bookmark aria-hidden="true" /></span><span>{tx("Plan", "အစီအစဉ်")}</span></Link>}
          <Link href="/messages"><span className="web-rail-icon"><Inbox aria-hidden="true" /></span><span>{tx("Inbox", "စာဝင်ပုံး")}</span></Link>
        </nav>
      </aside>
      <main className="web-main">{children}</main>
    </div>
  );
}

export function WebFooter() {
  const { tx } = useLanguage();
  return <footer className="web-footer"><A7Brand /><p>{tx("A place for your next chapter.", "သင့်ဘဝစာမျက်နှာသစ်အတွက် နေရာတစ်ခု။")}</p><nav aria-label={tx("Footer", "အောက်ခြေလမ်းညွှန်")}><Link href="/help">{tx("Help", "အကူအညီ")}</Link><Link href="/privacy">{tx("Privacy", "ကိုယ်ရေးအချက်အလက်")}</Link><Link href="/terms">{tx("Terms", "စည်းကမ်းချက်များ")}</Link></nav><small>© {new Date().getFullYear()} A7 Property</small></footer>;
}
