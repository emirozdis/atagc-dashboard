"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Filter,
  Calendar,
  X,
  ChevronDown
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeleton-loader";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

interface LogEntry {
  id: string;
  action: string;
  details: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
  user: {
    full_name: string;
    email: string;
    role: string;
  } | null;
}

const formatActionName = (action: string) => {
  return action.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const JsonVisualizer = ({ data }: { data: any }) => {
  if (data === null) return <Badge variant="outline" className="text-[10px] bg-muted/50 font-mono h-4 px-1">null</Badge>;
  if (data === undefined) return <span className="text-muted-foreground italic text-xs">undefined</span>;
  if (typeof data === 'boolean') {
    return <Badge variant="secondary" className={`text-[10px] h-4 px-1 ${data ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>{String(data)}</Badge>;
  }
  if (typeof data !== 'object') {
    return <span className="text-xs font-medium break-all text-foreground/90">{String(data)}</span>;
  }
  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-muted-foreground italic text-xs">[]</span>;
    return <div className="flex flex-col gap-1 pl-2 border-l border-border/50">{data.map((item, i) => (<div key={i} className="flex gap-2"><span className="text-[10px] text-muted-foreground font-mono shrink-0 mt-0.5 opacity-50 select-none">[{i}]</span><JsonVisualizer data={item} /></div>))}</div>;
  }
  const keys = Object.keys(data);
  if (keys.length === 0) return <span className="text-muted-foreground italic text-xs">{'{}'}</span>;
  return <div className="grid gap-1.5">{keys.map(key => { const value = data[key]; const isComplex = typeof value === 'object' && value !== null; return (<div key={key} className="relative"><div className={`flex ${isComplex ? 'flex-col gap-0.5' : 'items-baseline gap-2'}`}><span className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider shrink-0 select-none flex items-center gap-1"><span className="w-0.5 h-0.5 rounded-full bg-border/80"></span>{key.replace(/_/g, ' ')}</span>{!isComplex && <div className="flex-1 border-b border-dashed border-border/40 relative -top-1 mx-2 opacity-30 hidden sm:block"></div>}<div className={`${isComplex ? 'pl-2 border-l border-primary/10 ml-0.5 mt-0.5' : ''}`}><JsonVisualizer data={value} /></div></div></div>); })}</div>;
};

export default function AdminLogsPage() {
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  // Filters
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  // Date Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Debounce Search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // TanStack Query
  const { data, isLoading } = useQuery({
    queryKey: ['logs', page, limit, debouncedSearch, actionFilter, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: debouncedSearch,
        action: actionFilter
      });
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(`/api/admin/logs?${params}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    placeholderData: (prev) => prev
  });

  const logs: LogEntry[] = data?.data || [];
  const totalPages = data?.meta?.totalPages || 1;

  const getActionBadge = (action: string) => {
    if (action.includes("create")) return <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px] h-5 px-1.5 gap-1 shrink-0">Oluşturma</Badge>;
    if (action.includes("update")) return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] h-5 px-1.5 gap-1 shrink-0">Güncelleme</Badge>;
    if (action.includes("delete")) return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px] h-5 px-1.5 gap-1 shrink-0">Silme</Badge>;
    if (action.includes("login")) return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-[10px] h-5 px-1.5 gap-1 shrink-0">Giriş</Badge>;
    return <Badge variant="outline" className="text-muted-foreground text-[10px] h-5 px-1.5 shrink-0">{action}</Badge>;
  };

  const renderMobileItem = (log: LogEntry) => {
    const detailsString = log.details ? JSON.stringify(log.details) : "{}";
    const detailsPreview = log.details?.name ? `Name: ${log.details.name}` :
      log.details?.title ? `Title: ${log.details.title}` :
        log.details?.email ? `Email: ${log.details.email}` :
          detailsString.slice(0, 100);

    return (
      <div
        key={log.id}
        className="p-3 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer active:bg-muted/50 overflow-hidden"
        onClick={() => setSelectedLog(log)}
      >
        <div className="flex justify-between items-start gap-3 mb-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Avatar className="w-8 h-8 border border-border/50 shrink-0">
              <AvatarImage src={undefined} />
              <AvatarFallback className="text-[10px] bg-secondary">{(log.user?.full_name || "S").substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-medium text-sm leading-tight text-foreground truncate block">
                {log.user?.full_name || "Sistem"}
              </span>
              <span className="text-[10px] text-muted-foreground truncate opacity-80 block">
                {log.user?.email || "Bilinmiyor"}
              </span>
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground whitespace-nowrap bg-secondary/50 px-1.5 py-0.5 rounded font-mono shrink-0 text-right">
            <div>{new Date(log.created_at).toLocaleDateString("tr-TR", { month: '2-digit', day: '2-digit' })}</div>
            <div className="opacity-70">{new Date(log.created_at).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2 min-w-0">
          {getActionBadge(log.action)}
          <span className="text-xs font-medium text-foreground truncate min-w-0 flex-1">
            {formatActionName(log.action)}
          </span>
        </div>

        <div className="text-[10px] text-muted-foreground bg-secondary/10 p-2 rounded border border-border/30 font-mono w-full grid grid-cols-1">
          <div className="truncate w-full">
            {detailsPreview}
          </div>
        </div>
      </div>
    );
  };

  const renderDesktopItem = (log: LogEntry) => (
    <TableRow
      key={log.id}
      className="cursor-pointer hover:bg-muted/40 transition-colors h-9 border-b border-border/40"
      onClick={() => setSelectedLog(log)}
    >
      <TableCell className="py-2">
        <div className="flex items-center gap-2">
          <Avatar className="w-5 h-5 border border-white/10">
            <AvatarImage src={undefined} />
            <AvatarFallback className="text-[9px]">{(log.user?.full_name || "S").substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium text-xs leading-none">{log.user?.full_name || "Sistem / Bilinmiyor"}</span>
            {log.user && <span className="text-[10px] text-muted-foreground leading-none mt-0.5">{log.user.email}</span>}
          </div>
        </div>
      </TableCell>
      <TableCell className="py-2">
        <div className="flex items-center gap-2">
          {getActionBadge(log.action)}
          <span className="text-xs font-medium text-muted-foreground/80">{formatActionName(log.action)}</span>
        </div>
      </TableCell>
      <TableCell className="py-2">
        <div className="max-w-[250px] truncate text-[11px] text-muted-foreground font-mono bg-secondary/20 px-1.5 py-0.5 rounded border border-border/30">
          {log.details?.name || log.details?.title || log.details?.email || (log.details?.changes ? "Değişiklikler" : "Detaylar...")}
        </div>
      </TableCell>
      <TableCell className="py-2">
        <span className="text-[11px] font-mono text-muted-foreground">{log.ip_address || "-"}</span>
      </TableCell>
      <TableCell className="py-2 text-right">
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
          {new Date(log.created_at).toLocaleString("tr-TR", { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      <Breadcrumbs items={[{ label: "Sistem Logları" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Sistem Kayıtları</h2>
          <p className="text-xs text-muted-foreground">Sistem olaylarını izleyin.</p>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-3 items-stretch bg-secondary/10 p-3 rounded-lg border border-border/50">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Kullanıcı veya IP ara..."
            className="pl-8 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 md:flex md:flex-row gap-2 w-full xl:w-auto">
          {/* Date Filters */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2 text-muted-foreground w-full md:w-auto justify-between md:justify-start col-span-2 md:col-span-1">
                <span className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="truncate">{startDate || endDate ? `${startDate || 'Start'} - ${endDate || 'End'}` : "Tarih"}</span>
                </span>
                <ChevronDown className="w-3 h-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4 flex flex-col gap-4" align="end">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold">Başlangıç</span>
                <Input type="date" className="h-8" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold">Bitiş</span>
                <Input type="date" className="h-8" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              {(startDate || endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => { setStartDate(""); setEndDate(""); }}
                >
                  <X className="w-3 h-3 mr-1" /> Temizle
                </Button>
              )}
            </PopoverContent>
          </Popover>

          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full md:w-[160px] h-9 text-sm">
              <div className="flex items-center gap-2 overflow-hidden">
                <Filter className="w-3.5 h-3.5 shrink-0" />
                <SelectValue placeholder="İşlem Türü" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="login">Girişler</SelectItem>
              <SelectItem value="create">Oluşturmalar</SelectItem>
              <SelectItem value="update">Güncellemeler</SelectItem>
              <SelectItem value="delete">Silmeler</SelectItem>
            </SelectContent>
          </Select>

          <div className="md:w-auto">
            <Select value={limit.toString()} onValueChange={(val) => { setLimit(Number(val)); setPage(1); }}>
              <SelectTrigger className="w-full md:w-[80px] h-9 text-sm">
                <SelectValue placeholder="Limit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Card className="bg-card border-border/50 shadow-sm overflow-hidden">
        <CardContent className="p-0">

          {/* Mobile View: Cards */}
          <div className="block md:hidden">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-24 bg-secondary/10 rounded animate-pulse" />)}
              </div>
            ) : logs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">Kayıt bulunamadı.</div>
            ) : (
              logs.map(renderMobileItem)
            )}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden md:block">
            {isLoading ? (
              <div className="p-4"><TableSkeleton rows={10} cols={5} /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="h-9 hover:bg-transparent">
                    <TableHead className="w-[200px] h-9 text-xs font-semibold">Kullanıcı</TableHead>
                    <TableHead className="h-9 text-xs font-semibold">İşlem</TableHead>
                    <TableHead className="h-9 text-xs font-semibold">Özet</TableHead>
                    <TableHead className="h-9 text-xs font-semibold w-[120px]">IP Adresi</TableHead>
                    <TableHead className="h-9 text-xs font-semibold w-[140px] text-right">Tarih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground">Kayıt bulunamadı.</TableCell>
                    </TableRow>
                  ) : logs.map(renderDesktopItem)}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="border-t border-border/50 px-4 py-2 bg-muted/5">
            <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={(val) => !val && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Detayı</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <JsonVisualizer data={selectedLog.details} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}