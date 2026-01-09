"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, QrCode, Calendar, BarChart, MoreVertical, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateRollCallDialog } from "@/components/admin/CreateRollCallDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { TableSkeleton } from "@/components/ui/skeleton-loader";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

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

export default function AdminRollCallsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-roll-calls', page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      const res = await fetch(`/api/admin/roll-calls?${params}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    placeholderData: (prev) => prev
  });

  const rollCalls: RollCall[] = data?.data || [];
  const totalPages = data?.meta?.totalPages || 1;

  const renderMobileCard = (rc: RollCall) => {
    const attendedCount = rc.roll_call_logs?.[0]?.count || 0;
    // Handle the case where committee might be null or members array is empty
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
                {new Date(rc.created_at).toLocaleString("tr-TR", { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            </div>

            <Badge variant="outline" className={`${ratio === 100 ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-secondary text-secondary-foreground'}`}>
              %{ratio}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-secondary/10 p-3 rounded-lg border border-border/50">
              <div className="text-xs text-muted-foreground mb-1">Komite</div>
              <div className="font-medium text-sm truncate">{rc.committee?.name || "Bilinmiyor"}</div>
            </div>
            <div className="bg-secondary/10 p-3 rounded-lg border border-border/50">
              <div className="text-xs text-muted-foreground mb-1">Katılım</div>
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
    <div className="space-y-6 animate-fade-in">
      <Breadcrumbs items={[{ label: "Yoklama" }]} />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">Yoklamalar</h2>
          <p className="text-muted-foreground mt-1">
            Tüm komitelerin yoklama geçmişi ve anlık durumları.
          </p>
        </div>
        <CreateRollCallDialog onSuccess={refetch} />
      </div>

      <Card className="bg-card border-border/50 bg-transparent shadow-none border-none">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={5} cols={5} /></div>
          ) : rollCalls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border rounded-xl bg-card">
              <BarChart className="w-12 h-12 opacity-20 mb-3" />
              <p>Henüz yoklama kaydı bulunmuyor.</p>
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="block md:hidden">
                {rollCalls.map(renderMobileCard)}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block rounded-xl border border-border/50 bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Oturum</TableHead>
                      <TableHead>Komite</TableHead>
                      <TableHead>Tarih</TableHead>
                      <TableHead>Katılım / Toplam</TableHead>
                      <TableHead>Oran</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rollCalls.map((rc) => {
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
                          <TableCell>{rc.committee?.name || "Bilinmiyor"}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(rc.created_at).toLocaleString("tr-TR", { dateStyle: 'medium', timeStyle: 'short' })}
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
// - Added mobile responsive view (Cards).
// - Hid Table on mobile.
// - Fixed safe access to nested objects (`rc.committee?.committee_members?.[0]?.count`) to prevent crashes if committee is null.