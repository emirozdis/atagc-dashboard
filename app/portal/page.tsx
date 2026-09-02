"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type PortalData = { applications: Array<{ id: string; application_type: string; status: string; payment_status: string; submitted_at: string }>; assignment: { role: string; committee_id: string | null; committee?: { name?: string } | null } | null; delegation: { name: string; delegation_members?: Array<{ accepted: boolean }> } | null };

const labels: Record<string, string> = { delegate: "Delegate", chairboard: "Chairboard", delegation: "Delegation", press: "Press", observer: "Administrative Staff" };
const statusLabels: Record<string, string> = { pending: "Under review", under_review: "Under review", accepted: "Accepted", approved: "Accepted", rejected: "Not accepted", withdrawn: "Withdrawn" };

export default function PortalPage() {
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState("");
  const [submitted] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("submitted") === "1");
  useEffect(() => { fetch("/api/applications/mine").then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.message || "Unable to load portal."); return result; }).then(setData).catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load portal.")); }, []);

  if (error) return <div className="p-8 text-[#FDA4AF]">{error}</div>;
  if (!data) return <div className="mx-auto max-w-6xl space-y-8 p-5 sm:p-8" aria-label="Loading portal"><div className="space-y-3"><Skeleton className="h-4 w-28 bg-white/10" /><Skeleton className="h-10 w-72 bg-white/10" /><Skeleton className="h-5 w-full max-w-xl bg-white/10" /></div><Skeleton className="h-64 w-full rounded-3xl bg-white/10" /></div>;
  return <div className="mx-auto max-w-6xl p-5 sm:p-8"><div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm text-[#C4B5FD]">{submitted ? "Application received" : "Good to see you"}</p><h1 className="mt-2 text-3xl font-semibold">Your RavenMUN portal</h1><p className="mt-2 text-[#9CA3AF]">Keep track of applications, placement, and conference information.</p></div><Link href="/apply" className="inline-flex items-center justify-center rounded-xl bg-[#7C3AED] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#6D28D9]"><Plus className="mr-2 h-4 w-4" /> New application</Link></div>
    {submitted && <div className="mb-6 flex items-center gap-3 rounded-2xl border border-[#86EFAC]/20 bg-[#86EFAC]/10 p-4 text-sm text-[#BBF7D0]"><CheckCircle2 className="h-5 w-5" />Your application was submitted successfully. We will email you when its status changes.</div>}
    <section className="mt-8 rounded-3xl border border-white/10 bg-[#12101A] p-6 sm:p-8"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-xl font-semibold">Your applications</h2><p className="mt-1 text-sm text-[#9CA3AF]">Each application is reviewed separately.</p></div><Link href="/portal/applications" className="inline-flex items-center text-sm text-[#C4B5FD] hover:text-white">View all <ArrowRight className="ml-1 h-4 w-4" /></Link></div>{data.applications.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center"><p className="text-[#C3C7D1]">You have not submitted an application yet.</p><Link href="/apply" className="mt-4 inline-block text-sm text-[#C4B5FD]">Browse application types</Link></div> : <div className="divide-y divide-white/10">{data.applications.map((application) => <Link key={application.id} href={`/my-applications/${application.application_type}?applicationId=${encodeURIComponent(application.id)}`} className="flex flex-col justify-between gap-3 px-3 py-4 transition hover:bg-white/[0.03] sm:flex-row sm:items-center sm:px-4"><div><p className="font-medium">{labels[application.application_type] || application.application_type}</p><p className="mt-1 text-xs text-[#9CA3AF]">Submitted {new Date(application.submitted_at).toLocaleDateString("en-GB")}</p></div><span className={`w-fit rounded-full px-3 py-1 text-xs ${application.status === "accepted" || application.status === "approved" ? "bg-[#86EFAC]/10 text-[#BBF7D0]" : application.status === "rejected" ? "bg-[#FDA4AF]/10 text-[#FDA4AF]" : "bg-[#C4B5FD]/10 text-[#C4B5FD]"}`}>{statusLabels[application.status] || application.status}</span></Link>)}</div>}</section>
  </div>;
}
