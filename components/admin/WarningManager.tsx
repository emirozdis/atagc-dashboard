"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    AlertTriangle, Trash2, Plus, ShieldAlert,
    Gavel, Clock, Shirt, BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Warning, User, WarningCategory } from "@/types/user";
import { toast } from "sonner";
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
import { useSession } from "next-auth/react";
import { canManageRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";

interface WarningManagerProps {
    user: User;
    className?: string;
    variant?: "default" | "compact";
}

const CATEGORIES: Record<WarningCategory, { label: string; icon: typeof Gavel; color: string; bg: string }> = {
    behavior: { label: "Behavior", icon: Gavel, color: "text-red-500", bg: "bg-red-500/10" },
    attendance: { label: "Attendance", icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10" },
    dress_code: { label: "Dress code", icon: Shirt, color: "text-blue-500", bg: "bg-blue-500/10" },
    academic: { label: "Academic", icon: BookOpen, color: "text-purple-500", bg: "bg-purple-500/10" },
    other: { label: "Other", icon: AlertTriangle, color: "text-gray-500", bg: "bg-gray-500/10" }
};

export function WarningManager({ user, className, variant = "default" }: WarningManagerProps) {
    const { data: session } = useSession();
    const queryClient = useQueryClient();

    // States
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [reason, setReason] = useState("");
    const [category, setCategory] = useState<WarningCategory>("behavior");
    const [warningToDelete, setWarningToDelete] = useState<string | null>(null);
    const [deleteCooldown, setDeleteCooldown] = useState(0);

    useEffect(() => {
        if (!warningToDelete) return;
        const timer = window.setInterval(() => {
            setDeleteCooldown((current) => {
                if (current <= 1) {
                    window.clearInterval(timer);
                    return 0;
                }
                return current - 1;
            });
        }, 1000);
        return () => window.clearInterval(timer);
    }, [warningToDelete]);

    // Permission Checks
    const currentUserRole = session?.user?.role || "applicant";
    const currentUserId = session?.user?.id;
    const canWarn = canManageRole(currentUserRole, user.role);

    // Mutations
    const addWarningMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/admin/users/warnings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.id, category, reason }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed");
            }
        },
        onSuccess: () => {
            toast.success("Warning added");
            setReason("");
            setCategory("behavior");
            setIsAddOpen(false);
            queryClient.invalidateQueries({ queryKey: ["user", user.id] });
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to add warning.")
    });

    const deleteWarningMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/admin/users/warnings?id=${id}`, { method: "DELETE" });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed");
            }
        },
        onSuccess: () => {
            toast.success("Warning removed");
            setWarningToDelete(null);
            queryClient.invalidateQueries({ queryKey: ["user", user.id] });
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to remove warning.")
    });

    const canDelete = (warning: Warning) => {
        if (currentUserRole === 'superadmin') return true;
        return warning.issuer.id === currentUserId;
    };

    return (
        <Card className={cn("border-border/50 h-full border-l-4 border-l-yellow-500/50", className)}>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    Discipline & warnings
                </CardTitle>
                {canWarn && (
                    <Button size="sm" variant="outline" onClick={() => setIsAddOpen(true)} className="h-8">
                        <Plus className="w-3.5 h-3.5 mr-1.5" /> Add
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[250px] pr-4 -mr-4">
                    {(!user.user_warnings || user.user_warnings.length === 0) ? (
                        <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground text-sm border-2 border-dashed border-border/30 rounded-lg bg-muted/5">
                            <ShieldAlert className="w-8 h-8 opacity-20 mb-2" />
                            <p>This user has no active warnings.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {user.user_warnings.map((w) => {
                                const catMeta = CATEGORIES[w.category] || CATEGORIES.other;
                                const Icon = catMeta.icon;

                                return (
                                    <div key={w.id} className="p-3 bg-secondary/10 border border-border/50 rounded-lg space-y-2 group relative transition-colors hover:bg-secondary/20">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className={cn("px-2 py-0.5 text-[10px] gap-1", catMeta.bg, catMeta.color, "border-transparent")}>
                                                    <Icon className="w-3 h-3" />
                                                    {catMeta.label}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(w.created_at).toLocaleDateString('en-GB')}
                                                </span>
                                            </div>
                                            {canDelete(w) && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 -mt-1 -mr-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => { setDeleteCooldown(3); setWarningToDelete(w.id); }}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                        <p className="text-sm text-foreground/90 leading-relaxed font-medium break-words">
                                            {w.reason}
                                        </p>
                                        <div className="text-[10px] text-muted-foreground flex items-center justify-between pt-2 border-t border-border/30 mt-2">
                                            <div className="flex items-center gap-1">
                                                <span className="opacity-70">Issued by:</span>
                                                <span className="font-medium">{w.issuer.full_name}</span>
                                            </div>
                                            <span className="opacity-50 uppercase tracking-wider text-[9px]">{w.issuer.role}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add warning</DialogTitle>
                        <DialogDescription>
                            You are adding a disciplinary warning for this user.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={category} onValueChange={(val) => setCategory(val as WarningCategory)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="behavior">Behavior</SelectItem>
                                    <SelectItem value="attendance">Attendance</SelectItem>
                                    <SelectItem value="dress_code">Dress code</SelectItem>
                                    <SelectItem value="academic">Academic / procedure</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                placeholder="Describe the reason for the warning..."
                                className="min-h-[100px]"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={() => addWarningMutation.mutate()}
                            disabled={!reason.trim() || addWarningMutation.isPending}
                        >
                            {addWarningMutation.isPending ? "Adding..." : "Save warning"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!warningToDelete} onOpenChange={(val) => !val && setWarningToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>MAKE SURE YOU UNDERSTAND</AlertDialogTitle>
                        <AlertDialogDescription>
                            This permanently removes this warning from the conference record. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => warningToDelete && deleteWarningMutation.mutate(warningToDelete)}
                            disabled={deleteWarningMutation.isPending || deleteCooldown > 0}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            {deleteCooldown > 0 ? `Remove (${deleteCooldown})` : "I understand — remove"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
