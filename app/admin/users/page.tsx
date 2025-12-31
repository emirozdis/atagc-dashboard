"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Search,
  Loader2,
  MoreHorizontal,
  ShieldAlert,
  ShieldCheck,
  Shield,
  Eye,
  Settings,
  ArrowUpDown
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import { User } from "@/types/user";
import { ManageUserDialog } from "@/components/admin/UserManagementDialog";

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Sort State
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'created_at',
    direction: 'desc'
  });

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Selection States for Dialogs
  const [manageUser, setManageUser] = useState<User | null>(null);
  const [isManageOpen, setIsManageOpen] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch when params change
  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter, debouncedSearch, sortConfig]);

  // Reset page
  useEffect(() => {
    setPage(1);
  }, [roleFilter, debouncedSearch]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        role: roleFilter,
        search: debouncedSearch,
        sort_by: sortConfig.key,
        sort_order: sortConfig.direction
      });

      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error("Failed");

      const responseData = await res.json();
      if (responseData.data) {
        setUsers(responseData.data);
        setTotalPages(responseData.meta.totalPages);
      } else {
        setUsers([]);
        setTotalPages(0);
      }
    } catch (error) {
      toast.error("Hata", { description: "Kullanıcılar yüklenemedi." });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleUpdate = async (userId: string, newRole: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, role: newRole }),
      });

      if (!res.ok) throw new Error("Failed");

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success("Rol Güncellendi");
    } catch (error) {
      toast.error("Hata", { description: "Rol güncellenemedi." });
    }
  };

  const handleToggleSuspend = async (userId: string, isSuspended: boolean) => {
    try {
        const res = await fetch("/api/admin/users", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: userId, is_suspended: isSuspended }),
        });

        if (!res.ok) throw new Error("Failed");

        setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_suspended: isSuspended } : u));
        toast.success(isSuspended ? "Kullanıcı Askıya Alındı" : "Kullanıcı Aktifleştirildi");
    } catch (error) {
        toast.error("Hata", { description: "İşlem başarısız." });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }

      setUsers(prev => prev.filter(u => u.id !== userId));
      setManageUser(null);
      setIsManageOpen(false);
      toast.success("Kullanıcı Silindi");
    } catch (error: any) {
      toast.error("Silinemedi", { description: error.message || "Bir hata oluştu." });
    }
  };

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "superadmin":
      case "admin":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20 gap-1">
            <ShieldAlert className="w-3 h-3" /> Yönetici
          </Badge>
        );
      case "committee_chairman":
        return (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border-purple-500/20 gap-1">
            <ShieldCheck className="w-3 h-3" /> Jüri/Başkan
          </Badge>
        );
      case "staff":
        return (
          <Badge variant="outline" className="bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-orange-500/20 gap-1">
            <Shield className="w-3 h-3" /> Personel
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20 gap-1">
            <Shield className="w-3 h-3" /> Katılımcı
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">Kullanıcılar</h2>
          <p className="text-muted-foreground mt-1">
            Sistemdeki tüm kayıtlı kullanıcılar ve yetkileri.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="İsim veya e-posta ara..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Rol Filtrele" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="superadmin">Yöneticiler</SelectItem>
            <SelectItem value="committee_chairman">Komite Başkanları</SelectItem>
            <SelectItem value="staff">Personel</SelectItem>
            <SelectItem value="applicant">Katılımcılar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border border-border/50 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer hover:text-foreground" onClick={() => handleSort('full_name')}>
                <div className="flex items-center gap-2">
                  Kullanıcı <ArrowUpDown className="w-3 h-3" />
                </div>
              </TableHead>
              <TableHead>Okul</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Kullanıcı bulunamadı.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow 
                    key={user.id} 
                    className={`cursor-pointer hover:bg-white/5 transition-colors ${user.is_suspended ? "bg-red-500/5 opacity-80" : ""}`}
                    onClick={() => router.push(`/admin/users/${user.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={`https://avatar.vercel.sh/${user.email}`} />
                        <AvatarFallback>{user.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-foreground flex items-center gap-2">
                            {user.full_name}
                            {user.is_suspended && <Badge variant="destructive" className="text-[10px] h-4 px-1">Askıda</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {(Array.isArray(user.user_details) ? user.user_details[0]?.school_name : user.user_details?.school_name) || "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {(Array.isArray(user.user_details) ? user.user_details[0]?.phone_number : user.user_details?.phone_number) || "-"}
                  </TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                router.push(`/admin/users/${user.id}`); 
                            }}
                            title="İncele"
                        >
                            <Eye className="w-4 h-4 text-muted-foreground hover:text-primary" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => { 
                                e.stopPropagation();
                                setManageUser(user); 
                                setIsManageOpen(true); 
                            }}
                            title="Yönet"
                        >
                            <Settings className="w-4 h-4 text-muted-foreground hover:text-primary" />
                        </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
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
      </div>

      <ManageUserDialog 
        user={manageUser}
        open={isManageOpen}
        onOpenChange={setIsManageOpen}
        onUpdateRole={handleRoleUpdate}
        onToggleSuspend={handleToggleSuspend}
        onDelete={handleDeleteUser}
      />
    </div>
  );
}