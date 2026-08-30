"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Check, X } from "lucide-react";
import { TableSkeleton } from "@/components/ui/skeleton-loader";
import { toast } from "sonner";
import { User as UserType } from "@/types/user";
import { cn } from "@/lib/utils";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Card, CardContent } from "@/components/ui/card";

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
        role: "delegate,press,observer,committee_chairman,chair", // Approved roles only
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

  // Build a user_id -> catering_status map for efficient lookups
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
      toast.success("Catering status updated.");
    },
    onError: () => toast.error("Unable to update catering status.")
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
        "flex items-center justify-center w-full sm:w-20 h-9 rounded-md border transition-all",
        active
          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20"
          : "bg-muted/50 border-border text-muted-foreground hover:bg-muted",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-4 bg-card border border-border/50 rounded-xl p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background border-border/50 h-10"
          />
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton cols={5} rows={limit} />
      ) : users.length === 0 ? (
        <div className="text-center text-muted-foreground py-16 border-2 border-dashed border-border/50 rounded-xl bg-muted/5">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No participants found.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="pl-6">Participant</TableHead>
                  <TableHead className="text-center">Day 1</TableHead>
                  <TableHead className="text-center">Day 2</TableHead>
                  <TableHead className="text-center">Day 3</TableHead>
                  <TableHead className="text-right pr-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const catering = cateringMap.get(user.id) || { user_id: user.id, day1: false, day2: false, day3: false };
                  const activeDays = [catering.day1, catering.day2, catering.day3].filter(Boolean).length;
                  const details = Array.isArray(user.user_details) ? user.user_details[0] : user.user_details;

                  return (
                    <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-border/50">
                            <AvatarImage src={details?.profile_picture_url || undefined} className="object-cover" />
                            <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{user.full_name}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <DayToggle active={catering.day1} onClick={() => handleToggleDay(user.id, 1)} disabled={toggleDayMutation.isPending} />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <DayToggle active={catering.day2} onClick={() => handleToggleDay(user.id, 2)} disabled={toggleDayMutation.isPending} />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <DayToggle active={catering.day3} onClick={() => handleToggleDay(user.id, 3)} disabled={toggleDayMutation.isPending} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <span className="text-sm font-medium text-muted-foreground">{activeDays}/3 active</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden flex flex-col gap-4">
            {users.map((user) => {
              const catering = cateringMap.get(user.id) || { user_id: user.id, day1: false, day2: false, day3: false };
              const activeDays = [catering.day1, catering.day2, catering.day3].filter(Boolean).length;
              const details = Array.isArray(user.user_details) ? user.user_details[0] : user.user_details;

              return (
                <Card key={user.id} className="bg-card border-border/50 shadow-sm overflow-hidden">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-10 w-10 shrink-0 border border-border/50">
                          <AvatarImage src={details?.profile_picture_url || undefined} className="object-cover" />
                          <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-sm truncate">{user.full_name}</span>
                          <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground shrink-0 ml-2 bg-secondary/30 px-2 py-1 rounded-md">
                        {activeDays}/3 active
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 border-t border-border/50 pt-3">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Day 1</span>
                        <DayToggle active={catering.day1} onClick={() => handleToggleDay(user.id, 1)} disabled={toggleDayMutation.isPending} />
                      </div>
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Day 2</span>
                        <DayToggle active={catering.day2} onClick={() => handleToggleDay(user.id, 2)} disabled={toggleDayMutation.isPending} />
                      </div>
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Day 3</span>
                        <DayToggle active={catering.day3} onClick={() => handleToggleDay(user.id, 3)} disabled={toggleDayMutation.isPending} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Common Pagination */}
          {totalPages > 1 && (
            <div className="pt-2">
              <PaginationControls
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
