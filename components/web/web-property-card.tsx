"use client";

import Link from "next/link";
import { Heart, MapPin, ShieldCheck, ShieldQuestion } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/components/i18n/language-provider";
import { ProgressiveImage } from "@/components/ui/progressive-image";
import type { SavedHomes } from "@/hooks/use-saved-homes";
import { formatPropertyPrice, propertyTypeLabels, propertyTypeLabelsMy, type Property } from "@/lib/properties";

export function WebPropertyCard({ property, selected, onSelect, savedHomes }: { property: Property; selected?: boolean; onSelect?: (id: string) => void; savedHomes: Pick<SavedHomes, "isSaved" | "toggleSaved"> }) {
  const { tx, isMyanmar } = useLanguage();
  const { isSaved, toggleSaved } = savedHomes;
  const [saving, setSaving] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const saved = isSaved(property.id);
  const verified = property.verification_status === "verified";
  const status = verified ? tx("Verified listing", "အိမ်စိစစ်ပြီး") : property.verification_status === "pending" ? tx("Verification pending", "စိစစ်ဆဲ") : property.verification_status === "rejected" ? tx("Verification rejected", "စိစစ်မှုငြင်းပယ်ထား") : tx("Unverified listing", "မစိစစ်ရသေးသောအိမ်");
  async function save() {
    setSaving(true);
    try { await toggleSaved(property); } finally { setSaving(false); }
  }
  return (
    <article className={`web-property-card ${selected ? "is-selected" : ""}`} data-web-property-id={property.id}>
      <Link href={`/properties/${encodeURIComponent(property.id)}`} className="web-card-link" aria-label={tx(`View ${property.title}`, `${property.title} ကို ကြည့်ရန်`)}>
        <div className="web-card-photo">
          {property.images[0] && !photoFailed ? <ProgressiveImage src={property.images[0]} alt={property.title} fill unoptimized sizes="(min-width: 1440px) 23vw, 40vw" loading="lazy" onError={() => setPhotoFailed(true)} className="object-cover" /> : <span className="web-photo-empty">{tx("Photo unavailable", "ဓာတ်ပုံမရရှိပါ")}</span>}
          <span className={`web-trust-badge ${verified ? "is-verified" : ""}`}>{verified ? <ShieldCheck /> : <ShieldQuestion />}{status}</span>
          {property.images.length > 1 && <span className="web-photo-count">{tx(`${property.images.length} photos`, `ဓာတ်ပုံ ${property.images.length} ပုံ`)}</span>}
        </div>
        <div className="web-card-body">
          <p className="web-card-price">{formatPropertyPrice(property, isMyanmar ? "my" : "en")}{property.purpose === "rent" && <small>{tx(" /mo", " /လ")}</small>}</p>
          <p className="web-card-facts"><strong>{property.bedrooms}</strong> {tx("beds", "အိပ်ခန်း")} <span>·</span> <strong>{property.bathrooms}</strong> {tx("baths", "ရေချိုးခန်း")} <span>·</span> <strong>{property.area_sqft.toLocaleString()}</strong> {tx("sqft", "စတုရန်းပေ")}</p>
          <p className="web-card-type">{isMyanmar ? propertyTypeLabelsMy[property.property_type] : propertyTypeLabels[property.property_type]} · {property.purpose === "rent" ? tx("For rent", "ငှားရန်") : tx("For sale", "ရောင်းရန်")}</p>
          <p className="web-card-title">{property.title}</p>
          <p className="web-card-address">{property.address || `${property.township}, ${property.city}`}</p>
          <p className="web-card-owner">{property.owner.name}</p>
          {property.purpose === "rent" && property.amenities.length > 0 && <p className="web-card-amenities">{property.amenities.slice(0, 3).join(" · ")}</p>}
        </div>
      </Link>
      <button className="web-favorite" type="button" aria-pressed={saved} disabled={saving} onClick={() => void save()} aria-label={saved ? tx(`Unsave ${property.title}`, `${property.title} ကို ဖယ်ရန်`) : tx(`Save ${property.title}`, `${property.title} ကို သိမ်းရန်`)}><Heart fill={saved ? "currentColor" : "none"} /></button>
      {onSelect && property.lat !== null && property.lng !== null && <button className="web-card-map" type="button" aria-pressed={Boolean(selected)} onClick={() => onSelect(property.id)}><MapPin />{tx("Show on map", "မြေပုံတွင်ကြည့်ရန်")}</button>}
    </article>
  );
}
