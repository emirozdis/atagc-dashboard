"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, FileText, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface CommitteeData {
  committee: {
    id: string; // UUID
    name: string;
    description: string;
  };
  topic: {
    title: string;
    description: string;
  } | null;
  can_write: boolean;
}

export default function CommitteePage() {
  const [data, setData] = useState<CommitteeData | null>(null);
  const [loading, setLoading] = useState(true);

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
      } catch (e) {
        toast.error("Veri yüklenemedi");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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

      <div className="grid gap-6 md:grid-cols-3">
        {/* Committee Info */}
        <Card className="md:col-span-2 bg-card/50 border-border/50">
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
    </div>
  );
}