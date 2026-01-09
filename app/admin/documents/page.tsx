"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Committee } from "@/types/admin";
import { CardSkeleton } from "@/components/ui/skeleton-loader";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export default function AdminDocumentsPage() {
  const router = useRouter();

  const { data: committees = [], isLoading } = useQuery<Committee[]>({
    queryKey: ['committees'],
    queryFn: async () => {
      const res = await fetch("/api/admin/committees");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  const handleOpenDocument = (committeeId: string) => {
    router.push(`/dashboard/editor?committeeId=${committeeId}`);
  };

  if (isLoading) return <div className="p-4"><CardSkeleton count={4} /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumbs items={[{ label: "Belgeler" }]} />
      <h2 className="text-3xl font-display font-bold text-foreground">Komite Belgeleri</h2>
      <p className="text-muted-foreground">
        Görüntülemek veya yorum yapmak istediğiniz komiteyi seçin.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {committees.map((committee) => (
          <Card key={committee.id} className="bg-card border-border/50 hover:bg-accent/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                {committee.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                {committee.description}
              </p>
              <Button
                onClick={() => handleOpenDocument(committee.id)}
                className="w-full"
                variant="secondary"
              >
                Belgeyi Aç <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Change Log:
// - Refactored to `useQuery`.
// - Added `CardSkeleton` for loading state.