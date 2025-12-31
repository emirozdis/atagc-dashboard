"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Committee } from "@/types/admin";
import { User } from "@/types/user";

interface CreateAnnouncementDialogProps {
    onSuccess: () => void;
}

export function CreateAnnouncementDialog({ onSuccess }: CreateAnnouncementDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Form States
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [targetType, setTargetType] = useState<"all" | "committee" | "user">("all");
    const [selectedCommittee, setSelectedCommittee] = useState<string>("");
    const [selectedUser, setSelectedUser] = useState<string>("");

    // Data Sources
    const [committees, setCommittees] = useState<Committee[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [userSearch, setUserSearch] = useState("");
    const [searchingUsers, setSearchingUsers] = useState(false);

    const router = useRouter();

    // Fetch Committees when dialog opens
    useEffect(() => {
        if (open) {
            fetchCommittees();
        }
    }, [open]);

    // Search Users Effect
    useEffect(() => {
        if (targetType === 'user') {
            const timer = setTimeout(() => {
                fetchUsers(userSearch);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [userSearch, targetType]);

    const fetchCommittees = async () => {
        try {
            const res = await fetch("/api/admin/committees");
            if (res.ok) {
                const data = await res.json();
                setCommittees(data);
            }
        } catch (e) { console.error("Failed to fetch committees"); }
    };

    const fetchUsers = async (search: string) => {
        setSearchingUsers(true);
        try {
            const params = new URLSearchParams({ limit: "50" }); // Limit dropdown results
            if (search) params.append("search", search);
            
            const res = await fetch(`/api/admin/users?${params}`);
            if (res.ok) {
                const json = await res.json();
                setUsers(json.data || []);
            }
        } catch (e) { console.error("Failed to fetch users"); }
        finally { setSearchingUsers(false); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !content) return;
        if (targetType === 'committee' && !selectedCommittee) {
            toast.error("Lütfen bir komite seçiniz");
            return;
        }
        if (targetType === 'user' && !selectedUser) {
            toast.error("Lütfen bir kullanıcı seçiniz");
            return;
        }

        setLoading(true);
        try {
            // Prepare payload to match API expectations (plural arrays)
            const payload: any = { 
                title, 
                content,
                targetType,
            };

            if (targetType === 'committee') {
                payload.committeeIds = [selectedCommittee];
            } else if (targetType === 'user') {
                payload.userIds = [selectedUser];
            }

            const res = await fetch("/api/announcements", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error("Failed to create");

            toast.success("Duyuru başarıyla oluşturuldu");
            setOpen(false);
            resetForm();

            onSuccess();
            router.refresh();

        } catch (error) {
            toast.error("Duyuru oluşturulurken bir hata oluştu");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setTitle("");
        setContent("");
        setTargetType("all");
        setSelectedCommittee("");
        setSelectedUser("");
        setUserSearch("");
    };

    return (
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if(!val) resetForm(); }}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Yeni Duyuru
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Yeni Duyuru Oluştur</DialogTitle>
                    <DialogDescription>
                        Hedef kitleyi seçerek duyuru yayınlayın.
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
                         <label className="text-sm font-medium">Hedef Kitle</label>
                         <Select 
                            value={targetType} 
                            onValueChange={(val: any) => setTargetType(val)}
                         >
                            <SelectTrigger>
                                <SelectValue placeholder="Hedef Kitle Seçiniz" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Herkes (Genel)</SelectItem>
                                <SelectItem value="committee">Komiteye Özel</SelectItem>
                                <SelectItem value="user">Kişiye Özel</SelectItem>
                            </SelectContent>
                         </Select>
                    </div>

                    {targetType === 'committee' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <label className="text-sm font-medium">Komite Seçimi</label>
                            <Select 
                                value={selectedCommittee} 
                                onValueChange={setSelectedCommittee}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Komite Seçiniz" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                    {committees.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {targetType === 'user' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <label className="text-sm font-medium">Kullanıcı Ara</label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="İsim veya e-posta ile ara..."
                                    className="pl-9"
                                    value={userSearch}
                                    onChange={e => setUserSearch(e.target.value)}
                                />
                            </div>
                            
                            <Select 
                                value={selectedUser} 
                                onValueChange={setSelectedUser}
                            >
                                <SelectTrigger className="mt-2">
                                    <SelectValue placeholder={searchingUsers ? "Aranıyor..." : "Kullanıcı Seçiniz"} />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                    {users.length === 0 ? (
                                        <div className="p-2 text-sm text-muted-foreground text-center">Kullanıcı bulunamadı</div>
                                    ) : (
                                        users.map(u => (
                                            <SelectItem key={u.id} value={u.id}>
                                                {u.full_name} ({u.email})
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

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

// Change Log:
// - Updated `handleSubmit` to format the payload correctly for the API.
// - targetType 'committee' now sends `committeeIds: [selectedCommittee]`.
// - targetType 'user' now sends `userIds: [selectedUser]`.
// - This ensures compatibility with `api/announcements/route.ts` which expects array inputs.