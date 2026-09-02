"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
    Loader2,
    Save,
    ShieldAlert,
    Mail,
    Calendar,
    AlertTriangle,
    MapPin,
    Building,
    Globe,
    Clock,
    CreditCard
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

interface SystemSettings {
    applications_open: boolean;
    maintenance_mode: boolean;
    gallery_enabled: boolean;
    term_name: string;
    contact_email: string;
    location: string;
    event_start_date: string | null;
    event_end_date: string | null;
    bank_name: string;
    bank_account_holder: string;
    bank_iban: string;
}

export default function SettingsPage() {
    const queryClient = useQueryClient();
    const [editedSettings, setEditedSettings] = useState<SystemSettings | null>(null);

    // Query
    const { data: settings, isLoading } = useQuery<SystemSettings>({
        queryKey: ['settings-admin'],
        queryFn: async () => {
            const res = await fetch("/api/admin/settings");
            if (!res.ok) throw new Error("Failed");
            const data = await res.json();
            return {
                ...data,
                event_start_date: data.event_start_date ? data.event_start_date.split('T')[0] : "",
                event_end_date: data.event_end_date ? data.event_end_date.split('T')[0] : ""
            };
        }
    });

    // Use the query result until the first edit, then keep edits local.
    const localSettings = editedSettings ?? settings ?? null;

    // Mutation
    const saveMutation = useMutation({
        mutationFn: async (newSettings: SystemSettings) => {
            const res = await fetch("/api/admin/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newSettings),
            });
            if (!res.ok) throw new Error("Failed");
        },
        onSuccess: () => {
            toast.success("Settings saved successfully");
            queryClient.invalidateQueries({ queryKey: ['settings-admin'] });
        },
        onError: () => toast.error("Changes could not be saved.")
    });

    const handleSave = () => {
        if (localSettings) {
            saveMutation.mutate(localSettings);
        }
    };

    const updateSetting = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
        if (localSettings) {
            setEditedSettings({ ...localSettings, [key]: value });
        }
    };

    if (isLoading || !localSettings) {
        return (
            <div className="mx-auto max-w-7xl space-y-8 p-5 pb-12 animate-fade-in sm:p-8">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-[200px]" />
                    <Skeleton className="h-10 w-[150px]" />
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-[250px] w-full rounded-xl" />
                    <Skeleton className="h-[250px] w-full rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl space-y-8 p-5 pb-12 animate-fade-in sm:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
                        Conference settings
                    </h2>
                    <p className="text-muted-foreground mt-1 text-lg">
                    Configure platform settings and access controls.
                    </p>
                </div>
                <Button onClick={handleSave} disabled={saveMutation.isPending} size="lg" >
                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save changes
                </Button>
            </div>

            <div className="grid gap-8">

                {/* General Info */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-semibold tracking-wide uppercase text-xs">
                        <Globe className="w-4 h-4" /> General information
                    </div>
                    <Card className="bg-card border-border/50 shadow-sm overflow-hidden">
                        <CardHeader className="bg-muted/5 pb-4 border-b border-border/50">
                            <CardTitle className="text-xl">Conference identity</CardTitle>
                            <CardDescription>Conference name, contact details, and basic information.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                                <div className="space-y-3">
                                    <Label className="flex items-center gap-2 text-base font-medium">
                                        <Building className="w-4 h-4 text-muted-foreground" />
                                        Event name
                                    </Label>
                                    <Input
                                        value={localSettings.term_name}
                                        onChange={(e) => updateSetting('term_name', e.target.value)}
                                        placeholder="Example: RavenMUN 2026"
                                        className="bg-background/50 h-11 text-lg"
                                    />
                                    <p className="text-[13px] text-muted-foreground">Shown in dashboard headings.</p>
                                </div>

                                <div className="space-y-3">
                                    <Label className="flex items-center gap-2 text-base font-medium">
                                        <Mail className="w-4 h-4 text-muted-foreground" />
                                        Contact email
                                    </Label>
                                    <Input
                                        value={localSettings.contact_email}
                                        onChange={(e) => updateSetting('contact_email', e.target.value)}
                                        placeholder="ravenmun26@gmail.com"
                                        type="email"
                                        className="bg-background/50 h-11"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* Event Details */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-semibold tracking-wide uppercase text-xs">
                        <Calendar className="w-4 h-4" /> Event details
                    </div>
                    <Card className="bg-card border-border/50 shadow-sm overflow-hidden">
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-3">
                                <Label className="flex items-center gap-2 text-base font-medium">
                                    <MapPin className="w-4 h-4 text-muted-foreground" />
                                    Venue / campus
                                </Label>
                                <Input
                                    value={localSettings.location}
                                    onChange={(e) => updateSetting('location', e.target.value)}
                                        placeholder="Narlıdere Uğur Okulları Kampüsü"
                                    className="bg-background/50 h-11"
                                />
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label className="flex items-center gap-2 text-base font-medium">
                                        <Clock className="w-4 h-4 text-muted-foreground" />
                                        Start date
                                    </Label>
                                    <Input
                                        type="date"
                                        value={localSettings.event_start_date || ""}
                                        onChange={(e) => updateSetting('event_start_date', e.target.value)}
                                        className="bg-background/50 h-11 w-full block"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <Label className="flex items-center gap-2 text-base font-medium">
                                        <Clock className="w-4 h-4 text-muted-foreground" />
                                        End date
                                    </Label>
                                    <Input
                                        type="date"
                                        value={localSettings.event_end_date || ""}
                                        onChange={(e) => updateSetting('event_end_date', e.target.value)}
                                        className="bg-background/50 h-11 w-full block"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* Payment Info */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-semibold tracking-wide uppercase text-xs">
                        <CreditCard className="w-4 h-4" /> Bank details
                    </div>
                    <Card className="bg-card border-border/50 shadow-sm overflow-hidden">
                        <CardHeader className="bg-muted/5 pb-4 border-b border-border/50">
                            <CardTitle className="text-xl">Bank account details</CardTitle>
                            <CardDescription>Information participants see on the payment page.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label>Bank name</Label>
                                    <Input
                                        value={localSettings.bank_name}
                                        onChange={(e) => updateSetting('bank_name', e.target.value)}
                                        placeholder="For example: Bank name"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <Label>Recipient name (account holder)</Label>
                                    <Input
                                        value={localSettings.bank_account_holder}
                                        onChange={(e) => updateSetting('bank_account_holder', e.target.value)}
                                        placeholder="Example: RavenMUN Organizing Committee"
                                    />
                                </div>
                                <div className="space-y-3 md:col-span-2">
                                    <Label>IBAN</Label>
                                    <Input
                                        value={localSettings.bank_iban}
                                        onChange={(e) => updateSetting('bank_iban', e.target.value)}
                                        placeholder="TR00 ..."
                                        className="font-mono"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* Access Control */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-semibold tracking-wide uppercase text-xs">
                        <ShieldAlert className="w-4 h-4" /> Security and access
                    </div>
                    <Card className="bg-card border-border/50 shadow-sm overflow-hidden">
                        <CardContent className="p-0">
                            <div className="flex flex-col divide-y divide-border/50">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 gap-4 hover:bg-muted/5 transition-colors">
                                    <div className="space-y-1.5 flex-1">
                                        <div className="flex items-center gap-3">
                                            <Label className="text-base font-semibold cursor-pointer" htmlFor="apps-switch">Applications open</Label>
                                            {localSettings.applications_open ? (
                                                <span className="text-[10px] font-bold text-green-600 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">OPEN</span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">CLOSED</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                                            When disabled, new users cannot register or submit applications.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-muted-foreground">{localSettings.applications_open ? "Open" : "Closed"}</span>
                                        <Switch
                                            id="apps-switch"
                                            checked={localSettings.applications_open}
                                            onCheckedChange={(checked) => updateSetting('applications_open', checked)}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 gap-4 hover:bg-muted/5 transition-colors">
                                    <div className="space-y-1.5 flex-1">
                                        <div className="flex items-center gap-3">
                                            <Label className="text-base font-semibold cursor-pointer" htmlFor="gallery-switch">Photo gallery</Label>
                                            {localSettings.gallery_enabled ? (
                                                <span className="text-[10px] font-bold text-green-600 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">OPEN</span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">CLOSED</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                                            When disabled, the photo gallery is unavailable to all users.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-muted-foreground">{localSettings.gallery_enabled ? "Open" : "Closed"}</span>
                                        <Switch
                                            id="gallery-switch"
                                            checked={localSettings.gallery_enabled}
                                            onCheckedChange={(checked) => updateSetting('gallery_enabled', checked)}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 gap-4 bg-red-500/5 hover:bg-red-500/10 transition-colors">
                                    <div className="space-y-1.5 flex-1">
                                        <div className="flex items-center gap-3">
                                            <AlertTriangle className="w-5 h-5 text-red-500" />
                                            <Label className="text-base font-semibold text-red-600 cursor-pointer" htmlFor="maintenance-switch">Maintenance mode</Label>
                                            {localSettings.maintenance_mode && <span className="animate-pulse text-[10px] font-bold text-red-600 bg-red-500/20 px-2 py-0.5 rounded border border-red-500/30">ACTIVE</span>}
                                        </div>
                                        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                                            When enabled, only administrators can sign in.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-muted-foreground">{localSettings.maintenance_mode ? "Active" : "Inactive"}</span>
                                        <Switch
                                            id="maintenance-switch"
                                            className="data-[state=checked]:bg-red-500"
                                            checked={localSettings.maintenance_mode}
                                            onCheckedChange={(checked) => updateSetting('maintenance_mode', checked)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>
            </div>
        </div>
    );
}
