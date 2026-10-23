"use client";

import Link from "next/link";
import { Bell, Bookmark, Trash2 } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { useAuth } from "@/components/auth/auth-provider";
import { useWebSavedSearches } from "@/hooks/use-web-saved-searches";
import { WebShell, WebFooter } from "./web-shell";

export function SavedSearches() {
  const { tx } = useLanguage();
  const { user } = useAuth();
  const { searches, ready, remove, setNotifications, serverBacked } = useWebSavedSearches();
  if (user?.accountType === "lister") {
    return <WebShell section="searches"><section className="web-saved-searches web-container"><span className="web-eyebrow">{tx("LISTER ACCOUNT", "စာရင်းတင်သူအကောင့်")}</span><h1>{tx("Saved searches are for home seekers.", "သိမ်းထားသောရှာဖွေမှုများသည် အိမ်ရှာသူများအတွက်သာ ဖြစ်သည်။")}</h1><p>{tx("Use your lister dashboard to manage properties and respond to incoming leads.", "အိမ်စာရင်းများ စီမံရန်နှင့် ဝင်လာသော စိတ်ဝင်စားသူများကို အကြောင်းပြန်ရန် စာရင်းတင်သူ dashboard ကို အသုံးပြုပါ။")}</p><Link href="/owner" className="web-button web-button-primary">{tx("Open lister dashboard", "စာရင်းတင်သူ dashboard ဖွင့်ရန်")}</Link></section><WebFooter /></WebShell>;
  }
  return <WebShell section="searches"><section className="web-saved-searches web-container"><span className="web-eyebrow">{tx("YOUR HOME SEARCH", "သင့်အိမ်ရှာဖွေမှု")}</span><h1>{tx("Pick up where you left off.", "သင့်ရှာဖွေမှုကို ဆက်လုပ်ပါ။")}</h1><p>{serverBacked ? tx("Saved searches follow your account across devices. Turn on email alerts for newly published matches.", "သိမ်းထားသောရှာဖွေမှုများသည် စက်များကြား သင့်အကောင့်နှင့်အတူ ရှိနေပါမည်။ အသစ်တင်သော ကိုက်ညီသည့်အိမ်များအတွက် အီးမေးလ်အသိပေးချက် ဖွင့်နိုင်ပါသည်။") : tx("Search bookmarks are saved on this browser only. They do not sync with your account or send email alerts.", "ရှာဖွေမှုများကို ဤဘရောက်ဇာတွင်သာ သိမ်းပါသည်။ အကောင့်နှင့် မချိတ်ဆက်ပါ။ အီးမေးလ်အသိပေးချက် မပို့ပါ။")}</p>{!ready ? <p role="status">{tx("Loading saved searches…", "သိမ်းထားသောရှာဖွေမှုများ ဖွင့်နေသည်…")}</p> : searches.length ? <div className="web-bookmark-list">{searches.map((search) => <article key={search.id}><Bookmark /><div><h2>{search.title}</h2><p>{serverBacked ? tx("Saved to your account", "သင့်အကောင့်တွင် သိမ်းထားပါသည်") : tx("Saved on this browser", "ဤဘရောက်ဇာတွင် သိမ်းထားပါသည်")}</p><Link className="web-button web-button-outline" href={search.href}>{tx("Run search", "ပြန်ရှာရန်")}</Link>{serverBacked && <label className="mt-3 flex min-h-11 items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={search.notificationsEnabled} onChange={(event) => void setNotifications(search.id, event.target.checked)} /><Bell className="size-4" />{tx("Email me new matches", "ကိုက်ညီသည့်အိမ်အသစ်များကို အီးမေးလ်ပို့ရန်")}</label>}</div><button type="button" onClick={() => remove(search.id)} aria-label={tx(`Remove ${search.title}`, `${search.title} ကို ဖယ်ရန်`)}><Trash2 /></button></article>)}</div> : <div className="web-search-empty"><Bookmark /><h2>{tx("Your next search starts here", "သင့်ရှာဖွေမှုကို စတင်ပါ")}</h2><p>{tx("Choose filters in Buy or Rent, then select Save search to keep them here.", "ဝယ်ရန် သို့မဟုတ် ငှားရန်တွင် စစ်ထုတ်မှုများရွေးပြီး ရှာဖွေမှုသိမ်းရန်ကို နှိပ်ပါ။")}</p><Link href="/search?purpose=sale" className="web-button web-button-primary">{tx("Explore homes", "အိမ်များကြည့်ရန်")}</Link></div>}</section><WebFooter /></WebShell>;
}
