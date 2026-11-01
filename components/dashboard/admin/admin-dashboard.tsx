"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileCheck2,
  Flag,
  Lock,
  Search,
  ShieldCheck,
  Trash2,
  Unlock,
  UserRound,
  X,
} from "lucide-react";

import { PrivateDocumentButton } from "@/components/ui/private-document-button";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast-provider";
import { ApiError, type PageMeta } from "@/lib/api/client";
import { fromApiProperty } from "@/lib/api/property-adapter";
import { formatPropertyPrice } from "@/lib/properties";
import * as adminApi from "@/lib/api/admin";
import type {
  AdminOverview,
  AdminProperty,
  AdminPropertyReport,
  AdminUser,
  AdminVerificationDocument,
  AuditLogEntry,
} from "@/lib/api/admin";

const emptyMeta: PageMeta = { page: 1, limit: 20, total: 0, totalPages: 0 };
const fieldClass = "min-h-11 rounded-xl border border-[#D5DEE9] bg-white px-3 text-sm text-[#101828] outline-none transition focus:border-[#4DA3FF] focus:ring-4 focus:ring-[#4DA3FF]/15";
const auditActions = ["USER_REGISTERED", "USER_LOGIN", "USER_LOGIN_FAILED", "USER_LOCKED", "USER_PASSWORD_CHANGED", "USER_PASSWORD_RESET", "USER_EMAIL_VERIFIED", "USER_SESSIONS_REVOKED", "USER_DEACTIVATED", "USER_STATUS_CHANGED", "USER_ROLE_CHANGED", "PROPERTY_CREATED", "PROPERTY_UPDATED", "PROPERTY_STATUS_CHANGED", "PROPERTY_VERIFICATION_CHANGED", "USER_EMAIL_CHANGE_REQUESTED", "USER_EMAIL_CHANGED", "PROPERTY_AVAILABILITY_CONFIRMED", "PROPERTY_EXPIRED", "PROPERTY_REPORT_CREATED", "PROPERTY_REPORT_REVIEWED"] as const;

type PendingAction =
  | { kind: "property"; item: AdminProperty; status: "VERIFIED" | "REJECTED" }
  | { kind: "document"; item: AdminVerificationDocument; status: "VERIFIED" | "REJECTED" }
  | { kind: "report"; item: AdminPropertyReport; status: "RESOLVED" | "DISMISSED" }
  | { kind: "user-status"; item: AdminUser; isActive: boolean }
  | { kind: "delete-user"; item: AdminUser }
  | { kind: "verify-email"; item: AdminUser }
  | { kind: "unlock-user"; item: AdminUser };

function actionNeedsReason(action: PendingAction | null) {
  return Boolean(action && (
    (action.kind === "property" && action.status === "REJECTED") ||
    (action.kind === "document" && action.status === "REJECTED") ||
    action.kind === "report" ||
    (action.kind === "user-status" && !action.isActive)
  ));
}

function displayError(error: unknown) {
  return error instanceof ApiError ? error.message : error instanceof Error ? error.message : "Unexpected error";
}

