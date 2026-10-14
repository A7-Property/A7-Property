"use client";

import { PrivateDocumentButton } from "@/components/ui/private-document-button";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, UserRound, Building2, Check, X, Lock, Unlock, Trash2 } from "lucide-react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { formatPropertyPrice } from "@/lib/properties";
import * as adminApi from "@/lib/api/admin";
import type { AdminOverview, AdminProperty, AuditLogEntry, AdminUser } from "@/lib/api/admin";

export function AdminDashboard() {
  const { user } = useAuth();
  const { tx } = useLanguage();
  const searchParams = useSearchParams();
  const section = searchParams.get("section") ?? "overview";

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [properties, setProperties] = useState<AdminProperty[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<AdminProperty | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [roleFilter, setRoleFilter] = useState<"ALL" | "SEEKER" | "LISTER">("ALL");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        if (section === "overview") {
          setOverview(await adminApi.getOverview());
        } else if (section === "properties") {
          setProperties(await adminApi.getProperties("PENDING"));
        } else if (section === "users") {
          setUsers(await adminApi.getUsers(roleFilter === "ALL" ? undefined : roleFilter));
        } else if (section === "audit") {
          setLogs(await adminApi.getAuditLogs());
        }
      } catch (err) {
        console.error("Failed to load admin data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [section, roleFilter]);

  const handleVerifyProperty = async (id: string, status: "VERIFIED" | "REJECTED") => {
    try {
      await adminApi.setPropertyVerification(id, status);
      setProperties((prev) => prev.filter((p) => p.id !== id));
      if (selectedProperty?.id === id) setSelectedProperty(null);
    } catch (err) {
      console.error("Failed to verify property", err);
    }
  };

  const handleUserStatus = async (id: string, isActive: boolean) => {
    try {
      await adminApi.setUserStatus(id, isActive);
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, isActive } : u));
    } catch (err) {
      console.error("Failed to update user status", err);
    }
  };

  const handleVerifyEmail = async (id: string) => {
    try {
      await adminApi.verifyUserEmail(id);
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, emailVerifiedAt: new Date().toISOString() } : u));
      if (selectedUser?.id === id) {
        setSelectedUser((prev) => prev ? { ...prev, emailVerifiedAt: new Date().toISOString() } : null);
      }
    } catch (err) {
      console.error("Failed to verify email", err);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm(tx("Are you sure you want to permanently delete this user?", "ဒီသုံးစွဲသူကို အပြီးတိုင် ဖျက်ပစ်မည်မှာ သေချာပါသလား?"))) return;
    try {
      await adminApi.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      if (selectedUser?.id === id) setSelectedUser(null);
    } catch (err) {
      console.error("Failed to delete user", err);
    }
  };

  const handleVerifyDocument = async (docId: string, status: "VERIFIED" | "REJECTED") => {
    try {
      const updatedDoc = await adminApi.setVerificationDocumentStatus(docId, status);
      if (selectedUser) {
        setSelectedUser({
          ...selectedUser,
          verificationDocs: selectedUser.verificationDocs?.map(d => d.id === docId ? updatedDoc : d)
        });
        setUsers(prev => prev.map(u => u.id === selectedUser.id ? {
          ...u,
          verificationDocs: u.verificationDocs?.map(d => d.id === docId ? updatedDoc : d)
        } : u));
      }
    } catch (err) {
      console.error("Failed to update document status", err);
    }
  };

  const displayName = user?.fullName || "Admin";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <DashboardShell
      role="admin"
      name={displayName}
      initials={initials}
      title={tx("Admin Dashboard", "အက်ဒမင် ဒက်ရှ်ဘုတ်")}
      description={tx("Manage users, properties, and system security.", "သုံးစွဲသူများ၊ အိမ်များနှင့် စနစ်လုံခြုံရေးကို စီမံပါ။")}
    >
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="size-8 animate-spin rounded-full border-4 border-[#123B73] border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-8">
          {section === "overview" && overview && (
            <div className="grid gap-4 sm:grid-cols-3">
              <MetricCard
                label={tx("Total Users", "သုံးစွဲသူ စုစုပေါင်း")}
                value={overview.users.total.toString()}
                change={`${overview.users.active} active`}
                icon={UserRound}
              />
              <MetricCard
                label={tx("Properties", "အိမ်ခြံမြေများ")}
                value={overview.properties.total.toString()}
                change={`${overview.properties.pendingReview} pending`}
                icon={Building2}
              />
              <MetricCard
                label={tx("New Inquiries", "စုံစမ်းမေးမြန်းမှုအသစ်များ")}
                value={overview.inquiries.new.toString()}
                change={`${overview.inquiries.total} total`}
                icon={ShieldCheck}
              />
            </div>
          )}

          {section === "properties" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">{tx("Pending Verifications", "စိစစ်ရန်ကျန်သော အိမ်များ")}</h2>
              {properties.length === 0 ? (
                <p className="text-[#667085]">{tx("No properties pending verification.", "စိစစ်ရန်ကျန်သော အိမ်မရှိပါ။")}</p>
              ) : (
                properties.map((p) => (
                  <Card key={p.id} className="overflow-hidden cursor-pointer transition-colors hover:border-[#123B73]" onClick={() => setSelectedProperty(p)}>
                    <CardContent className="flex items-center justify-between p-6">
                      <div>
                        <h3 className="font-semibold">{p.title}</h3>
                        <p className="text-sm text-[#667085]">{p.address} • {formatPropertyPrice(p)}</p>
                        <p className="mt-1 text-xs text-[#667085]">
                          {tx("Posted by:", "တင်သူ:")} {p.owner.firstName} {p.owner.lastName} ({p.owner.email})
                        </p>
                      </div>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700 h-8 px-3 text-xs" onClick={() => handleVerifyProperty(p.id, "REJECTED")}>
                          <X className="mr-1 size-4" /> {tx("Reject", "ပယ်ချမည်")}
                        </Button>
                        <Button className="bg-green-600 hover:bg-green-700 h-8 px-3 text-xs" onClick={() => handleVerifyProperty(p.id, "VERIFIED")}>
                          <Check className="mr-1 size-4" /> {tx("Approve", "လက်ခံမည်")}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {section === "users" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{tx("User Management", "သုံးစွဲသူ စီမံခန့်ခွဲမှု")}</h2>
                <div className="flex gap-2 bg-[#F8FBFF] p-1 border border-[#E3E8EF] rounded-lg">
                  <button onClick={() => setRoleFilter("ALL")} className={`px-4 py-1.5 text-sm rounded-md transition-colors ${roleFilter === "ALL" ? "bg-white shadow-sm border border-[#E3E8EF] font-semibold text-[#123B73]" : "text-[#667085] hover:text-[#101828]"}`}>{tx("All", "အားလုံး")}</button>
                  <button onClick={() => setRoleFilter("SEEKER")} className={`px-4 py-1.5 text-sm rounded-md transition-colors ${roleFilter === "SEEKER" ? "bg-white shadow-sm border border-[#E3E8EF] font-semibold text-[#123B73]" : "text-[#667085] hover:text-[#101828]"}`}>{tx("Seeker", "အိမ်ရှာသူ")}</button>
                  <button onClick={() => setRoleFilter("LISTER")} className={`px-4 py-1.5 text-sm rounded-md transition-colors ${roleFilter === "LISTER" ? "bg-white shadow-sm border border-[#E3E8EF] font-semibold text-[#123B73]" : "text-[#667085] hover:text-[#101828]"}`}>{tx("Lister", "အိမ်တင်သူ")}</button>
                </div>
              </div>
              {users.map((u) => (
                <Card key={u.id} className="cursor-pointer hover:border-[#123B73] transition-colors" onClick={() => setSelectedUser(u)}>
                  <CardContent className="flex items-center justify-between p-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{u.firstName} {u.lastName}</h3>
                        <Badge variant="neutral">{u.role}</Badge>
                      </div>
                      <p className="text-sm text-[#667085]">{u.email}</p>
                    </div>
                    {u.role !== "ADMIN" && (
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        {!u.emailVerifiedAt && (
                          <Button variant="outline" className="text-blue-600 hover:bg-blue-50 hover:text-blue-700 h-8 px-3 text-xs" onClick={() => handleVerifyEmail(u.id)}>
                            <Check className="mr-1 size-4" /> {tx("Verify", "အတည်ပြုမည်")}
                          </Button>
                        )}
                        {u.isActive ? (
                          <Button variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700 h-8 px-3 text-xs" onClick={() => handleUserStatus(u.id, false)}>
                            <Lock className="mr-1 size-4" /> {tx("Suspend", "ပိတ်မည်")}
                          </Button>
                        ) : (
                          <Button variant="outline" className="text-green-600 hover:bg-green-50 hover:text-green-700 h-8 px-3 text-xs" onClick={() => handleUserStatus(u.id, true)}>
                            <Unlock className="mr-1 size-4" /> {tx("Activate", "ဖွင့်မည်")}
                          </Button>
                        )}
                        <Button variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700 h-8 px-3 text-xs" onClick={() => handleDeleteUser(u.id)}>
                          <Trash2 className="mr-1 size-4" /> {tx("Delete", "ဖျက်မည်")}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {section === "audit" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">{tx("System Audit Logs", "စနစ် မှတ်တမ်းများ")}</h2>
              <div className="rounded-xl border bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b bg-gray-50 text-[#667085]">
                      <tr>
                        <th className="px-4 py-3 font-medium">Time</th>
                        <th className="px-4 py-3 font-medium">Actor</th>
                        <th className="px-4 py-3 font-medium">Action</th>
                        <th className="px-4 py-3 font-medium">Target</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50/50">
                          <td className="whitespace-nowrap px-4 py-3 text-[#667085]">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : log.actorId ?? "System"}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="neutral" className="font-mono text-xs">{log.action}</Badge>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-[#667085] truncate max-w-[200px]">
                            {log.targetType} {log.targetId}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedProperty && (
        <Modal
          open={!!selectedProperty}
          onOpenChange={(open) => !open && setSelectedProperty(null)}
          title={selectedProperty.title}
          description={`${selectedProperty.address} • ${formatPropertyPrice(selectedProperty)}`}
        >
          <div className="space-y-6 p-5">
            <div>
              <h4 className="mb-3 font-semibold text-[#101828]">{tx("Property Details", "အိမ်အသေးစိတ်")}</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[#667085]">{tx("Type", "အမျိုးအစား")}</p>
                  <p className="font-medium capitalize">{selectedProperty.property_type}</p>
                </div>
                <div>
                  <p className="text-[#667085]">{tx("Purpose", "ရည်ရွယ်ချက်")}</p>
                  <p className="font-medium capitalize">{selectedProperty.purpose}</p>
                </div>
                <div>
                  <p className="text-[#667085]">{tx("Bedrooms", "အိပ်ခန်း")}</p>
                  <p className="font-medium">{selectedProperty.bedrooms}</p>
                </div>
                <div>
                  <p className="text-[#667085]">{tx("Bathrooms", "ရေချိုးခန်း")}</p>
                  <p className="font-medium">{selectedProperty.bathrooms}</p>
                </div>
                {selectedProperty.area_sqft && (
                  <div>
                    <p className="text-[#667085]">{tx("Area", "အကျယ်အဝန်း")}</p>
                    <p className="font-medium">{selectedProperty.area_sqft} sqft</p>
                  </div>
                )}
                {selectedProperty.description && (
                  <div className="col-span-2">
                    <p className="text-[#667085]">{tx("Description", "အကြောင်းအရာ")}</p>
                    <p className="mt-1 font-medium">{selectedProperty.description}</p>
                  </div>
                )}
                {selectedProperty.documents && selectedProperty.documents.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-[#667085]">{tx("Ownership Documents", "ပိုင်ဆိုင်မှု စာရွက်စာတမ်းများ")}</p>
                    <div className="mt-2 flex flex-col gap-2">
                      {selectedProperty.documents.map((doc, idx) => (
                        <PrivateDocumentButton key={idx} url={doc.url} label={tx(`Document ${idx + 1}`, `စာရွက်စာတမ်း ${idx + 1}`)} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-[#E1E6ED] pt-4">
              <h4 className="mb-3 font-semibold text-[#101828]">{tx("Owner Details", "ပိုင်ရှင်အသေးစိတ်")}</h4>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-[#667085]">{tx("Name", "အမည်")}</p>
                  <p className="font-medium">{selectedProperty.owner.firstName} {selectedProperty.owner.lastName}</p>
                </div>
                <div>
                  <p className="text-[#667085]">{tx("Email", "အီးမေးလ်")}</p>
                  <p className="font-medium">{selectedProperty.owner.email}</p>
                </div>
                {selectedProperty.owner.phone && (
                  <div>
                    <p className="text-[#667085]">{tx("Phone", "ဖုန်းနံပါတ်")}</p>
                    <p className="font-medium">{selectedProperty.owner.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-[#667085]">{tx("Role", "အခန်းကဏ္ဍ")}</p>
                  <p className="font-medium capitalize">{selectedProperty.owner.isAgent ? "Agent" : "Owner"}</p>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {selectedUser && (
        <Modal
          open={!!selectedUser}
          onOpenChange={(open) => !open && setSelectedUser(null)}
          title={`${selectedUser.firstName} ${selectedUser.lastName}`}
          description={selectedUser.email}
        >
          <div className="space-y-6 p-5">
            <div>
              <h4 className="mb-3 font-semibold text-[#101828]">{tx("User Details", "အချက်အလက်များ")}</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[#667085]">{tx("Role", "အခန်းကဏ္ဍ")}</p>
                  <p className="font-medium capitalize"><Badge variant="neutral">{selectedUser.role}</Badge></p>
                </div>
                <div>
                  <p className="text-[#667085]">{tx("Phone", "ဖုန်းနံပါတ်")}</p>
                  <p className="font-medium">{selectedUser.phone || "-"}</p>
                </div>
                <div>
                  <p className="text-[#667085]">{tx("Status", "အခြေအနေ")}</p>
                  <p className="font-medium">{selectedUser.isActive ? "Active" : "Suspended"}</p>
                </div>
                <div>
                  <p className="text-[#667085]">{tx("Joined", "အကောင့်ဖွင့်ရက်")}</p>
                  <p className="font-medium">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-[#667085]">{tx("Email Verified", "အီးမေးလ်အတည်ပြုပြီး")}</p>
                  <p className="font-medium">{selectedUser.emailVerifiedAt ? new Date(selectedUser.emailVerifiedAt).toLocaleDateString() : "No"}</p>
                </div>
              </div>
            </div>

            {selectedUser.verificationDocs && selectedUser.verificationDocs.length > 0 && (
              <div>
                <h4 className="mb-3 font-semibold text-[#101828]">{tx("Verification Documents", "စိစစ်ရေး အထောက်အထားများ")}</h4>
                <div className="space-y-3">
                  {selectedUser.verificationDocs.map(doc => (
                    <div key={doc.id} className="rounded-lg border p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-medium">{doc.documentType}</p>
                          <p className="text-xs text-[#667085]">Submitted {new Date(doc.createdAt).toLocaleDateString()}</p>
                        </div>
                        <Badge variant={doc.status === "VERIFIED" ? "success" : doc.status === "REJECTED" ? "danger" : "warning"} className="font-mono text-xs">
                          {doc.status}
                        </Badge>
                      </div>

                      <PrivateDocumentButton url={doc.documentUrl} />

                      {doc.status === "PENDING" && (
                        <div className="flex gap-2">
                          <Button variant="outline" className="text-red-600 h-8 px-3 text-xs" onClick={() => handleVerifyDocument(doc.id, "REJECTED")}>
                            {tx("Reject", "ပယ်ချမည်")}
                          </Button>
                          <Button className="bg-green-600 hover:bg-green-700 h-8 px-3 text-xs" onClick={() => handleVerifyDocument(doc.id, "VERIFIED")}>
                            {tx("Approve", "လက်ခံမည်")}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </DashboardShell>
  );
}
