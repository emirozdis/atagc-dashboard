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
  ArrowLeft,
  Briefcase,
  Phone,
  MapPin,
  Calendar,
  FileText,
  School,
  Users
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import Link from "next/link";
import { Committee, Application } from "@/types/admin";
import { GRADE_OPTIONS } from "@/lib/constants";

export default function ApplicationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const [selectedCommittee, setSelectedCommittee] = useState<string>("none");
  const [rejectionMode, setRejectionMode] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState("");

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

  useEffect(() => {
    const committeeMemberData = application?.user?.committee_members;
    const committeeMembers = Array.isArray(committeeMemberData) ? committeeMemberData : (committeeMemberData ? [committeeMemberData] : []);
    
    if (committeeMembers && committeeMembers.length > 0) {
      setSelectedCommittee(committeeMembers[0].committee.id);
    } else {
      setSelectedCommittee("none");
    }
  }, [application]);

  const statusMutation = useMutation({
    mutationFn: async ({ status, notes }: { status: "approved" | "rejected", notes?: string }) => {
      const res = await fetch("/api/applications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: application?.id, status, review_notes: notes }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "İşlem başarısız");
      }
    },
    onSuccess: () => {
      toast.success("İşlem Başarılı");
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      setRejectionMode(false);
      setRejectionReason("");
    },
    onError: (err: Error) => toast.error(err.message)
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
    onError: () => toast.error("Hata oluştu")
  });

  if (appLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-[350px] space-y-6">
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
          <div className="flex-1">
            <Skeleton className="h-[600px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !application) return <div>Bulunamadı</div>;

  const user = application.user;
  const details = Array.isArray(user.user_details) ? user.user_details[0] : user.user_details;
  const formData = application.form_data || {};
  const formDef = Array.isArray(application.form) ? application.form[0] : application.form;

  const schoolName = details?.high_schools?.school_name || details?.additional_info?.manual_school_name || "Belirtilmemiş";

  const getFieldLabel = (key: string) => {
    if (formDef?.steps) {
      for (const step of formDef.steps) {
        if (step.fields) {
          const field = step.fields.find((f: any) => f.id === key);
          if (field) return field.label;
        }
      }
    }
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle className="w-3 h-3 mr-1" /> Onaylı</Badge>;
      case "rejected": return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="w-3 h-3 mr-1" /> Reddedildi</Badge>;
      default: return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><Clock className="w-3 h-3 mr-1" /> Bekliyor</Badge>;
    }
  };

  const gradeLabel = GRADE_OPTIONS.find(opt => opt.value === details?.grade)?.label;

  const renderFormData = () => {
    const entries = Object.entries(formData).filter(([key]) => 
        !['phone_number', 'school_name', 'birth_date', 'grade', 'city', 'high_school_id', 'manual_school_name'].includes(key)
    );

    if (entries.length === 0) {
      return <div className="text-center text-muted-foreground text-sm italic py-8">Ek form verisi bulunmamaktadır.</div>;
    }

    return (
      <div className="grid grid-cols-1 gap-6">
        {entries.map(([key, value]) => (
            <div key={key} className="space-y-1.5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-primary/50" />
                {getFieldLabel(key)}
              </div>
              <div className="text-sm bg-secondary/10 p-3 rounded-lg border border-border/50 whitespace-pre-wrap leading-relaxed text-foreground/90">
                {String(value || "-")}
              </div>
            </div>
        ))}
      </div>
    );
  };

  const delegationMember = Array.isArray(user.delegation_members) ? user.delegation_members[0] : user.delegation_members;
  const delegationInfo = delegationMember?.delegation;
  const actualDelegation = Array.isArray(delegationInfo) ? delegationInfo[0] : delegationInfo;
  const actualLeader = Array.isArray(actualDelegation?.leader) ? actualDelegation.leader[0] : actualDelegation?.leader;
  
  const leaderApp = Array.isArray(actualLeader?.application) ? actualLeader.application[0] : actualLeader?.application;
  const leaderStatus = leaderApp?.status;
  const leaderAppId = leaderApp?.id;
  const delegationName = actualDelegation?.name || "Bilinmeyen Delegasyon";

  const ownedDel = Array.isArray(user.owned_delegation) ? user.owned_delegation[0] : user.owned_delegation;
  const isLeader = !!ownedDel;

  const isDelegationMember = !!delegationMember;
  const isAcceptedToDelegation = delegationMember?.accepted === true;
  const isLeaderApproved = leaderStatus === 'approved';
  
  // A member can be approved ONLY IF they are accepted to the delegation AND their leader is approved.
  const canReviewApplication = !isDelegationMember || (isAcceptedToDelegation && isLeaderApproved);

  return (
    <div className="animate-fade-in pb-12 max-w-7xl mx-auto space-y-6">
      <Breadcrumbs items={[{ label: "Başvurular", href: "/admin/applications" }, { label: formDef?.title || "Başvuru" }]} />

      <div className="bg-card border border-border/50 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-4 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/admin/applications">
            <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-none">{user.full_name}</span>
            <span className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 gap-1.5 font-medium border-primary/20 text-primary bg-primary/5">
                {formDef?.title || "Başvuru"}
              </Badge>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              {new Date(application.submitted_at).toLocaleDateString('tr-TR')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {getStatusBadge(application.status)}

          {application.status === 'pending' && canReviewApplication && (
            <>
              <Button variant="destructive" size="sm" onClick={() => setRejectionMode(true)}>Reddet</Button>
              <Button className="bg-green-600 hover:bg-green-700 text-white" size="sm" onClick={() => statusMutation.mutate({ status: 'approved' })}>Onayla</Button>
            </>
          )}

          {application.status === 'pending' && isDelegationMember && !canReviewApplication && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 whitespace-nowrap">
              {!isAcceptedToDelegation ? "Delegasyon Lideri Onayı Bekliyor" : "Liderin Başvuru Onayı Bekleniyor"}
            </Badge>
          )}
        </div>
      </div>

      {rejectionMode && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card border p-6 rounded-lg max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-lg">Reddetme Sebebi</h3>
            <Textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="Lütfen reddetme sebebini giriniz..."
              className="min-h-[100px]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRejectionMode(false)}>İptal</Button>
              <Button variant="destructive" onClick={() => statusMutation.mutate({ status: 'rejected', notes: rejectionReason })}>Reddet ve Bitir</Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-[350px] space-y-6">
          <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-gradient-to-b from-muted/50 to-card p-6 flex flex-col items-center text-center border-b border-border/50">
              <Avatar className="w-24 h-24 mb-4 border-4 border-background shadow-xl ring-1 ring-border/10">
                <AvatarImage src={details?.profile_picture_url || undefined} className="object-cover" />
                <AvatarFallback className="text-xl bg-primary/10 text-primary font-bold">
                  {user.full_name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold">{user.full_name}</h2>
              <p className="text-xs text-muted-foreground mt-1 bg-secondary/50 px-2 py-0.5 rounded-full">{user.email}</p>
            </div>

            <div className="p-5 space-y-4 text-sm">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Phone className="w-4 h-4 shrink-0" />
                <span className="text-foreground">{details?.phone_number || "Belirtilmemiş"}</span>
              </div>
              <Separator />
              <div className="flex items-center gap-3 text-muted-foreground">
                <School className="w-4 h-4 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-foreground font-medium leading-tight">{schoolName}</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    {gradeLabel && <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">{gradeLabel}</Badge>}
                  </div>
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-3 text-muted-foreground">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="text-foreground">{details?.city || "-"}</span>
              </div>
              <Separator />
              <div className="flex items-center gap-3 text-muted-foreground">
                <Calendar className="w-4 h-4 shrink-0" />
                <span className="text-foreground">
                  {details?.birth_date ? new Date(details.birth_date).toLocaleDateString('tr-TR') : "-"}
                </span>
              </div>
              <Separator />
              <div className="flex items-start gap-3 text-muted-foreground">
                <Users className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="text-foreground">
                  {isLeader ? (
                    <div className="flex flex-col">
                      <span className="font-medium text-primary">{ownedDel?.name}</span>
                      <span className="text-[10px] font-medium mt-0.5">Delegasyon Lideri</span>
                    </div>
                  ) : delegationMember ? (
                    <div className="flex flex-col">
                      {leaderAppId ? (
                         <Link href={`/admin/applications/${leaderAppId}`} className="font-medium text-primary hover:underline">
                            Delegasyon: {delegationName}
                         </Link>
                      ) : (
                         <span className="font-medium text-primary">Delegasyon: {delegationName}</span>
                      )}
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        Lider Durumu: {leaderStatus === 'approved' ? 'Onaylı' : leaderStatus === 'rejected' ? 'Reddedildi' : 'Bekliyor'}
                      </span>
                    </div>
                  ) : "Bireysel Katılımcı"}
                </span>
              </div>
            </div>
          </div>

          {application.status === 'approved' && ['delegate', 'chair', 'committee_chairman'].includes(user.role) && (
            <div className="bg-primary/5 border border-primary/20 p-5 rounded-xl space-y-4 shadow-sm">
              <h3 className="font-semibold flex items-center gap-2 text-primary text-sm uppercase tracking-wide">
                <Briefcase className="w-4 h-4" /> Komite Ataması
              </h3>
              <div className="space-y-3">
                <Select value={selectedCommittee} onValueChange={setSelectedCommittee}>
                  <SelectTrigger className="bg-background border-primary/20">
                    <SelectValue placeholder="Komite Seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Atama Yok --</SelectItem>
                    {committees.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => assignMutation.mutate()}
                  disabled={assignMutation.isPending}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {assignMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Atamayı Kaydet"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-muted/30 px-6 py-4 border-b border-border/50 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-foreground">Başvuru Formu Cevapları</h3>
            </div>
            <div className="p-6">
              {renderFormData()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}