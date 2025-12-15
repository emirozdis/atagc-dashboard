"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Users, QrCode } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateRollCallDialog } from "@/components/admin/CreateRollCallDialog";
import { Badge } from "@/components/ui/badge";
import { PaginationControls } from "@/components/ui/pagination-controls";

interface RollCall {
  id: string;
  session_name: string;
  created_at: string;
  committee: { 
    name: string;
    committee_members: { count: number }[]; 
  };
  roll_call_logs: { count: number }[];
}

export default function AdminRollCallsPage() {
  const [rollCalls, setRollCalls] = useState<RollCall[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const fetchRollCalls = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const res = await fetch(`/api/admin/roll-calls?${params}`);
      if (res.ok) {
        const responseData = await res.json();
        setRollCalls(responseData.data || []);
        setTotalPages(responseData.meta.totalPages || 1);
      }
    } catch (e) {
      toast.error("Hata", { description: "Yoklamalar yüklenemedi." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRollCalls();
  }, [page]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">Yoklamalar</h2>
          <p className="text-muted-foreground mt-1">
            Tüm komitelerin yoklama geçmişi ve anlık durumları.
          </p>
        </div>
        <CreateRollCallDialog onSuccess={fetchRollCalls} />
      </div>

      <Card className="bg-card border-border/50">
        <CardContent className="p-0">
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
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : rollCalls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Henüz yoklama kaydı bulunmuyor.
                  </TableCell>
                </TableRow>
              ) : (
                rollCalls.map((rc) => {
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
                        <Badge variant="secondary" className={`gap-1.5 font-mono ${ratio === 100 ? 'bg-green-500/10 text-green-500' : ''}`}>
                          %{ratio}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          <div className="px-4 border-t border-border/50">
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
// - Added PaginationControls and state (page, totalPages).
// - Updated Table columns to display "Attended / Total" and "Ratio (%)".
// - Updated data processing to handle the new API response structure with nested committee counts.