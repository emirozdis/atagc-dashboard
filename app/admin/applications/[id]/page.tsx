"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  BadgeCheck,
  ShieldCheck,
  Text as TextIcon,
  ArrowLeft,
  Calendar,
  MapPin,
  GraduationCap,
  Briefcase,
  Building2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

import { Application, Committee } from "@/types/admin";
import {
  KOMITE_OPTIONS,
  MUN_DENEYIMI_OPTIONS,
  INGILIZCE_OPTIONS,
  SINIF_OPTIONS
} from "@/types/application";
import Link from "next/link";

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;

  // Committee Assignment State
  const [selectedCommittee, setSelectedCommittee] = useState<string>("none");
  const [rejectionMode, setRejectionMode] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Queries
  const { data: application, isLoading: appLoading, error } = useQuery<Application>({
    queryKey: ['application', id],
    queryFn: async () => {
      const res = await fetch(`/api/applications/${id}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  const { data: committees = [] } = useQuery<Committee[]>({
    queryKey: ['committees'],
    queryFn: async () => {
      const res = await fetch("/api/admin/committees");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  // Set initial selected committee when data loads
  useEffect(() => {
    if (application?.user?.committee_members && application.user.committee_members.length > 0) {
      setSelectedCommittee(application.user.committee_members[0].committee.id);
    } else {
      setSelectedCommittee("none");
    }
  }, [application]);

  // Mutations
  const statusMutation = useMutation({
    mutationFn: async ({ status, notes }: { status: "approved" | "rejected", notes?: string }) => {
      const res = await fetch("/api/applications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: application?.id, status, review_notes: notes }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: (_, variables) => {
      toast.success("İşlem Başarılı", {
        description: `Başvuru ${variables.status === "approved" ? "onaylandı" : "reddedildi"}.`
      });
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      setRejectionMode(false);
      setRejectionReason("");
    },
    onError: () => toast.error("Durum güncellenemedi.")
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/committee-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: application?.user.id,
          committeeId: selectedCommittee === "none" ? null : selectedCommittee
        })
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast.success("Komite ataması güncellendi");
      queryClient.invalidateQueries({ queryKey: ['application', id] });
    },
    onError: () => toast.error("Atama yapılamadı.")
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20 gap-1.5 px-3 py-1"><CheckCircle className="w-4 h-4" /> Onaylandı</Badge>;
      case "rejected": return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 gap-1.5 px-3 py-1"><XCircle className="w-4 h-4" /> Reddedildi</Badge>;
      default: return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20 gap-1.5 px-3 py-1"><Clock className="w-4 h-4" /> Bekliyor</Badge>;
    }
  };

  const getLabel = (value: string, options: { value: string, label: string }[]) => {
    return options.find(o => o.value === value)?.label || value;
  };

  if (appLoading) {
    return (
      <div className="grid grid-cols-12 gap-6 p-6 max-w-7xl mx-auto">
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-[500px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="text-muted-foreground text-lg">Başvuru bulunamadı.</div>
        <Link href="/admin/applications">
          <Button variant="outline"> <ArrowLeft className="w-4 h-4 mr-2" /> Listeye Dön</Button>
        </Link>
      </div>
    );
  }

  const details = Array.isArray(application.user.user_details)
    ? application.user.user_details[0]
    : application.user.user_details;

  const info = details?.additional_info || {};
  const assignedCommittee = application.user.committee_members?.[0]?.committee;

  return (
    <div className="animate-fade-in pb-10">
      <Breadcrumbs items={[{ label: "Başvurular", href: "/admin/applications" }, { label: "Başvuru Detayı" }]} />
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/applications" className="text-muted-foreground hover:text-foreground transition-colors">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Başvuru Detayı</h1>
            <div className="flex items-center text-sm text-muted-foreground mt-1">
              <span className="opacity-60">ID: {application.id}</span>
              <Separator orientation="vertical" className="h-3 mx-2 bg-border/50" />
              <span>{new Date(application.submitted_at).toLocaleString("tr-TR", { dateStyle: 'long', timeStyle: 'short' })}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Sidebar - Profile Card (Left Column) */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
            <div className="bg-muted/30 p-8 border-b border-border/50 flex flex-col items-center text-center">
              <Avatar className="w-32 h-32 mb-5 border-4 border-background shadow-lg">
                <AvatarImage src={details?.profile_picture_url || undefined} className="object-cover" />
                <AvatarFallback className="text-3xl font-bold bg-muted text-muted-foreground">{application.user.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-bold tracking-tight mb-2">{application.user.full_name}</h2>
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <GraduationCap className="w-4 h-4" />
                <span className="font-medium">{details?.school_name}</span>
              </div>

              <div className="flex flex-col items-center gap-3 w-full">
                {getStatusBadge(application.status)}

                {/* Committee Badge in Profile */}
                {application.status === 'approved' && (
                  assignedCommittee ? (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1.5 px-3 py-1 mt-1">
                      <Building2 className="w-3.5 h-3.5" /> {assignedCommittee.name}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20 gap-1.5 px-3 py-1 mt-1 border-dashed">
                      <Clock className="w-3.5 h-3.5" /> Atama Bekleniyor
                    </Badge>
                  )
                )}
              </div>
            </div>

            <ScrollArea className="max-h-[600px]">
              <div className="p-6 space-y-8">
                {/* Contact Info */}
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
                    <BadgeCheck className="w-3.5 h-3.5 text-primary" />
                    İletişim & Kimlik
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between group">
                      <span className="text-sm text-muted-foreground">E-posta</span>
                      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{application.user.email}</span>
                    </div>
                    <Separator className="bg-border/40" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Telefon</span>
                      <span className="text-sm font-medium text-foreground">{details?.phone_number}</span>
                    </div>
                    <Separator className="bg-border/40" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Şehir</span>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">{info.city}</span>
                      </div>
                    </div>
                    <Separator className="bg-border/40" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Doğum Tarihi</span>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">
                          {details?.birth_date ? new Date(details.birth_date).toLocaleDateString("tr-TR") : "-"}
                        </span>
                      </div>
                    </div>
                    <Separator className="bg-border/40" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Sınıf</span>
                      <span className="text-sm font-medium text-foreground">{getLabel(info.grade, SINIF_OPTIONS)}</span>
                    </div>
                  </div>
                </div>

                {/* Experience Info */}
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                    MUN Deneyimi
                  </h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted/30 p-3 rounded-lg border border-border/30">
                        <span className="text-xs text-muted-foreground block mb-1">İngilizce</span>
                        <span className="text-sm font-medium">{getLabel(info.english_level, INGILIZCE_OPTIONS)}</span>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg border border-border/30">
                        <span className="text-xs text-muted-foreground block mb-1">Deneyim</span>
                        <span className="text-sm font-medium">{getLabel(info.mun_experience, MUN_DENEYIMI_OPTIONS)}</span>
                      </div>
                    </div>

                    <div className="bg-muted/30 p-3 rounded-lg border border-border/30">
                      <span className="text-xs text-muted-foreground block mb-1">Delegasyon Tercihi</span>
                      <span className="text-sm font-medium capitalize flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        {info.delegation_type}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Main Content (Right Column) */}
        <div className="col-span-12 lg:col-span-8 space-y-6">

          {/* Action Card */}
          <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 sticky top-6 z-10 transition-all">
            <div className="text-sm text-muted-foreground flex-1">
              Bu başvuru <span className="font-medium text-foreground">{getStatusBadge(application.status)}</span> durumundadır.
              {application.review_notes && (
                <p className="mt-1 text-red-500 flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5" />
                  İnceleme Notu: <span className="italic">{application.review_notes}</span>
                </p>
              )}
            </div>

            {rejectionMode ? (
              <div className="flex-1 w-full md:w-auto animate-in fade-in slide-in-from-right-4">
                <div className="flex flex-col gap-3">
                  <Textarea
                    placeholder="Reddetme sebebini yazınız..."
                    className="min-h-[80px] resize-none"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setRejectionMode(false)} disabled={statusMutation.isPending}>İptal</Button>
                    <Button
                      variant="destructive"
                      onClick={() => statusMutation.mutate({ status: "rejected", notes: rejectionReason })}
                      disabled={!rejectionReason.trim() || statusMutation.isPending}
                    >
                      {statusMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Reddet ve Bitir
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 w-full md:w-auto">
                {application.status === "pending" ? (
                  <>
                    <Button variant="destructive" className="bg-red-600 text-white hover:bg-red-700 flex-1 md:flex-none" onClick={() => setRejectionMode(true)} disabled={statusMutation.isPending}>
                      <XCircle className="w-4 h-4 mr-2" /> Reddet
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white flex-1 md:flex-none"
                      onClick={() => statusMutation.mutate({ status: "approved" })}
                      disabled={statusMutation.isPending}
                    >
                      {statusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" /> Onayla
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <></>
                )}
              </div>
            )}
          </div>

          {/* Committee Assignment Card (Only visible if Approved) */}
          {application.status === 'approved' && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">Komite Ataması</h3>
              </div>

              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                    Atanacak Komite
                  </label>
                  <Select value={selectedCommittee} onValueChange={setSelectedCommittee}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Komite Seçiniz" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Atama Yok (Boş) --</SelectItem>
                      {committees.map((committee) => (
                        <SelectItem key={committee.id} value={committee.id}>
                          {committee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => assignMutation.mutate()}
                  disabled={assignMutation.isPending}
                  className="w-full md:w-auto"
                >
                  {assignMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Briefcase className="w-4 h-4 mr-2" />}
                  Atamayı Kaydet
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border/50 bg-muted/10">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <TextIcon className="w-5 h-5 text-primary" />
                Başvuru Detayları
              </h3>
            </div>

            <div className="p-8 space-y-10">
              {/* Committee Preferences */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-xl border border-primary/20 bg-primary/5 relative overflow-hidden group">
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider mb-2 block">1. Komite Tercihi</span>
                  <p className="font-display font-medium text-lg">{getLabel(info.committee_pref_1, KOMITE_OPTIONS)}</p>
                </div>
                <div className="p-5 rounded-xl border border-border bg-muted/20 relative overflow-hidden group">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">2. Komite Tercihi</span>
                  <p className="font-display font-medium text-lg">{getLabel(info.committee_pref_2, KOMITE_OPTIONS)}</p>
                </div>
              </div>

              <div className="space-y-8">
                <section>
                  <h4 className="text-sm font-semibold text-foreground/90 border-l-4 border-primary pl-3 mb-4">Katılım Nedeni</h4>
                  <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed bg-muted/10 p-4 rounded-lg border border-border/30">
                    {info.reason_for_joining}
                  </div>
                </section>

                <section>
                  <h4 className="text-sm font-semibold text-foreground/90 border-l-4 border-primary pl-3 mb-4">Beklentiler</h4>
                  <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed bg-muted/10 p-4 rounded-lg border border-border/30">
                    {info.expectations}
                  </div>
                </section>

                <section>
                  <h4 className="text-sm font-semibold text-foreground/90 border-l-4 border-primary pl-3 mb-4">Kendini Tanıtma</h4>
                  <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed bg-muted/10 p-4 rounded-lg border border-border/30">
                    {info.self_introduction}
                  </div>
                </section>
              </div>

              {info.previous_conferences && (
                <>
                  <Separator />
                  <section>
                    <h4 className="text-sm font-semibold text-foreground/90 mb-4">Önceki Konferanslar</h4>
                    <p className="p-4 bg-muted/30 rounded-lg text-sm text-muted-foreground whitespace-pre-wrap border border-border/30">
                      {info.previous_conferences}
                    </p>
                  </section>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div >
  );
}

// Change Log:
// - Refactored `fetchApplication` and `fetchCommittees` to use `useQuery`.
// - Refactored `handleStatusUpdate` and `handleAssignCommittee` to use `useMutation`.
// - Replaced loader with `Skeleton` layout.