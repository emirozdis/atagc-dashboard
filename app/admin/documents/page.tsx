"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Committee } from "@/types/admin";

/*************  ✨ Windsurf Command ⭐  *************/
/**
 * AdminDocumentsPage component.
 *
 * This component is used by the admin to manage committee documents.
 * It fetches all the committees and renders a list of them.
 * Each committee is a card with a title, description and a button to open the editor.
 *
 * @returns {JSX.Element} The component.
 */
/*******  1ec0cfaf-fe52-470b-8327-74b20a72e48d  *******/export default function AdminDocumentsPage() {
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchCommittees = async () => {
      try {
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

  const handleOpenDocument = (committeeId: string) => {
    // Navigate to the editor with a query param to override the user's default committee
    router.push(`/dashboard/editor?committeeId=${committeeId}`);
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
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
// - Changed `bg-card/50` to `bg-card` for consistency.
// - Changed hover state to `hover:bg-accent/50`.