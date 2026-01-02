"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Search, Trash2, CheckCircle, MoreHorizontal, UserCog } from "lucide-react";
import { TableSkeleton } from "@/components/ui/skeleton-loader";
import { toast } from "sonner";
import { User } from "@/types/user";
import { useRouter } from "next/navigation";

interface UserSelectionTableProps {
  selectedUsers?: string[]; // Optional external control
  onSelectionChange?: (ids: string[]) => void;
}

export function UserSelectionTable({ selectedUsers: externalSelected, onSelectionChange }: UserSelectionTableProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [internalSelected, setInternalSelected] = useState<string[]>([]);
  
  // Determine if controlled or uncontrolled
  const isControlled = externalSelected !== undefined;
  const selectedIds = isControlled ? externalSelected : internalSelected;
  
  const handleSelectionChange = (newIds: string[]) => {
    if (isControlled && onSelectionChange) {
      onSelectionChange(newIds);
    } else {
      setInternalSelected(newIds);
    }
  };

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const limit = 10;

  // React Query Fetch
  const { data, isLoading } = useQuery({
    queryKey: ["users", page, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: search,
        sort_by: "created_at",
        sort_order: "desc"
      });
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    placeholderData: (prev) => prev
  });

  const users: User[] = data?.data || [];
  const totalPages = data?.meta?.totalPages || 1;

  // Batch Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
      }
    },
    onSuccess: () => {
      toast.success(`${selectedIds.length} kullanıcı silindi`);
      handleSelectionChange([]);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: () => {
      toast.error("Silme işlemi başarısız oldu.");
    }
  });

  const toggleUser = (id: string) => {
    if (selectedIds.includes(id)) {
      handleSelectionChange(selectedIds.filter(x => x !== id));
    } else {
      handleSelectionChange([...selectedIds, id]);
    }
  };

  const toggleAll = () => {
    const pageIds = users.map(u => u.id);
    const allSelected = pageIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      handleSelectionChange(selectedIds.filter(id => !pageIds.includes(id)));
    } else {
      const unique = new Set([...selectedIds, ...pageIds]);
      handleSelectionChange(Array.from(unique));
    }
  };

  const handleDelete = () => {
    if (confirm(`Seçili ${selectedIds.length} kullanıcıyı silmek istediğinize emin misiniz?`)) {
      deleteMutation.mutate(selectedIds);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Kullanıcı ara..."
            className="pl-9"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border/50 bg-card overflow-hidden">
        {isLoading ? <TableSkeleton rows={5} /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] text-center">
                  <Checkbox 
                    checked={users.length > 0 && users.every(u => selectedIds.includes(u.id))}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Kullanıcı</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Kullanıcı bulunamadı.
                  </TableCell>
                </TableRow>
              ) : (
                users.map(user => (
                  <TableRow 
                    key={user.id} 
                    className={`cursor-pointer transition-colors ${selectedIds.includes(user.id) ? "bg-muted/50" : "hover:bg-muted/30"}`}
                    onClick={() => toggleUser(user.id)}
                  >
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <Checkbox 
                        checked={selectedIds.includes(user.id)}
                        onCheckedChange={() => toggleUser(user.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={`https://avatar.vercel.sh/${user.email}`} />
                          <AvatarFallback>{user.full_name.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{user.full_name}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize bg-secondary/50">
                        {user.role === 'committee_chairman' ? 'Başkan' : user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.is_suspended ? 
                        <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Askıda</Badge> : 
                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-green-500/10 text-green-600 hover:bg-green-500/20">Aktif</Badge>
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/users/${user.id}`);
                        }}
                      >
                        <UserCog className="w-4 h-4 text-muted-foreground hover:text-primary" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
        <div className="px-4 py-2 border-t border-border/50">
          <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>

      {/* Batch Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background px-6 py-3 rounded-full shadow-xl flex items-center gap-4 animate-in slide-in-from-bottom-10 z-50">
          <span className="font-bold text-sm whitespace-nowrap">{selectedIds.length} Seçildi</span>
          <div className="h-4 w-px bg-background/20" />
          <Button 
            size="sm" 
            variant="ghost" 
            disabled={deleteMutation.isPending}
            className="text-red-400 hover:text-red-300 hover:bg-white/10 h-8"
            onClick={handleDelete}
          >
            {deleteMutation.isPending ? (
              "Siliniyor..."
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" /> Sil
              </>
            )}
          </Button>
          <Button 
            size="sm" 
            variant="secondary" 
            className="text-black bg-white hover:bg-white/90 h-8"
            onClick={() => handleSelectionChange([])}
          >
            Vazgeç
          </Button>
        </div>
      )}
    </div>
  );
}

// Change Log:
// - Added `onClick` to `TableRow` to toggle selection, improving usability.
// - Implemented proper Controlled vs Uncontrolled logic for `selectedIds`.
// - Added `e.stopPropagation()` to Checkbox cell and Action button to prevent double-toggling.
// - Fixed the `UsersPage` issue by properly handling internal state when no props are passed.