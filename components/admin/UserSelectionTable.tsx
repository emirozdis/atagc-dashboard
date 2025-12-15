"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Search, Loader2, X, Filter, UserPlus, Users, UserMinus } from "lucide-react";
import { User } from "@/types/user";
import { toast } from "sonner";

interface UserSelectionTableProps {
  selectedUsers: string[]; // Array of User IDs
  onSelectionChange: (ids: string[]) => void;
}

export function UserSelectionTable({ selectedUsers, onSelectionChange }: UserSelectionTableProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Filter State
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState("all");

  // Cache user details for display chips
  const [selectedUserDetails, setSelectedUserDetails] = useState<Map<string, string>>(new Map());

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on search change
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch Users for Table
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          role: role,
          search: debouncedSearch,
          sort_by: "full_name",
          sort_order: "asc"
        });

        const res = await fetch(`/api/admin/users?${params}`);
        if (res.ok) {
          const json = await res.json();
          setUsers(json.data || []);
          setTotalPages(json.meta.totalPages || 1);
        }
      } catch (e) {
        console.error("Failed to fetch users", e);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [page, role, debouncedSearch]);

  // Update User Details Cache efficiently to prevent infinite loops
  useEffect(() => {
    if (users.length === 0) return;

    setSelectedUserDetails(prev => {
      let hasNew = false;
      users.forEach(u => {
        if (selectedUsers.includes(u.id) && !prev.has(u.id)) {
          hasNew = true;
        }
      });

      if (!hasNew) return prev; // Return same reference to avoid re-render

      const next = new Map(prev);
      users.forEach(u => {
        if (selectedUsers.includes(u.id) && !next.has(u.id)) {
          next.set(u.id, u.full_name);
        }
      });
      return next;
    });
  }, [users, selectedUsers]);

  const toggleUser = (user: User) => {
    const isSelected = selectedUsers.includes(user.id);
    let newSelected;

    if (isSelected) {
      newSelected = selectedUsers.filter(id => id !== user.id);
    } else {
      newSelected = [...selectedUsers, user.id];
      // Optimistically update details for immediate feedback
      setSelectedUserDetails(prev => {
        const next = new Map(prev);
        next.set(user.id, user.full_name);
        return next;
      });
    }
    onSelectionChange(newSelected);
  };

  const removeUser = (id: string) => {
    onSelectionChange(selectedUsers.filter(uid => uid !== id));
  };

  const handleSelectAllOnPage = () => {
    const pageUserIds = users.map(u => u.id);
    // Add ones that aren't already selected
    const toAdd = pageUserIds.filter(id => !selectedUsers.includes(id));
    if (toAdd.length > 0) {
      onSelectionChange([...selectedUsers, ...toAdd]);
      // Update details cache
      setSelectedUserDetails(prev => {
        const next = new Map(prev);
        users.forEach(u => next.set(u.id, u.full_name));
        return next;
      });
    }
  };

  const handleDeselectAllOnPage = () => {
    const pageUserIds = users.map(u => u.id);
    onSelectionChange(selectedUsers.filter(id => !pageUserIds.includes(id)));
  };

  // Bulk Select Helper
  const handleBulkAddByRole = async (targetRole: string) => {
    const toastId = toast.loading("Kullanıcılar ekleniyor...");
    try {
      const res = await fetch(`/api/admin/users/ids?role=${targetRole}`);
      if (!res.ok) throw new Error("Failed");
      const ids: string[] = await res.json();

      // Merge unique
      const newSet = new Set([...selectedUsers, ...ids]);
      onSelectionChange(Array.from(newSet));
      toast.success(`${ids.length} kullanıcı eklendi`, { id: toastId });
    } catch (e) {
      toast.error("Hata oluştu", { id: toastId });
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'applicant': return 'Katılımcı';
      case 'committee_chairman': return 'Başkan';
      case 'superadmin': return 'Admin';
      case 'staff': return 'Personel';
      default: return role;
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls & Filters */}
      <div className="flex flex-col gap-4 bg-secondary/10 p-4 rounded-lg border border-border/50">
        <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Kullanıcı Seçimi
            {selectedUsers.length > 0 && <Badge variant="secondary" className="ml-2">{selectedUsers.length} Seçildi</Badge>}
          </h4>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleBulkAddByRole('all')} className="h-8 text-xs">
              <UserPlus className="w-3 h-3 mr-1" /> Tümünü Ekle
            </Button>
            <Button variant="outline" size="sm" onClick={() => onSelectionChange([])} disabled={selectedUsers.length === 0} className="h-8 text-xs text-destructive hover:text-destructive">
              <UserMinus className="w-3 h-3 mr-1" /> Temizle
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="İsim veya e-posta ara..."
              className="pl-9 h-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={role} onValueChange={(val) => { setRole(val); setPage(1); }}>
            <SelectTrigger className="w-full md:w-[180px] h-9">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <SelectValue placeholder="Rol Filtrele" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Roller</SelectItem>
              <SelectItem value="applicant">Katılımcılar</SelectItem>
              <SelectItem value="committee_chairman">Komite Başkanları</SelectItem>
              <SelectItem value="staff">Personel</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleSelectAllOnPage} className="text-xs h-7 px-2">
            Bu sayfadakileri seç
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDeselectAllOnPage} className="text-xs h-7 px-2">
            Bu sayfadakileri kaldır
          </Button>
        </div>
      </div>

      {/* Selected Chips Preview (First 20) */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-background border rounded-lg min-h-[40px] max-h-[120px] overflow-y-auto">
          {selectedUsers.slice(0, 20).map(id => (
            <Badge key={id} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1 group">
              <span>{selectedUserDetails.get(id) || "Kullanıcı"}</span>
              <button
                onClick={() => removeUser(id)}
                className="hover:bg-destructive/20 rounded-full p-0.5 transition-colors opacity-50 group-hover:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {selectedUsers.length > 20 && (
            <Badge variant="outline" className="text-muted-foreground">+{selectedUsers.length - 20} diğer</Badge>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border border-border/50 bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] text-center">
                #
              </TableHead>
              <TableHead>Kullanıcı</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Okul</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="animate-spin w-6 h-6 text-primary" />
                    <span className="text-xs">Yükleniyor...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  Kriterlere uygun kullanıcı bulunamadı.
                </TableCell>
              </TableRow>
            ) : (
              users.map(user => {
                const isSelected = selectedUsers.includes(user.id);
                return (
                  <TableRow
                    key={user.id}
                    className={`cursor-pointer transition-colors ${isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-white/5"}`}
                    onClick={() => toggleUser(user)}
                  >
                    <TableCell className="text-center">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleUser(user)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8 border border-white/10">
                          <AvatarImage src={`https://avatar.vercel.sh/${user.email}`} />
                          <AvatarFallback>{user.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm text-foreground">{user.full_name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal capitalize bg-secondary/10">
                        {getRoleBadge(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(Array.isArray(user.user_details) ? user.user_details[0]?.school_name : user.user_details?.school_name) || "-"}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
        <div className="border-t border-border/50 px-4 py-2 bg-muted/10">
          <PaginationControls
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}