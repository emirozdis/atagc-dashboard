"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, QrCode, Calendar, Search, ArrowUpDown, X, CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateRollCallDialog } from "@/components/admin/CreateRollCallDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { TableSkeleton } from "@/components/ui/skeleton-loader";

interface RollCall {
  id: string;
  session_name: string;
  created_at: string;
  committee: {
    name: string;
    committee_members: { count: number }[];
  } | null;
  roll_call_logs: { count: number }[];
}

interface CommitteeOption {
  id: string;
  name: string;
}

interface RollCallResponse {
  data: RollCall[];
  meta?: { totalPages?: number };
}

export default function AdminRollCallsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [committeeFilter, setCommitteeFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [ratioFilter, setRatioFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  const { data: committeesData } = useQuery<CommitteeOption[]>({
    queryKey: ['admin-committees-list'],
    queryFn: async () => {
      const res = await fetch('/api/admin/committees');
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  const committees = committeesData || [];

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, refetch } = useQuery<RollCallResponse>({
    queryKey: ['admin-roll-calls', page, limit, debouncedSearch, committeeFilter, startDate, endDate, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: debouncedSearch,
        committee_id: committeeFilter,
        start_date: startDate,
        end_date: endDate,
        sort_by: sortBy === 'ratio' ? 'created_at' : sortBy,
        sort_order: sortOrder,
      });
      const res = await fetch(`/api/admin/roll-calls?${params}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    placeholderData: (prev) => prev
  });

  const rawRollCalls: RollCall[] = data?.data || [];

  const processedRollCalls = useMemo(() => {
    let list = rawRollCalls.map(rc => {
      const attendedCount = rc.roll_call_logs?.[0]?.count || 0;
      const totalMembers = rc.committee?.committee_members?.[0]?.count || 0;
      const ratio = totalMembers > 0 ? Math.round((attendedCount / totalMembers) * 100) : 0;
      return { ...rc, _ratio: ratio };
    });

    if (ratioFilter !== "all") {
      if (ratioFilter === "full") list = list.filter(rc => rc._ratio === 100);
      else if (ratioFilter === "high") list = list.filter(rc => rc._ratio >= 75);
      else if (ratioFilter === "low") list = list.filter(rc => rc._ratio < 50);
    }

    if (sortBy === "ratio") {
      list.sort((a, b) => {
        return sortOrder === "asc" ? a._ratio! - b._ratio! : b._ratio! - a._ratio!;
      });
    }

    return list;
  }, [rawRollCalls, ratioFilter, sortBy, sortOrder]);

  const totalPages = data?.meta?.totalPages || 1;

  const resetFilters = () => {
    setSearch("");
    setCommitteeFilter("all");
    setStartDate("");
    setEndDate("");
    setRatioFilter("all");
    setSortBy("created_at");
    setSortOrder("desc");
    setPage(1);
  };

  const renderMobileCard = (rc: RollCall) => {
    const attendedCount = rc.roll_call_logs?.[0]?.count || 0;
    const totalMembers = rc.committee?.committee_members?.[0]?.count || 0;
    const ratio = totalMembers > 0 ? Math.round((attendedCount / totalMembers) * 100) : 0;

    return (
      <Card key={rc.id} className="mb-4 last:mb-0">
        <CardContent className="p-4 space-y-4">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-sm">{rc.session_name}</h4>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                {new Date(rc.created_at).toLocaleString("en-GB", { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            </div>

            <Badge variant="outline" className={`${ratio === 100 ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-secondary text-secondary-foreground'}`}>
              %{ratio}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-secondary/10 p-3 rounded-lg border border-border/50">
              <div className="text-xs text-muted-foreground mb-1">Committee</div>
              <div className="font-medium text-sm truncate">{rc.committee?.name || "Unknown"}</div>
            </div>
            <div className="bg-secondary/10 p-3 rounded-lg border border-border/50">
              <div className="text-xs text-muted-foreground mb-1">Attendance</div>
              <div className="font-medium text-sm flex items-center gap-1">
                <Users className="w-3 h-3 text-muted-foreground" />
                {attendedCount} / {totalMembers}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 pb-12 animate-fade-in sm:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">Roll call</h2>
          <p className="text-muted-foreground mt-1">
            Roll-call history and live status for all committees.
          </p>
        </div>
        <CreateRollCallDialog onSuccess={refetch} />
      </div>

      <div className="flex flex-col xl:flex-row gap-3 bg-card p-3 rounded-xl border border-border/50 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by session name..."
            className="pl-9 h-10 w-full bg-background border-border/50"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex gap-2 items-center">
          <Select value={committeeFilter} onValueChange={setCommitteeFilter}>
            <SelectTrigger className="w-full lg:w-[150px] h-10 bg-background border-border/50">
              <SelectValue placeholder="Committee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All committees</SelectItem>
              {committees.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={ratioFilter} onValueChange={setRatioFilter}>
            <SelectTrigger className="w-full lg:w-[130px] h-10 bg-background border-border/50">
              <SelectValue placeholder="Attendance rate" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All rates</SelectItem>
              <SelectItem value="full">Full (100%)</SelectItem>
              <SelectItem value="high">High (75%+)</SelectItem>
              <SelectItem value="low">Low (under 50%)</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10 px-3 gap-2 bg-background border-border/50 text-xs w-full lg:w-auto">
                <CalendarDays className="w-4 h-4" />
                <span>{startDate || endDate ? "Date selected" : "Date range"}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4" align="center">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Start date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">End date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button variant="secondary" size="sm" onClick={() => { setStartDate(""); setEndDate(""); }}>Clear</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10 px-3 gap-2 bg-background border-border/50 w-full lg:w-auto">
                <ArrowUpDown className="w-4 h-4" />
                <span>Sort</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="end">
              <div className="space-y-1">
                <Button variant={sortBy === 'created_at' ? 'secondary' : 'ghost'} size="sm" className="w-full justify-start h-8 text-xs" onClick={() => setSortBy('created_at')}>Date</Button>
                <Button variant={sortBy === 'session_name' ? 'secondary' : 'ghost'} size="sm" className="w-full justify-start h-8 text-xs" onClick={() => setSortBy('session_name')}>Session name</Button>
                <Button variant={sortBy === 'ratio' ? 'secondary' : 'ghost'} size="sm" className="w-full justify-start h-8 text-xs" onClick={() => setSortBy('ratio')}>Attendance rate</Button>
                <div className="h-px bg-border my-1" />
                <Button variant={sortOrder === 'asc' ? 'secondary' : 'ghost'} size="sm" className="w-full justify-start h-8 text-xs" onClick={() => setSortOrder('asc')}>Ascending (A-Z)</Button>
                <Button variant={sortOrder === 'desc' ? 'secondary' : 'ghost'} size="sm" className="w-full justify-start h-8 text-xs" onClick={() => setSortOrder('desc')}>Descending (Z-A)</Button>
              </div>
            </PopoverContent>
          </Popover>
          {(search !== "" || committeeFilter !== "all" || ratioFilter !== "all" || startDate !== "" || endDate !== "" || sortBy !== "created_at" || sortOrder !== "desc") && (
            <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-destructive shrink-0" onClick={resetFilters} title="Clear filters">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <Card className="bg-card border-border/50 bg-transparent shadow-none border-none">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-2"><TableSkeleton cols={5} mobileCards={true} showTitle={false} /></div>
          ) : processedRollCalls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl bg-muted/5">
              <Search className="w-12 h-12 opacity-20 mb-3" />
              <p>No roll calls matched your filters.</p>
              <Button variant="link" onClick={resetFilters} className="mt-2">Clear filters</Button>
            </div>
          ) : (
            <>
              <div className="block md:hidden">
                {processedRollCalls.map(renderMobileCard)}
              </div>
              <div className="hidden md:block rounded-xl border border-border/50 bg-card overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>Session</TableHead>
                      <TableHead>Committee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Attendance / total</TableHead>
                      <TableHead>Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                     {processedRollCalls.map((rc) => {
                      const attendedCount = rc.roll_call_logs?.[0]?.count || 0;
                      const totalMembers = rc.committee?.committee_members?.[0]?.count || 0;
                      const ratio = totalMembers > 0 ? Math.round((attendedCount / totalMembers) * 100) : 0;

                      return (
                        <TableRow key={rc.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <QrCode className="w-4 h-4 text-muted-foreground" />
                              {rc.session_name}
                            </div>
                          </TableCell>
                          <TableCell>{rc.committee?.name || "Unknown"}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(rc.created_at).toLocaleString("en-GB", { dateStyle: 'medium', timeStyle: 'short' })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              <span className="font-mono font-medium">
                                {attendedCount} <span className="text-muted-foreground">/ {totalMembers}</span>
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`gap-1.5 font-mono ${ratio === 100 ? 'bg-green-500/10 text-green-500 border-green-500/20' : ''}`}>
                              %{ratio}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          <div className="px-0 md:px-4 py-4 md:border-t border-border/50">
            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Change Log:
// - Enabled `mobileCards` for `TableSkeleton` to fix loading state on mobile.
