"use client";

import { useState, useEffect } from "react";
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
import { Search, Trash2, Shield, UserCog, Filter, ArrowUpDown, X, ListFilter } from "lucide-react";
import { TableSkeleton } from "@/components/ui/skeleton-loader";
import { toast } from "sonner";
import { User } from "@/types/user";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface UserSelectionTableProps {
  selectedUsers?: string[]; 
  onSelectionChange?: (ids: string[]) => void;
}

export function UserSelectionTable({ selectedUsers: externalSelected, onSelectionChange }: UserSelectionTableProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [internalSelected, setInternalSelected] = useState<string[]>([]);
  
  const isControlled = externalSelected !== undefined;
  const selectedIds = isControlled ? externalSelected : internalSelected;
  
  const handleSelectionChange = (newIds: string[]) => {
    if (isControlled && onSelectionChange) {
      onSelectionChange(newIds);
    } else {
      setInternalSelected(newIds);
    }
  };

  // Filter States
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  const limit = 10;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedSearch(search);
        setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // React Query Fetch
  const { data, isLoading } = useQuery({
    queryKey: ["users", page, debouncedSearch, roleFilter, statusFilter, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: debouncedSearch,
        role: roleFilter,
        status: statusFilter,
        sort_by: sortBy,
        sort_order: sortOrder
      });
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    placeholderData: (prev) => prev
  });

  const users: User[] = data?.data || [];
  const totalPages = data?.meta?.totalPages || 1;

  // Mutations
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
    onError: () => toast.error("Silme işlemi başarısız oldu.")
  });

  const roleMutation = useMutation({
    mutationFn: async ({ ids, role }: { ids: string[], role: string }) => {
        const res = await fetch("/api/admin/users", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids, role }),
        });
        if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
        toast.success("Roller güncellendi");
        handleSelectionChange([]);
        queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: () => toast.error("Rol güncelleme başarısız.")
  });

  // Handlers
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

  const handleBatchRole = (role: string) => {
    if (confirm(`Seçili ${selectedIds.length} kullanıcının rolünü "${role}" olarak değiştirmek istiyor musunuz?`)) {
        roleMutation.mutate({ ids: selectedIds, role });
    }
  };

  const resetFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
    setSortBy("created_at");
    setSortOrder("desc");
    setPage(1);
  };

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'committee_chairman': return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 whitespace-nowrap">Başkan</Badge>;
      case 'admin': return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 whitespace-nowrap">Yönetici</Badge>;
      case 'superadmin': return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 whitespace-nowrap">Süper Admin</Badge>;
      case 'staff': return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 whitespace-nowrap">Personel</Badge>;
      default: return <Badge variant="outline" className="bg-secondary/50 whitespace-nowrap">Katılımcı</Badge>;
    }
  };

  // Mobile User Card Component
  const MobileUserCard = ({ user }: { user: User }) => (
    <div 
      className={`p-4 border-b border-border/50 last:border-0 transition-colors ${selectedIds.includes(user.id) ? "bg-muted/30" : ""}`}
      onClick={() => toggleUser(user.id)}
    >
      <div className="flex items-start gap-3 w-full">
        <div className="pt-1" onClick={(e) => e.stopPropagation()}>
          <Checkbox 
            checked={selectedIds.includes(user.id)}
            onCheckedChange={() => toggleUser(user.id)}
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2 mb-2">
            <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
              <Avatar className="h-9 w-9 shrink-0 border border-border/50">
                <AvatarImage src={`https://avatar.vercel.sh/${user.email}`} />
                <AvatarFallback>{user.full_name.substring(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-sm leading-tight truncate pr-1">{user.full_name}</span>
                <span className="text-xs text-muted-foreground truncate opacity-90">{user.email}</span>
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-secondary/50"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/admin/users/${user.id}`);
              }}
            >
              <UserCog className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {getRoleBadge(user.role)}
            {user.is_suspended ? 
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Askıda</Badge> : 
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-green-500/10 text-green-600 hover:bg-green-500/20">Aktif</Badge>
            }
            <span className="text-[10px] text-muted-foreground ml-auto whitespace-nowrap">
                {new Date(user.created_at).toLocaleDateString("tr-TR")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const hasActiveFilters = roleFilter !== "all" || statusFilter !== "all" || search !== "";

  return (
    <div className="space-y-4">
      {/* Responsive Filter Bar */}
      <div className="flex flex-col xl:flex-row gap-3 px-4 md:px-0 pt-4 md:pt-0">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="İsim veya e-posta ile ara..."
            className="pl-9 h-10 w-full"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap gap-2 items-center">
            
            {/* Mobile Select All Toggle (Only visible on mobile) */}
            <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleAll}
                className="md:hidden h-10 px-3"
            >
                {users.length > 0 && users.every(u => selectedIds.includes(u.id)) ? "Seçimi Kaldır" : "Tümü"}
            </Button>

            {/* Role Filter */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[130px] h-10">
                    <SelectValue placeholder="Rol" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Tüm Roller</SelectItem>
                    <SelectItem value="applicant">Katılımcı</SelectItem>
                    <SelectItem value="committee_chairman">Başkan</SelectItem>
                    <SelectItem value="staff">Personel</SelectItem>
                    <SelectItem value="admin">Yönetici</SelectItem>
                </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] h-10">
                    <SelectValue placeholder="Durum" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="suspended">Askıda</SelectItem>
                </SelectContent>
            </Select>

            {/* Sort Popover */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="h-10 px-3 gap-2" title="Sıralama">
                        <ArrowUpDown className="w-4 h-4" />
                        <span className="hidden sm:inline">Sırala</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="end">
                    <div className="space-y-1">
                        <div className="text-xs font-semibold text-muted-foreground px-2 py-1">Sıralama Kriteri</div>
                        <Button variant={sortBy === 'created_at' ? 'secondary' : 'ghost'} size="sm" className="w-full justify-start h-8 text-xs" onClick={() => setSortBy('created_at')}>Kayıt Tarihi</Button>
                        <Button variant={sortBy === 'full_name' ? 'secondary' : 'ghost'} size="sm" className="w-full justify-start h-8 text-xs" onClick={() => setSortBy('full_name')}>İsim</Button>
                        <Button variant={sortBy === 'email' ? 'secondary' : 'ghost'} size="sm" className="w-full justify-start h-8 text-xs" onClick={() => setSortBy('email')}>E-posta</Button>
                        
                        <div className="h-px bg-border my-1" />
                        
                        <div className="text-xs font-semibold text-muted-foreground px-2 py-1">Yön</div>
                        <Button variant={sortOrder === 'asc' ? 'secondary' : 'ghost'} size="sm" className="w-full justify-start h-8 text-xs" onClick={() => setSortOrder('asc')}>Artan (A-Z)</Button>
                        <Button variant={sortOrder === 'desc' ? 'secondary' : 'ghost'} size="sm" className="w-full justify-start h-8 text-xs" onClick={() => setSortOrder('desc')}>Azalan (Z-A)</Button>
                    </div>
                </PopoverContent>
            </Popover>

            {/* Clear Filters */}
            {hasActiveFilters && (
                <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-destructive" onClick={resetFilters} title="Filtreleri Temizle">
                    <X className="w-4 h-4" />
                </Button>
            )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="md:rounded-md md:border border-border/50 bg-card overflow-hidden">
        {isLoading ? <TableSkeleton rows={5} /> : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Filter className="w-10 h-10 opacity-20 mb-2" />
            <p className="text-sm">Kriterlere uygun kullanıcı bulunamadı.</p>
            {hasActiveFilters && (
                <Button variant="link" onClick={resetFilters} className="mt-1 h-auto p-0">Filtreleri Temizle</Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] text-center">
                      <Checkbox 
                        checked={users.length > 0 && users.every(u => selectedIds.includes(u.id))}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead className="w-[300px]">Kullanıcı</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">Kayıt Tarihi</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(user => (
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
                        {getRoleBadge(user.role)}
                      </TableCell>
                      <TableCell>
                        {user.is_suspended ? 
                          <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Askıda</Badge> : 
                          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-green-500/10 text-green-600 hover:bg-green-500/20">Aktif</Badge>
                        }
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString("tr-TR")}
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
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile View (Cards) */}
            <div className="block md:hidden border-t border-border/50">
              {users.map(user => <MobileUserCard key={user.id} user={user} />)}
            </div>
          </>
        )}
        
        <div className="px-4 py-2 border-t border-border/50 bg-muted/5">
          <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>

      {/* Batch Actions Bar - Fixed at bottom */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] md:w-auto bg-foreground text-background px-4 md:px-6 py-3 rounded-full shadow-2xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom-10 z-50 ring-1 ring-white/20">
          <span className="font-bold text-sm whitespace-nowrap">{selectedIds.length} Seçildi</span>
          
          <div className="flex items-center gap-2">
            <div className="h-4 w-px bg-background/20 hidden md:block" />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 hover:bg-white/10 hover:text-white px-2">
                      <Shield className="w-4 h-4 md:mr-2" /> 
                      <span className="hidden md:inline">Rol Değiştir</span>
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                  <DropdownMenuItem onClick={() => handleBatchRole('applicant')}>Katılımcı</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBatchRole('staff')}>Personel</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBatchRole('committee_chairman')}>Komite Başkanı</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBatchRole('admin')}>Yönetici</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button 
              size="sm" 
              variant="ghost" 
              disabled={deleteMutation.isPending}
              className="text-red-400 hover:text-red-300 hover:bg-white/10 h-8 px-2"
              onClick={handleDelete}
            >
              {deleteMutation.isPending ? <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </Button>
            
            <Button 
              size="sm" 
              variant="secondary" 
              className="text-black bg-white hover:bg-white/90 h-8 px-3 rounded-full text-xs"
              onClick={() => handleSelectionChange([])}
            >
              Vazgeç
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Change Log:
// - Removed negative right margin on the mobile card action button to prevent it from sticking to the edge.
// - Added padding top to the mobile filters section.
// - Added border top to the mobile list container for separation.