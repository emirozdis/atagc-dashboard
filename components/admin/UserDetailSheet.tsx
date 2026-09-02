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
  XCircle,
  School
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

  // Resolve School Name logic
  const schoolName = (details?.high_schools as { school_name?: string } | undefined)?.school_name ||
                     additional?.manual_school_name || 
                     "Not specified";

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'applicant': return 'Applicant';
      case 'committee_chairman': return 'Committee chair';
      case 'chair': return 'Deputy chair';
      case 'admin': return 'Site admin';
      case 'superadmin': return 'Super admin';
      case 'observer': return 'Administrative Staff';
      case 'head_observer': return 'Head of Administrative Staff';
      default: return role;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      default:
        return <Badge variant="outline">No application</Badge>;
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
                    {user.is_suspended && <Badge variant="destructive">Suspended</Badge>}
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
                <Shield className="w-3.5 h-3.5" /> System status
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-secondary/10 p-3 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-xs mb-1">Application status</span>
                  {getStatusBadge(application?.status || "none")}
                </div>
                <div className="bg-secondary/10 p-3 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-xs mb-1">
                    {user.role === 'committee_chairman' ? "Managed committee" : "Committee"}
                  </span>
                  <div className="font-medium flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    {activeCommittee?.name || "Not assigned"}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <UserIcon className="w-3.5 h-3.5" /> Personal information
              </h4>
              <div className="grid gap-4 text-sm">
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> Phone</span>
                  <span className="font-medium">{details?.phone_number || "-"}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground flex items-center gap-2"><School className="w-3.5 h-3.5" /> School</span>
                  <span className="font-medium truncate max-w-[200px]" title={schoolName}>{schoolName}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground flex items-center gap-2"><GraduationCap className="w-3.5 h-3.5" /> Grade</span>
                    <span className="font-medium">{gradeLabel || "-"}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> City</span>
                  <span className="font-medium">{details?.city || "-"}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Birth date</span>
                  <span className="font-medium">
                    {details?.birth_date ? new Date(details.birth_date).toLocaleDateString('en-GB') : "-"}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {application?.form_data && (
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" /> Form responses
                </h4>
                <div className="space-y-4">
                    {Object.entries(application.form_data).map(([key, val]) => {
                        if (['phone_number', 'birth_date', 'city', 'grade', 'high_school_id', 'manual_school_name'].includes(key)) return null;
                        return (
                            <div key={key} className="space-y-1">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold">{key.replace(/_/g, ' ')}</span>
                                <div className="text-sm bg-muted/30 p-2 rounded">{String(val)}</div>
                            </div>
                        )
                    })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
