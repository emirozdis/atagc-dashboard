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

            <Card className="border-border/50 shadow-sm overflow-hidden bg-card">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-4"><TableSkeleton cols={4} rows={limit} showTitle={false} /></div>
                    ) : delegations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <Users className="w-12 h-12 mb-3 opacity-20" />
                            <p>Kriterlere uygun delegasyon bulunamadı.</p>
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead>Delegasyon Adı</TableHead>
                                        <TableHead>Delegasyon Lideri</TableHead>
                                        <TableHead className="text-center">Üye Sayısı</TableHead>
                                        <TableHead className="text-right">Oluşturulma Tarihi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {delegations.map((del) => (
                                        <TableRow key={del.id} className="hover:bg-muted/20">
                                            <TableCell className="font-medium">
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
                                            <TableCell className="text-right text-muted-foreground text-xs">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(del.created_at).toLocaleDateString("tr-TR")}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            
                            <div className="p-4 border-t border-border/50">
                                <PaginationControls 
                                    currentPage={page} 
                                    totalPages={totalPages} 
                                    onPageChange={setPage} 
                                />
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}