"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, CheckCircle2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { VoteResults } from "./VoteResults";

// Types
export interface VoteOption {
  id: string;
  label: string;
}

export interface VoteResponse {
  option_id: string;
  user_id: string;
}

export interface Vote {
  id: string;
  title: string;
  status: "open" | "closed";
  created_at: string;
  options: VoteOption[];
  responses: VoteResponse[];
}

interface VoteCardProps {
  vote: Vote;
  userId: string;
  isChairman: boolean;
  onCloseVote: (vote: Vote) => void;
  onOpenVoteModal: (id: string) => void;
}

export function VoteCard({ vote, userId, isChairman, onCloseVote, onOpenVoteModal }: VoteCardProps) {
  const totalVotes = vote.responses?.length || 0;
  const isOpen = vote.status === "open";
  const hasUserVoted = vote.responses.some(r => r.user_id === userId);

  return (
    <Card className={cn(
      "transition-all duration-300 border-border/50",
      isOpen ? "shadow-md ring-1 ring-primary/10 border-primary/20" : "opacity-80 bg-muted/10"
    )}>
      <CardHeader className="pb-3 border-b border-border/40 bg-muted/5">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold leading-tight">{vote.title}</CardTitle>
            <CardDescription className="text-xs">
              {new Date(vote.created_at).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })}
            </CardDescription>
          </div>
          {isOpen ? (
            <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20 whitespace-nowrap animate-pulse">
              Aktif
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground whitespace-nowrap">
              Kapandı
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        <VoteResults vote={vote} userId={userId} />
      </CardContent>

      <CardFooter className="pt-3 pb-3 bg-muted/5 border-t border-border/40 flex justify-between items-center text-xs">
        <div className="flex items-center text-muted-foreground gap-1.5">
          <User className="w-3.5 h-3.5" />
          <span>Toplam: <strong className="text-foreground">{totalVotes}</strong> oy</span>
        </div>

        <div className="flex gap-2">
          {/* Delegate Action: Vote */}
          {!isChairman && isOpen && !hasUserVoted && (
            <Button size="sm" onClick={() => onOpenVoteModal(vote.id)}>
              Oy Kullan
            </Button>
          )}
          
          {/* Delegate Status: Voted */}
          {!isChairman && isOpen && hasUserVoted && (
            <span className="text-green-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Oy Verildi
            </span>
          )}

          {/* Chairman Action: Close */}
          {isChairman && isOpen && (
            <Button 
              variant="destructive" 
              size="sm" 
              className="h-7 text-xs px-2.5"
              onClick={() => onCloseVote(vote)}
            >
              <Lock className="w-3 h-3 mr-1.5" /> Bitir
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}