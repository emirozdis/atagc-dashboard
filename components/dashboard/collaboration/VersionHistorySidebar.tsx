"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { History, Save, RotateCcw, Loader2, X, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { DocumentVersion } from "@/types/document";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

interface VersionHistorySidebarProps {
    committeeId: string;
    isOpen: boolean;
    onClose: () => void;
    canManage: boolean;
    onRestoreTrigger: () => void; // Trigger WebSocket refresh
}

export function VersionHistorySidebar({ committeeId, isOpen, onClose, canManage, onRestoreTrigger }: VersionHistorySidebarProps) {
    const queryClient = useQueryClient();
    const [newVersionName, setNewVersionName] = useState("");
    const [versionToRestore, setVersionToRestore] = useState<DocumentVersion | null>(null);

    // List Versions
    const { data: versions = [], isLoading } = useQuery<DocumentVersion[]>({
        queryKey: ["document-versions", committeeId],
        queryFn: async () => {
            const res = await fetch(`/api/documents/${committeeId}/versions`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        enabled: isOpen && !!committeeId
    });

    // Create Snapshot
    const createMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/documents/${committeeId}/versions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newVersionName || "Manuel Kayıt" })
            });
            if (!res.ok) throw new Error("Failed");
        },
        onSuccess: () => {
            toast.success("Versiyon kaydedildi");
            setNewVersionName("");
            queryClient.invalidateQueries({ queryKey: ["document-versions", committeeId] });
        },
        onError: () => toast.error("Kayıt oluşturulamadı")
    });

    // Restore Version
    const restoreMutation = useMutation({
        mutationFn: async (versionId: string) => {
            const res = await fetch(`/api/documents/${committeeId}/restore`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ versionId })
            });
            if (!res.ok) throw new Error("Failed");
        },
        onSuccess: () => {
            toast.success("Belge geri yüklendi");
            setVersionToRestore(null);
            onClose();
            onRestoreTrigger(); // Signal parent to refresh socket
        },
        onError: () => toast.error("Geri yükleme başarısız")
    });

    return (
        <>
            <Sheet open={isOpen} onOpenChange={(val) => !val && onClose()}>
                <SheetContent className="w-[400px] sm:w-[540px] flex flex-col h-full">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <History className="w-5 h-5 text-primary" />
                            Versiyon Geçmişi
                        </SheetTitle>
                        <SheetDescription>
                            Belgenin önceki hallerini görüntüleyin ve geri yükleyin.
                        </SheetDescription>
                    </SheetHeader>

                    {/* Create Manual Version */}
                    {canManage && (
                        <div className="py-4 border-b border-border space-y-2">
                            <div className="flex gap-2">
                                <Input 
                                    placeholder="Versiyon adı (örn: Taslak 1)" 
                                    value={newVersionName}
                                    onChange={(e) => setNewVersionName(e.target.value)}
                                />
                                <Button size="icon" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>
                    )}

                    <ScrollArea className="flex-1 -mx-6 px-6">
                        <div className="space-y-4 py-4">
                            {isLoading ? (
                                <div className="flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                            ) : versions.length === 0 ? (
                                <div className="text-center text-muted-foreground text-sm py-10">Henüz kayıtlı versiyon yok.</div>
                            ) : (
                                versions.map((v) => (
                                    <div key={v.id} className="flex flex-col gap-2 p-3 rounded-lg border border-border/50 bg-secondary/10 hover:bg-secondary/20 transition-colors group">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm">{v.version_name}</span>
                                                    {v.is_auto_save && <Badge variant="outline" className="text-[10px] h-4 px-1">Oto</Badge>}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Clock className="w-3 h-3" />
                                                    {format(new Date(v.created_at), "d MMMM HH:mm", { locale: tr })}
                                                </div>
                                                {!v.is_auto_save && v.creator && (
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <User className="w-3 h-3" />
                                                        {v.creator.full_name}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {canManage && (
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => setVersionToRestore(v)}
                                                >
                                                    <RotateCcw className="w-3 h-3 mr-1" /> Geri Yükle
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>

            <AlertDialog open={!!versionToRestore} onOpenChange={(val) => !val && setVersionToRestore(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Versiyonu Geri Yükle</AlertDialogTitle>
                        <AlertDialogDescription>
                            Belge, <strong>{versionToRestore?.version_name}</strong> ({versionToRestore && format(new Date(versionToRestore.created_at), "HH:mm")}) durumuna döndürülecektir. 
                            Mevcut düzenlemeler kaybolabilir.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => versionToRestore && restoreMutation.mutate(versionToRestore.id)} className="bg-destructive text-white hover:bg-destructive/90">
                            Geri Yükle
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}