"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Copy, Plus, Check, Users, Trash2, X,
  Send, Mail, Clock, RefreshCcw, ShieldCheck, Ticket, UserPlus, Loader2
} from "lucide-react";
import { toast } from "sonner";

type InviteCode = {
  invite_code: string;
  delegation: string;
  uses_left: number | null;
  created_at: string;
};

type MagicLink = {
  id: string;
  sent_to: string;
  is_used: boolean;
  created_at: string;
};

type DelegationMember = {
  user_id: string;
  joined_at: string;
  accepted: boolean | null;
  users: {
    full_name: string;
    email: string;
    application?: { status: string }[];
  };
};

type MembersResponse = {
  success: boolean;
  data: DelegationMember[];
  is_leader: boolean;
  has_delegation: boolean;
};

function DelegationContent() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const validTab = tabParam === "invites" ? "invites" : "members";

  useEffect(() => {
    if (tabParam !== "members" && tabParam !== "invites") {
      router.replace(`/dashboard/delegation?tab=members`);
    }
  }, [tabParam]);

  const handleTabChange = (value: string) => {
    router.replace(`/dashboard/delegation?tab=${value}`, { scroll: false });
  };

  // Dialogs
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);

  // Forms
  const [usesLeft, setUsesLeft] = useState("");
  const [magicLinkEmail, setMagicLinkEmail] = useState("");

  // UI State
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // --- Queries ---

  const { data: profileData } = useQuery({
    queryKey: ['participant-me'],
    queryFn: async () => {
      const res = await fetch("/api/participant/me");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  const leaderAppStatus = profileData?.application?.status;

  const { data: membersData, isLoading: membersLoading } = useQuery<MembersResponse>({
    queryKey: ["delegation-members"],
    queryFn: async () => {
      const res = await fetch("/api/delegation/list_delegation_members");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const isLeader = membersData?.is_leader === true;

  const { data: codesData, isLoading: codesLoading } = useQuery<{ success: boolean; data: InviteCode[] }>({
    queryKey: ["delegation-invite-codes"],
    queryFn: async () => {
      const res = await fetch("/api/delegation/list_invite_codes");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: isLeader
  });

  const { data: magicLinksData, isLoading: magicLinksLoading } = useQuery<{ data: MagicLink[] }>({
    queryKey: ["delegation-magic-links"],
    queryFn: async () => {
      const res = await fetch("/api/delegation/magiclinks");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: isLeader
  });

  // --- Mutations ---

  const createCodeMutation = useMutation({
    mutationFn: async (usesLeftValue: number | undefined) => {
      const body: Record<string, number> = {};
      if (usesLeftValue !== undefined) body.uses_left = usesLeftValue;

      const res = await fetch("/api/delegation/new_invite_code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegation-invite-codes"] });
      setCodeDialogOpen(false);
      setUsesLeft("");
      toast.success("Invitation code created");
    },
    onError: () => toast.error("Could not create the code")
  });

  const magicLinkMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/delegation/create_magiclink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sent_to: email }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegation-magic-links"] });
      setMagicLinkEmail("");
      toast.success("Invitation email sent");
    },
    onError: () => toast.error("Could not send the invitation")
  });

  const revokeLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/delegation/magiclinks?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegation-magic-links"] });
      toast.success("Invitation cancelled");
    },
    onError: () => toast.error("Could not remove the invitation")
  });

  const memberActionMutation = useMutation({
    mutationFn: async ({ target_user_id, action }: { target_user_id: string; action: "accept" | "reject" | "remove" }) => {
      const res = await fetch("/api/delegation/change_accepted_status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_user_id, action }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegation-members"] });
      toast.success("Action completed");
    },
    onError: () => toast.error("Action failed")
  });

  // --- Handlers ---

  const handleCreateCode = () => {
    const parsed = usesLeft.trim() ? parseInt(usesLeft, 10) : undefined;
    createCodeMutation.mutate(parsed);
  };

  const handleSendMagicLink = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!magicLinkEmail.trim()) return;
    magicLinkMutation.mutate(magicLinkEmail.trim());
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
    toast.success("Copied");
  };

  const members = membersData?.data ?? [];
  const inviteCodes = codesData?.data ?? [];
  const magicLinks = magicLinksData?.data ?? [];

  // Helper to render application status badge
  const AppStatusBadge = ({ status }: { status: string | undefined }) => {
    if (status === 'approved') return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1"><ShieldCheck className="w-3 h-3" /> Approved</Badge>;
    if (status === 'rejected') return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">Rejected</Badge>;
    if (status === 'pending') return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</Badge>;
    return <span className="text-muted-foreground text-xs italic">No application</span>;
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/50 pb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
            {isLeader ? "Delegation management" : "Delegation team"}
          </h2>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2">
            <p className="text-sm text-muted-foreground">
              {isLeader ? "Manage your team and invitations." : "Your delegation team members."}
            </p>
            {isLeader && (
              <>
                <div className="h-4 w-px bg-border hidden sm:block" />
                <div className="flex items-center gap-2 text-sm bg-secondary/30 px-2 py-1 rounded-md border border-border/50">
                  <span className="text-muted-foreground text-xs">Your application:</span>
                  {leaderAppStatus === 'approved' ? <span className="font-semibold text-emerald-600 flex items-center gap-1 text-xs"><Check className="w-3 h-3" /> Approved</span> :
                    leaderAppStatus === 'rejected' ? <span className="font-semibold text-red-600 flex items-center gap-1 text-xs"><X className="w-3 h-3" /> Rejected</span> :
                      leaderAppStatus === 'pending' ? <span className="font-semibold text-amber-600 flex items-center gap-1 text-xs"><Clock className="w-3 h-3" /> Pending</span> :
                        <span className="text-xs">No application</span>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <Tabs value={validTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className={cn("grid w-full", isLeader ? "grid-cols-2 sm:w-[400px]" : "grid-cols-1 sm:w-[200px]")}>
          <TabsTrigger value="members" className="gap-2">
            <Users className="w-4 h-4" /> Members
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">{members.length}</Badge>
          </TabsTrigger>
          {isLeader && (
            <TabsTrigger value="invites" className="gap-2">
              <Ticket className="w-4 h-4" /> Invitations
            </TabsTrigger>
          )}
        </TabsList>

        {/* MEMBERS TAB */}
        <TabsContent value="members" className="space-y-4 animate-in fade-in slide-in-from-left-2">
          <Card className="border-border/50 shadow-sm bg-card overflow-hidden">
            <CardHeader className="border-b border-border/50 bg-muted/5 pb-4">
              <div className="flex justify-between items-center gap-3">
                <div>
                  <CardTitle className="text-base sm:text-lg">Delegation members</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">People who have joined the delegation.</CardDescription>
                </div>
                {isLeader && (
                  <Button
                    size="sm"
                    className="gap-2 shrink-0"
                    onClick={() => handleTabChange("invites")}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add delegate</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {membersLoading ? (
                <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 sm:h-12 w-full rounded-lg" />)}
                </div>
              ) : members.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center text-muted-foreground px-4">
                  <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 opacity-40" />
                  </div>
                  <p className="text-sm">No delegation members yet.</p>
                  {isLeader && (
                    <Button variant="link" onClick={() => handleTabChange("invites")} className="mt-2 text-sm">
                      Invite someone now &rarr;
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Mobile card layout */}
                  <div className="sm:hidden divide-y divide-border/40">
                    {members.map((member) => {
                      const appStatus = member.users.application?.[0]?.status;
                      const isAccepted = member.accepted === true;
                      const isRejected = member.accepted === false;

                      return (
                        <div
                          key={member.user_id}
                          className={cn(
                            "p-4 space-y-3 transition-colors",
                            isAccepted ? "bg-emerald-500/5" :
                              isRejected ? "bg-red-500/5" : ""
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-medium text-sm truncate">{member.users.full_name}</span>
                                {isAccepted && (
                                  <span className="text-[10px] text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded shrink-0">
                                    Accepted
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{member.users.email}</p>
                            </div>
                            <AppStatusBadge status={appStatus} />
                          </div>
                          {isLeader && (
                            <div className="flex justify-end">
                              {isAccepted ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 px-3 text-xs gap-1.5"
                                        disabled={memberActionMutation.isPending}
                                        onClick={() => memberActionMutation.mutate({ target_user_id: member.user_id, action: "remove" })}
                                      >
                                    <Trash2 className="w-3.5 h-3.5" /> Remove
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Remove member</p></TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 hover:border-emerald-500/50"
                                    disabled={memberActionMutation.isPending}
                                    onClick={() => memberActionMutation.mutate({ target_user_id: member.user_id, action: "accept" })}
                                  >
                                        <Check className="w-3 h-3 mr-1" /> Accept
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-500/10"
                                    disabled={memberActionMutation.isPending}
                                    onClick={() => memberActionMutation.mutate({ target_user_id: member.user_id, action: "reject" })}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop table layout */}
                  <div className="hidden sm:block">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="pl-6">Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Application status</TableHead>
                          {isLeader && <TableHead className="text-right pr-6">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((member) => {
                          const appStatus = member.users.application?.[0]?.status;
                          const isAccepted = member.accepted === true;
                          const isRejected = member.accepted === false;

                          return (
                            <TableRow
                              key={member.user_id}
                              className={cn(
                                "transition-colors",
                                isAccepted ? "bg-emerald-500/5 hover:bg-emerald-500/10" :
                                  isRejected ? "bg-red-500/5 hover:bg-red-500/10" :
                                    "hover:bg-muted/30"
                              )}
                            >
                              <TableCell className="font-medium pl-6">
                                {member.users.full_name}
                                {isAccepted && <span className="ml-2 text-[10px] text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">Accepted</span>}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">{member.users.email}</TableCell>
                              <TableCell>
                                <AppStatusBadge status={appStatus} />
                              </TableCell>
                              {isLeader && (
                                <TableCell className="text-right pr-6">
                                  {isAccepted ? (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                            disabled={memberActionMutation.isPending}
                                            onClick={() => memberActionMutation.mutate({ target_user_id: member.user_id, action: "remove" })}
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Remove member</p></TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ) : (
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 hover:border-emerald-500/50"
                                        disabled={memberActionMutation.isPending}
                                        onClick={() => memberActionMutation.mutate({ target_user_id: member.user_id, action: "accept" })}
                                      >
                                        <Check className="w-3 h-3 mr-1.5" /> Accept
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-500/10"
                                        disabled={memberActionMutation.isPending}
                                        onClick={() => memberActionMutation.mutate({ target_user_id: member.user_id, action: "reject" })}
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* INVITES TAB (Only for Leader) */}
        {isLeader && (
          <TabsContent value="invites" className="space-y-6 animate-in fade-in slide-in-from-right-2">

            <div className="grid gap-6 md:grid-cols-2 items-start">

              {/* LEFT COLUMN: MAGIC LINKS */}
              <div className="space-y-6">
                {/* CREATE MAGIC LINK CARD */}
                <Card className="border-primary/20 bg-primary/5 shadow-sm">
                  <CardHeader className="pb-3 sm:pb-6">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-primary">
                      <Send className="w-4 h-4 sm:w-5 sm:h-5" /> Quick invitation
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Send a one-time registration link to an email address.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSendMagicLink} className="flex gap-2">
                      <Input
                        placeholder="ornek@email.com"
                        value={magicLinkEmail}
                        onChange={(e) => setMagicLinkEmail(e.target.value)}
                        className="bg-background min-w-0"
                        type="email"
                      />
                      <Button type="submit" disabled={magicLinkMutation.isPending || !magicLinkEmail} className="shrink-0">
                        {magicLinkMutation.isPending ? <RefreshCcw className="w-4 h-4 animate-spin" /> : "Send"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* MAGIC LINKS LIST CARD */}
                <Card className="border-border/50 bg-card overflow-hidden">
                  <CardHeader className="pb-4 border-b border-border/50 bg-muted/5">
                    <CardTitle className="text-sm sm:text-base font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      Sent invitations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {magicLinksLoading ? (
                      <div className="p-4 space-y-3">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ) : magicLinks.length === 0 ? (
                      <div className="p-8 text-center text-sm text-muted-foreground">No invitations have been sent.</div>
                    ) : (
                      <div className="max-h-[400px] overflow-y-auto">
                        {/* Mobile card layout */}
                        <div className="sm:hidden divide-y divide-border/40">
                          {magicLinks.map((link) => (
                            <div key={link.id} className="flex items-center justify-between gap-2 p-3">
                              <p className="text-sm font-medium truncate min-w-0 flex-1">{link.sent_to}</p>
                              <div className="shrink-0">
                                {link.is_used ? (
                                  <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground border-transparent px-2">Used</Badge>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50 px-2">Pending</Badge>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => revokeLinkMutation.mutate(link.id)}
                                      disabled={revokeLinkMutation.isPending}
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Desktop table layout */}
                        <div className="hidden sm:block">
                          <Table>
                            <TableHeader className="bg-muted/5 sticky top-0 z-10">
                              <TableRow className="border-b border-border/50 hover:bg-transparent">
                                <TableHead className="h-10 text-xs uppercase tracking-wider font-semibold text-muted-foreground pl-4">Email</TableHead>
                                <TableHead className="h-10 text-xs uppercase tracking-wider font-semibold text-muted-foreground text-right pr-4">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {magicLinks.map((link) => (
                                <TableRow key={link.id} className="hover:bg-muted/30 transition-colors border-b border-border/40 last:border-0">
                                  <TableCell className="font-medium text-sm py-3 pl-4">
                                    {link.sent_to}
                                  </TableCell>
                                  <TableCell className="text-right py-3 pr-4">
                                    {link.is_used ? (
                                      <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground border-transparent px-2">Used</Badge>
                                    ) : (
                                      <div className="flex items-center justify-end gap-2">
                                        <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50 px-2">Pending</Badge>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                          onClick={() => revokeLinkMutation.mutate(link.id)}
                                          disabled={revokeLinkMutation.isPending}
                                          title="Cancel"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </Button>
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* RIGHT COLUMN: INVITE CODES */}
              <div className="space-y-6">
                <Card className="border-border/50 bg-card overflow-hidden h-full">
                  <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50 bg-muted/5 gap-3">
                    <div className="space-y-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <Ticket className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                        <span className="truncate">Invitation codes</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                      Reusable invitation codes.
                      </CardDescription>
                    </div>
                    <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="h-8 shrink-0">
                          <Plus className="w-3.5 h-3.5 sm:mr-1.5" />
                          <span className="hidden sm:inline">New code</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[calc(100%-2rem)] sm:w-auto max-w-md mx-auto">
                        <DialogHeader>
                          <DialogTitle>Create invitation code</DialogTitle>
                          <DialogDescription>
                            Multiple people can register with this code. You can set a usage limit.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-3">
                          <label className="text-sm font-medium">Usage limit (optional)</label>
                          <Input
                            type="number"
                            min="1"
                            placeholder="Leave blank for unlimited"
                            value={usesLeft}
                            onChange={(e) => setUsesLeft(e.target.value)}
                          />
                        </div>
                        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                          <Button variant="ghost" onClick={() => setCodeDialogOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                          <Button onClick={handleCreateCode} disabled={createCodeMutation.isPending} className="w-full sm:w-auto">
                            {createCodeMutation.isPending ? "Creating..." : "Create"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent className="p-0">
                    {codesLoading ? (
                      <div className="p-4 space-y-3">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ) : inviteCodes.length === 0 ? (
                      <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                        <Ticket className="w-10 h-10 mb-2 opacity-20" />
                        <p className="text-sm">There is no active invitation code.</p>
                      </div>
                    ) : (
                      <>
                        {/* Mobile card layout */}
                        <div className="sm:hidden divide-y divide-border/40">
                          {inviteCodes.map((code) => (
                            <div key={code.invite_code} className="flex items-center justify-between gap-3 p-3">
                              <code className="bg-secondary/50 px-2 py-1 rounded text-primary font-mono text-sm border border-border/50 shadow-sm truncate flex-1 min-w-0">
                                {code.invite_code}
                              </code>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-sm text-muted-foreground">
                                  {code.uses_left === null ? <span className="text-base">∞</span> : <span className="font-medium text-foreground">{code.uses_left}</span>}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-background border border-transparent hover:border-border/50"
                                  onClick={() => copyToClipboard(code.invite_code)}
                                >
                                  {copiedCode === code.invite_code ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Desktop table layout */}
                        <div className="hidden sm:block">
                          <Table>
                            <TableHeader className="bg-muted/5">
                              <TableRow className="border-b border-border/50 hover:bg-transparent">
                                <TableHead className="h-10 text-xs uppercase tracking-wider font-semibold text-muted-foreground pl-6">Kod</TableHead>
                                <TableHead className="h-10 text-xs uppercase tracking-wider font-semibold text-muted-foreground text-center">Limit</TableHead>
                                <TableHead className="h-10 w-10 pr-6"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {inviteCodes.map((code) => (
                                <TableRow key={code.invite_code} className="hover:bg-muted/30 transition-colors border-b border-border/40 last:border-0">
                                  <TableCell className="pl-6 py-3">
                                    <div className="flex items-center gap-2">
                                      <code className="bg-secondary/50 px-2 py-1 rounded text-primary font-mono text-sm border border-border/50 shadow-sm">
                                        {code.invite_code}
                                      </code>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center text-sm text-muted-foreground py-3">
                                    {code.uses_left === null ? <span className="text-xl">∞</span> : <span className="font-medium text-foreground">{code.uses_left}</span>}
                                  </TableCell>
                                  <TableCell className="pr-6 py-3 text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 hover:bg-background border border-transparent hover:border-border/50 shadow-none hover:shadow-sm"
                                      onClick={() => copyToClipboard(code.invite_code)}
                                    >
                                      {copiedCode === code.invite_code ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

            </div>
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}

export default function DelegationPage() {
  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12 px-4 sm:px-6">
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Delegation" }]} />
      <Suspense fallback={
        <div className="space-y-5" aria-label="Loading delegation details">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-12 w-full max-w-md" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      }>
        <DelegationContent />
      </Suspense>
    </div>
  );
}
