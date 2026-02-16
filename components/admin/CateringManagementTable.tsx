"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Check, X } from "lucide-react";
import { TableSkeleton } from "@/components/ui/skeleton-loader";
import { toast } from "sonner";
import { User as UserType } from "@/types/user";
import { cn } from "@/lib/utils";
import { PaginationControls } from "@/components/ui/pagination-controls";

interface CateringStatus {
  user_id: string;
  day1: boolean;
  day2: boolean;
  day3: boolean;
}

export function CateringManagementTable() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const limit = 15;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["catering-users", page, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: debouncedSearch,
        role: "delegate,press,observer,committee_chairman,chair", // Only approved users
      });

      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    placeholderData: (prev) => prev
  });

  const { data: cateringData, isLoading: cateringLoading } = useQuery<CateringStatus[]>({
    queryKey: ["catering-all"],
    queryFn: async () => {
      const res = await fetch("/api/catering/all");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const users: UserType[] = usersData?.data || [];
  const totalPages = usersData?.meta?.totalPages || 1;
  const isLoading = usersLoading || cateringLoading;

  // Create a map of user_id to catering status for quick lookup
  const cateringMap = new Map<string, CateringStatus>();
  if (cateringData) {
    cateringData.forEach((catering) => {
      cateringMap.set(catering.user_id, catering);
    });
  }

  const toggleDayMutation = useMutation({
    mutationFn: async ({ userid, day }: { userid: string; day: number }) => {
      const res = await fetch("/api/catering/update_status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userid, day }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catering-all"] });
      toast.success("Yemek durumu güncellendi");
    },
    onError: () => toast.error("Güncelleme başarısız oldu.")
  });

  const handleToggleDay = (userid: string, day: number) => {
    toggleDayMutation.mutate({ userid, day });
  };

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2);
  };

  const DayToggle = ({
    active,
    onClick,
    disabled
  }: {
    active: boolean;
    onClick: () => void;
    disabled?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center justify-center w-20 h-9 rounded-md border transition-all",
        active
          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20"
          : "bg-muted/50 border-border text-muted-foreground hover:bg-muted",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {active ? (
        <Check className="w-4 h-4" />
      ) : (
        <X className="w-4 h-4" />
      )}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-4 bg-card border border-border rounded-lg p-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="İsim, e-posta ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {isLoading ? (
          <TableSkeleton columns={5} rows={limit} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kullanıcı</TableHead>
                <TableHead className="text-center">Gün 1</TableHead>
                <TableHead className="text-center">Gün 2</TableHead>
                <TableHead className="text-center">Gün 3</TableHead>
                <TableHead className="text-right">Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Kullanıcı bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  // Get catering data from the map
                  const catering = cateringMap.get(user.id) || { user_id: user.id, day1: false, day2: false, day3: false };
                  const activeDays = [catering.day1, catering.day2, catering.day3].filter(Boolean).length;

                  const details = Array.isArray(user.user_details)
                    ? user.user_details[0]
                    : user.user_details;

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={details?.profile_picture_url || undefined} />
                            <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{user.full_name}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <DayToggle
                          active={catering.day1}
                          onClick={() => handleToggleDay(user.id, 1)}
                          disabled={toggleDayMutation.isPending}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <DayToggle
                          active={catering.day2}
                          onClick={() => handleToggleDay(user.id, 2)}
                          disabled={toggleDayMutation.isPending}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <DayToggle
                          active={catering.day3}
                          onClick={() => handleToggleDay(user.id, 3)}
                          disabled={toggleDayMutation.isPending}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm text-muted-foreground">
                          {activeDays}/3 gün aktif
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <PaginationControls
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}