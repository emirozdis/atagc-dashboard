"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Users, Search, Briefcase, MapPin, Save, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

const FIELD_OBSERVER_VALUE = "__field_observer__";

type Observer = {
  id: string;
  full_name: string;
  email: string;
  allocation?: {
    allocated_committee: string | null;
    allocated_field: string | null;
    field_observer: boolean;
  } | null;
};

export default function AssignObserversPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selections, setSelections] = useState<
    Record<string, { type: string; field?: string }>
  >({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // Fetch observers from users table (role = observer)
  const { data: observers, isLoading: observersLoading } = useQuery({
    queryKey: ["observers-for-assignment"],
    queryFn: async () => {
      const res = await fetch("/api/observer/list");
      if (!res.ok) throw new Error("Failed to fetch observers");
      return res.json() as Promise<Observer[]>;
    },
  });

  // Fetch committees
  const { data: committees, isLoading: committeesLoading } = useQuery({
    queryKey: ["observer-committees"],
    queryFn: async () => {
      const res = await fetch("/api/observer/committees");
      if (!res.ok) throw new Error("Failed to fetch committees");
      return res.json() as Promise<{ id: string; name: string }[]>;
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (payload: { user_id: string; committee?: string; allocated_field?: string }) => {
      const res = await fetch("/api/observer/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Atama başarısız.");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      toast.success("Gözlemci başarıyla atandı.");
      setSavedIds((prev) => new Set(prev).add(variables.user_id));
      setTimeout(() => setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.user_id);
        return next;
      }), 2000);
      queryClient.invalidateQueries({ queryKey: ["observers-for-assignment"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleSave = (observerId: string) => {
    const sel = selections[observerId];
    if (!sel) return;

    const isField = sel.type === FIELD_OBSERVER_VALUE;
    const payload: { user_id: string; committee?: string; allocated_field?: string } = {
      user_id: observerId,
    };

    if (isField) {
      if (sel.field?.trim()) {
        payload.allocated_field = sel.field.trim();
      }
    } else {
      payload.committee = sel.type;
    }

    assignMutation.mutate(payload);
  };

  const hasChanged = (observer: Observer) => {
    const sel = selections[observer.id];
    if (!sel) return false;

    const isField = sel.type === FIELD_OBSERVER_VALUE;
    if (observer.allocation?.allocated_committee) {
      if (isField) return true;
      return sel.type !== observer.allocation.allocated_committee;
    }
    // Currently field observer or no allocation
    if (!isField) return true;
    const currentField = observer.allocation?.allocated_field || "";
    return (sel.field || "") !== currentField;
  };

  const getSelection = (observer: Observer) => {
    if (selections[observer.id]) return selections[observer.id];

    // Derive from current allocation data
    if (observer.allocation?.allocated_committee) {
      return { type: observer.allocation.allocated_committee, field: "" };
    }
    return {
      type: FIELD_OBSERVER_VALUE,
      field: observer.allocation?.allocated_field || "",
    };
  };

  const handleSelectionChange = (observerId: string, value: string) => {
    setSelections((prev) => ({
      ...prev,
      [observerId]: {
        type: value,
        field: value === FIELD_OBSERVER_VALUE ? prev[observerId]?.field || "" : undefined,
      },
    }));
  };

  const handleFieldChange = (observerId: string, field: string) => {
    setSelections((prev) => ({
      ...prev,
      [observerId]: {
        ...prev[observerId],
        type: FIELD_OBSERVER_VALUE,
        field,
      },
    }));
  };

  const filtered = observers?.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.full_name?.toLowerCase().includes(q) ||
      o.email?.toLowerCase().includes(q)
    );
  });

  const isLoading = observersLoading || committeesLoading;

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-12 space-y-8">
      <Breadcrumbs
        items={[
          { label: "Organizasyon", href: "/organisation" },
          { label: "Gözlemci Atama" },
        ]}
      />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">
            Gözlemci Atama
          </h2>
          <p className="text-muted-foreground mt-2 text-lg">
            Gözlemcileri komitelere veya saha görevine atayın.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3 bg-card p-3 rounded-xl border border-border/50 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="İsim veya e-posta ile ara..."
            className="pl-9 h-10 bg-background border-border/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Badge variant="secondary" className="w-fit self-center px-3 py-1.5">
          <Users className="w-3 h-3 mr-1" />
          {filtered?.length ?? 0} gözlemci
        </Badge>
      </div>

      {/* Observer List */}
      <Card className="border-border/50 shadow-sm bg-card overflow-hidden">
        <CardHeader className="bg-muted/10 border-b border-border/50 pb-4">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" /> Gözlemci Listesi
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y divide-border/50">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 md:p-5">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <Skeleton className="h-9 w-48" />
                </div>
              ))}
            </div>
          ) : filtered && filtered.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>Gözlemci</TableHead>
                      <TableHead>Mevcut Atama</TableHead>
                      <TableHead className="text-right">Atama</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((observer) => {
                      const sel = getSelection(observer);
                      const isField = sel.type === FIELD_OBSERVER_VALUE;

                      return (
                        <TableRow key={observer.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <div>
                              <div className="font-medium text-sm">
                                {observer.full_name || "—"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {observer.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {observer.allocation?.allocated_committee ? (
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                                <Briefcase className="w-3 h-3 mr-1" />
                                {committees?.find((c) => c.id === observer.allocation?.allocated_committee)?.name || "Komite"}
                              </Badge>
                            ) : observer.allocation ? (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                                <MapPin className="w-3 h-3 mr-1" />
                                {observer.allocation.allocated_field || "Saha Gözlemcisi"}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-500/10 text-gray-400 border-gray-500/20">
                                Atanmamış
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              {isField && (
                                <Input
                                  placeholder="Alan adı..."
                                  className="h-9 w-40 text-sm"
                                  value={sel.field || ""}
                                  onChange={(e) => handleFieldChange(observer.id, e.target.value)}
                                />
                              )}
                              <Select
                                value={sel.type}
                                onValueChange={(val) => handleSelectionChange(observer.id, val)}
                              >
                                <SelectTrigger className="w-48 h-9">
                                  <SelectValue placeholder="Atama seçin..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={FIELD_OBSERVER_VALUE}>
                                    Saha Gözlemcisi
                                  </SelectItem>
                                  {committees?.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                      {c.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={!hasChanged(observer) || (assignMutation.isPending && assignMutation.variables?.user_id === observer.id)}
                              onClick={() => handleSave(observer.id)}
                            >
                              {assignMutation.isPending && assignMutation.variables?.user_id === observer.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : savedIds.has(observer.id) ? (
                                <Check className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-border/50">
                {filtered.map((observer) => {
                  const sel = getSelection(observer);
                  const isField = sel.type === FIELD_OBSERVER_VALUE;

                  return (
                    <div key={observer.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">
                            {observer.full_name || "—"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {observer.email}
                          </div>
                        </div>
                        {observer.allocation?.allocated_committee ? (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs">
                            <Briefcase className="w-3 h-3 mr-1" />
                            {committees?.find((c) => c.id === observer.allocation?.allocated_committee)?.name || "Komite"}
                          </Badge>
                        ) : observer.allocation ? (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs">
                            <MapPin className="w-3 h-3 mr-1" />
                            Saha
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-500/10 text-gray-400 border-gray-500/20 text-xs">
                            Atanmamış
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isField && (
                          <Input
                            placeholder="Alan adı..."
                            className="h-9 flex-1 text-sm"
                            value={sel.field || ""}
                            onChange={(e) => handleFieldChange(observer.id, e.target.value)}
                          />
                        )}
                        <Select
                          value={sel.type}
                          onValueChange={(val) => handleSelectionChange(observer.id, val)}
                        >
                          <SelectTrigger className={isField ? "w-40 h-9" : "flex-1 h-9"}>
                            <SelectValue placeholder="Atama seçin..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={FIELD_OBSERVER_VALUE}>
                              Saha Gözlemcisi
                            </SelectItem>
                            {committees?.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={!hasChanged(observer) || (assignMutation.isPending && assignMutation.variables?.user_id === observer.id)}
                          onClick={() => handleSave(observer.id)}
                        >
                          {assignMutation.isPending && assignMutation.variables?.user_id === observer.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : savedIds.has(observer.id) ? (
                            <Check className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary/30 flex items-center justify-center mb-5">
                <Eye className="w-7 h-7 text-muted-foreground" />
              </div>
              <h4 className="font-semibold text-xl text-foreground mb-2">
                Gözlemci Bulunamadı
              </h4>
              <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                {search ? "Arama kriterlerinize uygun gözlemci bulunamadı." : "Henüz gözlemci rolünde kullanıcı bulunmuyor."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}