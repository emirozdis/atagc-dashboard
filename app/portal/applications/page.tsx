"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, FileText, Plus, XCircle } from "lucide-react";

type Application = {
  id: string;
  application_type: string;
  status: string;
  payment_status: string;
  submitted_at: string;
  review_notes?: string | null;
};

const labels: Record<string, string> = { delegate: "Delegate", chairboard: "Chairboard", delegation: "Delegation", press: "Press", observer: "Administrative Staff" };
const statusLabels: Record<string, string> = { pending: "Under review", under_review: "Under review", accepted: "Accepted", approved: "Accepted", rejected: "Not accepted", withdrawn: "Withdrawn" };

export default function PortalApplicationsPage() {
  const { data, isLoading, error } = useQuery<{ applications: Application[] }>({
    queryKey: ["portal-applications"],
    queryFn: async () => {
      const response = await fetch("/api/applications/mine");
      if (!response.ok) throw new Error("Unable to load your applications.");
      return response.json();
    },
  });

  if (isLoading) return <div className="mx-auto max-w-5xl p-5 sm:p-8"><div className="h-8 w-52 animate-pulse rounded bg-white/10" /><div className="mt-8 space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-white/5" />)}</div></div>;
  if (error) return <div className="mx-auto max-w-5xl p-5 text-[#FDA4AF] sm:p-8">{error instanceof Error ? error.message : "Unable to load your applications."}</div>;

  const applications = data?.applications || [];
  return (
    <div className="mx-auto max-w-5xl p-5 sm:p-8">
      <Link href="/portal" className="inline-flex items-center text-sm text-[#9CA3AF] hover:text-white"><ArrowLeft className="mr-2 h-4 w-4" />Back to overview</Link>
      <div className="mt-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><p className="text-sm text-[#C4B5FD]">Application history</p><h1 className="mt-2 text-3xl font-semibold">My applications</h1><p className="mt-2 text-[#9CA3AF]">Review every application you have submitted to RavenMUN.</p></div>
        <Link href="/apply" className="inline-flex items-center justify-center rounded-xl bg-[#7C3AED] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#6D28D9]"><Plus className="mr-2 h-4 w-4" />New application</Link>
      </div>
      <div className="mt-8 space-y-3">
        {applications.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-[#12101A] p-12 text-center"><FileText className="mx-auto h-10 w-10 text-[#C4B5FD]" /><h2 className="mt-4 text-xl font-semibold">No applications yet</h2><p className="mt-2 text-sm text-[#9CA3AF]">Choose an application type to get started.</p><Link href="/apply" className="mt-5 inline-flex items-center text-sm text-[#C4B5FD] hover:text-white">Browse applications <ArrowRight className="ml-1 h-4 w-4" /></Link></div>
        ) : applications.map((application) => <ApplicationCard key={application.id} application={application} />)}
      </div>
    </div>
  );
}

function ApplicationCard({ application }: { application: Application }) {
  const status = application.status;
  const accepted = status === "accepted" || status === "approved";
  const rejected = status === "rejected" || status === "withdrawn";
  const Icon = accepted ? CheckCircle2 : rejected ? XCircle : Clock3;
  const iconClass = accepted ? "text-[#86EFAC]" : rejected ? "text-[#FDA4AF]" : "text-[#C4B5FD]";
  return <Link href={`/my-applications/${application.application_type}?applicationId=${encodeURIComponent(application.id)}`} className="block rounded-2xl border border-white/10 bg-[#12101A] p-5 transition hover:border-[#C4B5FD]/40 hover:bg-[#1B1727] sm:flex sm:items-center sm:justify-between"><div className="flex items-start gap-4"><div className="rounded-xl bg-white/5 p-3"><Icon className={`h-5 w-5 ${iconClass}`} /></div><div><h2 className="font-semibold">{labels[application.application_type] || application.application_type}</h2><p className="mt-1 text-sm text-[#9CA3AF]">Submitted {new Date(application.submitted_at).toLocaleDateString("en-GB")}</p>{application.review_notes && <p className="mt-3 max-w-xl text-sm text-[#C3C7D1]">{application.review_notes}</p>}</div></div><span className={`mt-4 inline-flex w-fit rounded-full px-3 py-1 text-xs sm:mt-0 ${accepted ? "bg-[#86EFAC]/10 text-[#BBF7D0]" : rejected ? "bg-[#FDA4AF]/10 text-[#FDA4AF]" : "bg-[#C4B5FD]/10 text-[#C4B5FD]"}`}>{statusLabels[status] || status}</span></Link>;
}
