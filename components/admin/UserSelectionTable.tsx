"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Trash2, Shield, UserCog, Filter, ArrowUpDown, X, CheckCircle2, AlertTriangle, CreditCard, ShieldCheck, ChevronUp } from "lucide-react";
import { TableSkeleton } from "@/components/ui/skeleton-loader";
import { toast } from "sonner";
import { User as UserType } from "@/types/user";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AnimatePresence, motion } from "framer-motion";
import { PaymentReviewDialog } from "@/components/admin/PaymentReviewDialog";
import { MultiSelectPopover, MultiSelectOption } from "@/components/ui/multi-select-popover";
import { PaymentStatusEnum } from "@/types/payment";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ROLES, ROLE_METADATA, UserRole } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { PaginationControls } from "@/components/ui/pagination-controls";

interface UserSelectionTableProps {
  selectedUsers?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

const roleOptions: MultiSelectOption[] = Object.values(ROLES).map(role => ({
  value: role,
  label: ROLE_METADATA[role as UserRole].label
}));

const statusOptions: MultiSelectOption[] = [
  { value: "active", label: "Aktif" },
  { value: "suspended", label: "Askıda" },
];

const paymentStatusOptions: MultiSelectOption[] = [
  { value: PaymentStatusEnum.PAID, label: "Ödendi" },
  { value: PaymentStatusEnum.PROCESSING, label: "İnceleniyor" },
  { value: PaymentStatusEnum.REJECTED, label: "Reddedildi" },
  { value: PaymentStatusEnum.UNPAID, label: "Ödenmedi" },
  { value: PaymentStatusEnum.EXEMPT, label: "Muaf" },
];

export function UserSelectionTable({ selectedUsers: externalSelected, onSelectionChange }: UserSelectionTableProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [internalSelected, setInternalSelected] = useState<string[]>([]);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);

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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string[]>([]);
  const [warningFilter, setWarningFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const limit = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["users", page, debouncedSearch, roleFilter, statusFilter, paymentStatusFilter, warningFilter, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: debouncedSearch,
        warnings: warningFilter,
        sort_by: sortBy,
        sort_order: sortOrder
      });
      if (roleFilter.length > 0) params.append("role", roleFilter.join(','));
      if (statusFilter.length > 0) params.append("status", statusFilter.join(','));
      if (paymentStatusFilter.length > 0) params.append("payment_status", paymentStatusFilter.join(','));

      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    placeholderData: (prev) => prev
  });

  const users: UserType[] = data?.data || [];
  const totalPages = data?.meta?.totalPages || 1;

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
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

  const toggleUser = (id: string) => {
    if (selectedIds.includes(id)) handleSelectionChange(selectedIds.filter(x => x !== id));
    else handleSelectionChange([...selectedIds, id]);
  };

  const toggleAll = () => {
    const pageIds = users.map(u => u.id);
    const allSelected = pageIds.every(id => selectedIds.includes(id));
    if (allSelected) handleSelectionChange(selectedIds.filter(id => !pageIds.includes(id)));
    else handleSelectionChange(Array.from(new Set([...selectedIds, ...pageIds])));
  };

  const handleDelete = () => {
    if (confirm(`Seçili ${selectedIds.length} kullanıcıyı silmek istediğinize emin misiniz?`)) deleteMutation.mutate(selectedIds);
  };

  const handleBatchRole = (role: string) => {
    if (confirm(`Seçili ${selectedIds.length} kullanıcının rolünü değiştirmek istiyor musunuz?`)) roleMutation.mutate({ ids: selectedIds, role });
  };

  const resetFilters = () => {
    setSearch("");
    setRoleFilter([]);
    setStatusFilter([]);
    setPaymentStatusFilter([]);
    setWarningFilter("all");
    setSortBy("created_at");
    setSortOrder("desc");
    setPage(1);
  };

  const handlePaymentClick = (e: React.MouseEvent, user: UserType) => {
    e.stopPropagation();
    const receiptId = user.payment_receipts?.[0]?.id;
    if (receiptId) {
      setSelectedReceiptId(receiptId);
    } else {
      const app = Array.isArray(user.application) ? user.application[0] : user.application;
      const status = app?.payment_status || PaymentStatusEnum.UNPAID;

      if (status === PaymentStatusEnum.EXEMPT) {
        toast.info("Bu kullanıcı ödemeden muaftır.");
      } else if (status === PaymentStatusEnum.UNPAID) {
        toast.info("Bu kullanıcı henüz ödeme bildirimi yapmamış.");
      } else {
        router.push(`/admin/payments?search=${user.email}`);
      }
    }
  };

  const getRoleBadge = (user: UserType) => {
    const roleKey = user.role as UserRole;
    const meta = ROLE_METADATA[roleKey] || ROLE_METADATA[ROLES.APPLICANT];
    const Icon = meta.icon;

    return (
      <Badge variant="outline" className={cn("whitespace-nowrap gap-1", meta.bgClass, meta.colorClass, meta.borderClass)}>
        <Icon className="w-3 h-3" /> {meta.label}
      </Badge>
    );
  };

  const getPaymentBadge = (user: UserType) => {
    const app = Array.isArray(user.application) ? user.application[0] : user.application;
    const paymentStatus = app?.payment_status || PaymentStatusEnum.UNPAID;

    switch (paymentStatus) {
      case PaymentStatusEnum.PAID:
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer gap-1" onClick={(e) => handlePaymentClick(e, user)}><CheckCircle2 className="w-3 h-3" /> Ödendi</Badge>;
      case PaymentStatusEnum.PROCESSING:
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20 cursor-pointer gap-1 animate-pulse" onClick={(e) => handlePaymentClick(e, user)}><CreditCard className="w-3 h-3" /> İnceleniyor</Badge>;
      case PaymentStatusEnum.REJECTED:
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20 cursor-pointer gap-1" onClick={(e) => handlePaymentClick(e, user)}><X className="w-3 h-3" /> Reddedildi</Badge>;
      case PaymentStatusEnum.EXEMPT:
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 hover:bg-purple-500/20 cursor-default gap-1"><ShieldCheck className="w-3 h-3" /> Muaf</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground bg-transparent font-normal opacity-50 cursor-default">Ödenmedi</Badge>;
    }
  };

  const getUserImage = (user: UserType) => {
    const details = Array.isArray(user.user_details) ? user.user_details[0] : user.user_details;
    return details?.profile_picture_url || undefined;
  };

  const hasActiveFilters = search !== "" || roleFilter.length > 0 || statusFilter.length > 0 || paymentStatusFilter.length > 0 || warningFilter !== "all";

  return (
    <div className="space-y-6">
      {/* Controls Toolbar */}
      <div className="flex flex-col gap-3 bg-card p-3 rounded-xl border border-border/50 shadow-sm">
        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input placeholder="İsim veya e-posta ile ara..." className="pl-9 h-10 w-full bg-background border-border/50" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <MultiSelectPopover options={roleOptions} selected={roleFilter} onChange={setRoleFilter} placeholder="Rol" triggerIcon={<Shield className="w-4 h-4 shrink-0" />} className="w-[calc(50%-0.25rem)] min-[480px]:w-auto min-[480px]:min-w-[130px]" />
            <MultiSelectPopover options={statusOptions} selected={statusFilter} onChange={setStatusFilter} placeholder="Durum" triggerIcon={<Filter className="w-4 h-4 shrink-0" />} className="w-[calc(50%-0.25rem)] min-[480px]:w-auto min-[480px]:min-w-[130px]" />
            <MultiSelectPopover options={paymentStatusOptions} selected={paymentStatusFilter} onChange={setPaymentStatusFilter} placeholder="Ödeme" triggerIcon={<CreditCard className="w-4 h-4 shrink-0" />} className="w-[calc(50%-0.25rem)] min-[480px]:w-auto min-[480px]:min-w-[130px]" />
            <Select value={warningFilter} onValueChange={setWarningFilter}>
              <SelectTrigger className="w-[calc(50%-0.25rem)] min-[480px]:w-auto min-[480px]:min-w-[130px] h-10 bg-background border-border/50"><div className="flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /><SelectValue placeholder="Uyarı" /></div></SelectTrigger>
              <SelectContent><SelectItem value="all">Tümü</SelectItem><SelectItem value="has_warnings">Uyarı Alanlar</SelectItem></SelectContent>
            </Select>
          </div>
          {/* Sort/Clear */}
          <div className="flex items-center gap-2 ml-auto">
            <Popover>
              <PopoverTrigger asChild><Button variant="outline" className="h-10 px-3 gap-2 bg-background border-border/50 shrink-0"><ArrowUpDown className="w-4 h-4" /><span className="hidden sm:inline">Sırala</span></Button></PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                <div className="space-y-1">
                  <Button variant={sortBy === 'created_at' ? 'secondary' : 'ghost'} size="sm" className="w-full justify-start h-8 text-xs" onClick={() => setSortBy('created_at')}>Kayıt Tarihi</Button>
                  <Button variant={sortBy === 'full_name' ? 'secondary' : 'ghost'} size="sm" className="w-full justify-start h-8 text-xs" onClick={() => setSortBy('full_name')}>İsim</Button>
                  <Button variant={sortBy === 'warnings_count' ? 'secondary' : 'ghost'} size="sm" className="w-full justify-start h-8 text-xs" onClick={() => setSortBy('warnings_count')}>Uyarı Sayısı</Button>
                  <div className="h-px bg-border my-1" />
                  <Button variant={sortOrder === 'asc' ? 'secondary' : 'ghost'} size="sm" className="w-full justify-start h-8 text-xs" onClick={() => setSortOrder('asc')}>Artan (A-Z)</Button>
                  <Button variant={sortOrder === 'desc' ? 'secondary' : 'ghost'} size="sm" className="w-full justify-start h-8 text-xs" onClick={() => setSortOrder('desc')}>Azalan (Z-A)</Button>
                </div>
              </PopoverContent>
            </Popover>
            {hasActiveFilters && <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-destructive shrink-0" onClick={resetFilters}><X className="w-4 h-4" /></Button>}
          </div>
        </div>
      </div>

      {/* Table Content */}
      {isLoading ? <TableSkeleton cols={8} rows={limit} showTitle={false} /> : (
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[50px] text-center"><Checkbox checked={users.length > 0 && users.every(u => selectedIds.includes(u.id))} onCheckedChange={toggleAll} /></TableHead>
                <TableHead className="w-[300px]">Kullanıcı</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Ödeme</TableHead>
                <TableHead>Uyarı</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">Kayıt Tarihi</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.id} className={`cursor-pointer transition-colors ${selectedIds.includes(user.id) ? "bg-muted/50" : "hover:bg-muted/30"}`} onClick={() => toggleUser(user.id)}>
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}><Checkbox checked={selectedIds.includes(user.id)} onCheckedChange={() => toggleUser(user.id)} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border border-border/50">
                        <AvatarImage src={getUserImage(user)} className="object-cover" />
                        <AvatarFallback>{user.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm text-foreground">{user.full_name}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(user)}</TableCell>
                  <TableCell>{getPaymentBadge(user)}</TableCell>
                  <TableCell>{user.warnings_count && user.warnings_count > 0 ? <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><AlertTriangle className="w-3 h-3 mr-1" /> {user.warnings_count}</Badge> : <span className="text-xs text-muted-foreground opacity-50">-</span>}</TableCell>
                  <TableCell>{user.is_suspended ? <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Askıda</Badge> : <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-green-500/10 text-green-600 hover:bg-green-500/20">Aktif</Badge>}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{new Date(user.created_at).toLocaleDateString("tr-TR")}</TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); router.push(`/admin/users/${user.id}`); }}><UserCog className="w-4 h-4 text-muted-foreground hover:text-primary" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <div className="border-t border-border/50 px-4">
            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}

      {/* Floating Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed z-50 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-auto bottom-20 md:bottom-8"
          >
            <div className="bg-white/95 dark:bg-zinc-900/95 text-foreground px-4 py-3 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/50 flex items-center justify-between gap-3 md:gap-6 backdrop-blur-lg border border-border/50 ring-1 ring-black/5 dark:ring-white/5">
              <div className="flex items-center gap-3 pl-1 pr-2">
                <motion.div
                  key={selectedIds.length}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-sm"
                >
                  {selectedIds.length}
                </motion.div>
                <span className="text-sm font-medium whitespace-nowrap">
                  <span className="md:hidden">Seçildi</span>
                  <span className="hidden md:inline">Kullanıcı Seçildi</span>
                </span>
              </div>
              <div className="h-6 w-px bg-border hidden md:block" />
              <div className="flex items-center gap-1.5 md:gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-8 px-2 md:px-3 hover:bg-secondary/80">
                      <Shield className="w-4 h-4 md:mr-2" />
                      <span className="hidden md:inline">Rol Değiştir</span>
                      <ChevronUp className="w-3 h-3 ml-1 md:hidden opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" side="top" className="mb-2">
                    {Object.values(ROLES).map(role => (
                      <DropdownMenuItem key={role} onClick={() => handleBatchRole(role)}>
                        {ROLE_METADATA[role as UserRole].label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="sm" variant="ghost" disabled={deleteMutation.isPending} className="h-8 px-2 md:px-3 text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-colors" onClick={handleDelete}>
                  <Trash2 className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Sil</span>
                </Button>
                <div className="h-4 w-px bg-border mx-1" />
                <Button size="sm" variant="ghost" className="h-8 w-8 md:w-auto md:px-3 rounded-full md:rounded-md hover:bg-secondary p-0 md:p-2" onClick={() => handleSelectionChange([])}>
                  <X className="w-4 h-4 md:hidden" />
                  <span className="hidden md:inline text-xs font-medium">Vazgeç</span>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PaymentReviewDialog paymentId={selectedReceiptId} open={!!selectedReceiptId} onOpenChange={(open) => !open && setSelectedReceiptId(null)} />
    </div>
  );
}