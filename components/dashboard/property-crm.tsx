"use client";

import Link from "next/link";
import { submitIdentification } from "@/lib/api/users";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  Building2,
  Check,
  ChevronRight,
  CircleAlert,
  MessageCircle,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { ListingEditorSheet, type ListingDraft } from "@/components/dashboard/listing-editor-sheet";
import { ListerPropertiesPanel } from "@/components/dashboard/lister-properties-panel";
import { MetricCard } from "@/components/dashboard/metric-card";
import { useLanguage } from "@/components/i18n/language-provider";
import { Badge } from "@/components/ui/badge";
import { AnimatedAssetIcon } from "@/components/ui/animated-asset-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet } from "@/components/ui/sheet";
import { readStoredJson, STORAGE_KEYS, writeStoredJson } from "@/lib/local-storage";
import { useConversations } from "@/hooks/use-conversations";
import { useListerPortfolio } from "@/hooks/use-lister-portfolio";
import { useInquiries } from "@/hooks/use-inquiries";
import { useViewings } from "@/hooks/use-viewings";
import { type Property } from "@/lib/properties";

type CRMRole = "owner" | "agent";
type CRMLead = {
  id: string;
  name: string;
  propertyId: string;
  intent: string;
  time: string;
  status: string;
  conversationId?: string;
  viewingId?: string;
  inquiryId?: string;
};

