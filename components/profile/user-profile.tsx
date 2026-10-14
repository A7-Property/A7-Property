"use client";

import {
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  CircleUserRound,
  Download,
  Globe2,
  Heart,
  HelpCircle,
  KeyRound,
  Laptop2,
  LockKeyhole,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { A7AssistantPopover } from "@/components/assistant/a7-assistant-popover";
import { A7Brand } from "@/components/brand/a7-brand";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { readStoredJson, STORAGE_KEYS, writeStoredJson } from "@/lib/local-storage";
import { cn } from "@/lib/utils";
import { useSavedHomes } from "@/hooks/use-saved-homes";

type Journey = "rent" | "buy";
type SettingId = "personal" | "security" | "notifications" | "language" | "privacy" | "help";
type SettingAction = "password" | "devices" | "communication" | "download" | "delete" | "safety" | null;

interface Preferences {
  journey: Journey;
  locations: string[];
  budget: string;
  propertyTypes: string[];
  bedrooms: string;
}

interface SavedSearch {
  id: string;
  title: string;
  details: string;
  alerts: boolean;
  timing: string;
}

const accountSettings = [
  { id: "personal", label: "Personal information", detail: "Name, contact details, and location", icon: UserRound },
  { id: "security", label: "Security", detail: "Password and signed-in devices", icon: KeyRound },
  { id: "notifications", label: "Notifications", detail: "Saved homes, messages, and viewing reminders", icon: Bell },
  { id: "language", label: "Language", detail: "English", icon: Globe2 },
  { id: "privacy", label: "Privacy", detail: "Data and communication preferences", icon: LockKeyhole },
  { id: "help", label: "Help", detail: "Support and safety resources", icon: HelpCircle },
] as const;

const settingDescriptions: Record<SettingId, string> = {
  personal: "Keep the details owners see accurate and up to date.",
  security: "Manage how you sign in and keep your A7 account secure.",
  notifications: "Choose which updates are helpful during your home search.",
  language: "Choose the language used across A7 Property.",
  privacy: "Control your personal data and communication preferences.",
  help: "Get help with listings, owners, viewings, or your account.",
};

const accountSettingsMyanmar: Record<SettingId, { label: string; detail: string; description: string }> = {
  personal: { label: "ကိုယ်ရေးအချက်အလက်", detail: "အမည်၊ ဆက်သွယ်ရန်နှင့် နေရာ", description: "အိမ်ရှင်များမြင်ရသည့် အချက်အလက်များကို မှန်ကန်စွာထားပါ။" },
  security: { label: "လုံခြုံရေး", detail: "စကားဝှက်နှင့် အကောင့်ဝင်ထားသောစက်များ", description: "အကောင့်ဝင်ပုံနှင့် A7 အကောင့်လုံခြုံရေးကို စီမံပါ။" },
  notifications: { label: "အသိပေးချက်များ", detail: "သိမ်းထားသောအိမ်၊ မက်ဆေ့ချ်နှင့် အိမ်ကြည့်သတိပေးချက်", description: "အိမ်ရှာဖွေစဉ် အသုံးဝင်သောအသိပေးချက်များကို ရွေးပါ။" },
  language: { label: "ဘာသာစကား", detail: "မြန်မာ", description: "A7 Property တစ်ခုလုံးတွင် အသုံးပြုမည့်ဘာသာစကားကို ရွေးပါ။" },
  privacy: { label: "ကိုယ်ရေးလုံခြုံမှု", detail: "ဒေတာနှင့် ဆက်သွယ်ရေးအကြိုက်များ", description: "ကိုယ်ရေးဒေတာနှင့် ဆက်သွယ်ရေးအကြိုက်များကို ထိန်းချုပ်ပါ။" },
  help: { label: "အကူအညီ", detail: "အကူအညီနှင့် လုံခြုံရေးဆိုင်ရာအရင်းအမြစ်များ", description: "အိမ်စာရင်း၊ အိမ်ရှင်၊ အိမ်ကြည့်ချိန် သို့မဟုတ် အကောင့်အတွက် အကူအညီရယူပါ။" },
};

const defaultPreferences: Preferences = {
  journey: "rent",
  locations: ["Kamayut", "Sanchaung", "Hlaing"],
  budget: "500,000 – 1,500,000 MMK / month",
  propertyTypes: ["Condo", "Apartment"],
  bedrooms: "2+ bedrooms",
};

const locationOptions = ["Kamayut", "Sanchaung", "Hlaing", "Bahan", "Yankin", "Mayangone"];
const propertyTypeOptions = ["Condo", "Apartment", "House", "Mini condo"];
const defaultSavedSearches: SavedSearch[] = [];
const defaultNotificationSettings = { savedHomes: true, messages: true, viewings: true, marketing: false };

function PreferenceValue({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-[#17263A]/8 py-4 last:border-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#87909A]">{label}</dt>
      <dd className="mt-2 text-[13px] font-medium leading-6 text-[#26364A]">{children}</dd>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0057D9]/20",
        checked ? "bg-[#0057D9]" : "bg-[#CCD3DB]",
      )}
    >
      <span className={cn("absolute top-1 size-5 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-6" : "translate-x-1")} />
    </button>
  );
}

