"use client";

import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Mail, Phone, GraduationCap, Building2 } from "lucide-react";
import { WarningManager } from "@/components/admin/WarningManager";
import { User, UserDetail } from "@/types/user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface CommitteeMemberDetailDialogProps {
    memberId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CommitteeMemberDetailDialog({ memberId, open, onOpenChange }: CommitteeMemberDetailDialogProps) {
    // Only fetch if open and memberId exists
    const { data: user, isLoading, error } = useQuery<User>({
        queryKey: ['user', memberId],
        queryFn: async () => {
            const res = await fetch(`/api/admin/users/${memberId}`);
            if (!res.ok) throw new Error("Failed to fetch user");
            return res.json();
        },
        enabled: open && !!memberId,
        retry: false
    });

    if (!memberId) return null;

    const details = user?.user_details as UserDetail | undefined;
    const additional = details?.additional_info || {};

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'applicant': return 'Delege';
            case 'committee_chairman': return 'Komite Başkanı';
            case 'deputy_chair': return 'Başkan Yrd.';
            default: return role;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg h-[85vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 border-b border-border/50 bg-muted/5">
                    <DialogTitle>Üye Detayları</DialogTitle>
                    <DialogDescription>
                        Komite üyesi hakkında bilgiler ve işlemler.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : error || !user ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                        <p>Kullanıcı bilgileri yüklenemedi.</p>
                        <p className="text-xs mt-2 opacity-70">Yetkiniz olmayabilir veya kullanıcı silinmiş olabilir.</p>
                    </div>
                ) : (
                    <ScrollArea className="flex-1">
                        <div className="p-6 space-y-6">

                            {/* Profile Header */}
                            <div className="flex items-start gap-4">
                                <Avatar className="w-16 h-16 border-2 border-border/50">
                                    <AvatarImage src={details?.profile_picture_url || undefined} className="object-cover" />
                                    <AvatarFallback className="text-lg bg-secondary">
                                        {user.full_name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-lg leading-none">{user.full_name}</h3>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Mail className="w-3.5 h-3.5" />
                                        <span className="truncate max-w-[200px]">{user.email}</span>
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <Badge variant="secondary" className="text-xs font-normal">
                                            {getRoleLabel(user.role)}
                                        </Badge>
                                        {user.is_suspended && <Badge variant="destructive" className="text-[10px]">Askıda</Badge>}
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Contact Info */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                        <Phone className="w-3 h-3" /> Telefon
                                    </span>
                                    <p>{details?.phone_number || "-"}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                        <GraduationCap className="w-3 h-3" /> Okul
                                    </span>
                                    <p className="line-clamp-1" title={details?.school_name}>{details?.school_name || "-"}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                        <Building2 className="w-3 h-3" /> Sınıf
                                    </span>
                                    <p>{additional.grade || "-"}</p>
                                </div>
                            </div>

                            {/* Warning Manager */}
                            <div className="pt-2">
                                <WarningManager user={user} className="border-none shadow-none bg-background/50" />
                            </div>

                        </div>
                    </ScrollArea>
                )}
            </DialogContent>
        </Dialog>
    );
}

// Change Log:
// - New component to display member details in a dialog.
// - Reuses `WarningManager` for disciplinary actions.
// - Fetches user data on open.