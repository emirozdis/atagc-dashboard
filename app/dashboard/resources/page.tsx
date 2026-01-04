"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { FileText, Download, Folder, File, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CardSkeleton } from "@/components/ui/skeleton-loader";
import { ResourceUploadDialog } from "@/components/admin/ResourceUploadDialog";

interface Resource {
  id: string;
  title: string;
  description: string;
  file_url: string;
  category: string;
  created_at: string;
}

export default function ParticipantResourcesPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const { data: resources = [], isLoading } = useQuery<Resource[]>({
    queryKey: ["resources-public"],
    queryFn: async () => {
      const res = await fetch("/api/resources?is_public=true");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  const categories = [
    { id: "guide", label: "Çalışma Kılavuzları", icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
    { id: "rules", label: "Prosedürler", icon: File, color: "text-purple-500", bg: "bg-purple-500/10" },
    { id: "schedule", label: "Etkinlik Programı", icon: FileText, color: "text-green-500", bg: "bg-green-500/10" },
    { id: "general", label: "Genel Dosyalar", icon: Folder, color: "text-orange-500", bg: "bg-orange-500/10" }
  ];

  // Roles permitted to upload resources
  const allowedUploadRoles = ["superadmin", "admin", "staff", "staffleader", "committee_chairman"];
  const canUpload = allowedUploadRoles.includes(session?.user?.role || "");

  if (isLoading) return <div className="p-6"><CardSkeleton count={6} /></div>;

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">Kaynaklar</h2>
          <p className="text-muted-foreground mt-1">
            Etkinlik süresince ihtiyaç duyacağınız dokümanlar.
          </p>
        </div>
        {canUpload && (
          <ResourceUploadDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ["resources-public"] })} />
        )}
      </div>

      {categories.map((cat) => {
        const catResources = resources.filter(r => r.category === cat.id);
        if (catResources.length === 0) return null;

        return (
          <div key={cat.id} className="space-y-4">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${cat.bg}`}>
                <cat.icon className={`w-5 h-5 ${cat.color}`} />
              </div>
              <h3 className="text-xl font-bold">{cat.label}</h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {catResources.map(res => (
                <Card key={res.id} className="bg-card border-border/50 hover:bg-accent/5 transition-colors group">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base line-clamp-1" title={res.title}>
                      {res.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 min-h-[40px] text-xs">
                      {res.description || "Açıklama yok."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(res.created_at).toLocaleDateString("tr-TR")}
                      </span>
                      <Button size="sm" variant="secondary" asChild className="h-8 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <a href={res.file_url} target="_blank" rel="noopener noreferrer">
                          <Download className="w-3 h-3 mr-2" /> İndir
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {resources.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          Henüz dosya yüklenmemiş.
        </div>
      )}
    </div>
  );
}

// Change Log:
// - Added `useSession` to check user role.
// - Added `canUpload` check: Displays `ResourceUploadDialog` if user is Chairman, Staff, or Admin.
// - Reusing `ResourceUploadDialog` allows consistency and functionality without duplicating code.