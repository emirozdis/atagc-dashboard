"use client";

import { useQuery } from "@tanstack/react-query";
import { Mail, Paperclip, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type ReceivedEmailSummary = {
  id: string;
  resend_email_id: string;
  from_address: string;
  to_addresses: string[];
  subject: string;
  message_id: string | null;
  attachments: Array<{ filename?: string; content_type?: string }>;
  received_at: string;
  is_read: boolean;
};

type ReceivedEmail = ReceivedEmailSummary & {
  cc_addresses: string[];
  bcc_addresses: string[];
  reply_to_addresses: string[];
  text_body: string | null;
  html_body: string | null;
  headers: Record<string, unknown>;
};

export default function ReceivedEmailsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: emails = [], isLoading, isFetching, refetch } = useQuery<ReceivedEmailSummary[]>({
    queryKey: ["admin-received-emails"],
    queryFn: async () => {
      const response = await fetch("/api/admin/received-emails");
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || result.error || "Unable to load received email.");
      return result;
    },
  });

  const { data: selectedEmail, isLoading: isLoadingSelected } = useQuery<ReceivedEmail>({
    queryKey: ["admin-received-email", selectedId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/received-emails/${encodeURIComponent(selectedId || "")}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || result.error || "Unable to load received email.");
      return result;
    },
    enabled: Boolean(selectedId),
  });

  const unreadCount = emails.filter((email) => !email.is_read).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 pb-12 sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm text-[#C4B5FD]">Communication</p><h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold"><Mail className="h-7 w-7 text-[#C4B5FD]" />Received email</h1><p className="mt-2 text-[#9CA3AF]">Inbound messages delivered to your Resend receiving domain.</p></div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />Refresh</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#12101A]">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><h2 className="font-semibold">Inbox</h2><span className="text-xs text-[#9CA3AF]">{unreadCount} unread</span></div>
          {isLoading ? <div className="space-y-3 p-5">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-20 rounded-xl" />)}</div> : emails.length === 0 ? <div className="p-10 text-center text-sm text-[#9CA3AF]">No received email has been archived yet.</div> : <div className="divide-y divide-white/10">{emails.map((email) => <button key={email.id} type="button" onClick={() => setSelectedId(email.id)} className={`w-full px-5 py-4 text-left transition hover:bg-white/[0.04] ${selectedId === email.id ? "bg-[#7C3AED]/10" : ""}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className={`truncate text-sm ${email.is_read ? "text-[#C3C7D1]" : "font-semibold text-white"}`}>{email.subject}</p><p className="mt-1 truncate text-xs text-[#9CA3AF]">{email.from_address}</p></div><time className="shrink-0 text-[11px] text-[#9CA3AF]">{new Date(email.received_at).toLocaleDateString("en-GB")}</time></div><div className="mt-2 flex items-center gap-2 text-[11px] text-[#9CA3AF]">{!email.is_read && <span className="h-1.5 w-1.5 rounded-full bg-[#C4B5FD]" />}{email.attachments?.length > 0 && <><Paperclip className="h-3 w-3" />{email.attachments.length}</>}</div></button>)}</div>}
        </section>

        <section className="min-h-[520px] rounded-3xl border border-white/10 bg-[#12101A] p-5 sm:p-8">
          {!selectedId ? <div className="flex min-h-[460px] items-center justify-center text-center text-sm text-[#9CA3AF]">Select a message to read it.</div> : isLoadingSelected || !selectedEmail ? <div className="space-y-4"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-5 w-1/2" /><Skeleton className="h-64 w-full rounded-2xl" /></div> : <article><div className="border-b border-white/10 pb-6"><p className="text-sm text-[#C4B5FD]">Received {new Date(selectedEmail.received_at).toLocaleString("en-GB")}</p><h2 className="mt-2 text-2xl font-semibold">{selectedEmail.subject}</h2><dl className="mt-5 space-y-2 text-sm"><div className="flex gap-3"><dt className="w-16 shrink-0 text-[#9CA3AF]">From</dt><dd className="break-all text-[#F5F3FF]">{selectedEmail.from_address}</dd></div><div className="flex gap-3"><dt className="w-16 shrink-0 text-[#9CA3AF]">To</dt><dd className="break-all text-[#F5F3FF]">{selectedEmail.to_addresses.join(", ") || "—"}</dd></div>{selectedEmail.cc_addresses.length > 0 && <div className="flex gap-3"><dt className="w-16 shrink-0 text-[#9CA3AF]">Cc</dt><dd className="break-all text-[#F5F3FF]">{selectedEmail.cc_addresses.join(", ")}</dd></div>}</dl></div><div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-5">{selectedEmail.html_body ? <div className="prose prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: selectedEmail.html_body }} /> : <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-[#C3C7D1]">{selectedEmail.text_body || "This message has no readable body."}</pre>}</div>{selectedEmail.attachments?.length > 0 && <div className="mt-5"><h3 className="text-sm font-semibold">Attachments</h3><div className="mt-2 flex flex-wrap gap-2">{selectedEmail.attachments.map((attachment, index) => <span key={`${attachment.filename || "attachment"}-${index}`} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-[#C3C7D1]">{attachment.filename || "Unnamed attachment"}</span>)}</div></div>}</article>}
        </section>
      </div>
    </div>
  );
}
