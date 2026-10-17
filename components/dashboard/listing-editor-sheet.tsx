"use client";

import { Camera, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/i18n/language-provider";
import { AnimatedAssetIcon } from "@/components/ui/animated-asset-icon";
import { ProgressiveImage } from "@/components/ui/progressive-image";
import { Sheet } from "@/components/ui/sheet";
import {
  furnitureLabels,
  furnitureLabelsMy,
  propertyTypeLabels,
  propertyTypeLabelsMy,
  searchLocations,
  type FurnitureStatus,
  type Property,
  type PropertyType,
} from "@/lib/properties";
import { ApiError, isApiConfigured } from "@/lib/api/client";
import * as uploadsApi from "@/lib/api/uploads";

/**
 * The shape the CRM saves back. Numeric fields stay as strings in the form so an
 * empty input never becomes 0 silently; the caller parses what it needs.
 *
 * `imageAssetIds` is server-mode-only — the ids returned by the uploads
 * endpoint, which the API uses to attach the already-uploaded files to the
 * listing. In device mode this list stays empty: the browser demo cannot store
 * real photos anywhere persistent.
 */
export interface ListingDraft {
  title: string;
  description: string;
  township: string;
  purpose: "rent" | "sale";
  propertyType: PropertyType;
  price: string;
  currency: string;
  bedrooms: string;
  bathrooms: string;
  areaSqft: string;
  address: string;
  city: string;
  floor: string;
  yearBuilt: string;
  furniture: FurnitureStatus | "";
  amenities: string[];
  imageAssetIds: string[];
  documents: { documentId?: string; documentAssetId: string; documentUrl: string; documentType: string }[];
}

export interface UploadedPhoto {
  assetId: string;
  url: string;
}

interface ListingEditorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property?: Property | null;
  onSave: (draft: ListingDraft) => Promise<boolean>;
  /** The CRM owns this flag so the "Save" button can be disabled while a request is in flight. */
  busy?: boolean;
  initialPurpose?: "rent" | "sale";
}

const yangonTownships = ["Bahan", "Kamayut", "Hlaing", "Yankin", "Sanchaung", "Dagon", "Mayangone"];
const mandalayTownships = ["Chanmyathazi", "Aungmyaythazan"];
const cityForTownship = (township: string) =>
  mandalayTownships.includes(township) ? "Mandalay" : yangonTownships.includes(township) ? "Yangon" : "Yangon";

const commonAmenities = ["Lift", "Parking", "Air conditioning", "Furnished", "Balcony", "Water heater", "Fiber internet ready", "Pool", "Gym", "Security"];

const emptyDraft: ListingDraft = {
  title: "",
  description: "",
  township: "Bahan",
  purpose: "rent",
  propertyType: "condo",
  price: "",
  currency: "MMK",
  bedrooms: "2",
  bathrooms: "1",
  areaSqft: "",
  address: "",
  city: "Yangon",
  floor: "",
  yearBuilt: "",
  furniture: "",
  amenities: [],
  imageAssetIds: [],
  documents: [],
};

function draftFromProperty(property: Property): ListingDraft {
  return {
    title: property.title,
    description: property.description,
    township: property.township,
    purpose: property.purpose,
    propertyType: property.property_type,
    price: String(property.price),
    currency: property.currency,
    bedrooms: String(property.bedrooms),
    bathrooms: String(property.bathrooms),
    areaSqft: String(property.area_sqft),
    address: property.address,
    city: property.city,
    floor: property.floor === null ? "" : String(property.floor),
    yearBuilt: property.year_built === null ? "" : String(property.year_built),
    furniture: property.furniture ?? "",
    amenities: [...property.amenities],
    // Image ids come from fresh uploads; existing photos stay attached unless
    // the caller sends a new list.
    imageAssetIds: [...(property.image_asset_ids ?? [])],
    documents: property.documents ? property.documents.map(d => ({ documentId: d.id, documentAssetId: "", documentUrl: d.url, documentType: d.type })) : [],
  };
}

