"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

type EmailTemplate = {
  notification_type: string;
  subject: string;
  heading: string;
  body_html: string;
  button_text: string | null;
  button_path: string | null;
  accent_color: string | null;
  is_enabled: boolean;
};

const labels: Record<string, string> = {
  application_received: "Application received",
  application_status: "Application status changed",
  committee_assignment: "Committee assignment",
  connection_request: "Connection request",
  connection_accepted: "Connection accepted",
  warning_issued: "Conduct notice",
  account_suspended: "Account suspended",
  password_changed: "Security notice",
  payment_approved: "Payment approved",
  payment_rejected: "Payment rejected",
  magic_link_invite: "Delegation invitation",
  email_verification: "Email verification code",
};

const variables = "{{name}}, {{code}}, {{application_type}}, {{application_type_slug}}, {{status}}, {{old_status}}, {{review_notes}}, {{application_id}}, {{portal_url}}, {{link}}";

export default function EmailTemplatesPage() {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [draft, setDraft] = useState<EmailTemplate | null>(null);

  const { data: templates = [], isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["admin-email-templates"],
    queryFn: async () => {
      const response = await fetch("/api/admin/email-templates");
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || result.error || "Unable to load email templates.");
      return result;
    },
  });

  const activeType = selectedType || templates[0]?.notification_type || null;
  const activeTemplate = useMemo(() => {
    if (!activeType) return null;
    if (draft?.notification_type === activeType) return draft;
    return templates.find((template) => template.notification_type === activeType) || null;
  }, [activeType, draft, templates]);

  const saveMutation = useMutation({
    mutationFn: async (template: EmailTemplate) => {
      const response = await fetch("/api/admin/email-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notificationType: template.notification_type,
          subject: template.subject,
          heading: template.heading,
          bodyHtml: template.body_html,
          buttonText: template.button_text,
          buttonPath: template.button_path,
          accentColor: template.accent_color,
          isEnabled: template.is_enabled,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || result.error || "Unable to save email template.");
    },
    onSuccess: () => {
      toast.success("Email template saved.");
      setDraft(null);
      queryClient.invalidateQueries({ queryKey: ["admin-email-templates"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resetMutation = useMutation({
    mutationFn: async (type: string) => {
      const response = await fetch(`/api/admin/email-templates?type=${encodeURIComponent(type)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || result.error || "Unable to reset email template.");
    },
    onSuccess: () => {
      toast.success("Template restored to its default.");
      setDraft(null);
      queryClient.invalidateQueries({ queryKey: ["admin-email-templates"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function selectTemplate(type: string) {
    setSelectedType(type);
    setDraft(null);
  }

  function updateDraft(changes: Partial<EmailTemplate>) {
    if (activeTemplate) setDraft({ ...activeTemplate, ...changes });
  }

  if (isLoading) {
    return <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8"><Skeleton className="h-10 w-72" /><div className="grid gap-6 lg:grid-cols-[260px_1fr]"><Skeleton className="h-[540px] rounded-3xl" /><Skeleton className="h-[540px] rounded-3xl" /></div></div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 pb-12 sm:p-8">
      <div>
        <p className="text-sm text-[#C4B5FD]">Communication</p>
        <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold"><Mail className="h-7 w-7 text-[#C4B5FD]" /> Email templates</h1>
        <p className="mt-2 max-w-2xl text-[#9CA3AF]">Customize the automated emails sent by RavenMUN. Changes apply to future messages only.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-3xl border border-white/10 bg-[#12101A] p-3">
          <p className="px-3 pb-2 pt-2 text-xs uppercase tracking-[0.2em] text-[#9CA3AF]">Templates</p>
          <div className="space-y-1">
            {templates.map((template) => (
              <button key={template.notification_type} type="button" onClick={() => selectTemplate(template.notification_type)} className={`w-full rounded-xl px-3 py-3 text-left text-sm transition ${activeType === template.notification_type ? "bg-[#7C3AED]/20 text-white" : "text-[#C3C7D1] hover:bg-white/5"}`}>
                <span className="block font-medium">{labels[template.notification_type] || template.notification_type}</span>
                <span className="mt-1 block text-xs text-[#9CA3AF]">{template.is_enabled ? "Enabled" : "Disabled"}</span>
              </button>
            ))}
          </div>
        </aside>

        {activeTemplate ? <section className="rounded-3xl border border-white/10 bg-[#12101A] p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-start">
            <div><p className="text-sm text-[#C4B5FD]">{labels[activeTemplate.notification_type] || activeTemplate.notification_type}</p><h2 className="mt-1 text-2xl font-semibold">Edit template</h2></div>
            <div className="flex items-center gap-3"><Label htmlFor="template-enabled" className="text-sm text-[#C3C7D1]">Enabled</Label><Switch id="template-enabled" checked={activeTemplate.is_enabled} onCheckedChange={(checked) => updateDraft({ is_enabled: checked })} /></div>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="template-subject">Subject</Label><Input id="template-subject" value={activeTemplate.subject} onChange={(event) => updateDraft({ subject: event.target.value })} maxLength={180} /></div>
            <div className="space-y-2"><Label htmlFor="template-heading">Heading</Label><Input id="template-heading" value={activeTemplate.heading} onChange={(event) => updateDraft({ heading: event.target.value })} maxLength={180} /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="template-body">Message HTML</Label><Textarea id="template-body" value={activeTemplate.body_html} onChange={(event) => updateDraft({ body_html: event.target.value })} className="min-h-56 font-mono text-sm" maxLength={30000} /><p className="text-xs text-[#9CA3AF]">Allowed HTML is sanitized before sending. Available variables: {variables}. Use the slug variable for application links.</p></div>
            <div className="space-y-2"><Label htmlFor="template-button-text">Button text <span className="text-[#9CA3AF]">(optional)</span></Label><Input id="template-button-text" value={activeTemplate.button_text || ""} onChange={(event) => updateDraft({ button_text: event.target.value || null })} maxLength={100} /></div>
            <div className="space-y-2"><Label htmlFor="template-button-path">Button link <span className="text-[#9CA3AF]">(optional)</span></Label><Input id="template-button-path" value={activeTemplate.button_path || ""} onChange={(event) => updateDraft({ button_path: event.target.value || null })} placeholder="/portal" maxLength={500} /></div>
            <div className="space-y-2"><Label htmlFor="template-accent">Accent color</Label><Input id="template-accent" value={activeTemplate.accent_color || "#9b7bda"} onChange={(event) => updateDraft({ accent_color: event.target.value || null })} placeholder="#9b7bda" /></div>
          </div>

          <div className="mt-8 flex flex-col-reverse justify-between gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
            <Button variant="outline" onClick={() => resetMutation.mutate(activeTemplate.notification_type)} disabled={resetMutation.isPending || saveMutation.isPending}><RotateCcw className="mr-2 h-4 w-4" />Restore default</Button>
            <Button onClick={() => saveMutation.mutate(activeTemplate)} disabled={saveMutation.isPending || resetMutation.isPending}><Save className="mr-2 h-4 w-4" />{saveMutation.isPending ? "Saving…" : "Save template"}</Button>
          </div>
        </section> : <section className="rounded-3xl border border-dashed border-white/10 p-10 text-center text-[#9CA3AF]">No email templates are available.</section>}
      </div>
    </div>
  );
}
