"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Search,
  Filter,
  ScrollText,
  User as UserIcon,
  Calendar,
  Monitor,
  Network,
  Code,
  Eye,
  ChevronDown,
  ChevronUp,
  Copy,
  ListFilter
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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
  return action
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Helper to recursively extract IDs from keys like user_id, committee_id
const extractIdsToResolve = (obj: any): { users: Set<string>, committees: Set<string>, announcements: Set<string> } => {
  const result = {
    users: new Set<string>(),
    committees: new Set<string>(),
    announcements: new Set<string>()
  };

  if (!obj || typeof obj !== 'object') return result;

  const traverse = (item: any) => {
    if (!item || typeof item !== 'object') return;
    
    Object.keys(item).forEach(key => {
      const val = item[key];
      if (typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) {
        if (key.includes('user_id') || key === 'author_id') result.users.add(val);
        if (key.includes('committee_id')) result.committees.add(val);
        if (key.includes('announcement_id')) result.announcements.add(val);
      }
      if (typeof val === 'object') traverse(val);
    });
  };

  traverse(obj);
  return result;
};

const JsonVisualizer = ({ data, resolvedMap }: { data: any, resolvedMap: Record<string, string> }) => {
  if (data === null) return <Badge variant="outline" className="text-[10px] bg-muted/50 font-mono h-4 px-1">null</Badge>;
  if (data === undefined) return <span className="text-muted-foreground italic text-xs">undefined</span>;
  
  if (typeof data === 'boolean') {
    return (
        <Badge variant="secondary" className={`text-[10px] h-4 px-1 ${data ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
            {String(data)}
        </Badge>
    );
  }

  if (typeof data !== 'object') {
    const strVal = String(data);
    // Check if we have a resolution for this value
    if (resolvedMap[strVal]) {
        return (
            <div className="inline-flex items-center gap-1.5 group">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/10 transition-colors text-[10px] h-4 px-1.5">
                    {resolvedMap[strVal]}
                </Badge>
                <span className="text-[10px] text-muted-foreground font-mono opacity-30 group-hover:opacity-100 transition-opacity select-all">
                    {strVal}
                </span>
            </div>
        );
    }
    return <span className="text-xs font-medium break-all text-foreground/90">{strVal}</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-muted-foreground italic text-xs">[]</span>;
    return (
        <div className="flex flex-col gap-1 pl-2 border-l border-border/50">
            {data.map((item, i) => (
                <div key={i} className="flex gap-2">
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0 mt-0.5 opacity-50 select-none">[{i}]</span>
                    <JsonVisualizer data={item} resolvedMap={resolvedMap} />
                </div>
            ))}
        </div>
    );
  }

  const keys = Object.keys(data);
  if (keys.length === 0) return <span className="text-muted-foreground italic text-xs">{'{}'}</span>;

  return (
    <div className="grid gap-1.5">
        {keys.map(key => {
            const value = data[key];
            const isComplex = typeof value === 'object' && value !== null;
            
            return (
                <div key={key} className="relative">
                    <div className={`flex ${isComplex ? 'flex-col gap-0.5' : 'items-baseline gap-2'}`}>
                        <span className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider shrink-0 select-none flex items-center gap-1">
                            <span className="w-0.5 h-0.5 rounded-full bg-border/80"></span>
                            {key.replace(/_/g, ' ')}
                        </span>
                        {!isComplex && <div className="flex-1 border-b border-dashed border-border/40 relative -top-1 mx-2 opacity-30 hidden sm:block"></div>}
                        <div className={`${isComplex ? 'pl-2 border-l border-primary/10 ml-0.5 mt-0.5' : ''}`}>
                            <JsonVisualizer data={value} resolvedMap={resolvedMap} />
                        </div>
                    </div>
                </div>
            );
        })}
    </div>
  );
};

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [isRawView, setIsRawView] = useState(false);
  const [isNetworkExpanded, setIsNetworkExpanded] = useState(false);

  // ID Resolution State
  const [resolvedMap, setResolvedMap] = useState<Record<string, string>>({});
  const [resolving, setResolving] = useState(false);

  // Pagination & Filter State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedSearch(search);
        setPage(1); // Reset page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchLogs();
  }, [page, limit, debouncedSearch, actionFilter]);

  // Resolve IDs when selected log changes
  useEffect(() => {
    if (selectedLog && selectedLog.details) {
        resolveIds(selectedLog.details);
    }
  }, [selectedLog]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: debouncedSearch,
        action: actionFilter
      });

      const res = await fetch(`/api/admin/logs?${params}`);
      if (!res.ok) throw new Error("Failed");
      
      const data = await res.json();
      setLogs(data.data || []);
      setTotalPages(data.meta.totalPages || 1);
    } catch (e) {
      toast.error("Loglar yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const resolveIds = async (details: any) => {
    setResolving(true);
    try {
        const { users, committees, announcements } = extractIdsToResolve(details);
        
        // Skip if already resolved
        const usersToFetch = Array.from(users).filter(id => !resolvedMap[id]);
        const committeesToFetch = Array.from(committees).filter(id => !resolvedMap[id]);
        
        const newResolutions: Record<string, string> = {};

        if (usersToFetch.length > 0) {
            const res = await fetch(`/api/admin/users?ids=${usersToFetch.join(',')}`);
            if (res.ok) {
                const json = await res.json();
                json.data?.forEach((u: any) => {
                    newResolutions[u.id] = u.full_name;
                });
            }
        }

        if (committeesToFetch.length > 0) {
            const res = await fetch(`/api/admin/committees`);
            if (res.ok) {
                const comms = await res.json();
                comms.forEach((c: any) => {
                    if (committees.has(c.id)) newResolutions[c.id] = c.name;
                });
            }
        }

        setResolvedMap(prev => ({ ...prev, ...newResolutions }));

    } catch (e) {
        console.error("Resolution failed", e);
    } finally {
        setResolving(false);
    }
  };

  const getActionBadge = (action: string) => {
    if (action.includes("create")) return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20 text-[10px] h-5 px-1.5 gap-1">Oluşturma</Badge>;
    if (action.includes("update")) return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20 text-[10px] h-5 px-1.5 gap-1">Güncelleme</Badge>;
    if (action.includes("delete")) return <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20 text-[10px] h-5 px-1.5 gap-1">Silme</Badge>;
    if (action.includes("login")) return <Badge className="bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border-purple-500/20 text-[10px] h-5 px-1.5 gap-1">Giriş</Badge>;
    return <Badge variant="outline" className="text-muted-foreground text-[10px] h-5 px-1.5">{action}</Badge>;
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-2xl font-display font-bold text-foreground">Sistem Kayıtları</h2>
            <p className="text-xs text-muted-foreground">Sistem olaylarını izleyin.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center bg-secondary/10 p-3 rounded-lg border border-border/50">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Kullanıcı veya IP ara..."
            className="pl-8 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
            <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm">
                <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5" />
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

            <Select value={limit.toString()} onValueChange={(val) => { setLimit(Number(val)); setPage(1); }}>
                <SelectTrigger className="w-[80px] h-9 text-sm">
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

      <Card className="bg-card border-border/50 shadow-sm">
        <CardContent className="p-0">
          <div className="rounded-md overflow-hidden">
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
                {loading ? (
                    <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
                    </TableCell>
                    </TableRow>
                ) : logs.length === 0 ? (
                    <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground">
                        Kayıt bulunamadı.
                    </TableCell>
                    </TableRow>
                ) : (
                    logs.map((log) => (
                    <TableRow 
                        key={log.id} 
                        className="cursor-pointer hover:bg-muted/40 transition-colors h-9 border-b border-border/40"
                        onClick={() => { 
                            setSelectedLog(log); 
                            setIsRawView(false); 
                            setIsNetworkExpanded(false);
                        }}
                    >
                        <TableCell className="py-1.5">
                        <div className="flex items-center gap-2">
                            <Avatar className="w-5 h-5 border border-white/10">
                            <AvatarImage src={`https://avatar.vercel.sh/${log.user?.email || 'system'}`} />
                            <AvatarFallback className="text-[9px]">{ (log.user?.full_name || "S").substring(0, 2).toUpperCase() }</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <span className="font-medium text-xs leading-none">{log.user?.full_name || "Sistem / Bilinmiyor"}</span>
                                {log.user && <span className="text-[10px] text-muted-foreground leading-none mt-0.5">{log.user.email}</span>}
                            </div>
                        </div>
                        </TableCell>
                        <TableCell className="py-1.5">
                        <div className="flex items-center gap-2">
                            {getActionBadge(log.action)}
                            <span className="text-xs font-medium text-muted-foreground/80">{formatActionName(log.action)}</span>
                        </div>
                        </TableCell>
                        <TableCell className="py-1.5">
                        <div className="max-w-[250px] truncate text-[11px] text-muted-foreground font-mono bg-secondary/20 px-1.5 py-0.5 rounded border border-border/30">
                            {/* Try to show something meaningful instead of raw JSON */}
                            {log.details?.name || log.details?.title || log.details?.email || (log.details?.changes ? "Değişiklikler" : "Detaylar...")}
                        </div>
                        </TableCell>
                        <TableCell className="py-1.5">
                            <span className="text-[11px] font-mono text-muted-foreground">{log.ip_address || "-"}</span>
                        </TableCell>
                        <TableCell className="py-1.5 text-right">
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                {new Date(log.created_at).toLocaleString("tr-TR", { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </TableCell>
                    </TableRow>
                    ))
                )}
                </TableBody>
            </Table>
          </div>
          <div className="border-t border-border/50 px-4 py-2 bg-muted/5">
            <PaginationControls 
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(val) => !val && setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-3 border-b border-border/50 bg-muted/5">
            <div className="flex justify-between items-start">
                <div>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <ScrollText className="w-4 h-4 text-primary" />
                        Log Detayı
                    </DialogTitle>
                    <DialogDescription className="mt-1">
                    İşlem ID: <span className="font-mono text-[10px] select-all bg-muted/50 px-1 rounded">{selectedLog?.id}</span>
                    </DialogDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                    {new Date(selectedLog?.created_at || "").toLocaleString("tr-TR")}
                </Badge>
            </div>
          </DialogHeader>
          
          {selectedLog && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* User & Basic Info */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 p-3 rounded-lg border border-border/50 bg-card">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <UserIcon className="w-3 h-3" /> Kullanıcı
                    </div>
                    <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9 border border-border">
                            <AvatarImage src={`https://avatar.vercel.sh/${selectedLog.user?.email || 'sys'}`} />
                            <AvatarFallback>{selectedLog.user?.full_name?.substring(0, 2).toUpperCase() || "SY"}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="font-semibold text-sm">{selectedLog.user?.full_name || "Sistem / Anonim"}</div>
                            <div className="text-xs text-muted-foreground">{selectedLog.user?.email || "E-posta yok"}</div>
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 p-3 rounded-lg border border-border/50 bg-card">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <ListFilter className="w-3 h-3" /> İşlem Türü
                    </div>
                    <div className="flex items-center gap-2">
                        {getActionBadge(selectedLog.action)}
                        <span className="text-sm font-medium">{formatActionName(selectedLog.action)}</span>
                    </div>
                </div>
              </div>

              <Separator />
                        
              {/* Network Info (Collapsible) */}
              <div className="rounded-lg border border-border/50 overflow-hidden bg-muted/10">
                <button 
                    onClick={() => setIsNetworkExpanded(!isNetworkExpanded)}
                    className="w-full flex items-center justify-between p-2.5 text-xs font-medium text-foreground/80 hover:bg-muted/20 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Network className="w-3.5 h-3.5 text-muted-foreground" />
                        Ağ Bilgileri <span className="font-mono text-muted-foreground ml-1">{selectedLog.ip_address || "Bilinmiyor"}</span>
                    </div>
                    {isNetworkExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                
                {isNetworkExpanded && (
                    <div className="p-3 pt-0 text-sm animate-in slide-in-from-top-1 border-t border-border/30">
                        <div className="mt-2 grid gap-1.5">
                            <div className="flex justify-between items-center bg-background p-2 rounded border border-border/40">
                                <span className="text-muted-foreground text-xs font-medium">IP Adresi</span>
                                <span className="font-mono text-xs">{selectedLog.ip_address || "Bilinmiyor"}</span>
                            </div>
                            <div className="bg-background p-2 rounded border border-border/40">
                                <span className="text-muted-foreground text-xs font-medium block mb-1">User Agent</span>
                                <span className="font-mono text-[10px] break-all text-muted-foreground/80 leading-tight">
                                    {selectedLog.user_agent || "User Agent Bilgisi Yok"}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
              </div>

              {/* Data Viewer */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5" /> 
                    İşlem Verisi
                    {resolving && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground ml-2" />}
                  </div>
                  <div className="flex bg-muted p-0.5 rounded-lg border border-border/50">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={`h-6 text-[10px] px-2 rounded-md ${!isRawView ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={() => setIsRawView(false)}
                    >
                      <Eye className="w-3 h-3 mr-1.5" /> Görsel
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={`h-6 text-[10px] px-2 rounded-md ${isRawView ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={() => setIsRawView(true)}
                    >
                      <Code className="w-3 h-3 mr-1.5" /> JSON
                    </Button>
                  </div>
                </div>
                
                <div className="w-full rounded-lg border bg-card/50 p-4 min-h-[200px] shadow-inner relative overflow-hidden text-sm">
                  {isRawView ? (
                    <div className="relative group h-full">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute right-0 top-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                                navigator.clipboard.writeText(JSON.stringify(selectedLog.details, null, 2));
                                toast.success("Kopyalandı");
                            }}
                        >
                            <Copy className="w-3 h-3" />
                        </Button>
                        <pre className="text-[10px] font-mono whitespace-pre-wrap text-muted-foreground overflow-x-auto h-full">
                        {JSON.stringify(selectedLog.details, null, 2)}
                        </pre>
                    </div>
                  ) : (
                    <JsonVisualizer data={selectedLog.details} resolvedMap={resolvedMap} />
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}