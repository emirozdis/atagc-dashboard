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
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileData } from "@/types/dashboard";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { GRADE_OPTIONS } from "@/lib/constants";
import { FormField, FormFieldOption } from "@/types/application";
import { useRouter } from "next/navigation";

const iconMap: Record<string, React.ElementType> = {
    phone_number: Phone,
    high_school_id: School,
    school_name: School, 
    grade: GraduationCap,
    city: MapPin,
    birth_date: Calendar,
    english_level: BookOpen,
    mun_experience: Target,
    committee_pref_1: Globe,
    committee_pref_2: Globe,
    reason_for_joining: FileText,
    expectations: FileText,
    self_introduction: FileText,
};

export default function SharedMyApplicationPage() {
    const router = useRouter();

    const { data: profileData, isLoading } = useQuery<ProfileData>({
        queryKey: ["profile"],
        queryFn: async () => {
            const res = await fetch("/api/participant/me");
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
    });

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto space-y-6 pb-12">
                <div className="flex gap-4 mb-8">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-48" />
                </div>
                <Skeleton className="h-64 w-full rounded-xl" />
                <Skeleton className="h-96 w-full rounded-xl" />
            </div>
        );
    }

    const { profile, application } = profileData || {};
    const details = profile?.details;

    if (!profile || !application?.form?.steps) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
                <FileText className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <h2 className="text-xl font-bold">Başvuru Bulunamadı</h2>
                <p className="text-muted-foreground mt-2">Bu hesaba ait detaylı başvuru bilgisi bulunmamaktadır.</p>
                <Button variant="outline" className="mt-4" onClick={() => router.back()}>Geri Dön</Button>
            </div>
        );
    }
    
    const info = (details?.additional_info || {}) as Record<string, any>;

    const getFieldValue = (field: FormField) => {
        const mapKey = field.system_map;

        if (mapKey) {
            if (mapKey === 'high_school_id' || mapKey === 'school_name') {
                return (details as any)?.high_schools?.school_name || info.manual_school_name;
            }

            const staticColumns = ['phone_number', 'birth_date', 'city', 'grade'];
            if (staticColumns.includes(mapKey)) {
                return (details as any)[mapKey];
            }
            return info[mapKey];
        }

        return application?.form_data?.[field.id];
    };

    const getDisplayValue = (field: FormField, value: any): string => {
        if (value === null || value === undefined || value === "") return "-";
        
        if (field.type === 'select') {
            if (field.id === 'grade' || field.system_map === 'grade') {
                return GRADE_OPTIONS.find(o => o.value === value)?.label || String(value);
            }
            const option = field.options?.find((o: FormFieldOption) => o.value === value);
            return option?.label || String(value);
        }
        if (field.type === 'date') {
            try {
                return new Date(value).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
            } catch {
                return String(value);
            }
        }
        return String(value);
    };

    const getStatusBadge = (status: string | undefined) => {
        switch (status) {
            case 'approved': return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">Onaylandı</Badge>;
            case 'rejected': return <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20">Reddedildi</Badge>;
            default: return <Badge className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border-yellow-500/20">Değerlendirmede</Badge>;
        }
    };
    
    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in pb-12">
            <Breadcrumbs items={[{ label: "Profil", href: "/profile" }, { label: "Başvurum" }]} />
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold font-display">Başvuru Özeti</h1>
                    <p className="text-muted-foreground text-sm">Başvuru formunda ilettiğiniz bilgiler.</p>
                </div>
                <div className="ml-auto">
                    {getStatusBadge(application?.status)}
                </div>
            </div>

            {application.form.steps.map((step) => (
                <Card key={step.id} className="border-border/50 shadow-sm">
                    <CardHeader className="bg-muted/10 pb-4 border-b border-border/50">
                        <CardTitle className="text-base flex items-center gap-2">
                           {step.title}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            {step.fields.map((field) => {
                                const value = getFieldValue(field);
                                const displayValue = getDisplayValue(field, value);
                                const Icon = iconMap[field.system_map || field.id] || FileText;

                                if (field.type === 'textarea') {
                                    return (
                                        <div key={field.id} className="md:col-span-2 space-y-2">
                                            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                <Icon className="w-3.5 h-3.5" />
                                                {field.label}
                                            </div>
                                            <p className="text-sm leading-relaxed text-foreground/90 bg-secondary/5 p-4 rounded-lg border border-border/40 whitespace-pre-wrap">
                                                {displayValue}
                                            </p>
                                        </div>
                                    );
                                }
                                
                                return (
                                    <InfoItem 
                                        key={field.id}
                                        icon={Icon} 
                                        label={field.label} 
                                        value={displayValue} 
                                    />
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            ))}
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