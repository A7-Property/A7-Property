"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, Check, CheckCheck, Loader2, LockKeyhole, Search, Send } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { useLanguage } from "@/components/i18n/language-provider";
import { useAuth } from "@/components/auth/auth-provider";
import { MobileAppHeader } from "@/components/layout/mobile-app-header";
import { AnimatedAssetIcon } from "@/components/ui/animated-asset-icon";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { Message, MessageAvatar, MessageContent, MessageFooter, MessageGroup, MessageHeader } from "@/components/ui/message";
import { ProgressiveImage } from "@/components/ui/progressive-image";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet } from "@/components/ui/sheet";
import { useConversations } from "@/hooks/use-conversations";
import type { UserConversation } from "@/lib/messages-types";
import { formatPropertyPrice, type Property } from "@/lib/properties";
import { cn } from "@/lib/utils";

function subscribeDesktop(onChange: () => void) {
  const media = window.matchMedia("(min-width: 1024px)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
const desktopSnapshot = () => window.matchMedia("(min-width: 1024px)").matches;
const serverDesktopSnapshot = () => false;

function MessagesExperience({ properties }: { properties: Property[] }) {
  const { tx } = useLanguage();
  const reduceMotion = useReducedMotion();
  const { failed, refresh, ready, conversations: messages, loadThread, markRead, sendReply: submitReply } = useConversations();
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const desktop = useSyncExternalStore(subscribeDesktop, desktopSnapshot, serverDesktopSnapshot);

  // Derived rather than stored, so the first thread shows as soon as the list
  // loads without an effect writing state.
  const active = messages.find((conversation) => conversation.id === activeId) ?? messages[0] ?? null;
  const reply = active ? drafts[active.id] ?? "" : "";
  const setReply = (value: string) => { if (active) setDrafts((current) => ({ ...current, [active.id]: value })); };

  // Fetch the visible thread's messages. Opening it is what marks it read.
  useEffect(() => {
    if (active) loadThread(active.id);
  }, [active, loadThread]);
  const visibleMessages = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return messages.filter((conversation) => {
      const fullProperty = properties.find((item) => item.id === conversation.propertyId);
      const property = fullProperty ?? conversation.propertySnapshot;
      if (!property) return false;
      return !normalizedQuery || `${conversation.contact} ${conversation.preview} ${property.title}`.toLowerCase().includes(normalizedQuery);
    });
  }, [messages, properties, query]);

  function openConversation(conversation: UserConversation) {
    loadThread(conversation.id);
    markRead(conversation.id);
    setActiveId(conversation.id);
    setMobileThreadOpen(true);
  }

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = reply.trim();
    if (!text || !active || sendingRef.current) return;
    const id = active.id;
    sendingRef.current = true; setSending(true);
    try {
      if (await submitReply(id, text)) setDrafts((current) => ({ ...current, [id]: current[id]?.trim() === text ? "" : current[id] }));
    } finally { sendingRef.current = false; setSending(false); }
  }

  const entrance = reduceMotion ? { duration: 0 } : { type: "spring" as const, stiffness: 92, damping: 19 };

  return (
    <div className="min-h-screen bg-[#F8FBFF] pb-28 text-[#191B24] lg:pb-10">
      <header className="a7-header-surface a7-safe-top fixed inset-x-0 top-0 z-50">
        <div className="mx-auto w-full max-w-[1240px]">
          <MobileAppHeader />
          <div className="px-4 pb-2 pt-1 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-[28px] font-bold leading-9 tracking-[-.025em]">{tx("Messages", "စာများ")}</h1>
              <AnimatedAssetIcon src="/icons/a7-messages-3d.png" width={52} height={52} hover="float" className="size-[52px]" imageClassName="drop-shadow-[0_8px_12px_rgba(18,59,115,.2)]" />
            </div>
            <label className="mt-4 flex h-11 items-center gap-2 rounded-xl bg-[#EAF4FF] px-3 transition-shadow a7-field-focus">
              <Search className="size-5 shrink-0 text-[#424655]" />
              <span className="sr-only">{tx("Search conversations", "စကားပြောမှုများရှာရန်")}</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tx("Search", "ရှာရန်")} className="h-11 min-w-0 flex-1 bg-transparent py-0 text-[14px] leading-10 text-[#191B24] outline-none placeholder:text-[#727687]" />
            </label>
          </div>
        </div>
      </header>

      <motion.main initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={entrance} className="mx-auto min-h-screen w-full max-w-[1240px] pb-8 pt-[calc(182px+env(safe-area-inset-top))]">
        <div className="overflow-hidden rounded-[22px] border border-a7-line bg-white shadow-sm lg:grid lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
          <section aria-label={tx("Conversation list", "စကားပြောမှုစာရင်း")} className="min-w-0 lg:max-h-[680px] lg:overflow-y-auto lg:border-r lg:border-a7-line">
            {failed && <div role="alert" className="space-y-3 p-5"><p className="text-sm font-semibold">{tx("Could not load messages.", "စာများ ဖွင့်မရပါ။")}</p><Button variant="outline" onClick={refresh}>{tx("Retry", "ပြန်ကြိုးစားရန်")}</Button></div>}
            {!ready && <div role="status" className="space-y-5 p-5"><span className="sr-only">{tx("Loading messages…", "စာများ ဖွင့်နေသည်…")}</span>{[0, 1, 2].map((index) => <Skeleton key={index} className="h-20 rounded-xl" />)}</div>}
            {visibleMessages.map((conversation, index) => <ConversationCard key={conversation.id} conversation={conversation} selected={active?.id === conversation.id} properties={properties} index={index} reduceMotion={Boolean(reduceMotion)} onClick={() => openConversation(conversation)} />)}
            {ready && !failed && visibleMessages.length === 0 && <div className="px-6 py-16 text-center"><AnimatedAssetIcon src="/icons/a7-conversation-empty-3d.png" width={80} height={80} hover="float" className="mx-auto size-20" /><h2 className="mt-4 text-base font-semibold">{query.trim() ? tx("No matching conversations", "ကိုက်ညီသော စကားပြောမှုမရှိပါ") : tx("No messages yet", "စာများ မရှိသေးပါ")}</h2><p className="mt-2 text-sm leading-6 text-a7-muted">{query.trim() ? tx("Try another name or property.", "အမည် သို့မဟုတ် အိမ်အမည်တစ်ခုကို ထပ်ရှာကြည့်ပါ။") : tx("Your property conversations will appear here.", "အိမ်အကြောင်း စကားပြောဆိုမှုများကို ဤနေရာတွင် တွေ့နိုင်ပါမည်။")}</p>{query.trim() && <Button variant="outline" className="mt-4" onClick={() => setQuery("")}>{tx("Clear search", "ရှာဖွေမှုရှင်းရန်")}</Button>}</div>}
          </section>
          <section aria-label={tx("Message workspace", "စာပြောဆိုရန်နေရာ")} className="hidden min-w-0 lg:block">
            {active ? <ConversationThread conversation={active} properties={properties} reply={reply} onReplyChange={setReply} onSubmit={sendReply} sending={sending} /> : <EmptyConversation />}
          </section>
        </div>
      </motion.main>

      <Sheet open={mobileThreadOpen && !desktop} onOpenChange={setMobileThreadOpen} title={active?.contact ?? tx("Conversation", "စကားပြော")} description={tx("Review each listing’s contact verification status", "အိမ်တစ်ခုစီ၏ ဆက်သွယ်သူစိစစ်မှုကို ကြည့်ပါ")} side="right" className="max-w-none sm:max-w-[540px]">
        {active && <ConversationThread conversation={active} properties={properties} reply={reply} onReplyChange={setReply} onSubmit={sendReply} sending={sending} compact />}
      </Sheet>
    </div>
  );
}

