"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, FileText } from "lucide-react";

export type RavenApplicationQuestion = {
  id: string;
  label: string;
  type?: string;
  options?: Array<{ value: string; label: string }>;
};

export type RavenApplicationDetail = {
  id?: string;
  application_type?: string;
  status?: string;
  submitted_at?: string;
  review_notes?: string | null;
  form_data?: Record<string, unknown>;
  form_snapshot?: { title?: string; questions?: RavenApplicationQuestion[] };
  form?: { title?: string; questions?: RavenApplicationQuestion[] } | null;
};

const applicationLabels: Record<string, string> = { delegate: "Delegate", chairboard: "Chairboard", delegation: "Delegation", press: "Press", observer: "Observer" };
const statusLabels: Record<string, string> = { pending: "Under review", under_review: "Under review", accepted: "Accepted", approved: "Accepted", rejected: "Not accepted", withdrawn: "Withdrawn" };

export function ApplicationDetailView({ application, backHref = "/portal/applications" }: { application: RavenApplicationDetail; backHref?: string }) {
  const questions = application.form_snapshot?.questions || application.form?.questions || [];
  const formData = application.form_data || {};
  const title = application.form_snapshot?.title || application.form?.title || applicationLabels[application.application_type || ""] || "Application";

  return (
    <div className="mx-auto max-w-5xl p-5 sm:p-8">
      <Link href={backHref} className="inline-flex items-center text-sm text-[#9CA3AF] hover:text-white"><ArrowLeft className="mr-2 h-4 w-4" />Back to applications</Link>
      <div className="mt-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm text-[#C4B5FD]">Application details</p><h1 className="mt-2 text-3xl font-semibold">{title}</h1><p className="mt-2 flex items-center gap-2 text-sm text-[#9CA3AF]"><CalendarDays className="h-4 w-4" />Submitted {application.submitted_at ? new Date(application.submitted_at).toLocaleDateString("en-GB") : "Not specified"}</p></div><span className="w-fit rounded-full bg-[#C4B5FD]/10 px-3 py-1 text-xs text-[#C4B5FD]">{statusLabels[application.status || ""] || application.status || "Under review"}</span></div>
      {application.review_notes && <div className="mt-6 rounded-2xl border border-[#C4B5FD]/20 bg-[#C4B5FD]/10 p-4 text-sm text-[#C3C7D1]"><p className="font-medium text-white">Review note</p><p className="mt-1">{application.review_notes}</p></div>}
      <section className="mt-8 rounded-3xl border border-white/10 bg-[#12101A] p-6 sm:p-8"><h2 className="text-xl font-semibold">Submitted information</h2>{questions.length ? <div className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">{questions.map((question) => <ApplicationField key={question.id} question={question} value={formData[question.id]} />)}</div> : <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-[#9CA3AF]"><FileText className="mx-auto h-8 w-8 text-[#C4B5FD]" /><p className="mt-3">The submitted form fields are unavailable.</p></div>}</section>
    </div>
  );
}

function ApplicationField({ question, value }: { question: RavenApplicationQuestion; value: unknown }) {
  const stringValue = value === null || value === undefined || value === "" ? "Not provided" : String(value);
  const optionLabel = question.options?.find((option) => option.value === stringValue)?.label;
  const displayValue = optionLabel || stringValue;
  const isCommitteeChoice = /^choice[123]$/i.test(question.id) || /committee choice/i.test(question.label);
  return <div className={question.type === "textarea" ? "sm:col-span-2" : ""}><p className="text-xs uppercase tracking-[0.16em] text-[#9CA3AF]">{question.label}</p><p className={`mt-2 whitespace-pre-wrap text-sm text-[#F5F3FF] ${question.type === "textarea" ? "rounded-2xl border border-white/10 bg-black/15 p-4 leading-relaxed" : ""}`}>{isCommitteeChoice && displayValue !== "Not provided" ? displayValue.toUpperCase() : displayValue}</p></div>;
}
