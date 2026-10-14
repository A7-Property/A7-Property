"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Bath,
  BedDouble,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Heart,
  MapPin,
  Maximize2,
  MessageCircle,
  Search,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { A7AssistantPopover } from "@/components/assistant/a7-assistant-popover";
import { useAuth } from "@/components/auth/auth-provider";
import { A7Brand } from "@/components/brand/a7-brand";
import { useLanguage } from "@/components/i18n/language-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { AnimatedAssetIcon } from "@/components/ui/animated-asset-icon";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { readStoredIds, STORAGE_KEYS } from "@/lib/local-storage";
import { useConversations } from "@/hooks/use-conversations";
import { useViewings } from "@/hooks/use-viewings";
import type { UserConversation } from "@/lib/messages-types";
import { formatPropertyPrice, type Property } from "@/lib/properties";
import { cn } from "@/lib/utils";
import { viewingDateBadge } from "@/lib/viewing-dates";
import { useSavedHomes } from "@/hooks/use-saved-homes";

const journeyLinks = [
  { id: "saved", label: "Saved homes", labelMy: "သိမ်းထားသောအိမ်များ", href: "/saved", icon: Heart },
  { id: "messages", label: "Messages", labelMy: "မက်ဆေ့ချ်များ", href: "/dashboard?section=messages#conversations", icon: MessageCircle },
  { id: "viewings", label: "Viewings", labelMy: "အိမ်ကြည့်ချိန်များ", href: "/dashboard?section=viewings#viewings", icon: CalendarDays },
] as const;

function propertiesFromIds(ids: string[], properties: Property[]) {
  return ids
    .map((id) => properties.find((property) => property.id === id))
    .filter((property): property is Property => Boolean(property));
}

function propertyMeta(property: Property) {
  return `${property.bedrooms} bed${property.bedrooms === 1 ? "" : "s"} · ${property.bathrooms} bath${property.bathrooms === 1 ? "" : "s"} · ${new Intl.NumberFormat("en-US").format(property.area_sqft)} sqft`;
}

interface HomeCardProps {
  property: Property;
  saved: boolean;
  onToggle: (property: Property) => void;
  priority?: boolean;
}

