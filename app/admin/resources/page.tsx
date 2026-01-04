"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Trash2,
  Search,
  FolderOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ResourceUploadDialog } from "@/components/admin/ResourceUploadDialog";
import { TableSkeleton } from "@/components/ui/skeleton-loader";

interface Resource {
  id: string;
  title: string;
  description: string;
  file_url: string;
  file_type: string;
  category: string;
  is_public: boolean;
  created_at: string;
  uploader: { full_name: string };
}

export default function AdminResourcesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: resources = [], isLoading } = useQuery<Resource[]>({
    queryKey: ["resources", categoryFilter],
    queryFn: async () => {
      const res = await fetch(`/api/resources?category=${categoryFilter}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/resources?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast.success("Dosya silindi");
      queryClient.invalidateQueries({ queryKey: ["resources"] });
    },
    onError: () => toast.error("Silme başarısız")
  });

  const filteredResources = resources.filter(r => 
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  const getCategoryBadge = (cat: string) => {
    const map: Record<string, string> = {
      general: "Genel",
      guide: "Kılavuz",
      rules: "Kurallar",
      award: "Ödül",
      schedule: "Program"
    };
    return <Badge variant="secondary">{map[cat] || cat}</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">Kaynak Kütüphanesi</h2>
          <p className="text-muted-foreground mt-1">
            Delegeler için dosya ve doküman paylaşımı.
          </p>
        </div>
        <ResourceUploadDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ["resources"] })} />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-xl border border-border/50">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Dosya ara..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          {["all", "guide", "rules", "schedule", "general"].map((cat) => (
            <Button
              key={cat}
              variant={categoryFilter === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter(cat)}
              className="capitalize"
            >
              {cat === "all" ? "Tümü" : cat}
            </Button>
          ))}
        </div>
      </div>

      <Card className="bg-card border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton /></div>
          ) : filteredResources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FolderOpen className="w-12 h-12 opacity-20 mb-3" />
              <p>Dosya bulunamadı.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dosya Adı</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Erişim</TableHead>
                  <TableHead>Yükleyen</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResources.map((res) => (
                  <TableRow key={res.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{res.title}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">{res.description}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getCategoryBadge(res.category)}</TableCell>
                    <TableCell>
                      {res.is_public ? 
                        <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">Herkese Açık</Badge> : 
                        <Badge variant="outline">Gizli</Badge>
                      }
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {res.uploader?.full_name} • {new Date(res.created_at).toLocaleDateString("tr-TR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <a href={res.file_url} target="_blank" rel="noopener noreferrer">
                            <Download className="w-4 h-4 text-muted-foreground" />
                          </a>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            if(confirm("Silmek istediğinize emin misiniz?")) deleteMutation.mutate(res.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive opacity-70 hover:opacity-100" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}