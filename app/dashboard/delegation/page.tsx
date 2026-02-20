"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Plus, Check } from "lucide-react";

type InviteCode = {
  invite_code: string;
  delegation: string;
  uses_left: number | null;
  created_at: string;
};

export default function DelegationPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [usesLeft, setUsesLeft] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [magicLinkEmail, setMagicLinkEmail] = useState("");

  const { data, isLoading, error } = useQuery<{ success: boolean; data: InviteCode[] }>({
    queryKey: ["delegation-invite-codes"],
    queryFn: async () => {
      const res = await fetch("/api/delegation/list_invite_codes");
      if (!res.ok) throw new Error("Davetiye kodları yüklenemedi");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (usesLeftValue: number | undefined) => {
      const body: Record<string, any> = {};
      if (usesLeftValue !== undefined) {
        body.uses_left = usesLeftValue;
      }
      const res = await fetch("/api/delegation/new_invite_code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || "Kod oluşturulamadı");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegation-invite-codes"] });
      setDialogOpen(false);
      setUsesLeft("");
    },
  });

  const handleCreate = () => {
    const parsed = usesLeft.trim() ? parseInt(usesLeft, 10) : undefined;
    if (usesLeft.trim() && (!parsed || parsed <= 0 || !Number.isInteger(parsed))) {
      return;
    }
    createMutation.mutate(parsed);
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const magicLinkMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/delegation/create_magiclink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sent_to: email }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || "Magic link oluşturulamadı");
      }
      return res.json();
    },
    onSuccess: (data) => {
      console.log("Magic link created:", data);
      setMagicLinkEmail("");
    },
  });

  const handleMagicLink = () => {
    if (!magicLinkEmail.trim()) return;
    magicLinkMutation.mutate(magicLinkEmail.trim());
  };

  const inviteCodes = data?.data ?? [];

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      <Breadcrumbs items={[{ label: "Panel", href: "/dashboard" }, { label: "Delegasyon" }]} />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">Delegasyon Paneli</h2>
          <p className="text-muted-foreground mt-1">Davetiye kodlarını yönetin.</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              Kod Oluştur
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Davetiye Kodu</DialogTitle>
              <DialogDescription>
                Yeni bir davetiye kodu oluşturun. Kullanım sayısı isteğe bağlıdır.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="uses-left">
                Kullanım Sayısı (isteğe bağlı)
              </label>
              <Input
                id="uses-left"
                type="number"
                min={1}
                placeholder="Sınırsız"
                value={usesLeft}
                onChange={(e) => setUsesLeft(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setUsesLeft("");
                }}
              >
                İptal
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
              </Button>
            </DialogFooter>
            {createMutation.isError && (
              <p className="text-sm text-destructive">
                {(createMutation.error as Error).message}
              </p>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card/80 backdrop-blur-md rounded-2xl border border-border/50 shadow-xl p-6 space-y-3">
        <h3 className="text-lg font-semibold text-foreground">Magic Link Gönder</h3>
        <div className="flex items-center gap-3">
          <Input
            type="email"
            placeholder="E-posta adresi"
            value={magicLinkEmail}
            onChange={(e) => setMagicLinkEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleMagicLink()}
          />
          <Button onClick={handleMagicLink} disabled={magicLinkMutation.isPending}>
            {magicLinkMutation.isPending ? "Gönderiliyor..." : "Gönder"}
          </Button>
        </div>
        {magicLinkMutation.isError && (
          <p className="text-sm text-destructive">
            {(magicLinkMutation.error as Error).message}
          </p>
        )}
        {magicLinkMutation.isSuccess && (
          <p className="text-sm text-emerald-500">Magic link başarıyla oluşturuldu.</p>
        )}
      </div>

      <div className="bg-card/80 backdrop-blur-md rounded-2xl border border-border/50 shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-center text-muted-foreground">
            Davetiye kodları yüklenirken bir hata oluştu.
          </div>
        ) : inviteCodes.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            Henüz davetiye kodu oluşturulmamış.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Davetiye Kodu</TableHead>
                <TableHead>Kalan Kullanım</TableHead>
                <TableHead>Oluşturulma Tarihi</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {inviteCodes.map((invite) => (
                <TableRow key={invite.invite_code}>
                  <TableCell className="font-mono">{invite.invite_code}</TableCell>
                  <TableCell>
                    {invite.uses_left !== null ? invite.uses_left : "Sınırsız"}
                  </TableCell>
                  <TableCell>
                    {new Date(invite.created_at).toLocaleDateString("tr-TR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => copyToClipboard(invite.invite_code)}
                    >
                      {copiedCode === invite.invite_code ? (
                        <Check className="size-4 text-emerald-500" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}