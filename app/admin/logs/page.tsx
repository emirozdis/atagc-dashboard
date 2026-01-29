"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Search, Eye, ArrowRight, CalendarDays, ArrowUpDown, X, AlertTriangle, Database
} from "lucide-react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeleton-loader";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MultiSelectPopover, MultiSelectOption } from "@/components/ui/multi-select-popover";

interface LogEntry {
    id: string;
    action: string;
    severity: string;
    category: string;
    resource_type: string;
    details: any;
    ip_address: string;
    created_at: string;
    user: {
        full_name: string;
        email: string;
        role: string;
    } | null;
}

const severityOptions: MultiSelectOption[] = [
    { value: "audit", label: "Denetim" },
    { value: "info", label: "Bilgi" },
    { value: "warning", label: "Uyarı" },
    { value: "error", label: "Hata" },
    { value: "critical", label: "Kritik" },
];

const categoryOptions: MultiSelectOption[] = [
    { value: "auth", label: "Kimlik" },
    { value: "access", label: "Erişim" },
    { value: "business", label: "İşlem" },
    { value: "system", label: "Sistem" },
    { value: "database", label: "Veritabanı" },
];

const DiffViewer = ({ changes }: { changes: Record<string, { from: any, to: any }> }) => {
    if (!changes || Object.keys(changes).length === 0) return null;

    const formatValue = (val: any) => {
        if (val === null) return <span className="text-muted-foreground italic">null</span>;
        if (val === undefined) return <span className="text-muted-foreground italic">undefined</span>;
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
    };

    return (
        <div className="space-y-3 w-full">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Değişiklikler</h4>

            {/* Desktop View: Table */}
            <div className="hidden md:block bg-muted/30 rounded-lg border border-border/50 overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-muted/50 text-xs text-muted-foreground border-b border-border/50">
                            <th className="px-4 py-3 text-left font-medium w-1/4">Alan</th>
                            <th className="px-4 py-3 text-left font-medium w-[35%]">Eski Değer</th>
                            <th className="px-2 py-3 text-center w-[5%]"></th>
                            <th className="px-4 py-3 text-left font-medium w-[35%]">Yeni Değer</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                        {Object.entries(changes).map(([key, diff]) => (
                            <tr key={key} className="hover:bg-muted/10 transition-colors">
                                <td className="px-4 py-3 font-mono text-xs text-muted-foreground align-top break-all">
                                    {key}
                                </td>
                                <td className="px-4 py-3 text-xs font-mono align-top break-all whitespace-pre-wrap">
                                    <div className="bg-red-500/10 text-red-600 dark:bg-red-950/30 dark:text-red-400 p-2 rounded border border-red-500/20">
                                        {formatValue(diff.from)}
                                    </div>
                                </td>
                                <td className="px-2 py-3 text-center text-muted-foreground align-top pt-5">
                                    <ArrowRight className="w-3 h-3 mx-auto" />
                                </td>
                                <td className="px-4 py-3 text-xs font-mono align-top break-all whitespace-pre-wrap">
                                    <div className="bg-green-500/10 text-green-600 dark:bg-green-950/30 dark:text-green-400 p-2 rounded border border-green-500/20">
                                        {formatValue(diff.to)}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile View: Stacked Cards */}
            <div className="md:hidden space-y-3">
                {Object.entries(changes).map(([key, diff]) => (
                    <div key={key} className="bg-card border border-border/50 rounded-lg p-3 space-y-3 shadow-sm">
                        <div className="font-mono text-xs font-bold text-foreground border-b border-border/50 pb-2">
                            {key}
                        </div>
                        <div className="grid gap-3">
                            <div className="space-y-1.5">
                                <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Eski Değer</span>
                                <div className="bg-red-500/10 text-red-600 dark:bg-red-950/30 dark:text-red-400 p-2.5 rounded-md text-xs font-mono break-all whitespace-pre-wrap border border-red-500/20">
                                    {formatValue(diff.from)}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Yeni Değer</span>
                                <div className="bg-green-500/10 text-green-600 dark:bg-green-950/30 dark:text-green-400 p-2.5 rounded-md text-xs font-mono break-all whitespace-pre-wrap border border-green-500/20">
                                    {formatValue(diff.to)}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function AdminLogsPage() {
    const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

    // Filters
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);

    const [severityFilter, setSeverityFilter] = useState<string[]>([]);
    const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
    const [actionFilter, setActionFilter] = useState("");

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [sortOrder, setSortOrder] = useState("desc");

    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const [debouncedAction, setDebouncedAction] = useState("");
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedAction(actionFilter);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [actionFilter]);

    const { data, isLoading } = useQuery({
        queryKey: ['logs', page, limit, debouncedSearch, severityFilter, categoryFilter, debouncedAction, startDate, endDate, sortOrder],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                search: debouncedSearch,
                severity: severityFilter.length > 0 ? severityFilter.join(",") : "all",
                category: categoryFilter.length > 0 ? categoryFilter.join(",") : "all",
                action: debouncedAction || "all",
                sort_by: "created_at",
                sort_order: sortOrder
            });

            if (startDate) params.append("startDate", startDate);
            if (endDate) params.append("endDate", endDate);

            const res = await fetch(`/api/admin/logs?${params}`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        }
    });

    const logs: LogEntry[] = data?.data || [];
    const totalPages = data?.meta?.totalPages || 1;

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case 'error': return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Hata</Badge>;
            case 'warning': return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Uyarı</Badge>;
            case 'audit': return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Denetim</Badge>;
            case 'critical': return <Badge className="bg-red-600 text-white border-red-600">Kritik</Badge>;
            default: return <Badge variant="outline" className="text-muted-foreground">Bilgi</Badge>;
        }
    };

    const resetFilters = () => {
        setSearch("");
        setSeverityFilter([]);
        setCategoryFilter([]);
        setActionFilter("");
        setStartDate("");
        setEndDate("");
        setSortOrder("desc");
        setPage(1);
    };

    const hasActiveFilters = search !== "" || severityFilter.length > 0 || categoryFilter.length > 0 || actionFilter !== "" || startDate !== "" || endDate !== "" || sortOrder !== "desc";

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
            <Breadcrumbs items={[{ label: "Sistem Logları" }]} />

            <div className="flex flex-col gap-3 bg-card p-3 rounded-xl border border-border/50 shadow-sm">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder="Kullanıcı, e-posta veya IP adresi..."
                        className="pl-9 bg-background border-border/50 h-10"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                        <Input
                            placeholder="İşlem tipi..."
                            className="w-[calc(50%-0.25rem)] min-[480px]:w-[140px] h-10 bg-background border-border/50"
                            value={actionFilter}
                            onChange={e => setActionFilter(e.target.value)}
                        />

                        <MultiSelectPopover
                            options={severityOptions}
                            selected={severityFilter}
                            onChange={setSeverityFilter}
                            placeholder="Önem"
                            triggerIcon={<AlertTriangle className="w-4 h-4 shrink-0" />}
                            className="w-[calc(50%-0.25rem)] min-[480px]:w-auto min-[480px]:min-w-[130px]"
                        />

                        <MultiSelectPopover
                            options={categoryOptions}
                            selected={categoryFilter}
                            onChange={setCategoryFilter}
                            placeholder="Kategori"
                            triggerIcon={<Database className="w-4 h-4 shrink-0" />}
                            className="w-[calc(50%-0.25rem)] min-[480px]:w-auto min-[480px]:min-w-[130px]"
                        />

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="h-10 px-3 gap-2 bg-background border-border/50 w-[calc(50%-0.25rem)] min-[480px]:w-auto justify-start text-muted-foreground hover:text-foreground">
                                    <CalendarDays className="w-4 h-4 shrink-0" />
                                    <span className="truncate">{startDate || endDate ? "Tarih Seçildi" : "Tarih"}</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-4" align="start">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">Başlangıç</label>
                                        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">Bitiş</label>
                                        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9" />
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <Button variant="secondary" size="sm" onClick={() => { setStartDate(""); setEndDate(""); }}>Temizle</Button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="flex items-center gap-2 ml-auto w-full min-[480px]:w-auto justify-end">
                        <Select value={sortOrder} onValueChange={setSortOrder}>
                            <SelectTrigger className="w-[130px] h-10 bg-background border-border/50 gap-2">
                                <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="end">
                                <SelectItem value="desc">En Yeni</SelectItem>
                                <SelectItem value="asc">En Eski</SelectItem>
                            </SelectContent>
                        </Select>

                        {hasActiveFilters && (
                            <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-destructive shrink-0" onClick={resetFilters} title="Filtreleri Temizle">
                                <X className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <Card className="border-border/50 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    {isLoading ? <div className="p-4"><TableSkeleton cols={5} rows={10} /></div> : (
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead>Tarih</TableHead>
                                    <TableHead>Kullanıcı</TableHead>
                                    <TableHead>İşlem</TableHead>
                                    <TableHead>Kategori</TableHead>
                                    <TableHead>Seviye</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map((log) => (
                                    <TableRow key={log.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => setSelectedLog(log)}>
                                        <TableCell className="text-xs text-muted-foreground font-mono">
                                            {new Date(log.created_at).toLocaleString("tr-TR")}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="w-6 h-6">
                                                    <AvatarFallback className="text-[10px]">{log.user?.full_name?.substring(0, 2) || "?"}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">{log.user?.full_name || "Sistem"}</span>
                                                    {log.user?.email && <span className="text-[10px] text-muted-foreground hidden sm:inline">{log.user.email}</span>}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium text-sm max-w-[150px] truncate" title={log.action}>{log.action}</TableCell>
                                        <TableCell><Badge variant="secondary" className="text-[10px] uppercase tracking-wider">{log.category}</Badge></TableCell>
                                        <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                                        <TableCell><Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="w-4 h-4" /></Button></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                    <div className="p-4 border-t border-border/50">
                        <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                    </div>
                </CardContent>
            </Card>

            <Dialog open={!!selectedLog} onOpenChange={(val) => !val && setSelectedLog(null)}>
                <DialogContent className="w-full max-w-[95vw] md:max-w-3xl max-h-[85vh] flex flex-col p-0 bg-background overflow-hidden">
                    <DialogHeader className="p-6 pb-2 border-b shrink-0 bg-muted/5">
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            Log Detayı
                            {selectedLog && getSeverityBadge(selectedLog.severity)}
                        </DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="flex-1 w-full">
                        <div className="p-4 md:p-6 space-y-6">
                            {selectedLog && (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-secondary/10 p-4 rounded-lg border border-border/50">
                                        <div>
                                            <span className="text-muted-foreground block text-xs uppercase tracking-wider font-semibold mb-1">İşlem ID</span>
                                            <span className="font-mono text-xs break-all text-foreground select-all">{selectedLog.id}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-xs uppercase tracking-wider font-semibold mb-1">IP Adresi</span>
                                            <span className="font-mono text-xs break-all text-foreground">{selectedLog.ip_address || "-"}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-xs uppercase tracking-wider font-semibold mb-1">Kullanıcı</span>
                                            <span className="font-medium text-foreground">{selectedLog.user?.full_name || "Sistem"}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-xs uppercase tracking-wider font-semibold mb-1">Rol</span>
                                            <Badge variant="outline" className="text-[10px]">{selectedLog.user?.role || "-"}</Badge>
                                        </div>
                                    </div>

                                    {selectedLog.details?.changes ? (
                                        <div className="w-full">
                                            <DiffViewer changes={selectedLog.details.changes} />
                                        </div>
                                    ) : (
                                        <div className="space-y-2 w-full">
                                            <h4 className="text-xs font-bold uppercase text-muted-foreground">Ham Veri</h4>
                                            <div className="w-full rounded-lg border border-border/50 bg-muted/30 p-3 md:p-4 overflow-hidden">
                                                <div className="overflow-x-auto max-h-[300px]">
                                                    <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-all">
                                                        {JSON.stringify(selectedLog.details, null, 2)}
                                                    </pre>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {selectedLog.details?.snapshot && (
                                        <div className="space-y-2 pt-4 border-t border-border/50 w-full">
                                            <h4 className="text-xs font-bold uppercase text-muted-foreground">Son Durum (Snapshot)</h4>
                                            <div className="w-full rounded-lg border border-border/50 bg-muted/30 p-3 md:p-4 overflow-hidden">
                                                <div className="overflow-x-auto max-h-[200px]">
                                                    <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all">
                                                        {JSON.stringify(selectedLog.details.snapshot, null, 2)}
                                                    </pre>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
}