function PropertyCRM({ role, properties }: { role: CRMRole; properties: Property[] }) {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { tx } = useLanguage();
  const searchParams = useSearchParams();
  const requestedSection = searchParams.get("section") ?? "overview";
  const createRequested = role === "owner" && searchParams.get("create") === "1";
  const displayName = user?.fullName || tx("Property owner", "အိမ်ရှင်");
  const displayInitials = displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const { portfolio, ready: portfolioReady, failed: portfolioFailed, overview, refresh: refreshPortfolio, serverBacked, updateListing, createListing: createNewListing, publish, pause, archiveListing, confirmAvailability, markUnavailable } = useListerPortfolio(role, properties);
  const { failed: conversationsFailed, refresh: refreshConversations, conversations, loadThread, sendReply: submitReply, startFromViewing } = useConversations();
  const { failed: viewingsFailed, refresh: refreshViewings, appointments, changeStatus } = useViewings();

  const { inquiries, failed: inquiriesFailed, refresh: refreshInquiries, changeStatus: changeInquiryStatus } = useInquiries();

  const [editorOpen, setEditorOpen] = useState(createRequested);
  const [savingListing, setSavingListing] = useState(false);
  const [drafts, setDrafts] = useState<ListingDraft[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [leadInboxOpen, setLeadInboxOpen] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const actionIds = useRef(new Set<string>());
  const [pendingPropertyIds, setPendingPropertyIds] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [leadReply, setLeadReply] = useState("");
  const [leadStatus, setLeadStatus] = useState("");
  const [documentsReady, setDocumentsReady] = useState(false);
  const [verificationFiles, setVerificationFiles] = useState<File[]>([]);
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [leadSearch, setLeadSearch] = useState("");
  async function submitDocuments() {
    if (verificationBusy || !verificationFiles.length || !serverBacked) return;
    setVerificationBusy(true); setVerificationError("");
    try {
      for (const file of verificationFiles) await submitIdentification(file);
      setDocumentsReady(true); setVerificationFiles([]);
    } catch {
      setVerificationError(tx("Could not submit all documents. Check the file types and connection, then retry.", "စာရွက်စာတမ်းအားလုံး တင်မရပါ။ ဖိုင်အမျိုးအစားနှင့် ချိတ်ဆက်မှုကို စစ်ပြီး ပြန်ကြိုးစားပါ။"));
    } finally { await refreshUser(); setVerificationBusy(false); }
  }
  const [settingsDraft, setSettingsDraft] = useState({
      name: displayName,
      email: user?.email ?? "",
      phone: "",
      instantLeads: true,
      weeklyReports: true,
  });

  useEffect(() => {
    const key = role === "owner" ? STORAGE_KEYS.ownerSettings : STORAGE_KEYS.agentSettings;
    const stored = readStoredJson<Partial<typeof settingsDraft> | null>(key, null);
    if (!stored || typeof stored !== "object") return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setSettingsDraft((current) => ({
        ...current,
        name: typeof stored.name === "string" ? stored.name : current.name,
        email: typeof stored.email === "string" ? stored.email : current.email,
        phone: typeof stored.phone === "string" ? stored.phone : current.phone,
      }));
    });
    return () => { active = false; };
  }, [role]);

  useEffect(() => {
    if (requestedSection === "overview") {
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
    const target = requestedSection === "overview" ? "crm-overview" : `crm-${requestedSection}`;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [requestedSection]);

  // Leads are a view over the real conversations and viewing requests addressed
  // to this lister, so both modes build them the same way from the hooks.
  const leads = useMemo<CRMLead[]>(() => {
    const conversationLeads: CRMLead[] = conversations.map((conversation) => ({
      id: `conversation-${conversation.id}`,
      name: conversation.seekerName || tx("Seeker", "ရှာဖွေသူ"),
      propertyId: conversation.propertyId,
      intent: conversation.thread[0]?.text || conversation.preview || "Property inquiry",
      time: conversation.time,
      status: conversation.thread.at(-1)?.sender === "user" ? "Replied" : "New",
      conversationId: conversation.id,
    }));
    const viewingLeads: CRMLead[] = appointments.map((viewing) => ({
      id: `viewing-${viewing.id}`,
      name: viewing.seekerName || tx("Seeker", "ရှာဖွေသူ"),
      propertyId: viewing.propertyId,
      intent: `Viewing request · ${viewing.date}, ${viewing.time}`,
      time: serverBacked ? viewing.date : "Device local",
      status: viewing.status,
      viewingId: viewing.id,
    }));
    const inquiryLeads: CRMLead[] = inquiries.map((inquiry) => ({
      id: `inquiry-${inquiry.id}`, inquiryId: inquiry.id,
      name: `${inquiry.seeker.firstName} ${inquiry.seeker.lastName}`.trim(), propertyId: inquiry.propertyId,
      intent: `${inquiry.subject}: ${inquiry.message}`, time: new Date(inquiry.createdAt).toLocaleDateString(),
      status: inquiry.status === "NEW" ? "New" : inquiry.status,
      conversationId: conversations.find((conversation) => conversation.propertyId === inquiry.propertyId && conversation.seekerId === inquiry.seekerId)?.id,
    }));
    return [...inquiryLeads, ...viewingLeads, ...conversationLeads];
  }, [conversations, appointments, inquiries, serverBacked, tx]);

  useEffect(() => {
    if (serverBacked) return;
    function loadDrafts() {
      setDrafts(readStoredJson<ListingDraft[]>(STORAGE_KEYS.crmDrafts, []));
    }
    loadDrafts();
    window.addEventListener("a7:stored-json-change", loadDrafts);
    return () => window.removeEventListener("a7:stored-json-change", loadDrafts);
  }, [serverBacked]);

  function createListing() {
    setSelectedProperty(null);
    setEditorOpen(true);
  }

  function editListing(property: Property) {
    setSelectedProperty(property);
    setEditorOpen(true);
  }

  // The number inputs stay as strings in the form so an empty field never
  // becomes 0 silently; the save handler parses them where the API needs numbers.
  function numericOr(raw: string, min = 1) {
    const value = Number(raw);
    return Number.isFinite(value) && value >= min ? value : undefined;
  }

  async function saveListing(draft: ListingDraft): Promise<boolean> {
    if (!serverBacked) {
      const current = readStoredJson<ListingDraft[]>(STORAGE_KEYS.crmDrafts, []);
      const next = [draft, ...current.filter((item) => item.title !== draft.title)].slice(0, 20);
      writeStoredJson(STORAGE_KEYS.crmDrafts, next);
      setDrafts(next);
      setNotice(tx(`${draft.title || "Listing draft"} was saved on this device.`, `${draft.title || "အိမ်စာရင်းမူကြမ်း"} ကို ဤစက်တွင် သိမ်းပြီးပါပြီ။`));
      return true;
    }

    setSavingListing(true);
    const price = numericOr(draft.price);
    const areaSqft = numericOr(draft.areaSqft);
    const bedrooms = numericOr(draft.bedrooms, 0);
    const bathrooms = numericOr(draft.bathrooms, 0);

    if (selectedProperty) {
      const saved = await updateListing(selectedProperty.id, {
        title: draft.title.trim(),
        description: draft.description.trim(),
        address: draft.address.trim(),
        city: draft.city,
        township: draft.township,
        purpose: draft.purpose,
        propertyType: draft.propertyType,
        ...(price !== undefined ? { price } : {}),
        ...(areaSqft !== undefined ? { areaSqft } : {}),
        ...(bedrooms !== undefined ? { bedrooms } : {}),
        ...(bathrooms !== undefined ? { bathrooms } : {}),
        ...(numericOr(draft.floor, 0) !== undefined ? { floor: numericOr(draft.floor, 0) } : {}),
        ...(numericOr(draft.yearBuilt, 1800) !== undefined ? { yearBuilt: numericOr(draft.yearBuilt, 1800) } : {}),
        ...(draft.furniture ? { furniture: draft.furniture } : {}),
        amenities: draft.amenities,
        imageAssetIds: draft.imageAssetIds,
        documents: draft.documents,
      });
      setSavingListing(false);
      if (saved) setNotice(tx(`${draft.title || "This listing"} was updated.`, `${draft.title || "ဤအိမ်စာရင်း"} ကို အသစ်ပြောင်းပြီးပါပြီ။`));
      return saved;
    }

    // Required fields are enforced in the editor; this guard is a backstop so a
    // malformed call never reaches the server.
    if (price === undefined || areaSqft === undefined || bedrooms === undefined || bathrooms === undefined) {
      setSavingListing(false);
      setNotice(tx("Fill in the price, area, bedrooms and bathrooms before saving.", "မသိမ်းမီ ဈေးနှုန်း၊ အကျယ်အဝန်း၊ အိပ်ခန်းနှင့် ရေချိုးခန်း ထည့်ပါ။"));
      return false;
    }

    const created = await createNewListing({
      title: draft.title.trim(),
      description: draft.description.trim(),
      propertyType: draft.propertyType,
      purpose: draft.purpose,
      price,
      currency: draft.currency || "MMK",
      bedrooms,
      bathrooms,
      areaSqft,
      address: draft.address.trim(),
      city: draft.city,
      township: draft.township,
      ...(numericOr(draft.floor, 0) !== undefined ? { floor: numericOr(draft.floor, 0) } : {}),
      ...(numericOr(draft.yearBuilt, 1800) !== undefined ? { yearBuilt: numericOr(draft.yearBuilt, 1800) } : {}),
      ...(draft.furniture ? { furniture: draft.furniture } : {}),
      amenities: draft.amenities,
      imageAssetIds: draft.imageAssetIds,
      documents: draft.documents,
    });
    setSavingListing(false);
    if (created) setNotice(tx(`${created.title} was created as a draft.`, `${created.title} ကို မူကြမ်းအဖြစ် ဖန်တီးပြီးပါပြီ။`));
    return Boolean(created);
  }

  async function runPropertyAction(id: string, action: () => Promise<void>) {
    if (actionIds.current.has(id)) return;
    actionIds.current.add(id); setPendingPropertyIds([...actionIds.current]);
    try { await action(); }
    finally { actionIds.current.delete(id); setPendingPropertyIds([...actionIds.current]); }
  }

  async function togglePublish(property: Property) {
    await runPropertyAction(property.id, async () => {
      const action = property.listing_status === "PUBLISHED" ? pause : publish;
      const ok = await action(property.id);
      if (!ok) return;
      setNotice(property.listing_status === "PUBLISHED"
        ? tx(`${property.title} is paused.`, `${property.title} ကို ရပ်ထားပြီးပါပြီ။`)
        : tx(`${property.title} is now live.`, `${property.title} ကို ကြော်ငြာထုတ်ပြီးပါပြီ။`));
    });
  }

  async function archive(property: Property) {
    if (actionIds.current.has(property.id)) return;
    if (!window.confirm(tx("Archive this listing? It will be hidden and cannot be restored from this app.", "ဤအိမ်စာရင်းကို သိမ်းဆည်းမလား။ အများမြင်မရတော့ဘဲ ဤ app မှ ပြန်ဖွင့်မရပါ။"))) return;
    await runPropertyAction(property.id, async () => {
      const ok = await archiveListing(property.id);
      if (ok) setNotice(tx(`${property.title} is archived.`, `${property.title} ကို archive လုပ်ပြီးပါပြီ။`));
    });
  }

  async function confirmListingAvailability(property: Property) {
    await runPropertyAction(property.id, async () => {
      if (await confirmAvailability(property.id)) setNotice(tx(`${property.title} is confirmed available for another 30 days.`, `${property.title} ကို နောက်ထပ် ရက် ၃၀ ရရှိနိုင်ကြောင်း အတည်ပြုပြီးပါပြီ။`));
    });
  }

  async function markListingUnavailable(property: Property) {
    const nextStatus = property.purpose === "sale" ? "SOLD" : "RENTED";
    if (!window.confirm(tx(`Mark ${property.title} as ${nextStatus.toLowerCase()}?`, `${property.title} ကို ${nextStatus === "SOLD" ? "ရောင်းပြီး" : "ငှားပြီး"}ဟု သတ်မှတ်မလား။`))) return;
    await runPropertyAction(property.id, async () => {
      if (await markUnavailable(property.id, nextStatus)) setNotice(tx(`${property.title} was marked ${nextStatus.toLowerCase()}.`, `${property.title} အခြေအနေကို ပြောင်းပြီးပါပြီ။`));
    });
  }

  function handleEditorOpenChange(open: boolean) {
    setEditorOpen(open);
    if (!open && createRequested) router.replace("/owner", { scroll: false });
  }


  function openLead(lead: CRMLead) {
    if (lead.conversationId) loadThread(lead.conversationId);
    setSelectedLead(lead);
    setLeadReply("");
    setLeadStatus("");
  }

  async function sendLeadReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = leadReply.trim();
    if (!text || !selectedLead) return;

    // A reply needs a thread. A viewing-only lead has none yet, so open or
    // reuse one with the seeker that requested the viewing before sending.
    let conversationId = selectedLead.conversationId;
    if (!conversationId) {
      if (!serverBacked) {
        setLeadStatus(tx(
          "This lead has no message thread yet. It will appear here once the seeker sends a message.",
          "ဤ lead တွင် စာပြောဆိုမှု မရှိသေးပါ။ ရှာဖွေသူ စာပို့ပြီးပါက ဤနေရာတွင် ပေါ်လာပါမည်။",
        ));
        return;
      }
      if (!selectedLead.viewingId) return;
      const opened = await startFromViewing(selectedLead.viewingId);
      if (!opened) return;
      conversationId = opened;
      // Reflect the new conversation id on the lead so a second reply reuses it.
      setSelectedLead((current) => current ? { ...current, conversationId: opened } : current);
    }

    const sent = await submitReply(conversationId, text);
    if (!sent) return;
    setSelectedLead((current) => current ? { ...current, status: "Replied" } : current);
    setLeadStatus(tx(`Reply sent to ${selectedLead.name}.`, `${selectedLead.name} ထံ ပြန်စာပေးပို့ပြီးပါပြီ။`));
    setLeadReply("");
  }

  async function updateInquiry(status: "READ" | "CLOSED") {
    if (!selectedLead?.inquiryId) return;
    const applied = await changeInquiryStatus(selectedLead.inquiryId, status);
    if (!applied) { setLeadStatus(tx("Could not update inquiry", "မေးမြန်းမှုကို ပြင်မရပါ")); return; }
    setSelectedLead((current) => current ? { ...current, status } : current);
    setLeadStatus(status === "READ" ? tx("Inquiry marked read", "မေးမြန်းမှုကို ဖတ်ပြီးအဖြစ် မှတ်သားပြီး") : tx("Inquiry closed", "မေးမြန်းမှု ပိတ်ပြီး"));
  }

  function updateViewingStatus(status: "Confirmed" | "Declined") {
    if (!selectedLead?.viewingId) return;
    void changeStatus(selectedLead.viewingId, status === "Confirmed" ? "CONFIRMED" : "DECLINED").then((applied) => {
      if (!applied) return;
      setSelectedLead((current) => current ? { ...current, status } : current);
      setLeadStatus(tx(
        `Viewing request ${status.toLowerCase()}.`,
        `အိမ်ကြည့်ခွင့်ကို ${status === "Confirmed" ? "အတည်ပြု" : "ငြင်းပယ်"}ပြီးပါပြီ။`,
      ));
    });
  }

  function saveWorkspaceSettings() {
    writeStoredJson(role === "owner" ? STORAGE_KEYS.ownerSettings : STORAGE_KEYS.agentSettings, settingsDraft);
    setNotice(tx("Workspace preferences saved on this browser.", "လုပ်ငန်းခွင်ရွေးချယ်မှုများကို ဤ browser တွင် သိမ်းပြီးပါပြီ။"));
  }

  const selectedLeadProperty = selectedLead ? portfolio.concat(properties).find((property) => property.id === selectedLead.propertyId) : null;
  const statusLabel = (status: string) => ({
    "Awaiting owner": tx("Awaiting owner", "အိမ်ရှင်စောင့်ဆိုင်းဆဲ"),
    Confirmed: tx("Confirmed", "အတည်ပြုပြီး"),
    Declined: tx("Declined", "ငြင်းပယ်ပြီး"),
    Expired: tx("Expired", "သက်တမ်းကုန်ပြီ"),
    Completed: tx("Completed", "ပြီးဆုံးပြီ"),
    New: tx("New", "အသစ်"),
    READ: tx("Read", "ဖတ်ပြီး"),
    REPLIED: tx("Replied", "ပြန်ကြားပြီး"),
    CLOSED: tx("Closed", "ပိတ်ပြီး"),
    Replied: tx("Replied", "ပြန်ကြားပြီး"),
    Active: tx("Active", "အသုံးပြုနေသည်"),
  } as Record<string, string>)[status] ?? status;
  const leadIntentLabel = (intent: string) => intent.replace(/^Viewing request/, tx("Viewing request", "အိမ်ကြည့်ခွင့်တောင်းဆိုမှု"));
  const leadTimeLabel = (time: string) => time === "Device local" ? tx("Device local", "ဤစက်တွင်") : time === "Just now" ? tx("Just now", "ယခုလေးတင်") : time;

  return (
    <DashboardShell
      role={role}
      name={displayName}
      initials={displayInitials}
      title={role === "owner" ? tx("Property performance", "အိမ်ခြံမြေစွမ်းဆောင်ရည်") : tx("Agency workspace", "အကျိုးဆောင်လုပ်ငန်းခွင်")}
      description={serverBacked
        ? tx("Manage your listings, inquiries, and viewing requests from one place.", "သင့်အိမ်စာရင်းများ၊ မေးမြန်းမှုများနှင့် အိမ်ကြည့်ခွင့်တောင်းဆိုမှုများကို တစ်နေရာတည်းမှ စီမံပါ။")
        : role === "owner" ? tx("Manage device-local listing drafts, inquiries, and viewing requests from one place.", "ဤစက်တွင် သိမ်းထားသောမူကြမ်းများ၊ မေးမြန်းမှုများနှင့် အိမ်ကြည့်ခွင့်များကို တစ်နေရာတည်းမှ စီမံပါ။") : tx("Coordinate demo inventory and local leads across your frontend workspace.", "နမူနာအိမ်စာရင်းနှင့် ဤစက်ရှိစိတ်ဝင်စားသူများကို frontend လုပ်ငန်းခွင်မှ စီမံပါ။")}
      primaryAction={{ label: tx("Create listing", "အိမ်စာရင်းဖန်တီးရန်"), onClick: createListing }}
      onNotifications={() => setNotificationsOpen(true)}
    >
      <div id="crm-overview" className="scroll-mt-24">
        <div className="premium-surface mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[20px] p-3.5 sm:p-4">
          <div className="flex items-center gap-3">
            <AnimatedAssetIcon src="/icons/a7-listing-workspace-3d.png" width={56} height={56} hover="float" className="size-14" />
            <span>
              <strong className="flex items-center gap-1.5 text-[13px] text-[#101828]">{displayName}{user?.idVerified && user.phoneVerified && <ShieldCheck className="size-4 text-[#287A4B]" />}</strong>
              <small className="mt-1 block text-[10px] text-[#667085]">{role === "owner" ? tx("Property owner", "အိမ်ရှင်") : user?.idVerified && user.phoneVerified ? tx("Verified agent", "စိစစ်ပြီးအကျိုးဆောင်") : tx("Property lister", "အိမ်စာရင်းတင်သူ")} · {serverBacked ? tx("A7 Property workspace", "A7 Property လုပ်ငန်းခွင်") : tx("frontend demo workspace", "frontend နမူနာလုပ်ငန်းခွင်")}</small>
            </span>
          </div>
          <Link href={role === "owner" ? "/agent" : "/owner"} className="flex min-h-11 items-center gap-1 text-[11px] font-semibold text-[#123B73]">{role === "owner" ? tx("Switch to agent view", "အကျိုးဆောင်မြင်ကွင်းသို့ ပြောင်းရန်") : tx("Switch to owner view", "အိမ်ရှင်မြင်ကွင်းသို့ ပြောင်းရန်")} <ChevronRight className="size-3.5" /></Link>
        </div>
        {(portfolioFailed || conversationsFailed || viewingsFailed || inquiriesFailed) && <div role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{tx("Some data could not be loaded. Empty sections may be unavailable, not empty.", "အချက်အလက်အချို့ ဖွင့်မရပါ။ လွတ်နေသောအပိုင်းများမှာ အချက်အလက်မရှိခြင်း မဟုတ်နိုင်ပါ။")}<Button variant="outline" onClick={() => { refreshPortfolio(); refreshConversations(); refreshViewings(); refreshInquiries(); }}>{tx("Retry", "ပြန်ကြိုးစားရန်")}</Button></div>}{!portfolioReady && <Skeleton className="mb-4 h-24" />}{notice && <div className="mb-5 flex items-center gap-2 rounded-xl border border-[#2D7D46]/20 bg-[#EAF4FF] px-4 py-3 text-xs text-[#123B73]" role="status"><Check className="size-4" />{notice}</div>}
      </div>

      <section id="crm-analytics" className="scroll-mt-24">
        <div className="grid min-w-0 grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          <MetricCard
            label={serverBacked ? tx("Your properties", "သင့်အိမ်များ") : tx("Local properties", "ဤစက်ရှိအိမ်များ")}
            value={portfolioFailed ? "—" : new Intl.NumberFormat("en-US").format(overview ? Object.entries(overview.properties).filter(([status]) => status !== "ARCHIVED").reduce((total, [, count]) => total + count, 0) : portfolio.length)}
            change={serverBacked
              ? tx(`${portfolio.filter((item) => item.verification_status === "verified").length} verified`, `${portfolio.filter((item) => item.verification_status === "verified").length} ခု စိစစ်ပြီး`)
              : tx(`${drafts.length} local draft${drafts.length === 1 ? "" : "s"}`, `ဤစက်ရှိမူကြမ်း ${drafts.length} ခု`)}
            icon={Building2}
          />
          <MetricCard label={serverBacked ? tx("Leads", "စိတ်ဝင်စားသူများ") : tx("Local leads", "ဤစက်ရှိစိတ်ဝင်စားသူများ")} value={new Intl.NumberFormat("en-US").format(leads.length)} change={tx("Inquiries and viewing requests", "မေးမြန်းမှုနှင့် အိမ်ကြည့်တောင်းဆိုမှုများ")} icon={MessageCircle} tone="copper" />
        </div>

        <div className="mt-5 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
          <Card id="crm-verification" className="scroll-mt-24 overflow-hidden">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-start justify-between"><div><h2 className="text-lg font-semibold tracking-[-0.03em]">{tx("Verification health", "စိစစ်မှုအခြေအနေ")}</h2><p className="mt-1 text-[11px] text-[#667085]">{tx("Keep every listing trusted", "အိမ်စာရင်းတိုင်းကို ယုံကြည်စိတ်ချရစေပါ")}</p></div><span className="grid size-10 place-items-center rounded-xl bg-[#DCEBFF] text-[#287A4B]"><ShieldCheck className="size-5" /></span></div>
              <div className="mt-5 space-y-2.5">
                {[user?.idVerified ? tx("Identity marked verified", "ကိုယ်ရေးအချက်အလက် စိစစ်ပြီး") : tx("Identity not verified", "ကိုယ်ရေးအချက်အလက် မစိစစ်ရသေး"), user?.phoneVerified ? tx("Phone marked verified", "ဖုန်းစိစစ်ပြီး") : tx("Phone not verified", "ဖုန်းမစိစစ်ရသေး"), (serverBacked
                  ? tx(`${portfolio.filter((item) => item.verification_status === "verified").length} listings verified`, `အိမ်စာရင်း ${portfolio.filter((item) => item.verification_status === "verified").length} ခု စိစစ်ပြီး`)
                  : tx(`${portfolio.filter((item) => item.verification_status === "verified").length} demo listings verified`, `နမူနာအိမ်စာရင်း ${portfolio.filter((item) => item.verification_status === "verified").length} ခု စိစစ်ပြီး`)), tx(`${portfolio.filter((item) => item.verification_status !== "verified").length} listings need review`, `အိမ်စာရင်း ${portfolio.filter((item) => item.verification_status !== "verified").length} ခု ပြန်စစ်ရန်လိုသည်`)].map((item, index) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl border border-[#101828]/5 bg-[#F8FBFF] p-3 text-[11px] font-medium"><span className={`grid size-6 place-items-center rounded-full ${(index === 0 && !user?.idVerified) || (index === 1 && !user?.phoneVerified) || index === 3 ? "bg-[#FFF7E8] text-[#9A6500]" : "bg-[#DCEBFF] text-[#287A4B]"}`}>{(index === 0 && !user?.idVerified) || (index === 1 && !user?.phoneVerified) || index === 3 ? "!" : <Check className="size-3.5" />}</span>{item}</div>
                ))}
              </div>
              <Button variant="outline" className="mt-5 w-full text-xs" onClick={() => setVerificationOpen(true)}>{tx("Review verification", "စိစစ်မှု ပြန်ကြည့်ရန်")}</Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,.6fr)]">
        <ListerPropertiesPanel properties={portfolio} ready={portfolioReady} failed={portfolioFailed} serverBacked={serverBacked} pendingIds={pendingPropertyIds} onCreate={createListing} onEdit={editListing} onTogglePublish={togglePublish} onArchive={archive} onConfirmAvailability={confirmListingAvailability} onMarkUnavailable={markListingUnavailable} onRetry={refreshPortfolio}>
          {drafts.length > 0 && <div className="min-w-0 border-b border-[#D0DEF0] bg-[#FFF9ED] p-4 sm:p-5"><p className="text-[9px] font-semibold uppercase tracking-wider text-[#8A5A17]">{tx("Saved on this device", "ဤစက်တွင် သိမ်းထားသည်")}</p><div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">{drafts.map((draft) => <div key={`${draft.title}-${draft.township}`} className="min-w-0 rounded-xl border border-[#E8D9B8] bg-white p-3"><strong className="block truncate text-[11px]">{draft.title}</strong><span className="mt-1 block truncate text-[9px] text-[#776849]">{draft.township} · {Number(draft.price).toLocaleString()} MMK · {tx("Draft", "မူကြမ်း")}</span></div>)}</div></div>}
        </ListerPropertiesPanel>

        <section id="crm-messages" className="min-w-0 scroll-mt-24 rounded-[22px] border border-[#101828]/8 bg-[#F8FBFF] p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between"><div className="min-w-0"><h2 className="text-lg font-semibold tracking-[-0.03em]">{tx("Recent leads", "လတ်တလောစိတ်ဝင်စားသူများ")}</h2><p className="mt-1 text-[10px] text-[#667085]">{tx("Prioritized by intent", "စိတ်ဝင်စားမှုအလိုက် ဦးစားပေးထားသည်")}</p></div><BarChart3 className="size-5 shrink-0 text-[#123B73]" /></div>
          <div className="mt-4 divide-y divide-[#D0DEF0]">
            {leads.length === 0 && <p className="py-8 text-center text-sm text-a7-muted">{conversationsFailed || viewingsFailed || inquiriesFailed ? tx("Lead activity is unavailable. Try again above.", "လှုပ်ရှားမှုများ ဖွင့်မရပါ။ အထက်တွင် ပြန်ကြိုးစားပါ။") : tx("New inquiries and viewing requests will appear here.", "မေးမြန်းမှုနှင့် အိမ်ကြည့်တောင်းဆိုမှုအသစ်များကို ဤနေရာတွင် တွေ့နိုင်ပါမည်။")}</p>}
            {leads.slice(0, 5).map((lead) => (
              <button key={lead.id} type="button" onClick={() => openLead(lead)} className="flex w-full items-center gap-3 py-4 text-left">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#DCEBFF] text-[10px] font-semibold text-[#667085]">{lead.name.split(" ").map((part) => part[0]).join("")}</span>
                <span className="min-w-0 flex-1"><strong className="block truncate text-[11px]">{lead.name}</strong><small className="mt-1 block truncate text-[9px] text-[#667085]">{leadIntentLabel(lead.intent)} · {leadTimeLabel(lead.time)}</small></span>
                <Badge variant={lead.status === "New" ? "brand" : "neutral"}>{statusLabel(lead.status)}</Badge>
              </button>
            ))}
          </div>
          <Button variant="outline" className="mt-3 w-full text-xs" onClick={() => setLeadInboxOpen(true)}>{tx("Open lead inbox", "စိတ်ဝင်စားသူစာပုံးဖွင့်ရန်")}</Button>
        </section>
      </div>

      <section id="crm-settings" className="mt-5 min-w-0 scroll-mt-24 rounded-[22px] border border-[#101828]/8 bg-[#F8FBFF] p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between"><div className="min-w-0"><h2 className="text-lg font-semibold tracking-[-0.03em]">{tx("Workspace settings", "လုပ်ငန်းခွင်ဆက်တင်များ")}</h2><p className="mt-1 text-[10px] text-[#667085]">{tx("Browser-local preferences. Edit your account contact details in Profile.", "ဤ browser တွင်သာ သိမ်းမည့်ရွေးချယ်မှုများ ဖြစ်ပါသည်။ အကောင့်ဆက်သွယ်ရန်အချက်အလက်ကို Profile တွင် ပြင်ပါ။")}</p></div><Settings className="size-5 shrink-0 text-[#123B73]" /></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <label><span className="text-[10px] font-semibold text-[#667085]">{tx("Display name", "ပြသမည့်အမည်")}</span><input value={settingsDraft.name} onChange={(event) => setSettingsDraft({ ...settingsDraft, name: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-[#D0DEF0] px-3 text-xs outline-none focus:border-[#123B73]" /></label>
          <label><span className="text-[10px] font-semibold text-[#667085]">{tx("Email", "အီးမေးလ်")}</span><input type="email" value={settingsDraft.email} onChange={(event) => setSettingsDraft({ ...settingsDraft, email: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-[#D0DEF0] px-3 text-xs outline-none focus:border-[#123B73]" /></label>
          <label><span className="text-[10px] font-semibold text-[#667085]">{tx("Phone", "ဖုန်း")}</span><input value={settingsDraft.phone} onChange={(event) => setSettingsDraft({ ...settingsDraft, phone: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-[#D0DEF0] px-3 text-xs outline-none focus:border-[#123B73]" /></label>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-5 border-t border-[#D0DEF0] pt-5">
          <p className="text-[11px] text-[#667085]">{tx("Notification delivery and weekly reports cannot be configured here.", "အသိပေးချက်ပို့ခြင်းနှင့် အပတ်စဉ်အစီရင်ခံစာများကို ဤနေရာတွင် သတ်မှတ်၍မရသေးပါ။")} <Link href="/profile" className="font-semibold text-[#123B73] underline">{tx("Open Profile", "Profile ဖွင့်ရန်")}</Link></p>
          <Button className="ml-auto rounded-full px-5" onClick={saveWorkspaceSettings}>{tx("Save settings", "ဆက်တင်များသိမ်းရန်")}</Button>
        </div>
      </section>

      <ListingEditorSheet open={editorOpen} onOpenChange={handleEditorOpenChange} property={selectedProperty} onSave={saveListing} busy={savingListing} initialPurpose={searchParams.get("purpose") === "sale" ? "sale" : "rent"} />

      <Sheet open={Boolean(selectedLead)} onOpenChange={(open) => { if (!open) setSelectedLead(null); }} title={selectedLead ? `${selectedLead.name} · ${leadIntentLabel(selectedLead.intent)}` : tx("Lead details", "စိတ်ဝင်စားသူအသေးစိတ်")} description={selectedLeadProperty?.title} side="right" footer={selectedLead && (!selectedLead.inquiryId || selectedLead.conversationId) && (
        <form onSubmit={sendLeadReply} className="flex items-center gap-2"><input value={leadReply} onChange={(event) => setLeadReply(event.target.value)} placeholder={tx("Write a reply…", "ပြန်စာရေးပါ…")} aria-label={tx("Reply to lead", "စိတ်ဝင်စားသူကို ပြန်စာရေးရန်")} className="h-11 min-w-0 flex-1 rounded-full border border-[#D0DEF0] px-4 text-xs outline-none focus:border-[#123B73]" /><Button type="submit" size="icon" className="size-11 rounded-full" disabled={!leadReply.trim()} aria-label={tx("Send lead reply", "ပြန်စာပို့ရန်")}><Send className="size-4" /></Button></form>
      )}>
        {selectedLead && (
          <div className="space-y-5 p-5 sm:p-7">
            {leadStatus && <div role="status" className="rounded-2xl bg-[#DCEBFF] p-4 text-xs text-[#27714D]">{leadStatus}</div>}
            <div className="flex items-center gap-4 rounded-2xl bg-[#F8FBFF] p-4"><span className="grid size-12 place-items-center rounded-full bg-[#F8FBFF] text-xs font-semibold text-[#123B73]">{selectedLead.name.split(" ").map((part) => part[0]).join("")}</span><span><strong className="block text-sm">{selectedLead.name}</strong><small className="mt-1 block text-[10px] text-[#667085]">{leadTimeLabel(selectedLead.time)} · {statusLabel(selectedLead.status)}</small></span></div>
            <div className="rounded-2xl border border-[#D0DEF0] p-4"><span className="text-[9px] font-semibold uppercase tracking-wider text-[#667085]">{tx("Customer intent", "ဝယ်ယူသူစိတ်ဝင်စားမှု")}</span><p className="mt-2 text-xs font-semibold">{leadIntentLabel(selectedLead.intent)}</p><p className="mt-2 text-[11px] leading-5 text-[#667085]">{tx("This home seeker is ready for a clear, timely answer. Reply through A7 to keep their contact details private.", "ဤအိမ်ရှာဖွေသူအား တိကျပြီး အချိန်မီဖြေကြားပါ။ ဆက်သွယ်ရန်အချက်အလက်ကို လုံခြုံစေရန် A7 မှတစ်ဆင့် ပြန်ကြားပါ။")}</p></div>
            {selectedLead.inquiryId && <div className="space-y-3"><p className="text-sm">{tx("Inquiry status changes do not send a message. A reply requires an existing conversation.", "မေးမြန်းမှုအခြေအနေပြောင်းခြင်းသည် စာပို့ခြင်းမဟုတ်ပါ။ စာပြန်ရန် ရှိပြီးသားစာပြောဆိုမှု လိုအပ်သည်။")}</p><div className="flex gap-2">{selectedLead.status === "New" && <Button variant="outline" onClick={() => void updateInquiry("READ")}>{tx("Mark read", "ဖတ်ပြီးမှတ်သားရန်")}</Button>}{selectedLead.status !== "CLOSED" && <Button variant="outline" onClick={() => void updateInquiry("CLOSED")}>{tx("Close inquiry", "မေးမြန်းမှု ပိတ်ရန်")}</Button>}</div></div>}
            {selectedLead.viewingId && selectedLead.status === "Awaiting owner" && <div className="grid grid-cols-2 gap-2"><Button type="button" onClick={() => updateViewingStatus("Confirmed")}>{tx("Confirm viewing", "အိမ်ကြည့်ခွင့်အတည်ပြုရန်")}</Button><Button type="button" variant="outline" onClick={() => updateViewingStatus("Declined")}>{tx("Decline", "ငြင်းပယ်ရန်")}</Button></div>}
            {selectedLeadProperty && <Link href={`/properties/${selectedLeadProperty.id}`} className="flex min-h-11 items-center justify-between rounded-2xl border border-[#4DA3FF] bg-[#DCEBFF] p-4 text-xs font-semibold text-[#123B73]">{tx("View property", "အိမ်ကြည့်ရန်")} <ChevronRight className="size-4" /></Link>}
          </div>
        )}
      </Sheet>

      <Sheet open={leadInboxOpen} onOpenChange={setLeadInboxOpen} title={tx("Lead inbox", "စိတ်ဝင်စားသူစာပုံး")} description={tx("Every active property conversation, prioritized by intent.", "လက်ရှိအိမ်မေးမြန်းမှုတိုင်းကို စိတ်ဝင်စားမှုအလိုက် ဦးစားပေးထားသည်။")} side="right">
        <div className="p-5 sm:p-7">
          <label className="flex h-11 items-center gap-2 rounded-xl border border-[#D0DEF0] bg-[#F8FBFF] px-3"><Search className="size-4 text-[#7A8793]" /><input value={leadSearch} onChange={(event) => setLeadSearch(event.target.value)} placeholder={tx("Search leads", "စိတ်ဝင်စားသူရှာရန်")} aria-label={tx("Search leads", "စိတ်ဝင်စားသူရှာရန်")} className="min-w-0 flex-1 bg-transparent text-xs outline-none" /></label>
          <div className="mt-5 divide-y divide-[#D0DEF0]">
            {leads.filter((lead) => `${lead.name} ${lead.intent}`.toLowerCase().includes(leadSearch.toLowerCase())).map((lead) => <button key={lead.id} type="button" onClick={() => { setLeadInboxOpen(false); openLead(lead); }} className="flex min-h-11 w-full items-center gap-3 py-4 text-left"><span className="grid size-10 place-items-center rounded-full bg-[#DCEBFF] text-[10px] font-semibold">{lead.name.split(" ").map((part) => part[0]).join("")}</span><span className="min-w-0 flex-1"><strong className="block text-xs">{lead.name}</strong><small className="mt-1 block truncate text-[10px] text-[#667085]">{leadIntentLabel(lead.intent)} · {leadTimeLabel(lead.time)}</small></span><ChevronRight className="size-4 text-[#9AA4AE]" /></button>)}
          </div>
        </div>
      </Sheet>

      <Sheet open={verificationOpen} onOpenChange={setVerificationOpen} title={tx("Verification center", "စိစစ်မှုဗဟို")} description={tx("Resolve listing issues and keep your inventory trusted.", "အိမ်စာရင်းပြဿနာများကို ဖြေရှင်းပြီး ယုံကြည်စိတ်ချရစေပါ။")} side="right" footer={!documentsReady && <Button className="w-full" disabled={verificationBusy || !verificationFiles.length || !serverBacked} onClick={() => void submitDocuments()}><Upload className="size-4" />{tx("Submit documents", "စာရွက်စာတမ်းတင်ရန်")}</Button>}>
        {documentsReady ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center"><AnimatedAssetIcon src="/icons/a7-verification-saved-3d.png" width={96} height={96} hover="float" className="size-24" imageClassName="drop-shadow-[0_10px_16px_rgba(18,59,115,.18)]" /><h3 className="mt-5 text-lg font-semibold">{tx("Documents submitted for review", "စာရွက်စာတမ်းများ စိစစ်ရန်တင်ပြီး")}</h3><p className="mt-2 max-w-xs text-xs leading-5 text-[#667380]">{tx("The server received your identity documents. Verification is pending until an administrator reviews them.", "သင့်ကိုယ်ရေးစာရွက်စာတမ်းများကို ဆာဗာမှ လက်ခံရရှိပါပြီ။ Admin စိစစ်ပြီးမှသာ အတည်ပြုမည်။")}</p><Button variant="outline" className="mt-6 rounded-full" onClick={() => setVerificationOpen(false)}>{tx("Done", "ပြီးပြီ")}</Button></div>
        ) : (
          <div className="space-y-4 p-5 sm:p-7">
            {verificationError && <p role="alert" className="text-sm text-red-700">{verificationError}</p>}
            <p className="text-sm">{tx("Identity documents are reviewed separately from each listing's ownership evidence. Upload property documents in the listing editor.", "ကိုယ်ရေးစာရွက်စာတမ်းနှင့် အိမ်ပိုင်ဆိုင်မှုစာရွက်စာတမ်းများကို သီးခြားစိစစ်သည်။ အိမ်ပိုင်ဆိုင်မှုစာရွက်စာတမ်းကို အိမ်စာရင်းပြင်ဆင်ရန်မှ တင်ပါ။")}</p>
            {portfolio.filter((property) => property.verification_status === "rejected").map((property) => <div key={property.id} className="rounded-2xl border border-[#E5D9C3] bg-[#FFFBF2] p-4"><div className="flex items-start gap-3"><CircleAlert className="mt-0.5 size-5 shrink-0 text-[#A16B13]" /><span><strong className="block text-xs">{property.title}</strong><small className="mt-1 block text-[10px] leading-4 text-[#776849]">{tx("Ownership or address evidence needs an update.", "ပိုင်ဆိုင်မှု သို့မဟုတ် လိပ်စာအထောက်အထားကို အပ်ဒိတ်လုပ်ရန်လိုသည်။")}</small></span></div></div>)}
            <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#4DA3FF] bg-[#DCEBFF] p-5 text-center"><input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={verificationBusy || !serverBacked} className="sr-only" onChange={(event) => { setVerificationFiles(Array.from(event.target.files ?? []).slice(0, 5)); setVerificationError(""); }} /><AnimatedAssetIcon src="/icons/a7-verification-documents-3d.png" width={72} height={72} hover="float" className="size-[72px]" imageClassName="drop-shadow-[0_9px_14px_rgba(18,59,115,.16)]" /><strong className="mt-3 text-xs">{tx("Choose verification documents", "စိစစ်ရန်စာရွက်စာတမ်းရွေးပါ")}</strong><small className="mt-1 text-[9px] text-[#73808C]">{verificationFiles.length ? `${verificationFiles.length} files selected` : "JPG, PNG or WebP · Max 5"}</small></label>
          </div>
        )}
      </Sheet>

      <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen} title={tx("Notifications", "အသိပေးချက်များ")} description={tx("Important updates across your workspace.", "လုပ်ငန်းခွင်ရှိ အရေးကြီးအပ်ဒိတ်များ။")} side="right">
        <div className="divide-y divide-[#D0DEF0] p-5 sm:p-7">
          {leads.length === 0 && <p className="px-4 py-6 text-center text-xs text-[#73808C]">{tx("No notifications yet. Leads and viewing requests will appear here.", "အသိပေးချက် မရှိသေးပါ။ စိတ်ဝင်စားသူများနှင့် အိမ်ကြည့်ခွင့်များ ဤနေရာတွင် ပေါ်လာမည်။")}</p>}
          {leads.slice(0, 5).map((lead) => <button key={lead.id} type="button" onClick={() => { setNotificationsOpen(false); openLead(lead); }} className="flex min-h-11 w-full items-start gap-3 py-4 text-left"><span className="mt-1 size-2 shrink-0 rounded-full bg-[#123B73]" /><span className="min-w-0 flex-1"><strong className="block text-xs">{lead.name}</strong><small className="mt-1.5 block text-[10px] leading-4 text-[#73808C]">{leadIntentLabel(lead.intent)}</small></span><small className="shrink-0 text-[9px] text-[#8E98A2]">{leadTimeLabel(lead.time)}</small></button>)}
        </div>
      </Sheet>
    </DashboardShell>
  );
}

export { PropertyCRM };
