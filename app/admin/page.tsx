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
  ShieldCheck,
  Megaphone,
  Users
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

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
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            Onaylandı
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
            Reddedildi
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            Bekliyor
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 max-w-7xl mx-auto">
      <Breadcrumbs items={[{ label: "Panel" }]} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">
            Yönetim Paneli
          </h1>
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
            <Button className="gap-2">
              <Users className="w-4 h-4" /> Kullanıcı Yönetimi
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? [1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))
          : (
            <>
              <Card className="bg-card border-border/50 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Toplam Başvuru
                  </CardTitle>
                  <div className="p-2 bg-primary/10 rounded-full">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold tracking-tight">
                    {data?.stats.total || 0}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border/50 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Onay Bekleyen
                  </CardTitle>
                  <div className="p-2 bg-yellow-500/10 rounded-full">
                    <Clock className="h-4 w-4 text-yellow-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {data?.stats.pending || 0}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border/50 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Kabul Edilenler
                  </CardTitle>
                  <div className="p-2 bg-green-500/10 rounded-full">
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold tracking-tight">
                    {data?.stats.approved || 0}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border/50 shadow-sm opacity-60">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Sorun Bildirimleri
                  </CardTitle>
                  <div className="p-2 bg-destructive/10 rounded-full">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold tracking-tight">0</div>
                </CardContent>
              </Card>
            </>
          )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 bg-card border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Son Başvurular</CardTitle>
            <CardDescription>En son gelen başvuru kayıtları.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {data?.recentActivity?.map(app => (
                  <div key={app.id} className="flex justify-between p-4">
                    <div>
                      <p className="text-sm font-medium">{app.user.full_name}</p>
                      <p className="text-xs text-muted-foreground">{app.user.email}</p>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Sistem Günlüğü</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-10 rounded-md" />
                ))}
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                {data?.recentLogs?.map(log => (
                  <div key={log.id} className="p-4 border-b border-border/30">
                    <p className="text-xs font-medium">{log.action}</p>
                  </div>
                ))}
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
