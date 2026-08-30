"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Eye,
  Building2,
  Calendar,
  GraduationCap,
  ArrowUpDown,
  MoreHorizontal
} from "lucide-react";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableSkeleton } from "@/components/ui/skeleton-loader";

interface ApplicationDetails {
  profile_picture_url?: string | null;
  additional_info?: { manual_school_name?: string } | null;
  high_schools?: { school_name?: string } | null;
}

interface ApplicationRow {
  id: string;
  status: string;
  submitted_at: string;
  form?: { slug?: string; title?: string } | null;
  user?: {
    full_name: string;
    email: string;
    user_details?: ApplicationDetails | ApplicationDetails[] | null;
    committee_members?: Array<{ committee?: { id: string; name: string } | null }>;
  };
}

function applicationUser(app: ApplicationRow) {
  return app.user || { full_name: "Unknown applicant", email: "", user_details: null, committee_members: [] };
}

interface ApplicationsResponse {
  data: ApplicationRow[];
  meta?: { totalPages?: number; total?: number };
}

export default function ApplicationsPage() {
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortValue, setSortValue] = useState("newest");

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const getSortConfig = (val: string) => {
    switch (val) {
      case "newest": return { key: "submitted_at", dir: "desc" };
      case "oldest": return { key: "submitted_at", dir: "asc" };
      case "name_asc": return { key: "full_name", dir: "asc" };
      case "name_desc": return { key: "full_name", dir: "desc" };
      case "school_asc": return { key: "school_name", dir: "asc" };
      default: return { key: "submitted_at", dir: "desc" };
    }
  };

  const { data, isLoading } = useQuery<ApplicationsResponse>({
    queryKey: ['applications', page, limit, filterStatus, debouncedSearch, sortValue],
    queryFn: async () => {
      const { key, dir } = getSortConfig(sortValue);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        status: filterStatus,
        search: debouncedSearch,
        sort_by: key,
        sort_order: dir
      });
      const res = await fetch(`/api/applications?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    placeholderData: (prev) => prev
  });

  const applications: ApplicationRow[] = data?.data || [];
  const totalPages = data?.meta?.totalPages || 1;
  const totalRecords = data?.meta?.total || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20 gap-1.5 whitespace-nowrap">
            <CheckCircle className="w-3 h-3" /> Approved
          </Badge>
        );
      case "accepted":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20 gap-1.5 whitespace-nowrap">
            <CheckCircle className="w-3 h-3" /> Accepted
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 gap-1.5 whitespace-nowrap">
            <XCircle className="w-3 h-3" /> Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20 gap-1.5 whitespace-nowrap">
            <Clock className="w-3 h-3" /> Pending
          </Badge>
        );
    }
  };

  const MobileApplicationCard = ({ app }: { app: ApplicationRow }) => {
    const user = applicationUser(app);
    const details = Array.isArray(user.user_details) ? user.user_details[0] : user.user_details;
    const assignedCommittee = user.committee_members?.[0]?.committee;

    const formSlug = app.form?.slug || 'delegate';
    const isAcademic = formSlug === 'delegate';

    return (
      <Card
        className="mb-4 bg-card border-border/50 hover:border-primary/20 transition-all active:scale-[0.99] cursor-pointer"
        onClick={() => router.push(`/admin/applications/${app.id}`)}
      >
        <CardContent className="p-4 space-y-4">
          <div className="flex justify-between items-start gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Avatar className="w-10 h-10 border border-border/50 shrink-0">
                <AvatarImage src={details?.profile_picture_url || undefined} className="object-cover" />
                <AvatarFallback>{user.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm truncate pr-2">{user.full_name}</div>
                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
              </div>
            </div>
            <div className="shrink-0">
              {getStatusBadge(app.status)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-secondary/10 p-3 rounded-lg border border-border/50">
            <div className="flex items-center gap-2 overflow-hidden">
              <GraduationCap className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{details?.high_schools?.school_name || details?.additional_info?.manual_school_name || "No school"}</span>
            </div>
            <div className="flex items-center gap-2 overflow-hidden">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{new Date(app.submitted_at).toLocaleDateString("en-GB")}</span>
            </div>
            {isAcademic && (
              <div className="col-span-2 flex items-center gap-2 pt-2 border-t border-border/10 mt-1">
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                {assignedCommittee ? (
                  <span className="font-medium text-foreground truncate">{assignedCommittee.name}</span>
                ) : app.status === 'approved' ? (
                  <span className="text-orange-500 font-medium">Awaiting assignment</span>
                ) : (
                  <span className="italic opacity-70">No committee</span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 pb-12 animate-fade-in sm:p-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">Applications</h2>
        <p className="text-muted-foreground text-sm md:text-base">
          Showing <span className="font-medium text-foreground">{totalRecords}</span> submitted applications.
        </p>
      </div>

      {/* Controls Toolbar */}
      <div className="flex flex-col xl:flex-row gap-3 bg-card p-3 rounded-xl border border-border/50 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or school..."
            className="pl-9 bg-background border-border/50 h-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 sm:flex gap-2">
          {/* Status Filter */}
          <Select value={filterStatus} onValueChange={(val) => { setFilterStatus(val); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-[180px] h-10 bg-background border-border/50">
              <div className="flex items-center gap-2 truncate">
                <Filter className="w-4 h-4 shrink-0" />
                <SelectValue placeholder="Status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="under_review">Under review</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="unassigned">Awaiting assignment</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Selector */}
          <Select value={sortValue} onValueChange={(val) => { setSortValue(val); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-[180px] h-10 bg-background border-border/50">
              <div className="flex items-center gap-2 truncate">
                <ArrowUpDown className="w-4 h-4 shrink-0" />
                <SelectValue placeholder="Sort" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="name_asc">Name (A-Z)</SelectItem>
              <SelectItem value="name_desc">Name (Z-A)</SelectItem>
              <SelectItem value="school_asc">School (A-Z)</SelectItem>
            </SelectContent>
          </Select>

          {/* Limit Selector */}
          <div className="hidden sm:block">
            <Select value={limit.toString()} onValueChange={(val) => { setLimit(Number(val)); setPage(1); }}>
              <SelectTrigger className="w-[80px] h-10 bg-background border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="hidden md:block">
            <TableSkeleton cols={7} rows={limit} showTitle={false} />
          </div>
          <div className="md:hidden space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 bg-muted/20 animate-pulse rounded-xl border border-border/30" />
            ))}
          </div>
        </div>
      ) : applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl bg-muted/5">
          <Search className="w-12 h-12 mb-3 opacity-20" />
          <p>No applications match the selected filters.</p>
          {(filterStatus !== 'all' || searchQuery) && (
            <Button variant="link" onClick={() => { setFilterStatus('all'); setSearchQuery(''); }} className="mt-2">
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop View: Table */}
          <div className="hidden md:block rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="pl-6">Applicant</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Committee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => {
                  const user = applicationUser(app);
                  const details = Array.isArray(user.user_details) ? user.user_details[0] : user.user_details;
                  const assignedCommittee = user.committee_members?.[0]?.committee;

                  const formSlug = app.form?.slug || 'delegate';
                  const isAcademic = formSlug === 'delegate' || formSlug === 'committee_chairman' || formSlug === 'chair' || formSlug === 'deputy_chair';

                  return (
                    <TableRow
                      key={app.id}
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => router.push(`/admin/applications/${app.id}`)}
                    >
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 border border-border/50 shrink-0">
                            <AvatarImage src={details?.profile_picture_url || undefined} className="object-cover" />
                            <AvatarFallback>{user.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-medium text-foreground truncate">{user.full_name}</div>
                            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] font-normal capitalize">
                          {app.form?.title || formSlug}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate" title={details?.high_schools?.school_name || details?.additional_info?.manual_school_name}>
                        {details?.high_schools?.school_name || details?.additional_info?.manual_school_name || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(app.submitted_at).toLocaleDateString("en-GB")}
                      </TableCell>
                      <TableCell>
                        {isAcademic ? (
                          assignedCommittee ? (
                            <div className="flex items-center gap-1.5 text-sm">
                              <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="font-medium truncate max-w-[150px]" title={assignedCommittee.name}>
                                {assignedCommittee.name}
                              </span>
                            </div>
                          ) : app.status === 'approved' ? (
                            <Badge variant="outline" className="bg-orange-500/5 text-orange-500 border-orange-500/20 border-dashed whitespace-nowrap">
                              Awaiting assignment
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )
                        ) : (
                          <span className="text-sm text-muted-foreground opacity-50">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell className="text-right pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/admin/applications/${app.id}`)}>
                              <Eye className="w-4 h-4 mr-2" /> Review
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile View: Cards */}
          <div className="md:hidden">
            {applications.map((app) => (
              <MobileApplicationCard key={app.id} app={app} />
            ))}
          </div>

          <div className="py-2">
            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </div>
  );
}
