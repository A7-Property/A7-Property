"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/i18n/language-provider";
import { ProgressiveImage } from "@/components/ui/progressive-image";
import { useSavedHomes, type SavedHomes } from "@/hooks/use-saved-homes";
import { isApiConfigured } from "@/lib/api/client";
import type { Property } from "@/lib/properties";
import { WebShell, WebFooter } from "./web-shell";
import { WebPropertyCard } from "./web-property-card";

export interface WebHomeProps { recommended: Property[]; featured: Property[]; recent: Property[] }

export function WebHome({ recommended, featured, recent }: WebHomeProps) {
  const { tx } = useLanguage();
  const router = useRouter();
  const savedHomes = useSavedHomes();
  const [query, setQuery] = useState("");
  const [purpose, setPurpose] = useState<"sale" | "rent">("sale");
  function search(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams({ purpose });
    if (query.trim()) params.set("q", query.trim());
    router.push(`/search?${params}`);
  }
  const actions = [
    { title: tx("Buy a home", "အိမ်ဝယ်ရန်"), description: tx("Find a place to call your own. Explore homes for sale, compare your favorites, and contact the lister directly.", "သင့်ကိုယ်ပိုင်အိမ်ကို ရှာပါ။ ရောင်းရန်အိမ်များကို ကြည့်ပြီး နှိုင်းယှဉ်ကာ စာရင်းတင်သူကို တိုက်ရိုက်ဆက်သွယ်ပါ။"), image: "/icons/a7-home-journey-3d.png", button: tx("Browse homes", "အိမ်များကြည့်ရန်"), href: "/search?purpose=sale" },
    { title: tx("Rent a home", "အိမ်ငှားရန်"), description: tx("A new neighborhood. A fresh start. Discover rentals by location, monthly budget, and the details that matter to you.", "ရပ်ကွက်သစ်တွင် အစသစ်ဖွင့်ပါ။ နေရာ၊ လစဉ်ဘတ်ဂျက်နှင့် သင့်လိုအပ်ချက်များအလိုက် ငှားရန်အိမ်ကို ရှာပါ။"), image: "/icons/a7-recommended-home-3d.png", button: tx("Find rentals", "ငှားရန်အိမ်ရှာပါ"), href: "/search?purpose=rent" },
    { title: tx("List a property", "အိမ်စာရင်းတင်ရန်"), description: tx("Give your property its next chapter. Only a lister account can create listings and manage inquiries.", "အိမ်စာရင်းတင်သူ (lister) အကောင့်ဖြင့်သာ အိမ်စာရင်းဖန်တီးပြီး မေးမြန်းမှုများကို စီမံနိုင်ပါသည်။"), image: "/icons/a7-listing-workspace-3d.png", button: tx("List property", "အိမ်စာရင်းတင်ရန်"), href: "/owner?create=1" },
  ];
  return (
    <WebShell>
      <section className="web-home-hero">
        <ProgressiveImage src="/images/properties/hero-yangon-home.jpg" alt={tx("Tropical home with a garden in Yangon", "ရန်ကုန်ရှိ ဥယျာဉ်ပါအိမ်")} fill preload sizes="(min-width: 1024px) calc(100vw - 80px), 100vw" className="object-cover" />
        <div className="web-hero-shade" />
        <div className="web-hero-content">
          <h1>{tx("Find Your Place", "သင့်နေရာကို ရှာပါ")}<br />{tx("with A7 Property", "A7 Property နှင့်အတူ")}</h1>
          <div className="web-hero-tabs" aria-label={tx("Listing type", "စာရင်းအမျိုးအစား")}><button type="button" aria-pressed={purpose === "sale"} onClick={() => setPurpose("sale")}>{tx("Buy", "ဝယ်ရန်")}</button><button type="button" aria-pressed={purpose === "rent"} onClick={() => setPurpose("rent")}>{tx("Rent", "ငှားရန်")}</button></div>
          <form onSubmit={search} className="web-hero-search" role="search"><input aria-label={tx("Search location or property", "နေရာ သို့မဟုတ် အိမ်ရှာရန်")} placeholder={tx("Enter location, city, township, or property name", "နေရာ၊ မြို့၊ မြို့နယ် သို့မဟုတ် အိမ်အမည်ထည့်ပါ")} value={query} onChange={(event) => setQuery(event.target.value)} /><button type="submit" aria-label={tx("Search properties", "အိမ်များရှာရန်")}><Search /></button></form>
        </div>
      </section>
      <section className="web-recommend-intro web-container">
        <div><span className="web-eyebrow">{tx("YOUR NEXT CHAPTER", "သင့်ဘဝစာမျက်နှာသစ်")}</span><h2>{tx("A home search that feels like you.", "သင့်အတွက် အိမ်ရှာဖွေမှု။")}</h2><p>{tx("Start with your location and budget. Explore real listings with visible verification status, then build your shortlist.", "သင့်နေရာနှင့် ဘတ်ဂျက်ဖြင့် စတင်ပါ။ စိစစ်မှုအခြေအနေပါသော အိမ်စာရင်းများကို ကြည့်ပြီး စိတ်ကြိုက်စာရင်းဖန်တီးပါ။")}</p><Link href="/assistant" className="web-button web-button-outline">{tx("Explore home matching", "အိမ်လိုက်ဖက်မှုရှာရန်")}<ArrowRight /></Link><small>{tx("A browser-based, rule-based matching demo.", "ဘရောက်ဇာအတွင်း စည်းမျဉ်းအခြေပြု အိမ်ရွေးချယ်မှုသရုပ်ပြ။")}</small></div>
        <div className="web-recommend-art"><Image src="/icons/a7-personal-search-3d.png" alt="" width={340} height={300} loading="lazy" /><span>{tx("Your location. Your budget. Your place.", "သင့်နေရာ။ သင့်ဘတ်ဂျက်။ သင့်အိမ်။")}</span></div>
      </section>
      <div className="web-home-listings web-container">
        <PropertySection savedHomes={savedHomes} title={tx("Recommended properties", "အကြံပြုထားသောအိမ်များ")} description={tx("Explore published homes, with verified listings first.", "စိစစ်ပြီးအိမ်များကို ဦးစားပေးထားသော ကြော်ငြာအိမ်များ။")} properties={recommended} />
        <PropertySection savedHomes={savedHomes} title={tx("Featured properties", "အထူးဖော်ပြသောအိမ်များ")} description={tx("A closer look at homes with verified listing details.", "အချက်အလက်စိစစ်ပြီး အိမ်များကို လေ့လာပါ။")} properties={featured} />
        <PropertySection savedHomes={savedHomes} title={tx("Recently listed", "အသစ်တင်ထားသောအိမ်များ")} description={tx("The latest published homes available to explore.", "နောက်ဆုံးကြော်ငြာထားသော အိမ်များကို ကြည့်ပါ။")} properties={recent} href="/search?purpose=sale&sort=newest" />
      </div>
      <section className="web-actions-section"><div className="web-container web-action-grid">{actions.map((action) => <article key={action.href} className="web-action-card"><Image src={action.image} alt="" width={190} height={180} loading="lazy" /><h2>{action.title}</h2><p>{action.description}</p><Link href={action.href} className="web-button web-button-outline">{action.button}</Link></article>)}</div></section>
      <section className="web-location-section web-container"><h2>{tx("Find your corner of Myanmar", "မြန်မာနိုင်ငံတွင် သင့်နေရာကိုရှာပါ")}</h2><p>{tx("Explore the cities and neighborhoods you love.", "သင်နှစ်သက်သော မြို့များနှင့် ရပ်ကွက်များကို လေ့လာပါ။")}</p><div className="web-location-grid">{[{ name: "Yangon", my: "ရန်ကုန်", image: "yangon-karaweik-v2.jpg" }, { name: "Mandalay", my: "မန္တလေး", image: "mandalay-u-bein-v2.jpg" }, { name: "Bahan", my: "ဗဟန်း", image: "bahan-shwedagon-v2.jpg" }].map((place) => <Link key={place.name} href={`/search?purpose=rent&location=${place.name}`}><Image src={`/images/locations/${place.image}`} alt={tx(place.name, place.my)} fill sizes="30vw" loading="lazy" /><span>{tx(place.name, place.my)}<ArrowRight /></span></Link>)}</div></section>
      <WebFooter />
    </WebShell>
  );
}

