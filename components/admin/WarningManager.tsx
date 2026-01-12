"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Trash2, Plus, AlertCircle, ShieldAlert } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Warning, User } from "@/types/user";
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

export function WarningManager({ user, className, variant = "default" }: WarningManagerProps) {
    const { data: session } = useSession();
    const queryClient = useQueryClient();
    
    // States
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [reason, setReason] = useState("");
    const [warningToDelete, setWarningToDelete] = useState<string | null>(null);

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
                body: JSON.stringify({ userId: user.id, reason }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed");
            }
        },
        onSuccess: () => {
            toast.success("Uyarı eklendi");
            setReason("");
            setIsAddOpen(false);
            queryClient.invalidateQueries({ queryKey: ["user", user.id] });
        },
        onError: (err: any) => toast.error(err.message)
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
            toast.success("Uyarı kaldırıldı");
            setWarningToDelete(null);
            queryClient.invalidateQueries({ queryKey: ["user", user.id] });
        },
        onError: (err: any) => toast.error(err.message)
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
                    Disiplin & Uyarılar
                </CardTitle>
                {canWarn && (
                    <Button size="sm" variant="outline" onClick={() => setIsAddOpen(true)} className="h-8">
                        <Plus className="w-3.5 h-3.5 mr-1.5" /> Ekle
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[250px] pr-4 -mr-4">
                    {(!user.user_warnings || user.user_warnings.length === 0) ? (
                        <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground text-sm border-2 border-dashed border-border/30 rounded-lg">
                            <ShieldAlert className="w-8 h-8 opacity-20 mb-2" />
                            <p>Bu kullanıcının aktif uyarısı yok.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {user.user_warnings.map((w) => (
                                <div key={w.id} className="p-3 bg-secondary/10 border border-border/50 rounded-lg space-y-2 group relative">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 px-1.5 py-0 text-[10px]">
                                                Uyarı
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(w.created_at).toLocaleDateString('tr-TR')}
                                            </span>
                                        </div>
                                        {canDelete(w) && (
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-6 w-6 -mt-1 -mr-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => setWarningToDelete(w.id)}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                    <p className="text-sm text-foreground/90 leading-relaxed font-medium break-words">
                                        {w.reason}
                                    </p>
                                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1 border-t border-border/30">
                                        <span className="opacity-70">Veren:</span> 
                                        <span className="font-medium">{w.issuer.full_name}</span>
                                        <span className="opacity-50">({w.issuer.role})</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>

            {/* Add Warning Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Uyarı Ekle</DialogTitle>
                        <DialogDescription>
                            Bu kullanıcıya disiplin uyarısı veriyorsunuz. Bu işlem kullanıcı siciline işlenecektir.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <Textarea 
                            placeholder="Uyarı sebebini detaylıca yazınız..." 
                            className="min-h-[100px]"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsAddOpen(false)}>İptal</Button>
                        <Button 
                            variant="destructive" 
                            onClick={() => addWarningMutation.mutate()} 
                            disabled={!reason.trim() || addWarningMutation.isPending}
                        >
                            {addWarningMutation.isPending ? "Ekleniyor..." : "Uyarıyı Kaydet"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!warningToDelete} onOpenChange={(val) => !val && setWarningToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Uyarıyı Kaldır</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu uyarıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={() => warningToDelete && deleteWarningMutation.mutate(warningToDelete)}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            Sil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}

// Change Log:
// - Added `className` prop for styling flexibility.
// - Added `variant` prop (unused for now but good for future extension).
// - Added `break-words` to warning reason text to prevent overflow.