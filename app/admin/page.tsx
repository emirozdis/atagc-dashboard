"use client";

import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  FileText, 
  Clock, 
  AlertCircle, 
  Activity, 
  ArrowRight, 
  ExternalLink,
  ShieldCheck,
  Megaphone,
  Users
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  stats: {
    total: number;
    pending: number;
    approved: number;
  };
  recentActivity: {
    id: string;
    status: string;
    submitted_at: string;
    user: {
      full_name: string;
      email: string;
    };
  }[];
  recentLogs: {
    id: string;
    action: string;
    created_at: string;
    user: {
      full_name: string;
    } | null;
  }[];
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": 
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Onaylandı</Badge>;
      case "rejected": 
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Reddedildi</Badge>;
      default: 
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Bekliyor</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 p-4">
        <div className="flex justify-between">
            <div className="space-y-2">
                <Skeleton className="h-10 w-[200px]" />
                <Skeleton className="h-4 w-[300px]" />
            </div>
            <div className="flex gap-2">
                <Skeleton className="h-10 w-[120px]" />
                <Skeleton className="h-10 w-[120px]" />
            </div>
        </div>
        <div className="grid gap-6 md:grid-cols-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="lg:col-span-2 h-[400px] rounded-xl" />
            <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Yönetim Paneli</h1>
          <p className="text-muted-foreground mt-1 text-lg">
            Sistem durumunu ve son aktiviteleri buradan takip edebilirsiniz.
          </p>
        </div>
        <div className="flex gap-3">
            <Link href="/admin/announcements/new">
                <Button variant="outline" className="gap-2">
                    <Megaphone className="w-4 h-4" /> Duyuru Yap
                </Button>
            </Link>
            <Link href="/admin/users">
                <Button className="gap-2 shadow-lg shadow-primary/20">
                    <Users className="w-4 h-4" /> Kullanıcı Yönetimi
                </Button>
            </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Applications */}
        <Card className="bg-card border-border/50 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Başvuru</CardTitle>
            <div className="p-2 bg-primary/10 rounded-full">
                <FileText className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{data?.stats.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Sisteme kayıtlı tüm başvurular
            </p>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card className="bg-card border-border/50 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">Onay Bekleyen</CardTitle>
            <div className="p-2 bg-yellow-500/10 rounded-full">
                <Clock className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold">{data?.stats.pending || 0}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              İnceleme gerektiren başvurular
            </p>
          </CardContent>
        </Card>

        {/* Approved Delegates */}
        <Card className="bg-card border-border/50 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Kabul Edilenler</CardTitle>
            <div className="p-2 bg-green-500/10 rounded-full">
                <ShieldCheck className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{data?.stats.approved || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Komitelere yerleşmiş delegeler
            </p>
          </CardContent>
        </Card>

        {/* Issues (Placeholder) */}
        <Card className="bg-card border-border/50 shadow-sm opacity-60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sorun Bildirimleri</CardTitle>
            <div className="p-2 bg-destructive/10 rounded-full">
                <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">0</div>
            <p className="text-xs text-muted-foreground mt-1">
              Çözüm bekleyen talep yok
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity Column */}
        <Card className="lg:col-span-2 bg-card border-border/50 shadow-sm flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle className="text-lg">Son Başvurular</CardTitle>
                <CardDescription>En son gelen başvuru kayıtları.</CardDescription>
            </div>
            <Link href="/admin/applications">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                    Tümünü Gör <ArrowRight className="w-3 h-3" />
                </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <div className="divide-y divide-border/40">
              {data?.recentActivity && data.recentActivity.length > 0 ? (
                data.recentActivity.map((app) => (
                  <div key={app.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10 border border-border">
                        <AvatarImage src={`https://avatar.vercel.sh/${app.user.email}`} />
                        <AvatarFallback className="text-xs">{app.user.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none group-hover:text-primary transition-colors">
                            {app.user.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{app.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs text-muted-foreground">
                                {new Date(app.submitted_at).toLocaleDateString("tr-TR", { day: 'numeric', month: 'short' })}
                            </p>
                            <p className="text-[10px] text-muted-foreground/60">
                                {new Date(app.submitted_at).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                        {getStatusBadge(app.status)}
                        <Link href={`/admin/applications/${app.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                <ExternalLink className="w-4 h-4" />
                            </Button>
                        </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                  <FileText className="w-8 h-8 opacity-20" />
                  <span className="text-sm">Henüz başvuru bulunmuyor.</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Logs Widget */}
        <Card className="bg-card border-border/50 shadow-sm flex flex-col h-full">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    <CardTitle className="text-base">Sistem Günlüğü</CardTitle>
                </div>
                <Link href="/admin/logs">
                    <span className="text-[10px] font-medium text-muted-foreground hover:text-primary cursor-pointer transition-colors">
                        Tümünü Gör
                    </span>
                </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 relative">
            <ScrollArea className="h-[400px]">
                <div className="flex flex-col">
                    {data?.recentLogs && data.recentLogs.length > 0 ? (
                        data.recentLogs.map((log, i) => (
                        <div key={log.id} className="flex gap-3 p-4 border-b border-border/30 last:border-0 hover:bg-muted/10 transition-colors">
                            <div className="mt-1 flex flex-col items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-primary/60" />
                                {i !== data.recentLogs.length - 1 && (
                                    <div className="w-px h-full bg-border/50" />
                                )}
                            </div>
                            <div className="space-y-1 flex-1">
                                <p className="text-xs font-medium leading-normal">
                                    {log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </p>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-muted-foreground font-medium bg-secondary/50 px-1.5 py-0.5 rounded">
                                        {log.user?.full_name || "Sistem"}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground/60">
                                        {new Date(log.created_at).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        </div>
                        ))
                    ) : (
                        <div className="text-center py-12 text-muted-foreground text-xs">
                            Kayıt bulunamadı.
                        </div>
                    )}
                </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Change Log:
// - Refactored data fetching to `useQuery`.
// - Implemented full-page Skeleton loader.