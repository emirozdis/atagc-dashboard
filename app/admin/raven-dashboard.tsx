"use client";

import Link from "next/link";
import { ArrowRight, Bell, CheckCircle2, Clock3, FileText, Users, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

type Stats = {
  stats: { totalApplications: number; pendingApplications: number; acceptedApplications: number; rejectedApplications: number; totalUsers: number; assignedUsers: number; totalDelegations: number };
  byType: Array<{ type: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  applicationsOverTime: Array<{ date: string; count: number }>;
  recentApplications: Array<{ id: string; application_type: string; status: string; submitted_at: string; user?: { full_name?: string; email?: string } | null }>;
};

const labels: Record<string, string> = { delegate: "Delegate", chairboard: "Chairboard", delegation: "Delegation", press: "Press", observer: "Observer" };
const COLORS = ["#C4B5FD", "#A78BFA", "#7C3AED", "#6D28D9", "#4C1D95"];

export default function RavenAdminDashboard() {
  const [data, setData] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/raven/stats")
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.message || "Unable to load dashboard."); return result; })
      .then(setData)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load dashboard."));
  }, []);

  if (error) return <div className="p-8 text-[#FDA4AF]">{error}</div>;
  if (!data) return <div className="mx-auto max-w-7xl space-y-8 p-5 sm:p-8" aria-label="Loading admin overview"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div className="space-y-3"><Skeleton className="h-4 w-40 bg-white/10" /><Skeleton className="h-10 w-64 bg-white/10" /><Skeleton className="h-5 w-96 max-w-full bg-white/10" /></div><Skeleton className="h-11 w-40 rounded-xl bg-white/10" /></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-32 rounded-2xl bg-white/10" />)}</div><div className="grid gap-5 xl:grid-cols-2">{[1, 2].map((item) => <Skeleton key={item} className="h-80 rounded-3xl bg-white/10" />)}</div><Skeleton className="h-64 rounded-3xl bg-white/10" /></div>;

  const cards = [
    { label: "Applications", value: data.stats.totalApplications, icon: FileText },
    { label: "Under review", value: data.stats.pendingApplications, icon: Clock3 },
    { label: "Accepted", value: data.stats.acceptedApplications, icon: CheckCircle2 },
    { label: "Registered accounts", value: data.stats.totalUsers, icon: Users },
  ];

  return <div className="mx-auto max-w-7xl p-5 sm:p-8">
    <div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm text-[#C4B5FD]">Conference operations</p><h1 className="mt-2 text-3xl font-semibold">Admin overview</h1><p className="mt-2 text-[#9CA3AF]">Review applications, assign teams, and keep participants informed.</p></div><Link href="/admin/announcements/new" className="inline-flex items-center justify-center rounded-xl bg-[#7C3AED] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#6D28D9]"><Bell className="mr-2 h-4 w-4" /> New announcement</Link></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border border-white/10 bg-[#12101A] p-5"><Icon className="h-5 w-5 text-[#C4B5FD]" /><p className="mt-4 text-3xl font-semibold">{value}</p><p className="mt-1 text-sm text-[#9CA3AF]">{label}</p></div>)}</div>
    <div className="mt-8 grid gap-5 xl:grid-cols-2">
      <section className="rounded-3xl border border-white/10 bg-[#12101A] p-6"><div className="mb-5"><h2 className="text-xl font-semibold">Applications by type</h2><p className="mt-1 text-sm text-[#9CA3AF]">Every application type is reviewed independently.</p></div><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.byType}><XAxis dataKey="type" tick={{ fill: "#9CA3AF", fontSize: 12 }} tickFormatter={(value) => labels[value] || value} /><YAxis allowDecimals={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} /><Tooltip contentStyle={{ background: "#1B1727", border: "1px solid #4C1D95", color: "#F5F3FF" }} /><Bar dataKey="count" fill="#A78BFA" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
      <section className="rounded-3xl border border-white/10 bg-[#12101A] p-6"><div className="mb-5"><h2 className="text-xl font-semibold">Application status</h2><p className="mt-1 text-sm text-[#9CA3AF]">Current review funnel.</p></div><div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.byStatus.filter((item) => item.count > 0)} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={88} label={({ name, value }) => `${name}: ${value}`}>{data.byStatus.filter((item) => item.count > 0).map((item, index) => <Cell key={item.status} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip contentStyle={{ background: "#1B1727", border: "1px solid #4C1D95", color: "#F5F3FF" }} /></PieChart></ResponsiveContainer></div></section>
    </div>
    <div className="mt-5 grid gap-5 lg:grid-cols-3"><section className="rounded-3xl border border-white/10 bg-[#12101A] p-6 lg:col-span-2"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-xl font-semibold">Recent applications</h2><p className="mt-1 text-sm text-[#9CA3AF]">The latest submissions across all five application types.</p></div><Link href="/admin/applications" className="inline-flex items-center text-sm text-[#C4B5FD]">View all <ArrowRight className="ml-1 h-4 w-4" /></Link></div><div className="divide-y divide-white/10">{data.recentApplications.map((application) => <Link key={application.id} href={`/admin/applications/${application.id}`} className="flex flex-col justify-between gap-2 py-4 sm:flex-row sm:items-center"><div><p className="font-medium">{application.user?.full_name || application.user?.email || "Applicant"}</p><p className="text-xs text-[#9CA3AF]">{labels[application.application_type] || application.application_type} · {new Date(application.submitted_at).toLocaleDateString("en-GB")}</p></div><span className="w-fit rounded-full bg-[#C4B5FD]/10 px-3 py-1 text-xs text-[#C4B5FD]">{application.status}</span></Link>)}</div></section><section className="rounded-3xl border border-white/10 bg-[#12101A] p-6"><h2 className="text-xl font-semibold">Operations</h2><div className="mt-5 space-y-3"><Link href="/admin/users" className="flex items-center justify-between rounded-xl border border-white/10 p-4 text-sm hover:bg-white/5">People and role assignment <ArrowRight className="h-4 w-4 text-[#C4B5FD]" /></Link><Link href="/admin/committees" className="flex items-center justify-between rounded-xl border border-white/10 p-4 text-sm hover:bg-white/5">Committee setup <UsersRound className="h-4 w-4 text-[#C4B5FD]" /></Link><div className="rounded-xl border border-white/10 p-4 text-sm"><p className="text-[#9CA3AF]">Assigned conference accounts</p><p className="mt-1 text-2xl font-semibold">{data.stats.assignedUsers}</p></div><div className="rounded-xl border border-white/10 p-4 text-sm"><p className="text-[#9CA3AF]">Delegations</p><p className="mt-1 text-2xl font-semibold">{data.stats.totalDelegations}</p></div></div></section></div>
    <section className="mt-5 rounded-3xl border border-white/10 bg-[#12101A] p-6"><div className="mb-5"><h2 className="text-xl font-semibold">Submissions over time</h2><p className="mt-1 text-sm text-[#9CA3AF]">Last 30 submission days.</p></div><div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.applicationsOverTime}><XAxis dataKey="date" tick={{ fill: "#9CA3AF", fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} /><Tooltip contentStyle={{ background: "#1B1727", border: "1px solid #4C1D95", color: "#F5F3FF" }} /><Bar dataKey="count" fill="#C4B5FD" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
  </div>;
}
