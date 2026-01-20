"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, CheckCircle, XCircle, Clock, FileText, ArrowUpRight, User, ShieldCheck } from "lucide-react";
import { TableSkeleton } from "@/components/ui/skeleton-loader";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PaymentReviewDialog } from "@/components/admin/PaymentReviewDialog";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { StatusDistributionChart, UploadTrendChart } from "@/components/admin/PaymentCharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { PaymentStatusEnum } from "@/types/payment";

// Note: This page specifically lists *receipts* or *applications with payments*.
// Since exempt users don't upload receipts, they might not show up here depending on the API filter.
// However, the backend API (`GET /api/admin/payments`) fetches `payment_receipts`.
// Exempt users don't have receipts. So this page naturally filters them out unless we change the API
// to fetch `applications` instead. For now, we will stick to Receipt Management here.
// Exempt status is visible in the User List and User Detail pages.

interface PaymentRequest {
  id: string;
  user: {
    id: string;
    full_name: string;
    email: string;
  };
  reviewer?: {
    full_name: string;
  } | null;
  file_url: string;
  file_type: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  admin_note?: string;
}

export default function AdminPaymentsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-payments', page, statusFilter, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        status: statusFilter,
        search: debouncedSearch
      });
      const res = await fetch(`/api/admin/payments?${params}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-payments-stats'],
    queryFn: async () => {
        const res = await fetch("/api/admin/payments/stats");
        if (!res.ok) throw new Error("Failed");
        return res.json();
    }
  });

  const payments: PaymentRequest[] = data?.data || [];
  const totalPages = data?.meta?.totalPages || 1;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20"><CheckCircle className="w-3 h-3 mr-1"/> Ödendi</Badge>;
      case 'rejected': return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20"><XCircle className="w-3 h-3 mr-1"/> Reddedildi</Badge>;
      // Exempt won't usually appear in Receipt list, but just in case logic changes
      case 'exempt': return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20"><ShieldCheck className="w-3 h-3 mr-1"/> Muaf</Badge>;
      default: return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20"><Clock className="w-3 h-3 mr-1"/> Bekliyor</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20 max-w-[1600px] mx-auto">
      <Breadcrumbs items={[{ label: "Ödemeler" }]} />
      
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-display font-bold text-foreground">Ödeme Yönetimi</h2>
        <p className="text-muted-foreground text-lg">Finansal akış ve dekont kontrolleri.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {statsLoading ? (
            <>
                <Skeleton className="h-[400px] w-full rounded-xl" />
                <Skeleton className="h-[400px] w-full rounded-xl" />
            </>
        ) : (
            <>
                <StatusDistributionChart data={stats.stats} />
                <UploadTrendChart data={stats.trend} />
            </>
        )}
      </div>

      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Dekont Geçmişi
            </h3>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 bg-card p-4 rounded-xl border border-border/50 shadow-sm">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Kullanıcı adı veya e-posta ara..." className="pl-9 bg-background border-border/50 h-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[200px] bg-background border-border/50 h-10">
                    <div className="flex items-center gap-2"><Filter className="w-4 h-4" /><SelectValue placeholder="Durum Filtrele" /></div>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="pending">İncelenecekler</SelectItem>
                    <SelectItem value="all">Tüm Kayıtlar</SelectItem>
                    <SelectItem value="approved">Onaylananlar</SelectItem>
                    <SelectItem value="rejected">Reddedilenler</SelectItem>
                </SelectContent>
            </Select>
        </div>

        {isLoading ? <TableSkeleton rows={5} cols={6} /> : (
            <Card className="border-border/50 bg-card overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/30">
                    <TableRow>
                        <TableHead>Kullanıcı</TableHead>
                        <TableHead>Yükleme Tarihi</TableHead>
                        <TableHead>İnceleyen</TableHead>
                        <TableHead>Dosya</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead className="text-right">İşlem</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {payments.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="h-48 text-center text-muted-foreground">Kayıt bulunamadı.</TableCell></TableRow>
                    ) : (
                        payments.map((p) => (
                        <TableRow key={p.id} className="cursor-pointer hover:bg-muted/30 transition-colors group" onClick={() => setSelectedPaymentId(p.id)}>
                            <TableCell>
                                <div className="font-medium">{p.user.full_name}</div>
                                <div className="text-xs text-muted-foreground">{p.user.email}</div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">{new Date(p.created_at).toLocaleString('tr-TR')}</TableCell>
                            <TableCell><div className="flex items-center gap-2 text-sm text-muted-foreground">{p.reviewer ? <><User className="w-3.5 h-3.5" /> {p.reviewer.full_name}</> : "-" }</div></TableCell>
                            <TableCell><Badge variant="outline" className="text-[10px] uppercase">{p.file_type?.split('/')[1]}</Badge></TableCell>
                            <TableCell>{getStatusBadge(p.status)}</TableCell>
                            <TableCell className="text-right"><Button variant="ghost" size="sm" className="h-8">İncele <ArrowUpRight className="w-3.5 h-3.5 ml-2" /></Button></TableCell>
                        </TableRow>
                        ))
                    )}
                    </TableBody>
                </Table>
                {payments.length > 0 && <div className="border-t border-border/50 p-4 bg-muted/5"><PaginationControls currentPage={page} totalPages={totalPages} onPageChange={setPage} /></div>}
            </Card>
        )}
      </div>

      <PaymentReviewDialog paymentId={selectedPaymentId} open={!!selectedPaymentId} onOpenChange={(open) => !open && setSelectedPaymentId(null)} />
    </div>
  );
}

// Change Log:
// - Added 'exempt' case to `getStatusBadge` (just in case).