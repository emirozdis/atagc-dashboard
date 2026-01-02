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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Plus, BarChart2, Loader2, Vote as VoteIcon, X, History, ChevronDown, ChevronUp, Clock, PieChart, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { VoteCard, Vote } from "./VoteCard"; 
import { VoteResults } from "./VoteResults";
import { cn } from "@/lib/utils";

interface VotingSystemProps {
  committeeId: string;
  isChairman: boolean;
  userId: string;
}

export function VotingSystem({ committeeId, isChairman, userId }: VotingSystemProps) {
  const supabase = useSupabaseRealtime();
  const queryClient = useQueryClient();
  
  // UI States
  const [createOpen, setCreateOpen] = useState(false);
  const [activeVoteId, setActiveVoteId] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [showHistory, setShowHistory] = useState(false);
  
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
    staleTime: 1000 * 60, // 1 minute cache
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
    if (!isChairman && votes.length > 0) {
      // Find the LATEST open vote
      const openVote = votes.find(v => v.status === 'open');
      
      if (openVote) {
        const hasVoted = openVote.responses?.some(r => r.user_id === userId);
        // Only open modal if vote is open AND user hasn't voted yet
        if (!hasVoted) {
          setActiveVoteId(openVote.id);
        } else if (activeVoteId === openVote.id) {
          // If modal is open but user just voted (via another tab?), close it
          setActiveVoteId(null);
        }
      } else {
        setActiveVoteId(null);
      }
    }
  }, [votes, isChairman, userId]);

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
      // OPTIMISTIC UPDATE: Update UI immediately before server responds
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
      
      // Update summary using the passed vote object (updated status)
      setSummaryVote({ ...vote, status: 'closed' });
      setVoteToClose(null);
      
      queryClient.invalidateQueries({ queryKey: ["votes", committeeId] });
    },
    onError: (err: any, variables, context) => {
      // Revert if failed
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border/50 shadow-sm">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
                <BarChart2 className="w-6 h-6 text-primary" />
            </div>
            <div>
                <h3 className="font-bold text-foreground">Komite Oylamaları</h3>
                <p className="text-xs text-muted-foreground hidden sm:block">Aktif ve geçmiş oylamaları yönetin.</p>
            </div>
        </div>
        {isChairman && (
          <Button onClick={() => setCreateOpen(true)} className="shadow-md" size="sm">
            <Plus className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">Yeni Oylama</span>
            <span className="sm:hidden">Yeni</span>
          </Button>
        )}
      </div>

      {/* Loading State */}
      {isLoading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}
      
      {/* Empty State */}
      {!isLoading && votes.length === 0 && (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl bg-muted/5">
            <VoteIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Henüz oylama kaydı bulunmuyor.</p>
        </div>
      )}

      {/* ACTIVE POLLS LIST */}
      <div className="space-y-4">
        {activePolls.map(vote => (
          <VoteCard 
            key={vote.id} 
            vote={vote} 
            userId={userId} 
            isChairman={isChairman} 
            onCloseVote={(v) => setVoteToClose(v)}
            onOpenVoteModal={(id) => { setActiveVoteId(id); setSelectedOption(""); }}
          />
        ))}
      </div>

      {/* CLOSED POLLS (Collapsible) */}
      {closedPolls.length > 0 && (
        <div className="pt-4 border-t border-border/30">
          <Button 
            variant="ghost" 
            className="w-full flex justify-between items-center text-muted-foreground hover:text-foreground mb-2 h-auto py-2"
            onClick={() => setShowHistory(!showHistory)}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <History className="w-4 h-4" />
              Geçmiş Oylamalar <span className="bg-secondary px-1.5 py-0.5 rounded-full text-xs">{closedPolls.length}</span>
            </span>
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>

          {showHistory && (
            <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-300">
              {closedPolls.map(vote => (
                <div 
                  key={vote.id} 
                  className="bg-card/50 border border-border/40 p-3 rounded-lg flex justify-between items-center hover:bg-card transition-colors cursor-pointer"
                  onClick={() => setSummaryVote(vote)}
                >
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-muted rounded-md text-muted-foreground">
                            <Clock className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="font-medium text-sm">{vote.title}</div>
                            <div className="text-xs text-muted-foreground">
                                {new Date(vote.created_at).toLocaleDateString('tr-TR')} • {vote.responses.length} Oy
                            </div>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-xs">Sonuçlar</Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- DIALOGS --- */}

      {/* 1. Create Vote */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Yeni Oylama Başlat</DialogTitle>
            <DialogDescription>Komite üyeleri için yeni bir oylama oluşturun.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label>Oylama Konusu</Label>
              <Input 
                value={newTitle} 
                onChange={e => setNewTitle(e.target.value)} 
                placeholder="Örn: Karar Tasarısı 1.2 Oylaması" 
                className="font-medium"
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Seçenekler</Label>
                <span className="text-xs text-muted-foreground">{newOptions.length} seçenek</span>
              </div>
              <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                {newOptions.map((opt, i) => (
                    <div key={i} className="flex gap-2 items-center animate-in slide-in-from-left-2 fade-in duration-200">
                        <span className="text-xs text-muted-foreground w-4 text-center">{i+1}</span>
                        <Input value={opt} onChange={e => updateOption(i, e.target.value)} className="h-9" />
                        {newOptions.length > 2 && (
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => removeOption(i)}>
                                <X className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addOption} className="w-full border-dashed">
                <Plus className="w-3 h-3 mr-2" /> Seçenek Ekle
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>İptal</Button>
            <Button onClick={() => createVoteMutation.mutate()} disabled={createVoteMutation.isPending}>
                {createVoteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Oylamayı Başlat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Cast Vote Modal */}
      <Dialog open={!!activeVoteId && !isChairman} onOpenChange={(val) => !val && setActiveVoteId(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1 text-primary">
                <VoteIcon className="w-5 h-5" />
                <span className="text-sm font-bold uppercase tracking-wider">Aktif Oylama</span>
            </div>
            <DialogTitle className="text-xl">{activeVoteData?.title}</DialogTitle>
            <DialogDescription>Lütfen oyunuzu kullanınız.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {activeVoteData?.options.map(opt => {
                const isSelected = selectedOption === opt.id;
                return (
                    <button 
                        key={opt.id} 
                        className={cn(
                            "relative flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 text-left hover:shadow-md",
                            isSelected 
                                ? "border-primary bg-primary/5 text-primary shadow-sm" 
                                : "border-muted bg-card hover:bg-muted/30 hover:border-muted-foreground/30"
                        )}
                        onClick={() => setSelectedOption(opt.id)}
                    >
                        <span className="font-semibold">{opt.label}</span>
                        <div className={cn(
                            "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                            isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
                        )}>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                    </button>
                );
            })}
          </div>
          <DialogFooter>
            <Button 
                onClick={() => activeVoteId && selectedOption && castVoteMutation.mutate({ voteId: activeVoteId, optionId: selectedOption })} 
                disabled={!selectedOption || castVoteMutation.isPending} 
                className="w-full py-6 text-lg shadow-lg shadow-primary/20"
            >
                {castVoteMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Oyumu Gönder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Confirmation Dialog (Close Vote) */}
      <AlertDialog open={!!voteToClose} onOpenChange={(val) => !val && setVoteToClose(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Oylamayı Bitir</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>&quot;{voteToClose?.title}&quot;</strong> başlıklı oylama sonlandırılacaktır. 
              Üyeler artık oy kullanamayacak ve sonuçlar kesinleşecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction 
                onClick={() => voteToClose && closeVoteMutation.mutate(voteToClose)} 
                className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {closeVoteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Bitir ve Sonuçları Gör"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 4. Summary Dialog */}
      <Dialog open={!!summaryVote} onOpenChange={(val) => !val && setSummaryVote(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                <PieChart className="w-5 h-5" />
                <span className="text-sm font-bold uppercase tracking-wider">Oylama Sonucu</span>
            </div>
            <DialogTitle className="text-xl">{summaryVote?.title}</DialogTitle>
            <DialogDescription>
                Oylama tamamlanmıştır. Kesinleşmiş sonuçlar aşağıdadır.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {summaryVote && <VoteResults vote={summaryVote} userId={userId} />}
          </div>

          <div className="bg-muted/30 p-3 rounded-lg flex justify-between text-sm text-muted-foreground border border-border/50">
             <span>Toplam Katılım</span>
             <span className="font-bold text-foreground">{summaryVote?.responses.length} Oy</span>
          </div>

          <DialogFooter>
            <Button onClick={() => setSummaryVote(null)} className="w-full">
                Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Change Log:
// - Updated `castVoteMutation` to accept an object `{ voteId, optionId }` as argument to avoid relying on component state.
// - Updated `closeVoteMutation` to accept the entire `Vote` object as argument. This fixes the bug where `voteToClose` state became null (due to dialog closing) before the async mutation function could read it.
// - Updated the `AlertDialogAction` onClick handler to pass `voteToClose` directly to `closeVoteMutation.mutate(voteToClose)`.
// - Updated `onSuccess` logic for closing votes to set `summaryVote` directly from the passed `vote` variable (updated with 'closed' status), ensuring correct data flow even if state clears.