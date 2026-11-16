"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  XCircle,
  Clock,
  Hourglass,
  Search,
  Filter,
  Eye,
  Building2,
  Calendar,
  GraduationCap,
  ArrowUpDown,
  Briefcase,
  FileSpreadsheet,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
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
import { TableSkeleton } from "@/components/ui/skeleton-loader";

interface ApplicationDetails {
  profile_picture_url?: string | null;
  school?: string | null;
  additional_info?: { manual_school_name?: string } | null;
  high_schools?: { school_name?: string } | null;
}

interface ApplicationRow {
  id: string;
  status: string;
  submitted_at: string;
  application_type?: string;
  form_data?: Record<string, unknown>;
  form?: { slug?: string; title?: string } | null;
  user?: {
    id: string;
    full_name: string;
    email: string;
    role?: string;
    user_details?: ApplicationDetails | ApplicationDetails[] | null;
    committee_members?: Array<{ committee?: { id: string; name: string } | null }>;
  };
}

function applicationUser(app: ApplicationRow) {
  return app.user || { id: "", full_name: "Unknown applicant", email: "", user_details: null, committee_members: [] };
}

function applicationSchool(app: ApplicationRow) {
  const detailsValue = applicationUser(app).user_details;
  const details = Array.isArray(detailsValue) ? detailsValue[0] : detailsValue;
  const formData = app.form_data || {};
  const formSchool = ["school", "schoolName", "school_name", "schoolOrOrganization", "school_or_organization", "manual_school_name"]
    .map((key) => formData[key])
    .find((value) => typeof value === "string" && value.trim());
  return (typeof formSchool === "string" ? formSchool : "")
    || details?.high_schools?.school_name
    || details?.school
    || details?.additional_info?.manual_school_name
    || "-";
}

function canAssignCommittee(app: ApplicationRow) {
  return (app.application_type === "delegate" || app.application_type === "chairboard")
    && ["accepted", "approved"].includes(app.status);
}

function committeeAssignmentRole(app: ApplicationRow) {
  const user = applicationUser(app);
  return app.application_type === "chairboard"
    ? "committee_chairman"
    : user.role === "chair"
      ? "chair"
      : "delegate";
}

interface ApplicationsResponse {
  data: ApplicationRow[];
  meta?: { totalPages?: number; total?: number };
}

interface CommitteeStat {
  id: string;
  name: string;
  total: number;
  chairs: number;
  delegates: number;
}

interface CommitteeStatsResponse {
  committees: CommitteeStat[];
  placed: number;
  unassigned: number;
}

const STATUS_VALUES = new Set(["all", "pending", "under_review", "accepted", "waitlist", "approved", "unassigned", "rejected"]);
const ROLE_VALUES = new Set(["all", "delegate", "chairboard", "delegation", "press", "observer"]);
const SORT_VALUES = new Set(["newest", "oldest", "name_asc", "name_desc", "school_asc"]);
const LIMIT_VALUES = new Set([10, 20, 50]);

function initialFilters(searchParams: ReturnType<typeof useSearchParams>) {
  const pageValue = Number(searchParams.get("page"));
  const limitValue = Number(searchParams.get("limit"));
  const statusValue = searchParams.get("status") || "all";
  const roleValue = searchParams.get("role") || "all";
  const sortValue = searchParams.get("sort") || "newest";
  return {
    page: Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1,
    limit: LIMIT_VALUES.has(limitValue) ? limitValue : 10,
    status: STATUS_VALUES.has(statusValue) ? statusValue : "all",
    role: ROLE_VALUES.has(roleValue) ? roleValue : "all",
    search: searchParams.get("search") || "",
    sort: SORT_VALUES.has(sortValue) ? sortValue : "newest",
  };
}

function ApplicationsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const initial = useMemo(() => initialFilters(searchParams), [searchParams]);

  const [page, setPage] = useState(initial.page);
  const [limit, setLimit] = useState(initial.limit);
  const [sortValue, setSortValue] = useState(initial.sort);

  const [filterStatus, setFilterStatus] = useState<string>(initial.status);
  const [filterRole, setFilterRole] = useState<string>(initial.role);
  const [searchQuery, setSearchQuery] = useState(initial.search);
  const [debouncedSearch, setDebouncedSearch] = useState(initial.search);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (searchQuery === debouncedSearch) return;
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, debouncedSearch]);

  const buildListQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (page !== 1) params.set("page", String(page));
    if (limit !== 10) params.set("limit", String(limit));
    if (filterStatus !== "all") params.set("status", filterStatus);
    if (filterRole !== "all") params.set("role", filterRole);
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (sortValue !== "newest") params.set("sort", sortValue);
    return params.toString();
  }, [page, limit, filterStatus, filterRole, debouncedSearch, sortValue]);

  useEffect(() => {
    const query = buildListQuery();
    const currentQuery = new URLSearchParams(window.location.search).toString();
    if (query === currentQuery) return;
    const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
    router.replace(url, { scroll: false });
  }, [buildListQuery, router]);

  const openApplication = (applicationId: string) => {
    const query = buildListQuery();
    router.push(`/admin/applications/${applicationId}${query ? `?returnTo=${encodeURIComponent(query)}` : ""}`);
  };

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
    queryKey: ['applications', page, limit, filterStatus, filterRole, debouncedSearch, sortValue],
    queryFn: async () => {
      const { key, dir } = getSortConfig(sortValue);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        status: filterStatus,
        role: filterRole,
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

  const { data: committeeStats } = useQuery<CommitteeStatsResponse>({
    queryKey: ["committee-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/committee-stats");
      if (!res.ok) throw new Error("Failed to load committee counts");
      return res.json();
    },
  });
  const committees = committeeStats?.committees || [];

  const assignMutation = useMutation({
    mutationFn: async ({ userId, committeeId, role }: { userId: string; committeeId: string | null; role: string }) => {
      const res = await fetch("/api/admin/committee-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, committeeId, role }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { message?: string; error?: string } | null;
        throw new Error(body?.message || body?.error || "Committee assignment failed.");
      }
    },
    onSuccess: () => {
      toast.success("Committee assignment updated");
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["committee-stats"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Committee assignment failed."),
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { key, dir } = getSortConfig(sortValue);
      const params = new URLSearchParams({
        status: filterStatus,
        role: filterRole,
        search: debouncedSearch,
        sort_by: key,
        sort_order: dir,
      });
      const res = await fetch(`/api/applications/export?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || body?.error || "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `applications-${new Date().toISOString().slice(0, 10)}.xls`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Applications exported.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

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
      case "waitlist":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20 gap-1.5 whitespace-nowrap">
            <Hourglass className="w-3 h-3" /> Waitlisted
          </Badge>
        );
      case "under_review":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 gap-1.5 whitespace-nowrap">
            <Eye className="w-3 h-3" /> Under review
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

    const formSlug = app.form?.slug || app.application_type || 'delegate';
    const roleLabel = app.form?.title || formSlug;
    const assignable = canAssignCommittee(app);

    return (
      <Card
        className="mb-4 bg-card border-border/50 hover:border-primary/20 transition-all active:scale-[0.99] cursor-pointer"
        onClick={() => openApplication(app.id)}
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
                <Badge variant="secondary" className="mt-2 max-w-full text-[10px] font-medium">
                  <Briefcase className="mr-1 h-3 w-3 shrink-0" />
                  <span className="truncate">{roleLabel}</span>
                </Badge>
              </div>
            </div>
            <div className="shrink-0">
              {getStatusBadge(app.status)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-secondary/10 p-3 rounded-lg border border-border/50">
            <div className="flex items-center gap-2 overflow-hidden">
              <GraduationCap className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{applicationSchool(app)}</span>
            </div>
            <div className="flex items-center gap-2 overflow-hidden">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{new Date(app.submitted_at).toLocaleDateString("en-GB")}</span>
            </div>
            {(assignable || assignedCommittee) && (
              <div className="col-span-2 flex items-center gap-2 pt-2 border-t border-border/10 mt-1">
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                {assignable ? (
                  <div
                    className="min-w-0 flex-1"
                    onClick={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <Select
                      value={assignedCommittee?.id || "none"}
                      onValueChange={(value) => assignMutation.mutate({
                        userId: user.id,
                        committeeId: value === "none" ? null : value,
                        role: committeeAssignmentRole(app),
                      })}
                      disabled={assignMutation.isPending && assignMutation.variables?.userId === user.id}
                    >
                      <SelectTrigger className={`h-8 w-full text-xs ${assignedCommittee ? "" : "border-dashed text-orange-500"}`}>
                        <div className="flex min-w-0 items-center gap-1.5">
                          {assignMutation.isPending && assignMutation.variables?.userId === user.id && <Loader2 className="h-3 w-3 shrink-0 animate-spin" />}
                          <SelectValue placeholder="Assign committee" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No assignment</SelectItem>
                        {committees.map((committee) => (
                          <SelectItem key={committee.id} value={committee.id}>{committee.name} ({committee.total})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : assignedCommittee ? (
                  <span className="font-medium text-foreground truncate">{assignedCommittee.name}</span>
                ) : null}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 pb-12 animate-fade-in sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">Applications</h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Showing <span className="font-medium text-foreground">{totalRecords}</span> submitted applications.
          </p>
        </div>
        <Button
          variant="outline"
          className="h-10 w-full sm:w-auto"
          onClick={handleExport}
          disabled={isExporting || isLoading}
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <FileSpreadsheet className="w-4 h-4 mr-2" />
          )}
          {isExporting ? "Exporting..." : "Export to Excel"}
        </Button>
      </div>

      {committeeStats && (
        <section className="space-y-3 rounded-xl border border-border/50 bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Committee placement</h3>
              <Badge variant="secondary" className="text-[10px]">{committeeStats.placed} placed</Badge>
            </div>
            {committeeStats.unassigned > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-fit gap-2 border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
                onClick={() => { setFilterStatus("unassigned"); setFilterRole("all"); setPage(1); }}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                {committeeStats.unassigned} awaiting committee
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
            {committeeStats.committees.map((committee) => (
              <div key={committee.id} className="rounded-lg border border-border/50 bg-background/60 p-3">
                <div className="truncate text-[11px] font-medium text-muted-foreground" title={committee.name}>
                  {committee.name}
                </div>
                <div className="mt-1 text-2xl font-bold leading-none">{committee.total}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {committee.chairs} chair{committee.chairs === 1 ? "" : "s"} · {committee.delegates} delegate{committee.delegates === 1 ? "" : "s"}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

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
              <SelectItem value="waitlist">Waitlisted</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="unassigned">Awaiting assignment</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterRole} onValueChange={(val) => { setFilterRole(val); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-[180px] h-10 bg-background border-border/50">
              <div className="flex items-center gap-2 truncate">
                <Briefcase className="w-4 h-4 shrink-0" />
                <SelectValue placeholder="Role" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="delegate">Delegate</SelectItem>
              <SelectItem value="chairboard">Chairboard</SelectItem>
              <SelectItem value="delegation">Delegation leader</SelectItem>
              <SelectItem value="press">Press</SelectItem>
              <SelectItem value="observer">Observer</SelectItem>
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
          {(filterStatus !== 'all' || filterRole !== 'all' || searchQuery) && (
            <Button variant="link" onClick={() => { setFilterStatus('all'); setFilterRole('all'); setSearchQuery(''); setPage(1); }} className="mt-2">
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

                  const formSlug = app.form?.slug || app.application_type || 'delegate';
                  const assignable = canAssignCommittee(app);

                  return (
                    <TableRow
                      key={app.id}
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => openApplication(app.id)}
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
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate" title={applicationSchool(app)}>
                        {applicationSchool(app)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(app.submitted_at).toLocaleDateString("en-GB")}
                      </TableCell>
                      <TableCell>
                        {assignable ? (
                          <div
                            onClick={(event) => event.stopPropagation()}
                            onPointerDown={(event) => event.stopPropagation()}
                          >
                            <Select
                              value={assignedCommittee?.id || "none"}
                              onValueChange={(value) => assignMutation.mutate({
                                userId: user.id,
                                committeeId: value === "none" ? null : value,
                                role: committeeAssignmentRole(app),
                              })}
                              disabled={assignMutation.isPending && assignMutation.variables?.userId === user.id}
                            >
                              <SelectTrigger className={`h-8 w-[170px] text-xs ${assignedCommittee ? "" : "border-dashed text-orange-500"}`}>
                                <div className="flex min-w-0 items-center gap-1.5">
                                  {assignMutation.isPending && assignMutation.variables?.userId === user.id && <Loader2 className="h-3 w-3 shrink-0 animate-spin" />}
                                  <SelectValue placeholder="Assign committee" />
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No assignment</SelectItem>
                                {committees.map((committee) => (
                                  <SelectItem key={committee.id} value={committee.id}>{committee.name} ({committee.total})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : assignedCommittee ? (
                          <div className="flex items-center gap-1.5 text-sm">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="font-medium truncate max-w-[150px]" title={assignedCommittee.name}>
                              {assignedCommittee.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground opacity-50">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={(event) => {
                            event.stopPropagation();
                            openApplication(app.id);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" /> Review
                        </Button>
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

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl p-5 sm:p-8"><TableSkeleton cols={7} rows={10} showTitle={false} /></div>}>
      <ApplicationsPageContent />
    </Suspense>
  );
}