function SearchForm({ value, onChange, onSubmit, placeholder, label }: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  label: string;
}) {
  const submit = (event: FormEvent) => { event.preventDefault(); onSubmit(); };
  return (
    <form onSubmit={submit} className="flex min-w-0 flex-1 gap-2">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">{label}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#667085]" />
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${fieldClass} w-full pl-10`} />
      </label>
      <Button type="submit" variant="outline" className="shrink-0">{label}</Button>
    </form>
  );
}

function Pagination({ meta, onPage, previousLabel, nextLabel }: { meta: PageMeta; onPage: (page: number) => void; previousLabel: string; nextLabel: string }) {
  if (meta.totalPages <= 1) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E1E6ED] bg-white px-4 py-3">
      <p className="text-xs text-[#667085]">Page {meta.page} of {meta.totalPages} · {meta.total} results</p>
      <div className="flex gap-2">
        <Button size="icon" variant="outline" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)} aria-label={previousLabel}><ChevronLeft className="size-4" /></Button>
        <Button size="icon" variant="outline" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)} aria-label={nextLabel}><ChevronRight className="size-4" /></Button>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const { user } = useAuth();
  const { tx } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const section = searchParams.get("section") ?? "overview";

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [properties, setProperties] = useState<AdminProperty[]>([]);
  const [documents, setDocuments] = useState<AdminVerificationDocument[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [reports, setReports] = useState<AdminPropertyReport[]>([]);
  const [meta, setMeta] = useState<PageMeta>(emptyMeta);
  const [documentMeta, setDocumentMeta] = useState<PageMeta>(emptyMeta);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [pages, setPages] = useState<Record<string, number>>({});
  const [searchInputs, setSearchInputs] = useState<Record<string, string>>({});
  const [searches, setSearches] = useState<Record<string, string>>({});
  const [roleFilter, setRoleFilter] = useState<"ALL" | "SEEKER" | "LISTER">("ALL");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "ACTIVE" | "SUSPENDED">("ALL");
  const [verificationFilter, setVerificationFilter] = useState<"ALL" | "PENDING" | "VERIFIED" | "REJECTED" | "UNVERIFIED">("PENDING");
  const [listingFilter, setListingFilter] = useState<"ALL" | "DRAFT" | "PUBLISHED" | "PAUSED" | "SOLD" | "RENTED" | "ARCHIVED">("ALL");
  const [reportFilter, setReportFilter] = useState<"ALL" | "PENDING" | "RESOLVED" | "DISMISSED">("PENDING");
  const [auditAction, setAuditAction] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<AdminProperty | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  const page = pages[section] ?? 1;
  const searchInput = searchInputs[section] ?? "";
  const search = searches[section] ?? "";
  const setPage = (nextPage: number) => setPages((current) => ({ ...current, [section]: nextPage }));
  const setSearchInput = (value: string) => setSearchInputs((current) => ({ ...current, [section]: value }));
  const setSearch = (value: string) => setSearches((current) => ({ ...current, [section]: value }));

  useEffect(() => {
    let live = true;
    async function loadData() {
      setLoading(true);
      setError("");
      try {
        if (section === "overview") {
          const [summary, recent] = await Promise.all([adminApi.getOverview(), adminApi.getAuditLogs({ limit: 6 })]);
          if (live) { setOverview(summary); setLogs(recent.data); }
        } else if (section === "properties") {
          const [propertyPage, documentPage] = await Promise.all([
            adminApi.getProperties({
              verificationStatus: verificationFilter === "ALL" ? undefined : verificationFilter,
              status: listingFilter === "ALL" ? undefined : listingFilter,
              search,
              page,
              limit: 12,
            }),
            adminApi.getVerificationDocuments({
              status: verificationFilter === "ALL" ? undefined : verificationFilter,
              page,
              limit: 12,
            }),
          ]);
          if (live) {
            setProperties(propertyPage.data);
            setDocuments(documentPage.data);
            setMeta(propertyPage.meta);
            setDocumentMeta(documentPage.meta);
          }
        } else if (section === "users") {
          const result = await adminApi.getUsers({
            role: roleFilter === "ALL" ? undefined : roleFilter,
            isActive: activeFilter === "ALL" ? undefined : activeFilter === "ACTIVE",
            search,
            page,
            limit: 20,
          });
          if (live) { setUsers(result.data); setMeta(result.meta); }
        } else if (section === "reports") {
          const result = await adminApi.getPropertyReports({ status: reportFilter === "ALL" ? undefined : reportFilter, search, page, limit: 20 });
          if (live) { setReports(result.data); setMeta(result.meta); }
        } else if (section === "audit") {
          const result = await adminApi.getAuditLogs({ search, action: auditAction || undefined, page, limit: 30 });
          if (live) { setLogs(result.data); setMeta(result.meta); }
        }
      } catch (loadError) {
        if (live) setError(displayError(loadError));
      } finally {
        if (live) setLoading(false);
      }
    }
    void loadData();
    return () => { live = false; };
  }, [section, page, search, roleFilter, activeFilter, verificationFilter, listingFilter, reportFilter, auditAction, refreshKey]);

  const moderationPages = Math.max(meta.totalPages, documentMeta.totalPages);
  const moderationMeta = { ...meta, total: meta.total + documentMeta.total, totalPages: moderationPages };
  const displayName = user?.fullName || "Admin";
  const initials = displayName.slice(0, 2).toUpperCase();
  const alertCount = overview ? overview.properties.pendingReview + overview.reports.pending + overview.verificationDocuments.pending + overview.users.locked : 0;
  const actionTitle = useMemo(() => {
    if (!pendingAction) return "";
    if (pendingAction.kind === "property") return pendingAction.status === "VERIFIED" ? tx("Approve listing", "အိမ်စာရင်း အတည်ပြုရန်") : tx("Reject listing", "အိမ်စာရင်း ပယ်ချရန်");
    if (pendingAction.kind === "document") return pendingAction.status === "VERIFIED" ? tx("Approve identity document", "အထောက်အထား အတည်ပြုရန်") : tx("Reject identity document", "အထောက်အထား ပယ်ချရန်");
    if (pendingAction.kind === "report") return pendingAction.status === "RESOLVED" ? tx("Resolve report", "တိုင်ကြားချက် ဖြေရှင်းရန်") : tx("Dismiss report", "တိုင်ကြားချက် ပယ်ရန်");
    if (pendingAction.kind === "user-status") return pendingAction.isActive ? tx("Activate account", "အကောင့် ပြန်ဖွင့်ရန်") : tx("Suspend account", "အကောင့် ယာယီပိတ်ရန်");
    if (pendingAction.kind === "delete-user") return tx("Permanently delete account", "အကောင့် အပြီးဖျက်ရန်");
    if (pendingAction.kind === "unlock-user") return tx("Unlock account", "အကောင့် လော့ခ်ဖြေရန်");
    return tx("Verify email manually", "အီးမေးလ်ကို ကိုယ်တိုင်အတည်ပြုရန်");
  }, [pendingAction, tx]);

  const submitSearch = () => { setPage(1); setSearch(searchInput.trim()); };
  const openAction = (action: PendingAction) => {
    setSelectedProperty(null);
    setSelectedUser(null);
    setActionNote("");
    setPendingAction(action);
  };

  const runAction = async () => {
    if (!pendingAction) return;
    if (actionNeedsReason(pendingAction) && !actionNote.trim()) return;
    if (pendingAction.kind === "delete-user" && actionNote !== "DELETE") return;
    setActionBusy(true);
    try {
      if (pendingAction.kind === "property") await adminApi.setPropertyVerification(pendingAction.item.id, pendingAction.status, actionNote.trim() || undefined);
      if (pendingAction.kind === "document") await adminApi.setVerificationDocumentStatus(pendingAction.item.id, pendingAction.status, actionNote.trim() || undefined);
      if (pendingAction.kind === "report") await adminApi.decidePropertyReport(pendingAction.item.id, pendingAction.status, actionNote.trim());
      if (pendingAction.kind === "user-status") await adminApi.setUserStatus(pendingAction.item.id, pendingAction.isActive, actionNote.trim() || undefined);
      if (pendingAction.kind === "delete-user") await adminApi.deleteUser(pendingAction.item.id);
      if (pendingAction.kind === "verify-email") await adminApi.verifyUserEmail(pendingAction.item.id);
      if (pendingAction.kind === "unlock-user") await adminApi.unlockUser(pendingAction.item.id);
      toast({ tone: "success", title: tx("Admin action completed", "Admin လုပ်ဆောင်ချက် ပြီးမြောက်ပါပြီ") });
      setPendingAction(null);
      setSelectedProperty(null);
      setSelectedUser(null);
      setRefreshKey((value) => value + 1);
    } catch (actionError) {
      toast({ tone: "error", title: tx("Action failed", "လုပ်ဆောင်ချက် မအောင်မြင်ပါ"), description: displayError(actionError) });
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <DashboardShell
      role="admin"
      name={displayName}
      initials={initials}
      title={tx("Admin Dashboard", "စီမံခန့်ခွဲသူ ဒက်ရှ်ဘုတ်")}
      description={tx("Review marketplace safety, users, and operational activity.", "ဈေးကွက်လုံခြုံရေး၊ အသုံးပြုသူများနှင့် လုပ်ငန်းလည်ပတ်မှုကို စီမံပါ။")}
      onNotifications={() => router.push("/admin#admin-alerts")}
    >
      {error && <div role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><strong>{tx("Could not load admin data.", "Admin အချက်အလက် မရယူနိုင်ပါ။")}</strong><span className="mt-1 block">{error}</span></div>}
      {loading ? (
        <div aria-label={tx("Loading admin data", "Admin အချက်အလက် ရယူနေသည်")} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl border border-white/80 bg-white/70" />)}
        </div>
      ) : (
        <div className="space-y-8">
          {section === "overview" && overview && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Link href="/admin?section=users" className="rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4DA3FF]/25"><MetricCard label={tx("Total users", "အသုံးပြုသူ စုစုပေါင်း")} value={overview.users.total.toString()} change={`${overview.users.active} ${tx("active", "အသုံးပြုနေ")}`} icon={UserRound} /></Link>
                <Link href="/admin?section=properties" className="rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4DA3FF]/25"><MetricCard label={tx("Properties", "အိမ်ခြံမြေများ")} value={overview.properties.total.toString()} change={`${overview.properties.pendingReview} ${tx("pending", "စိစစ်ဆဲ")}`} icon={Building2} /></Link>
                <Link href="/admin?section=reports" className="rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4DA3FF]/25"><MetricCard label={tx("Pending reports", "စောင့်ဆိုင်းနေသော တိုင်ကြားချက်")} value={overview.reports.pending.toString()} change={tx("Needs moderation", "စိစစ်ရန် လိုအပ်သည်")} icon={Flag} /></Link>
                <MetricCard label={tx("New inquiries", "မေးမြန်းမှုအသစ်")} value={overview.inquiries.new.toString()} change={`${overview.inquiries.total} ${tx("total", "စုစုပေါင်း")}`} icon={ShieldCheck} />
              </div>

              <section id="admin-alerts" className="scroll-mt-24" aria-labelledby="alerts-title">
                <div className="mb-4 flex items-center justify-between gap-3"><div><p className="eyebrow">{tx("Operations", "လုပ်ငန်းလည်ပတ်မှု")}</p><h2 id="alerts-title" className="mt-1 text-xl font-semibold">{tx("Attention needed", "အရေးယူရန် လိုအပ်သည်")}</h2></div><Badge variant={alertCount ? "warning" : "success"}>{alertCount} {tx("items", "ခု")}</Badge></div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Link href="/admin?section=properties" className="flex min-h-24 items-center gap-4 rounded-2xl border border-[#E1E6ED] bg-white p-4 hover:border-[#4DA3FF]"><FileCheck2 className="size-6 text-[#123B73]" /><span><strong className="block text-sm">{overview.properties.pendingReview} {tx("listing reviews", "အိမ်စာရင်း စိစစ်မှု")}</strong><small className="mt-1 block text-[#667085]">{tx("Verify evidence before publishing trust claims.", "ယုံကြည်ရမှု မဖော်ပြမီ အထောက်အထား စစ်ဆေးပါ။")}</small></span></Link>
                  <Link href="/admin?section=reports" className="flex min-h-24 items-center gap-4 rounded-2xl border border-[#E1E6ED] bg-white p-4 hover:border-[#4DA3FF]"><AlertTriangle className="size-6 text-[#A15C00]" /><span><strong className="block text-sm">{overview.reports.pending} {tx("listing reports", "အိမ်စာရင်း တိုင်ကြားချက်")}</strong><small className="mt-1 block text-[#667085]">{tx("Review reports without automatically removing listings.", "အိမ်စာရင်းကို အလိုအလျောက် မဖယ်ဘဲ စိစစ်ပါ။")}</small></span></Link>
                  <Link href="/admin?section=properties" className="flex min-h-24 items-center gap-4 rounded-2xl border border-[#E1E6ED] bg-white p-4 hover:border-[#4DA3FF]"><Clock3 className="size-6 text-[#A15C00]" /><span><strong className="block text-sm">{overview.properties.staleReview} {tx("reviews older than 48 hours", "၄၈ နာရီကျော် စောင့်ဆိုင်းသော စိစစ်မှု")}</strong><small className="mt-1 block text-[#667085]">{overview.verificationDocuments.pending} {tx("identity documents are also pending.", "ကိုယ်ရေးအထောက်အထားများလည်း စောင့်ဆိုင်းနေသည်။")}</small></span></Link>
                  <Link href="/admin?section=users" className="flex min-h-24 items-center gap-4 rounded-2xl border border-[#E1E6ED] bg-white p-4 hover:border-[#4DA3FF]"><Lock className="size-6 text-[#B42318]" /><span><strong className="block text-sm">{overview.users.locked} {tx("locked accounts", "လော့ခ်ကျသော အကောင့်")}</strong><small className="mt-1 block text-[#667085]">{tx("Review recent failed-login locks.", "မကြာသေးမီ ဝင်ရောက်မှုမအောင်မြင်သော လော့ခ်များကို စစ်ပါ။")}</small></span></Link>
                </div>
              </section>

              <section aria-labelledby="recent-activity-title">
                <h2 id="recent-activity-title" className="mb-4 text-xl font-semibold">{tx("Recent admin activity", "မကြာသေးမီ Admin လုပ်ဆောင်ချက်များ")}</h2>
                <AuditList logs={logs} tx={tx} compact />
              </section>
            </>
          )}

          {section === "properties" && (
            <section className="space-y-5" aria-labelledby="moderation-title">
              <div><p className="eyebrow">{tx("Unified queue", "ပေါင်းစည်း စိစစ်စာရင်း")}</p><h2 id="moderation-title" className="mt-1 text-xl font-semibold">{tx("Verification and moderation", "အတည်ပြုခြင်းနှင့် စိစစ်ခြင်း")}</h2></div>
              <div className="flex flex-col gap-3 rounded-2xl border border-[#E1E6ED] bg-white p-4 xl:flex-row">
                <SearchForm value={searchInput} onChange={setSearchInput} onSubmit={submitSearch} placeholder={tx("Search title, city or township", "ခေါင်းစဉ်၊ မြို့ သို့မဟုတ် မြို့နယ် ရှာရန်")} label={tx("Search", "ရှာရန်")} />
                <label><span className="sr-only">{tx("Verification status", "စိစစ်မှုအခြေအနေ")}</span><select value={verificationFilter} onChange={(event) => { setVerificationFilter(event.target.value as typeof verificationFilter); setPage(1); }} className={fieldClass}><option value="PENDING">{tx("Pending review", "စိစစ်ဆဲ")}</option><option value="VERIFIED">{tx("Verified", "အတည်ပြုပြီး")}</option><option value="REJECTED">{tx("Rejected", "ပယ်ချပြီး")}</option><option value="UNVERIFIED">{tx("Unverified", "မစိစစ်ရသေး")}</option><option value="ALL">{tx("All verification states", "စိစစ်မှုအားလုံး")}</option></select></label>
                <label><span className="sr-only">{tx("Listing status", "အိမ်စာရင်းအခြေအနေ")}</span><select value={listingFilter} onChange={(event) => { setListingFilter(event.target.value as typeof listingFilter); setPage(1); }} className={fieldClass}><option value="ALL">{tx("All listing states", "အိမ်စာရင်းအားလုံး")}</option>{["DRAFT", "PUBLISHED", "PAUSED", "SOLD", "RENTED", "ARCHIVED"].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <div className="space-y-3"><div className="flex items-center justify-between"><h3 className="font-semibold">{tx("Property reviews", "အိမ်စာရင်း စိစစ်မှု")}</h3><Badge variant="brand">{meta.total}</Badge></div>{properties.length ? properties.map((property) => <PropertyReviewCard key={property.id} property={property} tx={tx} onOpen={() => setSelectedProperty(property)} onAction={openAction} />) : <EmptyState text={tx("No matching properties.", "ကိုက်ညီသော အိမ်စာရင်း မရှိပါ။")} />}</div>
                <div className="space-y-3"><div className="flex items-center justify-between"><h3 className="font-semibold">{tx("Identity documents", "ကိုယ်ရေးအထောက်အထားများ")}</h3><Badge variant="brand">{documentMeta.total}</Badge></div>{documents.length ? documents.map((document) => <DocumentReviewCard key={document.id} document={document} tx={tx} onOpenUser={() => setSelectedUser(document.user)} onAction={openAction} />) : <EmptyState text={tx("No matching identity documents.", "ကိုက်ညီသော အထောက်အထား မရှိပါ။")} />}</div>
              </div>
              <Pagination meta={moderationMeta} onPage={setPage} previousLabel={tx("Previous page", "ယခင်စာမျက်နှာ")} nextLabel={tx("Next page", "နောက်စာမျက်နှာ")} />
            </section>
          )}

          {section === "reports" && (
            <section className="space-y-5" aria-labelledby="reports-title">
              <h2 id="reports-title" className="text-xl font-semibold">{tx("Pending Listing Reports", "စောင့်ဆိုင်းနေသော အိမ်စာရင်း တိုင်ကြားချက်များ")}</h2>
              <div className="flex flex-col gap-3 rounded-2xl border border-[#E1E6ED] bg-white p-4 lg:flex-row"><SearchForm value={searchInput} onChange={setSearchInput} onSubmit={submitSearch} placeholder={tx("Search listing, reporter or details", "အိမ်စာရင်း၊ တိုင်ကြားသူ သို့မဟုတ် အကြောင်းအရာ ရှာရန်")} label={tx("Search", "ရှာရန်")} /><select value={reportFilter} onChange={(event) => { setReportFilter(event.target.value as typeof reportFilter); setPage(1); }} className={fieldClass} aria-label={tx("Report status", "တိုင်ကြားချက်အခြေအနေ")}><option value="PENDING">{tx("Pending", "စောင့်ဆိုင်းဆဲ")}</option><option value="RESOLVED">{tx("Resolved", "ဖြေရှင်းပြီး")}</option><option value="DISMISSED">{tx("Dismissed", "ပယ်ထားပြီး")}</option><option value="ALL">{tx("All statuses", "အခြေအနေအားလုံး")}</option></select></div>
              {reports.length ? reports.map((report) => <Card key={report.id}><CardContent className="space-y-4 p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{report.property.title}</h3><p className="mt-1 text-sm text-[#667085]">{report.reason.replaceAll("_", " ")}</p></div><Badge variant={report.status === "PENDING" ? "warning" : report.status === "RESOLVED" ? "success" : "neutral"}>{report.status}</Badge></div>{report.details && <p className="rounded-xl bg-[#F8FBFF] p-3 text-sm text-[#475467]">{report.details}</p>}<p className="text-xs text-[#667085]">{tx("Reported by", "တိုင်ကြားသူ")}: {report.reporter.firstName} {report.reporter.lastName} ({report.reporter.email})</p>{report.status === "PENDING" && <div className="flex flex-wrap gap-2"><Button className="bg-green-700 text-xs hover:bg-green-800" onClick={() => openAction({ kind: "report", item: report, status: "RESOLVED" })}><Check className="size-4" />{tx("Resolve", "ဖြေရှင်းရန်")}</Button><Button variant="outline" className="text-xs" onClick={() => openAction({ kind: "report", item: report, status: "DISMISSED" })}><X className="size-4" />{tx("Dismiss", "ပယ်ရန်")}</Button></div>}</CardContent></Card>) : <EmptyState text={tx("No matching reports.", "ကိုက်ညီသော တိုင်ကြားချက် မရှိပါ။")} />}
              <Pagination meta={meta} onPage={setPage} previousLabel={tx("Previous page", "ယခင်စာမျက်နှာ")} nextLabel={tx("Next page", "နောက်စာမျက်နှာ")} />
            </section>
          )}

          {section === "users" && (
            <section className="space-y-5" aria-labelledby="users-title">
              <h2 id="users-title" className="text-xl font-semibold">{tx("User management", "အသုံးပြုသူ စီမံခန့်ခွဲမှု")}</h2>
              <div className="flex flex-col gap-3 rounded-2xl border border-[#E1E6ED] bg-white p-4 xl:flex-row"><SearchForm value={searchInput} onChange={setSearchInput} onSubmit={submitSearch} placeholder={tx("Search name or email", "အမည် သို့မဟုတ် အီးမေးလ် ရှာရန်")} label={tx("Search", "ရှာရန်")} /><select value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value as typeof roleFilter); setPage(1); }} className={fieldClass} aria-label={tx("Account role", "အကောင့်အမျိုးအစား")}><option value="ALL">{tx("All roles", "အမျိုးအစားအားလုံး")}</option><option value="SEEKER">{tx("Seeker", "အိမ်ရှာသူ")}</option><option value="LISTER">{tx("Lister", "အိမ်တင်သူ")}</option></select><select value={activeFilter} onChange={(event) => { setActiveFilter(event.target.value as typeof activeFilter); setPage(1); }} className={fieldClass} aria-label={tx("Account status", "အကောင့်အခြေအနေ")}><option value="ALL">{tx("All statuses", "အခြေအနေအားလုံး")}</option><option value="ACTIVE">{tx("Active", "အသုံးပြုနေ")}</option><option value="SUSPENDED">{tx("Suspended", "ယာယီပိတ်ထား")}</option></select></div>
              {users.length ? users.map((account) => <UserCard key={account.id} account={account} tx={tx} onOpen={() => setSelectedUser(account)} onAction={openAction} />) : <EmptyState text={tx("No matching users.", "ကိုက်ညီသော အသုံးပြုသူ မရှိပါ။")} />}
              <Pagination meta={meta} onPage={setPage} previousLabel={tx("Previous page", "ယခင်စာမျက်နှာ")} nextLabel={tx("Next page", "နောက်စာမျက်နှာ")} />
            </section>
          )}

          {section === "audit" && (
            <section className="space-y-5" aria-labelledby="audit-title">
              <h2 id="audit-title" className="text-xl font-semibold">{tx("System audit logs", "စနစ် စစ်ဆေးမှတ်တမ်းများ")}</h2>
              <div className="flex flex-col gap-3 rounded-2xl border border-[#E1E6ED] bg-white p-4 lg:flex-row"><SearchForm value={searchInput} onChange={setSearchInput} onSubmit={submitSearch} placeholder={tx("Search actor email or target", "လုပ်ဆောင်သူအီးမေးလ် သို့မဟုတ် ပစ်မှတ် ရှာရန်")} label={tx("Search", "ရှာရန်")} /><select value={auditAction} onChange={(event) => { setAuditAction(event.target.value); setPage(1); }} className={fieldClass} aria-label={tx("Audit action", "စစ်ဆေးလုပ်ဆောင်ချက်")}><option value="">{tx("All audit actions", "လုပ်ဆောင်ချက်အားလုံး")}</option>{auditActions.map((action) => <option key={action} value={action}>{action}</option>)}</select></div>
              <AuditList logs={logs} tx={tx} />
              <Pagination meta={meta} onPage={setPage} previousLabel={tx("Previous page", "ယခင်စာမျက်နှာ")} nextLabel={tx("Next page", "နောက်စာမျက်နှာ")} />
            </section>
          )}
        </div>
      )}

      {selectedProperty && <PropertyDetails property={selectedProperty} tx={tx} onClose={() => setSelectedProperty(null)} onAction={openAction} />}
      {selectedUser && <UserDetails account={selectedUser} tx={tx} onClose={() => setSelectedUser(null)} onAction={openAction} />}

      <Modal open={Boolean(pendingAction)} onOpenChange={(open) => { if (!open && !actionBusy) setPendingAction(null); }} title={actionTitle} description={tx("Review the consequences before confirming this admin action.", "ဤ Admin လုပ်ဆောင်ချက်ကို အတည်မပြုမီ အကျိုးဆက်များကို စစ်ဆေးပါ။")} footer={<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="outline" disabled={actionBusy} onClick={() => setPendingAction(null)}>{tx("Cancel", "မလုပ်တော့ပါ")}</Button><Button variant={pendingAction?.kind === "delete-user" || (pendingAction?.kind === "user-status" && !pendingAction.isActive) ? "destructive" : "default"} disabled={actionBusy || (actionNeedsReason(pendingAction) && !actionNote.trim()) || (pendingAction?.kind === "delete-user" && actionNote !== "DELETE")} onClick={() => void runAction()}>{actionBusy ? tx("Saving…", "သိမ်းနေသည်…") : tx("Confirm action", "လုပ်ဆောင်ချက် အတည်ပြုရန်")}</Button></div>}>
        <div className="space-y-4 p-5">
          {pendingAction?.kind === "delete-user" && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><strong className="block">{tx("This permanently removes the user and related marketplace records.", "ဤလုပ်ဆောင်ချက်သည် အသုံးပြုသူနှင့် ဆက်စပ်ဈေးကွက်မှတ်တမ်းများကို အပြီးဖျက်မည်။")}</strong><span className="mt-1 block">{tx("Type DELETE to continue. This cannot be undone.", "ဆက်လုပ်ရန် DELETE ဟု ရိုက်ပါ။ ပြန်ယူ၍ မရပါ။")}</span></div>}
          {pendingAction?.kind === "user-status" && !pendingAction.isActive && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{tx("Suspending this account revokes sessions and pauses its published listings.", "အကောင့်ကို ယာယီပိတ်ပါက session များ ပယ်ဖျက်ပြီး တင်ထားသောအိမ်များကို ခေတ္တရပ်မည်။")}</p>}
          <label className="block"><span className="mb-2 block text-sm font-semibold">{pendingAction?.kind === "delete-user" ? "DELETE" : actionNeedsReason(pendingAction) ? tx("Reason (required)", "အကြောင်းပြချက် (လိုအပ်သည်)") : tx("Note (optional)", "မှတ်ချက် (မထည့်လည်းရသည်)")}</span>{pendingAction?.kind === "delete-user" ? <input value={actionNote} onChange={(event) => setActionNote(event.target.value)} className={`${fieldClass} w-full`} autoComplete="off" /> : <textarea value={actionNote} onChange={(event) => setActionNote(event.target.value)} className={`${fieldClass} min-h-28 w-full py-3`} maxLength={1000} />}</label>
        </div>
      </Modal>
    </DashboardShell>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-[#C9D5E2] bg-white/60 p-8 text-center text-sm text-[#667085]">{text}</div>;
}

function PropertyReviewCard({ property, tx, onOpen, onAction }: { property: AdminProperty; tx: (english: string, myanmar: string) => string; onOpen: () => void; onAction: (action: PendingAction) => void }) {
  const view = fromApiProperty(property);
  return <Card><CardContent className="p-4 sm:p-5"><button type="button" onClick={onOpen} className="min-h-11 w-full text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4DA3FF]/20"><span className="flex flex-wrap items-start justify-between gap-2"><span><strong className="block">{view.title}</strong><small className="mt-1 block text-[#667085]">{view.township}, {view.city} · {formatPropertyPrice(view)}</small></span><Badge variant={property.verificationStatus === "VERIFIED" ? "success" : property.verificationStatus === "REJECTED" ? "danger" : "warning"}>{property.verificationStatus}</Badge></span><small className="mt-3 block text-[#667085]">{tx("Owner", "ပိုင်ရှင်")}: {property.owner.firstName} {property.owner.lastName} · {property.status}</small></button>{property.verificationStatus === "PENDING" && <div className="mt-4 flex flex-wrap gap-2 border-t border-[#E1E6ED] pt-4"><Button variant="outline" className="text-xs text-red-700" onClick={() => onAction({ kind: "property", item: property, status: "REJECTED" })}><X className="size-4" />{tx("Reject", "ပယ်ချရန်")}</Button><Button className="bg-green-700 text-xs hover:bg-green-800" onClick={() => onAction({ kind: "property", item: property, status: "VERIFIED" })}><Check className="size-4" />{tx("Approve", "အတည်ပြုရန်")}</Button></div>}</CardContent></Card>;
}

function DocumentReviewCard({ document, tx, onOpenUser, onAction }: { document: AdminVerificationDocument; tx: (english: string, myanmar: string) => string; onOpenUser: () => void; onAction: (action: PendingAction) => void }) {
  return <Card><CardContent className="space-y-4 p-4 sm:p-5"><button type="button" onClick={onOpenUser} className="min-h-11 w-full text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4DA3FF]/20"><span className="flex flex-wrap items-start justify-between gap-2"><span><strong className="block">{document.user.firstName} {document.user.lastName}</strong><small className="mt-1 block text-[#667085]">{document.user.email} · {document.documentType}</small></span><Badge variant={document.status === "VERIFIED" ? "success" : document.status === "REJECTED" ? "danger" : "warning"}>{document.status}</Badge></span></button><PrivateDocumentButton url={document.documentUrl} />{document.status === "PENDING" && <div className="flex flex-wrap gap-2"><Button variant="outline" className="text-xs text-red-700" onClick={() => onAction({ kind: "document", item: document, status: "REJECTED" })}>{tx("Reject", "ပယ်ချရန်")}</Button><Button className="bg-green-700 text-xs hover:bg-green-800" onClick={() => onAction({ kind: "document", item: document, status: "VERIFIED" })}>{tx("Approve", "အတည်ပြုရန်")}</Button></div>}</CardContent></Card>;
}

function UserCard({ account, tx, onOpen, onAction }: { account: AdminUser; tx: (english: string, myanmar: string) => string; onOpen: () => void; onAction: (action: PendingAction) => void }) {
  return <Card><CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><button type="button" onClick={onOpen} className="min-h-11 min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4DA3FF]/20"><span className="flex flex-wrap items-center gap-2"><strong>{account.firstName} {account.lastName}</strong><Badge variant="neutral">{account.role}</Badge><Badge variant={account.isActive ? "success" : "danger"}>{account.isActive ? tx("Active", "အသုံးပြုနေ") : tx("Suspended", "ယာယီပိတ်ထား")}</Badge>{account.lockedUntil && new Date(account.lockedUntil) > new Date() && <Badge variant="warning">{tx("Locked", "လော့ခ်ကျနေ")}</Badge>}</span><small className="mt-1 block truncate text-[#667085]">{account.email}</small></button>{account.role !== "ADMIN" && <div className="flex flex-wrap gap-2">{account.lockedUntil && new Date(account.lockedUntil) > new Date() && <Button variant="outline" className="text-xs" onClick={() => onAction({ kind: "unlock-user", item: account })}><Unlock className="size-4" />{tx("Unlock", "လော့ခ်ဖြေ")}</Button>}<Button variant="outline" className={account.isActive ? "text-xs text-red-700" : "text-xs text-green-700"} onClick={() => onAction({ kind: "user-status", item: account, isActive: !account.isActive })}>{account.isActive ? <Lock className="size-4" /> : <Unlock className="size-4" />}{account.isActive ? tx("Suspend", "ယာယီပိတ်") : tx("Activate", "ပြန်ဖွင့်")}</Button></div>}</CardContent></Card>;
}

function AuditList({ logs, tx, compact = false }: { logs: AuditLogEntry[]; tx: (english: string, myanmar: string) => string; compact?: boolean }) {
  if (!logs.length) return <EmptyState text={tx("No audit activity found.", "စစ်ဆေးမှတ်တမ်း မရှိပါ။")} />;
  return <div className="overflow-hidden rounded-2xl border border-[#E1E6ED] bg-white"><div className="divide-y divide-[#E1E6ED]">{logs.map((log) => <div key={log.id} className="grid gap-2 p-4 text-sm sm:grid-cols-[minmax(150px,1fr)_minmax(180px,1.4fr)_minmax(140px,1fr)] sm:items-center"><div><time className="text-xs text-[#667085]">{new Date(log.createdAt).toLocaleString()}</time><strong className="mt-1 block truncate text-xs">{log.actor?.email ?? log.actorId ?? tx("System", "စနစ်")}</strong></div><Badge variant="neutral" className="w-fit max-w-full overflow-hidden font-mono text-[10px]">{log.action}</Badge><span className="truncate font-mono text-xs text-[#667085]">{log.targetType ?? "—"} {log.targetId ?? ""}</span></div>)}</div>{compact && <Link href="/admin?section=audit" className="flex min-h-11 items-center justify-center border-t border-[#E1E6ED] text-xs font-semibold text-[#123B73] hover:bg-[#F8FBFF]">{tx("View all audit logs", "စစ်ဆေးမှတ်တမ်းအားလုံး ကြည့်ရန်")}</Link>}</div>;
}

function PropertyDetails({ property, tx, onClose, onAction }: { property: AdminProperty; tx: (english: string, myanmar: string) => string; onClose: () => void; onAction: (action: PendingAction) => void }) {
  const view = fromApiProperty(property);
  return <Modal open className="flex flex-col [&>header]:shrink-0 [&>div]:min-h-0 [&>footer]:shrink-0" onOpenChange={(open) => { if (!open) onClose(); }} title={view.title} description={`${view.address} · ${formatPropertyPrice(view)}`} footer={property.verificationStatus !== "VERIFIED" && <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{property.verificationStatus === "PENDING" && <Button variant="outline" className="text-red-700" onClick={() => onAction({ kind: "property", item: property, status: "REJECTED" })}>{tx("Reject with reason", "အကြောင်းပြချက်ဖြင့် ပယ်ချရန်")}</Button>}<Button className="bg-green-700 hover:bg-green-800" onClick={() => onAction({ kind: "property", item: property, status: "VERIFIED" })}><ShieldCheck className="size-4" aria-hidden="true" />{tx("Verify property", "အိမ်စာရင်း အတည်ပြုရန်")}</Button></div>}><div className="space-y-5 p-5 text-sm"><div className="grid grid-cols-2 gap-4"><Detail label={tx("Type", "အမျိုးအစား")} value={view.property_type} /><Detail label={tx("Purpose", "ရည်ရွယ်ချက်")} value={view.purpose} /><Detail label={tx("Bedrooms", "အိပ်ခန်း")} value={String(view.bedrooms)} /><Detail label={tx("Bathrooms", "ရေချိုးခန်း")} value={String(view.bathrooms)} /><Detail label={tx("Area", "အကျယ်အဝန်း")} value={`${view.area_sqft} sqft`} /><Detail label={tx("Listing status", "အိမ်စာရင်းအခြေအနေ")} value={property.status} /><Detail label={tx("Verification status", "စိစစ်မှုအခြေအနေ")} value={property.verificationStatus} /></div><div><p className="text-[#667085]">{tx("Description", "အကြောင်းအရာ")}</p><p className="mt-1 leading-6">{view.description}</p></div><div className="border-t border-[#E1E6ED] pt-4"><h3 className="font-semibold">{tx("Owner", "ပိုင်ရှင်")}</h3><p className="mt-2">{property.owner.firstName} {property.owner.lastName} · {property.owner.isAgent ? tx("Agent", "အကျိုးဆောင်") : tx("Owner", "အိမ်ရှင်")}</p></div>{property.documents?.length ? <div className="space-y-2 border-t border-[#E1E6ED] pt-4"><h3 className="font-semibold">{tx("Ownership documents", "ပိုင်ဆိုင်မှု အထောက်အထားများ")}</h3>{property.documents.map((document, index) => <PrivateDocumentButton key={document.id} url={document.documentUrl} label={`${tx("Document", "စာရွက်စာတမ်း")} ${index + 1}`} />)}</div> : null}</div></Modal>;
}

function UserDetails({ account, tx, onClose, onAction }: { account: AdminUser; tx: (english: string, myanmar: string) => string; onClose: () => void; onAction: (action: PendingAction) => void }) {
  return <Modal open onOpenChange={(open) => { if (!open) onClose(); }} title={`${account.firstName} ${account.lastName}`} description={account.email}><div className="space-y-5 p-5 text-sm"><div className="grid grid-cols-2 gap-4"><Detail label={tx("Role", "အခန်းကဏ္ဍ")} value={account.role} /><Detail label={tx("Status", "အခြေအနေ")} value={account.isActive ? tx("Active", "အသုံးပြုနေ") : tx("Suspended", "ယာယီပိတ်ထား")} /><Detail label={tx("Phone", "ဖုန်း")} value={account.phone || tx("Not provided", "မထည့်ထားပါ")} /><Detail label={tx("Joined", "အကောင့်ဖွင့်ရက်")} value={new Date(account.createdAt).toLocaleDateString()} /><Detail label={tx("Properties", "အိမ်စာရင်း") } value={String(account._count?.properties ?? 0)} /><Detail label={tx("Last login", "နောက်ဆုံးဝင်ရောက်ချိန်")} value={account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString() : tx("Never", "မဝင်ရောက်ဖူးပါ")} /></div>{account.verificationDocs?.length ? <div className="space-y-3 border-t border-[#E1E6ED] pt-4"><h3 className="font-semibold">{tx("Verification documents", "စိစစ်ရေး အထောက်အထားများ")}</h3>{account.verificationDocs.map((document) => <div key={document.id} className="space-y-3 rounded-xl border p-3"><div className="flex items-center justify-between gap-2"><span>{document.documentType}</span><Badge variant={document.status === "VERIFIED" ? "success" : document.status === "REJECTED" ? "danger" : "warning"}>{document.status}</Badge></div><PrivateDocumentButton url={document.documentUrl} />{document.status === "PENDING" && <div className="flex gap-2"><Button variant="outline" className="text-xs text-red-700" onClick={() => onAction({ kind: "document", item: { ...document, user: account }, status: "REJECTED" })}>{tx("Reject", "ပယ်ချရန်")}</Button><Button className="bg-green-700 text-xs hover:bg-green-800" onClick={() => onAction({ kind: "document", item: { ...document, user: account }, status: "VERIFIED" })}>{tx("Approve", "အတည်ပြုရန်")}</Button></div>}</div>)}</div> : null}{account.role !== "ADMIN" && <div className="flex flex-wrap gap-2 border-t border-[#E1E6ED] pt-4">{!account.emailVerifiedAt && <Button variant="outline" onClick={() => onAction({ kind: "verify-email", item: account })}>{tx("Verify email", "အီးမေးလ် အတည်ပြုရန်")}</Button>}<Button variant="destructive" onClick={() => onAction({ kind: "delete-user", item: account })}><Trash2 className="size-4" />{tx("Delete permanently", "အပြီးဖျက်ရန်")}</Button></div>}</div></Modal>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[#667085]">{label}</p><p className="mt-1 font-medium capitalize">{value}</p></div>;
}
