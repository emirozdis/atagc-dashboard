"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { AlertTriangle, Bell, CalendarDays, EyeOff, FileText, Globe, Laptop, LogOut, Mail, MapPin, Phone, QrCode, School, Shield, Smartphone, Trash2, UserPlus, Users } from "lucide-react";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { DigitalIdCard } from "@/components/dashboard/DigitalIdCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { ProfileData } from "@/types/dashboard";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type DeviceSession = {
  id: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
  deviceInfo: { browser: string; os: string; type: string; model?: string };
};

type NotificationPrefs = { application: boolean; committee: boolean; social: boolean; system: boolean };

const roleLabels: Record<string, string> = {
  applicant: "Applicant",
  delegate: "Delegate",
  committee_chairman: "Chairboard",
  chair: "Chairboard",
  press: "Press",
  head_press: "Head of Press",
  observer: "Observer",
  head_observer: "Head Observer",
  security: "Security",
  head_security: "Head of Security",
  admin: "Site Admin",
  superadmin: "Super Admin",
};

const gradeLabels: Record<string, string> = {
  prep: "Preparation",
  "9": "9th grade",
  "10": "10th grade",
  "11": "11th grade",
  "12": "12th grade",
  university: "University",
  graduate: "Graduate",
};

function firstApplicationValue(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function ProfileView() {
  const queryClient = useQueryClient();
  const [digitalIdOpen, setDigitalIdOpen] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>({ application: true, committee: true, social: true, system: true });
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteCooldown, setDeleteCooldown] = useState(3);
  const { data: profileData, isLoading } = useQuery<ProfileData>({
    queryKey: ["profile"],
    queryFn: async () => {
      const response = await fetch("/api/participant/me");
      if (!response.ok) throw new Error("Unable to load profile.");
      return response.json();
    },
  });
  const { data: devices = [], isLoading: devicesLoading } = useQuery<DeviceSession[]>({
    queryKey: ["devices"],
    queryFn: async () => {
      const response = await fetch("/api/auth/devices");
      if (!response.ok) throw new Error("Unable to load sessions.");
      return response.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const response = await fetch("/api/participant/me", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error("Unable to update your profile.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to update your profile."),
  });
  const revokeMutation = useMutation({
    mutationFn: async (sessionId?: string) => {
      const response = await fetch(`/api/auth/devices?${sessionId ? `id=${sessionId}` : "type=all_others"}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to revoke session.");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["devices"] }); toast.success("Session access updated."); },
    onError: () => toast.error("Unable to update sessions."),
  });
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/participant/me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: deleteConfirmation }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to delete your account.");
    },
    onSuccess: async () => {
      await signOut({ callbackUrl: "/" });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to delete your account."),
  });

  useEffect(() => {
    if (!deleteDialogOpen) return;
    const interval = window.setInterval(() => {
      setDeleteCooldown((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [deleteDialogOpen]);

  if (isLoading) return <ProfileSkeleton />;
  const profile = profileData?.profile;
  if (!profile) return <div className="p-8 text-center text-[#FDA4AF]">Unable to load profile.</div>;

  const details = profile.details;
  const application = profileData.application;
  const savedPrefs = details?.notification_preferences as NotificationPrefs | undefined;
  const notificationPrefs = savedPrefs || prefs;
  const profilePic = details?.profile_picture_url || null;
  const applicationData = application?.form_data || {};
  const applicationSchool = firstApplicationValue(applicationData, ["school", "schoolName", "school_name", "schoolOrOrganization"]);
  const applicationGrade = firstApplicationValue(applicationData, ["grade", "gradeOrYear", "year"]);
  const schoolName = details?.high_schools?.school_name || details?.school_name || details?.school || details?.additional_info?.manual_school_name || applicationSchool || "Not specified";
  const gradeValue = details?.grade || applicationGrade;
  const gradeLabel = gradeValue ? gradeLabels[gradeValue] || gradeValue : "Not specified";
  const showIdCard = profile.role !== "applicant" || application?.status === "approved" || application?.status === "accepted";
  const updatePreference = (key: keyof NotificationPrefs, value: boolean) => {
    const next = { ...(savedPrefs || prefs), [key]: value };
    setPrefs(next);
    updateMutation.mutate({ notification_preferences: next });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-5 pb-12 sm:p-8">
      <div><p className="text-sm text-[#C4B5FD]">Account</p><h1 className="mt-2 text-3xl font-semibold">Profile</h1><p className="mt-2 text-[#9CA3AF]">Manage your participant profile, privacy, and active sessions.</p></div>

      <Card className="overflow-hidden border-white/10 bg-[#12101A]">
        <div className="h-24 bg-gradient-to-r from-[#7C3AED]/25 via-[#7C3AED]/10 to-transparent" />
        <CardContent className="relative px-6 pb-6 pt-0"><div className="-mt-10 flex flex-col items-start gap-5 sm:flex-row sm:items-end"><AvatarUpload currentImageUrl={profilePic} onUploadComplete={(url) => updateMutation.mutate({ profile_picture_url: url })} size="large" fallbackText={profile.full_name} /><div className="flex-1"><div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-semibold">{profile.full_name}</h2><Badge className="border-[#C4B5FD]/20 bg-[#C4B5FD]/10 text-[#C4B5FD]">{roleLabels[profile.role] || profile.role}</Badge></div><div className="mt-2 flex flex-wrap gap-4 text-sm text-[#9CA3AF]"><span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{profile.email}</span><span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Joined {new Date(profile.created_at).toLocaleDateString("en-GB")}</span></div></div>{application && <Button asChild variant="outline" className="border-white/10 text-[#C3C7D1] hover:bg-white/5"><Link href="/my-applications"><FileText className="mr-2 h-4 w-4" />My applications</Link></Button>}</div></CardContent>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="space-y-6">
          <Card className="border-white/10 bg-[#12101A]"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5 text-[#C4B5FD]" />Personal information</CardTitle></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2"><InfoItem icon={Phone} label="Phone" value={details?.phone_number} /><InfoItem icon={School} label="School" value={schoolName} /><InfoItem icon={MapPin} label="City" value={details?.city} /><InfoItem icon={FileText} label="Grade" value={gradeLabel} /></CardContent></Card>

          {profile.user_warnings && profile.user_warnings.length > 0 && <Card className="border-[#FDE68A]/20 bg-[#12101A]"><CardHeader><CardTitle className="text-lg text-[#FDE68A]">Warnings</CardTitle></CardHeader><CardContent className="space-y-3">{profile.user_warnings.map((warning) => <div key={warning.id} className="rounded-xl border border-[#FDE68A]/15 bg-[#FDE68A]/5 p-4"><div className="flex justify-between gap-3 text-xs text-[#9CA3AF]"><span>Conference record</span><span>{new Date(warning.created_at).toLocaleDateString("en-GB")}</span></div><p className="mt-2 text-sm text-[#F5F3FF]">{warning.reason}</p></div>)}</CardContent></Card>}

          <Card className="border-white/10 bg-[#12101A]"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Shield className="h-5 w-5 text-[#C4B5FD]" />Privacy</CardTitle></CardHeader><CardContent className="space-y-4"><ToggleRow icon={UserPlus} label="Connection requests" description="Allow other participants to send you connection requests." checked={details?.allow_connections !== false} onChange={(value) => updateMutation.mutate({ allow_connections: value })} /><ToggleRow icon={EyeOff} label="Profile photo visibility" description="Hide your profile photo from other participants." checked={details?.is_profile_picture_hidden === true} onChange={(value) => updateMutation.mutate({ is_profile_picture_hidden: value })} /></CardContent></Card>

          <Card className="border-white/10 bg-[#12101A]"><CardHeader><div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2 text-lg"><Globe className="h-5 w-5 text-[#C4B5FD]" />Active sessions</CardTitle>{devices.length > 1 && <Button variant="ghost" size="sm" onClick={() => revokeMutation.mutate()} className="text-xs text-[#FDA4AF] hover:bg-[#FDA4AF]/10">Sign out other sessions</Button>}</div></CardHeader><CardContent className="space-y-2">{devicesLoading ? <Skeleton className="h-12 w-full" /> : devices.map((device) => <div key={device.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"><div className="flex min-w-0 items-center gap-3"><div className="rounded-lg bg-[#C4B5FD]/10 p-2 text-[#C4B5FD]">{device.deviceInfo.type === "mobile" ? <Smartphone className="h-4 w-4" /> : <Laptop className="h-4 w-4" />}</div><div className="min-w-0"><p className="text-sm font-medium">{device.isCurrent ? "Current session" : `${device.deviceInfo.os} · ${device.deviceInfo.browser}`}</p><p className="truncate text-xs text-[#9CA3AF]">{device.isCurrent ? `${device.deviceInfo.os} · ${device.deviceInfo.browser} · This device` : `${device.ip} · Last active: ${new Date(device.lastActive).toLocaleDateString("en-GB")}`}</p>{device.isCurrent && <p className="truncate text-xs text-[#9CA3AF]">{device.ip} · Last active: {new Date(device.lastActive).toLocaleDateString("en-GB")}</p>}</div></div>{!device.isCurrent && <Button variant="ghost" size="icon" onClick={() => revokeMutation.mutate(device.id)} aria-label="Revoke session" className="text-[#9CA3AF] hover:text-[#FDA4AF]"><LogOut className="h-4 w-4" /></Button>}</div>)}</CardContent></Card>
        </div>

        <div className="space-y-6"><Card className="border-white/10 bg-[#12101A]"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Bell className="h-5 w-5 text-[#C4B5FD]" />Email notifications</CardTitle></CardHeader><CardContent className="space-y-4"><Preference label="Application updates" checked={notificationPrefs.application} onChange={(value) => updatePreference("application", value)} /><Preference label="Committee announcements" checked={notificationPrefs.committee} onChange={(value) => updatePreference("committee", value)} /><Preference label="Connection requests" checked={notificationPrefs.social} onChange={(value) => updatePreference("social", value)} /><Preference label="System notifications" checked={notificationPrefs.system} onChange={(value) => updatePreference("system", value)} /></CardContent></Card>{showIdCard && <div><DigitalIdCard user={profile} defaultOpen={digitalIdOpen} /><button type="button" onClick={() => setDigitalIdOpen((value) => !value)} className="mt-3 inline-flex items-center gap-2 text-sm text-[#C4B5FD] hover:text-white"><QrCode className="h-4 w-4" />{digitalIdOpen ? "Close digital ID" : "Open digital ID"}</button></div>}<Card className="border-[#FDA4AF]/20 bg-[#160F17]"><CardHeader><CardTitle className="flex items-center gap-2 text-lg text-[#FDA4AF]"><AlertTriangle className="h-5 w-5" />Delete account</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm leading-6 text-[#C3C7D1]">This permanently removes your account, applications, profile, and conference records. This cannot be undone.</p><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><Input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder="Type DELETE" className="w-full min-w-0 flex-1 border-[#FDA4AF]/20 bg-black/20 sm:max-w-md" aria-label="Delete account confirmation" /><Button type="button" disabled={deleteConfirmation !== "DELETE" || deleteMutation.isPending} onClick={() => { setDeleteCooldown(3); setDeleteDialogOpen(true); }} className="shrink-0 bg-[#BE123C] text-white hover:bg-[#9F1239]"><Trash2 className="mr-2 h-4 w-4" />Delete account</Button></div></CardContent></Card></div>
      </div>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="border-[#FDA4AF]/30 bg-[#160F17] text-[#F5F3FF]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#FDA4AF]">MAKE SURE YOU UNDERSTAND</AlertDialogTitle>
            <AlertDialogDescription className="text-[#C3C7D1]">Deleting your account permanently removes your applications, profile, delegation membership, and conference records. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-xl border border-[#FDA4AF]/20 bg-[#BE123C]/10 p-4 text-sm text-[#FECACA]">Please wait three seconds before confirming this permanent action.</div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Keep my account</AlertDialogCancel>
            <AlertDialogAction disabled={deleteCooldown > 0 || deleteMutation.isPending} className="bg-[#BE123C] text-white hover:bg-[#9F1239]" onClick={() => deleteMutation.mutate()}>{deleteMutation.isPending ? "Deleting…" : deleteCooldown > 0 ? "Delete account (" + deleteCooldown + ")" : "I understand — delete account"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
function InfoItem({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value?: string | null }) { return <div className="flex items-start gap-3"><div className="rounded-lg bg-[#C4B5FD]/10 p-2 text-[#C4B5FD]"><Icon className="h-4 w-4" /></div><div><p className="text-xs uppercase tracking-[0.14em] text-[#9CA3AF]">{label}</p><p className="mt-1 text-sm text-[#F5F3FF]">{value || "Not specified"}</p></div></div>; }
function ToggleRow({ icon: Icon, label, description, checked, onChange }: { icon: typeof UserPlus; label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) { return <div className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4"><div className="flex items-start gap-3"><Icon className="mt-0.5 h-4 w-4 text-[#C4B5FD]" /><div><p className="text-sm font-medium">{label}</p><p className="mt-1 text-xs text-[#9CA3AF]">{description}</p></div></div><Switch checked={checked} onCheckedChange={onChange} /></div>; }
function Preference({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <div className="flex items-center justify-between gap-3"><span className="text-sm text-[#C3C7D1]">{label}</span><Switch checked={checked} onCheckedChange={onChange} /></div>; }
function ProfileSkeleton() { return <div className="mx-auto max-w-6xl space-y-6 p-5 sm:p-8"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full rounded-3xl" /><div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-80 w-full rounded-3xl" /><Skeleton className="h-80 w-full rounded-3xl" /></div></div>; }
