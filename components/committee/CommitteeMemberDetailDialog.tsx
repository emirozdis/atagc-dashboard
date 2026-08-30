"use client";

import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Mail, Phone, School, Building2, MapPin } from "lucide-react";
import { WarningManager } from "@/components/admin/WarningManager";
import { User, UserDetail } from "@/types/user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { GRADE_OPTIONS } from "@/lib/constants";

interface CommitteeMemberDetailDialogProps {
    memberId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CommitteeMemberDetailDialog({ memberId, open, onOpenChange }: CommitteeMemberDetailDialogProps) {
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

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'applicant': return 'Delegate';
            case 'committee_chairman': return 'Committee chair';
            case 'chair': return 'Deputy chair';
            default: return role;
        }
    };

    const gradeLabel = details?.grade ? GRADE_OPTIONS.find(opt => opt.value === details.grade)?.label : null;

    // Resolve School Name logic
    const schoolName = details?.high_schools?.school_name ||
                       details?.additional_info?.manual_school_name || 
                       "Not specified";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg h-[85vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 border-b border-border/50 bg-muted/5">
                    <DialogTitle>Member details</DialogTitle>
                    <DialogDescription>
                        Information and actions for this committee member.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : error || !user ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                        <p>Could not load user information.</p>
                        <p className="text-xs mt-2 opacity-70">You may not have permission, or the user may have been deleted.</p>
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
                                        {user.is_suspended && <Badge variant="destructive" className="text-[10px]">Suspended</Badge>}
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Contact Info */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                        <Phone className="w-3 h-3" /> Phone
                                    </span>
                                    <p>{details?.phone_number || "-"}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                        <School className="w-3 h-3" /> School
                                    </span>
                                    <p className="line-clamp-1" title={schoolName}>{schoolName}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                        <Building2 className="w-3 h-3" /> Grade
                                    </span>
                                    <p>{gradeLabel || "-"}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                        <MapPin className="w-3 h-3" /> City
                                    </span>
                                    <p>{details?.city || "-"}</p>
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
