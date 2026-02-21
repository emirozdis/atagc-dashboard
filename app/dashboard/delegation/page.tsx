"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { 
  Copy, Plus, Check, Users, Trash2, X, 
  Send, Mail, Clock, RefreshCcw, ShieldCheck, Ticket
} from "lucide-react";
import { toast } from "sonner";

type InviteCode = {
  invite_code: string;
  delegation: string;
  uses_left: number | null;
  created_at: string;
};

type MagicLink = {
  id: string;
  sent_to: string;
  used: boolean;
  created_at: string;
};

type DelegationMember = {
  user_id: string;
  joined_at: string;
  accepted: boolean | null;
  users: {
    full_name: string;
    email: string;
    application?: { status: string }[];
  };
};

type MembersResponse = { 
  success: boolean; 
  data: DelegationMember[]; 
  is_leader: boolean; 
  has_delegation: boolean;
};

export default function DelegationPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("members");
  
  // Dialogs
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  
  // Forms
  const [usesLeft, setUsesLeft] = useState("");
  const [magicLinkEmail, setMagicLinkEmail] = useState("");
  
  // UI State
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // --- Queries ---

  const { data: profileData } = useQuery({
    queryKey: ['participant-me'],
    queryFn: async () => {
      const res = await fetch("/api/participant/me");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });
  
  const leaderAppStatus = profileData?.application?.status;

  const { data: membersData, isLoading: membersLoading } = useQuery<MembersResponse>({
    queryKey: ["delegation-members"],
    queryFn: async () => {
      const res = await fetch("/api/delegation/list_delegation_members");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const isLeader = membersData?.is_leader === true;

  const { data: codesData, isLoading: codesLoading } = useQuery<{ success: boolean; data: InviteCode[] }>({
    queryKey: ["delegation-invite-codes"],
    queryFn: async () => {
      const res = await fetch("/api/delegation/list_invite_codes");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: isLeader // Only fetch if leader
  });

  const { data: magicLinksData, isLoading: magicLinksLoading } = useQuery<{ data: MagicLink[] }>({
    queryKey: ["delegation-magic-links"],
    queryFn: async () => {
      const res = await fetch("/api/delegation/magiclinks");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: isLeader // Only fetch if leader
  });

  // --- Mutations ---

  const createCodeMutation = useMutation({
    mutationFn: async (usesLeftValue: number | undefined) => {
      const body: Record<string, any> = {};
      if (usesLeftValue !== undefined) body.uses_left = usesLeftValue;
      
      const res = await fetch("/api/delegation/new_invite_code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegation-invite-codes"] });
      setCodeDialogOpen(false);
      setUsesLeft("");
      toast.success("Davet kodu oluşturuldu");
    },
    onError: () => toast.error("Kod oluşturulamadı")
  });

  const magicLinkMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/delegation/create_magiclink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sent_to: email }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegation-magic-links"] });
      setMagicLinkEmail("");
      toast.success("Davet e-postası gönderildi");
    },
    onError: () => toast.error("Davet gönderilemedi")
  });

  const revokeLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/delegation/magiclinks?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegation-magic-links"] });
      toast.success("Bağlantı iptal edildi");
    },
    onError: () => toast.error("Silme başarısız")
  });

  const memberActionMutation = useMutation({
    mutationFn: async ({ target_user_id, action }: { target_user_id: string; action: "accept" | "reject" | "remove" }) => {
      const res = await fetch("/api/delegation/change_accepted_status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_user_id, action }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegation-members"] });
      toast.success("İşlem başarılı");
    },
    onError: () => toast.error("İşlem başarısız")
  });

  // --- Handlers ---

  const handleCreateCode = () => {
    const parsed = usesLeft.trim() ? parseInt(usesLeft, 10) : undefined;
    createCodeMutation.mutate(parsed);
  };

  const handleSendMagicLink = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!magicLinkEmail.trim()) return;
    magicLinkMutation.mutate(magicLinkEmail.trim());
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
    toast.success("Kopyalandı");
  };

  const members = membersData?.data ?? [];
  const inviteCodes = codesData?.data ?? [];
  const magicLinks = magicLinksData?.data ?? [];

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      <Breadcrumbs items={[{ label: "Panel", href: "/dashboard" }, { label: "Delegasyon" }]} />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/50 pb-6">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">
            {isLeader ? "Delegasyon Yönetimi" : "Delegasyon Ekibi"}
          </h2>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <p className="text-muted-foreground">
              {isLeader ? "Ekibinizi ve davetlerinizi yönetin." : "Ekip arkadaşlarınızın listesi."}
            </p>
            {isLeader && (
              <>
                <div className="h-4 w-px bg-border hidden sm:block" />
                <div className="flex items-center gap-2 text-sm bg-secondary/30 px-2 py-1 rounded-md border border-border/50">
                    <span className="text-muted-foreground">Kendi Başvurunuz:</span>
                    {leaderAppStatus === 'approved' ? <span className="font-semibold text-emerald-600 flex items-center gap-1"><Check className="w-3 h-3"/> Onaylı</span> :
                     leaderAppStatus === 'rejected' ? <span className="font-semibold text-red-600 flex items-center gap-1"><X className="w-3 h-3"/> Reddedildi</span> :
                     leaderAppStatus === 'pending' ? <span className="font-semibold text-amber-600 flex items-center gap-1"><Clock className="w-3 h-3"/> Bekliyor</span> :
                     <span>Başvuru Yok</span>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={cn("grid w-full", isLeader ? "grid-cols-2 md:w-[400px]" : "grid-cols-1 md:w-[200px]")}>
          <TabsTrigger value="members" className="gap-2">
            <Users className="w-4 h-4" /> Üyeler
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">{members.length}</Badge>
          </TabsTrigger>
          {isLeader && (
            <TabsTrigger value="invites" className="gap-2">
              <Ticket className="w-4 h-4" /> Davetler
            </TabsTrigger>
          )}
        </TabsList>

        {/* MEMBERS TAB */}
        <TabsContent value="members" className="space-y-4 animate-in fade-in slide-in-from-left-2">
          <Card className="border-border/50 shadow-sm bg-card overflow-hidden">
            <CardHeader className="border-b border-border/50 bg-muted/5 pb-4">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">Delegasyon Üyeleri</CardTitle>
                  <CardDescription>Delegasyona katılan kişilerin listesi.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {membersLoading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                </div>
              ) : members.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                  <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 opacity-40" />
                  </div>
                  <p>Henüz delegasyon üyesi bulunmuyor.</p>
                  {isLeader && (
                    <Button variant="link" onClick={() => setActiveTab("invites")} className="mt-2">
                      Hemen birilerini davet et &rarr;
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="pl-6">Ad Soyad</TableHead>
                      <TableHead>E-posta</TableHead>
                      <TableHead>Başvuru Durumu</TableHead>
                      {isLeader && <TableHead className="text-right pr-6">İşlemler</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => {
                      const appStatus = member.users.application?.[0]?.status;
                      const isAccepted = member.accepted === true;
                      const isRejected = member.accepted === false;

                      return (
                        <TableRow
                          key={member.user_id}
                          className={cn(
                            "transition-colors",
                            isAccepted ? "bg-emerald-500/5 hover:bg-emerald-500/10" : 
                            isRejected ? "bg-red-500/5 hover:bg-red-500/10" : 
                            "hover:bg-muted/30"
                          )}
                        >
                          <TableCell className="font-medium pl-6">
                            {member.users.full_name}
                            {isAccepted && <span className="ml-2 text-[10px] text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">Kabul Edildi</span>}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{member.users.email}</TableCell>
                          <TableCell>
                            {appStatus === 'approved' ? (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1"><ShieldCheck className="w-3 h-3" /> Onaylı</Badge>
                            ) : appStatus === 'rejected' ? (
                              <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">Reddedildi</Badge>
                            ) : appStatus === 'pending' ? (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Bekliyor</Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs italic">Başvuru Yapmadı</span>
                            )}
                          </TableCell>
                          {isLeader && (
                            <TableCell className="text-right pr-6">
                              {isAccepted ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        disabled={memberActionMutation.isPending}
                                        onClick={() => memberActionMutation.mutate({ target_user_id: member.user_id, action: "remove" })}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Üyeyi Çıkar</p></TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 hover:border-emerald-500/50"
                                    disabled={memberActionMutation.isPending}
                                    onClick={() => memberActionMutation.mutate({ target_user_id: member.user_id, action: "accept" })}
                                  >
                                    <Check className="w-3 h-3 mr-1.5" /> Kabul Et
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-500/10"
                                    disabled={memberActionMutation.isPending}
                                    onClick={() => memberActionMutation.mutate({ target_user_id: member.user_id, action: "reject" })}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* INVITES TAB (Only for Leader) */}
        {isLeader && (
          <TabsContent value="invites" className="space-y-6 animate-in fade-in slide-in-from-right-2">
            
            <div className="grid gap-6 md:grid-cols-2 items-start">
              
              {/* LEFT COLUMN: MAGIC LINKS */}
              <div className="space-y-6">
                {/* CREATE MAGIC LINK CARD */}
                <Card className="border-primary/20 bg-primary/5 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-primary">
                      <Send className="w-5 h-5" /> Hızlı Davet
                    </CardTitle>
                    <CardDescription>
                      E-posta adresine özel, tek kullanımlık kayıt bağlantısı gönderin.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSendMagicLink} className="flex gap-2">
                      <Input
                        placeholder="ornek@email.com"
                        value={magicLinkEmail}
                        onChange={(e) => setMagicLinkEmail(e.target.value)}
                        className="bg-background"
                      />
                      <Button type="submit" disabled={magicLinkMutation.isPending || !magicLinkEmail}>
                        {magicLinkMutation.isPending ? <RefreshCcw className="w-4 h-4 animate-spin" /> : "Gönder"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* MAGIC LINKS LIST CARD */}
                <Card className="border-border/50 bg-card overflow-hidden">
                  <CardHeader className="pb-4 border-b border-border/50 bg-muted/5">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      Gönderilen Bağlantılar
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {magicLinksLoading ? (
                      <div className="p-4 space-y-3">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : magicLinks.length === 0 ? (
                      <div className="p-8 text-center text-sm text-muted-foreground">Gönderilmiş davet bulunmuyor.</div>
                    ) : (
                      <div className="max-h-[400px] overflow-y-auto">
                        <Table>
                          <TableHeader className="bg-muted/5 sticky top-0 z-10">
                            <TableRow className="border-b border-border/50 hover:bg-transparent">
                              <TableHead className="h-10 text-xs uppercase tracking-wider font-semibold text-muted-foreground pl-4">E-posta</TableHead>
                              <TableHead className="h-10 text-xs uppercase tracking-wider font-semibold text-muted-foreground text-right pr-4">Durum</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {magicLinks.map((link) => (
                              <TableRow key={link.id} className="hover:bg-muted/30 transition-colors border-b border-border/40 last:border-0">
                                <TableCell className="font-medium text-sm py-3 pl-4">
                                  {link.sent_to}
                                </TableCell>
                                <TableCell className="text-right py-3 pr-4">
                                  {link.used ? (
                                    <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground border-transparent px-2">Kullanıldı</Badge>
                                  ) : (
                                    <div className="flex items-center justify-end gap-2">
                                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50 px-2">Bekliyor</Badge>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => revokeLinkMutation.mutate(link.id)}
                                        disabled={revokeLinkMutation.isPending}
                                        title="İptal Et"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* RIGHT COLUMN: INVITE CODES */}
              <div className="space-y-6">
                <Card className="border-border/50 bg-card overflow-hidden h-full">
                  <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50 bg-muted/5">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Ticket className="w-5 h-5 text-primary" /> Davetiye Kodları
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Genel kullanım kodları.
                      </CardDescription>
                    </div>
                    <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="h-8">
                          <Plus className="w-3.5 h-3.5 mr-1.5" /> Yeni Kod
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Davetiye Kodu Oluştur</DialogTitle>
                          <DialogDescription>
                            Bu kod ile birden fazla kişi kayıt olabilir. Kullanım limiti belirleyebilirsiniz.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-3">
                          <label className="text-sm font-medium">Kullanım Limiti (Opsiyonel)</label>
                          <Input
                            type="number"
                            min="1"
                            placeholder="Sınırsız için boş bırakın"
                            value={usesLeft}
                            onChange={(e) => setUsesLeft(e.target.value)}
                          />
                        </div>
                        <DialogFooter>
                          <Button variant="ghost" onClick={() => setCodeDialogOpen(false)}>İptal</Button>
                          <Button onClick={handleCreateCode} disabled={createCodeMutation.isPending}>
                            {createCodeMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent className="p-0">
                    {codesLoading ? (
                      <div className="p-4 space-y-3">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : inviteCodes.length === 0 ? (
                      <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                        <Ticket className="w-10 h-10 mb-2 opacity-20" />
                        <p className="text-sm">Aktif davet kodu bulunmuyor.</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader className="bg-muted/5">
                          <TableRow className="border-b border-border/50 hover:bg-transparent">
                            <TableHead className="h-10 text-xs uppercase tracking-wider font-semibold text-muted-foreground pl-6">Kod</TableHead>
                            <TableHead className="h-10 text-xs uppercase tracking-wider font-semibold text-muted-foreground text-center">Limit</TableHead>
                            <TableHead className="h-10 w-10 pr-6"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {inviteCodes.map((code) => (
                            <TableRow key={code.invite_code} className="hover:bg-muted/30 transition-colors border-b border-border/40 last:border-0">
                              <TableCell className="pl-6 py-3">
                                <div className="flex items-center gap-2">
                                  <code className="bg-secondary/50 px-2 py-1 rounded text-primary font-mono text-sm border border-border/50 shadow-sm">
                                    {code.invite_code}
                                  </code>
                                </div>
                              </TableCell>
                              <TableCell className="text-center text-sm text-muted-foreground py-3">
                                {code.uses_left === null ? <span className="text-xl">∞</span> : <span className="font-medium text-foreground">{code.uses_left}</span>}
                              </TableCell>
                              <TableCell className="pr-6 py-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-background border border-transparent hover:border-border/50 shadow-none hover:shadow-sm"
                                  onClick={() => copyToClipboard(code.invite_code)}
                                >
                                  {copiedCode === code.invite_code ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>

            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}