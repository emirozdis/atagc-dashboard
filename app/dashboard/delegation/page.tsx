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
import { cn } from "@/lib/utils";
import { Copy, Plus, Check, Users, Trash2, X } from "lucide-react";

type InviteCode = {
  invite_code: string;
  delegation: string;
  uses_left: number | null;
  created_at: string;
};

type DelegationMember = {
  user_id: string;
  joined_at: string;
  accepted: boolean | null;
  users: {
    full_name: string;
    email: string;
  };
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

  const { data: membersData, isLoading: membersLoading } = useQuery<{ success: boolean; data: DelegationMember[] }>({
    queryKey: ["delegation-members"],
    queryFn: async () => {
      const res = await fetch("/api/delegation/list_delegation_members");
      if (!res.ok) throw new Error("Üyeler yüklenemedi");
      return res.json();
    },
  });

  const members = membersData?.data ?? [];

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

  const memberActionMutation = useMutation({
    mutationFn: async ({ target_user_id, action }: { target_user_id: string; action: "accept" | "reject" | "remove" }) => {
      const res = await fetch("/api/delegation/change_accepted_status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_user_id, action }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || "İşlem başarısız");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegation-members"] });
    },
  });

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
        <div className="p-6 border-b border-border/50 flex items-center gap-2">
          <Users className="size-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Delegasyon Üyeleri</h3>
          <span className="text-sm text-muted-foreground">({members.length})</span>
        </div>
        {membersLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            Henüz delegasyona katılan üye yok.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad Soyad</TableHead>
                <TableHead>E-posta</TableHead>
                <TableHead>Katılma Tarihi</TableHead>
                <TableHead>İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow
                  key={member.user_id}
                  className={cn(
                    member.accepted === true && "bg-emerald-500/10",
                    member.accepted === false && "bg-destructive/10"
                  )}
                >
                  <TableCell className="font-medium">{member.users.full_name}</TableCell>
                  <TableCell>{member.users.email}</TableCell>
                  <TableCell>
                    {new Date(member.joined_at).toLocaleDateString("tr-TR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>
                    {member.accepted === true ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-destructive"
                        disabled={memberActionMutation.isPending}
                        onClick={() => memberActionMutation.mutate({ target_user_id: member.user_id, action: "remove" })}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    ) : (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-emerald-500"
                          disabled={memberActionMutation.isPending}
                          onClick={() => memberActionMutation.mutate({ target_user_id: member.user_id, action: "accept" })}
                        >
                          <Check className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-destructive"
                          disabled={memberActionMutation.isPending}
                          onClick={() => memberActionMutation.mutate({ target_user_id: member.user_id, action: "reject" })}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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