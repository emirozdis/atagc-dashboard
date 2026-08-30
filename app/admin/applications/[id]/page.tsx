"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ArrowLeft,
  Briefcase,
  Phone,
  MapPin,
  Calendar,
  FileText,
  School,
  Users
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import { Committee, Application } from "@/types/admin";
import { GRADE_OPTIONS } from "@/lib/constants";

export default function ApplicationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const [selectedCommittee, setSelectedCommittee] = useState<string | null>(null);
  const [assignmentRole, setAssignmentRole] = useState<string | null>(null);
  
  // Modal States
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showAssignConfirm, setShowAssignConfirm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: application, isLoading: appLoading, error } = useQuery<Application>({
    queryKey: ['application', id],
    queryFn: async () => {
      const res = await fetch(`/api/applications/${id}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  const { data: committees = [] } = useQuery<Committee[]>({
    queryKey: ['committees'],
    queryFn: async () => {
      const res = await fetch("/api/admin/committees");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  const assignedCommitteeId = (() => {
    const committeeMemberData = application?.user?.committee_members;
    const committeeMembers = Array.isArray(committeeMemberData) ? committeeMemberData : committeeMemberData ? [committeeMemberData] : [];
    return committeeMembers[0]?.committee?.id ?? "none";
  })();
  const defaultAssignmentRole = application?.application_type === "chairboard"
    ? "committee_chairman"
    : application?.user.role === "chair"
      ? "chair"
      : "delegate";
  const effectiveSelectedCommittee = selectedCommittee ?? assignedCommitteeId;
  const effectiveAssignmentRole = assignmentRole ?? defaultAssignmentRole;

  const statusMutation = useMutation({
    mutationFn: async ({ status, notes }: { status: "accepted" | "approved" | "rejected", notes?: string }) => {
      const res = await fetch("/api/applications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: application?.id, status, review_notes: notes }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Action failed");
      }
    },
    onSuccess: () => {
      toast.success("Action completed");
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      setShowRejectConfirm(false);
      setShowApproveConfirm(false);
      setRejectionReason("");
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/committee-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: application?.user.id,
           committeeId: effectiveSelectedCommittee === "none" ? null : effectiveSelectedCommittee,
           role: effectiveAssignmentRole
        })
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast.success("Committee assignment updated");
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      setShowAssignConfirm(false);
    },
    onError: () => toast.error("Something went wrong")
  });

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast.error("Please enter a rejection reason.");
      return;
    }
    statusMutation.mutate({ status: 'rejected', notes: rejectionReason });
  };

  const handleApprove = () => {
    if (!application) return;
    statusMutation.mutate({ status: application.form_snapshot?.title ? 'accepted' : 'approved' });
  };

  const handleAssign = () => {
    assignMutation.mutate();
  };

  if (appLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-5 pb-12 sm:p-8">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-[350px] space-y-6">
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
          <div className="flex-1">
            <Skeleton className="h-[600px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !application) return <div>Not found</div>;

  const user = application.user;
  const details = Array.isArray(user.user_details) ? user.user_details[0] : user.user_details;
  const formData = application.form_data || {};
  const formDef = Array.isArray(application.form) ? application.form[0] : application.form;

  const schoolName = details?.high_schools?.school_name || details?.additional_info?.manual_school_name || "Not specified";

  const getFieldLabel = (key: string) => {
    if (formDef?.steps) {
      for (const step of formDef.steps) {
        if (step.fields) {
          const field = step.fields.find((f) => f.id === key);
          if (field) return field.label;
        }
      }
    }
    const snapshotQuestions = (application.form_snapshot as { questions?: Array<{ id: string; label: string }> } | undefined)?.questions || formDef?.questions;
    const question = snapshotQuestions?.find((field: { id: string }) => field.id === key);
    if (question?.label) return question.label;
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case "accepted": return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle className="w-3 h-3 mr-1" /> Accepted</Badge>;
      case "rejected": return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default: return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  const gradeLabel = GRADE_OPTIONS.find(opt => opt.value === details?.grade)?.label;

  const renderFormData = () => {
    const entries = Object.entries(formData).filter(([key]) => 
        !['phone_number', 'school_name', 'birth_date', 'grade', 'city', 'high_school_id', 'manual_school_name'].includes(key)
    );

    if (entries.length === 0) {
      return <div className="text-center text-muted-foreground text-sm italic py-8">No additional form data is available.</div>;
    }

    return (
      <div className="grid grid-cols-1 gap-6">
        {entries.map(([key, value]) => (
            <div key={key} className="space-y-1.5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-primary/50" />
                {getFieldLabel(key)}
              </div>
              <div className="text-sm bg-secondary/10 p-3 rounded-lg border border-border/50 whitespace-pre-wrap leading-relaxed text-foreground/90">
                {String(value || "-")}
              </div>
            </div>
        ))}
      </div>
    );
  };

  const delegationMember = Array.isArray(user.delegation_members) ? user.delegation_members[0] : user.delegation_members;
  const delegationInfo = delegationMember?.delegation;
  const actualDelegation = Array.isArray(delegationInfo) ? delegationInfo[0] : delegationInfo;
  const actualLeader = Array.isArray(actualDelegation?.leader) ? actualDelegation.leader[0] : actualDelegation?.leader;
  
  const leaderApp = Array.isArray(actualLeader?.application) ? actualLeader.application[0] : actualLeader?.application;
  const leaderStatus = leaderApp?.status;
  const leaderAppId = leaderApp?.id;
  const delegationName = actualDelegation?.name || "Unknown delegation";

  const ownedDel = Array.isArray(user.owned_delegation) ? user.owned_delegation[0] : user.owned_delegation;
  const isLeader = !!ownedDel;

  const isDelegationMember = !!delegationMember;
  const isAcceptedToDelegation = delegationMember?.accepted === true;
  const isLeaderApproved = leaderStatus === 'approved';
  
  // A member can be approved ONLY IF they are accepted to the delegation AND their leader is approved.
  const canReviewApplication = !isDelegationMember || (isAcceptedToDelegation && isLeaderApproved);

  const selectedCommitteeName = committees.find(c => c.id === effectiveSelectedCommittee)?.name || "No assignment (will be removed)";

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 pb-12 animate-fade-in sm:p-8">

      <div className="bg-card border border-border/50 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-4 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/admin/applications">
            <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-none">{user.full_name}</span>
            <span className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 gap-1.5 font-medium border-primary/20 text-primary bg-primary/5">
                {formDef?.title || "Application"}
              </Badge>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              {new Date(application.submitted_at).toLocaleDateString('en-GB')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {getStatusBadge(application.status)}

          {application.status === 'pending' && canReviewApplication && (
            <>
              <Button variant="destructive" size="sm" onClick={() => setShowRejectConfirm(true)}>Reject</Button>
              <Button className="bg-green-600 hover:bg-green-700 text-white" size="sm" onClick={() => setShowApproveConfirm(true)}>Approve</Button>
            </>
          )}

          {application.status === 'pending' && isDelegationMember && !canReviewApplication && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 whitespace-nowrap">
              {!isAcceptedToDelegation ? "Waiting for delegation leader approval" : "Waiting for leader approval of the application"}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-[350px] space-y-6">
          <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-gradient-to-b from-muted/50 to-card p-6 flex flex-col items-center text-center border-b border-border/50">
              <Avatar className="w-24 h-24 mb-4 border-4 border-background shadow-xl ring-1 ring-border/10">
                <AvatarImage src={details?.profile_picture_url || undefined} className="object-cover" />
                <AvatarFallback className="text-xl bg-primary/10 text-primary font-bold">
                  {user.full_name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold">{user.full_name}</h2>
              <p className="text-xs text-muted-foreground mt-1 bg-secondary/50 px-2 py-0.5 rounded-full">{user.email}</p>
            </div>

            <div className="p-5 space-y-4 text-sm">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Phone className="w-4 h-4 shrink-0" />
                <span className="text-foreground">{details?.phone_number || "Not specified"}</span>
              </div>
              <Separator />
              <div className="flex items-center gap-3 text-muted-foreground">
                <School className="w-4 h-4 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-foreground font-medium leading-tight">{schoolName}</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    {gradeLabel && <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">{gradeLabel}</Badge>}
                  </div>
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-3 text-muted-foreground">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="text-foreground">{details?.city || "-"}</span>
              </div>
              <Separator />
              <div className="flex items-center gap-3 text-muted-foreground">
                <Calendar className="w-4 h-4 shrink-0" />
                <span className="text-foreground">
                  {details?.birth_date ? new Date(details.birth_date).toLocaleDateString('en-GB') : "-"}
                </span>
              </div>
              <Separator />
              <div className="flex items-start gap-3 text-muted-foreground">
                <Users className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="text-foreground">
                  {isLeader ? (
                    <div className="flex flex-col">
                      <span className="font-medium text-primary">{ownedDel?.name}</span>
                      <span className="text-[10px] font-medium mt-0.5">Delegation leader</span>
                    </div>
                  ) : delegationMember ? (
                    <div className="flex flex-col">
                      {leaderAppId ? (
                         <Link href={`/admin/applications/${leaderAppId}`} className="font-medium text-primary hover:underline">
                            Delegation: {delegationName}
                         </Link>
                      ) : (
                         <span className="font-medium text-primary">Delegation: {delegationName}</span>
                      )}
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        Leader status: {leaderStatus === 'approved' ? 'Approved' : leaderStatus === 'rejected' ? 'Rejected' : 'Pending'}
                      </span>
                    </div>
                  ) : "Individual participant"}
                </span>
              </div>
            </div>
          </div>

          {/* Enhanced Committee Assignment Card */}
          {(application.status === 'approved' || application.status === 'accepted') && (application.application_type === 'delegate' || application.application_type === 'chairboard' || ['delegate', 'chair', 'committee_chairman'].includes(user.role)) && (
            <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-muted/30 px-6 py-4 border-b border-border/50 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-foreground">Committee assignment</h3>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-muted-foreground">Assign the user to a committee or update the current assignment.</p>
                <div className="space-y-3">
                  <Select value={effectiveAssignmentRole} onValueChange={setAssignmentRole}>
                    <SelectTrigger className="bg-background h-11"><SelectValue placeholder="Conference role" /></SelectTrigger>
                    <SelectContent><SelectItem value="delegate">Delegate</SelectItem><SelectItem value="committee_chairman">Chair</SelectItem><SelectItem value="chair">Deputy Chair</SelectItem></SelectContent>
                  </Select>
                  <Select value={effectiveSelectedCommittee} onValueChange={setSelectedCommittee}>
                    <SelectTrigger className="bg-background h-11">
                      <SelectValue placeholder="Select a committee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none"> <XCircle className="w-4 h-4" /> No assignment </SelectItem>
                      {committees.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => setShowAssignConfirm(true)}
                    disabled={assignMutation.isPending}
                    className="w-full h-11"
                  >
                    {assignMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save assignment"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-muted/30 px-6 py-4 border-b border-border/50 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-foreground">Application form responses</h3>
            </div>
            <div className="p-6">
              {renderFormData()}
            </div>
          </div>
        </div>
      </div>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={showApproveConfirm} onOpenChange={setShowApproveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this application? The user will receive an automatic notification email and their role will be updated to <strong>{formDef?.title || "participant"}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
                onClick={(e) => {
                    e.preventDefault();
                    handleApprove();
                }} 
                className="bg-green-600 text-white hover:bg-green-700"
                disabled={statusMutation.isPending}
            >
                {statusMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation & Reason Dialog */}
      <AlertDialog open={showRejectConfirm} onOpenChange={(val) => {
          setShowRejectConfirm(val);
          if (!val) setRejectionReason("");
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Reject application</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to reject this application. Enter a reason; it will be shared with the applicant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-2">
              <Textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="For example: age limit issue or missing information..."
                className="min-h-[100px]"
              />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
                onClick={(e) => {
                    e.preventDefault();
                    handleReject();
                }} 
                className="bg-destructive text-white hover:bg-destructive/90"
                disabled={statusMutation.isPending || !rejectionReason.trim()}
            >
                {statusMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Reject and close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Committee Confirmation Dialog */}
      <AlertDialog open={showAssignConfirm} onOpenChange={setShowAssignConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm committee assignment</AlertDialogTitle>
            <AlertDialogDescription>
              You are assigning <strong>{user.full_name}</strong> to <strong>{selectedCommitteeName}</strong>. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={assignMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
                onClick={(e) => {
                    e.preventDefault();
                    handleAssign();
                }} 
                disabled={assignMutation.isPending}
            >
                {assignMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save assignment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
