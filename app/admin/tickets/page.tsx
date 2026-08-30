"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ticket, TICKET_STATUSES, TICKET_CATEGORIES } from "@/types/ticket";
import { TicketDetailView } from "@/components/tickets/TicketDetailView";
import { Eye, Filter, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableSkeleton } from "@/components/ui/skeleton-loader";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { cn } from "@/lib/utils";

export default function AdminTicketsPage() {
    const [view, setView] = useState<'list' | 'detail'>('list');
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    
    // Filtering & Pagination State
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['admin-tickets', page, statusFilter, categoryFilter, debouncedSearch],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                status: statusFilter,
                category: categoryFilter,
                search: debouncedSearch,
                limit: "10"
            });
            const res = await fetch(`/api/tickets?${params}`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        }
    });

    const tickets: Ticket[] = data?.data || [];
    const meta = data?.meta;

    const resetFilters = () => {
        setSearch("");
        setStatusFilter("all");
        setCategoryFilter("all");
        setPage(1);
    };

    const handleOpen = (id: string) => {
        setSelectedTicketId(id);
        setView('detail');
    };

    return (
        <div className={cn("mx-auto max-w-7xl p-5 animate-fade-in sm:p-8", view !== 'detail' && "pb-12")}>
            {/* Header Section */}
            <div className={cn(
                "pb-6 mb-2",
                view === 'detail' && "hidden"
            )}>

                <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center mt-4">
                    <div>
                        <h2 className="text-3xl font-display font-bold text-foreground">Support tickets</h2>
                        <p className="text-muted-foreground mt-1">Manage participant support requests and reports.</p>
                    </div>
                </div>
            </div>

            {view === 'list' && (
                <div className="space-y-6">
                    <div className="bg-card border border-border/50 rounded-xl p-4 flex flex-col md:flex-row gap-4 shadow-sm">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search subject, user, or email..."
                                className="pl-9 bg-background border-border/50"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                                <SelectTrigger className="w-full md:w-[150px] bg-background border-border/50">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Filter className="w-3.5 h-3.5" />
                                        <span className="text-foreground">{TICKET_STATUSES.find(s => s.value === statusFilter)?.label || "Status"}</span>
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All statuses</SelectItem>
                                    {TICKET_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                                </SelectContent>
                            </Select>

                            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
                                <SelectTrigger className="w-full md:w-[180px] bg-background border-border/50">
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All categories</SelectItem>
                                    {TICKET_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                </SelectContent>
                            </Select>

                            {(search || statusFilter !== "all" || categoryFilter !== "all") && (
                                <Button variant="ghost" size="icon" onClick={resetFilters} className="text-muted-foreground hover:text-destructive">
                                    <X className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {isLoading ? <TableSkeleton cols={6} rows={10} showTitle={false} /> : (
                        <div className="border border-border/50 rounded-xl overflow-hidden bg-card shadow-sm">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tickets.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                                                No results found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        tickets.map(t => {
                                            const status = TICKET_STATUSES.find(s => s.value === t.status);
                                            const cat = TICKET_CATEGORIES.find(c => c.value === t.category);
                                            return (
                                                <TableRow key={t.id} className="hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => handleOpen(t.id)}>
                                                    <TableCell>
                                                        {t.user ? (
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-sm text-foreground">{t.user.full_name}</span>
                                                                <span className="text-[10px] text-muted-foreground">{t.user.email}</span>
                                                            </div>
                                                        ) : (
                                                            <Badge variant="secondary" className="font-normal bg-secondary/50 text-[10px]">Anonim</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="font-medium text-foreground max-w-[200px] truncate">{t.subject}</TableCell>
                                                    <TableCell className="text-muted-foreground text-xs">{cat?.label}</TableCell>
                                                    <TableCell><Badge variant="outline" className={cn("text-[10px] px-2 h-5", status?.color)}>{status?.label}</Badge></TableCell>
                                                    <TableCell className="text-muted-foreground text-xs font-mono">{new Date(t.created_at).toLocaleDateString('en-GB')}</TableCell>
                                                    <TableCell>
                                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleOpen(t.id); }}>
                                                            <Eye className="w-4 h-4 text-muted-foreground hover:text-primary" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    )}
                                </TableBody>
                            </Table>
                            {meta && meta.totalPages > 1 && (
                                <div className="border-t border-border/50">
                                    <PaginationControls 
                                        currentPage={page} 
                                        totalPages={meta.totalPages} 
                                        onPageChange={setPage} 
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {view === 'detail' && selectedTicketId && (
                <div>
                    <TicketDetailView
                        ticketId={selectedTicketId}
                        isAdmin={true}
                        onBack={() => {
                            setSelectedTicketId(null);
                            setView('list');
                            refetch();
                        }}
                    />
                </div>
            )}
        </div>
    );
}
