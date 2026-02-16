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
    MoreVertical,
    FileText,
    Building2,
    ArrowUpRight,
    CreditCard,
    CheckCircle2,
    Clock,
    XCircle,
    Wallet,
    UploadCloud,
    UserIcon,
    MapPin
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
import { PaymentReviewDialog } from "@/components/admin/PaymentReviewDialog";
import { cn } from "@/lib/utils";
import { AdminPaymentUploadDialog } from "@/components/admin/AdminPaymentUploadDialog";
import { ROLES, ROLE_METADATA, UserRole } from "@/lib/roles";
import { GRADE_OPTIONS } from "@/lib/constants";

export default function UserDetailPage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const id = params.id as string;
    const [isManageOpen, setIsManageOpen] = useState(false);
    const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
    const [isUploadReceiptOpen, setIsUploadReceiptOpen] = useState(false);

    const { data: user, isLoading, error } = useQuery<User>({
        queryKey: ['user', id],
        queryFn: async () => {
            const res = await fetch(`/api/admin/users/${id}`);
            if (!res.ok) throw new Error("User not found");
            return res.json();
        }
    });

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
            <div className="space-y-6 max-w-7xl mx-auto pb-12">
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
    
    const managedCommittee = user.managed_committees?.[0];
    const memberCommittee = user.committee_members?.[0]?.committee;
    const activeCommittee = managedCommittee || memberCommittee;
    const isCommitteeExecutive = user.role === ROLES.CHAIRMAN || user.role === ROLES.DEPUTY_CHAIR;

    const application = getFirstItem(user.application);
    const paymentStatus = application?.payment_status || "unpaid";

    const appForm = Array.isArray(application?.form) ? application.form[0] : application?.form;
    const formSlug = appForm?.slug || ROLES.DELEGATE;
    const formData = application?.form_data || {};

    const handlePaymentClick = () => {
        const receiptId = user.payment_receipts?.[0]?.id;
        if (receiptId) {
            setSelectedReceiptId(receiptId);
        } else {
            if (paymentStatus !== 'unpaid') {
                router.push(`/admin/payments?search=${user.email}`);
            }
        }
    };

    const getRoleBadge = (role: string) => {
        const meta = ROLE_METADATA[role as UserRole] || ROLE_METADATA[ROLES.APPLICANT];
        const Icon = meta.icon;

        return (
            <Badge className={cn(meta.bgClass, meta.colorClass, meta.borderClass)}>
                <Icon className="w-3 h-3 mr-1" /> {meta.label}
            </Badge>
        );
    };

    const getPaymentStatusDisplay = (status: string) => {
        switch (status) {
            case 'paid':
                return (
                    <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                        <CheckCircle2 className="w-4 h-4" /> Ödendi
                    </div>
                );
            case 'processing':
                return (
                    <div className="flex items-center gap-1.5 text-amber-600 font-medium">
                        <Clock className="w-4 h-4 animate-pulse" /> İnceleniyor
                    </div>
                );
            case 'rejected':
                return (
                    <div className="flex items-center gap-1.5 text-red-600 font-medium">
                        <XCircle className="w-4 h-4" /> Reddedildi
                    </div>
                );
            default:
                return (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Wallet className="w-4 h-4" /> Ödenmedi
                    </div>
                );
        }
    };

    const getFieldLabel = (key: string) => {
        if (appForm?.steps) {
            for (const step of appForm.steps) {
                if (step.fields) {
                    const field = step.fields.find((f: any) => f.id === key);
                    if (field) return field.label;
                }
            }
        }
        return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const gradeLabel = details?.grade ? GRADE_OPTIONS.find(opt => opt.value === details.grade)?.label : null;

    const renderDynamicData = () => {
        if (!formData || Object.keys(formData).length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-center">
                    <div className="bg-secondary/30 p-4 rounded-full mb-3">
                        <FileText className="w-8 h-8 opacity-50" />
                    </div>
                    <p>Bu kullanıcı için form verisi bulunamadı.</p>
                </div>
            );
        }

        return (
            <div className="grid gap-6">
                {Object.entries(formData).map(([key, value]) => {
                    if (['phone_number', 'school_name', 'birth_date', 'grade', 'city'].includes(key)) return null;

                    return (
                        <div key={key} className="space-y-1.5">
                            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-primary/50" />
                                {getFieldLabel(key)}
                            </span>
                            <div className="text-sm bg-muted/20 p-3 rounded-lg border border-border/50 text-foreground/90 whitespace-pre-wrap">
                                {String(value || "-")}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12 max-w-7xl mx-auto">
            <Breadcrumbs items={[{ label: "Kullanıcılar", href: "/admin/users" }, { label: "Kullanıcı Detayı" }]} />

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
                                        <div className="text-sm font-medium leading-tight line-clamp-2" title={details?.school_name}>{details?.school_name || "-"}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Şehir</span>
                                        <div className="text-sm font-medium leading-tight">{details?.city || "-"}</div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                {/* Committee Block - Only for Delegates or Staff */}
                                {(user.role !== ROLES.APPLICANT || formSlug === ROLES.DELEGATE) && (
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/10 border border-border/50">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-background rounded-full border border-border/50">
                                                <Building2 className="w-4 h-4 text-primary" />
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted-foreground">
                                                    {isCommitteeExecutive ? "Yönettiği Komite" : "Komite"}
                                                </div>
                                                <div className="text-sm font-medium">{activeCommittee?.name || "Atanmamış"}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

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

                                <div className="col-span-1 sm:col-span-2 flex items-center justify-between p-3 rounded-lg bg-secondary/10 border border-border/50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-background rounded-full border border-border/50">
                                            <CreditCard className="w-4 h-4 text-primary" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground">Ödeme Durumu</div>
                                            <div
                                                onClick={handlePaymentClick}
                                                className={cn(
                                                    "text-sm flex items-center gap-1.5 group",
                                                    paymentStatus !== 'unpaid' && "cursor-pointer"
                                                )}
                                            >
                                                {getPaymentStatusDisplay(paymentStatus)}
                                                {paymentStatus !== 'unpaid' && (
                                                    <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-all" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {(paymentStatus === 'unpaid' || paymentStatus === 'rejected') && (
                                        <Button size="sm" variant="outline" className="h-8 text-xs gap-2" onClick={() => setIsUploadReceiptOpen(true)}>
                                            <UploadCloud className="w-3 h-3" />
                                            Dekont Yükle
                                        </Button>
                                    )}
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
                                    <section className="space-y-4">
                                        <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground/80 pb-2 border-b border-border/50">
                                            <GraduationCap className="w-4 h-4 text-primary" /> Akademik & Kişisel
                                        </h4>
                                        <div className="grid sm:grid-cols-2 gap-y-4 gap-x-8">
                                            <div className="space-y-1">
                                                <span className="text-xs text-muted-foreground">Sınıf</span>
                                                <div className="text-sm font-medium">{gradeLabel || "-"}</div>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-xs text-muted-foreground">Doğum Tarihi</span>
                                                <div className="text-sm font-medium">
                                                    {details.birth_date ? new Date(details.birth_date).toLocaleDateString('tr-TR', { dateStyle: 'long' }) : "-"}
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground/80 pb-2 border-b border-border/50">
                                            <FileText className="w-4 h-4 text-primary" /> Başvuru Cevapları
                                        </h4>
                                        {renderDynamicData()}
                                    </section>
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

            <PaymentReviewDialog
                paymentId={selectedReceiptId}
                open={!!selectedReceiptId}
                onOpenChange={(open) => !open && setSelectedReceiptId(null)}
            />

            <AdminPaymentUploadDialog
                userId={user.id}
                userFullName={user.full_name}
                open={isUploadReceiptOpen}
                onOpenChange={setIsUploadReceiptOpen}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['user', id] });
                    queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
                    queryClient.invalidateQueries({ queryKey: ['admin-payments-stats'] });
                }}
            />
        </div>
    );
}