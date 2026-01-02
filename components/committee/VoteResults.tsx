"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Vote } from "./VoteCard";

interface VoteResultsProps {
  vote: Vote;
  userId: string;
  isCompact?: boolean;
}

export function VoteResults({ vote, userId, isCompact = false }: VoteResultsProps) {
  const totalVotes = vote.responses?.length || 0;
  // If we are in summary mode (passed manually as closed) or actual closed status
  const isOpen = vote.status === "open";

  const results = useMemo(() => {
    return vote.options.map(opt => {
      const count = vote.responses.filter(r => r.option_id === opt.id).length;
      const percentage = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);
      const isUserChoice = vote.responses.some(r => r.user_id === userId && r.option_id === opt.id);
      
      return { ...opt, count, percentage, isUserChoice };
    });
  }, [vote.options, vote.responses, totalVotes, userId]);

  return (
    <div className={cn("space-y-3", isCompact ? "text-xs" : "text-sm")}>
      {results.map((opt) => (
        <div key={opt.id} className="space-y-1.5 group">
          <div className="flex justify-between items-end">
            <div className="flex items-center gap-2 font-medium text-foreground/90">
              {opt.label}
              {opt.isUserChoice && (
                <Badge variant="outline" className="text-[10px] h-4 px-1 bg-primary/5 text-primary border-primary/20 gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ben
                </Badge>
              )}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-foreground">{opt.count}</span>
              <span className="text-muted-foreground w-8 text-right text-xs opacity-70">{opt.percentage}%</span>
            </div>
          </div>
          
          <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden relative">
            <div 
              className={cn(
                "h-full transition-all duration-700 ease-out rounded-full",
                opt.isUserChoice ? "bg-primary" : "bg-primary/60",
                !isOpen && "grayscale opacity-70"
              )}
              style={{ width: `${opt.percentage}%` }} 
            />
          </div>
        </div>
      ))}
    </div>
  );
}