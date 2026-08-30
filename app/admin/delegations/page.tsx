"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { 
    Search, 
    Users, 
    Calendar,
    Crown,
    ChevronRight,
    CheckCircle2,
    XCircle,
    Clock
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { TableSkeleton } from "@/components/ui/skeleton-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Delegation {
    id: number;
    name: string;
    created_at: string;
    leader: {
        full_name: string;
        email: string;
    };
    member_count: number;
    status: string;
}

export default function AdminDelegationsPage() {
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const { data, isLoading } = useQuery({
        queryKey: ['admin-delegations', page, limit, debouncedSearch],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                search: debouncedSearch
            });
            const res = await fetch(`/api/admin/delegations?${params}`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        }
    });

    const delegations: Delegation[] = data?.data || [];
    const totalPages = data?.meta?.totalPages || 1;
    const totalRecords = data?.meta?.total || 0;

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "approved":
                return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Approved</Badge>;
            case "rejected":
                return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 gap-1.5"><XCircle className="w-3.5 h-3.5" /> Rejected</Badge>;
            default:
                return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 gap-1.5"><Clock className="w-3.5 h-3.5" /> Pending</Badge>;
        }
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-5 pb-12 animate-fade-in sm:p-8">
            
            <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-display font-bold text-foreground">Delegations</h2>
                <p className="text-muted-foreground text-lg">
                    Showing <span className="font-medium text-foreground">{totalRecords}</span> delegations.
                </p>
            </div>

            <div className="bg-card p-4 rounded-xl border border-border/50 shadow-sm">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search delegation name or leader..."
                        className="pl-9 bg-background border-border/50 h-10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="pt-2"><TableSkeleton cols={6} rows={limit} showTitle={false} /></div>
            ) : delegations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl bg-muted/5">
                    <Users className="w-12 h-12 mb-3 opacity-20" />
                    <p>No delegations matched your filters.</p>
                </div>
            ) : (
                <>
                    <div className="hidden md:block rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="pl-6">Delegation name</TableHead>
                                    <TableHead>Lider</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="text-center">Members</TableHead>
                                    <TableHead className="text-right pr-6"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {delegations.map((del) => (
                                    <TableRow 
                                        key={del.id} 
                                        className="hover:bg-muted/20 transition-colors cursor-pointer group"
                                        onClick={() => router.push(`/admin/delegations/${del.id}`)}
                                    >
                                        <TableCell className="font-medium pl-6">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4 text-primary" />
                                                {del.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Crown className="w-3.5 h-3.5 text-yellow-500" />
                                                <span className="text-sm font-medium">{del.leader?.full_name || "Unknown"}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {getStatusBadge(del.status)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary" className="font-mono">
                                                {del.member_count}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Button variant="ghost" size="icon" className="group-hover:text-primary transition-all">
                                                <ChevronRight className="w-5 h-5" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="md:hidden space-y-4">
                        {delegations.map(del => (
                            <Card key={del.id} className="bg-card border-border/50 shadow-sm overflow-hidden" onClick={() => router.push(`/admin/delegations/${del.id}`)}>
                                <CardContent className="p-4 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                                            <div className="flex items-center gap-2 font-medium text-foreground">
                                                <Users className="w-4 h-4 text-primary shrink-0" />
                                                <span className="truncate">{del.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-6">
                                                <Crown className="w-3 h-3 text-yellow-500" />
                                                {del.leader?.full_name}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            {getStatusBadge(del.status)}
                                            <Badge variant="secondary" className="font-mono text-[10px]">
                                                {del.member_count} members
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/30">
                                        <span className="font-mono">{new Date(del.created_at).toLocaleDateString("en-GB")}</span>
                                        <span className="text-primary font-bold flex items-center gap-1">View <ChevronRight className="w-4 h-4" /></span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    
                    {totalPages > 1 && (
                        <div className="pt-2">
                            <PaginationControls 
                                currentPage={page} 
                                totalPages={totalPages} 
                                onPageChange={setPage} 
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
