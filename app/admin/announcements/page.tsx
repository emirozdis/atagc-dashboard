"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Announcement } from "@/types/announcement";
import { AnnouncementFeed } from "@/components/dashboard/announcements/AnnouncementFeed";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AdminAnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAnnouncements = async () => {
        try {
            const res = await fetch("/api/announcements");
            if (res.ok) {
                const data = await res.json();
                setAnnouncements(data);
            }
        } catch (e) {
            toast.error("Duyurular yüklenemedi");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Duyurular</h1>
                    <p className="text-muted-foreground">
                        Tüm sistem duyurularını buradan yönetebilirsiniz.
                    </p>
                </div>
                {/* Changed from Dialog to Link */}
                <Link href="/admin/announcements/new">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Yeni Duyuru
                    </Button>
                </Link>
            </div>

            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
            ) : (
                <AnnouncementFeed announcements={announcements} />
            )}
        </div>
    );
}