"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ApplicationFormTemplate, FormStep, FormField } from "@/types/application";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function EditFormPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [formConfig, setFormConfig] = useState<Partial<ApplicationFormTemplate>>({});
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const { data: initialData, isLoading } = useQuery<ApplicationFormTemplate>({
    queryKey: ['admin-form', id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/forms?id=${id}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  useEffect(() => {
    if (initialData) {
      setFormConfig(initialData);
    }
  }, [initialData]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/forms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formConfig)
      });
      if (!res.ok) throw new Error("Update failed");
    },
    onSuccess: () => {
      toast.success("Form güncellendi");
      queryClient.invalidateQueries({ queryKey: ['admin-form', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-forms'] });
    },
    onError: () => toast.error("Hata oluştu")
  });

  // --- Step & Field Management Handlers ---

  const addStep = () => {
    const newStep: FormStep = { id: `step-${Date.now()}`, title: "Yeni Adım", fields: [] };
    setFormConfig(prev => ({ ...prev, steps: [...(prev.steps || []), newStep] }));
    setActiveStepIndex((formConfig.steps?.length || 0));
  };

  const removeStep = (idx: number) => {
    if (confirm("Bu adımı silmek istediğinize emin misiniz?")) {
      const newSteps = [...(formConfig.steps || [])];
      newSteps.splice(idx, 1);
      setFormConfig({ ...formConfig, steps: newSteps });
      setActiveStepIndex(Math.max(0, idx - 1));
    }
  };

  const updateStep = (idx: number, field: keyof FormStep, value: any) => {
    const newSteps = [...(formConfig.steps || [])];
    newSteps[idx] = { ...newSteps[idx], [field]: value };
    setFormConfig({ ...formConfig, steps: newSteps });
  };

  const addField = (stepIdx: number) => {
    const newField: FormField = { 
        id: `field-${Date.now()}`, 
        label: "Yeni Soru", 
        type: "text", 
        required: false 
    };
    const newSteps = [...(formConfig.steps || [])];
    newSteps[stepIdx].fields.push(newField);
    setFormConfig({ ...formConfig, steps: newSteps });
  };

  const removeField = (stepIdx: number, fieldIdx: number) => {
    const newSteps = [...(formConfig.steps || [])];
    newSteps[stepIdx].fields.splice(fieldIdx, 1);
    setFormConfig({ ...formConfig, steps: newSteps });
  };

  const updateField = (stepIdx: number, fieldIdx: number, key: keyof FormField, value: any) => {
    const newSteps = [...(formConfig.steps || [])];
    newSteps[stepIdx].fields[fieldIdx] = { ...newSteps[stepIdx].fields[fieldIdx], [key]: value };
    setFormConfig({ ...formConfig, steps: newSteps });
  };

  if (isLoading || !formConfig.steps) return <Skeleton className="h-[600px] max-w-5xl mx-auto" />;

  const activeStep = formConfig.steps[activeStepIndex];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-20">
      <Breadcrumbs items={[{ label: "Formlar", href: "/admin/forms" }, { label: "Düzenle" }]} />
      
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold font-display">Form Düzenleyici: {initialData?.title}</h2>
        <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Kaydet
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        
        {/* Sidebar: Config & Steps List */}
        <div className="col-span-12 md:col-span-4 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Genel Ayarlar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Başlık</Label>
                        <Input value={formConfig.title} onChange={e => setFormConfig({...formConfig, title: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <Label>Ücret (TL)</Label>
                        <Input type="number" value={formConfig.fee} onChange={e => setFormConfig({...formConfig, fee: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                        <Label>Açıklama</Label>
                        <Textarea value={formConfig.description} onChange={e => setFormConfig({...formConfig, description: e.target.value})} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between py-4">
                    <CardTitle className="text-base">Adımlar</CardTitle>
                    <Button variant="ghost" size="sm" onClick={addStep}><Plus className="w-4 h-4" /></Button>
                </CardHeader>
                <CardContent className="p-2 space-y-1">
                    {formConfig.steps.map((step, idx) => (
                        <div 
                            key={step.id} 
                            onClick={() => setActiveStepIndex(idx)}
                            className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors ${activeStepIndex === idx ? 'bg-primary/10 border border-primary/20' : 'hover:bg-secondary/30'}`}
                        >
                            <span className="text-sm font-medium">{idx + 1}. {step.title}</span>
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeStep(idx)}>
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>

        {/* Main Editor: Active Step Fields */}
        <div className="col-span-12 md:col-span-8 space-y-6">
            {activeStep ? (
                <Card className="border-primary/20">
                    <CardHeader className="bg-muted/5 border-b border-border/50 pb-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Adım Başlığı</Label>
                                <Input value={activeStep.title} onChange={e => updateStep(activeStepIndex, 'title', e.target.value)} className="font-semibold text-lg" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {activeStep.fields.map((field, fieldIdx) => (
                            <div key={field.id} className="p-4 bg-card border border-border/50 rounded-xl space-y-4 relative group hover:border-primary/20 transition-colors">
                                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeField(activeStepIndex, fieldIdx)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Soru Etiketi (Label)</Label>
                                        <Input value={field.label} onChange={e => updateField(activeStepIndex, fieldIdx, 'label', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Teknik ID (Benzersiz)</Label>
                                        <Input value={field.id} onChange={e => updateField(activeStepIndex, fieldIdx, 'id', e.target.value)} className="font-mono text-xs" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 items-end">
                                    <div className="space-y-2">
                                        <Label>Tip</Label>
                                        <Select value={field.type} onValueChange={val => updateField(activeStepIndex, fieldIdx, 'type', val)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="text">Kısa Metin</SelectItem>
                                                <SelectItem value="textarea">Uzun Metin</SelectItem>
                                                <SelectItem value="select">Seçim (Dropdown)</SelectItem>
                                                <SelectItem value="number">Sayı</SelectItem>
                                                <SelectItem value="date">Tarih</SelectItem>
                                                <SelectItem value="tel">Telefon</SelectItem>
                                                <SelectItem value="email">E-posta</SelectItem>
                                                <SelectItem value="checkbox">Onay Kutusu</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Zorunlu</Label>
                                        <div className="flex items-center h-10">
                                            <Switch checked={field.required} onCheckedChange={c => updateField(activeStepIndex, fieldIdx, 'required', c)} />
                                        </div>
                                    </div>
                                    {field.type === 'select' && (
                                        <div className="space-y-2">
                                            <Label>Seçenekler (JSON)</Label>
                                            <Input 
                                                value={JSON.stringify(field.options || [])} 
                                                onChange={e => {
                                                    try {
                                                        const parsed = JSON.parse(e.target.value);
                                                        updateField(activeStepIndex, fieldIdx, 'options', parsed);
                                                    } catch {}
                                                }}
                                                placeholder='[{"label":"A","value":"a"}]'
                                                className="font-mono text-xs"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        <Button variant="outline" className="w-full border-dashed" onClick={() => addField(activeStepIndex)}>
                            <Plus className="w-4 h-4 mr-2" /> Yeni Soru Ekle
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl">
                    Soldan bir adım seçin veya oluşturun.
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

// Change Log:
// - New Page: Form Builder UI.
// - Allows editing Form Title/Fee/Description.
// - Allows managing Steps (Add/Remove/Edit).
// - Allows managing Fields within Steps (Type, Label, ID, Required).