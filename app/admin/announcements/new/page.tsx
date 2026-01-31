"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  Send,
  Users,
  Globe,
  Building2,
  CheckCircle2,
  FileText,
  ChevronRight,
  Check,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { UserSelectionTable } from "@/components/admin/UserSelectionTable";
import Link from "next/link";
import { Committee } from "@/types/admin";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { MultiSelectPopover, MultiSelectOption } from "@/components/ui/multi-select-popover";

export default function NewAnnouncementPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [activePreset, setActivePreset] = useState<"all" | "committee" | "custom">("custom");

  const [selectedCommitteeIds, setSelectedCommitteeIds] = useState<string[]>([]);

  const { data: committees = [] } = useQuery<Committee[]>({
    queryKey: ['committees'],
    queryFn: async () => {
      const res = await fetch("/api/admin/committees");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  const committeeOptions: MultiSelectOption[] = committees.map(c => ({
    label: c.name,
    value: c.id
  }));

  const selectedCommitteeNames = committees
    .filter(c => selectedCommitteeIds.includes(c.id))
    .map(c => c.name);

  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const { data: previewUsers = [], isLoading: loadingPreview } = useQuery({
    queryKey: ['preview-users', selectedUserIds],
    queryFn: async () => {
      const idsToFetch = selectedUserIds.slice(0, 50).join(",");
      const res = await fetch(`/api/admin/users?ids=${idsToFetch}`);
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      return json.data || [];
    },
    enabled: currentStep === 3 && selectedUserIds.length > 0
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { title, content };

      if (activePreset === 'all') {
        payload.targetType = 'all';
      } else if (activePreset === 'committee') {
        payload.targetType = 'committee';
        payload.committeeIds = selectedCommitteeIds;
      } else {
        payload.targetType = 'user';
        payload.userIds = selectedUserIds;
      }

      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast.success("Duyuru başarıyla oluşturuldu.");
      router.push("/admin/announcements");
    },
    onError: () => toast.error("Duyuru oluşturulamadı.")
  });

  const handlePresetSelect = (preset: "all" | "committee") => {
    if (preset === 'all') {
      setActivePreset("all");
      setSelectedUserIds([]);
      setSelectedCommitteeIds([]);
      toast.success("Hedef olarak 'Tüm Kullanıcılar' seçildi.");
    } else {
      setActivePreset("committee");
    }
  };
  
  const handleCommitteeSelectionChange = async (newCommitteeIds: string[]) => {
      const toastId = toast.loading("Komite üyeleri güncelleniyor...");
      try {
          const promises = newCommitteeIds.map(id => fetch(`/api/admin/users/ids?committee_id=${id}`).then(res => res.json()));
          const results = await Promise.all(promises);

          const allUserIds = Array.from(new Set(results.flat()));
          
          setSelectedUserIds(allUserIds);
          setSelectedCommitteeIds(newCommitteeIds);

          toast.success(`Toplam ${allUserIds.length} üye eklendi.`, { id: toastId });
      } catch (e) {
          toast.error("Üyeler getirilirken bir hata oluştu.", { id: toastId });
      }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!title.trim() || !content.trim()) {
        toast.error("Başlık ve içerik alanları zorunludur.");
        return;
      }
      setDirection('forward');
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (activePreset !== 'all' && selectedUserIds.length === 0) {
        toast.error("En az bir kullanıcı veya hedef kitle seçmelisiniz.");
        return;
      }
      setDirection('forward');
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setDirection('backward');
      setCurrentStep(currentStep - 1);
    }
  };

  const steps = [
    { id: 1, title: "İçerik", icon: FileText, description: "Duyuru detayları" },
    { id: 2, title: "Hedef Kitle", icon: Users, description: "Alıcı seçimi" },
    { id: 3, title: "Önizleme", icon: CheckCircle2, description: "Onay ve gönderim" },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
      <Breadcrumbs items={[{ label: "Duyurular", href: "/admin/announcements" }, { label: "Yeni Duyuru" }]} />
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/announcements">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Yeni Duyuru</h1>
          <p className="text-muted-foreground">
            Duyuru oluşturma sihirbazı.
          </p>
        </div>
      </div>

      {/* Enhanced Stepper */}
      <div className="relative py-4 px-8">
        {/* Connecting Lines */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-secondary -z-10 -translate-y-1/2 rounded-full" />
        <div
          className="absolute top-1/2 left-0 h-1 bg-primary -z-10 -translate-y-1/2 rounded-full transition-all duration-500 ease-in-out"
          style={{ width: `calc(${((currentStep - 1) / (steps.length - 1)) * 100}% - 4rem)` }}
        />

        <div className="flex justify-between w-full">
          {steps.map((s, i) => {
            const isActive = currentStep === s.id;
            const isCompleted = currentStep > s.id;

            return (
              <div key={s.id} className="flex flex-col items-center gap-3 relative group">
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-300 z-10 shadow-lg",
                    isActive
                      ? "border-primary bg-background text-primary scale-110 ring-4 ring-primary/20"
                      : isCompleted
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-secondary bg-background text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="w-6 h-6" /> : <s.icon className="w-5 h-5" />}
                </div>

                <div className="text-center absolute -bottom-10 w-32">
                  <div className={cn(
                    "text-sm font-semibold transition-colors duration-300",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}>
                    {s.title}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">
                    {s.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Separator className="my-8 opacity-0" />

      {/* Content Area with Animations */}
      <div className="max-w-4xl mx-auto min-h-[400px] relative overflow-hidden">

        {/* Step 1: Content */}
        <div className={cn(
          "transition-all duration-500 ease-in-out absolute w-full",
          currentStep === 1
            ? "translate-x-0 opacity-100 relative"
            : currentStep > 1
              ? "-translate-x-full opacity-0 absolute"
              : "translate-x-full opacity-0 absolute"
        )}>
          <Card className="bg-card border-border/50 shadow-md">
            <CardHeader>
              <CardTitle>Duyuru İçeriği</CardTitle>
              <CardDescription>Duyurunuzun başlığını ve metnini giriniz.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Başlık</Label>
                <Input
                  id="title"
                  placeholder="Örn: Açılış Töreni Hakkında"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="text-lg font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Mesaj</Label>
                <Textarea
                  id="content"
                  placeholder="Duyuru metni..."
                  className="min-h-[300px] text-base leading-relaxed resize-none font-normal"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Step 2: Receivers */}
        <div className={cn(
          "transition-all duration-500 ease-in-out absolute w-full",
          currentStep === 2
            ? "translate-x-0 opacity-100 relative"
            : currentStep < 2
              ? "translate-x-full opacity-0 absolute"
              : "-translate-x-full opacity-0 absolute"
        )}>
          <Card className="bg-card border-border/50 shadow-md">
            <CardHeader>
              <CardTitle>Hedef Kitle</CardTitle>
              <CardDescription>
                Duyurunun kimlere gönderileceğini seçiniz.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div
                  className={`cursor-pointer rounded-xl border p-4 flex flex-col items-center gap-3 transition-all hover:bg-secondary/10 ${activePreset === 'all' ? 'border-primary bg-primary/5 shadow-[0_0_0_1px_rgba(var(--primary))]' : 'border-border'}`}
                  onClick={() => handlePresetSelect('all')}
                >
                  <Globe className="w-6 h-6 text-primary" />
                  <div className="text-center">
                    <div className="font-semibold text-sm">Tüm Kullanıcılar</div>
                    <div className="text-xs text-muted-foreground">Herkese açık yayınla</div>
                  </div>
                </div>

                <div
                  className={`cursor-pointer rounded-xl border p-4 flex flex-col items-center gap-3 transition-all hover:bg-secondary/10 ${activePreset === 'committee' ? 'border-primary bg-primary/5 shadow-[0_0_0_1px_rgba(var(--primary))]' : 'border-border'}`}
                  onClick={() => handlePresetSelect('committee')}
                >
                  <Building2 className="w-6 h-6 text-primary" />
                  <div className="text-center">
                    <div className="font-semibold text-sm">Komiteye Özel</div>
                    <div className="text-xs text-muted-foreground">Komite üyelerini seç</div>
                  </div>
                </div>
              </div>

              {activePreset === 'committee' && (
                <div className="animate-in fade-in slide-in-from-top-2 p-4 bg-secondary/10 rounded-lg border border-border/50">
                  <Label className="mb-2 block">Komite Seçiniz</Label>
                  <MultiSelectPopover
                    options={committeeOptions}
                    selected={selectedCommitteeIds}
                    onChange={handleCommitteeSelectionChange}
                    placeholder="Komiteleri seçin"
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Seçtiğiniz komitelerin üyeleri alıcı listesine eklenecektir.
                  </p>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <Label>Özelleştirilmiş Kullanıcı Listesi ({selectedUserIds.length})</Label>
                <UserSelectionTable
                  selectedUsers={selectedUserIds}
                  onSelectionChange={(ids) => {
                    setSelectedUserIds(ids);
                    setActivePreset("custom");
                    setSelectedCommitteeIds([]);
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Step 3: Overview */}
        <div className={cn(
          "transition-all duration-500 ease-in-out absolute w-full",
          currentStep === 3
            ? "translate-x-0 opacity-100 relative"
            : "translate-x-full opacity-0 absolute"
        )}>
          <div className="space-y-6">
            <Card className="bg-card border-border/50 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Genel Bakış
                </CardTitle>
                <CardDescription>
                  Göndermeden önce detayları kontrol ediniz.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-muted-foreground uppercase tracking-widest text-xs font-semibold">Başlık</Label>
                  <div className="text-xl font-bold font-display">{title}</div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-muted-foreground uppercase tracking-widest text-xs font-semibold">İçerik Önizleme</Label>
                  <div className="bg-secondary/10 p-5 rounded-lg text-sm leading-relaxed whitespace-pre-wrap border border-border/50">
                    {content}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground uppercase tracking-widest text-xs font-semibold">Alıcılar</Label>
                      <div className="flex items-center gap-2">
                        {activePreset === 'all' ? (
                          <Badge variant="outline" className="text-base px-3 py-1 bg-green-500/10 text-green-500 border-green-500/20">
                            <Globe className="w-3 h-3 mr-1 inline" /> Tüm Kullanıcılar
                          </Badge>
                        ) : activePreset === 'committee' && selectedCommitteeIds.length > 0 ? (
                          <Badge variant="outline" className="text-base px-3 py-1 bg-purple-500/10 text-purple-500 border-purple-500/20">
                            <Building2 className="w-3 h-3 mr-1 inline" /> {selectedCommitteeNames.length <= 2 ? selectedCommitteeNames.join(", ") : `${selectedCommitteeNames.length} Komite`}
                          </Badge>
                        ) : (
                          <>
                            <Badge variant="outline" className="text-base px-3 py-1 bg-primary/10 text-primary border-primary/20">
                              {selectedUserIds.length} Kişi
                            </Badge>
                            <span className="text-sm text-muted-foreground">seçildi</span>
                          </>
                        )}
                      </div>
                    </div>

                    {selectedUserIds.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
                        className="gap-2"
                      >
                        {isPreviewExpanded ? "Listeyi Gizle" : "Listeyi Göster"}
                        {isPreviewExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>

                  {/* Accordion-like User List */}
                  <div className={cn(
                    "grid transition-all duration-300 ease-in-out overflow-hidden border rounded-lg bg-background",
                    isPreviewExpanded ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0 border-0"
                  )}>
                    <div className="min-h-0">
                      <div className="bg-muted/30 p-3 border-b text-xs font-medium text-muted-foreground flex justify-between">
                        <span>Seçili Kullanıcılar ({selectedUserIds.length})</span>
                        {selectedUserIds.length > 50 && <span>İlk 50 gösteriliyor</span>}
                      </div>
                      <ScrollArea className="h-[250px] w-full p-2">
                        {loadingPreview ? (
                          <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor...
                          </div>
                        ) : previewUsers.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {previewUsers.map((user: any) => (
                              <div key={user.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/10 transition-colors border border-transparent hover:border-border/50">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                  {user.full_name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="overflow-hidden">
                                  <div className="text-sm font-medium truncate">{user.full_name}</div>
                                  <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                                </div>
                              </div>
                            ))}
                            {selectedUserIds.length > 50 && (
                              <div className="col-span-full text-center py-2 text-xs text-muted-foreground italic">
                                ... ve {selectedUserIds.length - 50} kişi daha
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground text-sm">Listelenecek kullanıcı yok.</div>
                        )}
                      </ScrollArea>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Floating Footer Actions */}
      <div className="fixed bottom-6 left-0 right-0 md:left-64 z-20 pointer-events-none">
        <div className="max-w-xl mx-auto px-4">
          <div className="bg-card border border-border/50 shadow-md rounded-lg py-3 px-6 min-h-[56px] flex justify-between items-center gap-4 pointer-events-auto">
            {currentStep > 1 ? (
              <Button variant="outline" onClick={handleBack} className="px-4 py-2">
                <ArrowLeft className="w-4 h-4 mr-2" /> Geri
              </Button>
            ) : (
              <Link href="/admin/announcements">
                <Button variant="ghost" className="px-4 py-2">İptal</Button>
              </Link>
            )}

            {currentStep < 3 ? (
              <Button onClick={handleNext} className="px-6 py-2 shadow-md shadow-primary/15">
                İleri <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="px-6 py-2 shadow-md shadow-primary/15">
                {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Yayınla
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}