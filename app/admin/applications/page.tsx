"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Loader2,
  Eye,
  ArrowUpDown,
  Building2,
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

import { Application } from "@/types/admin";
import { useRouter } from "next/navigation";

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Sort State
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'submitted_at',
    direction: 'desc'
  });

  // Filter State
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch when params change
  useEffect(() => {
    fetchApplications();
  }, [page, filterStatus, debouncedSearch, sortConfig]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filterStatus, debouncedSearch]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        status: filterStatus,
        search: debouncedSearch,
        sort_by: sortConfig.key,
        sort_order: sortConfig.direction
      });

      const res = await fetch(`/api/applications?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");

      const responseData = await res.json();
      // Handle the new response structure { data, meta }
      if (responseData.data) {
        setApplications(responseData.data);
        setTotalPages(responseData.meta.totalPages);
      } else {
        // Fallback or error if format is wrong
        setApplications([]);
        setTotalPages(0);
      }

    } catch (error) {
      toast.error("Hata", { description: "Başvuru listesi yüklenemedi." });
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20 gap-1">
            <CheckCircle className="w-3 h-3" /> Onaylandı
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 gap-1">
            <XCircle className="w-3 h-3" /> Reddedildi
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20 gap-1">
            <Clock className="w-3 h-3" /> Bekliyor
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">Başvurular</h2>
          <p className="text-muted-foreground mt-1">
            Başvuruları buradan yönetebilirsiniz.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="İsim, e-posta veya okul ara..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full md:w-[200px]">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <SelectValue placeholder="Durum Filtrele" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="pending">Bekleyenler</SelectItem>
            <SelectItem value="approved">Onaylananlar</SelectItem>
            <SelectItem value="rejected">Reddedilenler</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border border-border/50 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer hover:text-foreground" onClick={() => handleSort('full_name')}>
                <div className="flex items-center gap-2">
                  Başvuran <ArrowUpDown className="w-3 h-3" />
                </div>
              </TableHead>
              <TableHead>Okul</TableHead>
              <TableHead className="cursor-pointer hover:text-foreground" onClick={() => handleSort('submitted_at')}>
                <div className="flex items-center gap-2">
                  Tarih <ArrowUpDown className="w-3 h-3" />
                </div>
              </TableHead>
              <TableHead>Komite</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="text-right">İncele</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                </TableCell>
              </TableRow>
            ) : applications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Kriterlere uygun başvuru bulunamadı.
                </TableCell>
              </TableRow>
            ) : (
              applications.map((app) => {
                const details = Array.isArray(app.user.user_details) ? app.user.user_details[0] : app.user.user_details;
                const assignedCommittee = app.user.committee_members?.[0]?.committee;

                return (
                  <TableRow
                    key={app.id}
                    className="cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => router.push(`/admin/applications/${app.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={`https://avatar.vercel.sh/${app.user.email}`} />
                          <AvatarFallback>{app.user.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar >
                        <div>
                          <div className="font-medium text-foreground">{app.user.full_name}</div>
                          <div className="text-xs text-muted-foreground">{app.user.email}</div>
                        </div>
                      </div >
                    </TableCell >
                    <TableCell className="text-muted-foreground">{details?.school_name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(app.submitted_at).toLocaleDateString("tr-TR")}
                    </TableCell>
                    <TableCell>
                      {assignedCommittee ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="font-medium">{assignedCommittee.name}</span>
                        </div>
                      ) : app.status === 'approved' ? (
                        <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20 border-dashed">
                          Atama Bekleniyor
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(app.status)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/applications/${app.id}`} onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow >
                );
              })
            )}
          </TableBody >
        </Table >
        <div className="px-4 border-t border-border/50">
          <PaginationControls
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </div >
    </div >
  );
}

// Change Log:
// - Removed display of preferred committee in the table entirely.
// - If a committee is assigned, it displays the committee name.
// - If the status is 'approved' but no committee is assigned, it displays an "Atama Bekleniyor" badge.
// - For other statuses (pending, rejected) with no assignment, it displays a dash ("-").