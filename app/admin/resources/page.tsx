"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Trash2,
  Search,
  FolderOpen,
  Filter,
  Building2,
  Globe,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResourceUploadDialog } from "@/components/admin/ResourceUploadDialog";
import { TableSkeleton } from "@/components/ui/skeleton-loader";
import { Committee } from "@/types/admin";

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
  committee: { name: string } | null;
}

export default function AdminResourcesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [committeeFilter, setCommitteeFilter] = useState("all");

  const { data: resources = [], isLoading } = useQuery<Resource[]>({
    queryKey: ["admin-resources", committeeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ filterCommitteeId: committeeFilter });
      const res = await fetch(`/api/resources?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  const { data: committees = [] } = useQuery<Committee[]>({
    queryKey: ["committees"],
    queryFn: async () => {
      const res = await fetch("/api/admin/committees");
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
      queryClient.invalidateQueries({ queryKey: ["admin-resources"] });
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

  const renderMobileCard = (res: Resource) => (
    <Card key={res.id} className="mb-4 last:mb-0">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h4 className="font-semibold text-sm line-clamp-1">{res.title}</h4>
            <p className="text-xs text-muted-foreground line-clamp-2">{res.description}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a href={res.file_url} target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4 mr-2" /> İndir
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  if(confirm("Silmek istediğinize emin misiniz?")) deleteMutation.mutate(res.id);
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Sil
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {getCategoryBadge(res.category)}
          {res.is_public ? 
            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Herkese Açık</Badge> : 
            <Badge variant="outline" className="text-muted-foreground">Gizli</Badge>
          }
        </div>

        <div className="flex items-center justify-between pt-3 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            {res.committee ? (
              <>
                <Building2 className="w-3 h-3" />
                <span className="truncate max-w-[100px]">{res.committee.name}</span>
              </>
            ) : (
              <>
                <Globe className="w-3 h-3" />
                <span>Genel</span>
              </>
            )}
          </div>
          <div>{new Date(res.created_at).toLocaleDateString("tr-TR")}</div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">Kaynak Kütüphanesi</h2>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Delegeler için dosya ve doküman paylaşımı.
          </p>
        </div>
        <ResourceUploadDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin-resources"] })} />
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center bg-card p-4 rounded-xl border border-border/50">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Dosya ara..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={committeeFilter} onValueChange={setCommitteeFilter}>
          <SelectTrigger className="w-full md:w-[240px]">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <SelectValue placeholder="Komite Filtrele" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Komiteler</SelectItem>
            <SelectItem value="general">Genel Kaynaklar</SelectItem>
            {committees.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-card border-border/50 bg-transparent shadow-none border-none">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton /></div>
          ) : filteredResources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border rounded-xl bg-card">
              <FolderOpen className="w-12 h-12 opacity-20 mb-3" />
              <p>Dosya bulunamadı.</p>
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="block md:hidden">
                {filteredResources.map(renderMobileCard)}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block rounded-xl border border-border/50 bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dosya Adı</TableHead>
                      <TableHead>Komite</TableHead>
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
                        <TableCell>
                          {res.committee ? (
                            <div className="flex items-center gap-2 text-xs">
                              <Building2 className="w-3 h-3 text-muted-foreground" />
                              <span className="font-medium">{res.committee.name}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Globe className="w-3 h-3" />
                              <span>Genel</span>
                            </div>
                          )}
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
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Change Log:
// - Added mobile responsive view using Cards (`renderMobileCard`).
// - Hid the Table on mobile devices and showed Cards instead.
// - Adjusted filter section for mobile layout.