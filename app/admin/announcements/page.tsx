"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Announcement } from "@/types/announcement";
import { AnnouncementFeed } from "@/components/dashboard/announcements/AnnouncementFeed";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ListSkeleton } from "@/components/ui/skeleton-loader";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdminAnnouncementsPage() {
    const queryClient = useQueryClient();
    const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null);
    const [deleteCooldown, setDeleteCooldown] = useState(0);

    useEffect(() => {
        if (!announcementToDelete) return;
        const timer = window.setInterval(() => {
            setDeleteCooldown((current) => {
                if (current <= 1) {
                    window.clearInterval(timer);
                    return 0;
                }
                return current - 1;
            });
        }, 1000);
        return () => window.clearInterval(timer);
    }, [announcementToDelete]);

    const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
        queryKey: ['announcements'],
        queryFn: async () => {
            const res = await fetch("/api/announcements");
            if (!res.ok) throw new Error("Failed");
            return res.json();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/announcements?id=${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed");
        },
        onSuccess: () => {
            toast.success("Announcement deleted");
            setAnnouncementToDelete(null);
            queryClient.invalidateQueries({ queryKey: ['announcements'] });
        },
        onError: () => {
            toast.error("Delete failed");
            setAnnouncementToDelete(null);
        }
    });

    const handleDelete = (id: string) => {
        setDeleteCooldown(3);
        setAnnouncementToDelete(id);
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-5 pb-12 animate-fade-in sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">Announcements</h2>
                    <p className="text-muted-foreground">Publish updates for participants and conference teams.</p>
                </div>
                <Link href="/admin/announcements/new">
                    <Button className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-2" /> New announcement</Button>
                </Link>
            </div>

            {isLoading ? <ListSkeleton count={3} /> : (
                <AnnouncementFeed
                    announcements={announcements}
                    onDelete={handleDelete}
                />
            )}
            <AlertDialog open={!!announcementToDelete} onOpenChange={(open) => !open && setAnnouncementToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>MAKE SURE YOU UNDERSTAND</AlertDialogTitle>
                        <AlertDialogDescription>
                            This permanently deletes the announcement for everyone. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={deleteMutation.isPending || deleteCooldown > 0}
                            className="bg-destructive text-white hover:bg-destructive/90"
                            onClick={() => announcementToDelete && deleteMutation.mutate(announcementToDelete)}
                        >
                            {deleteMutation.isPending ? "Deleting…" : deleteCooldown > 0 ? `Delete (${deleteCooldown})` : "I understand — delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