function ConversationCard({ conversation, selected, properties, index, reduceMotion, onClick }: { selected: boolean; conversation: UserConversation; properties: Property[]; index: number; reduceMotion: boolean; onClick: () => void }) {
  const { tx } = useLanguage();
  const fullProperty = properties.find((item) => item.id === conversation.propertyId);
  const property = fullProperty ?? conversation.propertySnapshot;
  if (!property) return null;
  const initials = conversation.contact.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const avatarTone = index === 0 ? "bg-[#DAE2FF] text-[#003FA3]" : index === 1 ? "bg-[#DCEFE8] text-[#146B53]" : "bg-[#F4E6E0] text-[#8A4C36]";
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduceMotion ? 0 : index * 0.06, duration: reduceMotion ? 0 : 0.34, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduceMotion ? undefined : { backgroundColor: "#F2F3FF" }}
      whileTap={reduceMotion ? undefined : { scale: 0.995 }}
      className={cn("group flex w-full items-start gap-4 border-b border-a7-line bg-white px-4 py-4 text-left transition-colors last:border-b-0 sm:px-5", selected && "bg-[#EAF4FF]")}
      aria-label={tx(`Open conversation with ${conversation.contact} about ${property.title} (${property.id})`, `${conversation.contact} နှင့် ${property.title} (${property.id}) အကြောင်း စကားပြောခန်းဖွင့်ရန်`)}
    >
      <span className={cn("relative grid size-[52px] shrink-0 place-items-center rounded-full text-[16px] font-semibold leading-none shadow-sm", avatarTone)}>
        <span className="relative top-px inline-flex items-center leading-none">{initials}</span>
        {conversation.unread && <span className="absolute -right-0.5 top-0 size-3.5 rounded-full bg-[#007AFF] ring-2 ring-[#FAF8FF]" aria-label={tx("Unread message", "မဖတ်ရသေးသောစာ")} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <strong className={cn("flex min-w-0 items-center gap-1 truncate text-[17px] tracking-[-.015em]", conversation.unread ? "font-semibold text-[#191B24]" : "font-medium text-[#292B34]")}><span className="truncate">{conversation.contact}</span>{fullProperty?.verification_status === "verified" && <BadgeCheck className="size-4 shrink-0 fill-[#007AFF] text-white" />}</strong>
          <time className={cn("shrink-0 text-[13px]", conversation.unread ? "font-medium text-[#007AFF]" : "text-[#727687]")}>{conversation.time}</time>
        </span>
        <span className="mt-1 flex min-w-0 items-center gap-2 text-[#424655]">
          <span className="relative size-6 shrink-0 overflow-hidden rounded bg-[#E6E7F4] shadow-sm">{property.images[0] && <ProgressiveImage src={property.images[0]} alt="" fill sizes="24px" className="object-cover" />}</span>
          <span className="truncate text-[14px]">{property.title}</span>
        </span>
        <span className={cn("mt-1 block line-clamp-2 pr-1 text-[15px] leading-5", conversation.unread ? "font-medium text-[#191B24]" : "text-[#424655]")}>{conversation.preview}</span>
      </span>
    </motion.button>
  );
}

