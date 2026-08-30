"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

type Log = { id: string; scanned_at: string; result: string; user?: { full_name?: string; email?: string; role?: string } | null; scanner?: { full_name?: string } | null };

export default function SecurityLogsPage() {
  const [logs, setLogs] = useState<Log[] | null>(null);
  useEffect(() => { fetch("/api/security/logs").then((r) => r.json()).then(setLogs); }, []);
  if (!logs) return <div className="flex min-h-[400px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  return <div className="mx-auto max-w-6xl p-6"><div className="mb-8 flex items-center gap-3"><ShieldCheck className="h-6 w-6 text-primary" /><div><h1 className="text-2xl font-semibold">Security entry logs</h1><p className="text-sm text-muted-foreground">Recent participant scans and results.</p></div></div><div className="overflow-hidden rounded-2xl border border-border bg-card"><div className="divide-y divide-border">{logs.map((log) => <div key={log.id} className="flex flex-col justify-between gap-2 p-4 sm:flex-row"><div><p className="font-medium">{log.user?.full_name || "Unknown participant"}</p><p className="text-sm text-muted-foreground">Scanned by {log.scanner?.full_name || "Staff"}</p></div><div className="text-left sm:text-right"><p className={log.result === "allowed" ? "text-green-400" : "text-red-400"}>{log.result}</p><p className="text-xs text-muted-foreground">{new Date(log.scanned_at).toLocaleString("en-GB")}</p></div></div>)}{logs.length === 0 && <p className="p-8 text-center text-muted-foreground">No scans yet.</p>}</div></div></div>;
}