function SavedHomeCard({ property, saved, onToggle, priority = false }: HomeCardProps) {
  const { tx, isMyanmar } = useLanguage();

  return (
    <article className="group overflow-hidden rounded-[26px] bg-[#F8FBFF] shadow-[0_12px_36px_rgba(26,39,56,.08)] ring-1 ring-[#101828]/7 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_18px_48px_rgba(26,39,56,.13)]">
      <div className="relative aspect-[16/10] overflow-hidden bg-[#E8E9E5]">
        <Link href={`/properties/${property.id}`} className="absolute inset-0 z-10" aria-label={`View ${property.title}`} />
        <Image
          src={property.images[0]}
          alt={property.title}
          fill
          loading={priority ? "eager" : "lazy"}
          sizes="(max-width: 767px) 92vw, (max-width: 1279px) 46vw, 570px"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#101D2D]/32 via-transparent to-[#101D2D]/8" />

        <div className="absolute left-4 top-4 z-20 flex flex-wrap gap-2">
          {property.verification_status === "verified" && (
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/60 bg-[#F8FBFF]/92 px-3 text-[10px] font-semibold text-[#276A4B] shadow-sm backdrop-blur-md">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              {tx("Verified home", "စိစစ်ထားသောအိမ်")}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onToggle(property)}
          className="absolute right-4 top-4 z-20 grid size-11 place-items-center rounded-full border border-white/70 bg-[#F8FBFF]/94 text-[#101828] shadow-[0_6px_18px_rgba(16,29,45,.16)] backdrop-blur-md transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
          aria-label={saved ? tx(`Remove ${property.title} from saved homes`, `${property.title} ကို သိမ်းထားမှုမှဖယ်ရန်`) : tx(`Save ${property.title}`, `${property.title} ကို သိမ်းရန်`)}
          aria-pressed={saved}
        >
          <Heart className={cn("size-[19px]", saved && "fill-[#123B73] text-[#123B73]")} aria-hidden="true" />
        </button>

        <span className="absolute bottom-4 left-4 z-20 inline-flex items-center gap-1.5 rounded-full bg-[#101828]/62 px-3 py-1.5 text-[10px] font-medium text-white backdrop-blur-md">
          <MapPin className="size-3.5" aria-hidden="true" />
          {property.township}, {property.city}
        </span>
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p data-type="number" className="text-[20px] font-semibold tracking-[-0.035em] text-[#101828]">
              {formatPropertyPrice(property, isMyanmar ? "my" : "en")}
              {property.purpose === "rent" && <span className="ml-1 text-[11px] font-normal tracking-normal text-[#667085]">/ {tx("month", "လ")}</span>}
            </p>
            <Link href={`/properties/${property.id}`} className="mt-2 line-clamp-1 block text-[15px] font-medium text-[#26364A] transition-colors hover:text-[#123B73]">
              {property.title}
            </Link>
          </div>
          <span className="shrink-0 rounded-full bg-[#F8FBFF] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#5F6B79]">
            {property.purpose === "rent" ? tx("For rent", "ငှားရန်") : tx("For sale", "ရောင်းရန်")}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#E7E9EC] pt-4 text-[11px] text-[#66717E]">
          <span className="inline-flex items-center gap-1.5"><BedDouble className="size-4" />{tx(`${property.bedrooms} ${property.bedrooms === 1 ? "bed" : "beds"}`, `အိပ်ခန်း ${property.bedrooms}`)}</span>
          <span className="inline-flex items-center gap-1.5"><Bath className="size-4" />{tx(`${property.bathrooms} ${property.bathrooms === 1 ? "bath" : "baths"}`, `ရေချိုးခန်း ${property.bathrooms}`)}</span>
          <span className="inline-flex items-center gap-1.5"><Maximize2 className="size-3.5" />{new Intl.NumberFormat("en-US").format(property.area_sqft)} sqft</span>
          <Link href={`/properties/${property.id}`} className="ml-auto inline-flex min-h-11 items-center gap-1 font-semibold text-[#123B73] hover:underline">
            {tx("View home", "အိမ်ကိုကြည့်ရန်")} <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function HomeRailCard({ property, saved, onToggle }: HomeCardProps) {
  const { isMyanmar } = useLanguage();
  return (
    <article className="group min-w-[272px] flex-1 snap-start sm:min-w-[300px]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-[#E8E9E5] shadow-[0_8px_28px_rgba(26,39,56,.08)]">
        <Link href={`/properties/${property.id}`} className="absolute inset-0 z-10" aria-label={`View ${property.title}`} />
        <Image
          src={property.images[0]}
          alt={property.title}
          fill
          sizes="(max-width: 639px) 78vw, 310px"
          className="object-cover transition-transform duration-700 group-hover:scale-[1.035]"
        />
        <button
          type="button"
          onClick={() => onToggle(property)}
          className="absolute right-3 top-3 z-20 grid size-11 place-items-center rounded-full bg-[#F8FBFF]/94 text-[#101828] shadow-md backdrop-blur-md"
          aria-label={saved ? `Remove ${property.title} from saved homes` : `Save ${property.title}`}
          aria-pressed={saved}
        >
          <Heart className={cn("size-[18px]", saved && "fill-[#123B73] text-[#123B73]")} />
        </button>
      </div>
      <Link href={`/properties/${property.id}`} className="mt-4 block">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[14px] font-semibold text-[#1C2C40]">{property.township}, {property.city}</h3>
            <p className="mt-1 truncate text-[12px] text-[#667085]">{property.title}</p>
          </div>
          <p data-type="number" className="shrink-0 text-[13px] font-semibold text-[#1C2C40]">{formatPropertyPrice(property, isMyanmar ? "my" : "en")}</p>
        </div>
        <p className="mt-2 text-[10px] text-[#667085]">{propertyMeta(property)}</p>
      </Link>
    </article>
  );
}

function RecentHomeCard({ property, saved, onToggle }: HomeCardProps) {
  const { isMyanmar } = useLanguage();
  return (
    <article className="flex min-w-[286px] snap-start gap-4 rounded-[20px] bg-[#F8FBFF] p-3 shadow-[0_8px_28px_rgba(26,39,56,.06)] ring-1 ring-[#101828]/6 sm:min-w-0">
      <Link href={`/properties/${property.id}`} className="relative h-[112px] w-[116px] shrink-0 overflow-hidden rounded-[15px] bg-[#E8E9E5]">
        <Image src={property.images[0]} alt={property.title} fill sizes="116px" className="object-cover transition-transform duration-500 hover:scale-105" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col py-1">
        <div className="flex items-start gap-2">
          <Link href={`/properties/${property.id}`} className="min-w-0 flex-1">
            <h3 className="truncate text-[13px] font-semibold text-[#1C2C40]">{property.title}</h3>
            <p className="mt-1 text-[10px] text-[#667085]">{property.township}, {property.city}</p>
          </Link>
          <button type="button" onClick={() => onToggle(property)} className="grid size-11 shrink-0 place-items-center rounded-full text-[#617083]" aria-label={saved ? `Remove ${property.title} from saved homes` : `Save ${property.title}`} aria-pressed={saved}>
            <Heart className={cn("size-[17px]", saved && "fill-[#123B73] text-[#123B73]")} />
          </button>
        </div>
        <p data-type="number" className="mt-auto text-[13px] font-semibold text-[#1C2C40]">{formatPropertyPrice(property, isMyanmar ? "my" : "en")}</p>
        <p className="mt-1 text-[9px] text-[#667085]">{propertyMeta(property)}</p>
      </div>
    </article>
  );
}

function UserDashboard({ properties }: { properties: Property[] }) {
  const { isMyanmar, tx } = useLanguage();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const { savedIds, toggleSaved } = useSavedHomes();
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const { failed: messagesFailed, refresh: refreshMessages, conversations: messages, loadThread, markRead, sendReply: submitReply } = useConversations();
  const { failed: viewingsFailed, refresh: refreshViewings, appointments } = useViewings();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  // Saved homes, conversations and viewings each come from their own hook, which
  // owns both modes. Recently viewed stays on the device: it is a browsing
  // convenience rather than account data.
  useEffect(() => {
    const recent = readStoredIds(STORAGE_KEYS.recent, STORAGE_KEYS.legacyRecent, []);
    queueMicrotask(() => setRecentIds(recent));
  }, []);

  const requestedSection = searchParams.get("section");
  useEffect(() => {
    if (!requestedSection) return;
    const targetId = requestedSection === "messages" ? "conversations" : requestedSection;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [requestedSection]);

  const savedProperties = useMemo(() => propertiesFromIds(savedIds, properties), [properties, savedIds]);
  const recentProperties = useMemo(() => propertiesFromIds(recentIds, properties).slice(0, 3), [properties, recentIds]);
  const recommendedProperties = useMemo(() => {
    const saved = new Set(savedIds);
    return properties
      .filter((property) => !saved.has(property.id))
      .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))
      .slice(0, 4);
  }, [properties, savedIds]);

  const activeSection = requestedSection ?? "saved";
  const activeConversation = messages.find((message) => message.id === activeConversationId) ?? null;
  const displayName = user?.fullName.trim() || tx("Guest", "ဧည့်သည်");
  const displayInitials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  function handleToggleSaved(property: Property) {
    void toggleSaved(property);
  }

  function openConversation(conversation: UserConversation) {
    loadThread(conversation.id);
    markRead(conversation.id);
    setActiveConversationId(conversation.id);
  }

  function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = reply.trim();
    if (!text || !activeConversation) return;
    void submitReply(activeConversation.id, text).then((sent) => {
      if (sent) setReply("");
    });
  }

  return (
    <div className="min-h-screen bg-[#EAF4FF] text-[#101828]">
      <header className="a7-header-surface sticky top-0 z-50 h-[72px]">
        <div className="mx-auto flex h-full min-w-0 max-w-[1440px] items-center gap-3 px-4 sm:gap-7 sm:px-6 lg:px-10">
          <Link href="/" className="inline-flex min-h-11 min-w-11 shrink-0 items-center" aria-label="A7 Property home">
            <A7Brand compact className="min-[520px]:hidden" />
            <A7Brand className="hidden min-[520px]:inline-flex" />
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label={tx("My home journey", "ကျွန်ုပ်၏အိမ်ခရီးစဉ်")}>
            {journeyLinks.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-full px-4 text-[12px] font-medium transition-colors",
                    active ? "bg-[#DCEBFF] text-[#123B73]" : "text-[#5F6B78] hover:bg-[#F8FBFF] hover:text-[#101828]",
                  )}
                >
                  <Icon className="size-[17px]" />
                  {isMyanmar ? item.labelMy : item.label}
                  {item.id === "saved" && (
                    <span data-type="number" className="grid h-6 min-w-6 place-items-center rounded-full bg-[#123B73] px-1.5 text-[10px] font-bold text-white shadow-[0_4px_10px_rgba(18,59,115,.25)]">
                      {savedProperties.length}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <Link href="/search?purpose=rent" className="hidden size-10 place-items-center rounded-full text-[#526171] transition-colors hover:bg-[#F8FBFF] hover:text-[#123B73] sm:grid" aria-label={tx("Find homes", "အိမ်ရှာရန်")}>
              <Search className="size-[19px]" />
            </Link>
            <A7AssistantPopover labelClassName="hidden lg:inline" />
            <LanguageSwitcher className="hidden sm:block" />
            <LanguageSwitcher compact className="sm:hidden" />
            <Link href="/saved" className="relative grid size-11 place-items-center rounded-full text-[#526171] transition-colors hover:bg-[#F8FBFF] hover:text-[#123B73]" aria-label={tx("Saved homes", "သိမ်းထားသောအိမ်များ")}>
              <Bell className="size-[19px]" />
            </Link>
            <Link href="/profile" className="grid size-11 place-items-center rounded-full bg-[#101828] text-[11px] font-semibold text-white transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#123B73]/20" aria-label={`Open ${displayName} profile`}>{displayInitials}</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto min-w-0 max-w-[1440px] px-4 pb-28 sm:px-6 lg:px-10 lg:pb-20">
        {(messagesFailed || viewingsFailed) && <div role="alert" className="my-4 rounded-xl bg-red-50 p-4">{tx("Messages or viewings could not be loaded.", "စာများ သို့မဟုတ် ချိန်းဆိုမှုများ ဖွင့်မရပါ။")}<Button variant="outline" onClick={() => { refreshMessages(); refreshViewings(); }}>{tx("Retry", "ပြန်ကြိုးစားရန်")}</Button></div>}
        <section className="flex flex-col gap-7 pb-9 pt-10 sm:pb-12 sm:pt-14 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B7580]">{tx("Your home journey", "သင့်အိမ်ခရီးစဉ်")}</p>
            <h1 className="mt-3 text-[36px] font-semibold tracking-[-0.05em] text-[#101828] sm:text-[46px]">{tx(`Welcome back, ${displayName}`, `ပြန်လာတာ ကြိုဆိုပါတယ်၊ ${displayName}`)}</h1>
            <p className="mt-3 max-w-[580px] text-[15px] leading-7 text-[#65717E] sm:text-[16px]">
              {tx("The homes you love, the people you’re talking with, and what’s coming next—all in one calm place.", "သင်နှစ်သက်သောအိမ်များ၊ ဆက်သွယ်နေသူများနှင့် နောက်လာမည့်အစီအစဉ်များကို တည်ငြိမ်သောတစ်နေရာတည်းတွင် စီမံပါ။")}
            </p>
          </div>
          <div className="flex items-center gap-3 self-start sm:gap-5 lg:self-auto">
            <AnimatedAssetIcon src="/icons/a7-home-journey-3d.png" width={96} height={96} hover="float" className="size-20 sm:size-24" imageClassName="drop-shadow-[0_12px_18px_rgba(18,59,115,.2)]" />
            <Link href="/search?purpose=rent" className="inline-flex h-12 w-fit items-center gap-2 rounded-full bg-[#101828] px-5 text-[13px] font-semibold text-white shadow-[0_8px_22px_rgba(23,48,74,.18)] transition-transform hover:-translate-y-0.5">
              {tx("Find more homes", "နောက်ထပ်အိမ်များ ရှာမယ်")} <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>

        <section id="saved-homes" className="scroll-mt-24 border-t border-[#101828]/8 pt-9 sm:pt-11">
          <div className="mb-6 flex items-end justify-between gap-5 sm:mb-8">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-[28px] font-semibold tracking-[-0.045em] sm:text-[34px]">{tx("Saved homes", "သိမ်းထားသောအိမ်များ")}</h2>
                <span data-type="number" className="grid h-7 min-w-7 place-items-center rounded-full bg-[#123B73] px-2 text-[11px] font-bold text-white shadow-[0_5px_14px_rgba(18,59,115,.28)]">{savedProperties.length}</span>
              </div>
              <p className="mt-2 text-[13px] text-[#697582]">{tx("Your shortlist of places that could feel like home.", "ကိုယ့်အိမ်လို ခံစားရနိုင်သောနေရာများ၏ စိတ်ကြိုက်စာရင်း။")}</p>
            </div>
            <Link href="/search?purpose=rent" className="hidden items-center gap-1 text-[12px] font-semibold text-[#123B73] hover:underline sm:inline-flex">
              {tx("Browse all homes", "အိမ်အားလုံးကြည့်ရန်")} <ChevronRight className="size-4" />
            </Link>
          </div>

          {savedProperties.length ? (
            <div className="grid gap-5 md:grid-cols-2 lg:gap-6">
              {savedProperties.slice(0, 4).map((property, index) => (
                <SavedHomeCard key={property.id} property={property} saved onToggle={handleToggleSaved} priority={index < 2} />
              ))}
            </div>
          ) : (
            <div className="grid min-h-[300px] place-items-center rounded-[28px] bg-[#F8FBFF] px-6 text-center shadow-sm ring-1 ring-[#101828]/7">
              <div>
                <AnimatedAssetIcon src="/icons/a7-shortlist-empty-3d.png" width={88} height={88} hover="float" className="mx-auto size-[88px]" imageClassName="drop-shadow-[0_10px_16px_rgba(18,59,115,.18)]" />
                <h3 className="mt-5 text-xl font-semibold">{tx("Start your shortlist", "စိတ်ကြိုက်စာရင်း စတင်ပါ")}</h3>
                <p className="mt-2 text-sm text-[#6C7783]">{tx("Save the homes you love and they’ll stay together here.", "သင်နှစ်သက်သောအိမ်များကို သိမ်းထားပါ။ ဒီနေရာမှာ တစ်စုတစ်စည်းတည်း ရှိနေမည်။")}</p>
                <Link href="/search?purpose=rent" className="mt-5 inline-flex h-11 items-center rounded-full bg-[#101828] px-5 text-xs font-semibold text-white">{tx("Explore homes", "အိမ်များကြည့်မယ်")}</Link>
              </div>
            </div>
          )}
        </section>

        <section className="mt-16 sm:mt-20">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-[24px] font-semibold tracking-[-0.04em] sm:text-[28px]">{tx("Recently viewed", "မကြာသေးမီက ကြည့်ခဲ့သောအိမ်များ")}</h2>
              <p className="mt-2 text-[12px] text-[#6D7884]">{tx("Pick up where you left off.", "နောက်ဆုံးကြည့်ခဲ့သည့်နေရာမှ ဆက်ကြည့်ပါ။")}</p>
            </div>
            <Link href="/search?purpose=rent" className="inline-flex min-h-11 items-center text-[11px] font-semibold text-[#123B73] hover:underline">{tx("See browsing history", "ကြည့်ရှုမှုမှတ်တမ်း")}</Link>
          </div>
          <div className="hide-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-3">
            {recentProperties.map((property) => (
              <RecentHomeCard key={property.id} property={property} saved={savedIds.includes(property.id)} onToggle={handleToggleSaved} />
            ))}
          </div>
        </section>

        <section className="mt-16 border-y border-[#101828]/8 py-12 sm:mt-20 sm:py-16">
          <div className="mb-7 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#7A7166]">{tx("Inspired by your saves", "သိမ်းထားမှုအပေါ် အခြေခံထားသည်")}</p>
              <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.04em] sm:text-[30px]">{tx("More homes you may love", "သင်နှစ်သက်နိုင်မည့် နောက်ထပ်အိမ်များ")}</h2>
            </div>
            <Link href="/search?purpose=rent&sort=recommended" className="hidden items-center gap-1 text-[11px] font-semibold text-[#123B73] hover:underline sm:inline-flex">{tx("See recommendations", "အကြံပြုအိမ်များကြည့်ရန်")} <ChevronRight className="size-4" /></Link>
          </div>
          <div className="hide-scrollbar -mx-4 flex snap-x gap-5 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
            {recommendedProperties.map((property) => (
              <HomeRailCard key={property.id} property={property} saved={savedIds.includes(property.id)} onToggle={handleToggleSaved} />
            ))}
          </div>
        </section>

        <div className="mt-16 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8">

          <section id="conversations" className="scroll-mt-24 min-w-0 overflow-hidden rounded-[26px] bg-[#F8FBFF] p-5 shadow-[0_10px_36px_rgba(26,39,56,.06)] ring-1 ring-[#101828]/7 sm:p-7">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[22px] font-semibold tracking-[-0.035em]">{tx("Conversations with owners", "အိမ်ရှင်များနှင့် စကားပြောဆိုမှုများ")}</h2>
                <p className="mt-2 text-[12px] text-[#6D7884]">{tx("Answers that help you decide with confidence.", "ယုံကြည်စိတ်ချစွာ ဆုံးဖြတ်နိုင်ရန် အထောက်အကူဖြစ်မည့်အဖြေများ။")}</p>
              </div>
              <Link href="/dashboard?section=messages#conversations" className="inline-flex min-h-11 shrink-0 items-center text-[11px] font-semibold text-[#123B73]">{tx("View all", "အားလုံးကြည့်ရန်")}</Link>
            </div>
            <div className="mt-5 divide-y divide-[#E8EAED]">
              {messages.map((message) => {
                const property = properties.find((item) => item.id === message.propertyId);
                return (
                  <button key={message.id} type="button" onClick={() => openConversation(message)} className="group flex w-full items-center gap-3 py-4 text-left">
                    <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-[#EEF3F7] text-[11px] font-semibold text-[#30465C]">
                      {message.contact.split(" ").map((part) => part[0]).join("")}
                      {message.unread && <span className="absolute right-0 top-0 size-2.5 rounded-full border-2 border-white bg-[#123B73]" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <strong className="truncate text-[12px] text-[#223246]">{message.contact}</strong>
                        <small className="truncate text-[9px] text-[#8A929B]">{tx("about", "အကြောင်း")} {property?.township}</small>
                      </span>
                      <small className="mt-1.5 block truncate text-[10px] leading-4 text-[#66727E]">{message.preview}</small>
                    </span>
                    <span className="shrink-0 text-[9px] text-[#89919A]">{message.time}</span>
                    <ChevronRight className="size-4 shrink-0 text-[#A2A8AF] transition-transform group-hover:translate-x-0.5" />
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <section id="viewings" className="scroll-mt-24 mt-6 rounded-[28px] bg-[#101828] p-5 text-white shadow-[0_16px_42px_rgba(23,48,74,.16)] sm:p-8">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-7 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:items-center">
            <div className="min-w-0">
              <AnimatedAssetIcon src="/icons/a7-viewing-3d.png" width={80} height={80} hover="float" className="size-20" imageClassName="drop-shadow-[0_14px_22px_rgba(0,0,0,.28)]" />
              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/55">{tx("Coming up", "မကြာမီလာမည်")}</p>
              <h2 className="mt-2 text-[25px] font-semibold tracking-[-0.04em] sm:text-[30px]">{tx("Upcoming viewings", "လာမည့်အိမ်ကြည့်ချိန်များ")}</h2>
              <p className="mt-3 max-w-sm text-[12px] leading-6 text-white/65">{tx("Everything you need for your next visit, in one place.", "နောက်လာမည့်အိမ်ကြည့်ခရီးအတွက် လိုအပ်သမျှကို တစ်နေရာတည်းမှာ။")}</p>
            </div>
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
              {appointments.map((appointment) => {
                const property = properties.find((item) => item.id === appointment.propertyId);
                const dateBadge = viewingDateBadge(appointment.date);
                return (
                  <Link key={appointment.id} href={`/properties/${appointment.propertyId}`} className="min-w-0 rounded-[20px] border border-white/10 bg-[#F8FBFF]/[.075] p-4 transition-colors hover:bg-[#F8FBFF]/[.11]">
                    <div className="flex items-start gap-4">
                      <span className="grid size-12 shrink-0 place-items-center rounded-[15px] bg-[#F8FBFF] text-center text-[#101828] shadow-lg">
                        <span><strong className="block text-[16px] leading-4">{dateBadge.day}</strong><small className="text-[8px] font-semibold uppercase">{dateBadge.weekday}</small></span>
                      </span>
                      <span className="min-w-0">
                        <strong className="block truncate text-[12px]">{property?.title}</strong>
                        <small className="mt-1.5 flex items-center gap-1.5 text-[10px] text-white/62"><Clock3 className="size-3.5" />{appointment.time}</small>
                        <small className="mt-1 flex items-center gap-1.5 text-[10px] text-white/62"><MapPin className="size-3.5" />{property?.township}, {property?.city}</small>
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                      <span className="inline-flex items-center gap-1.5 text-[9px] font-medium text-[#4DA3FF]"><Check className="size-3.5" />{appointment.status}</span>
                      <span className="text-[9px] text-white/52">{tx("with", "နှင့်")} {appointment.contact}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <nav className="a7-mobile-nav-shell fixed inset-x-2.5 z-50 mx-auto grid max-w-[520px] grid-cols-4 p-2 md:hidden" aria-label={tx("Mobile home journey", "မိုဘိုင်းအိမ်ခရီးစဉ်")}>
        <Link href="/search?purpose=rent" className={cn("a7-mobile-nav-item flex flex-col items-center justify-center gap-1 font-medium hover:bg-white/45 hover:text-[#123B73]", isMyanmar ? "text-[11px]" : "text-[10px]")}><Search className="size-5" />{tx("Explore", "ရှာဖွေ")}</Link>
        {journeyLinks.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <Link key={item.id} href={item.href} aria-current={active ? "page" : undefined} className={cn("a7-mobile-nav-item flex flex-col items-center justify-center gap-1 font-medium", isMyanmar ? "text-[11px]" : "text-[10px]", active ? "a7-mobile-nav-item-active" : "hover:bg-white/45 hover:text-[#123B73]")}>
              <Icon className={active ? "size-[22px]" : "size-5"} />
              <span className="inline-flex items-center gap-1">
                {isMyanmar ? item.labelMy : item.label.replace(" homes", "")}
                {item.id === "saved" && <span data-type="number" className="grid min-w-4 place-items-center rounded-full bg-[#123B73] px-1 text-[8px] font-bold leading-4 text-white">{savedProperties.length}</span>}
              </span>
            </Link>
          );
        })}
      </nav>

      <Sheet
        open={Boolean(activeConversation)}
        onOpenChange={(open) => { if (!open) setActiveConversationId(null); }}
        title={activeConversation ? `Conversation with ${activeConversation.contact}` : "Conversation"}
        description={activeConversation ? `About ${properties.find((item) => item.id === activeConversation.propertyId)?.title ?? "this home"}` : undefined}
        side="right"
        footer={activeConversation && (
          <form onSubmit={sendReply} className="flex items-center gap-2">
            <label className="sr-only" htmlFor="conversation-reply">Write a reply</label>
            <input
              id="conversation-reply"
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder="Write a message…"
              className="h-11 min-w-0 flex-1 rounded-full border border-[#D6DEE7] bg-[#F8FBFF] px-4 text-xs outline-none focus:border-[#123B73] focus:ring-4 focus:ring-[#123B73]/10"
            />
            <Button type="submit" size="icon" className="size-11 shrink-0 rounded-full" disabled={!reply.trim()} aria-label="Send reply">
              <Send className="size-4" />
            </Button>
          </form>
        )}
      >
        {activeConversation && (
          <div className="flex min-h-full flex-col p-5 sm:p-7">
            <Link href={`/properties/${activeConversation.propertyId}`} className="mb-6 flex items-center justify-between rounded-2xl bg-[#F8FBFF] p-4 text-xs font-semibold text-[#101828]">
              View property details <ChevronRight className="size-4 text-[#123B73]" />
            </Link>
            <div className="space-y-4" aria-live="polite">
              {activeConversation.thread.map((message) => (
                <div key={message.id} className={cn("flex", message.sender === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[84%] rounded-[18px] px-4 py-3 text-[12px] leading-5",
                    message.sender === "user"
                      ? "rounded-br-md bg-[#123B73] text-white"
                      : "rounded-bl-md bg-[#DCEBFF] text-[#33465A]",
                  )}>
                    <p>{message.text}</p>
                    <span className={cn("mt-1.5 block text-[9px]", message.sender === "user" ? "text-white/65" : "text-[#82909E]")}>{message.time}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-auto pt-8 text-center text-[10px] leading-5 text-[#7A8794]">Your contact details remain private until you choose to share them.</p>
          </div>
        )}
      </Sheet>
    </div>
  );
}

export { UserDashboard };
