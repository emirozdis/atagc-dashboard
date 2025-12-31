"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, Users, Clock, AlertCircle, Loader2, Activity, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/admin/stats");
        if (!res.ok) throw new Error("Failed to fetch stats");
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error(error);
        toast.error("Hata", { description: "İstatistikler yüklenemedi." });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "text-green-500";
      case "rejected": return "text-red-500";
      default: return "text-yellow-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "approved": return "Onaylandı";
      case "rejected": return "Reddedildi";
      default: return "Bekliyor";
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-3xl font-display font-bold text-foreground">Yönetim Paneli</h2>
        <p className="text-muted-foreground mt-1">
          Genel durum ve istatistikler.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Başvuru</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              Tüm zamanlar
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bekleyen Onay</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats.pending || 0}</div>
            <p className="text-xs text-muted-foreground">
              İşlem bekleyen başvurular
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kayıtlı Delegeler</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats.approved || 0}</div>
            <p className="text-xs text-muted-foreground">
              Onaylanmış katılımcılar
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 opacity-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sorun Bildirimleri</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Henüz aktif değil
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Logs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-card border-border/50">
          <CardHeader>
            <CardTitle>Son Başvurular</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.recentActivity && data.recentActivity.length > 0 ? (
                data.recentActivity.map((app) => (
                  <div key={app.id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-colors">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={`https://avatar.vercel.sh/${app.user.email}`} />
                        <AvatarFallback>{app.user.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">{app.user.full_name}</p>
                        <p className="text-xs text-muted-foreground">{app.user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${getStatusColor(app.status)}`}>
                        {getStatusText(app.status)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(app.submitted_at).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Henüz başvuru bulunmuyor.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Logs Widget (Replaced Committee Occupancy) */}
        <Card className="col-span-3 bg-card border-border/50 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-base">Sistem Kayıtları</CardTitle>
              <CardDescription>Son yapılan işlemler</CardDescription>
            </div>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-4">
              {data?.recentLogs && data.recentLogs.length > 0 ? (
                data.recentLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-2 rounded-md hover:bg-secondary/10 transition-colors border border-transparent hover:border-border/30">
                    <div className="mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{log.user?.full_name || "Sistem"}</span>
                        <span>{new Date(log.created_at).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Kayıt bulunamadı.
                </div>
              )}
            </div>
          </CardContent>
          <div className="p-4 pt-0 mt-auto">
            <Link href="/admin/logs">
              <Button variant="outline" className="w-full text-xs">
                Tüm Kayıtları Gör <ArrowRight className="w-3 h-3 ml-2" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Change Log:
// - Added `recentLogs` to `DashboardStats` interface.
// - Replaced the "Komite Doluluk" card with a "Sistem Kayıtları" widget.
// - This widget displays the 5 most recent logs and provides a link to the full logs page.