"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Announcement } from "@/types/announcement";
import { AnnouncementFeed } from "@/components/dashboard/announcements/AnnouncementFeed";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ListSkeleton } from "@/components/ui/skeleton-loader";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export default function AdminAnnouncementsPage() {
    const queryClient = useQueryClient();

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
            toast.success("Duyuru silindi");
            queryClient.invalidateQueries({ queryKey: ['announcements'] });
        },
        onError: () => toast.error("Silme başarısız")
    });

    const handleDelete = (id: string) => {
        if (confirm("Bu duyuruyu silmek istediğinize emin misiniz?")) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            <Breadcrumbs items={[{ label: "Duyurular" }]} />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">Duyurular</h2>
                    <p className="text-muted-foreground">Tüm sistem duyurularını buradan yönetebilirsiniz.</p>
                </div>
                <Link href="/admin/announcements/new">
                    <Button className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-2" /> Yeni Duyuru</Button>
                </Link>
            </div>

            {isLoading ? <ListSkeleton count={3} /> : (
                <AnnouncementFeed
                    announcements={announcements}
                    onDelete={handleDelete}
                />
            )}
        </div>
    );
}