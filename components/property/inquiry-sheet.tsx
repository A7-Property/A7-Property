"use client";

import { Bath, BedDouble, Building2, CalendarDays, ChevronLeft, ChevronRight, Clock3, Info, MapPin, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { useLanguage } from "@/components/i18n/language-provider";
import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/ui/toast-provider";
import { ApiError, isApiConfigured } from "@/lib/api/client";
import * as messagesApi from "@/lib/api/messages";
import * as viewingsApi from "@/lib/api/viewings";
import { AnimatedAssetIcon } from "@/components/ui/animated-asset-icon";
import { ProgressiveImage } from "@/components/ui/progressive-image";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { readStoredJson, STORAGE_KEYS, writeStoredJson } from "@/lib/local-storage";
import type { UserAppointment, UserConversation } from "@/lib/messages-types";
import { propertyTypeLabels, type Property } from "@/lib/properties";
import { getUpcomingViewingDates, viewingTimeIso } from "@/lib/viewing-dates";
import { composeContactMessage } from "@/lib/contact-message";

type InquiryMode = "contact" | "schedule";
type ReplyMethod = "message" | "phone";

interface InquirySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: InquiryMode;
  property: Property;
}

function InquirySheet({ open, onOpenChange, mode, property }: InquirySheetProps) {
  const { tx, isMyanmar } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const serverBacked = isApiConfigured();
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(`Hello, I’m interested in ${property.title}. Is it still available?`);
  const [replyMethod, setReplyMethod] = useState<ReplyMethod>("message");
  const [calendarBase] = useState(() => new Date());
  const [datePage, setDatePage] = useState(0);
  const dateOptions = useMemo(() => getUpcomingViewingDates(new Date(calendarBase.getTime() + datePage * 5 * 86_400_000), 5), [calendarBase, datePage]);
  const [date, setDate] = useState(() => getUpcomingViewingDates(undefined, 5)[0].value);
  const [time, setTime] = useState("10:30 AM");
  const timeOptions = ["9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "1:00 PM", "2:00 PM"];
  const selectedDateIndex = Math.max(0, dateOptions.findIndex((option) => option.value === date));
  const selectedDateValue = new Date(`${dateOptions[selectedDateIndex].value}T00:00:00`);
  const contactMessage = composeContactMessage(message, replyMethod === "phone", tx(
    "Reply preference: phone call. Please ask me for my number in this chat.",
    "ဖုန်းဖြင့် အကြောင်းပြန်စေလိုပါသည်။ ဖုန်းနံပါတ်ကို ဤစကားဝိုင်းတွင် မေးပေးပါ။",
  ));

  function moveDatePage(direction: -1 | 1) {
    const nextPage = Math.max(0, datePage + direction);
    const nextOptions = getUpcomingViewingDates(new Date(calendarBase.getTime() + nextPage * 5 * 86_400_000), 5);
    setDatePage(nextPage);
    setDate(nextOptions[0].value);
  }

  /** Combines the chosen date and time into the instant the API expects. */
  function scheduledAtIso() {
    return viewingTimeIso(date, time);
  }

  function describeError(error: unknown) {
    if (!(error instanceof ApiError)) return tx("Check your connection and try again.", "အင်တာနက်ချိတ်ဆက်မှုကို စစ်ပြီး ထပ်မံကြိုးစားပါ။");
    if (error.needsEmailVerification) return tx("Confirm your email address first, then try again.", "သင့်အီးမေးလ်လိပ်စာကို အရင်အတည်ပြုပြီးမှ ထပ်မံကြိုးစားပါ။");
    if (error.isRateLimited) return tx("Too many requests. Please wait a minute.", "တောင်းဆိုမှုအလွန်များပါသည်။ ခဏစောင့်ပါ။");
    if (error.status === 409) return tx("You already have an open viewing request for this home.", "ဤအိမ်အတွက် အိမ်ကြည့်တောင်းဆိုချက် ရှိပြီးသားဖြစ်ပါသည်။");
    if (error.status === 404) return tx("This home is no longer published.", "ဤအိမ်ကို ကြော်ငြာမထားတော့ပါ။");
    return error.message;
  }

  async function submitToServer() {
    setSending(true);
    try {
      if (mode === "contact") {
        // The thread is the product's messaging journey, so contacting an owner
        // opens (or reuses) the conversation and posts the first message.
        const conversation = await messagesApi.createConversation(property.id);
        await messagesApi.sendMessage(conversation.id, contactMessage);
      } else {
        await viewingsApi.createViewing(property.id, scheduledAtIso());
      }
      setSubmitted(true);
    } catch (error) {
      toast({
        tone: "error",
        title: mode === "contact"
          ? tx("Your message was not sent", "သင့်စာ မပေးပို့နိုင်ပါ")
          : tx("Your viewing request was not sent", "အိမ်ကြည့်တောင်းဆိုချက် မပေးပို့နိုင်ပါ"),
        description: describeError(error),
      });
    } finally {
      setSending(false);
    }
  }

  function submit() {
    if (serverBacked) {
      void submitToServer();
      return;
    }
    if (mode === "contact") {
      const existing = readStoredJson<UserConversation[]>(STORAGE_KEYS.conversations, []);
      const conversationId = `MSG-${Date.now()}`;
      const next: UserConversation = {
        id: conversationId,
        contact: property.owner.name,
        propertyId: property.id,
        preview: contactMessage,
        time: "Just now",
        unread: false,
        seekerName: user?.fullName,
        thread: [{ id: `${conversationId}-1`, sender: "user", text: contactMessage, time: "Just now" }],
      };
      writeStoredJson(
        STORAGE_KEYS.conversations,
        [next, ...existing.filter((item) => !(item.propertyId === property.id && item.contact === property.owner.name))],
      );
    } else {
      const existing = readStoredJson<UserAppointment[]>(STORAGE_KEYS.viewings, []);
      const appointmentId = `APT-${Date.now()}`;
      const next: UserAppointment = {
        id: appointmentId,
        propertyId: property.id,
        date: dateOptions.find((option) => option.value === date)?.englishLabel ?? date,
        time,
        contact: property.owner.name,
        status: "Awaiting owner",
        seekerName: user?.fullName,
      };
      writeStoredJson(
        STORAGE_KEYS.viewings,
        [next, ...existing.filter((item) => item.propertyId !== property.id)],
      );
    }
    setSubmitted(true);
  }

  function close(next: boolean) {
    onOpenChange(next);
    if (!next) window.setTimeout(() => setSubmitted(false), 250);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={close}
      title={mode === "contact" ? tx(`Contact ${property.owner.name}`, `${property.owner.name} ကို ဆက်သွယ်ရန်`) : tx("Schedule a viewing", "အိမ်ကြည့်ချိန်ချိန်းရန်")}
      description={mode === "contact" ? tx("Ask a clear question and get a faster response.", "ရှင်းလင်းစွာမေးမြန်းပြီး ပိုမြန်သောအဖြေရယူပါ။") : tx("Choose a preferred time. The owner will confirm before it is booked.", "နှစ်သက်သောအချိန်ကို ရွေးပါ။ အိမ်ရှင်အတည်ပြုပြီးမှ ချိန်းဆိုမည်။")}
      side="right"
      headerClassName="px-5 py-4 sm:px-7 sm:py-5"
      footerClassName="px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:px-7"
      footer={!submitted && <Button className="h-12 w-full rounded-[14px] text-sm font-semibold" onClick={submit} disabled={sending}><span className="inline-flex h-5 items-center justify-center gap-2 leading-none"><span className="flex size-5 items-center justify-center [&>svg]:block [&>svg]:-translate-y-px" aria-hidden="true">{mode === "contact" ? <MessageCircle className="size-4" /> : <CalendarDays className="size-4" />}</span><span className="inline-flex h-5 items-center leading-none">{mode === "contact" ? tx("Send inquiry", "မေးမြန်းချက်ပို့ရန်") : tx("Request viewing", "အိမ်ကြည့်ရန်တောင်းဆို")}</span></span></Button>}
    >
      {submitted ? (
        <div className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center"><AnimatedAssetIcon src="/icons/a7-success-3d.png" width={96} height={96} hover="float" className="size-24" imageClassName="drop-shadow-[0_12px_18px_rgba(18,59,115,.22)]" /><h3 className="mt-5 text-lg font-semibold">{serverBacked
          ? (mode === "contact" ? tx("Message sent", "စာပေးပို့ပြီး") : tx("Viewing requested", "အိမ်ကြည့်ရန် တောင်းဆိုပြီး"))
          : (mode === "contact" ? tx("Demo inquiry saved", "နမူနာမေးမြန်းချက် သိမ်းပြီး") : tx("Demo viewing saved", "နမူနာအိမ်ကြည့်ချိန် သိမ်းပြီး"))}</h3><p className="mt-2 max-w-xs text-xs leading-5 text-[#667085]">{serverBacked
          ? (mode === "contact"
            ? tx("The owner has been notified and can reply in your messages.", "ပိုင်ရှင်ထံ အသိပေးပြီးဖြစ်ပြီး သင့် messages တွင် အကြောင်းပြန်နိုင်ပါသည်။")
            : tx("The owner has been notified and will confirm or decline your request.", "ပိုင်ရှင်ထံ အသိပေးပြီးဖြစ်ပြီး သင့်တောင်းဆိုချက်ကို အတည်ပြု သို့မဟုတ် ငြင်းပယ်ပါမည်။"))
          : tx("This stays on this device. No message or viewing request was sent to the owner.", "ဤစက်ပေါ်တွင်သာ သိမ်းထားပါသည်။ ပိုင်ရှင်ထံ စာ သို့မဟုတ် အိမ်ကြည့်တောင်းဆိုချက် မပို့ထားပါ။")}</p><Button variant="outline" className="mt-6 rounded-[14px]" onClick={() => close(false)}>{tx("Done", "ပြီးပါပြီ")}</Button></div>
      ) : (
        <div className="space-y-5 p-5 sm:p-7">
          {mode === "schedule" ? (
            <div className="grid grid-cols-[96px_1fr] gap-4 rounded-[20px] border border-[#E4E7EC] bg-gradient-to-br from-[#F2F5FF] to-white p-4 shadow-[0_8px_24px_rgba(18,59,115,.07)]">
              <span className="relative block h-28 w-24 shrink-0 overflow-hidden rounded-[16px]"><ProgressiveImage src={property.images[0]} alt={property.title} fill sizes="96px" loading="lazy" className="object-cover" /></span>
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#123B73] shadow-sm"><ShieldCheck className="size-3.5" />{property.verification_status === "verified" && property.owner.phone_verified ? tx("Verified listing & contact", "စိစစ်ထားသောအိမ်နှင့် ဆက်သွယ်သူ") : tx("Check listing & contact status", "အိမ်နှင့် ဆက်သွယ်သူ အခြေအနေကို စစ်ပါ")}</span>
                <AnimatedAssetIcon src="/icons/a7-schedule-viewing-3d.png" width={32} height={32} hover="none" className="mt-2 size-8" />
                <strong className="mt-2 block text-[15px] leading-5 text-[#101828]">{property.title}</strong>
                <span className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#667085]"><MapPin className="size-3.5" />{property.township}, {property.city}</span>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-medium text-[#344054]"><span className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1.5"><BedDouble className="size-3.5" />{property.bedrooms} Beds</span><span className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1.5"><Bath className="size-3.5" />{property.bathrooms} Bath</span><span className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1.5"><Building2 className="size-3.5" />{propertyTypeLabels[property.property_type]}</span></div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-[88px_1fr] gap-3.5 rounded-[20px] border border-[#D8E3F2] bg-gradient-to-br from-[#EAF2FF] to-[#F8FBFF] p-3.5 shadow-[0_8px_24px_rgba(18,59,115,.07)]">
              <span className="relative block h-24 w-[88px] shrink-0 overflow-hidden rounded-[15px]"><ProgressiveImage src={property.images[0]} alt={property.title} fill sizes="88px" loading="lazy" className="object-cover" /></span>
              <div className="min-w-0 self-center"><span className="inline-grid h-8 grid-cols-[16px_auto] items-center gap-1.5 whitespace-nowrap rounded-full border border-[#D6E3F4] bg-white px-3 text-[11px] font-semibold text-[#123B73] shadow-sm"><span className="grid size-4 place-items-center" aria-hidden="true"><ShieldCheck className="block size-3.5" /></span><span className="inline-flex h-4 items-center leading-none">{property.verification_status === "verified" && property.owner.phone_verified ? tx("Verified listing & phone", "စိစစ်ထားသောအိမ်နှင့် ဖုန်း") : tx("Check contact details", "ဆက်သွယ်ရန်အချက်အလက်စစ်ပါ")}</span></span><div className="mt-1 flex items-center gap-2"><AnimatedAssetIcon src="/icons/a7-contact-home-3d.png" width={32} height={32} hover="none" className="size-8" /><strong className="block text-[14px] leading-5 text-[#101828]">{property.title}</strong></div><span className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#667085]"><MapPin className="size-3.5 shrink-0" />{property.township}, {property.city}</span></div>
            </div>
          )}
          {mode === "contact" ? (
            <>
              <label className="block"><span className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#667085]"><MessageCircle className="size-4 text-[#123B73]" />{tx("Your message", "သင့်စာ")}</span><div className="overflow-hidden rounded-[16px] border border-[#D0DEF0] bg-white shadow-[0_5px_16px_rgba(18,59,115,.04)] focus-within:border-[#123B73] focus-within:ring-3 focus-within:ring-[#123B73]/10"><textarea value={message} maxLength={500} onChange={(event) => setMessage(event.target.value)} className="min-h-36 w-full resize-none border-0 bg-transparent p-4 pb-2 text-sm leading-6 outline-none" /><div className="flex items-center justify-between border-t border-[#EEF2F6] px-4 py-2 text-[10px] text-[#98A2B3]"><span>{tx("Keep it clear and specific", "ရှင်းလင်းတိကျစွာ ရေးပါ")}</span><span>{message.length}/500</span></div></div></label>
              <fieldset><legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#667085]">{tx("How should they reply?", "မည်သို့အကြောင်းပြန်စေလိုသနည်း")}</legend><div className="grid grid-cols-2 gap-3">{([
                { value: "message", label: tx("In-app message", "အက်ပ်တွင်းစာ") },
                { value: "phone", label: tx("Phone call", "ဖုန်းခေါ်ဆိုမှု") },
              ] as const).map((option) => <label key={option.value} className={replyMethod === option.value ? "relative flex min-h-[68px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[16px] border border-[#123B73] bg-[#EAF2FF] px-3 py-2 text-center text-sm font-semibold text-[#123B73] shadow-[0_5px_14px_rgba(18,59,115,.1)]" : "relative flex min-h-[68px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[16px] border border-[#D0DEF0] bg-white px-3 py-2 text-center text-sm font-medium text-[#475467]"}><input type="radio" name="reply" value={option.value} checked={replyMethod === option.value} onChange={() => setReplyMethod(option.value)} className="peer sr-only" /><span className="flex size-7 items-center justify-center rounded-full bg-white text-[#123B73] shadow-sm" aria-hidden="true">{option.value === "message" ? <MessageCircle className="size-4" /> : <Phone className="size-4" />}</span><span className="leading-4">{option.label}</span><span className={replyMethod === option.value ? "absolute right-2.5 top-2.5 size-2 rounded-full bg-[#123B73]" : "absolute right-2.5 top-2.5 size-2 rounded-full border border-[#98A2B3]"} /></label>)}</div></fieldset>
              <div className="flex items-center gap-3 rounded-[16px] bg-[#EEF4FF] px-4 py-3"><Clock3 className="size-5 shrink-0 text-[#123B73]" /><p className="text-[11px] leading-4 text-[#667085]"><strong className="block text-xs text-[#101828]">{tx("Reply time", "အကြောင်းပြန်ချိန်")}</strong>{property.owner.response_time_minutes === null ? tx("No response-time information is available.", "အကြောင်းပြန်ချိန် အချက်အလက် မရှိသေးပါ။") : tx(`${property.owner.name} typically responds within ${property.owner.response_time_minutes} minutes.`, `${property.owner.name} သည် ${property.owner.response_time_minutes} မိနစ်အတွင်း အကြောင်းပြန်တတ်သည်။`)}</p></div>
            </>
          ) : (
            <>
              <fieldset><legend className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#101828]"><span className="flex size-9 items-center justify-center rounded-full bg-[#E9EEFF] text-[#123B73]"><CalendarDays className="size-4" /></span>{tx("Select date", "ရက်ရွေးရန်")}</legend><div className="rounded-[18px] border border-[#E4E7EC] bg-white p-2.5 shadow-[0_6px_18px_rgba(18,59,115,.05)]"><div className="mb-2 flex h-10 items-center justify-between rounded-[12px] bg-[#F8FAFC] px-1"><button type="button" onClick={() => moveDatePage(-1)} disabled={datePage === 0} className="flex size-8 items-center justify-center rounded-[10px] bg-white text-[#344054] shadow-sm transition hover:bg-[#EEF4FF] active:scale-95 disabled:opacity-35" aria-label={tx("Previous five dates", "ယခင်ရက်ငါးရက်")}><ChevronLeft className="size-5" /></button><strong className="text-sm text-[#101828]">{selectedDateValue.toLocaleDateString(isMyanmar ? "my-MM" : "en-US", { month: "short", year: "numeric" })}</strong><button type="button" onClick={() => moveDatePage(1)} className="flex size-8 items-center justify-center rounded-[10px] bg-white text-[#344054] shadow-sm transition hover:bg-[#EEF4FF] active:scale-95" aria-label={tx("Next five dates", "နောက်ရက်ငါးရက်")}><ChevronRight className="size-5" /></button></div><div className="grid grid-cols-5 gap-1.5">{dateOptions.map((option) => { const parsed = new Date(`${option.value}T00:00:00`); return <label key={option.value} className={date === option.value ? "cursor-pointer rounded-[13px] border-2 border-[#123B73] bg-[#EAF2FF] px-1 py-2 text-center text-[#123B73] shadow-[0_4px_12px_rgba(18,59,115,.1)]" : "cursor-pointer rounded-[13px] border-2 border-transparent px-1 py-2 text-center text-[#344054] transition hover:bg-[#F2F4F7] active:scale-95"}><input type="radio" name="date" value={option.value} checked={date === option.value} onChange={() => setDate(option.value)} className="sr-only" /><span className="block text-[10px] font-medium">{parsed.toLocaleDateString(isMyanmar ? "my-MM" : "en-US", { weekday: "short" })}</span><strong className="mt-1 block text-lg leading-none">{parsed.getDate().toString().padStart(2, "0")}</strong></label>; })}</div></div></fieldset>
              <fieldset><legend className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#101828]"><span className="flex size-9 items-center justify-center rounded-full bg-[#E9EEFF] text-[#123B73]"><Clock3 className="size-4" /></span>{tx("Select time (Myanmar)", "အချိန်ရွေးရန် (မြန်မာစံတော်ချိန်)")}</legend><div className="grid grid-cols-2 gap-2">{timeOptions.map((option) => <button key={option} type="button" onClick={() => setTime(option)} className={time === option ? "h-12 rounded-[14px] border-2 border-[#123B73] bg-[#EAF2FF] text-sm font-semibold text-[#123B73] shadow-[0_4px_12px_rgba(18,59,115,.1)]" : "h-12 rounded-[14px] border border-[#D0DEF0] bg-white text-sm font-medium text-[#344054]"}>{option}</button>)}</div></fieldset>
              <div className="flex gap-3 rounded-[16px] bg-[#EEF4FF] p-4 text-[#344054]"><Info className="mt-0.5 size-5 shrink-0 text-[#123B73]" /><p className="text-[11px] leading-5"><strong className="block text-xs text-[#101828]">{tx("The owner will confirm before it is booked.", "အိမ်ရှင်အတည်ပြုပြီးမှ ချိန်းဆိုမည်။")}</strong>{tx("You’ll receive a notification once confirmed.", "အတည်ပြုပြီးပါက အသိပေးချက်ရရှိမည်။")}</p></div>
            </>
          )}
        </div>
      )}
    </Sheet>
  );
}

export { InquirySheet };
export type { InquiryMode };