function ListingEditorSheet({ open, onOpenChange, property, onSave, busy = false, initialPurpose = "rent" }: ListingEditorSheetProps) {
  const { tx, isMyanmar } = useLanguage();
  const serverBacked = isApiConfigured();
  const [saved, setSaved] = useState(false);
  const savingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<ListingDraft>(emptyDraft);
  const [uploaded, setUploaded] = useState<UploadedPhoto[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(0);
  const [docUploadError, setDocUploadError] = useState("");
  const [uploadingDocs, setUploadingDocs] = useState(0);
  const [showOwnershipSample, setShowOwnershipSample] = useState(false);

  // Resetting on open rather than on mount keeps the state fresh across each
  // "Create" / "Edit" invocation without rebuilding the whole sheet.
  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setSaved(false);
      setError("");
      setUploadError("");
      setDocUploadError("");
      setUploaded([]);
      setUploading(0);
      setUploadingDocs(0);
      setShowOwnershipSample(false);
      setDraft(property ? draftFromProperty(property) : { ...emptyDraft, purpose: initialPurpose });
    });
  }, [open, property, initialPurpose]);

  const field = useCallback((key: keyof ListingDraft, value: string | string[]) =>
    setDraft((current) => ({ ...current, [key]: value as never })), []);

  function changeTownship(township: string) {
    setDraft((current) => ({ ...current, township, city: cityForTownship(township) }));
  }

  function toggleAmenity(name: string) {
    setDraft((current) => current.amenities.includes(name)
      ? { ...current, amenities: current.amenities.filter((item) => item !== name) }
      : { ...current, amenities: [...current.amenities, name] });
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    if (!serverBacked) {
      // Device mode cannot store a photo anywhere persistent, so previewing one
      // would imply a save that never happens.
      setUploadError(tx(
        "Photos cannot be uploaded in the device demo. Connect the API to upload real photos.",
        "ဤစက်နမူနာတွင် ဓာတ်ပုံတင်၍ မရပါ။ အစစ်အမှန်ဓာတ်ပုံတင်ရန် API ကို ချိတ်ဆက်ပါ။",
      ));
      return;
    }
    if (draft.imageAssetIds.length + files.length > 20) {
      setUploadError(tx("Up to 20 photos per listing.", "အိမ်စာရင်းတစ်ခုလျှင် ဓာတ်ပုံ ၂၀ အထိ"));
      return;
    }

    setUploadError("");
    setUploading((count) => count + files.length);
    const uploadedNow: UploadedPhoto[] = [];
    try {
      // Serially: one failure stops the batch so the user is not told some
      // photos uploaded when they did not.
      for (const file of files) {
        try {
          const asset = await uploadsApi.uploadPropertyImage(file);
          uploadedNow.push({ assetId: asset.id, url: asset.url });
        } catch (error) {
          setUploadError(error instanceof ApiError
            ? (error.needsEmailVerification
              ? tx("Confirm your email address first, then try again.", "သင့်အီးမေးလ်လိပ်စာကို အရင်အတည်ပြုပြီးမှ ထပ်မံကြိုးစားပါ။")
              : error.message)
            : tx("Upload failed. Check your connection and try again.", "ဓာတ်ပုံတင်ခြင်း မအောင်မြင်ပါ။ အင်တာနက်ချိတ်ဆက်မှုကို စစ်ပြီး ထပ်မံကြိုးစားပါ။"));
          break;
        }
      }
    } finally {
      setUploading((count) => count - files.length);
    }

    if (uploadedNow.length === 0) return;
    setUploaded((current) => [...current, ...uploadedNow]);
    setDraft((current) => ({ ...current, imageAssetIds: [...current.imageAssetIds, ...uploadedNow.map((item) => item.assetId)] }));
  }

  function removeUploaded(assetId: string) {
    setUploaded((current) => current.filter((item) => item.assetId !== assetId));
    setDraft((current) => ({ ...current, imageAssetIds: current.imageAssetIds.filter((id) => id !== assetId) }));
  }

  async function handleDocFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    if (!serverBacked) {
      setDocUploadError(tx("Cannot upload in demo.", "နမူနာတွင် တင်၍မရပါ။"));
      return;
    }

    if (draft.documents.length + files.length > 5) {
      setDocUploadError(tx("Up to 5 documents per listing.", "စာရွက်စာတမ်း ၅ ခုအထိသာ"));
      return;
    }

    setDocUploadError("");
    setUploadingDocs((count) => count + files.length);
    const uploadedNow: { documentAssetId: string; documentUrl: string; documentType: string }[] = [];
    try {
      for (const file of files) {
        try {
          const asset = await uploadsApi.uploadPropertyDocument(file);
          uploadedNow.push({ documentAssetId: asset.id, documentUrl: asset.url, documentType: "PROPERTY_OWNERSHIP" });
        } catch {
          setDocUploadError(tx("Upload failed.", "ဓာတ်ပုံတင်ခြင်း မအောင်မြင်ပါ။"));
          break;
        }
      }
    } finally {
      setUploadingDocs((count) => count - files.length);
    }

    if (uploadedNow.length === 0) return;
    setDraft((current) => ({ ...current, documents: [...current.documents, ...uploadedNow] }));
  }

  function removeUploadedDoc(index: number) {
    setDraft((current) => ({ ...current, documents: current.documents.filter((_, i) => i !== index) }));
  }

  async function save() {
    if (savingRef.current || busy || uploading > 0 || uploadingDocs > 0) return;
    // Validation mirrors the backend DTO so the user sees the actual rule
    // rather than a server round-trip failure. The server still enforces it.
    if (draft.title.trim().length < 5) {
      setError(tx("Add a clear title (at least 5 characters).", "ရှင်းလင်းသောခေါင်းစဉ် (စာလုံး ၅ လုံးအနည်းဆုံး) ထည့်ပါ။"));
      return;
    }
    if (draft.description.trim().length < 20) {
      setError(tx(
        "Describe the home in at least 20 characters so a seeker can decide whether to inquire.",
        "ရှာဖွေသူ ဆုံးဖြတ်နိုင်ရန် အိမ်အကြောင်းကို အနည်းဆုံး စာလုံး ၂၀ ရှိရှိ ဖော်ပြပါ။",
      ));
      return;
    }
    if (draft.address.trim().length < 5) {
      setError(tx("Add the full street address.", "လမ်းလိပ်စာအပြည့်အစုံ ထည့်ပါ။"));
      return;
    }
    if (!draft.price || Number(draft.price) <= 0) {
      setError(tx("Add a valid price in MMK.", "မှန်ကန်သော ကျပ်ဈေးနှုန်း ထည့်ပါ။"));
      return;
    }
    if (!draft.areaSqft || Number(draft.areaSqft) <= 0) {
      setError(tx("Add the floor area in square feet.", "ကြမ်းခင်းအကျယ်အဝန်း (စတုရန်းပေ) ထည့်ပါ။"));
      return;
    }
    if (draft.yearBuilt && (Number(draft.yearBuilt) < 1800 || Number(draft.yearBuilt) > 2100)) {
      setError(tx("Year built should be between 1800 and 2100.", "ဆောက်လုပ်သည့်နှစ်သည် ၁၈၀၀ မှ ၂၁၀၀ အတွင်း ဖြစ်ရမည်။"));
      return;
    }
    setError("");
    savingRef.current = true;
    setSubmitting(true);
    try {
      const accepted = await onSave(draft);
      if (accepted) setSaved(true);
      else setError(tx("Save failed. Your changes are still here. Please try again.", "သိမ်းမရပါ။ သင့်ပြောင်းလဲမှုများ မပျောက်ပါ။ ပြန်ကြိုးစားပါ။"));
    } catch {
      setError(tx("Save failed. Your changes are still here. Please try again.", "သိမ်းမရပါ။ သင့်ပြောင်းလဲမှုများ မပျောက်ပါ။ ပြန်ကြိုးစားပါ။"));
    } finally { savingRef.current = false; setSubmitting(false); }
  }

  const existingImages = property?.images ?? [];
  const totalPhotos = (property ? existingImages.length : 0) + uploaded.length;

  const inputClass = "h-11 w-full rounded-xl border border-[#101828]/12 px-3 text-xs outline-none focus:border-[#123B73]";
  const selectClass = "h-11 w-full rounded-xl border border-[#101828]/12 bg-[#F8FBFF] px-3 text-xs";
  const labelClass = "mb-2 block text-[10px] font-semibold uppercase tracking-wider text-[#667085]";

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={property ? tx("Edit property", "အိမ်စာရင်းပြင်ရန်") : tx("Create a listing", "အိမ်စာရင်းဖန်တီးရန်")}
      description={serverBacked
        ? tx("New listings start as drafts. You can publish once a photo is uploaded and your email is verified.", "အိမ်စာရင်းအသစ်များသည် မူကြမ်းအဖြစ် စတင်ပါသည်။ ဓာတ်ပုံတင်ပြီး သင့်အီးမေးလ်အတည်ပြုပြီးပါက ကြော်ငြာထုတ်နိုင်ပါသည်။")
        : tx("Add clear facts and strong photos. You can save a draft before publishing.", "တိကျသောအချက်အလက်နှင့် ပုံကောင်းများထည့်ပါ။ မတင်မီ မူကြမ်းအဖြစ် သိမ်းနိုင်သည်။")}
      side="right"
      footer={!saved && (
        <Button className="w-full" onClick={save} disabled={busy || submitting || uploading > 0 || uploadingDocs > 0}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {property ? tx("Save changes", "ပြင်ဆင်ချက်များသိမ်းရန်") : tx("Save listing", "အိမ်စာရင်း သိမ်းရန်")}
        </Button>
      )}
    >
      {saved ? (
        <div className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
          <AnimatedAssetIcon src="/icons/a7-draft-saved-3d.png" width={96} height={96} hover="float" className="size-24" imageClassName="drop-shadow-[0_10px_16px_rgba(18,59,115,.18)]" />
          <h3 className="mt-5 text-lg font-semibold">{property ? tx("Property updated", "အိမ်စာရင်း အပ်ဒိတ်ပြီး") : tx("Draft created", "မူကြမ်းဖန်တီးပြီး")}</h3>
          <p className="mt-2 max-w-xs text-xs leading-5 text-[#59616A]">
            {serverBacked
              ? (property
                ? tx("The listing is updated. If it was verified, a reviewer will re-check it before it is shown as verified again.", "အိမ်စာရင်းကို အသစ်ပြောင်းပြီးပါပြီ။ စိစစ်ပြီးဖြစ်ပါက ပြန်စစ်ပြီးမှသာ စိစစ်ပြီးအဖြစ် ပြန်ပေါ်ပါမည်။")
                : tx("Your draft is saved. Publish it from the properties list when you are ready.", "မူကြမ်းကို သိမ်းပြီးပါပြီ။ အဆင်သင့်ဖြစ်ပါက အိမ်စာရင်းစာမျက်နှာမှ ကြော်ငြာထုတ်ပါ။"))
              : tx("Your listing is saved. Complete verification before publishing it to home seekers.", "အိမ်စာရင်းကို သိမ်းပြီးပါပြီ။ အိမ်ရှာဖွေသူများထံ မတင်မီ စိစစ်မှုအပြီးသတ်ပါ။")}
          </p>
          <Button variant="outline" className="mt-6" onClick={() => onOpenChange(false)}>{tx("Back to properties", "အိမ်စာရင်းများသို့ ပြန်ရန်")}</Button>
        </div>
      ) : (
        <div className="space-y-5 p-5 sm:p-7">
          {error && <div role="alert" className="rounded-xl border border-[#EAB7B1] bg-[#FFF7F6] px-4 py-3 text-xs text-[#B13D34]">{error}</div>}

          <label className="block">
            <span className={labelClass}>{tx("Property title", "အိမ်စာရင်းခေါင်းစဉ်")}</span>
            <input value={draft.title} onChange={(event) => field("title", event.target.value)} maxLength={200} placeholder={tx("Bright 2-bed condo near Hledan", "လှည်းတန်းအနီး အလင်းရောင်ကောင်းသော အိပ်ခန်း ၂ ခန်းကွန်ဒို")} className={inputClass} />
          </label>

          <label className="block">
            <span className={labelClass}>{tx("Description", "ဖော်ပြချက်")}</span>
            <textarea value={draft.description} onChange={(event) => field("description", event.target.value)} maxLength={10000} rows={5} placeholder={tx("What is it like to live here? Highlight light, layout, access, parking.", "ဤအိမ်တွင် နေထိုင်ရသည်မှာ မည်သို့နည်း? အလင်းရောင်၊ အခန်းဖွဲ့စည်းပုံ၊ သွားလာမှုနှင့် ကားရပ်နားခြင်းကို ဖော်ပြပါ။")} className="w-full rounded-xl border border-[#101828]/12 p-3 text-xs leading-5 outline-none focus:border-[#123B73]" />
            <small className="mt-1 block text-[9px] text-[#667085]">{draft.description.length}/10000</small>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className={labelClass}>{tx("Purpose", "ရည်ရွယ်ချက်")}</span>
              <select value={draft.purpose} onChange={(event) => field("purpose", event.target.value)} className={selectClass}>
                <option value="rent">{tx("For rent", "ငှားရန်")}</option>
                <option value="sale">{tx("For sale", "ရောင်းရန်")}</option>
              </select>
            </label>
            <label>
              <span className={labelClass}>{tx("Property type", "အိမ်အမျိုးအစား")}</span>
              <select value={draft.propertyType} onChange={(event) => field("propertyType", event.target.value as PropertyType)} className={selectClass}>
                {(Object.keys(propertyTypeLabels) as PropertyType[]).map((value) =>
                  <option key={value} value={value}>{isMyanmar ? propertyTypeLabelsMy[value] : propertyTypeLabels[value]}</option>
                )}
              </select>
            </label>
          </div>

          <label className="block">
            <span className={labelClass}>{tx("Township", "မြို့နယ်")}</span>
            <select value={draft.township} onChange={(event) => changeTownship(event.target.value)} className={selectClass}>
              {searchLocations.filter((item) => !["All Myanmar", "Yangon", "Mandalay"].includes(item)).map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>

          <label className="block">
            <span className={labelClass}>{tx("Full address", "လိပ်စာအပြည့်အစုံ")}</span>
            <input value={draft.address} onChange={(event) => field("address", event.target.value)} maxLength={500} placeholder={tx("No. 42, Example Street, Bahan", "အမှတ် ၄၂၊ နမူနာလမ်း၊ ဗဟန်း")} className={inputClass} />
            <small className="mt-1 block text-[9px] text-[#667085]">
              {tx("The city is set from the township automatically.", "မြို့ကို မြို့နယ်မှ အလိုအလျောက် သတ်မှတ်ပါသည်။")} · {draft.city}
            </small>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className={labelClass}>{tx("Price in MMK", "ကျပ်ဈေးနှုန်း")}</span>
              <input type="number" min="1" step="1" value={draft.price} onChange={(event) => field("price", event.target.value)} placeholder="800000" className={inputClass} />
            </label>
            <label>
              <span className={labelClass}>{tx("Floor area (sqft)", "ကြမ်းခင်းအကျယ် (စတုရန်းပေ)")}</span>
              <input type="number" min="1" step="1" value={draft.areaSqft} onChange={(event) => field("areaSqft", event.target.value)} placeholder="900" className={inputClass} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className={labelClass}>{tx("Bedrooms", "အိပ်ခန်း")}</span>
              <input type="number" min="0" max="50" value={draft.bedrooms} onChange={(event) => field("bedrooms", event.target.value)} className={inputClass} />
            </label>
            <label>
              <span className={labelClass}>{tx("Bathrooms", "ရေချိုးခန်း")}</span>
              <input type="number" min="0" max="50" value={draft.bathrooms} onChange={(event) => field("bathrooms", event.target.value)} className={inputClass} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className={labelClass}>{tx("Floor", "အထပ်")}</span>
              <input type="number" min="0" max="200" value={draft.floor} onChange={(event) => field("floor", event.target.value)} placeholder={tx("Optional", "မဖြစ်မနေမဟုတ်")} className={inputClass} />
            </label>
            <label>
              <span className={labelClass}>{tx("Year built", "ဆောက်လုပ်သည့်နှစ်")}</span>
              <input type="number" min="1800" max="2100" value={draft.yearBuilt} onChange={(event) => field("yearBuilt", event.target.value)} placeholder={tx("Optional", "မဖြစ်မနေမဟုတ်")} className={inputClass} />
            </label>
          </div>

          <label className="block">
            <span className={labelClass}>{tx("Furniture", "ပရိဘောဂ")}</span>
            <select value={draft.furniture} onChange={(event) => field("furniture", event.target.value)} className={selectClass}>
              <option value="">{tx("Not specified", "မသတ်မှတ်ထား")}</option>
              {(Object.keys(furnitureLabels) as FurnitureStatus[]).map((value) =>
                <option key={value} value={value}>{isMyanmar ? furnitureLabelsMy[value] : furnitureLabels[value]}</option>
              )}
            </select>
          </label>

          <div>
            <span className={labelClass}>{tx("Amenities", "ဝန်ဆောင်မှုများ")}</span>
            <div className="flex flex-wrap gap-2">
              {commonAmenities.map((name) => {
                const selected = draft.amenities.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleAmenity(name)}
                    aria-pressed={selected}
                    className={selected
                      ? "min-h-11 rounded-full border border-[#123B73] bg-[#123B73] px-3 text-[11px] font-semibold text-white"
                      : "min-h-11 rounded-full border border-[#D0D6E0] bg-white px-3 text-[11px] font-medium text-[#344054]"}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className={labelClass}>{tx("Photos", "ဓာတ်ပုံများ")}</span>
            {existingImages.length > 0 && (
              <div className="mb-3 grid grid-cols-3 gap-2">
                {existingImages.map((url, index) => (
                  <span key={`${url}-${index}`} className="relative block aspect-square overflow-hidden rounded-xl bg-[#F2F4F7]">
                    <ProgressiveImage src={url} alt="" fill sizes="120px" className="object-cover" loading="lazy" />
                  </span>
                ))}
              </div>
            )}
            {uploaded.length > 0 && (
              <div className="mb-3 grid grid-cols-3 gap-2">
                {uploaded.map((photo) => (
                  <span key={photo.assetId} className="relative block aspect-square overflow-hidden rounded-xl border border-[#A9DCC0] bg-[#F2F4F7]">
                    <ProgressiveImage src={photo.url} alt="" fill sizes="120px" className="object-cover" loading="lazy" />
                    <button
                      type="button"
                      onClick={() => removeUploaded(photo.assetId)}
                      className="absolute right-1 top-1 inline-flex size-7 items-center justify-center rounded-full bg-black/60 text-white"
                      aria-label={tx("Remove photo", "ဓာတ်ပုံဖျက်ရန်")}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#123B73]/30 bg-[#EAF4FF]/60 p-5 text-center">
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={handleFiles} />
              <AnimatedAssetIcon src="/icons/a7-property-photos-3d.png" width={64} height={64} hover="float" className="size-16" imageClassName="drop-shadow-[0_8px_12px_rgba(18,59,115,.18)]" />
              <strong className="mt-2 text-xs">
                {uploading > 0
                  ? tx(`Uploading ${uploading} photo${uploading === 1 ? "" : "s"}…`, `ဓာတ်ပုံ ${uploading} ပုံ တင်နေသည်…`)
                  : totalPhotos
                    ? tx(`${totalPhotos} photo${totalPhotos === 1 ? "" : "s"} attached`, `ဓာတ်ပုံ ${totalPhotos} ပုံ ချိတ်ဆက်ပြီး`)
                    : tx("Upload property photos", "အိမ်ဓာတ်ပုံများတင်ရန်")}
              </strong>
              <small className="mt-1 text-[9px] text-[#667085]">{tx("JPG, PNG or WebP · up to 20 photos · 10 MB each", "JPG၊ PNG သို့မဟုတ် WebP · ပုံ ၂၀ အထိ · တစ်ပုံလျှင် 10 MB")}</small>
            </label>
            {uploadError && <p role="alert" className="mt-2 text-[11px] text-[#B13D34]">{uploadError}</p>}
            <p className="mt-2 flex items-center gap-1.5 text-[9px] text-[#667085]"><Camera className="size-3.5" />{tx("Start with a bright, wide room photo for more inquiries.", "မေးမြန်းမှုများလာစေရန် အလင်းရောင်ကောင်းသော အခန်းကျယ်ပုံကို ပထမထည့်ပါ။")}</p>
          </div>

          <div>
            <span className={labelClass}>{tx("Property Ownership Documents", "အိမ်ပိုင်ဆိုင်မှု စာရွက်စာတမ်းများ")}</span>
            <Button
              type="button"
              variant="outline"
              className="mb-3 w-full justify-center"
              aria-expanded={showOwnershipSample}
              aria-controls="ownership-document-sample"
              onClick={() => setShowOwnershipSample((visible) => !visible)}
            >
              {showOwnershipSample
                ? tx("Hide Sample Ownership Document", "ပိုင်ဆိုင်မှုစာရွက်စာတမ်း နမူနာကို ပိတ်ရန်")
                : tx("View Sample Ownership Document", "ပိုင်ဆိုင်မှုစာရွက်စာတမ်း နမူနာကြည့်ရန်")}
            </Button>
            {showOwnershipSample && (
              <figure id="ownership-document-sample" className="mb-3 overflow-hidden rounded-2xl border border-[#D0D6E0] bg-white">
                <div className="relative aspect-[4/3] overflow-hidden bg-[#F2F4F7]">
                  <ProgressiveImage
                    src="/images/property-ownership-document-sample.png"
                    alt={tx("Sample Myanmar property ownership document", "မြန်မာ အိမ်ပိုင်ဆိုင်မှုစာရွက်စာတမ်း နမူနာ")}
                    fill
                    sizes="(max-width: 540px) 100vw, 480px"
                    className="object-contain object-top"
                    loading="lazy"
                  />
                </div>
                <figcaption className="flex items-center justify-between gap-3 px-3 py-2.5 text-[10px] leading-5 text-[#667085]">
                  <span>{tx(
                    "Example only. Your ownership evidence may look different.",
                    "နမူနာအဖြစ်သာ ဖော်ပြထားပါသည်။ သင့်ပိုင်ဆိုင်မှုအထောက်အထား ပုံစံကွဲပြားနိုင်ပါသည်။",
                  )}</span>
                  <a
                    href="/images/property-ownership-document-sample.png"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 font-semibold text-[#123B73] hover:bg-[#EAF4FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#123B73]"
                  >
                    <ExternalLink className="size-4" />
                    {tx("Full size", "ပုံအပြည့်")}
                  </a>
                </figcaption>
              </figure>
            )}
            {draft.documents.length > 0 && (
              <div className="mb-3 grid grid-cols-2 gap-2">
                {draft.documents.map((doc, index) => (
                  <div key={index} className="relative overflow-hidden rounded-xl border border-[#D0D6E0] bg-[#F8FBFF]">
                    <a
                      href={doc.documentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#123B73]"
                      aria-label={tx(`Open ownership document ${index + 1}`, `ပိုင်ဆိုင်မှုစာရွက်စာတမ်း ${index + 1} ကို ဖွင့်ကြည့်ရန်`)}
                    >
                      <span className="relative block aspect-[4/3] overflow-hidden bg-[#F2F4F7]">
                        <ProgressiveImage
                          src={doc.documentUrl}
                          alt={tx(`Ownership document ${index + 1}`, `ပိုင်ဆိုင်မှုစာရွက်စာတမ်း ${index + 1}`)}
                          fill
                          sizes="(max-width: 540px) 50vw, 230px"
                          className="object-cover transition-transform group-hover:scale-[1.02]"
                          loading="lazy"
                        />
                      </span>
                      <span className="flex min-h-11 items-center gap-1.5 px-3 text-[11px] font-medium text-[#344054]">
                        <ExternalLink className="size-3.5 shrink-0" />
                        {tx(`Document ${index + 1}`, `စာရွက်စာတမ်း ${index + 1}`)}
                      </span>
                    </a>
                    {(doc.documentAssetId || doc.documentId) && (
                      <button
                        type="button"
                        onClick={() => removeUploadedDoc(index)}
                        className="absolute right-1 top-1 inline-flex size-11 items-center justify-center rounded-full bg-black/65 text-white shadow-md hover:bg-black/80"
                        aria-label={tx(`Remove ownership document ${index + 1}`, `ပိုင်ဆိုင်မှုစာရွက်စာတမ်း ${index + 1} ကို ဖျက်ရန်`)}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#123B73]/30 bg-[#EAF4FF]/60 p-5 text-center">
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={handleDocFiles} />
              <strong className="mt-2 text-xs">
                {uploadingDocs > 0
                  ? tx(`Uploading ${uploadingDocs} files…`, `ဖိုင် ${uploadingDocs} ခု တင်နေသည်…`)
                  : tx("Upload ownership documents", "ပိုင်ဆိုင်မှု စာရွက်စာတမ်းတင်ရန်")}
              </strong>
              <small className="mt-1 text-[9px] text-[#667085]">{tx("Only visible to you and admins. Max 5 files.", "သင်နှင့် admin သာ မြင်နိုင်မည်။ အများဆုံး ၅ ဖိုင်။")}</small>
            </label>
            {docUploadError && <p role="alert" className="mt-2 text-[11px] text-[#B13D34]">{docUploadError}</p>}
          </div>

        </div>
      )}
    </Sheet>
  );
}

export { ListingEditorSheet };
