"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApplicationFormTemplate, FormField } from "@/types/application";

type EditableForm = {
  id: string;
  title: string;
  description: string;
  fee: number;
  is_active?: boolean;
  questions: FormField[];
};

function parseFee(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function fieldsFromForm(form: ApplicationFormTemplate): FormField[] {
  if (Array.isArray(form.questions) && form.questions.length) return form.questions;
  return Array.isArray(form.steps) ? form.steps.flatMap((step) => Array.isArray(step.fields) ? step.fields : []) : [];
}

export default function EditFormPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formConfig, setFormConfig] = useState<EditableForm | null>(null);

  const { data: initialData, isLoading } = useQuery<ApplicationFormTemplate>({
    queryKey: ["admin-form", id],
    queryFn: async () => {
      const response = await fetch(`/api/admin/forms?id=${id}`);
      if (!response.ok) throw new Error("Unable to load application form.");
      return response.json();
    },
  });

  useEffect(() => {
    if (!initialData) return;
    // The query result is external state; copy it into the editable local draft.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormConfig({
      id: initialData.id,
      title: initialData.title,
      description: initialData.description || "",
      fee: parseFee(initialData.fee),
      is_active: (initialData as ApplicationFormTemplate & { is_active?: boolean }).is_active,
      questions: fieldsFromForm(initialData),
    });
  }, [initialData]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!formConfig) throw new Error("Form is not ready.");
      const response = await fetch("/api/admin/forms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formConfig, fee: parseFee(formConfig.fee) }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || result?.error || "Unable to update form.");
      }
    },
    onSuccess: () => {
      toast.success("Application form updated.");
      queryClient.invalidateQueries({ queryKey: ["admin-form", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-forms"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to update form."),
  });

  const updateField = <K extends keyof FormField>(index: number, key: K, value: FormField[K]) => {
    setFormConfig((current) => current ? { ...current, questions: current.questions.map((field, fieldIndex) => fieldIndex === index ? { ...field, [key]: value } : field) } : current);
  };

  const addField = () => {
    setFormConfig((current) => current ? { ...current, questions: [...current.questions, { id: `field-${Date.now()}`, label: "New question", type: "text", required: false }] } : current);
  };

  const removeField = (index: number) => {
    setFormConfig((current) => current ? { ...current, questions: current.questions.filter((_, fieldIndex) => fieldIndex !== index) } : current);
  };

  if (isLoading || !formConfig) {
    return <div className="mx-auto max-w-7xl space-y-6 p-5 pb-12 sm:p-8"><div className="flex justify-between"><Skeleton className="h-8 w-64" /><Skeleton className="h-10 w-24" /></div><div className="grid gap-6 lg:grid-cols-[320px_1fr]"><Skeleton className="h-72 rounded-xl" /><Skeleton className="h-[600px] rounded-xl" /></div></div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 pb-12 animate-fade-in sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm text-muted-foreground">Application forms</p><h1 className="font-display text-2xl font-bold">Edit {initialData?.title || "application form"}</h1><p className="mt-1 text-sm text-muted-foreground">All questions are shown on one application page.</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => router.push("/admin/forms")}>Back</Button><Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>{updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save changes</Button></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit"><CardHeader><CardTitle className="text-base">General settings</CardTitle></CardHeader><CardContent className="space-y-4">
          <div className="space-y-2"><Label>Title</Label><Input value={formConfig.title} onChange={(event) => setFormConfig({ ...formConfig, title: event.target.value })} /></div>
          <div className="space-y-2"><Label>Fee</Label><Input type="number" min="0" step="1" inputMode="numeric" value={Number.isFinite(formConfig.fee) ? formConfig.fee : 0} onChange={(event) => setFormConfig({ ...formConfig, fee: parseFee(event.target.value) })} /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={formConfig.description} onChange={(event) => setFormConfig({ ...formConfig, description: event.target.value })} /></div>
          <div className="flex items-center justify-between rounded-lg border border-border/50 p-3"><Label htmlFor="form-active">Available to applicants</Label><Switch id="form-active" checked={formConfig.is_active !== false} onCheckedChange={(checked) => setFormConfig({ ...formConfig, is_active: checked })} /></div>
        </CardContent></Card>

        <Card><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle className="text-base">Application questions</CardTitle><p className="mt-1 text-sm text-muted-foreground">Questions appear in this order on the public form.</p></div><Button variant="outline" size="sm" onClick={addField}><Plus className="mr-2 h-4 w-4" />Add question</Button></CardHeader><CardContent className="space-y-4">
          {formConfig.questions.map((field, index) => <div key={field.id} className="relative space-y-4 rounded-xl border border-border/50 bg-card p-4">
            <Button variant="ghost" size="icon" aria-label={`Remove question ${index + 1}`} className="absolute right-2 top-2 text-destructive hover:bg-destructive/10" onClick={() => removeField(index)}><Trash2 className="h-4 w-4" /></Button>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Question {index + 1}</p>
            <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Label</Label><Input value={field.label} onChange={(event) => updateField(index, "label", event.target.value)} /></div><div className="space-y-2"><Label>Field ID</Label><Input value={field.id} onChange={(event) => updateField(index, "id", event.target.value)} className="font-mono text-xs" /></div></div>
            <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Type</Label><Select value={field.type} onValueChange={(value) => updateField(index, "type", value as FormField["type"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="text">Short text</SelectItem><SelectItem value="textarea">Long text</SelectItem><SelectItem value="select">Dropdown</SelectItem><SelectItem value="number">Number</SelectItem><SelectItem value="date">Date</SelectItem><SelectItem value="tel">Phone</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="url">URL</SelectItem><SelectItem value="checkbox">Checkbox</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Placeholder</Label><Input value={field.placeholder || ""} onChange={(event) => updateField(index, "placeholder", event.target.value)} /></div></div>
            <div className="flex items-center justify-between rounded-lg border border-border/50 p-3"><Label htmlFor={`required-${field.id}`}>Required</Label><Switch id={`required-${field.id}`} checked={field.required === true} onCheckedChange={(checked) => updateField(index, "required", checked)} /></div>
            {field.type === "select" && <div className="space-y-3 border-t border-border/50 pt-4"><div className="flex items-center justify-between"><Label>Options</Label><Button variant="outline" size="sm" onClick={() => updateField(index, "options", [...(field.options || []), { label: "", value: "" }])}><Plus className="mr-2 h-3 w-3" />Add option</Button></div>{(field.options || []).map((option, optionIndex) => <div key={`${field.id}-option-${optionIndex}`} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><Input aria-label={`Option ${optionIndex + 1} label`} placeholder="Label" value={option.label} onChange={(event) => updateField(index, "options", (field.options || []).map((current, currentIndex) => currentIndex === optionIndex ? { ...current, label: event.target.value } : current))} /><Input aria-label={`Option ${optionIndex + 1} value`} placeholder="Value" value={option.value} onChange={(event) => updateField(index, "options", (field.options || []).map((current, currentIndex) => currentIndex === optionIndex ? { ...current, value: event.target.value } : current))} /><Button variant="ghost" size="icon" aria-label={`Remove option ${optionIndex + 1}`} onClick={() => updateField(index, "options", (field.options || []).filter((_, currentIndex) => currentIndex !== optionIndex))}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>)}</div>}
          </div>)}
          {!formConfig.questions.length && <div className="rounded-xl border border-dashed border-border/50 p-10 text-center text-sm text-muted-foreground">No questions yet. Add the first question to this form.</div>}
        </CardContent></Card>
      </div>
    </div>
  );
}
