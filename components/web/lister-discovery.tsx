"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { MapPin, Search, UserRound, X } from "lucide-react";
import { ProgressiveImage } from "@/components/ui/progressive-image";
import { useLanguage } from "@/components/i18n/language-provider";
import { isApiConfigured } from "@/lib/api/client";
import { filterPublicListers, type ListerSearchMode, type PublicLister } from "@/lib/lister-discovery";
import { WebShell, WebFooter } from "./web-shell";

export type { PublicLister } from "@/lib/lister-discovery";

export function ListerDiscovery({ listers }: { listers: PublicLister[] }) {
  const { tx } = useLanguage();
  const [mode, setMode] = useState<ListerSearchMode>("location");
  const [input, setInput] = useState("");
  const hasPublishedListers = listers.length > 0;
  const hasQuery = input.trim().length > 0;
  const results = filterPublicListers(listers, mode, input);

  function search(event: FormEvent) {
    event.preventDefault();
  }

  function chooseMode(nextMode: ListerSearchMode) {
    setMode(nextMode);
    setInput("");
  }

  return (
    <WebShell section="listers">
      <section className="web-lister-hero">
        <ProgressiveImage src="/images/properties/warm-living-room.jpg" alt={tx("Warm living room with natural light", "သဘာဝအလင်းရောင်ပါ ဧည့်ခန်း")} fill preload sizes="100vw" className="object-cover" />
        <div className="web-hero-shade" />
        <div className="web-lister-hero-content">
          <h1>{tx("The right place starts", "သင့်အိမ်သစ်အတွက်")}<br />{tx("with a conversation.", "ဆွေးနွေးမှုမှ စတင်ပါ။")}</h1>
          <form className="web-lister-search" onSubmit={search} role="search">
            <h2>{tx("Find a property lister", "အိမ်စာရင်းတင်သူရှာရန်")}</h2>
            <div>
              <div className="web-lister-tabs">
                <button type="button" aria-pressed={mode === "location"} onClick={() => chooseMode("location")}>{tx("Location", "နေရာ")}</button>
                <button type="button" aria-pressed={mode === "name"} onClick={() => chooseMode("name")}>{tx("Name", "အမည်")}</button>
              </div>
              <label className="web-location-input">
                <MapPin />
                <span className="sr-only">{mode === "location" ? tx("City or township", "မြို့ သို့မဟုတ် မြို့နယ်") : tx("Lister name", "စာရင်းတင်သူအမည်")}</span>
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={mode === "location" ? tx("City or township", "မြို့ သို့မဟုတ် မြို့နယ်") : tx("Lister name", "စာရင်းတင်သူအမည်")}
                />
                {hasQuery ? (
                  <button type="button" onClick={() => setInput("")} aria-label={tx("Clear lister search", "စာရင်းတင်သူရှာဖွေမှု ရှင်းရန်")}><X /></button>
                ) : (
                  <button type="submit" aria-label={tx("Search listers", "စာရင်းတင်သူရှာရန်")}><Search /></button>
                )}
              </label>
            </div>
          </form>
        </div>
      </section>

      <section className="web-lister-section web-container">
        <h2>{tx("Meet the people behind the properties", "အိမ်စာရင်းတင်သူများနှင့် ဆက်သွယ်ပါ")}</h2>
        <p>{tx("Explore listers represented on the published homes shown here. Open a home to contact its owner or agent through the existing inquiry tools.", "ဤနေရာတွင် ဖော်ပြထားသော ကြော်ငြာအိမ်များ၏ စာရင်းတင်သူများကို ရှာပါ။ ပိုင်ရှင် သို့မဟုတ် အေးဂျင့်အား မေးမြန်းရန် အိမ်အသေးစိတ်ကို ဖွင့်ပါ။")}</p>
        <small>{tx("A7 does not currently provide a public agent directory, profile photos, agency details, ratings, or sales history.", "A7 တွင် အများပြည်သူသုံး အေးဂျင့်စာရင်း၊ ကိုယ်ရေးဓာတ်ပုံ၊ ကုမ္ပဏီအချက်အလက်၊ အဆင့်သတ်မှတ်ချက် သို့မဟုတ် အရောင်းမှတ်တမ်း မရရှိသေးပါ။")}</small>
        <p role="status" aria-live="polite">{hasPublishedListers ? tx(`${results.length} listers shown`, `စာရင်းတင်သူ ${results.length} ဦး`) : tx("No published listers available", "ကြော်ငြာထားသော စာရင်းတင်သူ မရှိသေးပါ")}</p>

        {results.length ? (
          <div className="web-lister-grid">
            {results.map((lister) => (
              <article className="web-lister-card" key={lister.id}>
                <div className="web-lister-avatar" aria-hidden="true"><UserRound /></div>
                <div>
                  <h3>{lister.name}</h3>
                  <p>{lister.type === "agent" ? tx("Agent", "အေးဂျင့်") : tx("Property owner", "အိမ်ပိုင်ရှင်")}</p>
                  <p>{[...new Set(lister.listings.map((listing) => listing.location))].join(" · ")}</p>
                  <small>{tx(`${lister.listings.length} published homes shown`, `ဖော်ပြထားသော ကြော်ငြာအိမ် ${lister.listings.length} လုံး`)}</small>
                  <Link className="web-button web-button-outline" href={`/properties/${encodeURIComponent(lister.listings[0].id)}`}>{tx("View home & inquire", "အိမ်ကြည့်ပြီး မေးမြန်းရန်")}</Link>
                </div>
              </article>
            ))}
          </div>
        ) : hasPublishedListers ? (
          <div className="web-search-empty">
            <UserRound />
            <h3>{tx("No matching listers", "ကိုက်ညီသော စာရင်းတင်သူမရှိပါ")}</h3>
            <p>{tx("Try another name or location, or clear the search to see every available lister.", "အခြားအမည် သို့မဟုတ် နေရာဖြင့် ရှာပါ၊ သို့မဟုတ် ရရှိနိုင်သော စာရင်းတင်သူအားလုံးကြည့်ရန် ရှာဖွေမှုကို ရှင်းပါ။")}</p>
            <button type="button" className="web-button web-button-outline" onClick={() => setInput("")}>{tx("Clear search", "ရှာဖွေမှုရှင်းရန်")}</button>
          </div>
        ) : (
          <div className="web-search-empty">
            <UserRound />
            <h3>{tx("No published listers yet", "ကြော်ငြာထားသော စာရင်းတင်သူ မရှိသေးပါ")}</h3>
            <p>{isApiConfigured() ? tx("This directory is built from live published homes. A lister will appear here after publishing an available property.", "ဤစာရင်းသည် အမှန်တကယ် ကြော်ငြာထားသောအိမ်များမှ ဖန်တီးထားပါသည်။ ရရှိနိုင်သောအိမ်ကို ကြော်ငြာပြီးနောက် စာရင်းတင်သူကို ဤနေရာတွင် တွေ့ရပါမည်။") : tx("No API is configured. Connect the marketplace API and publish a home before listers can appear here.", "API မချိတ်ဆက်ထားပါ။ စာရင်းတင်သူများ ပေါ်လာရန် marketplace API ကို ချိတ်ဆက်ပြီး အိမ်တစ်လုံး ကြော်ငြာပါ။")}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/search?purpose=rent" className="web-button web-button-outline">{tx("Browse homes", "အိမ်များကြည့်ရန်")}</Link>
              <Link href="/owner?create=1" className="web-button web-button-primary">{tx("Publish a property", "အိမ်ကြော်ငြာတင်ရန်")}</Link>
            </div>
          </div>
        )}
      </section>
      <WebFooter />
    </WebShell>
  );
}
