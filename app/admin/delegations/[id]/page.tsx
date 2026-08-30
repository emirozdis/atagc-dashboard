"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { 
    ArrowLeft, 
    Users, 
    Crown, 
    Mail, 
    Phone, 
    School, 
    Calendar,
    CheckCircle2,
    XCircle,
    Clock,
    UserCheck,
    UserMinus,
    ArrowUpRight,
    ShieldCheck,
    User,
    FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface DelegationUserDetails {
    phone_number?: string | null;
    additional_info?: { manual_school_name?: string } | null;
    high_schools?: { school_name?: string } | null;
}

interface DelegationMember {
    id: string;
    full_name: string;
    email: string;
    accepted: boolean | null;
    application_status: string;
    application_id: string | null;
}

interface DelegationDetail {
    id: string;
    name: string;
    status: string;
    member_count: number;
    created_at: string;
    leader: {
        id: string;
        full_name: string;
        email: string;
        user_details?: DelegationUserDetails[];
    };
    leader_application_id: string | null;
    members: DelegationMember[];
}

export default function DelegationDetailPage() {
    const { id } = useParams();
    const router = useRouter();

    const { data: delegation, isLoading, error } = useQuery<DelegationDetail>({
        queryKey: ['admin-delegation-detail', id],
        queryFn: async () => {
            const res = await fetch(`/api/admin/delegations/${id}`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        }
    });

    if (isLoading) return <LoadingSkeleton />;
    if (error || !delegation) return <ErrorState />;

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'approved': return { 
                label: "APPROVED DELEGATION",
                icon: ShieldCheck, 
                color: "text-emerald-600", 
                bg: "bg-emerald-500/10", 
                border: "border-emerald-500/20" 
            };
            case 'rejected': return { 
            label: "REJECTED DELEGATION",
                icon: XCircle, 
                color: "text-red-600", 
                bg: "bg-red-500/10", 
                border: "border-red-500/20" 
            };
            default: return { 
                label: "DELEGATION AWAITING APPROVAL",
                icon: Clock, 
                color: "text-amber-600", 
                bg: "bg-amber-500/10", 
                border: "border-amber-500/20" 
            };
        }
    };

    const statusCfg = getStatusConfig(delegation.status);
    const StatusIcon = statusCfg.icon;

    const getAppStatusBadge = (status: string) => {
        switch (status) {
            case 'approved': return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] h-5">Approved</Badge>;
            case 'rejected': return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px] h-5">Rejected</Badge>;
            case 'pending': return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] h-5">Pending</Badge>;
            default: return <Badge variant="outline" className="text-[10px] h-5 opacity-50">No record</Badge>;
        }
    };

    return (
        <div className="mx-auto max-w-7xl space-y-8 p-5 pb-12 animate-fade-in sm:p-8">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-card border border-border/50 p-6 rounded-2xl shadow-sm">
                <div className="flex items-center gap-5">
                    <Button variant="outline" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-full shrink-0">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="space-y-1">
                        <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">{delegation.name}</h1>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground font-mono">
                            <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {delegation.member_count} members</span>
                            <span className="w-1 h-1 rounded-full bg-border" />
                            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {new Date(delegation.created_at).toLocaleDateString('en-GB')}</span>
                        </div>
                    </div>
                </div>
                
                <div className={cn("flex items-center gap-3 px-4 py-2 rounded-xl border-2 transition-all", statusCfg.bg, statusCfg.border, statusCfg.color)}>
                    <StatusIcon className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-widest">{statusCfg.label}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                {/* LEFT: LEADER CARD */}
                <div className="space-y-6">
                    <Card className="border-border/50 overflow-hidden shadow-md">
                        <CardHeader className="bg-muted/5 border-b border-border/40">
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Crown className="w-4 h-4 text-yellow-500" /> Delegation leader
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="flex flex-col items-center text-center space-y-3">
                                <div className="w-20 h-20 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-2xl font-bold text-yellow-600 border-2 border-yellow-500/20 shadow-inner">
                                    {delegation.leader.full_name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <div className="text-xl font-bold text-foreground">{delegation.leader.full_name}</div>
                                    <div className="text-sm text-muted-foreground">{delegation.leader.email}</div>
                                </div>
                            </div>

                            <Separator className="bg-border/50" />

                            <div className="space-y-4 text-sm">
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <div className="p-2 rounded-lg bg-secondary/50"><Phone className="w-4 h-4 text-primary" /></div>
                                    <span className="text-foreground font-medium">{delegation.leader.user_details?.[0]?.phone_number || "-"}</span>
                                </div>
                                <div className="flex items-start gap-3 text-muted-foreground">
                                    <div className="p-2 rounded-lg bg-secondary/50 mt-0.5"><School className="w-4 h-4 text-primary" /></div>
                                    <span className="text-foreground font-semibold leading-tight line-clamp-2">
                                        {delegation.leader.user_details?.[0]?.high_schools?.school_name || delegation.leader.user_details?.[0]?.additional_info?.manual_school_name || "No school specified"}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Button variant="outline" className="h-10 text-xs gap-2" asChild>
                                    <Link href={`/admin/users/${delegation.leader.id}`}>
                                        <User className="w-3.5 h-3.5" /> Profile
                                    </Link>
                                </Button>
                                <Button variant="outline" className="h-10 text-xs gap-2" asChild disabled={!delegation.leader_application_id}>
                                    <Link href={`/admin/applications/${delegation.leader_application_id}`}>
                                        <FileText className="w-3.5 h-3.5" /> Application
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT: MEMBER TABLE */}
                <div className="lg:col-span-2">
                    <Card className="border-border/50 shadow-md">
                        <CardHeader className="bg-muted/5 border-b border-border/40 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <Users className="w-5 h-5 text-primary" /> Member list
                                </CardTitle>
                            <CardDescription>Everyone included in this delegation.</CardDescription>
                            </div>
                            <Badge variant="secondary" className="h-6 px-3 rounded-full">{delegation.members.length} people</Badge>
                        </CardHeader>
                        <CardContent className="p-0">
                            {delegation.members.length === 0 ? (
                                <div className="p-12 text-center text-muted-foreground space-y-2">
                                    <Users className="w-12 h-12 mx-auto opacity-10" />
                                    <p>No members yet.</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow>
                                            <TableHead className="pl-6">Member</TableHead>
                                            <TableHead className="text-center">Leader approval</TableHead>
                                            <TableHead className="text-center">Application</TableHead>
                                            <TableHead className="text-right pr-6">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {delegation.members.map((member) => (
                                            <TableRow key={member.id} className="group hover:bg-muted/20 transition-colors">
                                                <TableCell className="pl-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold shrink-0 border border-border/50">
                                                            {member.full_name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0 flex flex-col">
                                                            <span className="font-bold text-sm text-foreground leading-none">{member.full_name}</span>
                                                            <span className="text-[11px] text-muted-foreground mt-1 truncate">{member.email}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {member.accepted === true ? (
                                                        <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 border-emerald-500/20 gap-1.5 font-medium text-[10px]">
                                                            <UserCheck className="w-3 h-3" /> Accepted
                                                        </Badge>
                                                    ) : member.accepted === false ? (
                                                        <Badge variant="outline" className="bg-red-500/5 text-red-600 border-red-500/20 gap-1.5 font-medium text-[10px]">
                                                            <UserMinus className="w-3 h-3" /> Rejected
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-amber-500/5 text-amber-600 border-amber-500/20 gap-1.5 font-medium text-[10px]">
                                                            <Clock className="w-3 h-3" /> Pending
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {getAppStatusBadge(member.application_status)}
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="ghost" size="icon" asChild className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all" title="Profile">
                                                            <Link href={`/admin/users/${member.id}`}>
                                                                <User className="w-4 h-4" />
                                                            </Link>
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            asChild 
                                                            className={cn("h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all", !member.application_id && "opacity-20 pointer-events-none")} 
                                                            title="Application"
                                                        >
                                                            <Link href={`/admin/applications/${member.application_id}`}>
                                                                <FileText className="w-4 h-4" />
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="mx-auto max-w-7xl space-y-8 p-5 pb-12 animate-fade-in sm:p-8">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <div className="grid lg:grid-cols-3 gap-8">
                <Skeleton className="h-[400px] rounded-2xl" />
                <Skeleton className="lg:col-span-2 h-[500px] rounded-2xl" />
            </div>
        </div>
    );
}

function ErrorState() {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="p-4 bg-red-500/10 rounded-full text-red-600">
                <XCircle className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold">Delegation not found</h2>
            <p className="text-muted-foreground max-w-xs">The delegation may have been deleted or you may not have access.</p>
            <Button asChild variant="outline">
                <Link href="/admin/delegations">Back to list</Link>
            </Button>
        </div>
    );
}
