"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CateringPage() {
  const [shortId, setShortId] = useState("");

  const logMutation = useMutation({
    mutationFn: async (inputShortId: string) => {
      const res = await fetch("/api/catering/update_status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ short_id: inputShortId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "İşlem başarısız oldu.");
      }
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        data.user_name
          ? `${data.user_name} için yemek kaydı oluşturuldu.`
          : "Yemek kaydı oluşturuldu."
      );
      setShortId("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = shortId.trim();
    if (!trimmed) return;
    logMutation.mutate(trimmed);
  };

  const breadcrumbItems = [{ label: "Yemek Yönetimi" }];

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
            Yemek Yönetimi
          </h2>
          <p className="text-muted-foreground mt-1">
            Kimlik numarası ile kullanıcının günlük yemek kaydını oluşturun.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <div className="flex-1 space-y-2">
            <label htmlFor="shortId" className="text-sm font-medium text-foreground">
              Kimlik Numarası
            </label>
            <Input
              id="shortId"
              placeholder="Örn: A1B2C3D4"
              value={shortId}
              onChange={(e) => setShortId(e.target.value.toUpperCase())}
              disabled={logMutation.isPending}
              className="font-mono tracking-wider uppercase"
            />
          </div>
          <Button type="submit" disabled={logMutation.isPending || !shortId.trim()}>
            {logMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <UtensilsCrossed className="w-4 h-4 mr-2" />
            )}
            Kaydet
          </Button>
        </form>
      </div>
    </div>
  );
}