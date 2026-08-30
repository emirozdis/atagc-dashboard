"use client";

import { useEffect, useState } from "react";
import { Copy, Laptop, LogOut, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Session = { id: string; user_agent: string | null; ip_address: string | null; created_at: string; last_active: string; expires_at: string; revoked_at: string | null };

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [message, setMessage] = useState("");
  const [deviceCode, setDeviceCode] = useState<string | null>(null);
  const load = () => fetch("/api/auth/sessions").then((response) => response.json()).then((result) => setSessions(result.sessions || []));
  useEffect(() => { load(); }, []);
  async function revoke(sessionId?: string) { const response = await fetch("/api/auth/sessions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sessionId ? { sessionId } : {}) }); if (response.ok) { setMessage(sessionId ? "Session revoked." : "Other sessions revoked."); load(); } }
  async function createDeviceCode() { setMessage(""); const response = await fetch("/api/auth/device-codes", { method: "POST" }); const result = await response.json(); if (response.ok) setDeviceCode(result.code); else setMessage(result.message || "Unable to create device code."); }
  if (!sessions) return <div className="mx-auto max-w-4xl space-y-6 p-5 sm:p-8" aria-label="Loading sessions"><div className="space-y-3"><Skeleton className="h-4 w-28 bg-white/10" /><Skeleton className="h-10 w-72 bg-white/10" /><Skeleton className="h-5 w-full max-w-xl bg-white/10" /></div><div className="space-y-3 rounded-3xl border border-white/10 bg-[#12101A] p-5"><Skeleton className="h-12 w-full bg-white/10" /><Skeleton className="h-12 w-full bg-white/10" /></div></div>;
  return <div className="mx-auto max-w-4xl p-5 sm:p-8"><div className="mb-9"><p className="text-sm text-[#C4B5FD]">Account security</p><h1 className="mt-2 text-3xl font-semibold">Profile and devices</h1><p className="mt-2 text-[#9CA3AF]">Your sessions last through the conference season. Revoke anything you do not recognise.</p></div><div className="mb-5 grid gap-3 sm:grid-cols-2"><Button variant="outline" onClick={() => revoke()} className="border-white/10 text-[#C3C7D1] hover:bg-white/5"><LogOut className="mr-2 h-4 w-4" />Revoke other sessions</Button><Button variant="outline" onClick={createDeviceCode} className="border-[#C4B5FD]/30 text-[#C4B5FD] hover:bg-white/5"><Copy className="mr-2 h-4 w-4" />Generate device code</Button></div>{deviceCode && <div className="mb-5 rounded-2xl border border-[#7C3AED]/40 bg-[#7C3AED]/10 p-5"><p className="text-sm text-[#C3C7D1]">Enter this code on the other device within ten minutes:</p><p className="mt-3 select-all font-mono text-2xl font-semibold tracking-[0.22em] text-[#F5F3FF]">{deviceCode}</p></div>}{message && <p className="mb-5 text-sm text-[#C4B5FD]">{message}</p>}<div className="divide-y divide-white/10 rounded-3xl border border-white/10 bg-[#12101A]">{sessions.map((session) => <div key={session.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="rounded-xl bg-[#C4B5FD]/10 p-2 text-[#C4B5FD]">{session.user_agent?.toLowerCase().includes("mobile") ? <Smartphone className="h-5 w-5" /> : <Laptop className="h-5 w-5" />}</div><div><p className="font-medium">{session.user_agent || "Unknown device"}</p><p className="mt-1 text-xs text-[#9CA3AF]">Started {new Date(session.created_at).toLocaleString("en-GB")} · {session.ip_address || "Unknown network"}</p></div></div><Button variant="outline" size="sm" disabled={Boolean(session.revoked_at)} onClick={() => revoke(session.id)} className="border-white/10 text-[#C3C7D1] hover:bg-white/5">{session.revoked_at ? "Revoked" : "Revoke"}</Button></div>)}</div></div>;
}
