"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Committee {
  id: number;
  name: string;
  description: string;
}

export default function AdminDocumentsPage() {
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Fetch all committees
    const fetchCommittees = async () => {
      try {
        // You might need to create this API endpoint or reuse existing
        const res = await fetch("/api/admin/committees"); 
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setCommittees(data);
      } catch (e) {
        toast.error("Hata", { description: "Komiteler yüklenemedi." });
      } finally {
        setLoading(false);
      }
    };
    fetchCommittees();
  }, []);

  const handleOpenDocument = (committeeId: number) => {
    // Navigate to the editor with a query param to override the user's default committee
    router.push(`/dashboard/editor?committeeId=${committeeId}`);
  };

  if (loading) return <Loader2 className="animate-spin" />;

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-3xl font-display font-bold text-foreground">Komite Belgeleri</h2>
      <p className="text-muted-foreground">
        Görüntülemek veya yorum yapmak istediğiniz komiteyi seçin.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {committees.map((committee) => (
          <Card key={committee.id} className="bg-card/50 border-border/50 hover:bg-secondary/20 transition-colors">
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