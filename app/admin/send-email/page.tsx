"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialForm = {
  from: "team@ravenmun.com",
  to: "",
  subject: "",
  text: "",
};

export default function SendEmailPage() {
  const [form, setForm] = useState(initialForm);
  const mutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || result.error || "Unable to send email.");
    },
    onSuccess: () => {
      toast.success("Email sent.");
      setForm((current) => ({ ...current, to: "", subject: "", text: "" }));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-5 pb-12 sm:p-8">
      <div>
        <p className="text-sm text-[#C4B5FD]">Communication</p>
        <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold"><Mail className="h-7 w-7 text-[#C4B5FD]" />Send an email</h1>
        <p className="mt-2 max-w-2xl text-[#9CA3AF]">Send a plain-text message from any ravenmun.com address. The sender domain must be verified with Resend before delivery will work.</p>
      </div>

      <section className="rounded-3xl border border-white/10 bg-[#12101A] p-6 sm:p-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="send-from">From</Label><Input id="send-from" type="email" value={form.from} onChange={(event) => update("from", event.target.value)} placeholder="team@ravenmun.com" autoComplete="off" /><p className="text-xs text-[#9CA3AF]">Must end in @ravenmun.com.</p></div>
          <div className="space-y-2"><Label htmlFor="send-to">To</Label><Input id="send-to" type="email" value={form.to} onChange={(event) => update("to", event.target.value)} placeholder="recipient@example.com" autoComplete="email" /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="send-subject">Subject</Label><Input id="send-subject" value={form.subject} onChange={(event) => update("subject", event.target.value)} maxLength={180} /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="send-text">Message</Label><Textarea id="send-text" value={form.text} onChange={(event) => update("text", event.target.value)} className="min-h-72" placeholder="Write your message here..." maxLength={100_000} /><p className="text-xs text-[#9CA3AF]">Plain text only. HTML is not accepted or sent.</p></div>
        </div>
        <div className="mt-8 flex justify-end border-t border-white/10 pt-6"><Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.from || !form.to || !form.subject || !form.text.trim()}><Send className="mr-2 h-4 w-4" />{mutation.isPending ? "Sending..." : "Send email"}</Button></div>
      </section>
    </div>
  );
}
