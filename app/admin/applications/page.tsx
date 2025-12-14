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
} from "lucide-react";
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
import {
  KOMITE_OPTIONS,
} from "@/types/application";
import { useRouter } from "next/navigation";

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

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
      toast.error("Hata", { description: "Başvuru listesi yüklenemedi." });
    } finally {
      setLoading(false);
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

  const getLabel = (value: string, options: { value: string, label: string }[]) => {
    return options.find(o => o.value === value)?.label || value;
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

      <div className="rounded-md border border-border/50 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Başvuran</TableHead>
              <TableHead>Okul</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead>Komite Tercihi</TableHead>
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
            ) : filteredApplications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Kriterlere uygun başvuru bulunamadı.
                </TableCell>
              </TableRow>
            ) : (
              filteredApplications.map((app) => {
                const details = Array.isArray(app.user.user_details) ? app.user.user_details[0] : app.user.user_details;
                const info = details?.additional_info || {};

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
                      <span className="text-sm">{getLabel(info.committee_pref_1, KOMITE_OPTIONS)}</span>
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
      </div >
    </div >
  );
}