function PropertySection({ title, description, properties, savedHomes, href = "/search?purpose=sale" }: { title: string; description: string; properties: Property[]; savedHomes: SavedHomes; href?: string }) {
  const { tx } = useLanguage();
  return <section className="web-property-section"><div className="web-section-heading"><div><h2>{title}</h2><p>{description}</p></div><Link href={href}>{tx("Explore homes", "အိမ်များကြည့်ရန်")}<ArrowRight /></Link></div>{properties.length ? <div className="web-home-property-grid">{properties.map((property) => <WebPropertyCard key={property.id} property={property} savedHomes={savedHomes} />)}</div> : <div className="web-home-empty"><Search /><div><strong>{tx("No properties to show yet", "ဖော်ပြရန် အိမ်များမရှိသေးပါ")}</strong><p>{isApiConfigured() ? tx("No listings are available in this section. Try exploring all homes.", "ဤအပိုင်းတွင် အိမ်စာရင်းများမရရှိပါ။ အိမ်အားလုံးကို ကြည့်ပါ။") : tx("Live listings will appear when A7's property API is connected. This website has no API configured.", "A7 အိမ်ခြံမြေ API ချိတ်ဆက်ပြီးမှ အိမ်စာရင်းများကို ဖော်ပြပါမည်။ ဤဝဘ်ဆိုက်တွင် API မချိတ်ဆက်ထားပါ။")}</p></div></div>}</section>;
}