function ConversationThread({ conversation, properties, reply, onReplyChange, onSubmit, sending, compact = false }: { sending: boolean; conversation: UserConversation; properties: Property[]; reply: string; onReplyChange: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; compact?: boolean }) {
  const { isMyanmar, tx } = useLanguage();
  const { user } = useAuth();
  const fullProperty = properties.find((item) => item.id === conversation.propertyId);
  const property = fullProperty ?? conversation.propertySnapshot;
  if (!property) return <EmptyConversation />;
  const role = user?.accountType === "lister" || !fullProperty
    ? tx("Contact verification unavailable", "ဆက်သွယ်သူ စိစစ်မှုအချက်အလက် မရနိုင်ပါ")
    : fullProperty.owner.phone_verified ? tx("Phone verified", "ဖုန်းစိစစ်ပြီး") : tx("Phone not verified", "ဖုန်းမစိစစ်ရသေး");
  const contactInitials = conversation.contact.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const userInitials = user?.fullName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={cn("flex h-[680px] min-w-0 flex-col", compact && "h-[calc(100svh-126px)] min-h-[500px]")}>
      <div className="flex items-center gap-3 border-b border-[#D0DEF0] bg-[#F8FBFF]/90 px-4 py-3 sm:px-5">
        <span className="relative h-14 w-[76px] shrink-0 overflow-hidden rounded-[13px] bg-[#D0DEF0]">{property.images[0] && <ProgressiveImage src={property.images[0]} alt="" fill sizes="76px" className="object-cover" />}</span>
        <div className="min-w-0 flex-1">{fullProperty ? <Link href={`/properties/${property.id}`} className="block truncate text-sm font-semibold hover:text-a7-blue">{property.title}</Link> : <p className="truncate text-sm font-semibold">{property.title}</p>}<p className="mt-1 truncate text-xs text-a7-muted">{fullProperty ? formatPropertyPrice(fullProperty, isMyanmar ? "my" : "en") : tx("Listing details unavailable", "အိမ်စာရင်းအသေးစိတ် မရနိုင်ပါ")} · {property.township}</p><p className="mt-1 text-xs text-a7-muted">{conversation.contact} · {role}</p></div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#F8FBFF] p-4 sm:p-6">
        <div className="mt-auto space-y-5">
          <Marker className="mx-auto w-fit rounded-full border border-white/90 bg-[#F8FBFF]/78 px-3 py-1.5 text-[8px] font-semibold text-[#52716B] shadow-sm backdrop-blur">
            <MarkerIcon><LockKeyhole className="size-3" /></MarkerIcon>
            <MarkerContent>{tx("Private conversation", "သီးသန့် စကားပြောခန်း")}</MarkerContent>
          </Marker>
          <Marker variant="separator" className="text-[8px] font-semibold uppercase tracking-[0.08em] text-[#8A918D]"><MarkerContent>{tx("Conversation", "စကားပြောခန်း")}</MarkerContent></Marker>
          <MessageGroup className="gap-4">
            {conversation.thread.map((message) => {
              const isUser = message.sender === "user";
              return (
                <Message key={message.id} align={isUser ? "end" : "start"} className="gap-2.5">
                  <MessageAvatar className="min-w-8 overflow-visible bg-transparent">
                    <Avatar size="sm" className={cn("ring-2 ring-white", isUser ? "bg-[#123B73] text-white" : "bg-[#E7EEF7] text-[#123B73]")}>
                      <AvatarFallback>{isUser ? userInitials : contactInitials}</AvatarFallback>
                    </Avatar>
                  </MessageAvatar>
                  <MessageContent className="max-w-[82%] gap-1.5">
                    <MessageHeader className={cn("px-1 text-[8px]", isUser && "justify-end")}>{isUser ? tx("You", "သင်") : conversation.contact}</MessageHeader>
                    <Bubble variant={isUser ? "default" : "muted"} align={isUser ? "end" : "start"} className="max-w-full">
                      <BubbleContent className={cn("rounded-[18px] px-4 py-3 text-[11px] leading-5 shadow-[0_2px_8px_rgba(15,23,42,.045)]", isUser ? "rounded-br-[6px]" : "rounded-bl-[6px] text-[#38423E]")}>{message.text}</BubbleContent>
                    </Bubble>
                    <MessageFooter className={cn("gap-1 px-1 text-[8px]", isUser ? "text-[#6B7C91]" : "text-[#858D88]")}>{message.time}{isUser && <span aria-label={message.isRead === true ? tx("Read", "ဖတ်ပြီး") : tx("Sent", "ပေးပို့ပြီး")}>{message.isRead === true ? <CheckCheck className="size-3 text-a7-blue" aria-hidden="true" /> : <Check className="size-3" aria-hidden="true" />}</span>}</MessageFooter>
                  </MessageContent>
                </Message>
              );
            })}
          </MessageGroup>
        </div>
      </div>
      <form onSubmit={onSubmit} className="border-t border-[#D0DEF0] bg-[#F8FBFF] p-3 sm:p-4"><div className="flex items-end gap-2 rounded-[14px] border border-[#D0DEF0] bg-[#F8FBFF] p-2 transition-[border-color,box-shadow] a7-field-focus"><textarea data-focus-ring="parent" disabled={sending} value={reply} onChange={(event) => onReplyChange(event.target.value)} rows={1} aria-label={tx("Write a message", "စာရေးရန်")} placeholder={tx("Write a message…", "စာရေးပါ…")} className="max-h-28 min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-[11px] outline-none" /><button type="submit" disabled={!reply.trim() || sending} className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-[#123B73] text-white disabled:opacity-40" aria-label={sending ? tx("Sending message", "စာပို့နေသည်") : tx("Send message", "စာပို့ရန်")}>{sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}</button></div></form>
    </div>
  );
}

function EmptyConversation() {
  const { tx } = useLanguage();
  return <div className="grid h-[620px] place-items-center p-8 text-center"><div><AnimatedAssetIcon src="/icons/a7-conversation-empty-3d.png" width={80} height={80} hover="float" className="mx-auto size-20" imageClassName="drop-shadow-[0_9px_14px_rgba(18,59,115,.16)]" /><h2 className="mt-4 text-lg font-semibold">{tx("Choose a conversation", "စကားပြောခန်းတစ်ခု ရွေးပါ")}</h2><p className="mt-2 text-[11px] text-[#737C77]">{tx("Property details stay close while you chat.", "စကားပြောနေစဉ် အိမ်အသေးစိတ်ကို အလွယ်တကူ ကြည့်နိုင်ပါသည်။")}</p></div></div>;
}

export { MessagesExperience };
