"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Plus, Clock, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function TasksPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [committee, setCommittee] = useState("");
  const [assignee, setAssignee] = useState("");

  const { data: committees, isLoading: committeesLoading } = useQuery({
    queryKey: ["observer-committees"],
    queryFn: async () => {
      const res = await fetch("/api/observer/committees");
      if (!res.ok) throw new Error("Failed to fetch committees");
      return res.json() as Promise<{ id: string; name: string }[]>;
    },
  });

  const { data: observers, isLoading: observersLoading } = useQuery({
    queryKey: ["observer-list-relevant", committee],
    queryFn: async () => {
      const url = committee
        ? `/api/observer/list_relevant?committee=${committee}`
        : `/api/observer/list_relevant`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch observers");
      return res.json() as Promise<{ id: string; users: { id: string; full_name: string; email: string } }[]>;
    },
  });

  const createTask = useMutation({
    mutationFn: async (payload: { url: string; body: Record<string, unknown> }) => {
      const res = await fetch(payload.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Görev oluşturulamadı.");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Görev başarıyla oluşturuldu.");
      setTitle("");
      setDescription("");
      setCommittee("");
      setAssignee("");
      queryClient.invalidateQueries({ queryKey: ["observer-tasks"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Görev başlığı zorunludur.");
      return;
    }

    if (assignee) {
      // Direct assignment
      createTask.mutate({
        url: "/api/observer/create",
        body: {
          assigned_to: assignee,
          assigned_task: title.trim(),
          task_description: description.trim() || undefined,
        },
      });
    } else {
      // Auto-assign
      createTask.mutate({
        url: "/api/observer/auto_assign",
        body: {
          assigned_task: title.trim(),
          task_description: description.trim() || undefined,
          committee: committee || undefined,
        },
      });
    }
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-12 space-y-8">
      <Breadcrumbs items={[{ label: "Organizasyon", href: "/organisation" }, { label: "Görev Oluştur" }]} />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">
            Görev Oluştur
          </h2>
          <p className="text-muted-foreground mt-2 text-lg">
            Gözlemcilere görev atayın ve takip edin.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Task Creation Form */}
        <div className="lg:col-span-2">
          <Card className="border-border/50 shadow-sm bg-card">
            <CardHeader className="bg-muted/10 border-b border-border/50 pb-4">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" /> Yeni Görev
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="title">Görev Başlığı</Label>
                  <Input
                    id="title"
                    placeholder="Görev başlığını girin..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Açıklama</Label>
                  <Textarea
                    id="description"
                    placeholder="Görev detaylarını yazın..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="committee">Komite</Label>
                    <Select value={committee} onValueChange={(val) => { setCommittee(val); setAssignee(""); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Komite seçin (opsiyonel)..." />
                      </SelectTrigger>
                      <SelectContent>
                        {committeesLoading ? (
                          <SelectItem value="loading" disabled>Yükleniyor...</SelectItem>
                        ) : committees && committees.length > 0 ? (
                          committees.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>Komite bulunamadı</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Boş bırakılırsa alan gözlemcileri listelenir.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assignee">Gözlemci</Label>
                    <Select value={assignee} onValueChange={setAssignee}>
                      <SelectTrigger>
                        <SelectValue placeholder="Otomatik ata..." />
                      </SelectTrigger>
                      <SelectContent>
                        {observersLoading ? (
                          <SelectItem value="loading" disabled>Yükleniyor...</SelectItem>
                        ) : observers && observers.length > 0 ? (
                          observers.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.users?.full_name || o.users?.email || o.id}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>Gözlemci bulunamadı</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Boş bırakılırsa en az görevi olan gözlemciye atanır.
                    </p>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={createTask.isPending}>
                  {createTask.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ClipboardList className="w-4 h-4 mr-2" />
                  )}
                  {createTask.isPending ? "Atanıyor..." : assignee ? "Görev Oluştur" : "Otomatik Ata"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Task Stats Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-border/50 shadow-sm bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Görev Özeti
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/50">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-sm">Bekleyen</span>
                </div>
                <Badge variant="secondary">0</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/50">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span className="text-sm">Devam Eden</span>
                </div>
                <Badge variant="secondary">0</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/50">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm">Tamamlanan</span>
                </div>
                <Badge variant="secondary">0</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Task List */}
      <Card className="border-dashed border-border/60 bg-secondary/10">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-secondary/30 flex items-center justify-center mb-5">
            <ClipboardList className="w-7 h-7 text-muted-foreground" />
          </div>
          <h4 className="font-semibold text-xl text-foreground mb-2">Henüz Görev Yok</h4>
          <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
            Yukarıdaki formu kullanarak gözlemcilere görev atayabilirsiniz.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