function UserProfile() {
  const { language, isMyanmar, setLanguage, tx } = useLanguage();
  const { user } = useAuth();
  const [profile, setProfile] = useState({ name: "", city: "Yangon" });
  const [profileDraft, setProfileDraft] = useState(profile);
  const [profileOpen, setProfileOpen] = useState(false);
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [preferenceDraft, setPreferenceDraft] = useState(defaultPreferences);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [activeSetting, setActiveSetting] = useState<SettingId | null>(null);
  const [settingAction, setSettingAction] = useState<SettingAction>(null);
  const [settingNotice, setSettingNotice] = useState("");
  const [identityStarted, setIdentityStarted] = useState(false);
  // The shortlist itself lives in useSavedHomes, which handles both modes.
  const { savedIds } = useSavedHomes();
  const savedCount = savedIds.length;
  const displayName = profile.name || user?.fullName || tx("Guest", "ဧည့်သည်");
  const displayInitials = displayName.split(/\s+/).filter(Boolean).map((part) => part[0]?.toUpperCase()).slice(0, 2).join("");
  const [notificationSettings, setNotificationSettings] = useState(defaultNotificationSettings);
  const [savedSearches, setSavedSearches] = useState(defaultSavedSearches);
  const [communicationAllowed, setCommunicationAllowed] = useState(true);
  const [passwordDraft, setPasswordDraft] = useState({ password: "", confirm: "" });
  const [safetyReport, setSafetyReport] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const skipInitialPersistence = useRef(true);

  useEffect(() => {
    const storedProfile = readStoredJson(STORAGE_KEYS.profile, { name: "", city: "Yangon" });
    const storedPreferences = readStoredJson(STORAGE_KEYS.preferences, defaultPreferences);
    const storedSettings = readStoredJson(STORAGE_KEYS.profileSettings, {
      language: "English",
      identityStarted: false,
      notificationSettings: defaultNotificationSettings,
      savedSearches: defaultSavedSearches,
      communicationAllowed: true,
    });
    queueMicrotask(() => {
      setProfile(storedProfile);
      setProfileDraft(storedProfile);
      setPreferences(storedPreferences);
      setPreferenceDraft(storedPreferences);
      setIdentityStarted(storedSettings.identityStarted);
      setNotificationSettings(storedSettings.notificationSettings);
      setSavedSearches(storedSettings.savedSearches);
      setCommunicationAllowed(storedSettings.communicationAllowed);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipInitialPersistence.current) {
      skipInitialPersistence.current = false;
      return;
    }
    writeStoredJson(STORAGE_KEYS.profile, profile);
    writeStoredJson(STORAGE_KEYS.preferences, preferences);
    writeStoredJson(STORAGE_KEYS.profileSettings, {
      language: language === "my" ? "မြန်မာ" : "English",
      identityStarted,
      notificationSettings,
      savedSearches,
      communicationAllowed,
    });
  }, [communicationAllowed, hydrated, identityStarted, language, notificationSettings, preferences, profile, savedSearches]);

  function openProfileEditor() {
    setProfileDraft(profile);
    setProfileOpen(true);
  }

  function saveProfile() {
    setProfile(profileDraft);
    setProfileOpen(false);
  }

  function openPreferenceEditor() {
    setPreferenceDraft(preferences);
    setPreferencesOpen(true);
  }

  function toggleDraftLocation(location: string) {
    setPreferenceDraft((current) => ({
      ...current,
      locations: current.locations.includes(location)
        ? current.locations.filter((item) => item !== location)
        : [...current.locations, location],
    }));
  }

  function toggleDraftPropertyType(type: string) {
    setPreferenceDraft((current) => ({
      ...current,
      propertyTypes: current.propertyTypes.includes(type)
        ? current.propertyTypes.filter((item) => item !== type)
        : [...current.propertyTypes, type],
    }));
  }

  function savePreferences() {
    setPreferences(preferenceDraft);
    setPreferencesOpen(false);
  }

  function openSetting(setting: SettingId) {
    setActiveSetting(setting);
    setSettingAction(null);
    setSettingNotice("");
  }

  function savePassword() {
    if (passwordDraft.password.length < 8) {
      setSettingNotice("Use at least 8 characters.");
      return;
    }
    if (passwordDraft.password !== passwordDraft.confirm) {
      setSettingNotice("Passwords do not match.");
      return;
    }
    setPasswordDraft({ password: "", confirm: "" });
    setSettingNotice("Password updated on this device.");
  }

  function downloadProfileData() {
    const payload = JSON.stringify({ profile, preferences, notificationSettings, savedSearches }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "a7-property-profile.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setSettingNotice("Your A7 profile export is ready.");
  }

  function submitSafetyReport() {
    if (safetyReport.trim().length < 12) {
      setSettingNotice("Please share a little more detail.");
      return;
    }
    setSafetyReport("");
    setSettingNotice("Safety report received. Our trust team will follow up.");
  }

  const activeSettingMeta = accountSettings.find((item) => item.id === activeSetting);

  return (
    <div className="min-h-screen bg-[#F7F7F4] text-[#17263A]">
      <header className="sticky top-0 z-50 h-[72px] border-b border-[#17263A]/8 bg-[#FBFBF9]/92 backdrop-blur-2xl">
        <div className="mx-auto flex h-full max-w-[1360px] items-center gap-7 px-4 sm:px-6 lg:px-10">
          <Link href="/" aria-label="A7 Property home"><A7Brand /></Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label={tx("My home journey", "ကျွန်ုပ်၏ အိမ်ခရီးစဉ်")}>
            <Link href="/saved" className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-[12px] font-medium text-[#5F6B78] transition-colors hover:bg-white hover:text-[#17263A]">
              <Heart className="size-[17px]" />
              {tx("Saved homes", "သိမ်းထားသောအိမ်များ")}
              {savedCount > 0 && <span data-type="number" className="grid h-6 min-w-6 place-items-center rounded-full bg-[#0057D9] px-1.5 text-[10px] font-bold text-white">{savedCount}</span>}
            </Link>
            <Link href="/dashboard?section=messages#conversations" className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-[12px] font-medium text-[#5F6B78] transition-colors hover:bg-white hover:text-[#17263A]"><MessageCircle className="size-[17px]" />{tx("Messages", "မက်ဆေ့ချ်များ")}</Link>
            <Link href="/dashboard?section=viewings#viewings" className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-[12px] font-medium text-[#5F6B78] transition-colors hover:bg-white hover:text-[#17263A]"><CalendarDays className="size-[17px]" />{tx("Viewings", "အိမ်ကြည့်ချိန်များ")}</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/search?purpose=rent" className="hidden size-10 place-items-center rounded-full text-[#526171] transition-colors hover:bg-white hover:text-[#0057D9] sm:grid" aria-label={tx("Find homes", "အိမ်ရှာရန်")}><Search className="size-[19px]" /></Link>
            <A7AssistantPopover labelClassName="hidden min-[400px]:inline" />
            <LanguageSwitcher className="hidden sm:block" />
            <LanguageSwitcher compact className="sm:hidden" />
            <span className="grid size-10 place-items-center rounded-full bg-[#17304A] text-[11px] font-semibold text-white ring-4 ring-[#CFE2FF]" aria-label={`${displayName} profile`}>{displayInitials}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1360px] px-4 pb-28 pt-8 sm:px-6 sm:pt-12 lg:px-10 lg:pb-20">
        <section className="rounded-[30px] bg-white p-5 shadow-[0_12px_42px_rgba(26,39,56,.07)] ring-1 ring-[#17263A]/7 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="relative grid size-[92px] shrink-0 place-items-center rounded-full bg-[linear-gradient(145deg,#1D4267,#102A45)] text-[26px] font-semibold text-white shadow-[0_12px_30px_rgba(23,48,74,.22)] sm:size-[112px] sm:text-[30px]">
              {displayInitials}
              <span className="absolute bottom-1 right-1 grid size-7 place-items-center rounded-full border-[3px] border-white bg-[#2B7A52] text-white"><Check className="size-3.5 stroke-[3]" /></span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#79838E]">{tx("Your A7 profile", "သင့် A7 ကိုယ်ရေးအချက်အလက်")}</p>
              <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.05em] text-[#16263A] sm:text-[42px]">{displayName}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-[#64717E]">
                <span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-[#0057D9]" />{profile.city}, Myanmar</span>
                <span className="inline-flex items-center gap-1.5 text-[#2B704F]"><ShieldCheck className="size-4" />{tx("Phone & email verified", "ဖုန်းနှင့် အီးမေးလ် အတည်ပြုပြီး")}</span>
              </div>
              <p className="mt-4 max-w-xl text-[13px] leading-6 text-[#707A85]">{tx("Your profile helps trusted owners understand who they’re welcoming into their home.", "သင့်ကိုယ်ရေးအချက်အလက်က စိစစ်ပြီးအိမ်ရှင်များအား သူတို့အိမ်သို့ ဘယ်သူကိုကြိုဆိုနေလဲ နားလည်စေသည်။")}</p>
            </div>
            <Button variant="outline" className="h-11 shrink-0 rounded-full px-5 text-xs" onClick={openProfileEditor}><Pencil className="size-4" />{tx("Edit profile", "ကိုယ်ရေးအချက်အလက်ပြင်ရန်")}</Button>
          </div>
        </section>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="space-y-8">
            <section className="rounded-[26px] bg-white p-5 shadow-[0_10px_34px_rgba(26,39,56,.055)] ring-1 ring-[#17263A]/7 sm:p-7">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#757E88]">{tx("Trust & safety", "ယုံကြည်မှုနှင့် လုံခြုံရေး")}</p>
                <h2 className="mt-2 text-[23px] font-semibold tracking-[-0.04em]">{tx("Verification center", "အတည်ပြုစိစစ်ရေးစင်တာ")}</h2>
                <p className="mt-2 text-[12px] leading-5 text-[#6A7581]">{tx("Verified details help owners reply with confidence.", "အတည်ပြုထားသောအချက်အလက်များက အိမ်ရှင်များကို ယုံကြည်စွာ အကြောင်းပြန်နိုင်စေသည်။")}</p>
              </div>
              <div className="mt-6 divide-y divide-[#E8EAED]">
                <div className="flex items-center gap-4 py-4">
                  <span className="grid size-11 place-items-center rounded-full bg-[#EEF5FC] text-[#27714D]"><Phone className="size-[18px]" /></span>
                  <span className="min-w-0 flex-1"><strong className="block text-[13px]">{tx("Phone", "ဖုန်း")}</strong><small className="mt-1 block text-[10px] text-[#737E89]">{user?.phoneVerified ? tx("Your phone is marked verified on your account.", "သင့်ဖုန်းကို သင့်အကောင့်တွင် အတည်ပြုပြီးဖြစ်သည်။") : tx("Phone verification is not part of this build.", "ဖုန်းအတည်ပြုမှုသည် ဤဗားရှင်းတွင် မပါဝင်ပါ။")}</small></span>
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[9px] font-semibold", user?.phoneVerified ? "bg-[#EEF5FC] text-[#27714D]" : "bg-[#F2F3F1] text-[#64707C]")}>{user?.phoneVerified ? <><Check className="size-3.5" />{tx("Verified", "အတည်ပြုပြီး")}</> : tx("Not verified", "မစိစစ်ရသေး")}</span>
                </div>
                <div className="flex items-center gap-4 py-4">
                  <span className="grid size-11 place-items-center rounded-full bg-[#EEF5FC] text-[#27714D]"><Mail className="size-[18px]" /></span>
                  <span className="min-w-0 flex-1"><strong className="block text-[13px]">{tx("Email", "အီးမေးလ်")}</strong><small className="mt-1 block truncate text-[10px] text-[#737E89]">{user?.email ?? tx("Sign in to see your account email.", "သင့်အကောင့်အီးမေးလ်ကို မြင်ရန် အကောင့်ဝင်ပါ။")}</small></span>
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[9px] font-semibold", user?.emailVerified ? "bg-[#EEF5FC] text-[#27714D]" : "bg-[#F2F3F1] text-[#64707C]")}>{user?.emailVerified ? <><Check className="size-3.5" />{tx("Verified", "အတည်ပြုပြီး")}</> : tx("Not verified", "မစိစစ်ရသေး")}</span>
                </div>
                <div className="flex items-center gap-4 py-4">
                  <span className={cn("grid size-11 place-items-center rounded-full", identityStarted ? "bg-[#EEF5FC] text-[#0057D9]" : "bg-[#F2F3F1] text-[#64707C]")}><CircleUserRound className="size-[19px]" /></span>
                  <span className="min-w-0 flex-1"><strong className="block text-[13px]">{tx("Identity verification", "အထောက်အထား စိစစ်ခြင်း")}</strong><small className="mt-1 block text-[10px] text-[#737E89]">{identityStarted ? tx("We’re reviewing your submitted details.", "သင်ပေးပို့ထားသောအချက်အလက်များကို စိစစ်နေသည်။") : tx("Add an extra layer of trust for owners.", "အိမ်ရှင်များအတွက် ယုံကြည်မှုတစ်ဆင့် ထပ်တိုးပါ။")}</small></span>
                  {identityStarted
                    ? <span className="rounded-full bg-[#EEF5FC] px-3 py-1.5 text-[9px] font-semibold text-[#0057D9]">{tx("In review", "စိစစ်နေသည်")}</span>
                    : <button type="button" onClick={() => setIdentityStarted(true)} className="rounded-full border border-[#B9D3FA] bg-white px-3 py-2 text-[9px] font-semibold text-[#0057D9] hover:bg-[#F4F8FF]">{tx("Verify identity", "အထောက်အထား စိစစ်ရန်")}</button>}
                </div>
              </div>
            </section>

            <section className="rounded-[26px] bg-white p-5 shadow-[0_10px_34px_rgba(26,39,56,.055)] ring-1 ring-[#17263A]/7 sm:p-7">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#757E88]">{tx("What feels right", "သင့်အတွက် သင့်တော်သည့်အရာ")}</p>
                  <h2 className="mt-2 text-[23px] font-semibold tracking-[-0.04em]">{tx("Home preferences", "အိမ်အကြိုက်များ")}</h2>
                  <p className="mt-2 text-[12px] leading-5 text-[#6A7581]">{tx("We’ll use these to keep your recommendations relevant.", "ကိုက်ညီသောအကြံပြုချက်များပေးရန် ဤအချက်များကို အသုံးပြုမည်။")}</p>
                </div>
                <button type="button" onClick={openPreferenceEditor} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#F1F5F8] px-3 text-[10px] font-semibold text-[#29445F] hover:bg-[#E9F2FF] hover:text-[#0057D9]"><SlidersHorizontal className="size-3.5" />{tx("Edit", "ပြင်ရန်")}</button>
              </div>
              <dl className="mt-5 grid gap-x-8 sm:grid-cols-2">
                <PreferenceValue label={tx("Looking for", "ရှာဖွေနေသည်")}><span className="inline-flex rounded-full bg-[#EEF5FC] px-3 py-1 text-[10px] font-semibold text-[#0057D9]">{preferences.journey === "rent" ? tx("Rent", "ငှားရန်") : tx("Buy", "ဝယ်ရန်")}</span></PreferenceValue>
                <PreferenceValue label={tx("Budget", "ဘတ်ဂျက်")}>{preferences.budget}</PreferenceValue>
                <PreferenceValue label={tx("Preferred locations", "နှစ်သက်သောနေရာများ")}><span className="flex flex-wrap gap-1.5">{preferences.locations.map((location) => <span key={location} className="rounded-full bg-[#F2F4F6] px-2.5 py-1 text-[10px]">{location}</span>)}</span></PreferenceValue>
                <PreferenceValue label={tx("Property type", "အိမ်အမျိုးအစား")}>{preferences.propertyTypes.join(" · ") || tx("Any property", "မည်သည့်အိမ်မဆို")}</PreferenceValue>
                <PreferenceValue label={tx("Bedrooms", "အိပ်ခန်း")}>{preferences.bedrooms}</PreferenceValue>
              </dl>
            </section>

            <section className="rounded-[26px] bg-white p-5 shadow-[0_10px_34px_rgba(26,39,56,.055)] ring-1 ring-[#17263A]/7 sm:p-7">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#757E88]">{tx("Stay close to the market", "ဈေးကွက်နှင့် အမြဲနီးကပ်နေပါ")}</p>
                  <h2 className="mt-2 text-[23px] font-semibold tracking-[-0.04em]">{tx("Saved searches", "သိမ်းထားသောရှာဖွေမှုများ")}</h2>
                  <p className="mt-2 text-[12px] leading-5 text-[#6A7581]">{tx("Get notified when a matching home is added or changes price.", "ကိုက်ညီသောအိမ်အသစ်တင်သည့်အခါ သို့မဟုတ် ဈေးပြောင်းသည့်အခါ အသိပေးမည်။")}</p>
                </div>
                <Link href="/search?purpose=rent" className="hidden text-[10px] font-semibold text-[#0057D9] hover:underline sm:block">{tx("Create new search", "ရှာဖွေမှုအသစ်ဖန်တီးရန်")}</Link>
              </div>
              <div className="mt-6 divide-y divide-[#E8EAED]">
                {savedSearches.map((search) => (
                  <div key={search.id} className="flex items-center gap-4 py-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#EEF4FB] text-[#38617F]"><Search className="size-[18px]" /></span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-[13px] text-[#223246]">{search.title}</strong>
                      <small className="mt-1.5 block truncate text-[10px] text-[#737E89]">{search.details}</small>
                      <small className="mt-1.5 block text-[9px] font-medium text-[#0057D9]">{search.timing} {tx("alerts", "အသိပေးချက်များ")}</small>
                    </span>
                    <Toggle
                      checked={search.alerts}
                      label={`${search.title} alerts`}
                      onChange={() => setSavedSearches((current) => current.map((item) => item.id === search.id ? { ...item, alerts: !item.alerts } : item))}
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="rounded-[26px] bg-white p-2 shadow-[0_10px_34px_rgba(26,39,56,.055)] ring-1 ring-[#17263A]/7 lg:sticky lg:top-[96px]">
            <div className="px-4 pb-3 pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#757E88]">{tx("Your account", "သင့်အကောင့်")}</p>
              <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.04em]">{tx("Settings", "ဆက်တင်များ")}</h2>
            </div>
            <div className="divide-y divide-[#E8EAED]">
              {accountSettings.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.id} type="button" onClick={() => openSetting(item.id)} className="group flex w-full items-center gap-3 rounded-[18px] px-3 py-4 text-left transition-colors hover:bg-[#F6F7F5]">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#F1F3F5] text-[#526171] transition-colors group-hover:bg-white group-hover:text-[#0057D9]"><Icon className="size-[18px]" /></span>
                    <span className="min-w-0 flex-1"><strong className="block text-[12px] text-[#26364A]">{isMyanmar ? accountSettingsMyanmar[item.id].label : item.label}</strong><small className="mt-1 block truncate text-[9px] text-[#7A848E]">{item.id === "language" ? (language === "my" ? "မြန်မာ" : "English") : isMyanmar ? accountSettingsMyanmar[item.id].detail : item.detail}</small></span>
                    <ChevronRight className="size-4 text-[#A0A7AE] transition-transform group-hover:translate-x-0.5" />
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      </main>

      <nav className="fixed inset-x-3 bottom-2 z-50 grid h-[66px] grid-cols-4 rounded-[22px] border border-[#17263A]/10 bg-white/94 p-1.5 shadow-[0_14px_36px_rgba(23,43,63,.18)] backdrop-blur-2xl md:hidden" aria-label={tx("Mobile account navigation", "မိုဘိုင်းအကောင့် လမ်းညွှန်")}>
        <Link href="/search?purpose=rent" className="flex flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-medium text-[#687481]"><Search className="size-[18px]" />{tx("Explore", "ရှာဖွေ")}</Link>
        <Link href="/saved" className="flex flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-medium text-[#687481]"><Heart className="size-[18px]" />{tx("Saved", "သိမ်းထား")}</Link>
        <Link href="/dashboard?section=messages#conversations" className="flex flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-medium text-[#687481]"><MessageCircle className="size-[18px]" />{tx("Messages", "မက်ဆေ့ချ်")}</Link>
        <Link href="/profile" aria-current="page" className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-[#EEF5FC] text-[10px] font-medium text-[#0057D9]"><UserRound className="size-[18px]" />{tx("Profile", "ကိုယ်ရေးအချက်အလက်")}</Link>
      </nav>

      <Sheet
        open={profileOpen}
        onOpenChange={setProfileOpen}
        title="Edit profile"
        description="Keep the personal details owners see accurate."
        side="right"
        footer={<Button className="w-full rounded-full" onClick={saveProfile}>Save changes</Button>}
      >
        <div className="space-y-5 p-5 sm:p-7">
          <div className="grid size-20 place-items-center rounded-full bg-[#17304A] text-xl font-semibold text-white">{displayInitials}</div>
          <label className="block"><span className="text-[11px] font-semibold text-[#3D4B5B]">Full name</span><input value={profileDraft.name} onChange={(event) => setProfileDraft({ ...profileDraft, name: event.target.value })} className="mt-2 h-12 w-full rounded-xl border border-[#CCD5DF] bg-white px-4 text-sm outline-none focus:border-[#0057D9]" /></label>
          <label className="block"><span className="text-[11px] font-semibold text-[#3D4B5B]">Location</span><select value={profileDraft.city} onChange={(event) => setProfileDraft({ ...profileDraft, city: event.target.value })} className="mt-2 h-12 w-full rounded-xl border border-[#CCD5DF] bg-white px-4 text-sm outline-none focus:border-[#0057D9]"><option>Yangon</option><option>Mandalay</option></select></label>
          <div className="rounded-2xl bg-[#F4F6F8] p-4 text-[11px] leading-5 text-[#66717E]">Your phone number and email stay private until you choose to contact an owner.</div>
        </div>
      </Sheet>

      <Sheet
        open={preferencesOpen}
        onOpenChange={setPreferencesOpen}
        title="Home preferences"
        description="Help A7 keep your home suggestions focused."
        side="right"
        footer={<Button className="w-full rounded-full" onClick={savePreferences}>Save preferences</Button>}
      >
        <div className="space-y-7 p-5 sm:p-7">
          <div><p className="text-[11px] font-semibold">Looking for</p><div className="mt-3 grid grid-cols-2 rounded-xl bg-[#EEF1F4] p-1">{(["rent", "buy"] as const).map((journey) => <button key={journey} type="button" onClick={() => setPreferenceDraft({ ...preferenceDraft, journey })} className={cn("h-10 rounded-lg text-xs font-semibold capitalize", preferenceDraft.journey === journey ? "bg-white text-[#0057D9] shadow-sm" : "text-[#66717E]")}>{journey}</button>)}</div></div>
          <div><p className="text-[11px] font-semibold">Preferred locations</p><div className="mt-3 flex flex-wrap gap-2">{locationOptions.map((location) => <button key={location} type="button" onClick={() => toggleDraftLocation(location)} className={cn("rounded-full border px-3 py-2 text-[10px] font-semibold", preferenceDraft.locations.includes(location) ? "border-[#0057D9] bg-[#EEF5FC] text-[#0057D9]" : "border-[#D4DAE1] bg-white text-[#596675]")}>{location}</button>)}</div></div>
          <label className="block"><span className="text-[11px] font-semibold">Budget</span><select value={preferenceDraft.budget} onChange={(event) => setPreferenceDraft({ ...preferenceDraft, budget: event.target.value })} className="mt-3 h-12 w-full rounded-xl border border-[#CCD5DF] bg-white px-4 text-xs outline-none focus:border-[#0057D9]"><option>300,000 – 800,000 MMK / month</option><option>500,000 – 1,500,000 MMK / month</option><option>1,500,000 – 3,000,000 MMK / month</option><option>Up to 300M MMK</option></select></label>
          <div><p className="text-[11px] font-semibold">Property type</p><div className="mt-3 grid grid-cols-2 gap-2">{propertyTypeOptions.map((type) => <button key={type} type="button" onClick={() => toggleDraftPropertyType(type)} className={cn("h-11 rounded-xl border text-[10px] font-semibold", preferenceDraft.propertyTypes.includes(type) ? "border-[#0057D9] bg-[#EEF5FC] text-[#0057D9]" : "border-[#D4DAE1] bg-white text-[#596675]")}>{type}</button>)}</div></div>
          <div><p className="text-[11px] font-semibold">Bedrooms</p><div className="mt-3 flex gap-2">{["Studio", "1+", "2+", "3+"].map((bedrooms) => <button key={bedrooms} type="button" onClick={() => setPreferenceDraft({ ...preferenceDraft, bedrooms: bedrooms === "Studio" ? bedrooms : `${bedrooms} bedrooms` })} className={cn("grid size-11 place-items-center rounded-full border text-[10px] font-semibold", preferenceDraft.bedrooms.startsWith(bedrooms) ? "border-[#0057D9] bg-[#0057D9] text-white" : "border-[#D4DAE1] bg-white text-[#596675]")}>{bedrooms}</button>)}</div></div>
        </div>
      </Sheet>

      <Sheet
        open={Boolean(activeSetting)}
        onOpenChange={(open) => {
          if (!open) {
            setActiveSetting(null);
            setSettingAction(null);
            setSettingNotice("");
          }
        }}
        title={activeSetting ? (isMyanmar ? accountSettingsMyanmar[activeSetting].label : (activeSettingMeta?.label ?? tx("Account setting", "အကောင့်ဆက်တင်"))) : tx("Account setting", "အကောင့်ဆက်တင်")}
        description={activeSetting ? (isMyanmar ? accountSettingsMyanmar[activeSetting].description : settingDescriptions[activeSetting]) : undefined}
        side="right"
      >
        <div className="p-5 sm:p-7">
          {settingAction && (
            <button type="button" onClick={() => { setSettingAction(null); setSettingNotice(""); }} className="mb-5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#0057D9]">
              ← Back to {activeSettingMeta?.label.toLowerCase()}
            </button>
          )}
          {settingNotice && <div role="status" className="mb-5 rounded-2xl border border-[#BCD5FA] bg-[#F1F6FF] px-4 py-3 text-[11px] leading-5 text-[#075FCB]">{settingNotice}</div>}

          {activeSetting === "personal" && (
            <div>
              <div className="divide-y divide-[#E5E8EB] rounded-2xl border border-[#E0E4E8] px-4">
                <PreferenceValue label="Name">{displayName}</PreferenceValue>
                <PreferenceValue label="Email">{user?.email ?? tx("Sign in to see your account email.", "အကောင့်အီးမေးလ်ကို မြင်ရန် အကောင့်ဝင်ပါ။")}</PreferenceValue>
                <PreferenceValue label="Phone">{user?.phoneVerified ? tx("Verified on your account", "သင့်အကောင့်တွင် အတည်ပြုပြီး") : tx("Not set", "မသတ်မှတ်ရသေး")}</PreferenceValue>
                <PreferenceValue label="Location">{profile.city}, Myanmar</PreferenceValue>
              </div>
              <Button variant="outline" className="mt-5 w-full rounded-full" onClick={() => { setActiveSetting(null); openProfileEditor(); }}>
                <Pencil className="size-4" /> Edit personal details
              </Button>
            </div>
          )}

          {activeSetting === "security" && !settingAction && (
            <div className="space-y-3">
              <button type="button" onClick={() => setSettingAction("password")} className="flex w-full items-center justify-between rounded-2xl border border-[#E0E4E8] p-4 text-left text-xs font-semibold">Change password <ChevronRight className="size-4" /></button>
              <button type="button" onClick={() => setSettingAction("devices")} className="flex w-full items-center justify-between rounded-2xl border border-[#E0E4E8] p-4 text-left text-xs font-semibold">Signed-in devices <span className="text-[10px] font-normal text-[#7A848E]">1 device</span></button>
            </div>
          )}
          {activeSetting === "security" && settingAction === "password" && (
            <div className="space-y-4">
              <label className="block"><span className="text-[11px] font-semibold">New password</span><input type="password" value={passwordDraft.password} onChange={(event) => setPasswordDraft({ ...passwordDraft, password: event.target.value })} autoComplete="new-password" className="mt-2 h-12 w-full rounded-xl border border-[#CCD5DF] px-4 text-sm outline-none focus:border-[#0057D9]" /></label>
              <label className="block"><span className="text-[11px] font-semibold">Confirm password</span><input type="password" value={passwordDraft.confirm} onChange={(event) => setPasswordDraft({ ...passwordDraft, confirm: event.target.value })} autoComplete="new-password" className="mt-2 h-12 w-full rounded-xl border border-[#CCD5DF] px-4 text-sm outline-none focus:border-[#0057D9]" /></label>
              <Button className="w-full rounded-full" onClick={savePassword}>Update password</Button>
            </div>
          )}
          {activeSetting === "security" && settingAction === "devices" && (
            <div>
              <div className="flex items-center gap-4 rounded-2xl border border-[#DDE3E9] p-4">
                <span className="grid size-11 place-items-center rounded-full bg-[#EEF4FB] text-[#2C5A7B]"><Laptop2 className="size-5" /></span>
                <span className="min-w-0 flex-1"><strong className="block text-xs">This browser</strong><small className="mt-1 block text-[10px] text-[#75808C]">Kuala Lumpur · Active now</small></span>
                <span className="size-2 rounded-full bg-[#31A66A]" />
              </div>
              <Button variant="outline" className="mt-4 w-full rounded-full" onClick={() => setSettingNotice("No other devices are signed in.")}>Sign out other devices</Button>
            </div>
          )}

          {activeSetting === "notifications" && (
            <div className="divide-y divide-[#E5E8EB]">
              {Object.entries({ savedHomes: "Saved home updates", messages: "Owner messages", viewings: "Viewing reminders", marketing: "A7 news and inspiration" }).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-4 py-4">
                  <span className="text-xs font-medium">{label}</span>
                  <Toggle checked={notificationSettings[key as keyof typeof notificationSettings]} label={label} onChange={() => setNotificationSettings((current) => ({ ...current, [key]: !current[key as keyof typeof current] }))} />
                </div>
              ))}
            </div>
          )}

          {activeSetting === "language" && (
            <div className="space-y-3">
              {([{ value: "en", label: "English" }, { value: "my", label: "မြန်မာ" }] as const).map((option) => (
                <button key={option.value} type="button" onClick={() => setLanguage(option.value)} className={cn("flex w-full items-center justify-between rounded-2xl border p-4 text-left text-sm font-semibold", language === option.value ? "border-[#0057D9] bg-[#F3F7FF] text-[#0057D9]" : "border-[#E0E4E8]")}>
                  {option.label}{language === option.value && <Check className="size-5" />}
                </button>
              ))}
            </div>
          )}

          {activeSetting === "privacy" && !settingAction && (
            <div className="space-y-3">
              <button type="button" onClick={() => setSettingAction("communication")} className="flex w-full items-center justify-between rounded-2xl border border-[#E0E4E8] p-4 text-left text-xs font-semibold">Communication privacy <ChevronRight className="size-4" /></button>
              <button type="button" onClick={() => setSettingAction("download")} className="flex w-full items-center justify-between rounded-2xl border border-[#E0E4E8] p-4 text-left text-xs font-semibold">Download your data <Download className="size-4" /></button>
              <button type="button" onClick={() => setSettingAction("delete")} className="flex w-full items-center justify-between rounded-2xl border border-[#F2CFCB] p-4 text-left text-xs font-semibold text-[#B3433A]">Delete account <Trash2 className="size-4" /></button>
            </div>
          )}
          {activeSetting === "privacy" && settingAction === "communication" && (
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#E0E4E8] p-4">
              <span><strong className="block text-xs">Owner contact permission</strong><small className="mt-1 block text-[10px] leading-4 text-[#74808C]">Allow owners you contact to reply through A7.</small></span>
              <Toggle checked={communicationAllowed} label="Owner contact permission" onChange={() => setCommunicationAllowed((current) => !current)} />
            </div>
          )}
          {activeSetting === "privacy" && settingAction === "download" && (
            <div className="rounded-2xl border border-[#E0E4E8] p-5">
              <Download className="size-6 text-[#0057D9]" />
              <h3 className="mt-4 text-sm font-semibold">Download your A7 data</h3>
              <p className="mt-2 text-[11px] leading-5 text-[#6E7985]">Includes your profile, preferences, notifications, and saved searches as a JSON file.</p>
              <Button className="mt-5 w-full rounded-full" onClick={downloadProfileData}>Prepare download</Button>
            </div>
          )}
          {activeSetting === "privacy" && settingAction === "delete" && (
            <div className="rounded-2xl border border-[#F0C9C6] bg-[#FFF8F7] p-5">
              <Trash2 className="size-6 text-[#B3433A]" />
              <h3 className="mt-4 text-sm font-semibold text-[#8B302A]">Request account deletion</h3>
              <p className="mt-2 text-[11px] leading-5 text-[#775D5B]">Type DELETE to confirm. This frontend preview records the request but does not remove data.</p>
              <input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder="Type DELETE" className="mt-4 h-11 w-full rounded-xl border border-[#E4BBB7] bg-white px-3 text-xs outline-none focus:border-[#B3433A]" />
              <Button className="mt-3 w-full rounded-full bg-[#A63B33] hover:bg-[#8C302A]" disabled={deleteConfirmation !== "DELETE"} onClick={() => { setDeleteConfirmation(""); setSettingNotice("Deletion request prepared. Confirm it from your email to continue."); }}>Request deletion</Button>
            </div>
          )}

          {activeSetting === "help" && !settingAction && (
            <div className="space-y-3">
              <Link href="/help" className="flex items-center justify-between rounded-2xl border border-[#E0E4E8] p-4 text-xs font-semibold">Visit Help Center <ChevronRight className="size-4" /></Link>
              <button type="button" onClick={() => setSettingAction("safety")} className="flex w-full items-center justify-between rounded-2xl border border-[#E0E4E8] p-4 text-left text-xs font-semibold">Report a safety concern <ChevronRight className="size-4" /></button>
            </div>
          )}
          {activeSetting === "help" && settingAction === "safety" && (
            <div>
              <label className="block"><span className="text-[11px] font-semibold">Tell our trust team what happened</span><textarea value={safetyReport} onChange={(event) => setSafetyReport(event.target.value)} className="mt-2 min-h-36 w-full resize-none rounded-2xl border border-[#CCD5DF] p-4 text-xs leading-5 outline-none focus:border-[#0057D9]" placeholder="Include the listing, person, and anything that made you feel unsafe." /></label>
              <Button className="mt-4 w-full rounded-full" onClick={submitSafetyReport}><Send className="size-4" />Send report</Button>
            </div>
          )}
        </div>
      </Sheet>
    </div>
  );
}

export { UserProfile };
