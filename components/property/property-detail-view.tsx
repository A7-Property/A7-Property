"use client";

import { ArrowLeft, Bath, BedDouble, Building2, ChevronDown, ChevronUp, Flag, Maximize2, Phone, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useLanguage } from "@/components/i18n/language-provider";
import { useAuth } from "@/components/auth/auth-provider";
import { InquirySheet, type InquiryMode } from "@/components/property/inquiry-sheet";
import { AmenitiesGrid, LocationCard } from "@/components/property/property-detail-sections";
import { PropertyGallery } from "@/components/property/property-gallery";
import { AnimatedAssetIcon } from "@/components/ui/animated-asset-icon";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toast-provider";
import { readStoredIds, STORAGE_KEYS, writeStoredIds } from "@/lib/local-storage";
import { contactVerificationLabel, formatPropertyPrice, listingVerificationLabel, propertyTypeLabels, propertyTypeLabelsMy, type Property } from "@/lib/properties";
import { PropertyTrustBadge } from "@/components/property/property-card-system";
import { cn } from "@/lib/utils";
import { useSavedHomes } from "@/hooks/use-saved-homes";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ApiError, isApiConfigured } from "@/lib/api/client";
import { createPropertyReport, type PropertyReportReason } from "@/lib/api/reports";

function PropertyDetailView({ property }: { property: Property }) {
  const { tx, isMyanmar } = useLanguage();
  const { user, status } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { isSaved, toggleSaved } = useSavedHomes();
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquiryMode, setInquiryMode] = useState<InquiryMode>("schedule");
  const [reportOpen, setReportOpen] = useState(false);

  // Recently viewed stays on the device: it is a browsing convenience, not
  // account data, and there is no endpoint for it.
  useEffect(() => {
    const recent = readStoredIds(STORAGE_KEYS.recent, STORAGE_KEYS.legacyRecent, []);
    writeStoredIds(STORAGE_KEYS.recent, [property.id, ...recent.filter((id) => id !== property.id)].slice(0, 12));
  }, [property.id]);

  const favorite = isSaved(property.id);

  function toggleFavorite() {
    void toggleSaved(property).then(({ applied }) => {
      if (!applied) return;
      toast({ tone: "success", title: favorite ? tx("Removed from Saved Homes", "သိမ်းထားသောအိမ်မှ ဖယ်ပြီး") : tx("Saved for later", "နောက်မှကြည့်ရန် သိမ်းပြီး"), description: property.title });
    });
  }

  function openInquiry(mode: InquiryMode) {
    if (status !== "authenticated" || !user) {
      window.sessionStorage.setItem("a7-auth-return-to", `/properties/${property.id}`);
      router.push("/sign-in");
      return;
    }
    setInquiryMode(mode);
    setInquiryOpen(true);
  }

  function returnToSearch() {
    if (window.sessionStorage.getItem("a7:search-journey") && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(`/search?purpose=${property.purpose}`);
  }

  function reportListing() {
    if (!isApiConfigured()) {
      toast({ tone: "info", title: tx("Reporting is unavailable", "တိုင်ကြားမှု မရရှိနိုင်ပါ"), description: tx("This build has no moderation server configured.", "ဤ build တွင် moderation server မချိတ်ဆက်ထားပါ။") });
      return;
    }
    if (status !== "authenticated" || !user) {
      window.sessionStorage.setItem("a7-auth-return-to", `/properties/${property.id}`);
      router.push("/sign-in");
      return;
    }
    setReportOpen(true);
  }

  const price = formatPropertyPrice(property, isMyanmar ? "my" : "en");
  const propertyType = isMyanmar
    ? propertyTypeLabelsMy[property.property_type]
    : propertyTypeLabels[property.property_type];
  const viewerInitials = (user?.fullName || tx("Guest", "ဧည့်သည်"))
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#FAF8FF] pb-[104px] text-[#191B24]">
      <header className="a7-header-surface a7-safe-top sticky top-0 z-50">
        <div className="mx-auto flex h-14 w-full max-w-[760px] items-center gap-3 px-4 sm:px-6">
          <button type="button" onClick={returnToSearch} className="grid size-11 shrink-0 place-items-center text-[#191B24] transition-colors hover:text-[#0053D2]" aria-label={tx("Back to search", "ရှာဖွေမှုသို့ပြန်ရန်")}><ArrowLeft className="size-5" /></button>
          <p className="min-w-0 flex-1 truncate text-[20px] font-semibold tracking-[-.035em]">{tx("Property Details", "အိမ်အသေးစိတ်")}</p>
          <Avatar initials={viewerInitials} size="sm" className="shrink-0 border border-[#C2C6D8]" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[760px]">
        <PropertyGallery images={property.images} title={property.title} verified={property.verification_status === "verified"} favorite={favorite} onToggleFavorite={toggleFavorite} />

        <div className="px-4 pt-4 sm:px-6 sm:pt-5">
          <section className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {property.verification_status !== "verified" && <PropertyTrustBadge status={property.verification_status} label={tx(listingVerificationLabel(property), property.verification_status === "pending" ? "စိစစ်ဆဲအိမ်" : "မစိစစ်ရသေးသောအိမ်")} />}
                <span className="text-[10px] font-semibold uppercase tracking-[.08em] text-[#727687]">{propertyType} · {property.purpose === "rent" ? tx("For rent", "ငှားရန်") : tx("For sale", "ရောင်းရန်")}</span>
              </div>
              <p className="mt-3 text-[24px] font-bold leading-8 tracking-[-.04em] text-[#101828]">{price}{property.purpose === "rent" && <span className="ml-1.5 text-[12px] font-normal leading-none tracking-normal text-[#667085]">{tx("/ month", "/ လ")}</span>}</p>
              <h1 className="mt-1 text-[26px] font-bold leading-8 tracking-[-.04em] text-[#191B24] sm:text-[32px]">{property.title}</h1>
              <p className="mt-1 min-h-5 truncate text-[14px] leading-5 text-[#424655]">{property.township}, {property.city}</p>
            </div>
            {property.verification_status === "verified" && <AnimatedAssetIcon src="/icons/a7-verified-home-3d.png" width={64} height={64} hover="float" className="size-16" imageClassName="drop-shadow-[0_10px_15px_rgba(18,59,115,.2)]" unoptimized />}
          </section>

          <section className="mt-4 grid grid-cols-4 divide-x divide-[#E1E2EE] border-y border-[#E1E2EE] py-4" aria-label={tx("Property facts", "အိမ်အချက်အလက်")}>
            <PropertyFact icon={BedDouble} value={property.bedrooms} label={tx("Beds", "အိပ်ခန်း")} />
            <PropertyFact icon={Bath} value={property.bathrooms} label={tx("Baths", "ရေချိုးခန်း")} />
            <PropertyFact icon={Maximize2} value={property.area_sqft.toLocaleString()} label={tx("Sqft", "စတုရန်းပေ")} valueClassName="text-[16px]" />
            <PropertyFact icon={Building2} value={property.floor ?? "—"} label={tx("Floor", "အထပ်")} />
          </section>

          <OverviewSection property={property} tx={tx} />
          <AmenitiesGrid property={property} tx={tx} />
          <LocationCard property={property} tx={tx} />
          <ListedByCard property={property} tx={tx} onContact={() => openInquiry("contact")} onReport={reportListing} />
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-[70] border-t border-[#E1E2EE] bg-[#FAF8FF]/92 px-4 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-4px_20px_rgba(0,0,0,.06)] backdrop-blur-xl sm:inset-x-6 sm:bottom-4 sm:mx-auto sm:max-w-[728px] sm:rounded-2xl sm:border sm:pb-3">
        <div className="mx-auto grid max-w-[728px] grid-cols-2 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="hidden min-w-0 sm:block"><span className="block text-[11px] text-[#424655]">{property.purpose === "rent" ? tx("Monthly rent", "လစဉ်ငှားရမ်းခ") : tx("Total price", "စုစုပေါင်းဈေးနှုန်း")}</span><strong className="mt-0.5 block truncate text-[20px] font-bold tracking-[-.035em] text-[#0053D2]">{price}</strong></div>
          <button type="button" onClick={() => openInquiry("contact")} className="inline-flex h-12 items-center justify-center rounded-lg border border-[#0053D2]/22 bg-white px-4 text-[12px] font-semibold text-[#0053D2] shadow-sm transition-[transform,box-shadow] active:scale-[.98]">{tx("Message", "စာပို့ရန်")}</button>
          <button type="button" onClick={() => openInquiry("schedule")} className="inline-flex h-12 items-center justify-center rounded-lg bg-[#0053D2] px-4 text-[12px] font-semibold leading-none text-white shadow-sm transition-[transform,box-shadow] active:scale-[.98]"><span className="relative top-px inline-flex items-center leading-none">{tx("Request viewing", "အိမ်ကြည့်ရန်")}</span></button>
        </div>
      </div>

      <InquirySheet open={inquiryOpen} onOpenChange={setInquiryOpen} mode={inquiryMode} property={property} />
      <ReportListingModal open={reportOpen} onOpenChange={setReportOpen} property={property} tx={tx} />
    </div>
  );
}

const reportReasons: Array<{ value: PropertyReportReason; en: string; my: string }> = [
  { value: "SUSPECTED_SCAM", en: "Suspected scam", my: "လိမ်လည်မှုဟု သံသယရှိသည်" },
  { value: "INCORRECT_INFORMATION", en: "Incorrect information", my: "အချက်အလက် မမှန်ကန်ပါ" },
  { value: "DUPLICATE_LISTING", en: "Duplicate listing", my: "ထပ်နေသော အိမ်စာရင်း" },
  { value: "UNAVAILABLE_PROPERTY", en: "Property is unavailable", my: "အိမ် မရရှိနိုင်တော့ပါ" },
  { value: "OTHER", en: "Another safety concern", my: "အခြား လုံခြုံရေးစိုးရိမ်ချက်" },
];

function ReportListingModal({ open, onOpenChange, property, tx }: { open: boolean; onOpenChange: (open: boolean) => void; property: Property; tx: (english: string, myanmar: string) => string }) {
  const { toast } = useToast();
  const [reason, setReason] = useState<PropertyReportReason>("SUSPECTED_SCAM");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    setBusy(true); setError("");
    try {
      await createPropertyReport(property.id, { reason, details });
      onOpenChange(false); setDetails("");
      toast({ tone: "success", title: tx("Report sent for review", "တိုင်ကြားချက်ကို စိစစ်ရန် ပို့ပြီးပါပြီ"), description: tx("A moderator will review the listing. It is not removed automatically.", "Moderator က အိမ်စာရင်းကို စိစစ်ပါမည်။ အလိုအလျောက် ဖယ်ရှားမည်မဟုတ်ပါ။") });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : tx("Could not send the report. Please try again.", "တိုင်ကြားချက် မပို့နိုင်ပါ။ ထပ်မံကြိုးစားပါ။"));
    } finally { setBusy(false); }
  }
  return <Modal open={open} onOpenChange={onOpenChange} title={tx("Report this listing", "ဤအိမ်စာရင်းကို တိုင်ကြားရန်")} description={tx("Choose the concern that best describes the issue.", "ပြဿနာနှင့် အနီးစပ်ဆုံးအကြောင်းရင်းကို ရွေးပါ။")} footer={<Button className="w-full" disabled={busy} onClick={() => void submit()}>{busy ? tx("Sending…", "ပို့နေသည်…") : tx("Send report", "တိုင်ကြားချက်ပို့ရန်")}</Button>}>
    <div className="space-y-4 p-5">
      <fieldset className="space-y-2"><legend className="mb-2 text-sm font-semibold">{tx("Reason", "အကြောင်းရင်း")}</legend>{reportReasons.map((option) => <label key={option.value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-a7-line bg-white px-3 text-sm"><input type="radio" name="report-reason" value={option.value} checked={reason === option.value} onChange={() => setReason(option.value)} /><span>{tx(option.en, option.my)}</span></label>)}</fieldset>
      <label className="block text-sm font-semibold">{tx("Additional details (optional)", "အသေးစိတ်အချက်အလက် (မဖြစ်မနေမဟုတ်)")}<textarea maxLength={1000} rows={4} value={details} onChange={(event) => setDetails(event.target.value)} className="mt-2 w-full rounded-xl border border-a7-line bg-white p-3 font-normal outline-none focus:border-a7-blue" /></label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  </Modal>;
}

function PropertyFact({ icon: Icon, value, label, valueClassName }: { icon: typeof BedDouble; value: string | number; label: string; valueClassName?: string }) {
  return <div className="flex min-w-0 flex-col items-center px-1 text-center"><Icon className="size-5 text-[#727687]" strokeWidth={1.8} /><strong className={cn("mt-1.5 max-w-full truncate text-[17px] font-semibold text-[#191B24]", valueClassName)}>{value}</strong><span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[.06em] text-[#424655]">{label}</span></div>;
}

function OverviewSection({ property, tx }: { property: Property; tx: (english: string, myanmar: string) => string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <section className="border-b border-[#E1E2EE] py-5" aria-labelledby="overview-title">
      <div className="flex items-center gap-3">
        <AnimatedAssetIcon src="/icons/a7-home-overview-3d.png" width={48} height={48} hover="float" className="size-12" imageClassName="drop-shadow-[0_7px_10px_rgba(18,59,115,.17)]" />
        <h2 id="overview-title" className="font-semibold tracking-[-.035em]" style={{ fontSize: "24px" }}>{tx("Overview", "အကျဉ်းချုပ်")}</h2>
      </div>
      <p className={cn("mt-2 !text-[14px] leading-6 text-[#424655]", !expanded && "line-clamp-4")}>{property.description} {property.owner.phone_verified ? tx("The listed phone contact is marked as verified in this demo dataset.", "ဤနမူနာဒေတာတွင် ဖော်ပြထားသောဖုန်းကို စိစစ်ထားသည်ဟု မှတ်သားထားသည်။") : tx("The listed contact is not phone-verified; confirm details before arranging a viewing.", "ဖော်ပြထားသောဆက်သွယ်သူ၏ဖုန်းကို မစိစစ်ရသေးသဖြင့် အိမ်ကြည့်ချိန်မချိန်းမီ အချက်အလက်ကိုအတည်ပြုပါ။")}</p>
      <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-2 inline-flex h-11 items-center gap-1 text-[14px] font-semibold uppercase tracking-[.05em] text-[#0053D2]" aria-expanded={expanded}>{expanded ? tx("Read less", "အနည်းငယ်ပြရန်") : tx("Read more", "ပိုမိုဖတ်ရန်")}{expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}</button>
    </section>
  );
}

function ListedByCard({ property, tx, onContact, onReport }: { property: Property; tx: (english: string, myanmar: string) => string; onContact: () => void; onReport: () => void }) {
  const initials = property.owner.name.split(" ").map((part) => part[0]).slice(0, 2).join("");
  return (
    <section className="py-7" aria-labelledby="listed-by-title">
      <div className="flex items-center gap-3">
        <AnimatedAssetIcon src="/icons/a7-lister-contact-3d.png" width={48} height={48} hover="float" className="size-12" imageClassName="drop-shadow-[0_7px_10px_rgba(18,59,115,.17)]" />
        <h2 id="listed-by-title" className="text-[20px] font-semibold tracking-[-.035em]">{tx("Listed By", "စာရင်းတင်သူ")}</h2>
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-lg bg-[#F2F3FF] p-4">
        <Avatar initials={initials} className="size-14 shrink-0 bg-[#DCE2F3] text-[15px] font-semibold text-[#0053D2]" />
        <div className="min-w-0 flex-1"><strong className="block truncate !text-[16px] font-semibold">{property.owner.name}</strong><span className="mt-1 inline-flex items-start justify-center gap-1 !text-[12px] text-[#424655]">{property.rating === null ? null : <><Star className="size-3.5 fill-[#0053D2] text-[#0053D2]" />{property.rating.toFixed(1)} · </>}{tx(contactVerificationLabel(property.owner), property.owner.phone_verified ? (property.owner.type === "agent" ? "ဖုန်းစိစစ်ပြီးအကျိုးဆောင်" : "ဖုန်းစိစစ်ပြီးအိမ်ရှင်") : "ဖုန်းမစိစစ်ရသေး")}</span></div>
        <button type="button" onClick={onContact} className="grid size-11 shrink-0 place-items-center rounded-full bg-[#E6E7F4] text-[#0053D2] shadow-sm transition-transform active:scale-95" aria-label={tx(`Contact ${property.owner.name}`, `${property.owner.name} ကိုဆက်သွယ်ရန်`)}><Phone className="size-[18px]" /></button>
      </div>
      <button type="button" onClick={onReport} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-[12px] font-semibold text-[#9E1B1B] hover:bg-[#FFF1F0]"><Flag className="size-4" />{tx("Report a safety concern", "လုံခြုံရေးစိုးရိမ်ချက် တင်ပြရန်")}</button>
    </section>
  );
}

export { PropertyDetailView };
