"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Plus, BarChart2, Loader2, Vote as VoteIcon, X, History, Clock, PieChart, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { VoteCard, Vote } from "./VoteCard";
import { VoteResults } from "./VoteResults";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { COMMITTEE_LEADS, UserRole } from "@/lib/roles";

interface VotingSystemProps {
  committeeId: string;
  isChairman: boolean;
  userId: string;
  variant?: "sidebar" | "full"; // 'sidebar' = only active (widget), 'full' = management (dialog)
}

export function VotingSystem({ committeeId, isChairman, userId, variant = "full" }: VotingSystemProps) {
  const supabase = useSupabaseRealtime();
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  // Can manage votes? (Chairman OR Co-Chair)
  const canManage = COMMITTEE_LEADS.includes(session?.user?.role as UserRole);

  // UI States
  const [createOpen, setCreateOpen] = useState(false);
  const [activeVoteId, setActiveVoteId] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<string>("");

  // Confirmation & Summary States
  const [voteToClose, setVoteToClose] = useState<Vote | null>(null);
  const [summaryVote, setSummaryVote] = useState<Vote | null>(null);

  // Create Form State
  const [newTitle, setNewTitle] = useState("");
  const [newOptions, setNewOptions] = useState(["Evet", "Hayır", "Çekimser"]);

  // --- 1. Data Fetching ---
  const { data: votes = [], isLoading } = useQuery<Vote[]>({
    queryKey: ["votes", committeeId],
    queryFn: async () => {
      const res = await fetch(`/api/votes?committeeId=${committeeId}`);
      if (!res.ok) throw new Error("Failed to fetch votes");
      return res.json();
    },
    staleTime: 1000 * 30,
  });

  // --- 2. Realtime Subscription ---
  useEffect(() => {
    if (!supabase || !committeeId) return;

    const channel = supabase
      .channel(`committee-votes-${committeeId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'votes', filter: `committee_id=eq.${committeeId}` },
        () => {
          toast.info("Yeni oylama başlatıldı");
          queryClient.invalidateQueries({ queryKey: ["votes", committeeId] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'votes', filter: `committee_id=eq.${committeeId}` },
        () => queryClient.invalidateQueries({ queryKey: ["votes", committeeId] })
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'vote_responses' },
        () => queryClient.invalidateQueries({ queryKey: ["votes", committeeId] })
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [committeeId, queryClient, supabase]);

  // --- 3. Active Vote Popup Logic ---
  useEffect(() => {
    // If not a manager (delegate), auto-popup active votes if not voted yet
    if (!canManage && votes.length > 0) {
      const openVote = votes.find(v => v.status === 'open');
      if (openVote) {
        const hasVoted = openVote.responses?.some(r => r.user_id === userId);
        if (!hasVoted) {
          setActiveVoteId(openVote.id);
        }
      }
    }
  }, [votes, canManage, userId]);

  // --- 4. Mutations ---
  const createVoteMutation = useMutation({
    mutationFn: async () => {
      if (!newTitle.trim()) throw new Error("Başlık gereklidir");
      const validOptions = newOptions.filter(o => o.trim());
      if (validOptions.length < 2) throw new Error("En az 2 seçenek gereklidir");

      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ committeeId, title: newTitle, options: validOptions })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Oylama başlatılamadı");
      }
    },
    onSuccess: () => {
      setCreateOpen(false);
      setNewTitle("");
      setNewOptions(["Evet", "Hayır", "Çekimser"]);
      toast.success("Oylama başlatıldı");
      queryClient.invalidateQueries({ queryKey: ["votes", committeeId] });
    },
    onError: (e: any) => toast.error(e.message)
  });

  const castVoteMutation = useMutation({
    mutationFn: async ({ voteId, optionId }: { voteId: string, optionId: string }) => {
      const res = await fetch("/api/votes/cast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voteId, optionId })
      });

      if (!res.ok) {
        const err = await res.json();
        if (res.status === 409) throw new Error("Zaten oy kullandınız");
        throw new Error(err.error || "İşlem başarısız");
      }
    },
    onSuccess: () => {
      setActiveVoteId(null);
      setSelectedOption("");
      toast.success("Oyunuz kaydedildi");
      queryClient.invalidateQueries({ queryKey: ["votes", committeeId] });
    },
    onError: (err: any) => {
      toast.error(err.message);
      if (err.message.includes("Zaten")) setActiveVoteId(null);
    }
  });

  const closeVoteMutation = useMutation({
    mutationFn: async (vote: Vote) => {
      const res = await fetch(`/api/votes/${vote.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Oylama kapatılamadı");
      }
    },
    onMutate: async (vote) => {
      await queryClient.cancelQueries({ queryKey: ["votes", committeeId] });
      const previousVotes = queryClient.getQueryData<Vote[]>(["votes", committeeId]);
      if (previousVotes) {
        queryClient.setQueryData<Vote[]>(["votes", committeeId], (old) =>
          old?.map(v => v.id === vote.id ? { ...v, status: 'closed' as const } : v) || []
        );
      }
      return { previousVotes };
    },
    onSuccess: (data, vote) => {
      toast.success("Oylama kapatıldı");
      setSummaryVote({ ...vote, status: 'closed' });
      setVoteToClose(null);
      queryClient.invalidateQueries({ queryKey: ["votes", committeeId] });
    },
    onError: (err: any, variables, context) => {
      if (context?.previousVotes) {
        queryClient.setQueryData(["votes", committeeId], context.previousVotes);
      }
      toast.error(err.message);
    }
  });

  // --- Helper Functions ---
  const addOption = () => setNewOptions([...newOptions, ""]);
  const updateOption = (idx: number, val: string) => {
    const opts = [...newOptions];
    opts[idx] = val;
    setNewOptions(opts);
  };
  const removeOption = (idx: number) => setNewOptions(newOptions.filter((_, i) => i !== idx));

  // --- Derived State ---
  const activeVoteData = votes.find(v => v.id === activeVoteId);
  const activePolls = votes.filter(v => v.status === "open");
  const closedPolls = votes.filter(v => v.status === "closed");

  // --- VARIANT: SIDEBAR WIDGET ---
  // If sidebar mode and no active polls, show NOTHING.
  if (variant === "sidebar") {
    if (isLoading || activePolls.length === 0) return null;

    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="flex items-center justify-between px-1">
          <span className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Canlı Oylama
          </span>
        </div>
        {activePolls.map(vote => (
          <VoteCard
            key={vote.id}
            vote={vote}
            userId={userId}
            isChairman={canManage}
            onCloseVote={(v) => setVoteToClose(v)}
            onOpenVoteModal={(id) => { setActiveVoteId(id); setSelectedOption(""); }}
          />
        ))}
      </div>
    );
  }

  // --- VARIANT: FULL MANAGEMENT ---
  return (
    <div className="space-y-6">
      {/* Header / Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-secondary/10 p-4 rounded-lg border border-border/50">
        <div>
          <h3 className="font-semibold text-foreground">Oylama Merkezi</h3>
          <p className="text-xs text-muted-foreground">Aktif oylamalar ve geçmiş sonuçlar.</p>
        </div>
        {canManage && (
          <Button onClick={() => setCreateOpen(true)} className="shadow-sm w-full sm:w-auto" size="sm">
            <Plus className="w-4 h-4 mr-2" /> Yeni Oylama
          </Button>
        )}
      </div>

      {isLoading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}

      {!isLoading && votes.length === 0 && (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
          <VoteIcon className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Henüz bir oylama yapılmadı.</p>
        </div>
      )}

      {/* Active Polls Section */}
      {activePolls.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-primary flex items-center gap-2">
            <ActivityIcon /> Aktif Oylamalar
          </div>
          <div className="grid gap-4">
            {activePolls.map(vote => (
              <VoteCard
                key={vote.id}
                vote={vote}
                userId={userId}
                isChairman={canManage}
                onCloseVote={(v) => setVoteToClose(v)}
                onOpenVoteModal={(id) => { setActiveVoteId(id); setSelectedOption(""); }}
              />
            ))}
          </div>
        </div>
      )}

      {/* History Section */}
      {closedPolls.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <History className="w-4 h-4" /> Geçmiş Oylamalar
          </div>
          <ScrollArea className="h-[300px] pr-3">
            <div className="space-y-2">
              {closedPolls.map(vote => (
                <div
                  key={vote.id}
                  className="group bg-card border border-border/50 p-3 rounded-lg flex justify-between items-center hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setSummaryVote(vote)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-secondary/20 rounded-md text-muted-foreground group-hover:bg-secondary/40 transition-colors">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-foreground/90">{vote.title}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(vote.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-[10px] font-normal">{vote.responses.length} Oy</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                      <PieChart className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* --- DIALOGS (Managed by Parent/Self) --- */}

      {/* Create Vote */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Yeni Oylama</DialogTitle>
            <DialogDescription>Komite için yeni bir oylama başlatın.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label>Konu</Label>
              <Input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Örn: Karar Tasarısı 1.2"
              />
            </div>
            <div className="space-y-3">
              <Label className="flex justify-between">
                <span>Seçenekler</span>
                <span className="text-xs text-muted-foreground font-normal">{newOptions.length} adet</span>
              </Label>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {newOptions.map((opt, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input value={opt} onChange={e => updateOption(i, e.target.value)} className="h-8 text-sm" />
                    {newOptions.length > 2 && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeOption(i)}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addOption} className="w-full text-xs border-dashed h-8">
                <Plus className="w-3 h-3 mr-2" /> Seçenek Ekle
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>İptal</Button>
            <Button onClick={() => createVoteMutation.mutate()} disabled={createVoteMutation.isPending}>
              {createVoteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Başlat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cast Vote (For Delegates inside Full View if needed) */}
      <Dialog open={!!activeVoteId && !canManage} onOpenChange={(val) => !val && setActiveVoteId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Oy Kullan</DialogTitle>
            <DialogDescription>{activeVoteData?.title}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            {activeVoteData?.options.map(opt => (
              <Button
                key={opt.id}
                variant={selectedOption === opt.id ? "default" : "outline"}
                className={cn("justify-start h-11", selectedOption === opt.id && "ring-2 ring-offset-1")}
                onClick={() => setSelectedOption(opt.id)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button
              onClick={() => activeVoteId && selectedOption && castVoteMutation.mutate({ voteId: activeVoteId, optionId: selectedOption })}
              disabled={!selectedOption || castVoteMutation.isPending}
              className="w-full"
            >
              {castVoteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gönder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Confirmation */}
      <AlertDialog open={!!voteToClose} onOpenChange={(val) => !val && setVoteToClose(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Oylamayı Bitir?</AlertDialogTitle>
            <AlertDialogDescription>"{voteToClose?.title}" sonlandırılacak ve sonuçlar yayınlanacaktır.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={() => voteToClose && closeVoteMutation.mutate(voteToClose)} className="bg-destructive text-white hover:bg-destructive/90">
              Bitir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Results Summary */}
      <Dialog open={!!summaryVote} onOpenChange={(val) => !val && setSummaryVote(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Sonuçlar</DialogTitle>
            <DialogDescription>{summaryVote?.title}</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            {summaryVote && <VoteResults vote={summaryVote} userId={userId} />}
          </div>
          <div className="text-center text-xs text-muted-foreground border-t border-border pt-3">
            Toplam {summaryVote?.responses.length} oy kullanıldı.
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActivityIcon() {
  return (
    <span className="relative flex h-2 w-2 mr-1">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
    </span>
  )
}