"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getRoleMeta, ROLES } from "@/lib/roles";

interface CommitteeMember {
  id: string;
  userId: string;
  full_name: string;
  role: string;
  image?: string;
  user?: { role: string };
}

interface MembersWidgetProps {
  members?: CommitteeMember[];
  isManager?: boolean;
  onMemberClick?: (id: string) => void;
  isLoading?: boolean;
}

export const MembersWidget = ({ members, isManager, onMemberClick, isLoading }: MembersWidgetProps) => {
  const [showAll, setShowAll] = useState(false);

  if (!members || members.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Committee members
          </span>
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-medium">--</Badge>
        </div>
        <div className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border/50 rounded-xl bg-muted/5">
          The member list is unavailable
        </div>
      </div>
    );
  }

  const sortedMembers = [...members].sort((a, b) => {
    const roleA = a.role || a.user?.role || ROLES.APPLICANT;
    const roleB = b.role || b.user?.role || ROLES.APPLICANT;
    // Rank descending
    return getRoleMeta(roleB).rank - getRoleMeta(roleA).rank;
  });

  const handleMemberClick = (id: string) => {
    if (isManager && onMemberClick) {
      onMemberClick(id);
    }
  };

  const renderMemberRow = (member: CommitteeMember, index: number) => {
    const role = member.role || member.user?.role || ROLES.APPLICANT;
    const meta = getRoleMeta(role);
    const isExecutive = role === ROLES.CHAIRMAN || role === ROLES.DEPUTY_CHAIR;

    return (
      <div
        key={member.id || member.userId || `member-${index}`}
        className={cn(
          "flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group",
          isManager && "cursor-pointer active:bg-muted/70"
        )}
        onClick={() => {
          if (showAll) setShowAll(false);
          handleMemberClick(member.userId);
        }}
      >
        <Avatar className="h-8 w-8 border border-transparent group-hover:border-border/50 transition-colors">
          <AvatarImage src={member.image} className="object-cover" />
          <AvatarFallback className="text-xs text-muted-foreground bg-secondary">
            {(member.full_name?.[0] || 'U').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="overflow-hidden flex-1">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium truncate text-foreground/90">
              {member.full_name}
            </div>
            {isExecutive && (
              <Badge variant="outline" className={cn("text-[9px] h-4 px-1 shadow-none", meta.bgClass, meta.colorClass, meta.borderClass)}>
                {role === ROLES.CHAIRMAN ? "Chair" : "Deputy chair"}
              </Badge>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            {meta.label}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Committee members
        </span>
        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-medium">{members.length}</Badge>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2 w-16" />
              </div>
            </div>
          ))
        ) : sortedMembers.slice(0, 6).map(renderMemberRow)}

        {!isLoading && sortedMembers.length > 6 && (
          <div className="pt-2 px-2">
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-primary w-auto"
              onClick={() => setShowAll(true)}
            >
              + {sortedMembers.length - 6} other members
            </Button>
          </div>
        )}

        <Dialog open={showAll} onOpenChange={setShowAll}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>All members ({members?.length || 0})</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {sortedMembers.map(renderMemberRow)}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
