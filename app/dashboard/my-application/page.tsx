"use client";

import { useQuery } from "@tanstack/react-query";
import {
    FileText,
    User,
    MapPin,
    Phone,
    Calendar,
    GraduationCap,
    Globe,
    BookOpen,
    Target,
    ArrowLeft,
    School
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileData } from "@/types/dashboard";
import { Separator } from "@/components/ui/separator";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export default function MyApplicationPage() {
    const { data: profile, isLoading } = useQuery<ProfileData>({
        queryKey: ["profile"],
        queryFn: async () => {
            const res = await fetch("/api/participant/me");
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
    });

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto space-y-6 p-4">
                <div className="flex gap-4 mb-8">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-48" />
                </div>
                <Skeleton className="h-64 w-full rounded-xl" />
                <Skeleton className="h-96 w-full rounded-xl" />
            </div>
        );
    }

    if (!profile || !profile.userDetails) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
                <FileText className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <h2 className="text-xl font-bold">Başvuru Bulunamadı</h2>
                <p className="text-muted-foreground mt-2">Bu hesaba ait detaylı başvuru bilgisi bulunmamaktadır.</p>
                <Link href="/dashboard" className="mt-4">
                    <Button variant="outline">Panele Dön</Button>
                </Link>
            </div>
        );
    }

    const { user, userDetails, application } = profile;
    const info = userDetails.additional_info || {};

    const getLabel = (value: string | undefined, options: { value: string, label: string }[]) => {
        if (!value) return "-";
        return options.find(o => o.value === value)?.label || value;
    };

    const getStatusBadge = (status: string | undefined) => {
        switch (status) {
            case 'approved': return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">Onaylandı</Badge>;
            case 'rejected': return <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20">Reddedildi</Badge>;
            default: return <Badge className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border-yellow-500/20">Değerlendirmede</Badge>;
        }
    };

    const KOMITE_OPTIONS = [
        { value: "genel-kurul", label: "Birleşmiş Milletler Genel Kurulu" },
        { value: "guvenlik", label: "Güvenlik Konseyi" },
        { value: "ekonomik-sosyal", label: "Ekonomik ve Sosyal Konsey" },
        { value: "insan-haklari", label: "İnsan Hakları Konseyi" },
        { value: "tarihi", label: "Tarihî Komite" },
    ];

    const INGILIZCE_OPTIONS = [
        { value: "baslangic", label: "Başlangıç (A1-A2)" },
        { value: "orta", label: "Orta (B1-B2)" },
        { value: "ileri", label: "İleri (C1-C2)" },
        { value: "anadil", label: "Anadil" },
    ];

    const MUN_DENEYIMI_OPTIONS = [
        { value: "yok", label: "Deneyimim yok" },
        { value: "1-2", label: "1-2 konferans" },
        { value: "3-5", label: "3-5 konferans" },
        { value: "5+", label: "5'ten fazla konferans" },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in pb-12">
            <Breadcrumbs items={[{ label: "Profil", href: "/dashboard/profile" }, { label: "Başvurum" }]} />
            <div className="flex items-center gap-4">
                <Link href="/dashboard/profile">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold font-display">Başvuru Özeti</h1>
                    <p className="text-muted-foreground text-sm">Başvuru formunda ilettiğiniz bilgiler.</p>
                </div>
                <div className="ml-auto">
                    {getStatusBadge(application?.status)}
                </div>
            </div>

            {/* 1. Kimlik ve İletişim */}
            <Card className="border-border/50 shadow-sm">
                <CardHeader className="bg-muted/10 pb-4 border-b border-border/50">
                    <CardTitle className="text-base flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" /> Kimlik ve İletişim
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                    <InfoItem icon={User} label="Ad Soyad" value={user.full_name} />
                    <InfoItem icon={Calendar} label="Doğum Tarihi" value={new Date(userDetails.birth_date).toLocaleDateString('tr-TR')} />
                    <InfoItem icon={Phone} label="Telefon" value={userDetails.phone_number} />
                    <InfoItem icon={MapPin} label="Şehir" value={info.city} />
                    <InfoItem icon={School} label="Okul" value={userDetails.school_name} />
                    <InfoItem icon={GraduationCap} label="Sınıf" value={info.grade} />
                </CardContent>
            </Card>

            {/* 2. Deneyim ve Tercihler */}
            <Card className="border-border/50 shadow-sm">
                <CardHeader className="bg-muted/10 pb-4 border-b border-border/50">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Globe className="w-4 h-4 text-primary" /> Deneyim ve Tercihler
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InfoItem icon={BookOpen} label="İngilizce Seviyesi" value={getLabel(info.english_level, INGILIZCE_OPTIONS)} />
                        <InfoItem icon={Target} label="MUN Deneyimi" value={getLabel(info.mun_experience, MUN_DENEYIMI_OPTIONS)} />
                        <div className="md:col-span-2">
                            <Label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Komite Tercihleri</Label>
                            <div className="mt-2 flex flex-col sm:flex-row gap-3">
                                <Badge variant="outline" className="text-sm py-1 px-3 border-primary/20 bg-primary/5 text-foreground">
                                    1. {getLabel(info.committee_pref_1, KOMITE_OPTIONS)}
                                </Badge>
                                {info.committee_pref_2 && (
                                    <Badge variant="outline" className="text-sm py-1 px-3 border-border bg-muted/20 text-muted-foreground">
                                        2. {getLabel(info.committee_pref_2, KOMITE_OPTIONS)}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    {info.previous_conferences && (
                        <div className="bg-muted/20 p-4 rounded-lg border border-border/50">
                            <Label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-2 block">Önceki Konferanslar</Label>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{info.previous_conferences}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 3. Motivasyon */}
            <Card className="border-border/50 shadow-sm">
                <CardHeader className="bg-muted/10 pb-4 border-b border-border/50">
                    <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" /> Motivasyon
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <TextSection label="Katılım Nedeni" content={info.reason_for_joining} />
                    <Separator />
                    <TextSection label="Beklentiler" content={info.expectations} />
                    <Separator />
                    <TextSection label="Kendini Tanıtma" content={info.self_introduction} />
                </CardContent>
            </Card>
        </div>
    );
}

function InfoItem({ icon: Icon, label, value }: { icon: any, label: string, value: string | undefined }) {
    return (
        <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <Icon className="w-3.5 h-3.5" />
                {label}
            </div>
            <div className="text-base font-medium">{value || "-"}</div>
        </div>
    );
}

function Label({ children, className }: { children: React.ReactNode, className?: string }) {
    return <div className={className}>{children}</div>;
}

function TextSection({ label, content }: { label: string, content: string | undefined }) {
    return (
        <div className="space-y-2">
            <Label className="text-primary font-semibold">{label}</Label>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {content || "Belirtilmemiş."}
            </p>
        </div>
    );
}

// Change Log:
// - Created new page `app/dashboard/my-application/page.tsx` for read-only view of application data.
// - Implemented structured display for all form sections.