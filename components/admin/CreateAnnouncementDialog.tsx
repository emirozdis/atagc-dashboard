"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface CreateAnnouncementDialogProps {
    onSuccess: () => void;
}

export function CreateAnnouncementDialog({ onSuccess }: CreateAnnouncementDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !content) return;

        setLoading(true);
        try {
            const res = await fetch("/api/announcements", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, content }),
            });

            if (!res.ok) throw new Error("Failed to create");

            toast.success("Duyuru başarıyla oluşturuldu");
            setOpen(false);
            setTitle("");
            setContent("");

            // Call onSuccess to trigger re-fetch and refresh router only if needed
            onSuccess();
            router.refresh();

        } catch (error) {
            toast.error("Duyuru oluşturulurken bir hata oluştu");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Yeni Duyuru
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Yeni Duyuru Oluştur</DialogTitle>
                    <DialogDescription>
                        Tüm kullanıcılara gösterilecek yeni bir duyuru yayınlayın.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <label htmlFor="title" className="text-sm font-medium">Başlık</label>
                        <Input
                            id="title"
                            placeholder="Duyuru başlığı..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="content" className="text-sm font-medium">İçerik</label>
                        <Textarea
                            id="content"
                            placeholder="Duyuru içeriği..."
                            className="min-h-[120px]"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Yayınla
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
