"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Users,
  Search
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { Committee } from "@/types/admin";

export default function AdminCommitteesPage() {
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    topicTitle: "",
    topicDescription: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCommittees();
  }, []);

  const fetchCommittees = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/committees");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setCommittees(data);
    } catch (error) {
      toast.error("Hata", { description: "Komiteler yüklenemedi." });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const method = editingId ? "PUT" : "POST";
      const body = {
        ...formData,
        id: editingId
      };

      const res = await fetch("/api/admin/committees", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Operation failed");

      toast.success(editingId ? "Komite Güncellendi" : "Komite Oluşturuldu");
      setIsDialogOpen(false);
      resetForm();
      fetchCommittees();
    } catch (error) {
      toast.error("İşlem Başarısız", { description: "Lütfen tekrar deneyin." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu komiteyi silmek istediğinize emin misiniz?")) return;

    try {
      const res = await fetch(`/api/admin/committees?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");

      toast.success("Komite Silindi");
      setCommittees(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      toast.error("Silinemedi", { description: "Komiteye bağlı kayıtlar olabilir." });
    }
  };

  const startEdit = (committee: Committee) => {
    // Handle topic being an array or object
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

  const filteredCommittees = committees.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">Komiteler</h2>
          <p className="text-muted-foreground mt-1">
            Komiteleri ve çalışma konularını yönetin.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Yeni Komite
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Komiteyi Düzenle" : "Yeni Komite Oluştur"}</DialogTitle>
              <DialogDescription>
                Komite detaylarını ve çalışma konusunu giriniz.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Komite Adı</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Örn: DISEC"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Açıklama</Label>
                <Textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Komite hakkında kısa bilgi..."
                />
              </div>

              <div className="border-t border-border pt-4 mt-4">
                <h4 className="font-medium mb-3 text-sm text-primary">Çalışma Konusu (Topic)</h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Konu Başlığı</Label>
                    <Input
                      value={formData.topicTitle}
                      onChange={e => setFormData({ ...formData, topicTitle: e.target.value })}
                      placeholder="Örn: Silahsızlanma..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Konu İçeriği</Label>
                    <Textarea
                      value={formData.topicDescription}
                      onChange={e => setFormData({ ...formData, topicDescription: e.target.value })}
                      placeholder="Konu detayları..."
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>İptal</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Kaydet
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Komite ara..."
          className="pl-9 max-w-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCommittees.map(committee => {
             // Handle topic being an array or object
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
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(committee.id)}>
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription className="line-clamp-2 min-h-[40px]">
                    {committee.description || "Açıklama yok."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-background/50 rounded border border-border/50">
                      <div className="font-medium text-xs text-muted-foreground mb-1 uppercase tracking-wider">Çalışma Konusu</div>
                      <div className="font-medium text-foreground">{topicData?.title || "Belirlenmedi"}</div>
                    </div>
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
// - Updated `startEdit` and the rendering loop to check if `committee.topic` is an array or object.
// - Safely accesses `topicData?.title` to properly display the topic if available, fixing the issue where "Belirlenmedi" was shown despite topics existing.