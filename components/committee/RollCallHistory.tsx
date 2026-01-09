"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Users, Loader2, Calendar, CheckCircle2, XCircle, Search, UserCheck, UserX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { PaginatedRollCallHistory } from "@/types/committee";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface RollCallHistoryProps {
    variant?: "compact" | "full";
}

interface AttendanceDetail {
    id: string;
    userId: string;
    full_name: string;
    email: string;
    role: string;
    present: boolean;
    scanned_at: string | null;
}

interface RollCallDetailsResponse {
    rollCall: {
        id: string;
        session_name: string;
        created_at: string;
    };
    members: AttendanceDetail[];
}

export function RollCallHistory({ variant = "full" }: RollCallHistoryProps) {
    const [page, setPage] = useState(1);
    const [selectedRollCallId, setSelectedRollCallId] = useState<string | null>(null);
    const [searchMember, setSearchMember] = useState("");
    const limit = variant === "compact" ? 5 : 10;

    const { data, isLoading } = useQuery<PaginatedRollCallHistory>({
        queryKey: ["committee-roll-call-history", page, limit],
        queryFn: async () => {
            const res = await fetch(`/api/committee/roll-calls?page=${page}&limit=${limit}`);
            if (!res.ok) throw new Error("Failed to fetch history");
            return res.json();
        },
    });

    const { data: details, isLoading: isLoadingDetails } = useQuery<RollCallDetailsResponse>({
        queryKey: ["roll-call-details", selectedRollCallId],
        queryFn: async () => {
            const res = await fetch(`/api/committee/roll-calls/${selectedRollCallId}/details`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        enabled: !!selectedRollCallId
    });

    const rollCalls = data?.data || [];
    const totalPages = data?.meta?.totalPages || 0;

    const filteredMembers = details?.members.filter(m =>
        m.full_name.toLowerCase().includes(searchMember.toLowerCase()) ||
        m.email.toLowerCase().includes(searchMember.toLowerCase())
    ) || [];

    const presentCount = details?.members.filter(m => m.present).length || 0;
    const absentCount = (details?.members.length || 0) - presentCount;

    if (variant === "compact") {
        return (
            <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between px-1">
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Geçmiş Yoklamalar
                    </span>
                    {data?.meta && (
                        <span className="text-[10px] text-muted-foreground">{data.meta.totalCount} Adet</span>
                    )}
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                ) : rollCalls.length === 0 ? (
                    <div className="text-[11px] text-muted-foreground text-center py-6 border border-dashed border-border/50 rounded-xl bg-muted/5">
                        Henüz yoklama kaydı bulunmuyor.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {rollCalls.map((rc) => (
                            <div
                                key={rc.id}
                                className="group bg-card/40 border border-white/5 p-2.5 rounded-lg flex justify-between items-center hover:bg-muted/30 transition-colors cursor-pointer"
                                onClick={() => setSelectedRollCallId(rc.id)}
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="text-xs font-medium truncate text-foreground/90 group-hover:text-primary transition-colors">
                                        {rc.session_name}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                        <Calendar className="w-3 h-3 opacity-50" />
                                        {new Date(rc.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="text-right flex flex-col items-end">
                                        <span className="text-[10px] font-mono font-medium">
                                            {rc.attendance_count}/{rc.total_members}
                                        </span>
                                        <div className="w-12 h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-full transition-all duration-500",
                                                    rc.attendance_rate > 70 ? "bg-emerald-500" : rc.attendance_rate > 40 ? "bg-amber-500" : "bg-rose-500"
                                                )}
                                                style={{ width: `${rc.attendance_rate}%` }}
                                            />
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-[9px] px-1 h-4 font-mono border-white/10 bg-white/5">
                                        %{rc.attendance_rate}
                                    </Badge>
                                </div>
                            </div>
                        ))}

                        {totalPages > 1 && (
                            <div className="pt-2">
                                <PaginationControls
                                    currentPage={page}
                                    totalPages={totalPages}
                                    onPageChange={setPage}
                                />
                            </div>
                        )}
                    </div>
                )}

                <AttendanceDetailsDialog
                    isOpen={!!selectedRollCallId}
                    onOpenChange={(open) => !open && setSelectedRollCallId(null)}
                    isLoading={isLoadingDetails}
                    rollCall={details?.rollCall}
                    members={filteredMembers}
                    stats={{ present: presentCount, absent: absentCount }}
                    search={searchMember}
                    onSearchChange={setSearchMember}
                />
            </div>
        );
    }

    // Full variant (for Yoklama Yönetimi page)
    return (
        <Card className="bg-card border-border/50 overflow-hidden">
            <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="text-lg font-display font-semibold flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Yoklama Geçmişi
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : rollCalls.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                        <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>Henüz bir yoklama kaydı bulunmuyor.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {rollCalls.map((rc) => (
                            <div
                                key={rc.id}
                                className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between gap-4 cursor-pointer group"
                                onClick={() => setSelectedRollCallId(rc.id)}
                            >
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                                        <Users className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{rc.session_name}</h4>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(rc.created_at).toLocaleString("tr-TR", {
                                                dateStyle: 'medium',
                                                timeStyle: 'short'
                                            })}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="hidden sm:flex flex-col items-end gap-1.5">
                                        <span className="text-xs text-muted-foreground font-medium">Katılım</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-mono font-bold text-foreground">
                                                {rc.attendance_count} / {rc.total_members}
                                            </span>
                                            <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className={cn(
                                                        "h-full transition-all duration-700",
                                                        rc.attendance_rate > 70 ? "bg-emerald-500" : rc.attendance_rate > 40 ? "bg-amber-500" : "bg-rose-500"
                                                    )}
                                                    style={{ width: `${rc.attendance_rate}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-secondary/30 px-3 py-1.5 rounded-lg border border-border/50">
                                        <span className={cn(
                                            "text-sm font-mono font-bold",
                                            rc.attendance_rate > 70 ? "text-emerald-500" : rc.attendance_rate > 40 ? "text-amber-500" : "text-rose-500"
                                        )}>
                                            %{rc.attendance_rate}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="p-4 border-t border-white/5">
                        <PaginationControls
                            currentPage={page}
                            totalPages={totalPages}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </CardContent>

            <AttendanceDetailsDialog
                isOpen={!!selectedRollCallId}
                onOpenChange={(open) => !open && setSelectedRollCallId(null)}
                isLoading={isLoadingDetails}
                rollCall={details?.rollCall}
                members={filteredMembers}
                stats={{ present: presentCount, absent: absentCount }}
                search={searchMember}
                onSearchChange={setSearchMember}
            />
        </Card>
    );
}

function AttendanceDetailsDialog({
    isOpen,
    onOpenChange,
    isLoading,
    rollCall,
    members,
    stats,
    search,
    onSearchChange
}: {
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    isLoading: boolean,
    rollCall?: any,
    members: AttendanceDetail[],
    stats: { present: number, absent: number },
    search: string,
    onSearchChange: (val: string) => void
}) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] h-[80vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <UserCheck className="w-5 h-5 text-primary" />
                        Yoklama Detayları
                    </DialogTitle>
                    <DialogDescription>
                        {rollCall?.session_name} - {rollCall && new Date(rollCall.created_at).toLocaleDateString("tr-TR", { dateStyle: 'long' })}
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 py-4 flex items-center justify-between bg-muted/30">
                    <div className="flex gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Katılan</span>
                            <span className="text-xl font-bold text-emerald-500">{stats.present}</span>
                        </div>
                        <div className="w-px h-8 bg-border" />
                        <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Katılmayan</span>
                            <span className="text-xl font-bold text-rose-500">{stats.absent}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-3 py-1">
                            Toplam {stats.present + stats.absent} Üye
                        </Badge>
                    </div>
                </div>

                <div className="px-6 py-3 border-b border-white/5">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Üye adı veya e-posta..."
                            className="pl-9 h-9 bg-background/50"
                            value={search}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="p-6 space-y-3">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    <span className="text-sm text-muted-foreground">Liste yükleniyor...</span>
                                </div>
                            ) : members.length === 0 ? (
                                <div className="text-center py-20 text-muted-foreground">
                                    <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>Üye bulunamadı.</p>
                                </div>
                            ) : (
                                members.map((member) => (
                                    <div key={member.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-white/5 hover:border-white/10 transition-all hover:bg-muted/30">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9 border border-white/10">
                                                <AvatarFallback className={cn(
                                                    "text-xs font-bold",
                                                    member.present ? "bg-emerald-500/20 text-emerald-500" : "bg-rose-500/20 text-rose-500"
                                                )}>
                                                    {member.full_name.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-semibold truncate">{member.full_name}</span>
                                                <span className="text-[10px] text-muted-foreground truncate">{member.email}</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-1">
                                            {member.present ? (
                                                <>
                                                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20 gap-1 text-[10px] px-2 h-5">
                                                        <UserCheck className="w-3 h-3" /> Katıldı
                                                    </Badge>
                                                    {member.scanned_at && (
                                                        <span className="text-[9px] text-muted-foreground font-mono">
                                                            {new Date(member.scanned_at).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                <Badge variant="outline" className="text-rose-500 border-rose-500/20 bg-rose-500/5 gap-1 text-[10px] px-2 h-5">
                                                    <UserX className="w-3 h-3" /> Katılmadı
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}
