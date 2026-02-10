"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, MessageSquare, ArrowRight, ShieldQuestion } from "lucide-react";
import { TicketForm } from "@/components/tickets/TicketForm";
import { TicketDetailView } from "@/components/tickets/TicketDetailView";
import { Ticket, TICKET_STATUSES, TICKET_CATEGORIES } from "@/types/ticket";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TableSkeleton } from "@/components/ui/skeleton-loader";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger
} from "@/components/ui/dialog";

export default function DashboardTicketsPage() {
    const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [anonymousToken, setAnonymousToken] = useState<string | undefined>(undefined);

    // Pagination State
    const [page, setPage] = useState(1);

    // Tracking State
    const [trackId, setTrackId] = useState("");
    const [trackToken, setTrackToken] = useState("");
    const [trackDialogOpen, setTrackDialogOpen] = useState(false);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['my-tickets', page],
        queryFn: async () => {
            const res = await fetch(`/api/tickets?page=${page}&limit=10`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        }
    });

    const tickets: Ticket[] = data?.data || [];
    const meta = data?.meta;

    const handleOpen = (id: string) => {
        setSelectedId(id);
        setAnonymousToken(undefined);
        setView('detail');
    };

    const handleTrackSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!trackId || !trackToken) {
            toast.error("Lütfen Ticket ID ve Access Token giriniz.");
            return;
        }

        try {
            const res = await fetch(`/api/tickets?trackId=${trackId}&trackToken=${trackToken}`);
            if (res.ok) {
                const data = await res.json();
                setSelectedId(data.id);
                setAnonymousToken(trackToken);
                setView('detail');
                setTrackDialogOpen(false);
            } else {
                toast.error("Bildirim bulunamadı veya bilgiler hatalı.");
            }
        } catch (error) {
            toast.error("Bir hata oluştu.");
        }
    };

    const handleCreateSuccess = () => {
        setView('list');
        setPage(1);
        refetch();
    };

    return (
        <div className={cn("max-w-7xl mx-auto", view !== 'detail' && "pb-12")}>
            {/* Header Section */}
            <div className={cn(
                "pb-6 mb-2",
                (view === 'detail' || view === 'create') && "hidden"
            )}>
                <Breadcrumbs items={[{ label: "Destek & Bildirim" }]} />

                {view === 'list' && (
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mt-4">
                        <div>
                            <h2 className="text-3xl font-display font-bold text-foreground tracking-tight">Destek Merkezi</h2>
                            <p className="text-muted-foreground mt-1">
                                Geri bildirimlerinizi yönetin veya anonim bir bildirimi sorgulayın.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                            <Dialog open={trackDialogOpen} onOpenChange={setTrackDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="shrink-0 flex-1 sm:flex-none sm:min-w-[140px] h-10 border-border bg-card hover:bg-muted/50 transition-colors">
                                        <ShieldQuestion className="w-4 h-4 mr-2" /> Anonim Takip
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md bg-card border-border shadow-xl">
                                    <DialogHeader>
                                        <DialogTitle className="text-xl">Anonim Bildirim Takibi</DialogTitle>
                                        <DialogDescription>
                                            Size verilen takip numarasını ve erişim anahtarını girerek bildiriminizi sorgulayın.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleTrackSubmit} className="space-y-4 pt-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-foreground">Takip Numarası (Ticket ID)</label>
                                            <Input
                                                placeholder="xxxxxxxx-xxxx-..."
                                                className="font-mono text-sm bg-background"
                                                value={trackId}
                                                onChange={e => setTrackId(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-foreground">Erişim Anahtarı (Access Token)</label>
                                            <Input
                                                type="password"
                                                placeholder="Gizli Anahtar Kodunuz"
                                                className="font-mono text-sm bg-background"
                                                value={trackToken}
                                                onChange={e => setTrackToken(e.target.value)}
                                            />
                                        </div>
                                        <Button type="submit" className="w-full mt-2 h-11">
                                            Sorgula <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </form>
                                </DialogContent>
                            </Dialog>
                            <Button onClick={() => setView('create')} className="shrink-0 flex-1 sm:flex-none sm:min-w-[140px] shadow-md h-10">
                                <Plus className="w-4 h-4 mr-2" /> Yeni Bildirim
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {view === 'list' && (
                <div className="space-y-6">
                    <Card className="border-border/50 shadow-sm overflow-hidden bg-card">
                        <CardContent className="p-0">
                            {isLoading ? (
                                <TableSkeleton cols={4} rows={10} mobileCards={false} showTitle={false} />
                            ) : tickets.length === 0 ? (
                                <div className="text-center py-24 text-muted-foreground px-4 bg-muted/5">
                                    <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-border/40">
                                        <MessageSquare className="w-10 h-10 opacity-40 text-primary" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2 text-foreground">Henüz Kayıt Yok</h3>
                                    <p className="text-sm max-w-xs mx-auto leading-relaxed">
                                        Hesabınızla oluşturduğunuz bildirimler burada listelenir.
                                    </p>
                                    <Button variant="outline" onClick={() => setView('create')} className="mt-8 border-primary/20 hover:bg-primary/5">
                                        İlk Bildirimi Oluştur
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-muted/40">
                                                <TableRow className="hover:bg-transparent border-b-border/60">
                                                    <TableHead className="font-semibold text-foreground py-4">Konu</TableHead>
                                                    <TableHead className="font-semibold text-foreground">Kategori</TableHead>
                                                    <TableHead className="font-semibold text-foreground">Durum</TableHead>
                                                    <TableHead className="text-right font-semibold text-foreground">Tarih</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {tickets.map(t => {
                                                    const status = TICKET_STATUSES.find(s => s.value === t.status);
                                                    const cat = TICKET_CATEGORIES.find(c => c.value === t.category);
                                                    return (
                                                        <TableRow 
                                                            key={t.id} 
                                                            className="cursor-pointer hover:bg-muted/30 transition-colors border-b-border/40" 
                                                            onClick={() => handleOpen(t.id)}
                                                        >
                                                            <TableCell className="font-medium text-foreground max-w-[200px] truncate py-4">
                                                                {t.subject}
                                                            </TableCell>
                                                            <TableCell className="text-muted-foreground text-xs font-medium">
                                                                {cat?.label}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className={cn("text-[10px] px-2.5 h-5 font-bold uppercase tracking-wider", status?.color)}>
                                                                    {status?.label}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-muted-foreground text-[11px] text-right font-mono">
                                                                {new Date(t.created_at).toLocaleDateString('tr-TR')}
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    {meta && meta.totalPages > 1 && (
                                        <div className="p-4 border-t border-border/40">
                                            <PaginationControls 
                                                currentPage={page} 
                                                totalPages={meta.totalPages} 
                                                onPageChange={setPage} 
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {view === 'create' && (
                <div className="space-y-6 max-w-3xl mx-auto">
                    <div className="flex flex-col space-y-4 mb-8">
                        <Button variant="ghost" onClick={() => setView('list')} className="w-fit pl-0 hover:bg-transparent hover:text-primary transition-colors">
                            ← Listeye Geri Dön
                        </Button>
                    </div>
                    <TicketForm isLoggedIn={true} onSubmitSuccess={handleCreateSuccess} />
                </div>
            )}

            {view === 'detail' && selectedId && (
                <div>
                    <TicketDetailView
                        ticketId={selectedId}
                        accessToken={anonymousToken}
                        onBack={() => {
                            setSelectedId(null);
                            setAnonymousToken(undefined);
                            setView('list');
                            refetch();
                        }}
                    />
                </div>
            )}
        </div>
    );
}