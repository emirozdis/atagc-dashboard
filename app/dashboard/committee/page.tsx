"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, FileText, Loader2, Lock, Shield, UserCog, ShieldAlert, ShieldCheck, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";

import { CommitteeData, CommitteeMember as Member, CommitteeAdmin as Admin } from "@/types/committee";

export default function CommitteePage() {
  const [data, setData] = useState<CommitteeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/participant/me");
        if (res.ok) {
          const json = await res.json();
          if (json.committeeMember) {
            setData({
              committee: json.committeeMember.committee,
              topic: json.topic,
              can_write: json.committeeMember.can_write
            });
          }
        }

        // Fetch members and admin
        const membersRes = await fetch("/api/committee/members");
        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setMembers(membersData.members || []);
          setAdmin(membersData.admin || null);
        }
      } catch (e) {
        toast.error("Veri yüklenemedi");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredMembers = members.filter(m =>
    (m.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "superadmin":
      case "admin":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20"><ShieldAlert className="w-3 h-3" /> Yönetici</span>;
      case "committee_chairman":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-500 border border-purple-500/20"><ShieldCheck className="w-3 h-3" /> Başkan</span>;
      case "staff":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-500 border border-orange-500/20"><Shield className="w-3 h-3" /> Personel</span>;
      case "staffleader":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20"><Shield className="w-3 h-3" /> Personel Lideri</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20"><Shield className="w-3 h-3" /> Üye</span>;
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <Users className="w-16 h-16 text-muted-foreground/30" />
        <h2 className="text-xl font-bold">Komite Bulunamadı</h2>
        <p className="text-muted-foreground max-w-md">
          Henüz bir komiteye atanmamış olabilirsiniz veya başvurunuz onaylanmamış olabilir.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div>
        <h2 className="text-3xl font-display font-bold text-foreground">Komitem</h2>
        <p className="text-muted-foreground mt-1">
          Atandığınız komite ve çalışma detayları.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Committee Info */}
        <Card className="lg:col-span-2 bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              {data.committee.name}
            </CardTitle>
            <CardDescription>{data.committee.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Çalışma Konusu (Topic)
              </h3>
              {data.topic ? (
                <div className="bg-secondary/10 p-4 rounded-lg border border-border/50">
                  <div className="font-medium text-foreground mb-2">{data.topic.title}</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {data.topic.description}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground italic">Henüz çalışma konusu belirlenmedi.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Hızlı İşlemler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full" variant="secondary">
                <Link href="/dashboard/editor">
                  Ortak Çalışma Alanı
                </Link>
              </Button>
              {!data.can_write && (
                <div className="flex items-center gap-2 text-xs text-yellow-500 bg-yellow-500/10 p-2 rounded">
                  <Lock className="w-3 h-3" />
                  <span>Yazma yetkiniz kısıtlıdır.</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Members and Admin Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Admin Card */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Komite Yöneticisi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {admin ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Avatar className="h-10 w-10 border border-primary/20">
                  <AvatarImage src={`https://avatar.vercel.sh/${admin.email}`} />
                  <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
                    {(admin.full_name || "??").substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-semibold truncate">{admin.full_name}</span>
                  <span className="text-xs text-muted-foreground truncate">{admin.email}</span>
                </div>
                <UserCog className="w-4 h-4 text-primary flex-shrink-0" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Yönetici bilgisi bulunamadı.</p>
            )}
          </CardContent>
        </Card>

        {/* Members Card */}
        <Card className="lg:col-span-2 bg-card/50 border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Komite Üyeleri
              </CardTitle>
              <span className="text-xs text-muted-foreground">{members.length} Üye</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Üye ara..."
                className="pl-9 h-9 bg-background/50 border-border/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {members.length === 0 ? "Henüz üye bulunmuyor." : "Aranan kriterde üye yok."}
                </div>
              ) : (
                filteredMembers.map(member => (
                  <div
                    key={member.id}
                    className="group flex items-center justify-between p-3 rounded-lg bg-card/30 hover:bg-card/50 border border-border/30 hover:border-border/50 transition-all"
                  >
                    <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                      <Avatar className="h-9 w-9 border border-border/30 flex-shrink-0">
                        <AvatarImage src={`https://avatar.vercel.sh/${member.email}`} />
                        <AvatarFallback className="bg-primary/20 text-primary text-xs">
                          {(member.full_name || "??").substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-medium truncate">{member.full_name}</span>
                        <span className="text-xs text-muted-foreground truncate">{member.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getRoleBadge(member.role)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}