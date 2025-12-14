"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Loader2,
  MoreHorizontal
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// Types updated to UUID strings
interface Application {
  id: string;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
  review_notes?: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    user_details: {
      phone_number: string;
      school_name: string;
      birth_date: string;
      additional_info: any;
    } | {
      phone_number: string;
      school_name: string;
      birth_date: string;
      additional_info: any;
    }[];
  };
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionMode, setRejectionMode] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/applications");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setApplications(data);
    } catch (error) {
      toast.error("Hata", { description: "Başvurular yüklenemedi." });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: "approved" | "rejected", notes?: string) => {
    try {
      setActionLoading(id);
      const res = await fetch("/api/applications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, review_notes: notes }),
      });

      if (!res.ok) throw new Error("Update failed");

      toast.success("İşlem Başarılı", {
        description: `Başvuru ${status === "approved" ? "onaylandı" : "reddedildi"}.`,
      });

      setApplications(apps =>
        apps.map(app => app.id === id ? { ...app, status, review_notes: notes } : app)
      );

      setRejectionMode(null);
      setRejectionReason("");
    } catch (error) {
      toast.error("Hata", { description: "Durum güncellenemedi." });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredApplications = applications.filter(app => {
    const matchesStatus = filterStatus === "all" || app.status === filterStatus;
    const searchLower = searchQuery.toLowerCase();
    const userDetails = Array.isArray(app.user.user_details) ? app.user.user_details[0] : app.user.user_details;

    const matchesSearch =
      app.user.full_name.toLowerCase().includes(searchLower) ||
      app.user.email.toLowerCase().includes(searchLower) ||
      (userDetails?.school_name || "").toLowerCase().includes(searchLower);

    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">Onaylandı</span>;
      case "rejected":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">Reddedildi</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">Bekliyor</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">Başvurular</h2>
          <p className="text-muted-foreground mt-1">
            Toplam {applications.length} başvuru alındı.
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

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredApplications.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card/30">
              <p className="text-muted-foreground">Kriterlere uygun başvuru bulunamadı.</p>
            </div>
          ) : (
            filteredApplications.map((app) => {
              const details = Array.isArray(app.user.user_details) ? app.user.user_details[0] : app.user.user_details;
              const info = details?.additional_info || {};
              const isExpanded = expandedAppId === app.id;

              return (
                <Card key={app.id} className={`bg-card/50 border-border/50 transition-all ${isExpanded ? 'ring-1 ring-primary/20' : ''}`}>
                  <CardHeader className="cursor-pointer hover:bg-secondary/30 transition-colors rounded-t-xl" onClick={() => setExpandedAppId(isExpanded ? null : app.id)}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarImage src={`https://avatar.vercel.sh/${app.user.email}`} />
                          <AvatarFallback>{app.user.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base font-semibold">{app.user.full_name}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <span>{details?.school_name}</span>
                            <span className="hidden md:inline">•</span>
                            <span className="text-xs">{new Date(app.submitted_at).toLocaleDateString("tr-TR")}</span>
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto">
                        <div className="flex flex-col md:items-end gap-1">
                          {getStatusBadge(app.status)}
                          <span className="text-xs text-muted-foreground">
                            {info.committee_pref_1 === "genel-kurul" && "BM Genel Kurulu"}
                            {info.committee_pref_1 === "guvenlik" && "Güvenlik Konseyi"}
                            {info.committee_pref_1 === "ekonomik-sosyal" && "Ekonomik ve Sosyal K."}
                            {info.committee_pref_1 === "insan-haklari" && "İnsan Hakları"}
                            {info.committee_pref_1 === "tarihi" && "Tarihî Komite"}
                          </span>
                        </div>
                        <Button variant="ghost" size="icon" className="shrink-0">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-6 border-t border-border/50 bg-secondary/5">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <div>
                            <h4 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                              Kişisel Bilgiler
                            </h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground block text-xs">E-posta</span>
                                <span className="font-medium">{app.user.email}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block text-xs">Telefon</span>
                                <span className="font-medium">{details?.phone_number}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block text-xs">Sınıf</span>
                                <span className="font-medium">{info.grade}. Sınıf</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block text-xs">Şehir</span>
                                <span className="font-medium">{info.city}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div>
                            <h4 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                              Motivasyon Mektubu
                            </h4>
                            <div className="space-y-4 text-sm">
                              <div>
                                <span className="text-muted-foreground block text-xs mb-1">Katılım Nedeni</span>
                                <p className="text-foreground/80 leading-relaxed bg-background/50 p-3 rounded border border-border/50 text-xs md:text-sm">
                                  {info.reason_for_joining}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 pt-6 border-t border-border/50 flex flex-col md:flex-row md:justify-end gap-4 items-center">
                        {rejectionMode === app.id ? (
                          <div className="w-full md:w-1/2 flex flex-col gap-2 animate-in slide-in-from-right-2 fade-in">
                            <Label htmlFor="reason">Reddetme Nedeni</Label>
                            <Textarea
                              id="reason"
                              placeholder="Lütfen reddetme sebebini açıklayınız..."
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              className="min-h-[80px]"
                            />
                            <div className="flex justify-end gap-2 mt-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setRejectionMode(null); setRejectionReason(""); }}
                                disabled={actionLoading === app.id}
                              >
                                İptal
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleStatusUpdate(app.id, "rejected", rejectionReason)}
                                disabled={!rejectionReason.trim() || actionLoading === app.id}
                              >
                                {actionLoading === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reddet ve Gönder"}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {app.review_notes && (
                              <div className="mr-auto text-sm text-muted-foreground">
                                <span className="font-semibold text-destructive">Red Nedeni:</span> {app.review_notes}
                              </div>
                            )}

                            <div className="flex gap-2 w-full md:w-auto">
                              {app.status !== "rejected" && (
                                <Button
                                  variant="outline"
                                  className="flex-1 md:flex-none border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => setRejectionMode(app.id)}
                                  disabled={actionLoading === app.id}
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Reddet
                                </Button>
                              )}

                              {app.status !== "approved" && (
                                <Button
                                  className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => handleStatusUpdate(app.id, "approved")}
                                  disabled={actionLoading === app.id}
                                >
                                  {actionLoading === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                    <>
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Onayla
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}