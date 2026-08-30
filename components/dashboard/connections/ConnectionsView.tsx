// components/dashboard/connections/ConnectionsView.tsx

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    Users, UserPlus, Check, X, Trash2, Search, Mail,
    Loader2, Clock,
    Send
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConnectionState } from "@/types/connection";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ConnectionsView() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState(() => {
        if (typeof window === "undefined") return "list";
        const hash = window.location.hash.slice(1);
        return hash === "pending" || hash === "sent" || hash === "list" ? hash : "list";
    });

    // Dialog State
    const [itemToDelete, setItemToDelete] = useState<{ id: string, name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const { data, isLoading } = useQuery<ConnectionState>({
        queryKey: ['connections'],
        queryFn: async () => {
            const res = await fetch("/api/connections");
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        refetchInterval: 30000 // Auto-refresh every 30s for new requests
    });

    const respondMutation = useMutation({
        mutationFn: async ({ id, action }: { id: string, action: 'accept' | 'reject' }) => {
            const res = await fetch("/api/connections/respond", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ connectionId: id, action })
            });
            if (!res.ok) throw new Error("Failed");
        },
        onSuccess: () => {
            toast.success("Request updated");
            queryClient.invalidateQueries({ queryKey: ['connections'] });
        },
        onError: () => toast.error("Unable to update request")
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/connections/respond?id=${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed");
        },
        onSuccess: () => {
            toast.success("Connection removed");
            queryClient.invalidateQueries({ queryKey: ['connections'] });
            setItemToDelete(null);
        },
        onError: () => toast.error("Unable to remove connection")
    });

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        try {
            await deleteMutation.mutateAsync(itemToDelete.id);
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredConnections = (data?.connected || []).filter(c =>
        c.friend.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (c.friend.user_details?.high_schools?.school_name || c.friend.user_details?.additional_info?.manual_school_name || "").toLowerCase().includes(search.toLowerCase())
    );

    const pendingReceivedCount = data?.pending.length || 0;
    const pendingSentCount = data?.sent.length || 0;

    if (isLoading) {
        return (
            <div className="mx-auto max-w-6xl space-y-6 p-5 sm:p-8">
                <div className="flex flex-col gap-4">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">Connections</h2>
                        <p className="text-muted-foreground mt-1 text-sm md:text-base">
                            People you have connected with during the conference.
                        </p>
                    </div>

                    <div className="w-full">
                        <div className="flex flex-col md:flex-row justify-between gap-4 items-stretch md:items-center mb-6">
                            <div className="bg-muted/50 p-1 rounded-lg flex items-center gap-1">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton key={i} className="h-9 w-24 sm:w-32 rounded-md" />
                                ))}
                            </div>
                            <Skeleton className="h-10 w-full md:w-64 rounded-md" />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            {[1, 2, 3, 4].map(i => (
                                <Card key={i} className="border-border/50">
                                    <CardContent className="p-4 flex items-start gap-4">
                                        <Skeleton className="w-12 h-12 rounded-full" />
                                        <div className="flex-1 space-y-2">
                                            <div className="flex justify-between">
                                                <Skeleton className="h-4 w-32" />
                                                <Skeleton className="h-5 w-16" />
                                            </div>
                                            <Skeleton className="h-3 w-48" />
                                            <Skeleton className="h-3 w-24" />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6 p-5 animate-fade-in sm:p-8">
            <div className="flex flex-col gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">Connections</h2>
                    <p className="text-muted-foreground mt-1 text-sm md:text-base">
                        People you have connected with during the conference.
                    </p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="flex flex-col md:flex-row justify-between gap-4 items-stretch md:items-center mb-6">
                        <TabsList className="grid grid-cols-3 w-full md:w-auto h-auto p-1">
                            <TabsTrigger value="list" className="gap-2 py-2">
                                <Users className="w-4 h-4" />
                                <span className="hidden sm:inline">Connections</span>
                                <span className="ml-1 text-xs bg-muted-foreground/10 px-1.5 rounded-full">{data?.connected.length || 0}</span>
                            </TabsTrigger>
                            <TabsTrigger value="pending" className="gap-2 py-2 relative">
                                <UserPlus className="w-4 h-4" />
                                <span className="hidden sm:inline">Received</span>
                                {pendingReceivedCount > 0 && (
                                    <Badge variant="destructive" className="ml-1 px-1.5 h-5 text-[10px] pointer-events-none">
                                        {pendingReceivedCount}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="sent" className="gap-2 py-2">
                                <Send className="w-4 h-4" />
                                <span className="hidden sm:inline">Sent</span>
                                <span className="ml-1 text-xs bg-muted-foreground/10 px-1.5 rounded-full">{pendingSentCount}</span>
                            </TabsTrigger>
                        </TabsList>

                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name or school..."
                                className="pl-9 h-10 bg-card border-border/50"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Connected Users Tab */}
                    <TabsContent value="list" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        {filteredConnections.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-border/50 rounded-xl bg-muted/5 text-center px-4">
                                <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                                    <Users className="w-8 h-8 text-muted-foreground/40" />
                                </div>
                                <h3 className="text-lg font-medium">No connections yet</h3>
                                <p className="text-muted-foreground text-sm max-w-sm mt-2">
                                    Connect with other participants to see them here.
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {filteredConnections.map((conn) => (
                                    <Card key={conn.id} className="group overflow-hidden border-border/50 hover:border-primary/20 transition-all">
                                        <CardContent className="p-4 flex items-start gap-4">
                                            <Avatar className="w-12 h-12 border border-border">
                                                <AvatarImage src={conn.friend.user_details?.profile_picture_url || undefined} className="object-cover" />
                                                <AvatarFallback className="bg-primary/5 text-primary">{conn.friend.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>

                                            <div className="flex-1 min-w-0 space-y-1">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-semibold text-sm truncate pr-2">{conn.friend.full_name}</h4>
                                                    <Badge variant="secondary" className="text-[9px] h-5 px-1.5 capitalize shrink-0">
                                                        {conn.friend.role === 'applicant' ? 'Delegate' : conn.friend.role.replace('_', ' ')}
                                                    </Badge>
                                                </div>

                                                <p className="text-xs text-muted-foreground truncate">{conn.friend.user_details?.high_schools?.school_name || conn.friend.user_details?.additional_info?.manual_school_name || "School not specified"}</p>

                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                                                    <Mail className="w-3 h-3 opacity-70" />
                                                    <span className="truncate max-w-[150px]">{conn.friend.email}</span>
                                                </div>
                                            </div>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity -mr-2"
                                                onClick={() => setItemToDelete({ id: conn.id, name: conn.friend.full_name })}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Received Requests Tab */}
                    <TabsContent value="pending" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        {(!data?.pending || data.pending.length === 0) ? (
                            <div className="flex flex-col items-center justify-center py-16 border border-border/50 rounded-xl bg-card/30 text-center">
                                <UserPlus className="w-10 h-10 text-muted-foreground/30 mb-3" />
                                <p className="text-muted-foreground">You have no pending requests.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {data.pending.map((req) => (
                                    <Card key={req.id} className="border-primary/20 bg-primary/5">
                                        <CardContent className="p-4 flex items-center gap-4">
                                            <Avatar className="w-10 h-10 border border-primary/20 ring-2 ring-primary/5">
                                                <AvatarImage src={req.requester.user_details?.profile_picture_url || undefined} className="object-cover" />
                                                <AvatarFallback>{req.requester.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>

                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-sm truncate">{req.requester.full_name}</h4>
                                                <p className="text-xs text-muted-foreground">Wants to connect with you.</p>
                                            </div>

                                            <div className="flex gap-2 shrink-0">
                                                <Button
                                                    size="icon"
                                                    variant="outline"
                                                    className="h-8 w-8 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:border-red-500/50"
                                                    onClick={() => respondMutation.mutate({ id: req.id, action: 'reject' })}
                                                    disabled={respondMutation.isPending}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    className="h-8 w-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                                                    onClick={() => respondMutation.mutate({ id: req.id, action: 'accept' })}
                                                    disabled={respondMutation.isPending}
                                                >
                                                    {respondMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Sent Requests Tab */}
                    <TabsContent value="sent" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        {(!data?.sent || data.sent.length === 0) ? (
                            <div className="flex flex-col items-center justify-center py-16 border border-border/50 rounded-xl bg-card/30 text-center">
                                <Send className="w-10 h-10 text-muted-foreground/30 mb-3" />
                                <p className="text-muted-foreground">You have no pending sent requests.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {data.sent.map((req) => (
                                    <Card key={req.id} className="border-border/50 bg-card/50">
                                        <CardContent className="p-4 flex items-center gap-4">
                                            <Avatar className="w-10 h-10 border border-border grayscale opacity-80">
                                                <AvatarImage src={req.recipient.user_details?.profile_picture_url || undefined} className="object-cover" />
                                                <AvatarFallback>{req.recipient.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>

                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-sm truncate">{req.recipient.full_name}</h4>
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <Clock className="w-3 h-3" />
                                                    <span>Awaiting response</span>
                                                </div>
                                            </div>

                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => deleteMutation.mutate(req.id)}
                                                disabled={deleteMutation.isPending}
                                            >
                                                <span className="text-xs">Cancel</span>
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Confirmation Dialog */}
            <AlertDialog open={!!itemToDelete} onOpenChange={(val) => !val && setItemToDelete(null)}>
                <AlertDialogContent className="max-w-[90vw] sm:max-w-md rounded-xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove connection</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove <strong>{itemToDelete?.name}</strong>? This removes the connection for both participants.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handleDeleteConfirm(); }}
                            disabled={isDeleting}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remove"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
