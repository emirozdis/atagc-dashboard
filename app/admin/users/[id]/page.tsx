"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    ArrowLeft,
    Mail,
    Phone,
    GraduationCap,
    Shield,
    ShieldAlert,
    ShieldCheck,
    User as UserIcon,
    MoreVertical,
    FileText,
    Building2,
    BookOpen,
    ArrowUpRight
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ManageUserDialog } from "@/components/admin/UserManagementDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { User, UserDetail } from "@/types/user";
import { WarningManager } from "@/components/admin/WarningManager";

export default function UserDetailPage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const id = params.id as string;
    const [isManageOpen, setIsManageOpen] = useState(false);

    // Query
    const { data: user, isLoading, error } = useQuery<User>({
        queryKey: ['user', id],
        queryFn: async () => {
            const res = await fetch(`/api/admin/users/${id}`);
            if (!res.ok) throw new Error("User not found");
            return res.json();
        }
    });

    // Mutations
    const updateRoleMutation = useMutation({
        mutationFn: async ({ userId, newRole }: { userId: string, newRole: string }) => {
            const res = await fetch("/api/admin/users", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: userId, role: newRole }),
            });
            if (!res.ok) throw new Error("Failed");
        },
        onSuccess: () => {
            toast.success("Rol güncellendi");
            queryClient.invalidateQueries({ queryKey: ['user', id] });
        },
        onError: () => toast.error("İşlem başarısız")
    });

    const suspendMutation = useMutation({
        mutationFn: async ({ userId, isSuspended }: { userId: string, isSuspended: boolean }) => {
            const res = await fetch("/api/admin/users", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: userId, is_suspended: isSuspended }),
            });
            if (!res.ok) throw new Error("Failed");
        },
        onSuccess: (_, variables) => {
            toast.success(variables.isSuspended ? "Kullanıcı askıya alındı" : "Kullanıcı aktifleştirildi");
            queryClient.invalidateQueries({ queryKey: ['user', id] });
        },
        onError: () => toast.error("İşlem başarısız")
    });

    const deleteMutation = useMutation({
        mutationFn: async (userId: string) => {
            const res = await fetch(`/api/admin/users?id=${userId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed");
        },
        onSuccess: () => {
            toast.success("Kullanıcı silindi");
            router.push("/admin/users");
        },
        onError: () => toast.error("Silme işlemi başarısız")
    });

    if (isLoading) {
        return (
            <div className="space-y-6 max-w-7xl mx-auto p-6">
                <div className="flex justify-between">
                    <Skeleton className="h-10 w-[200px]" />
                    <Skeleton className="h-10 w-[100px]" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-[300px] w-full rounded-xl" />
                    <Skeleton className="h-[500px] w-full rounded-xl lg:col-span-2" />
                </div>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh]">
                <p className="text-muted-foreground mb-4">Kullanıcı bulunamadı.</p>
                <Link href="/admin/users">
                    <Button variant="outline">Geri Dön</Button>
                </Link>
            </div>
        );
    }

    const getFirstItem = <T,>(item: T | T[] | undefined | null): T | null => {
        if (!item) return null;
        if (Array.isArray(item)) return item.length > 0 ? item[0] : null;
        return item as T;
    };

    const details = getFirstItem<UserDetail>(user.user_details);
    const additional = details?.additional_info || {};

    const managedCommittee = user.managed_committees?.[0];
    const memberCommittee = user.committee_members?.[0]?.committee;
    const activeCommittee = managedCommittee || memberCommittee;
    const isCommitteeExecutive = user.role === 'committee_chairman' || user.role === 'deputy_chair';

    const application = getFirstItem(user.application);

    const getRoleBadge = (role: string) => {
        switch (role) {
            case "superadmin": return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><ShieldAlert className="w-3 h-3 mr-1" /> Süper Yönetici</Badge>;
            case "admin": return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20"><ShieldAlert className="w-3 h-3 mr-1" /> Yönetici</Badge>;
            case "committee_chairman": return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20"><ShieldCheck className="w-3 h-3 mr-1" /> Başkan</Badge>;
            case "deputy_chair": return <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20"><Shield className="w-3 h-3 mr-1" /> Başkan Yrd.</Badge>;
            default: return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20"><UserIcon className="w-3 h-3 mr-1" /> Katılımcı</Badge>;
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <Breadcrumbs items={[{ label: "Kullanıcılar", href: "/admin/users" }, { label: "Kullanıcı Detayı" }]} />
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/admin/users">
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{user.full_name}</h1>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>ID: {user.id}</span>
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                            <span>Kayıt: {new Date(user.created_at).toLocaleDateString('tr-TR')}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setIsManageOpen(true)}>
                        <MoreVertical className="w-4 h-4 mr-2" />
                        Yönet
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Overview & Warnings */}
                <div className="space-y-6 flex flex-col">
                    <Card className="overflow-hidden border-border/50">
                        <div className="h-24 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border/50" />
                        <CardContent className="pt-0 relative">
                            <div className="flex justify-between items-start">
                                <Avatar className="w-20 h-20 border-4 border-background -mt-10 shadow-lg">
                                    <AvatarImage src={details?.profile_picture_url || undefined} className="object-cover" />
                                    <AvatarFallback className="text-lg bg-primary/20 text-primary font-bold">
                                        {user.full_name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="mt-4 flex flex-col items-end gap-2">
                                    {getRoleBadge(user.role)}
                                    {user.is_suspended && <Badge variant="destructive" className="animate-pulse">Askıya Alındı</Badge>}
                                </div>
                            </div>

                            <div className="mt-4 space-y-4">
                                <div className="space-y-1">
                                    <h3 className="font-semibold text-lg">{user.full_name}</h3>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Mail className="w-3.5 h-3.5" /> {user.email}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Phone className="w-3.5 h-3.5" /> {details?.phone_number || "Belirtilmemiş"}
                                    </div>
                                </div>

                                <Separator />

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Okul</span>
                                        <div className="text-sm font-medium leading-tight">{details?.school_name || "-"}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Şehir</span>
                                        <div className="text-sm font-medium leading-tight">{additional.city || "-"}</div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Warning Manager */}
                    <div className="flex-1">
                        <WarningManager user={user} />
                    </div>
                </div>

                {/* Right Column: Detailed Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* System Status Card */}
                    <Card className="border-border/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Sistem Durumu</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/10 border border-border/50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-background rounded-full border border-border/50">
                                            <Building2 className="w-4 h-4 text-primary" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground">
                                                {isCommitteeExecutive ? "Yönettiği Komite" : "Üye Olduğu Komite"}
                                            </div>
                                            <div className="text-sm font-medium">{activeCommittee?.name || "Atanmamış"}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/10 border border-border/50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-background rounded-full border border-border/50">
                                            <FileText className="w-4 h-4 text-primary" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground">Başvuru Durumu</div>
                                            <div className="text-sm font-medium capitalize">
                                                {application ? (
                                                    <Link href={`/admin/applications/${application.id}`} className="hover:underline flex items-center gap-1 group">
                                                        {application.status}
                                                        <ArrowUpRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                                                    </Link>
                                                ) : "Başvuru Yok"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/50 h-full">
                        <CardHeader>
                            <CardTitle>Detaylı Bilgiler</CardTitle>
                            <CardDescription>
                                {details ? "Kullanıcı tarafından sağlanan detaylı bilgiler." : "Kullanıcıya ait detaylı profil bilgisi bulunmamaktadır."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            {details ? (
                                <>
                                    {/* Academic & Personal */}
                                    <section className="space-y-4">
                                        <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground/80 pb-2 border-b border-border/50">
                                            <GraduationCap className="w-4 h-4 text-primary" /> Akademik & Kişisel
                                        </h4>
                                        <div className="grid sm:grid-cols-2 gap-y-4 gap-x-8">
                                            <div className="space-y-1">
                                                <span className="text-xs text-muted-foreground">Sınıf</span>
                                                <div className="text-sm font-medium">{additional.grade || "-"}</div>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-xs text-muted-foreground">Doğum Tarihi</span>
                                                <div className="text-sm font-medium">
                                                    {details.birth_date ? new Date(details.birth_date).toLocaleDateString('tr-TR', { dateStyle: 'long' }) : "-"}
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Experience */}
                                    {(additional.mun_experience || additional.english_level) && (
                                        <section className="space-y-4">
                                            <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground/80 pb-2 border-b border-border/50">
                                                <BookOpen className="w-4 h-4 text-primary" /> Deneyim & Tercihler
                                            </h4>
                                            <div className="grid sm:grid-cols-2 gap-y-4 gap-x-8">
                                                <div className="space-y-1">
                                                    <span className="text-xs text-muted-foreground">MUN Deneyimi</span>
                                                    <div className="text-sm font-medium">{additional.mun_experience || "-"}</div>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-xs text-muted-foreground">İngilizce Seviyesi</span>
                                                    <div className="text-sm font-medium capitalize">{additional.english_level || "-"}</div>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-xs text-muted-foreground">Delegasyon Türü</span>
                                                    <div className="text-sm font-medium capitalize">{additional.delegation_type || "-"}</div>
                                                </div>
                                            </div>
                                            {additional.previous_conferences && (
                                                <div className="space-y-1 mt-2">
                                                    <span className="text-xs text-muted-foreground">Önceki Konferanslar</span>
                                                    <div className="text-sm bg-muted/30 p-3 rounded-md leading-relaxed">
                                                        {additional.previous_conferences}
                                                    </div>
                                                </div>
                                            )}
                                        </section>
                                    )}

                                    {/* Motivation */}
                                    {(additional.reason_for_joining || additional.expectations) && (
                                        <section className="space-y-4">
                                            <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground/80 pb-2 border-b border-border/50">
                                                <FileText className="w-4 h-4 text-primary" /> Motivasyon
                                            </h4>

                                            {additional.reason_for_joining && (
                                                <div className="space-y-1">
                                                    <span className="text-xs text-muted-foreground">Katılım Nedeni</span>
                                                    <div className="text-sm bg-muted/30 p-3 rounded-md leading-relaxed whitespace-pre-wrap">
                                                        {additional.reason_for_joining}
                                                    </div>
                                                </div>
                                            )}

                                            {additional.expectations && (
                                                <div className="space-y-1">
                                                    <span className="text-xs text-muted-foreground">Beklentiler</span>
                                                    <div className="text-sm bg-muted/30 p-3 rounded-md leading-relaxed whitespace-pre-wrap">
                                                        {additional.expectations}
                                                    </div>
                                                </div>
                                            )}
                                        </section>
                                    )}
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-center">
                                    <div className="bg-secondary/30 p-4 rounded-full mb-3">
                                        <UserIcon className="w-8 h-8 opacity-50" />
                                    </div>
                                    <p>Bu kullanıcı için detaylı profil bilgisi bulunamadı.</p>
                                    <p className="text-xs opacity-70 mt-1">Genellikle Yönetici veya Personel hesaplarında bu durum normaldir.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <ManageUserDialog
                user={user}
                open={isManageOpen}
                onOpenChange={setIsManageOpen}
                onUpdateRole={(id, role) => updateRoleMutation.mutateAsync({ userId: id, newRole: role })}
                onToggleSuspend={(id, suspended) => suspendMutation.mutateAsync({ userId: id, isSuspended: suspended })}
                onDelete={(id) => deleteMutation.mutateAsync(id)}
            />
        </div>
    );
}