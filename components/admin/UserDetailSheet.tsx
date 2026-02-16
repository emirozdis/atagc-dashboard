"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User as UserIcon,
  Mail,
  Phone,
  GraduationCap,
  Calendar,
  MapPin,
  Building2,
  Shield,
  FileText,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";
import { User, UserDetail } from "@/types/user";
import { GRADE_OPTIONS } from "@/lib/constants";

interface UserDetailSheetProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserDetailSheet({ user, open, onOpenChange }: UserDetailSheetProps) {
  if (!user) return null;

  const getFirstItem = <T,>(item: T | T[] | undefined | null): T | null => {
    if (!item) return null;
    if (Array.isArray(item)) return item.length > 0 ? item[0] : null;
    return item as T;
  };

  const details = getFirstItem<UserDetail>(user.user_details);
  const application = getFirstItem(user.application);
  const memberCommittee = user.committee_members?.[0]?.committee;
  const managedCommittee = user.managed_committees?.[0];

  const activeCommittee = managedCommittee || memberCommittee;
  const additional = details?.additional_info || {};

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'applicant': return 'Katılımcı';
      case 'committee_chairman': return 'Komite Başkanı';
      case 'deputy_chair': return 'Başkan Yardımcısı';
      case 'admin': return 'Yönetici';
      case 'superadmin': return 'Süper Yönetici';
      default: return role;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle className="w-3 h-3 mr-1" /> Onaylı</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="w-3 h-3 mr-1" /> Reddedildi</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><Clock className="w-3 h-3 mr-1" /> Bekliyor</Badge>;
      default:
        return <Badge variant="outline">Başvuru Yok</Badge>;
    }
  };

  const gradeLabel = details?.grade ? GRADE_OPTIONS.find(opt => opt.value === details.grade)?.label : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl p-0 overflow-hidden flex flex-col">
        <div className="p-6 pb-2 border-b border-border/50 bg-muted/5">
          <SheetHeader className="text-left space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 border-2 border-border">
                  <AvatarImage src={details?.profile_picture_url || undefined} className="object-cover" />
                  <AvatarFallback className="text-lg">{user.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <SheetTitle className="text-xl">{user.full_name}</SheetTitle>
                  <SheetDescription className="flex items-center gap-2">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {user.email}</span>
                  </SheetDescription>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary" className="capitalize">{getRoleLabel(user.role)}</Badge>
                    {user.is_suspended && <Badge variant="destructive">Askıya Alındı</Badge>}
                  </div>
                </div>
              </div>
            </div>
          </SheetHeader>
        </div>

        <ScrollArea className="flex-1 px-6">
          <div className="py-6 space-y-8">
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" /> Sistem Durumu
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-secondary/10 p-3 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-xs mb-1">Başvuru Durumu</span>
                  {getStatusBadge(application?.status || "none")}
                </div>
                <div className="bg-secondary/10 p-3 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-xs mb-1">
                    {user.role === 'committee_chairman' ? "Yönettiği Komite" : "Komite"}
                  </span>
                  <div className="font-medium flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    {activeCommittee?.name || "Atanmamış"}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <UserIcon className="w-3.5 h-3.5" /> Kişisel Bilgiler
              </h4>
              <div className="grid gap-4 text-sm">
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> Telefon</span>
                  <span className="font-medium">{details?.phone_number || "-"}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground flex items-center gap-2"><GraduationCap className="w-3.5 h-3.5" /> Okul</span>
                  <span className="font-medium">{details?.school_name || "-"}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground flex items-center gap-2"><Building2 className="w-3.5 h-3.5" /> Sınıf</span>
                    <span className="font-medium">{gradeLabel || "-"}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> Şehir</span>
                  <span className="font-medium">{details?.city || "-"}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Doğum Tarihi</span>
                  <span className="font-medium">
                    {details?.birth_date ? new Date(details.birth_date).toLocaleDateString('tr-TR') : "-"}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {Object.keys(additional).length > 0 ? (
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" /> Başvuru Detayları
                </h4>

                {additional.mun_experience && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">MUN Deneyimi</span>
                    <div className="text-sm bg-muted/30 p-2 rounded">{additional.mun_experience}</div>
                  </div>
                )}

                {additional.reason_for_joining && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Katılım Nedeni</span>
                    <div className="text-sm bg-muted/30 p-2 rounded max-h-32 overflow-y-auto whitespace-pre-wrap">{additional.reason_for_joining}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm italic">
                Ek başvuru bilgisi bulunmamaktadır.
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}