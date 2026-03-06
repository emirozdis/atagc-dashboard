"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
    Search, 
    Users, 
    Calendar,
    Crown
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
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Badge } from "@/components/ui/badge";

interface Delegation {
    id: number;
    name: string;
    created_at: string;
    leader: {
        full_name: string;
        email: string;
    };
    member_count: number;
}

export default function AdminDelegationsPage() {
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
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

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
            <Breadcrumbs items={[{ label: "Delegasyonlar" }]} />
            
            <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-display font-bold text-foreground">Delegasyonlar</h2>
                <p className="text-muted-foreground">
                    Toplam <span className="font-medium text-foreground">{totalRecords}</span> delegasyon listeleniyor.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 bg-card p-4 rounded-xl border border-border/50 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Delegasyon adı veya lider ara..."
                        className="pl-9 bg-background border-border/50 h-10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="pt-2"><TableSkeleton cols={4} rows={limit} showTitle={false} /></div>
            ) : delegations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl bg-muted/5">
                    <Users className="w-12 h-12 mb-3 opacity-20" />
                    <p>Kriterlere uygun delegasyon bulunamadı.</p>
                </div>
            ) : (
                <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="pl-6">Delegasyon Adı</TableHead>
                                    <TableHead>Delegasyon Lideri</TableHead>
                                    <TableHead className="text-center">Üye Sayısı</TableHead>
                                    <TableHead className="text-right pr-6">Oluşturulma Tarihi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {delegations.map((del) => (
                                    <TableRow key={del.id} className="hover:bg-muted/20 transition-colors">
                                        <TableCell className="font-medium pl-6">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4 text-primary" />
                                                {del.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Crown className="w-3.5 h-3.5 text-yellow-500" />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">{del.leader?.full_name || "Bilinmiyor"}</span>
                                                    <span className="text-[10px] text-muted-foreground">{del.leader?.email}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary" className="font-mono">
                                                {del.member_count}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground text-xs pr-6">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(del.created_at).toLocaleDateString("tr-TR")}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                        {delegations.map(del => (
                            <Card key={del.id} className="bg-card border-border/50 shadow-sm overflow-hidden">
                                <CardContent className="p-4 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2 font-medium text-foreground min-w-0 flex-1">
                                            <Users className="w-4 h-4 text-primary shrink-0" />
                                            <span className="truncate">{del.name}</span>
                                        </div>
                                        <Badge variant="secondary" className="font-mono shrink-0 ml-2">
                                            {del.member_count} Üye
                                        </Badge>
                                    </div>
                                    <div className="bg-secondary/10 p-3 rounded-lg border border-border/50 space-y-1">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                            <Crown className="w-3.5 h-3.5 text-yellow-500" />
                                            <span>Lider</span>
                                        </div>
                                        <div className="text-sm font-medium truncate">{del.leader?.full_name || "Bilinmiyor"}</div>
                                        <div className="text-xs text-muted-foreground truncate">{del.leader?.email}</div>
                                    </div>
                                    <div className="flex items-center justify-end text-xs text-muted-foreground pt-1">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(del.created_at).toLocaleDateString("tr-TR")}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    
                    {/* Common Pagination */}
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