"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Committee } from "@/types/admin";
import { CardSkeleton } from "@/components/ui/skeleton-loader";

export default function AdminCommitteesPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Form State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", topicTitle: "", topicDescription: "" });

  const { data: committees = [], isLoading } = useQuery<Committee[]>({
    queryKey: ['committees'],
    queryFn: async () => {
      const res = await fetch("/api/admin/committees");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const method = editingId ? "PUT" : "POST";
      const res = await fetch("/api/admin/committees", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, id: editingId }),
      });
      if (!res.ok) throw new Error("Operation failed");
    },
    onSuccess: () => {
      toast.success(editingId ? "Komite Güncellendi" : "Komite Oluşturuldu");
      setIsDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['committees'] });
    },
    onError: () => toast.error("İşlem Başarısız")
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/committees?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast.success("Komite Silindi");
      queryClient.invalidateQueries({ queryKey: ['committees'] });
    },
    onError: () => toast.error("Silinemedi")
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const startEdit = (committee: Committee) => {
    const topicData = Array.isArray(committee.topic) ? committee.topic[0] : committee.topic;
    setEditingId(committee.id);
    setFormData({
      name: committee.name,
      description: committee.description || "",
      topicTitle: topicData?.title || "",
      topicDescription: topicData?.description || "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: "", description: "", topicTitle: "", topicDescription: "" });
  };

  const filteredCommittees = committees.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">Komiteler</h2>
          <p className="text-muted-foreground mt-1">Komiteleri ve çalışma konularını yönetin.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Yeni Komite</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Komiteyi Düzenle" : "Yeni Komite Oluştur"}</DialogTitle>
              <DialogDescription>Komite detaylarını ve çalışma konusunu giriniz.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Komite Adı</Label>
                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Açıklama</Label>
                <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="border-t border-border pt-4 mt-4">
                <h4 className="font-medium mb-3 text-sm text-primary">Çalışma Konusu (Topic)</h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Konu Başlığı</Label>
                    <Input value={formData.topicTitle} onChange={e => setFormData({ ...formData, topicTitle: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Konu İçeriği</Label>
                    <Textarea value={formData.topicDescription} onChange={e => setFormData({ ...formData, topicDescription: e.target.value })} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>İptal</Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Kaydet
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Komite ara..." className="pl-9 max-w-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      {isLoading ? <CardSkeleton count={6} /> : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCommittees.map(committee => {
             const topicData = Array.isArray(committee.topic) ? committee.topic[0] : committee.topic;
             return (
              <Card key={committee.id} className="bg-card border-border/50 hover:bg-secondary/20 transition-all group">
                <CardHeader>
                  <CardTitle className="flex justify-between items-start gap-2">
                    <span className="truncate">{committee.name}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon-sm" onClick={() => startEdit(committee)}>
                        <Pencil className="w-4 h-4 text-muted-foreground hover:text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => confirm("Silmek istiyor musunuz?") && deleteMutation.mutate(committee.id)}>
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription className="line-clamp-2 min-h-[40px]">{committee.description || "Açıklama yok."}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-3 bg-background/50 rounded border border-border/50">
                    <div className="font-medium text-xs text-muted-foreground mb-1 uppercase tracking-wider">Çalışma Konusu</div>
                    <div className="font-medium text-foreground">{topicData?.title || "Belirlenmedi"}</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Change Log:
// - Refactored to `useQuery` and `useMutation`.
// - Uses `CardSkeleton`.